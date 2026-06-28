export const DEFAULT_PROFILE = Object.freeze({
  baseRadius: 5.8,
  bellyRadius: 8,
  neckRadius: 5.2,
  lipRadius: 5.2,
  height: 22,
  wallThickness: 0.7,
  sides: 6
})

export const DEFAULT_RESOLUTION = Object.freeze({
  radialSegments: 48,
  heightSegments: 72
})

export const DEFAULT_MATERIAL = Object.freeze({
  color: '#ffffff',
  roughness: 0.4,
  metalness: 0.2,
  wireframe: false,
  grain: 0,
  gradient: null,
  speckles: null,
  crackle: null
})

export const VASE_PRESETS = Object.freeze({
  meiping: {
    baseRadius: 5.4,
    bellyRadius: 10.6,
    neckRadius: 3.4,
    lipRadius: 4.5,
    height: 30,
    sides: 48
  },
  danping: {
    baseRadius: 4.8,
    bellyRadius: 8.8,
    neckRadius: 3.2,
    lipRadius: 3.9,
    height: 34,
    sides: 56
  },
  jar: {
    baseRadius: 7.4,
    bellyRadius: 11.5,
    neckRadius: 8.4,
    lipRadius: 8.8,
    height: 20,
    sides: 44
  },
  bowl: {
    baseRadius: 4.8,
    bellyRadius: 12.8,
    neckRadius: 13.6,
    lipRadius: 14.8,
    height: 12,
    sides: 56
  },
  cup: {
    baseRadius: 4.4,
    bellyRadius: 6.2,
    neckRadius: 6.6,
    lipRadius: 7.2,
    height: 13,
    sides: 40
  }
})

export function evaluateGraph(nodes, edges) {
  const nodeList = Array.isArray(nodes) ? nodes : []
  const edgeList = Array.isArray(edges) ? edges : []
  const nodeById = new Map(nodeList.map((node) => [node.id, node]))
  const liveEdges = edgeList.filter((edge) => nodeById.has(edge.source) && nodeById.has(edge.target))

  const inputNodes = sortByCanvasPosition(nodeList.filter((node) => getKind(node) === 'shape'))
  const exportNodes = sortByCanvasPosition(nodeList.filter((node) => getKind(node) === 'export'))

  const reachableFromInput = walkForward(inputNodes.map((node) => node.id), liveEdges)
  const canReachExport = walkBackward(exportNodes.map((node) => node.id), liveEdges)

  const activeNodeIds = new Set()
  for (const node of nodeList) {
    if (reachableFromInput.has(node.id) && canReachExport.has(node.id)) {
      activeNodeIds.add(node.id)
    }
  }

  const activeEdgeIds = new Set()
  for (const edge of liveEdges) {
    if (activeNodeIds.has(edge.source) && activeNodeIds.has(edge.target)) {
      activeEdgeIds.add(edge.id)
    }
  }

  const isConnected = inputNodes.some((node) => activeNodeIds.has(node.id)) && exportNodes.some((node) => activeNodeIds.has(node.id))
  const activeNodes = sortByCanvasPosition(nodeList.filter((node) => activeNodeIds.has(node.id)))
  const activeInputs = activeNodes.filter((node) => getKind(node) === 'shape')
  const modifiers = activeNodes.filter((node) => getKind(node) === 'modifier').map(toModifier)
  const materials = activeNodes.filter((node) => getKind(node) === 'material')
  const outputs = activeNodes.filter((node) => getKind(node) === 'export').map((node) => node.data?.effect)
  const meshifyNode = modifiers.find((node) => node.effect === 'meshify')

  return {
    inputs: activeInputs.map(toInput),
    profile: buildProfile(activeInputs),
    resolution: buildResolution(activeInputs),
    seed: buildSeed(activeInputs),
    modifiers,
    material: {
      ...buildMaterial(materials),
      wireframe: Boolean(meshifyNode?.params?.wireframe)
    },
    outputs,
    activeNodeIds,
    activeEdgeIds,
    status: isConnected ? 'connected' : 'fallback'
  }
}

export function sortByCanvasPosition(nodes) {
  return [...nodes].sort((a, b) => {
    const ax = Number(a.position?.x ?? 0)
    const bx = Number(b.position?.x ?? 0)
    const ay = Number(a.position?.y ?? 0)
    const by = Number(b.position?.y ?? 0)

    return ax - bx || ay - by || String(a.id).localeCompare(String(b.id))
  })
}

export function getKind(node) {
  return node?.data?.kind ?? node?.type
}

function buildProfile(inputNodes) {
  let profile = { ...DEFAULT_PROFILE }
  let hasUpstreamProfileSource = false

  for (const node of inputNodes) {
    const effect = node.data?.effect
    const params = node.data?.params ?? {}
    const touchedParams = node.data?.touchedParams ?? {}
    const touchedKeys = Object.keys(touchedParams)

    if (effect === 'shape') {
      const radius = clampNumber(params.radius ?? profile.bellyRadius, 1, 50)
      profile = {
        ...profile,
        baseRadius: radius,
        bellyRadius: radius,
        neckRadius: radius,
        lipRadius: radius,
        height: clampNumber(params.height ?? profile.height, 1, 100),
        wallThickness: clampWallThickness(params.wallThickness ?? profile.wallThickness, radius),
        sides: clampInteger(params.sides ?? profile.sides, 3, 96)
      }
      hasUpstreamProfileSource = true
    }

    if (effect === 'preset') {
      profile = {
        ...profile,
        ...(VASE_PRESETS[params.preset] ?? VASE_PRESETS.meiping)
      }
      hasUpstreamProfileSource = true
    }

    if (effect === 'profile') {
      const keysToApply = hasUpstreamProfileSource ? touchedKeys : ['baseRadius', 'bellyRadius', 'neckRadius', 'lipRadius', 'height', 'wallThickness']
      profile = applyProfileParams(profile, params, keysToApply)
      hasUpstreamProfileSource = true
    }
  }

  return profile
}

