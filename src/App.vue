<template>
  <div
    ref="layoutRef"
    class="editor-layout"
    :class="{ 'is-resizing-layout': Boolean(activePanelResize) }"
    :style="layoutStyle"
  >
    <aside class="sidebar">
      <div class="sidebar-title">节点组件库</div>
      <div class="sidebar-desc">拖拽至右侧画布构建器物逻辑</div>

      <div class="sidebar-scroll-area">
        <section v-for="group in paletteGroups" :key="group.title" class="sidebar-group">
          <div class="sidebar-category">{{ group.title }}</div>
          <div
            v-for="item in group.items"
            :key="item.key"
            class="dnd-node"
            :class="item.className"
            draggable="true"
            @dragstart="onDragStart($event, item.key)"
          >
            <NodeLineIcon class="dnd-node-mark" :name="item.key" />
            <span class="dnd-node-copy">
              <strong>{{ item.shortLabel }}</strong>
            </span>
          </div>
        </section>
      </div>
    </aside>

    <div class="panel-resizer panel-resizer-left" @pointerdown.prevent="startPanelResize($event, 'sidebar')" />

    <main class="node-canvas" @drop="onDrop" @dragover.prevent>
      <VueFlow
        v-model:nodes="nodes"
        v-model:edges="edges"
        :default-edge-options="defaultEdgeOptions"
        :no-drag-class-name="'nodrag'"
        :no-wheel-class-name="'nowheel'"
        :delete-key-code="deleteKeyCode"
        :select-nodes-on-drag="false"
        :default-viewport="defaultViewport"
        :min-zoom="0.55"
        :max-zoom="1.6"
        @connect="onConnect"
      >
        <Background pattern-color="#000000" gap="20" />
        <Controls />

        <template #node-shape="props">
          <div class="custom-node icon-node border-input" :class="nodeStateClass(props)" :style="nodeWidthStyle(props.data)">
            <div class="node-title node-drag-handle bg-input">
              <span class="node-title-copy">
                <strong>{{ props.data.shortLabel }}</strong>
              </span>
              <span class="node-kind">{{ props.data.typeLabel }}</span>
            </div>
            <div class="node-content nodrag nowheel" @pointerdown.stop @mousedown.stop @touchstart.stop @click.stop @wheel.stop>
              <div v-if="props.data.controls.length" class="param-panel" :class="{ 'param-panel-open': props.data.controlsOpen }">
                <button class="param-toggle" type="button" @click.stop.prevent="toggleNodeControls(props.id)">
                  <span>参数</span>
                  <span>{{ props.data.controlsOpen ? '-' : '+' }}</span>
                </button>
                <ParamControls v-if="props.data.controlsOpen" :node-id="props.id" :data="props.data" @param-change="updateNodeParam" />
              </div>
            </div>
            <div class="node-width-resizer nodrag" @pointerdown.stop.prevent="startNodeResize($event, props.id)" />
            <Handle type="source" position="right" />
          </div>
        </template>

        <template #node-modifier="props">
          <div class="custom-node icon-node border-modifier" :class="nodeStateClass(props)" :style="nodeWidthStyle(props.data)">
            <Handle type="target" position="left" />
            <div class="node-title node-drag-handle bg-modifier">
              <span class="node-title-copy">
                <strong>{{ props.data.shortLabel }}</strong>
              </span>
              <span class="node-kind">{{ props.data.typeLabel }}</span>
            </div>
            <div class="node-content nodrag nowheel" @pointerdown.stop @mousedown.stop @touchstart.stop @click.stop @wheel.stop>
              <div v-if="props.data.controls.length" class="param-panel" :class="{ 'param-panel-open': props.data.controlsOpen }">
                <button class="param-toggle" type="button" @click.stop.prevent="toggleNodeControls(props.id)">
                  <span>参数</span>
                  <span>{{ props.data.controlsOpen ? '-' : '+' }}</span>
                </button>
                <ParamControls v-if="props.data.controlsOpen" :node-id="props.id" :data="props.data" @param-change="updateNodeParam" />
              </div>
            </div>
            <div class="node-width-resizer nodrag" @pointerdown.stop.prevent="startNodeResize($event, props.id)" />
            <Handle type="source" position="right" />
          </div>
        </template>

        <template #node-material="props">
          <div class="custom-node icon-node border-output" :class="nodeStateClass(props)" :style="nodeWidthStyle(props.data)">
            <Handle type="target" position="left" />
            <div class="node-title node-drag-handle bg-output">
              <span class="node-title-copy">
                <strong>{{ props.data.shortLabel }}</strong>
              </span>
              <span class="node-kind">{{ props.data.typeLabel }}</span>
            </div>
            <div class="node-content nodrag nowheel" @pointerdown.stop @mousedown.stop @touchstart.stop @click.stop @wheel.stop>
              <div v-if="props.data.controls.length" class="param-panel" :class="{ 'param-panel-open': props.data.controlsOpen }">
                <button class="param-toggle" type="button" @click.stop.prevent="toggleNodeControls(props.id)">
                  <span>参数</span>
                  <span>{{ props.data.controlsOpen ? '-' : '+' }}</span>
                </button>
                <ParamControls v-if="props.data.controlsOpen" :node-id="props.id" :data="props.data" @param-change="updateNodeParam" />
              </div>
            </div>
            <div class="node-width-resizer nodrag" @pointerdown.stop.prevent="startNodeResize($event, props.id)" />
            <Handle type="source" position="right" />
          </div>
        </template>

        <template #node-export="props">
          <div class="custom-node icon-node border-export" :class="nodeStateClass(props)" :style="nodeWidthStyle(props.data)">
            <Handle type="target" position="left" />
            <div class="node-title node-drag-handle bg-export">
              <span class="node-title-copy">
                <strong>{{ props.data.shortLabel }}</strong>
              </span>
              <span class="node-kind">{{ props.data.typeLabel }}</span>
            </div>
            <div class="node-content nodrag" @pointerdown.stop @mousedown.stop @touchstart.stop @click.stop>
              <div class="status-text">{{ outputStatusText(props.data.effect) }}</div>
              <div v-if="props.data.effect === 'preview'" class="mesh-stats">
                <span>{{ meshStats.vertices }} verts</span>
                <span>{{ meshStats.faces }} faces</span>
              </div>
              <button v-if="props.data.effect === 'export'" class="export-btn" type="button" @click="exportSTL">下载 STL</button>
              <button v-if="props.data.effect === 'exportObj'" class="export-btn" type="button" @click="exportOBJ">下载 OBJ</button>
              <button v-if="props.data.effect === 'snapshot'" class="export-btn" type="button" @click="exportPNG">下载 PNG</button>
            </div>
            <div class="node-width-resizer nodrag" @pointerdown.stop.prevent="startNodeResize($event, props.id)" />
          </div>
        </template>
      </VueFlow>
    </main>

    <div class="panel-resizer panel-resizer-right" @pointerdown.prevent="startPanelResize($event, 'preview')" />

    <aside class="three-panel">
      <div class="preview-status" :class="{ 'preview-status-fallback': engineState.status === 'fallback' }">
        {{ previewStatusText }}
      </div>
      <div class="three-canvas" ref="threeContainer"></div>
    </aside>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { VueFlow, Handle, addEdge, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { STLExporter } from 'three/addons/exporters/STLExporter.js'
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js'
import { NODE_CATALOG, PALETTE_GROUPS, createNodeFromCatalog } from './nodeCatalog.js'
import { VASE_PRESETS, evaluateGraph } from './graphEngine.js'
import { buildVaseGeometry } from './vaseEngine.js'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

const ParamControls = defineComponent({
  name: 'ParamControls',
  props: {
    nodeId: {
      type: String,
      required: true
    },
    data: {
      type: Object,
      required: true
    }
  },
  emits: ['param-change'],
  setup(props, { emit }) {
    const stopControlEvent = (event) => {
      event?.stopPropagation?.()
    }

    const emitParamChange = (event, key, value) => {
      stopControlEvent(event)
      emit('param-change', {
        nodeId: props.nodeId,
        key,
        value
      })
    }

    return () => h('div', { class: 'param-controls' }, props.data.controls.map((control) => {
      const value = props.data.params[control.key]

      if (control.type === 'checkbox') {
        return h('label', { class: 'control-row checkbox-row', key: control.key }, [
          h('input', {
            type: 'checkbox',
            checked: Boolean(value),
            onPointerdown: stopControlEvent,
            onMousedown: stopControlEvent,
            onTouchstart: stopControlEvent,
            onChange: (event) => {
              emitParamChange(event, control.key, event.target.checked)
            }
          }),
          control.label
        ])
      }

      if (control.type === 'select') {
        return h('label', { class: 'control-row', key: control.key }, [
          h('span', control.label),
          h('select', {
            value,
            onPointerdown: stopControlEvent,
            onMousedown: stopControlEvent,
            onTouchstart: stopControlEvent,
            onChange: (event) => {
              emitParamChange(event, control.key, event.target.value)
            }
          }, control.options.map((option) => h('option', { value: option.value }, option.label)))
        ])
      }

      if (control.type === 'color') {
        return h('label', { class: 'control-row', key: control.key }, [
          h('span', control.label),
          h('input', {
            type: 'color',
            class: 'color-picker',
            value,
            onPointerdown: stopControlEvent,
            onMousedown: stopControlEvent,
            onTouchstart: stopControlEvent,
            onInput: (event) => {
              emitParamChange(event, control.key, event.target.value)
            }
          })
        ])
      }

      return h('label', { class: 'control-row', key: control.key }, [
        h('span', `${control.label}: ${formatParamValue(value)}`),
        h('div', { class: 'range-line' }, [
          h('input', {
            type: 'range',
            min: control.min,
            max: control.max,
            step: control.step,
            value,
            onPointerdown: stopControlEvent,
            onMousedown: stopControlEvent,
            onTouchstart: stopControlEvent,
            onInput: (event) => {
              emitParamChange(event, control.key, Number(event.target.value))
            }
          }),
          h('input', {
            type: 'number',
            class: 'number-input',
            min: control.min,
            max: control.max,
            step: control.step,
            value,
            onPointerdown: stopControlEvent,
            onMousedown: stopControlEvent,
            onTouchstart: stopControlEvent,
            onInput: (event) => {
              emitParamChange(event, control.key, Number(event.target.value))
            },
            onChange: (event) => {
              emitParamChange(event, control.key, Number(event.target.value))
            }
          })
        ])
      ])
    }))
  }
})

const NodeLineIcon = defineComponent({
  name: 'NodeLineIcon',
  props: {
    name: {
      type: String,
      required: true
    }
  },
  setup(props) {
    return () => h('svg', {
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '1.8',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true'
    }, iconPaths(props.name).map((path) => h(path.tag, path.attrs)))
  }
})

function iconPaths(name) {
  const icons = {
    shape: [
      { tag: 'ellipse', attrs: { cx: 12, cy: 6, rx: 6, ry: 2.4 } },
      { tag: 'path', attrs: { d: 'M6 6v11c0 1.3 2.7 2.4 6 2.4s6-1.1 6-2.4V6' } }
    ],
    profile: [
      { tag: 'path', attrs: { d: 'M8 20c2.5-2.2 2.9-5.1 1.3-8.5C7.9 8.4 8.5 5.7 11 3' } },
      { tag: 'path', attrs: { d: 'M16 20c-2.5-2.2-2.9-5.1-1.3-8.5C16.1 8.4 15.5 5.7 13 3' } }
    ],
    preset: [
      { tag: 'path', attrs: { d: 'M4 8l8-4 8 4-8 4-8-4z' } },
      { tag: 'path', attrs: { d: 'M4 8v8l8 4 8-4V8' } },
      { tag: 'path', attrs: { d: 'M12 12v8' } }
    ],
    resolution: [
      { tag: 'path', attrs: { d: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' } }
    ],
    seed: [
      { tag: 'path', attrs: { d: 'M12 20c3-2.2 5-5.3 5-8a5 5 0 0 0-10 0c0 2.7 2 5.8 5 8z' } },
      { tag: 'path', attrs: { d: 'M12 11v9M9.5 14.5L12 17l2.5-2.5' } }
    ],
    rimLip: [
      { tag: 'path', attrs: { d: 'M6 6c2 1.6 10 1.6 12 0' } },
      { tag: 'path', attrs: { d: 'M8 7v10c0 1.5 8 1.5 8 0V7' } }
    ],
    footRing: [
      { tag: 'path', attrs: { d: 'M8 5v12c0 1.4 8 1.4 8 0V5' } },
      { tag: 'path', attrs: { d: 'M7 19h10M9 16h6' } }
    ],
    shoulder: [
      { tag: 'path', attrs: { d: 'M8 20c3-4 3-5 1-9M16 20c-3-4-3-5-1-9' } },
      { tag: 'path', attrs: { d: 'M9 11c1.4-2 4.6-2 6 0' } }
    ],
    neckPull: [
      { tag: 'path', attrs: { d: 'M9 20c2-5 2-9 0-16M15 20c-2-5-2-9 0-16' } },
      { tag: 'path', attrs: { d: 'M9 4h6' } }
    ],
    groove: [
      { tag: 'path', attrs: { d: 'M7 5c3 1.4 7 1.4 10 0M7 10c3 1.4 7 1.4 10 0M7 15c3 1.4 7 1.4 10 0M7 20c3 1.4 7 1.4 10 0' } }
    ],
    flute: [
      { tag: 'path', attrs: { d: 'M6 4c1.5 3 1.5 13 0 16M10 4c1.5 3 1.5 13 0 16M14 4c1.5 3 1.5 13 0 16M18 4c1.5 3 1.5 13 0 16' } }
    ],
    export: [
      { tag: 'path', attrs: { d: 'M12 4v10' } },
      { tag: 'path', attrs: { d: 'M8 10l4 4 4-4' } },
      { tag: 'path', attrs: { d: 'M5 18h14' } }
    ],
    exportObj: [
      { tag: 'path', attrs: { d: 'M4 8l8-4 8 4-8 4-8-4zM4 8v8l8 4 8-4V8' } }
    ],
    snapshot: [
      { tag: 'path', attrs: { d: 'M5 7h3l1.5-2h5L16 7h3v12H5z' } },
      { tag: 'circle', attrs: { cx: 12, cy: 13, r: 3 } }
    ]
  }

  return icons[name] ?? genericIcon(name)
}

function genericIcon(name) {
  if (['clay', 'glaze', 'gradientGlaze', 'speckles', 'crackle', 'material'].includes(name)) {
    return [
      { tag: 'path', attrs: { d: 'M7 6c2.4-2.4 7.6-2.4 10 0 2 2 1.7 5.5-.8 8.5L12 20l-4.2-5.5C5.3 11.5 5 8 7 6z' } },
      { tag: 'path', attrs: { d: 'M8 12c2 1.2 6 1.2 8 0' } }
    ]
  }

  if (['twist', 'scale', 'wave', 'meshify', 'taper', 'bend', 'bevel', 'bulge', 'noise', 'spiral', 'wobble', 'facet'].includes(name)) {
    return [
      { tag: 'path', attrs: { d: 'M7 5c7 0 10 3 5 7s-2 7 5 7' } },
      { tag: 'path', attrs: { d: 'M5 12h14' } }
    ]
  }

  return [
    { tag: 'path', attrs: { d: 'M5 5h14v14H5z' } },
    { tag: 'path', attrs: { d: 'M8 12h8' } }
  ]
}

const { screenToFlowCoordinate } = useVueFlow()

const paletteGroups = PALETTE_GROUPS.map((group) => ({
  ...group,
  items: group.keys.map((key) => NODE_CATALOG[key])
}))

const defaultEdgeOptions = {
  animated: true
}

const defaultViewport = {
  x: 10,
  y: 30,
  zoom: 0.95
}

const deleteKeyCode = ['Backspace', 'Delete']

const nodes = ref([
  createNodeFromCatalog('preset', { x: 24, y: 42 }, 'n-preset'),
  withNodeParams(createNodeFromCatalog('profile', { x: 210, y: 42 }, 'n-profile'), presetToProfileParams('meiping')),
  createNodeFromCatalog('glaze', { x: 24, y: 164 }, 'n-glaze'),
  createNodeFromCatalog('export', { x: 210, y: 164 }, 'n-out')
])

const edges = ref([
  { id: 'e-preset-profile', source: 'n-preset', target: 'n-profile', animated: true, class: 'edge-active' },
  { id: 'e-profile-glaze', source: 'n-profile', target: 'n-glaze', animated: true, class: 'edge-active' },
  { id: 'e-glaze-out', source: 'n-glaze', target: 'n-out', animated: true, class: 'edge-active' }
])

const engineState = ref(evaluateGraph(nodes.value, edges.value))
const threeContainer = ref(null)
const layoutRef = ref(null)
const meshStats = ref({ vertices: 0, faces: 0 })
const sidebarWidth = ref(292)
const previewWidth = ref(typeof window === 'undefined' ? 480 : Math.max(300, Math.round(window.innerWidth * 0.4)))
const activePanelResize = ref(null)
const activeNodeResize = ref(null)

const layoutStyle = computed(() => ({
  '--sidebar-width': `${sidebarWidth.value}px`,
  '--preview-width': `${previewWidth.value}px`
}))

const previewStatusText = computed(() => {
  if (engineState.value.status === 'connected') {
    return `有效链路已连接 · ${meshStats.value.faces} faces`
  }

  return '未形成完整链路，显示基础器型'
})

let scene
let camera
let renderer
let currentMesh
let controls
let animationFrame = 0
let engineFrame = 0

onMounted(() => {
  initThree()
  updateEngineNow()
  animate()
  window.addEventListener('resize', resizeRenderer)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeRenderer)
  window.removeEventListener('pointermove', handlePanelResize)
  window.removeEventListener('pointerup', stopPanelResize)
  window.removeEventListener('pointermove', handleNodeResize)
  window.removeEventListener('pointerup', stopNodeResize)
  cancelAnimationFrame(animationFrame)
  cancelAnimationFrame(engineFrame)
  disposeCurrentMesh()
  controls?.dispose()
  renderer?.dispose()
})

watch([nodes, edges], scheduleEngineUpdate, { deep: true })

function onDragStart(event, catalogKey) {
  if (!event.dataTransfer) return

  event.dataTransfer.setData('application/vueflow', catalogKey)
  event.dataTransfer.effectAllowed = 'move'
}

function onDrop(event) {
  const catalogKey = event.dataTransfer?.getData('application/vueflow')
  if (!catalogKey || !NODE_CATALOG[catalogKey]) return

  const position = screenToFlowCoordinate({
    x: event.clientX,
    y: event.clientY
  })

  nodes.value = [
    ...nodes.value,
    createNodeFromCatalog(catalogKey, position)
  ]
}

function onConnect(params) {
  const nextEdge = {
    ...params,
    id: `edge-${params.source}-${params.target}-${Date.now()}`,
    animated: true,
    class: 'edge-active'
  }

  edges.value = addEdge(nextEdge, edges.value)
}

function updateNodeParam({ nodeId, key, value }) {
  const changedNode = nodes.value.find((node) => node.id === nodeId)
  const isPresetChange = changedNode?.data?.effect === 'preset' && key === 'preset'
  const presetProfileParams = isPresetChange ? presetToProfileParams(value) : null

  nodes.value = nodes.value.map((node) => {
    if (isPresetChange && node.data?.effect === 'profile' && !hasTouchedParams(node)) {
      return {
        ...node,
        data: {
          ...node.data,
          params: {
            ...node.data.params,
            ...presetProfileParams
          }
        }
      }
    }

    if (node.id !== nodeId) return node

    return {
      ...node,
      data: {
        ...node.data,
        touchedParams: {
          ...node.data.touchedParams,
          [key]: true
        },
        params: {
          ...node.data.params,
          [key]: value
        }
      }
    }
  })

  scheduleEngineUpdate()
}

function toggleNodeControls(nodeId) {
  nodes.value = nodes.value.map((node) => {
    if (node.id !== nodeId) return node

    return {
      ...node,
      data: {
        ...node.data,
        controlsOpen: !node.data.controlsOpen
      }
    }
  })
}

function nodeWidthStyle(data) {
  return {
    width: `${clampNumber(data?.width ?? 164, 150, 360)}px`
  }
}

function startNodeResize(event, nodeId) {
  const node = nodes.value.find((item) => item.id === nodeId)
  activeNodeResize.value = {
    nodeId,
    startX: event.clientX,
    startWidth: clampNumber(node?.data?.width ?? 164, 150, 360)
  }
  window.addEventListener('pointermove', handleNodeResize)
  window.addEventListener('pointerup', stopNodeResize, { once: true })
}

function handleNodeResize(event) {
  if (!activeNodeResize.value) return

  const { nodeId, startX, startWidth } = activeNodeResize.value
  const nextWidth = clampNumber(startWidth + event.clientX - startX, 150, 360)

  nodes.value = nodes.value.map((node) => {
    if (node.id !== nodeId) return node

    return {
      ...node,
      data: {
        ...node.data,
        width: nextWidth
      }
    }
  })
}

function stopNodeResize() {
  activeNodeResize.value = null
  window.removeEventListener('pointermove', handleNodeResize)
}

function startPanelResize(event, panel) {
  activePanelResize.value = {
    panel,
    startX: event.clientX,
    startSidebarWidth: sidebarWidth.value,
    startPreviewWidth: previewWidth.value
  }
  window.addEventListener('pointermove', handlePanelResize)
  window.addEventListener('pointerup', stopPanelResize, { once: true })
}

function handlePanelResize(event) {
  if (!activePanelResize.value) return

  const layoutWidth = layoutRef.value?.clientWidth ?? window.innerWidth
  const delta = event.clientX - activePanelResize.value.startX
  const minCanvasWidth = 300

  if (activePanelResize.value.panel === 'sidebar') {
    const maxSidebarWidth = Math.max(220, layoutWidth - previewWidth.value - minCanvasWidth - 20)
    sidebarWidth.value = clampNumber(activePanelResize.value.startSidebarWidth + delta, 220, maxSidebarWidth)
  }

  if (activePanelResize.value.panel === 'preview') {
    const maxPreviewWidth = Math.max(300, layoutWidth - sidebarWidth.value - minCanvasWidth - 20)
    previewWidth.value = clampNumber(activePanelResize.value.startPreviewWidth - delta, 300, maxPreviewWidth)
    requestAnimationFrame(resizeRenderer)
  }
}

function stopPanelResize() {
  activePanelResize.value = null
  window.removeEventListener('pointermove', handlePanelResize)
  requestAnimationFrame(resizeRenderer)
}

function presetToProfileParams(presetKey) {
  const preset = VASE_PRESETS[presetKey] ?? VASE_PRESETS.meiping

  return {
    baseRadius: preset.baseRadius,
    bellyRadius: preset.bellyRadius,
    neckRadius: preset.neckRadius,
    lipRadius: preset.lipRadius,
    height: preset.height
  }
}

function withNodeParams(node, params) {
  return {
    ...node,
    data: {
      ...node.data,
      params: {
        ...node.data.params,
        ...params
      }
    }
  }
}

function hasTouchedParams(node) {
  return Object.keys(node.data?.touchedParams ?? {}).length > 0
}

function scheduleEngineUpdate() {
  if (engineFrame) return

  engineFrame = requestAnimationFrame(() => {
    engineFrame = 0
    updateEngineNow()
  })
}

function updateEngineNow() {
  const nextState = evaluateGraph(nodes.value, edges.value)
  engineState.value = nextState
  syncEdgeClasses(nextState)
  renderEngineState(nextState)
}

function syncEdgeClasses(state) {
  let changed = false
  const nextEdges = edges.value.map((edge) => {
    const active = state.activeEdgeIds.has(edge.id)
    const nextClass = active ? 'edge-active' : 'edge-muted'

    if (edge.class === nextClass && edge.animated === active) {
      return edge
    }

    changed = true
    return {
      ...edge,
      class: nextClass,
      animated: active
    }
  })

  if (changed) {
    edges.value = nextEdges
  }
}

function nodeStateClass(props) {
  if (engineState.value.activeNodeIds.has(props.id)) {
    return 'node-active'
  }

  if (engineState.value.status === 'fallback' && props.data.kind === 'shape') {
    return 'node-preview'
  }

  return 'node-muted'
}

function outputStatusText(effect) {
  if (engineState.value.status !== 'connected') {
    return '等待连接到输出端'
  }

  if (effect === 'preview') return '预览当前有效链路'
  if (effect === 'exportObj') return 'OBJ 几何导出就绪'
  if (effect === 'snapshot') return '当前视角截图就绪'
  return 'STL 模型导出就绪'
}

function initThree() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color('#0f0f0f')

  const { width, height } = getPreviewSize()
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 500)
  camera.position.set(42, 32, 46)

  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(window.devicePixelRatio)
  threeContainer.value.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05

  scene.add(new THREE.AmbientLight(0xffffff, 0.48))

  const dirLight = new THREE.DirectionalLight(0xffffff, 1)
  dirLight.position.set(20, 30, 20)
  scene.add(dirLight)

  const backLight = new THREE.DirectionalLight(0xffffff, 0.55)
  backLight.position.set(-20, -30, -20)
  scene.add(backLight)
}

