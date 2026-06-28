import * as THREE from 'three'

export function buildVaseGeometry(engineState) {
  const { geometry } = buildVaseBufferGeometry(engineState)
  const material = new THREE.MeshStandardMaterial({
    color: engineState.material.color,
    roughness: engineState.material.roughness,
    metalness: engineState.material.metalness,
    side: THREE.DoubleSide,
    wireframe: Boolean(engineState.material.wireframe || engineState.material.crackle?.enabled),
    vertexColors: geometry.hasAttribute('color')
  })

  return { geometry, material }
}

export function buildVaseBufferGeometry(engineState) {
  const profile = engineState.profile
  const radialSegments = Math.max(6, Math.round(engineState.resolution.radialSegments))
  const heightSegments = Math.max(8, Math.round(engineState.resolution.heightSegments))
  const wallThickness = clampNumber(
    profile.wallThickness ?? 0.7,
    0.1,
    Math.max(0.1, Math.min(profile.baseRadius, profile.bellyRadius, profile.neckRadius, profile.lipRadius) - 0.1)
  )
  const innerStartYIndex = 1
  const positions = []
  const colors = []
  const uvs = []
  const indices = []
  const outerRings = []
  const innerRings = []

  const addVertex = (point, u, t, radialIndex, yIndex) => {
    positions.push(point.x, point.y, point.z)
    uvs.push(u, t)
    colors.push(...createVertexColor(t, radialIndex, yIndex, engineState))
    return (positions.length / 3) - 1
  }

  for (let yIndex = 0; yIndex <= heightSegments; yIndex += 1) {
    const t = yIndex / heightSegments
    const y = (t - 0.5) * profile.height
    const ring = []

    for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
      const u = radialIndex / radialSegments
      const point = createProfilePoint(t, u, y, profile, engineState)

      ring.push(addVertex(point, u, t, radialIndex, yIndex))
    }

    outerRings.push(ring)
  }

  for (let yIndex = innerStartYIndex; yIndex <= heightSegments; yIndex += 1) {
    const t = yIndex / heightSegments
    const y = (t - 0.5) * profile.height
    const ring = []

    for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
      const u = radialIndex / radialSegments
      const point = createProfilePoint(t, u, y, profile, engineState, -wallThickness)

      ring.push(addVertex(point, u, t, radialIndex, yIndex))
    }

    innerRings.push(ring)
  }

  for (let yIndex = 0; yIndex < heightSegments; yIndex += 1) {
    for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
      const nextRadialIndex = (radialIndex + 1) % radialSegments
      const a = outerRings[yIndex][radialIndex]
      const b = outerRings[yIndex][nextRadialIndex]
      const c = outerRings[yIndex + 1][nextRadialIndex]
      const d = outerRings[yIndex + 1][radialIndex]

      indices.push(a, b, d)
      indices.push(b, c, d)
    }
  }

  for (let ringIndex = 0; ringIndex < innerRings.length - 1; ringIndex += 1) {
    for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
      const nextRadialIndex = (radialIndex + 1) % radialSegments
      const a = innerRings[ringIndex][radialIndex]
      const b = innerRings[ringIndex][nextRadialIndex]
      const c = innerRings[ringIndex + 1][nextRadialIndex]
      const d = innerRings[ringIndex + 1][radialIndex]

      indices.push(a, d, b)
      indices.push(b, d, c)
    }
  }

  const topOuterRing = outerRings[heightSegments]
  const topInnerRing = innerRings[innerRings.length - 1]
  for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
    const nextRadialIndex = (radialIndex + 1) % radialSegments
    const outerA = topOuterRing[radialIndex]
    const outerB = topOuterRing[nextRadialIndex]
    const innerA = topInnerRing[radialIndex]
    const innerB = topInnerRing[nextRadialIndex]

    indices.push(outerA, outerB, innerA)
    indices.push(outerB, innerB, innerA)
  }

  const bottomCenter = positions.length / 3
  positions.push(0, -profile.height / 2, 0)
  uvs.push(0.5, 0)
  colors.push(...createVertexColor(0, 0, 0, engineState))

  for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
    const nextRadialIndex = (radialIndex + 1) % radialSegments
    indices.push(bottomCenter, outerRings[0][radialIndex], outerRings[0][nextRadialIndex])
  }

  const innerBottomT = innerStartYIndex / heightSegments
  const innerBottomY = (innerBottomT - 0.5) * profile.height
  const innerBottomCenter = positions.length / 3
  positions.push(0, innerBottomY, 0)
  uvs.push(0.5, innerBottomT)
  colors.push(...createVertexColor(innerBottomT, 0, innerStartYIndex, engineState))

  const innerBottomRing = innerRings[0]
  for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
    const nextRadialIndex = (radialIndex + 1) % radialSegments
    indices.push(innerBottomCenter, innerBottomRing[nextRadialIndex], innerBottomRing[radialIndex])
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setIndex(indices)
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()

  return { geometry }
}