function applyProfileParams(profile, params, keysToApply) {
  const nextProfile = { ...profile }
  const clamps = {
    baseRadius: [1, 50],
    bellyRadius: [1, 60],
    neckRadius: [1, 50],
    lipRadius: [1, 50],
    height: [1, 100],
    wallThickness: [0.1, 8]
  }

  for (const key of keysToApply) {
    if (!(key in clamps)) continue
    nextProfile[key] = clampNumber(params[key] ?? nextProfile[key], clamps[key][0], clamps[key][1])
  }

  nextProfile.wallThickness = clampWallThickness(nextProfile.wallThickness, Math.min(
    nextProfile.baseRadius,
    nextProfile.bellyRadius,
    nextProfile.neckRadius,
    nextProfile.lipRadius
  ))

  return nextProfile
}

function buildResolution(inputNodes) {
  let resolution = { ...DEFAULT_RESOLUTION }

  for (const node of inputNodes) {
    if (node.data?.effect !== 'resolution') continue
    const params = node.data?.params ?? {}
    resolution = {
      radialSegments: clampInteger(params.radialSegments ?? resolution.radialSegments, 6, 160),
      heightSegments: clampInteger(params.heightSegments ?? resolution.heightSegments, 8, 180)
    }
  }

  return resolution
}

function buildSeed(inputNodes) {
  let seed = 42

  for (const node of inputNodes) {
    if (node.data?.effect === 'seed') {
      seed = clampInteger(node.data?.params?.seed ?? seed, 1, 999999)
    }
  }

  return seed
}

function buildMaterial(materialNodes) {
  let material = { ...DEFAULT_MATERIAL }

  for (const node of materialNodes) {
    const effect = node.data?.effect
    const params = node.data?.params ?? {}

    if (effect === 'material') {
      material = {
        ...material,
        color: colorOrDefault(params.color, material.color),
        metalness: clampNumber(params.metalness ?? material.metalness, 0, 1)
      }
    }

    if (effect === 'clay') {
      material = {
        ...material,
        color: colorOrDefault(params.color, material.color),
        roughness: clampNumber(params.roughness ?? material.roughness, 0, 1),
        grain: clampNumber(params.grain ?? material.grain, 0, 1)
      }
    }

    if (effect === 'glaze') {
      material = {
        ...material,
        color: colorOrDefault(params.color, material.color),
        roughness: clampNumber(params.roughness ?? material.roughness, 0, 1),
        metalness: clampNumber(params.metalness ?? material.metalness, 0, 1)
      }
    }

    if (effect === 'gradientGlaze') {
      material = {
        ...material,
        gradient: {
          topColor: colorOrDefault(params.topColor, '#ffffff'),
          bottomColor: colorOrDefault(params.bottomColor, material.color),
          mix: clampNumber(params.mix ?? 1, 0, 1)
        }
      }
    }

    if (effect === 'speckles') {
      material = {
        ...material,
        speckles: {
          color: colorOrDefault(params.color, '#2f2118'),
          density: clampNumber(params.density ?? 0, 0, 1),
          strength: clampNumber(params.strength ?? 0, 0, 1)
        }
      }
    }

    if (effect === 'crackle') {
      material = {
        ...material,
        crackle: {
          enabled: Boolean(params.enabled),
          intensity: clampNumber(params.intensity ?? 0, 0, 1)
        }
      }
    }
  }

  return material
}

function toInput(node) {
  return {
    id: node.id,
    effect: node.data?.effect,
    params: node.data?.params ?? {}
  }
}

function toModifier(node) {
  return {
    id: node.id,
    effect: node.data?.effect,
    params: normalizeModifierParams(node.data?.params)
  }
}

function walkForward(startIds, edges) {
  const adjacency = new Map()
  for (const edge of edges) {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, [])
    }
    adjacency.get(edge.source).push(edge.target)
  }

  return walk(startIds, adjacency)
}

function walkBackward(startIds, edges) {
  const adjacency = new Map()
  for (const edge of edges) {
    if (!adjacency.has(edge.target)) {
      adjacency.set(edge.target, [])
    }
    adjacency.get(edge.target).push(edge.source)
  }

  return walk(startIds, adjacency)
}

function walk(startIds, adjacency) {
  const visited = new Set()
  const queue = [...startIds]

  while (queue.length > 0) {
    const id = queue.shift()
    if (!id || visited.has(id)) continue

    visited.add(id)
    const nextIds = adjacency.get(id) ?? []
    for (const nextId of nextIds) {
      if (!visited.has(nextId)) {
        queue.push(nextId)
      }
    }
  }

  return visited
}

function normalizeModifierParams(params = {}) {
  const normalized = { ...params }

  for (const [key, value] of Object.entries(normalized)) {
    if (typeof value === 'number') {
      normalized[key] = Number.isFinite(value) ? value : 0
    }
  }

  normalized.intensity = clampNumber(normalized.intensity ?? 0, -10, 10)
  normalized.wireframe = Boolean(normalized.wireframe)

  return normalized
}

function colorOrDefault(value, fallback) {
  return typeof value === 'string' && value.startsWith('#') ? value : fallback
}

function clampInteger(value, min, max) {
  return Math.round(clampNumber(value, min, max))
}

function clampNumber(value, min, max) {
  const number = Number(value)
  if (!Number.isFinite(number)) return min
  return Math.min(max, Math.max(min, number))
}

function clampWallThickness(value, radiusLimit) {
  return clampNumber(value, 0.1, Math.max(0.1, radiusLimit - 0.1))
}
