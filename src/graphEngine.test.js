import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateGraph } from './graphEngine.js'
import { buildVaseBufferGeometry } from './vaseEngine.js'
import { NODE_CATALOG } from './nodeCatalog.js'

function node(id, kind, x, effect = null, params = {}) {
  return {
    id,
    type: kind,
    position: { x, y: 0 },
    data: {
      kind,
      effect,
      params
    }
  }
}

function edge(id, source, target) {
  return { id, source, target }
}

test('deleted modifier node no longer affects engine state', () => {
  const nodes = [
    node('shape', 'shape', 0, null, { sides: 6, radius: 8, height: 20 }),
    node('out', 'export', 300)
  ]
  const edges = [edge('shape-out', 'shape', 'out')]
  const state = evaluateGraph(nodes, edges)

  assert.equal(state.status, 'connected')
  assert.deepEqual(state.modifiers, [])
})

test('removing a shape to modifier edge falls back to base geometry', () => {
  const nodes = [
    node('shape', 'shape', 0),
    node('twist', 'modifier', 120, 'twist', { intensity: 4 }),
    node('out', 'export', 300)
  ]
  const edges = [edge('twist-out', 'twist', 'out')]
  const state = evaluateGraph(nodes, edges)

  assert.equal(state.status, 'fallback')
  assert.deepEqual(state.modifiers, [])
  assert.equal(state.activeNodeIds.size, 0)
})

test('unconnected modifier and material nodes do not affect the output', () => {
  const nodes = [
    node('shape', 'shape', 0),
    node('out', 'export', 300),
    node('wave', 'modifier', 120, 'wave', { intensity: 8 }),
    node('mat', 'material', 160, null, { color: '#00ff88', metalness: 1 })
  ]
  const edges = [edge('shape-out', 'shape', 'out')]
  const state = evaluateGraph(nodes, edges)

  assert.equal(state.status, 'connected')
  assert.deepEqual(state.modifiers, [])
  assert.equal(state.material.color, '#ffffff')
  assert.equal(state.material.metalness, 0.2)
})

test('multiple modifiers execute from left to right on the canvas', () => {
  const nodes = [
    node('shape', 'shape', 0),
    node('scale', 'modifier', 240, 'scale', { intensity: 2 }),
    node('twist', 'modifier', 120, 'twist', { intensity: 3 }),
    node('out', 'export', 360)
  ]
  const edges = [
    edge('shape-twist', 'shape', 'twist'),
    edge('twist-scale', 'twist', 'scale'),
    edge('scale-out', 'scale', 'out')
  ]
  const state = evaluateGraph(nodes, edges)

  assert.deepEqual(state.modifiers.map((modifier) => modifier.effect), ['twist', 'scale'])
})

test('cycles in the graph do not create an infinite walk', () => {
  const nodes = [
    node('shape', 'shape', 0),
    node('twist', 'modifier', 120, 'twist', { intensity: 3 }),
    node('wave', 'modifier', 180, 'wave', { intensity: 2 }),
    node('out', 'export', 300)
  ]
  const edges = [
    edge('shape-twist', 'shape', 'twist'),
    edge('twist-wave', 'twist', 'wave'),
    edge('wave-twist', 'wave', 'twist'),
    edge('wave-out', 'wave', 'out')
  ]
  const state = evaluateGraph(nodes, edges)

  assert.equal(state.status, 'connected')
  assert.deepEqual(state.modifiers.map((modifier) => modifier.effect), ['twist', 'wave'])
})

test('new input nodes only apply when they are in the active output chain', () => {
  const nodes = [
    node('shape', 'shape', 0, 'shape', { radius: 6, height: 18, sides: 8 }),
    node('profile', 'shape', 100, 'profile', { baseRadius: 2, bellyRadius: 14, neckRadius: 3, lipRadius: 5, height: 44 }),
    node('out', 'export', 300, 'export')
  ]
  const edges = [edge('shape-out', 'shape', 'out')]
  const state = evaluateGraph(nodes, edges)

  assert.equal(state.status, 'connected')
  assert.equal(state.profile.height, 18)
  assert.equal(state.profile.bellyRadius, 6)
})

test('untouched profile node does not override a preset', () => {
  const nodes = [
    node('preset', 'shape', 0, 'preset', { preset: 'bowl' }),
    node('profile', 'shape', 120, 'profile', { baseRadius: 4, bellyRadius: 9, neckRadius: 3, lipRadius: 5, height: 31 }),
    node('out', 'export', 300, 'export')
  ]
  const edges = [
    edge('preset-profile', 'preset', 'profile'),
    edge('profile-out', 'profile', 'out')
  ]
  const state = evaluateGraph(nodes, edges)

  assert.equal(state.profile.height, 12)
  assert.equal(state.profile.bellyRadius, 12.8)
  assert.equal(state.profile.sides, 56)
})