function createProfilePoint(t, u, y, profile, engineState, radiusOffset = 0) {
  let angle = u * Math.PI * 2
  let radius = radiusAt(t, profile)
  let xOffset = 0
  let zOffset = 0
  let localY = y

  for (const modifier of engineState.modifiers) {
    const params = modifier.params ?? {}

    if (modifier.effect === 'scale') {
      radius *= Math.max(0.05, 1 + Number(params.intensity ?? 0) * 0.1)
    }

    if (modifier.effect === 'taper') {
      radius *= Math.max(0.05, 1 - t * Number(params.intensity ?? 0) * 0.1)
    }

    if (modifier.effect === 'bulge') {
      const centerRatio = 1 - Math.min(1, Math.abs(t - 0.5) * 2)
      radius *= Math.max(0.05, 1 + centerRatio * centerRatio * Number(params.intensity ?? 0) * 0.08)
    }

    if (modifier.effect === 'bevel') {
      const edgeRatio = Math.max(0, (Math.abs(t - 0.5) * 2 - 0.72) / 0.28)
      radius *= Math.max(0.2, 1 - edgeRatio * Math.abs(Number(params.intensity ?? 0)) * 0.08)
    }

    if (modifier.effect === 'rimLip') {
      const band = smoothstep(0.88, 1, t)
      radius += band * Number(params.flare ?? 0)
      radius += Math.sin(band * Math.PI) * Number(params.thickness ?? 0) * Number(params.roundness ?? 0)
    }

    if (modifier.effect === 'footRing') {
      const band = 1 - smoothstep(0, Math.max(0.02, Number(params.height ?? 0) / profile.height), t)
      radius += band * Number(params.radiusBoost ?? 0)
      radius -= Math.sin(band * Math.PI) * Number(params.inset ?? 0)
    }

    if (modifier.effect === 'shoulder') {
      const position = Number(params.position ?? 0.68)
      const band = Math.exp(-Math.pow((t - position) / 0.09, 2))
      radius += band * Number(params.strength ?? 0)
    }

    if (modifier.effect === 'neckPull') {
      const neckStart = 1 - Number(params.height ?? 0.26)
      const band = smoothstep(neckStart, 1, t)
      radius *= 1 - band * Number(params.narrowing ?? 0.22)
    }

    if (modifier.effect === 'groove') {
      const coverage = Number(params.range ?? 0.7)
      const start = (1 - coverage) / 2
      const end = 1 - start
      if (t >= start && t <= end) {
        const local = (t - start) / Math.max(0.001, coverage)
        const pulse = Math.pow(0.5 + 0.5 * Math.cos(local * Math.PI * 2 * Number(params.count ?? 1)), 10)
        radius -= pulse * Number(params.depth ?? 0)
      }
    }

    if (modifier.effect === 'flute') {
      const count = Number(params.count ?? 12)
      radius += Math.cos(angle * count + Number(params.offset ?? 0)) * Number(params.depth ?? 0)
    }

    if (modifier.effect === 'facet') {
      const facets = Math.max(3, Math.round(Number(params.facets ?? 12)))
      const snapped = Math.round((angle / (Math.PI * 2)) * facets) / facets * Math.PI * 2
      angle = mix(angle, snapped, Number(params.sharpness ?? 0))
    }

    if (modifier.effect === 'twist' || modifier.effect === 'spiral') {
      const multiplier = modifier.effect === 'spiral' ? 0.025 : 0.05
      angle += localY * Number(params.intensity ?? 0) * multiplier
      if (modifier.effect === 'spiral') {
        radius *= 1 + Math.sin(localY * 0.35) * Number(params.intensity ?? 0) * 0.015
      }
    }

    if (modifier.effect === 'wave') {
      xOffset += Math.sin(localY * 0.5) * Number(params.intensity ?? 0)
      zOffset += Math.sin(localY * 0.5) * Number(params.intensity ?? 0)
    }

    if (modifier.effect === 'bend') {
      xOffset += Math.pow(localY / Math.max(profile.height, 1), 2) * Number(params.intensity ?? 0) * profile.height * 0.12
    }

    if (modifier.effect === 'wobble') {
      const amount = Number(params.intensity ?? 0)
      const frequency = Number(params.frequency ?? 2)
      const seed = engineState.seed
      xOffset += Math.sin(t * Math.PI * 2 * frequency + seed * 0.17) * amount
      zOffset += Math.cos(t * Math.PI * 2 * (frequency + 0.7) + seed * 0.11) * amount * 0.55
    }

    if (modifier.effect === 'noise') {
      const amount = Number(params.intensity ?? 0) * 0.45
      radius += deterministicNoise(Math.round(t * 1000), `${modifier.id}:${engineState.seed}`, Math.round(u * 1000)) * amount
    }
  }

  radius = Math.max(0.05, radius + radiusOffset)

  return {
    x: Math.cos(angle) * radius + xOffset,
    y: localY,
    z: Math.sin(angle) * radius + zOffset
  }
}