function renderEngineState(state) {
  if (!scene) return

  disposeCurrentMesh()
  const { geometry, material } = buildVaseGeometry(state)
  currentMesh = new THREE.Mesh(geometry, material)
  meshStats.value = {
    vertices: geometry.attributes.position.count,
    faces: Math.round((geometry.index?.count ?? 0) / 3)
  }
  scene.add(currentMesh)
}

function disposeCurrentMesh() {
  if (!currentMesh || !scene) return

  scene.remove(currentMesh)
  currentMesh.geometry.dispose()
  currentMesh.material.dispose()
  currentMesh = null
}

function animate() {
  animationFrame = requestAnimationFrame(animate)
  controls?.update()
  renderer?.render(scene, camera)
}

function resizeRenderer() {
  if (!renderer || !camera) return

  const { width, height } = getPreviewSize()
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

function getPreviewSize() {
  const width = Math.max(1, threeContainer.value?.clientWidth ?? 1)
  const height = Math.max(1, threeContainer.value?.clientHeight ?? 1)

  return { width, height }
}

function exportSTL() {
  if (!currentMesh) return
  const exporter = new STLExporter()
  downloadText(exporter.parse(currentMesh), 'Vase_Builder_Model.stl', 'text/plain')
}

function exportOBJ() {
  if (!currentMesh) return
  const exporter = new OBJExporter()
  downloadText(exporter.parse(currentMesh), 'Vase_Builder_Model.obj', 'text/plain')
}

function exportPNG() {
  if (!renderer) return
  renderer.render(scene, camera)
  const url = renderer.domElement.toDataURL('image/png')
  const link = document.createElement('a')
  link.style.display = 'none'
  link.href = url
  link.download = 'Vase_Builder_Snapshot.png'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function downloadText(content, filename, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.style.display = 'none'
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function formatParamValue(value) {
  return typeof value === 'number' ? Number(value.toFixed(2)) : value
}

function clampNumber(value, min, max) {
  const number = Number(value)
  if (!Number.isFinite(number)) return min
  return Math.min(max, Math.max(min, number))
}
</script>

<style scoped>
.editor-layout {
  --ink-bg: #030712;
  --panel-bg: #000;
  --panel-bg-strong: #050505;
  --card-bg: #090909;
  --accent-blue: #2f66ff;
  --accent-blue-soft: rgba(47, 102, 255, 0.25);
  --accent-green: #5fe07a;
  --accent-green-soft: rgba(95, 224, 122, 0.2);
  --accent-lavender: #9d82ff;
  --accent-lavender-soft: rgba(157, 130, 255, 0.22);
  --black-line: #000;
  --divider-color: #000;
  display: flex;
  width: 100vw;
  height: 100vh;
  background: #000;
  color: #e8efff;
  font-family: Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif;
  letter-spacing: 0;
}

.sidebar {
  width: var(--sidebar-width);
  flex: 0 0 var(--sidebar-width);
  background: #000;
  display: flex;
  flex-direction: column;
  z-index: 10;
  box-shadow: none;
}

.sidebar-title {
  font-size: 18px;
  font-weight: 800;
  color: #f7fbff;
  padding: 22px 24px 8px;
  text-shadow: none;
}

.sidebar-desc {
  font-size: 12px;
  color: #94a8cc;
  padding: 0 24px 18px;
  border-bottom: 1px solid #000;
}

.sidebar-scroll-area {
  flex: 1;
  overflow-y: auto;
  padding: 18px 24px 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sidebar-scroll-area::-webkit-scrollbar {
  display: none;
}

.sidebar-group {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.sidebar-category {
  grid-column: 1 / -1;
  font-size: 13px;
  font-weight: 800;
  color: #d6e1ff;
  margin-top: 8px;
  margin-bottom: 3px;
}

.dnd-node {
  background: linear-gradient(180deg, #111318, #090a0d);
  min-height: 58px;
  padding: 11px 12px;
  border-radius: 6px;
  cursor: grab;
  color: #e8efff;
  transition: background-color 0.2s, transform 0.2s, border-color 0.2s, box-shadow 0.2s;
  border: 1px solid #1b2230;
  border-top: 2px solid #000;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035), 0 10px 20px rgba(0, 0, 0, 0.32);
}

.dnd-node:hover {
  background: linear-gradient(180deg, #151821, #0c0d11);
  transform: translateY(-2px);
  border-color: #2a3447;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 14px 24px rgba(0, 0, 0, 0.38);
}

.input-node {
  border-top-color: #000;
}

.modifier-node {
  border-top-color: #000;
}

.output-node {
  border-top-color: #000;
}

.dnd-node-mark {
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  display: block;
  border: none;
  background: transparent;
  color: var(--accent-blue);
}

.modifier-node .dnd-node-mark {
  color: var(--accent-green);
}

.output-node .dnd-node-mark {
  color: var(--accent-lavender);
}

.dnd-node-copy {
  display: flex;
  min-width: 0;
}

.dnd-node-copy strong {
  color: #f6f9ff;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.15;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-canvas {
  flex: 1 1 auto;
  min-width: 320px;
  position: relative;
  background: #000;
}

.node-canvas::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: radial-gradient(circle, #000 1px, transparent 1px);
  background-size: 22px 22px;
  opacity: 1;
  z-index: 0;
}

.node-canvas :deep(.vue-flow) {
  position: relative;
  z-index: 1;
}

.three-panel {
  width: var(--preview-width);
  flex: 0 0 var(--preview-width);
  min-width: 360px;
  position: relative;
  background: #000;
}

.panel-resizer {
  flex: 0 0 7px;
  position: relative;
  z-index: 30;
  cursor: col-resize;
  background: #000;
  border-left: 1px solid #2a2d34;
  border-right: 1px solid #111318;
  box-shadow: none;
}

.panel-resizer::after {
  content: '';
  position: absolute;
  inset: 12px 2px;
  border-radius: 999px;
  background: #3a3d45;
  opacity: 0.82;
  transition: opacity 0.2s, transform 0.2s;
}

.panel-resizer:hover::after,
.is-resizing-layout .panel-resizer::after {
  opacity: 1;
  transform: scaleX(1.4);
}

.three-canvas {
  width: 100%;
  height: 100%;
}

.preview-status {
  position: absolute;
  top: 18px;
  left: 18px;
  z-index: 2;
  border: 1px solid #000;
  background: rgba(0, 0, 0, 0.82);
  color: #d8e5ff;
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 12px;
  backdrop-filter: blur(8px);
  pointer-events: none;
  box-shadow: none;
}

.preview-status::before {
  content: '';
  width: 9px;
  height: 9px;
  display: inline-block;
  margin-right: 8px;
  border-radius: 50%;
  background: var(--accent-green);
  box-shadow: 0 0 12px rgba(95, 224, 122, 0.75);
  vertical-align: -1px;
}

.preview-status-fallback {
  color: var(--accent-lavender);
}

.custom-node {
  background: linear-gradient(180deg, #11141b, #07080b);
  border-radius: 8px;
  width: 164px;
  color: #e8efff;
  box-shadow: 0 18px 34px rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.035);
  backdrop-filter: blur(5px);
  border: 1px solid #202838;
  transition: opacity 0.2s, filter 0.2s, border-color 0.2s;
  position: relative;
  overflow: visible;
}

.node-active {
  opacity: 1;
  border-color: #303b50;
  box-shadow: 0 20px 38px rgba(0, 0, 0, 0.48), 0 0 0 1px rgba(255, 255, 255, 0.025), inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.node-preview {
  opacity: 1;
  border-color: #292d3b;
}

.node-muted {
  opacity: 0.48;
  filter: saturate(0.72);
}

.border-input {
  box-shadow: 0 -2px 0 #111827 inset, 0 18px 34px rgba(0, 0, 0, 0.42);
}

.border-modifier {
  box-shadow: 0 -2px 0 #111827 inset, 0 18px 34px rgba(0, 0, 0, 0.42);
}

.border-output {
  box-shadow: 0 -2px 0 #111827 inset, 0 18px 34px rgba(0, 0, 0, 0.42);
}

.border-export {
  box-shadow: 0 -2px 0 #111827 inset, 0 18px 34px rgba(0, 0, 0, 0.42);
}

.node-title {
  min-height: 38px;
  padding: 10px 12px;
  font-weight: bold;
  font-size: 12px;
  border-bottom: 1px solid #171d28;
  border-radius: 8px 8px 0 0;
  display: flex;
  gap: 7px;
  align-items: center;
  cursor: grab;
  user-select: none;
}

.node-title:active {
  cursor: grabbing;
}

.node-kind {
  color: #a9bce8;
  font-size: 9px;
  font-weight: 700;
  white-space: nowrap;
  margin-left: auto;
}

.node-title-copy {
  min-width: 0;
  display: flex;
}

.node-title-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  color: #f7fbff;
  font-size: 12px;
  line-height: 1.1;
  white-space: nowrap;
}

.bg-input {
  background: linear-gradient(90deg, #151925, #0c0d12);
}

.bg-modifier {
  background: linear-gradient(90deg, #151925, #0c0d12);
}

.bg-output {
  background: linear-gradient(90deg, #151925, #0c0d12);
}

.bg-export {
  background: linear-gradient(90deg, #151925, #0c0d12);
}

.node-content,
.param-controls {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.node-content {
  padding: 8px 10px 10px;
}

.param-panel {
  border: 1px solid #171d28;
  border-radius: 6px;
  background: #050608;
}

.param-toggle {
  cursor: pointer;
  color: #dce7ff;
  width: 100%;
  border: none;
  background: transparent;
  font-size: 11px;
  font-weight: 800;
  padding: 5px 7px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  user-select: none;
}

.param-toggle:hover {
  color: #fff;
  background: #0b0b0b;
}

.param-panel-open .param-toggle {
  border-bottom: 1px solid #171d28;
}

.param-panel .param-controls {
  padding: 6px;
}

.node-width-resizer {
  position: absolute;
  top: 8px;
  right: -5px;
  bottom: 8px;
  width: 9px;
  cursor: ew-resize;
  border-radius: 999px;
  z-index: 4;
}

.node-width-resizer::after {
  content: '';
  position: absolute;
  top: 42%;
  right: 2px;
  width: 3px;
  height: 28px;
  border-radius: 999px;
  background: #303846;
  opacity: 0.52;
  transition: opacity 0.2s, transform 0.2s;
}

.custom-node:hover .node-width-resizer::after {
  opacity: 0.9;
  transform: scaleX(1.3);
}

.control-row {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  gap: 4px;
  align-items: center;
  font-size: 10.5px;
  color: #c5d5f8;
}

.control-row > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.checkbox-row {
  display: flex;
  gap: 6px;
}

input[type='range'] {
  width: 100%;
  height: 12px;
  cursor: ew-resize;
  accent-color: var(--accent-blue);
}

.range-line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px;
  gap: 4px;
  align-items: center;
}

.number-input {
  width: 100%;
  box-sizing: border-box;
  background: #000;
  color: #e8efff;
  border: 1px solid #171d28;
  border-radius: 5px;
  padding: 2px 3px;
  font-size: 10.5px;
}

select {
  width: 100%;
  background: #000;
  color: #e8efff;
  border: 1px solid #171d28;
  border-radius: 5px;
  padding: 3px 5px;
  font-size: 10.5px;
}

.color-picker {
  width: 100%;
  height: 18px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  background: transparent;
}

.export-btn {
  background: linear-gradient(180deg, #3f78ff, #285bff);
  color: white;
  border: none;
  padding: 9px;
  border-radius: 7px;
  cursor: pointer;
  font-weight: 800;
  transition: transform 0.2s, box-shadow 0.2s;
  width: 100%;
  font-size: 12px;
  box-shadow: 0 10px 22px rgba(47, 102, 255, 0.28);
}

.export-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 28px rgba(47, 102, 255, 0.42);
}

.status-text {
  font-size: 11px;
  color: #aabce5;
  text-align: center;
}

.mesh-stats {
  display: flex;
  justify-content: space-between;
  color: var(--accent-green);
  font-size: 11px;
  border: 1px solid #171d28;
  border-radius: 5px;
  padding: 5px 6px;
}

:deep(.edge-active path) {
  stroke: var(--accent-green);
  stroke-width: 2.5;
  stroke-dasharray: 7 8;
  filter: drop-shadow(0 0 5px rgba(95, 224, 122, 0.8));
}

:deep(.edge-muted path) {
  opacity: 0.35;
  stroke-dasharray: 5 5;
}

:deep(.vue-flow__handle) {
  width: 9px;
  height: 9px;
  border: 1px solid #4b5565;
  background: #0b0d12;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.65);
}

:deep(.vue-flow__controls) {
  display: flex;
  gap: 6px;
  background: rgba(0, 0, 0, 0.68);
  border: 1px solid #2a2d34;
  border-radius: 10px;
  overflow: visible;
  padding: 6px;
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.34);
  backdrop-filter: blur(8px);
}

:deep(.vue-flow__controls-button) {
  position: relative;
  width: 54px;
  height: 40px;
  display: grid;
  grid-template-rows: 14px 1fr;
  place-items: center;
  gap: 3px;
  background: linear-gradient(180deg, #111318, #07080b);
  border: 1px solid #2a2d34;
  border-radius: 8px;
  color: #dce7ff;
  transition: border-color 0.18s, background 0.18s, transform 0.18s;
}

:deep(.vue-flow__controls-button:hover) {
  background: linear-gradient(180deg, #171a22, #0b0d11);
  border-color: #3a3d45;
  transform: translateY(-1px);
}

:deep(.vue-flow__controls-button svg) {
  width: 13px;
  height: 13px;
  grid-row: 1;
}

:deep(.vue-flow__controls-button::after) {
  grid-row: 2;
  color: #9aa6bd;
  content: '';
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

:deep(.vue-flow__controls-zoomin::after) {
  content: '放大';
}

:deep(.vue-flow__controls-zoomout::after) {
  content: '缩小';
}

:deep(.vue-flow__controls-fitview::after) {
  content: '适配';
}

:deep(.vue-flow__controls-interactive::after) {
  content: '锁定';
}

:deep(.param-controls) {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

:deep(.control-row) {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  gap: 4px;
  align-items: center;
  font-size: 10.5px;
  color: #c5d5f8;
}

:deep(.control-row > span) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.checkbox-row) {
  display: flex;
  gap: 6px;
  align-items: center;
}

:deep(input[type='range']) {
  width: 100%;
  height: 12px;
  cursor: ew-resize;
  accent-color: var(--accent-blue);
}

:deep(.range-line) {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px;
  gap: 4px;
  align-items: center;
}

:deep(.number-input) {
  width: 100%;
  box-sizing: border-box;
  background: #000;
  color: #e8efff;
  border: 1px solid #171d28;
  border-radius: 5px;
  padding: 2px 3px;
  font-size: 10.5px;
}

:deep(select) {
  width: 100%;
  background: #000;
  color: #e8efff;
  border: 1px solid #171d28;
  border-radius: 5px;
  padding: 3px 5px;
  font-size: 10.5px;
}

:deep(.color-picker) {
  width: 100%;
  height: 18px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  background: transparent;
}
</style>