test('touched profile params override preset params one field at a time', () => {
  const nodes = [
    node('preset', 'shape', 0, 'preset', { preset: 'bowl' }),
    {
      ...node('profile', 'shape', 120, 'profile', { baseRadius: 4, bellyRadius: 9, neckRadius: 3, lipRadius: 5, height: 31 }),
      data: {
        ...node('profile', 'shape', 120, 'profile', { baseRadius: 4, bellyRadius: 9, neckRadius: 3, lipRadius: 5, height: 31 }).data,
        touchedParams: {
          bellyRadius: true,
          height: true
        }
      }
    },
    node('out', 'export', 300, 'export')
  ]
  const edges = [
    edge('preset-profile', 'preset', 'profile'),
    edge('profile-out', 'profile', 'out')
  ]
  const state = evaluateGraph(nodes, edges)

  assert.equal(state.profile.baseRadius, 4.8)
  assert.equal(state.profile.bellyRadius, 9)
  assert.equal(state.profile.height, 31)
})

test('profile and shape inputs control wall thickness', () => {
  const profileState = evaluateGraph([
    node('profile', 'shape', 0, 'profile', { baseRadius: 5, bellyRadius: 9, neckRadius: 4, lipRadius: 5, height: 24, wallThickness: 1.6 }),
    node('out', 'export', 300, 'export')
  ], [edge('profile-out', 'profile', 'out')])
  const shapeState = evaluateGraph([
    node('shape', 'shape', 0, 'shape', { radius: 1, height: 12, sides: 8, wallThickness: 5 }),
    node('out', 'export', 300, 'export')
  ], [edge('shape-out', 'shape', 'out')])

  assert.equal(profileState.profile.wallThickness, 1.6)
  assert.equal(shapeState.profile.wallThickness, 0.9)
})

test('rim, foot, groove and flute modifiers disappear when disconnected', () => {
  const nodes = [
    node('profile', 'shape', 0, 'profile', { baseRadius: 5, bellyRadius: 10, neckRadius: 4, lipRadius: 5, height: 25 }),
    node('rim', 'modifier', 90, 'rimLip', { flare: 3, thickness: 1, roundness: 0.8 }),
    node('foot', 'modifier', 140, 'footRing', { height: 2, radiusBoost: 2, inset: 0.5 }),
    node('groove', 'modifier', 190, 'groove', { count: 6, depth: 1, range: 0.8 }),
    node('flute', 'modifier', 240, 'flute', { count: 12, depth: 1, offset: 0 }),
    node('out', 'export', 360, 'export')
  ]
  const connectedState = evaluateGraph(nodes, [
    edge('profile-rim', 'profile', 'rim'),
    edge('rim-foot', 'rim', 'foot'),
    edge('foot-groove', 'foot', 'groove'),
    edge('groove-flute', 'groove', 'flute'),
    edge('flute-out', 'flute', 'out')
  ])
  const disconnectedState = evaluateGraph(nodes, [edge('profile-out', 'profile', 'out')])

  assert.deepEqual(connectedState.modifiers.map((modifier) => modifier.effect), ['rimLip', 'footRing', 'groove', 'flute'])
  assert.deepEqual(disconnectedState.modifiers, [])
})

test('seed keeps wobble geometry stable and changes when seed changes', () => {
  const nodes = [
    node('profile', 'shape', 0, 'profile', { baseRadius: 5, bellyRadius: 9, neckRadius: 4, lipRadius: 5, height: 24 }),
    node('seed-a', 'shape', 60, 'seed', { seed: 7 }),
    node('wobble', 'modifier', 120, 'wobble', { intensity: 2, frequency: 3 }),
    node('out', 'export', 300, 'export')
  ]
  const edges = [
    edge('profile-seed', 'profile', 'seed-a'),
    edge('seed-wobble', 'seed-a', 'wobble'),
    edge('wobble-out', 'wobble', 'out')
  ]
  const sameA = samplePositions(buildVaseBufferGeometry(evaluateGraph(nodes, edges)).geometry)
  const sameB = samplePositions(buildVaseBufferGeometry(evaluateGraph(nodes, edges)).geometry)
  const differentSeedNodes = nodes.map((item) => item.id === 'seed-a'
    ? node('seed-a', 'shape', 60, 'seed', { seed: 8 })
    : item)
  const different = samplePositions(buildVaseBufferGeometry(evaluateGraph(differentSeedNodes, edges)).geometry)

  assert.deepEqual(sameA, sameB)
  assert.notDeepEqual(sameA, different)
})

