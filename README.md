# Vase Builder

Vase Builder 是一个基于节点的花瓶与陶瓷器型建模器。你可以像搭积木一样把器型输入、形体处理、材质表面和导出节点连接起来，在右侧实时查看 Three.js 预览，并将结果导出为 STL、OBJ 或 PNG。

## 功能亮点

- 节点式建模画布：使用 Vue Flow 拖拽节点、连接处理链路，并按画布位置计算有效输出。
- 实时三维预览：使用 Three.js 根据当前图计算生成器身网格、材质颜色和表面效果。
- 器型预设：内置梅瓶、胆瓶、罐、碗、杯等基础器型。
- 形体处理：支持口沿、圈足、肩线、拉颈、手作偏摆、切面、凹槽、筋纹、扭曲、缩放、波浪、锥化、弯曲、倒角、膨胀、噪波和螺旋等节点。
- 表面材质：支持胎土、釉色、渐变釉、铁斑、开片线框和通用材质颜色。
- 多格式导出：支持下载 STL、OBJ 模型，也可以保存当前视角 PNG 截图。

## 技术栈

- Vue 3
- Vite
- Vue Flow
- Three.js
- Node.js 内置测试框架

## 快速开始

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

运行测试：

```bash
npm test
```

构建生产版本：

```bash
npm run build
```

本地预览生产构建：

```bash
npm run preview
```

## 项目结构

```text
src/
  App.vue              # 主编辑器界面、节点画布、Three.js 预览与导出逻辑
  nodeCatalog.js       # 节点目录、默认参数和侧边栏分组
  graphEngine.js       # 图计算逻辑：筛选有效链路并生成建模状态
  vaseEngine.js        # 根据建模状态生成 Three.js BufferGeometry 与材质
  graphEngine.test.js  # 图计算和几何生成的回归测试
  style.css            # 应用样式
public/
  favicon.png
```

## 扩展节点

新增节点通常需要改动三个地方：

1. 在 `src/nodeCatalog.js` 中注册节点、参数控件和所属分组。
2. 在 `src/graphEngine.js` 中决定该节点如何进入建模状态。
3. 在 `src/vaseEngine.js` 中实现节点对几何或材质的实际影响。

如果节点改变了图计算规则或几何结果，建议同步补充 `src/graphEngine.test.js` 中的测试。

## 导出说明

- `导出 STL` 适合三维打印或切片软件。
- `导出 OBJ` 适合通用三维软件继续编辑。
- `截图 PNG` 会保存当前预览视角。

## 开发验证

当前项目使用 Node.js 内置测试框架覆盖图计算、节点连通性、参数覆盖、随机种子稳定性和节点目录烟雾测试。提交前建议至少执行：

```bash
npm test
npm run build
```
