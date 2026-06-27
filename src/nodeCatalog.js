const NODE_META = {
  shape: ['柱', '基础柱体', '提供简单柱状器身'],
  profile: ['廓', '截面轮廓', '控制底、腹、颈、口半径'],
  preset: ['器', '器型预设', '快速切换梅瓶、胆瓶、罐等'],
  resolution: ['精', '模型精度', '调节网格细分密度'],
  seed: ['籽', '随机种子', '锁定噪波和手作变化'],
  twist: ['扭', '扭曲', '沿高度旋转器身'],
  scale: ['缩', '缩放', '整体放大或收缩'],
  wave: ['波', '波浪', '让轮廓产生横向摆动'],
  meshify: ['网', '网格化', '显示线框结构'],
  taper: ['锥', '锥化', '按高度收放半径'],
  bend: ['弯', '弯曲', '让器身向一侧弯折'],
  bevel: ['倒', '倒角', '柔化上下边缘'],
  bulge: ['鼓', '膨胀', '强化中腹鼓起'],
  noise: ['噪', '随机噪波', '加入细小不规则起伏'],
  spiral: ['旋', '螺旋', '生成旋转纹理动势'],
  rimLip: ['口', '口沿', '调整外翻、厚度和圆润度'],
  footRing: ['足', '圈足', '塑造底部圈足和内凹'],
  shoulder: ['肩', '肩线', '强化上肩饱满转折'],
  neckPull: ['颈', '拉颈', '拉高并收窄瓶颈'],
  wobble: ['手', '手作偏摆', '加入稳定的手拉坯偏差'],
  facet: ['面', '切面', '把圆器切成多面器'],
  groove: ['槽', '环形凹槽', '沿高度刻出水平凹槽'],
  flute: ['筋', '竖向筋纹', '生成竖向起伏筋线'],
  clay: ['土', '胎土', '设置胎土底色和颗粒感'],
  glaze: ['釉', '釉色', '设置釉色、光泽和金属感'],
  gradientGlaze: ['渐', '渐变釉', '上下釉色渐变融合'],
  speckles: ['斑', '铁斑', '叠加窑变点状色斑'],
  crackle: ['裂', '开片', '显示细裂纹视觉层'],
  material: ['材', '材质颜色', '通用颜色和金属度'],
  preview: ['看', '预览', '查看当前有效链路'],
  export: ['STL', '导出 STL', '下载三维打印模型'],
  exportObj: ['OBJ', '导出 OBJ', '下载通用网格模型'],
  snapshot: ['PNG', '截图 PNG', '保存当前视角图片']
}