test('vase geometry is hollow and open at the top', () => {
  const radialSegments = 12
  const heightSegments = 8
  const height = 24
  const wallThickness = 1.2
  const nodes = [
    node('profile', 'shape', 0, 'profile', { baseRadius: 5, bellyRadius: 9, neckRadius: 4, lipRadius: 6, height, wallThickness }),
    node('resolution', 'shape', 60, 'resolution', { radialSegments, heightSegments }),
    node('out', 'export', 300, 'export')
  ]
  const edges = [
    edge('profile-resolution', 'profile', 'resolution'),
    edge('resolution-out', 'resolution', 'out')
  ]
  const state = evaluateGraph(nodes, edges)
  const { geometry } = buildVaseBufferGeometry(state)
  const positions = geometry.attributes.position.array
  const outerTopIndex = heightSegments * radialSegments
  const innerTopIndex = ((heightSegments + 1) * radialSegments) + ((heightSegments - 1) * radialSegments)

  assert.equal(geometry.attributes.position.count, ((heightSegments + 1) * radialSegments) + (heightSegments * radialSegments) + 2)
  assert.equal(hasVertexAt(positions, 0, height / 2, 0), false)
  assert.equal(Number((radiusAtIndex(positions, outerTopIndex) - radiusAtIndex(positions, innerTopIndex)).toFixed(2)), wallThickness)
})

test('disconnected material nodes do not affect preview material', () => {
  const nodes = [
    node('profile', 'shape', 0, 'profile', { baseRadius: 5, bellyRadius: 9, neckRadius: 4, lipRadius: 5, height: 24 }),
    node('out', 'export', 300, 'export'),
    node('glaze', 'material', 120, 'glaze', { color: '#00ff88', roughness: 0.1, metalness: 0.7 })
  ]
  const state = evaluateGraph(nodes, [edge('profile-out', 'profile', 'out')])

  assert.equal(state.material.color, '#ffffff')
  assert.equal(state.material.metalness, 0.2)
})

test('every catalog node can participate in an active chain without breaking geometry', () => {
  for (const item of Object.values(NODE_CATALOG)) {
    const nodes = createSmokeNodes(item)
    const edges = createSmokeEdges(item)
    const state = evaluateGraph(nodes, edges)
    const { geometry } = buildVaseBufferGeometry(state)

    assert.equal(state.status, 'connected', `${item.key} should connect`)
    assert.ok(geometry.attributes.position.count > 0, `${item.key} should build vertices`)
  }
})

function samplePositions(geometry) {
  return Array.from(geometry.attributes.position.array.slice(0, 30)).map((value) => Number(value.toFixed(4)))
}

function radiusAtIndex(positions, index) {
  const offset = index * 3
  return Math.hypot(positions[offset], positions[offset + 2])
}

function hasVertexAt(positions, x, y, z) {
  for (let index = 0; index < positions.length; index += 3) {
    if (
      Math.abs(positions[index] - x) < 0.0001 &&
      Math.abs(positions[index + 1] - y) < 0.0001 &&
      Math.abs(positions[index + 2] - z) < 0.0001
    ) {
      return true
    }
  }

  return false
}

function createSmokeNodes(item) {
  const baseProfile = node('profile', 'shape', 0, 'profile', { baseRadius: 5, bellyRadius: 9, neckRadius: 4, lipRadius: 5, height: 24 })
  const smokeNode = node('smoke', item.kind, 120, item.effect ?? item.key, defaultParams(item))
  const out = node('out', 'export', 300, 'export')

  if (item.kind === 'shape') return [smokeNode, out]
  if (item.kind === 'export') return [baseProfile, smokeNode]
  return [baseProfile, smokeNode, out]
}

function createSmokeEdges(item) {
  if (item.kind === 'shape') return [edge('smoke-out', 'smoke', 'out')]
  if (item.kind === 'export') return [edge('profile-smoke', 'profile', 'smoke')]
  return [
    edge('profile-smoke', 'profile', 'smoke'),
    edge('smoke-out', 'smoke', 'out')
  ]
}

function defaultParams(item) {
  return item.controls.reduce((params, control) => {
    params[control.key] = control.default
    return params
  }, {})
}