function clampNumber(value, min, max) {
  const number = Number(value)
  if (!Number.isFinite(number)) return min
  return Math.min(max, Math.max(min, number))
}

function radiusAt(t, profile) {
  if (t < 0.42) {
    return mix(profile.baseRadius, profile.bellyRadius, smoothstep(0, 0.42, t))
  }

  if (t < 0.78) {
    return mix(profile.bellyRadius, profile.neckRadius, smoothstep(0.42, 0.78, t))
  }

  return mix(profile.neckRadius, profile.lipRadius, smoothstep(0.78, 1, t))
}

function createVertexColor(t, radialIndex, yIndex, engineState) {
  const material = engineState.material
  const base = new THREE.Color(material.color)

  if (material.gradient) {
    const bottom = new THREE.Color(material.gradient.bottomColor)
    const top = new THREE.Color(material.gradient.topColor)
    const gradientColor = bottom.lerp(top, t)
    base.lerp(gradientColor, material.gradient.mix)
  }

  if (material.grain) {
    const grain = deterministicNoise(yIndex, `grain:${engineState.seed}`, radialIndex) * material.grain
    base.offsetHSL(0, 0, grain * 0.16)
  }

  if (material.speckles) {
    const sample = deterministicNoise(yIndex, `speckle:${engineState.seed}`, radialIndex) + 0.5
    if (sample > 1 - material.speckles.density * 0.22) {
      base.lerp(new THREE.Color(material.speckles.color), material.speckles.strength)
    }
  }

  if (material.crackle?.enabled) {
    const crackle = Math.abs(Math.sin((radialIndex * 5.13 + yIndex * 2.71 + engineState.seed) * 0.45))
    if (crackle > 0.96) {
      base.lerp(new THREE.Color('#f8fafc'), material.crackle.intensity)
    }
  }

  return [base.r, base.g, base.b]
}

function smoothstep(edge0, edge1, value) {
  const x = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)))
  return x * x * (3 - 2 * x)
}

function mix(a, b, t) {
  return a * (1 - t) + b * t
}

function deterministicNoise(index, salt, axis) {
  let hash = 2166136261
  const input = `${salt}:${axis}:${index}`

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }

  return ((hash >>> 0) / 4294967295) - 0.5
}