export const NODE_CATALOG = {
  shape: inputNode('shape', '基础柱体', '基础柱体 Shape', [
    range('sides', '边数', 6, 3, 32, 1),
    range('radius', '半径', 8, 2, 24, 0.5),
    range('height', '高度', 20, 4, 60, 0.5)
  ]),
  profile: inputNode('profile', '截面轮廓', '截面轮廓 Profile', [
    range('baseRadius', '底部半径', 5.8, 1, 22, 0.1),
    range('bellyRadius', '腹部半径', 10.5, 1, 28, 0.1),
    range('neckRadius', '颈部半径', 4.2, 1, 18, 0.1),
    range('lipRadius', '口沿半径', 5.4, 1, 20, 0.1),
    range('height', '器身高度', 26, 6, 70, 0.5)
  ]),
  preset: inputNode('preset', '器型预设', '器型预设 Preset', [
    select('preset', '器型', 'meiping', [
      ['meiping', '梅瓶'],
      ['danping', '胆瓶'],
      ['jar', '罐'],
      ['bowl', '碗'],
      ['cup', '杯']
    ])
  ]),
  resolution: inputNode('resolution', '模型精度', '模型精度 Resolution', [
    range('radialSegments', '径向分段', 48, 12, 96, 1),
    range('heightSegments', '高度分段', 72, 16, 128, 1)
  ]),
  seed: inputNode('seed', '随机种子', '随机种子 Seed', [
    range('seed', '种子', 42, 1, 999, 1)
  ]),

  twist: modifierNode('twist', '扭曲 Twist', [range('intensity', '形变强度', 1, -10, 10, 0.1)]),
  scale: modifierNode('scale', '缩放 Scale', [range('intensity', '形变强度', 1, -10, 10, 0.1)]),
  wave: modifierNode('wave', '波浪 Wave', [range('intensity', '形变强度', 1, -10, 10, 0.1)]),
  meshify: modifierNode('meshify', '网格化 Meshify', [checkbox('wireframe', '开启线框', true)]),
  taper: modifierNode('taper', '锥化 Taper', [range('intensity', '形变强度', 1, -10, 10, 0.1)]),
  bend: modifierNode('bend', '弯曲 Bend', [range('intensity', '形变强度', 1, -10, 10, 0.1)]),
  bevel: modifierNode('bevel', '倒角 Bevel', [range('intensity', '形变强度', 1, -10, 10, 0.1)]),
  bulge: modifierNode('bulge', '膨胀 Bulge', [range('intensity', '形变强度', 1, -10, 10, 0.1)]),
  noise: modifierNode('noise', '随机噪波 Noise', [range('intensity', '形变强度', 1, -10, 10, 0.1)]),
  spiral: modifierNode('spiral', '螺旋 Spiral', [range('intensity', '形变强度', 1, -10, 10, 0.1)]),
  rimLip: modifierNode('rimLip', '口沿 Rim Lip', [
    range('flare', '外翻', 1.4, -4, 6, 0.1),
    range('thickness', '厚度', 0.9, 0, 4, 0.1),
    range('roundness', '圆润', 0.55, 0, 1, 0.05)
  ]),
  footRing: modifierNode('footRing', '圈足 Foot Ring', [
    range('height', '高度', 1.8, 0, 6, 0.1),
    range('radiusBoost', '外扩', 1.2, -3, 5, 0.1),
    range('inset', '内凹', 0.6, 0, 4, 0.1)
  ]),
  shoulder: modifierNode('shoulder', '肩线 Shoulder', [
    range('position', '高度位置', 0.68, 0.2, 0.9, 0.01),
    range('strength', '饱满度', 2.2, -5, 6, 0.1)
  ]),
  neckPull: modifierNode('neckPull', '拉颈 Neck Pull', [
    range('height', '颈部高度', 0.26, 0.05, 0.55, 0.01),
    range('narrowing', '收口比例', 0.22, 0, 0.75, 0.01)
  ]),
  wobble: modifierNode('wobble', '手作偏摆 Wobble', [
    range('intensity', '偏摆强度', 1.1, 0, 5, 0.1),
    range('frequency', '频率', 2, 1, 8, 1)
  ]),
  facet: modifierNode('facet', '切面 Facet', [
    range('facets', '面数', 12, 4, 32, 1),
    range('sharpness', '锐度', 0.65, 0, 1, 0.05)
  ]),
  groove: modifierNode('groove', '环形凹槽 Groove', [
    range('count', '数量', 5, 1, 18, 1),
    range('depth', '深度', 0.8, 0, 4, 0.1),
    range('range', '覆盖范围', 0.7, 0.1, 1, 0.05)
  ]),
  flute: modifierNode('flute', '竖向筋纹 Flute', [
    range('count', '数量', 16, 3, 48, 1),
    range('depth', '深度', 0.55, 0, 4, 0.1),
    range('offset', '旋转偏移', 0, 0, 6.28, 0.01)
  ]),

  clay: materialNode('clay', '胎土 Clay Body', '胎土 Clay Body', [
    color('color', '胎土色', '#b9825f'),
    range('roughness', '粗糙度', 0.78, 0, 1, 0.05),
    range('grain', '颗粒感', 0.18, 0, 1, 0.05)
  ]),
  glaze: materialNode('glaze', '釉色 Glaze', '釉色 Glaze', [
    color('color', '釉色', '#7bb7a6'),
    range('roughness', '光泽', 0.28, 0, 1, 0.05),
    range('metalness', '金属度', 0.05, 0, 1, 0.05)
  ]),
  gradientGlaze: materialNode('gradientGlaze', '渐变釉 Gradient', '渐变釉 Gradient', [
    color('topColor', '上釉色', '#d9f3ff'),
    color('bottomColor', '下釉色', '#315f72'),
    range('mix', '混合强度', 1, 0, 1, 0.05)
  ]),
  speckles: materialNode('speckles', '铁斑 Speckles', '铁斑 Speckles', [
    color('color', '斑点色', '#2f2118'),
    range('density', '密度', 0.32, 0, 1, 0.05),
    range('strength', '强度', 0.65, 0, 1, 0.05)
  ]),
  crackle: materialNode('crackle', '开片 Crackle', '开片 Crackle', [
    checkbox('enabled', '显示开片线', true),
    range('intensity', '线条强度', 0.35, 0, 1, 0.05)
  ]),
  material: materialNode('material', '材质与颜色', '材质与颜色调整', [
    color('color', 'RGB 颜色', '#ffffff'),
    range('metalness', '材质金属度', 0.2, 0, 1, 0.1)
  ]),

  preview: outputNode('preview', '预览 Render', '预览 Render'),
  export: outputNode('export', '导出 STL', '导出 STL'),
  exportObj: outputNode('exportObj', '导出 OBJ', '导出 OBJ'),
  snapshot: outputNode('snapshot', '截图 PNG', '截图 PNG')
}

export const PALETTE_GROUPS = [
  {
    title: '基础输入 (Input)',
    keys: ['shape', 'profile', 'preset', 'resolution', 'seed']
  },
  {
    title: '形体处理 (Form)',
    keys: ['rimLip', 'footRing', 'shoulder', 'neckPull', 'wobble', 'facet', 'groove', 'flute']
  },
  {
    title: '变形处理 (Modifier)',
    keys: ['twist', 'scale', 'wave', 'meshify', 'taper', 'bend', 'bevel', 'bulge', 'noise', 'spiral']
  },
  {
    title: '表面材质 (Surface)',
    keys: ['clay', 'glaze', 'gradientGlaze', 'speckles', 'crackle', 'material']
  },
  {
    title: '渲染与输出 (Output)',
    keys: ['preview', 'export', 'exportObj', 'snapshot']
  }
]

export function cloneParams(params) {
  return JSON.parse(JSON.stringify(params))
}

export function getDefaultParams(controls = []) {
  return controls.reduce((params, control) => {
    params[control.key] = control.default
    return params
  }, {})
}

export function createNodeFromCatalog(key, position, id = createNodeId(key)) {
  const item = NODE_CATALOG[key]

  if (!item) {
    throw new Error(`Unknown node catalog key: ${key}`)
  }

  return {
    id,
    type: item.kind,
    dragHandle: '.node-drag-handle',
    position,
    data: {
      label: item.label,
      shortLabel: item.shortLabel,
      note: item.note,
      icon: item.icon,
      typeLabel: item.typeLabel,
      kind: item.kind,
      effect: item.effect ?? item.key,
      catalogKey: item.key,
      accent: item.accent,
      controls: cloneParams(item.controls),
      controlsOpen: false,
      width: 164,
      params: cloneParams(getDefaultParams(item.controls))
    }
  }
}

function inputNode(key, label, paletteLabel, controls) {
  return catalogNode(key, 'shape', key, label, paletteLabel, 'input-node', 'input', controls)
}

function modifierNode(key, label, controls) {
  return catalogNode(key, 'modifier', key, label, label, 'modifier-node', 'modifier', controls)
}

function materialNode(key, label, paletteLabel, controls) {
  return catalogNode(key, 'material', key, label, paletteLabel, 'output-node', 'output', controls)
}

function outputNode(key, label, paletteLabel) {
  return catalogNode(key, 'export', key, label, paletteLabel, 'output-node', 'export', [])
}

function catalogNode(key, kind, effect, label, paletteLabel, className, accent, controls) {
  const [icon, shortLabel, note] = NODE_META[key] ?? [label.slice(0, 1), label, paletteLabel]

  return { key, kind, effect, label, paletteLabel, shortLabel, note, icon, typeLabel: kindLabel(kind), className, accent, controls }
}

function kindLabel(kind) {
  if (kind === 'shape') return '输入'
  if (kind === 'modifier') return '处理'
  if (kind === 'material') return '表面'
  return '输出'
}

function range(key, label, defaultValue, min, max, step) {
  return { type: 'range', key, label, default: defaultValue, min, max, step }
}

function color(key, label, defaultValue) {
  return { type: 'color', key, label, default: defaultValue }
}

function checkbox(key, label, defaultValue) {
  return { type: 'checkbox', key, label, default: defaultValue }
}

function select(key, label, defaultValue, options) {
  return {
    type: 'select',
    key,
    label,
    default: defaultValue,
    options: options.map(([value, optionLabel]) => ({ value, label: optionLabel }))
  }
}

function createNodeId(key) {
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${key}-${suffix}`
}
