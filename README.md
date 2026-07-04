# 数据库原理学习系统 (Database Learning System)

这是一个基于 React + TypeScript + Vite 构建的现代化在线学习系统，专门用于《数据库原理》课程的备考与刷题。系统包含了丰富的真题库，支持选择、判断、简答、SQL实训等多种题型，并内置了 AI 辅导与 LaTeX 公式支持。

## 🌟 主要功能特点

- **全题型支持**：涵盖单选题、判断题、简答题、综合大题以及 SQL 实训题。
- **现代化 UI 设计**：
  - 玻璃拟态 (Glassmorphism) 卡片式布局，平滑动画过渡。
  - 支持 **暗黑模式 (Dark Mode)** 和 **浅色模式 (Light Mode)** 无缝切换。
  - 答题卡抽屉栏：清晰展示做题进度、正确/错误状态。
- **智能交互与反馈**：
  - 实时判题反馈：提交答案后立刻显示正确/错误状态与标准答案解析。
  - **题库乱序模式**：支持一键开启/关闭题目随机打乱，方便反复练习。
  - 大题上下文整合：自动合并多段实训小问，并在题干自动注入前置背景表结构。
- **丰富的文本渲染支持**：
  - 支持 `LaTeX` 渲染（例如关系代数：$R \bowtie S$ 等公式符号）。
  - 支持复杂题目中自带的 E-R 图及数据库结构图无缝渲染。
- **AI 智能答疑模块**：
  - 侧边栏集成了可拖拽、可缩放的悬浮 AI 聊天窗口。
  - （预留功能，需自行接入后端服务）

## 🚀 技术栈

- **核心框架**：React 18 + TypeScript
- **构建工具**：Vite
- **样式与图标**：纯 CSS (CSS Variables) + Lucide React (SVG图标)
- **数学公式渲染**：KaTeX (`react-katex`)
- **数据源**：本地 JSON 题库结构

## 📦 项目配置需求

### 运行环境
- **Node.js**: `v16.0.0` 及以上版本
- **npm** (或 `pnpm`, `yarn`)

### 依赖安装

因为系统内置了一些数学公式解析与图标库组件，在第一次启动前需要安装所有依赖：

```bash
# 推荐使用国内镜像源（如淘宝、清华源）以加快安装速度
npm install --registry=https://registry.npmmirror.com
```

### 启动开发服务器

```bash
npm run dev
```
运行后，在浏览器中打开控制台输出的地址（默认通常为 `http://localhost:5173`）即可体验。

### 打包与构建

如果你需要将项目打包成纯静态网页（例如部署到 Nginx、GitHub Pages 或 Vercel），请执行：

```bash
npm run build
```
打包成功后，所有可发布的静态文件将会生成在根目录下的 `dist/` 文件夹中，直接将 `dist` 文件夹发给其他人或部署即可。

## 📁 核心目录结构说明

```text
db-learning-system/
├── public/
│   └── images/              # 存放 PDF 原试卷提取出的 E-R 图与数据库插图
├── src/
│   ├── assets/
│   │   ├── questions.json   # 核心题库数据文件（包含题目、选项、答案、解析）
│   │   └── dictionary.json  # 数据字典映射
│   ├── components/
│   │   └── AIChatWindow.tsx # 可拖拽的 AI 智能聊天悬浮窗组件
│   ├── App.tsx              # 学习系统主逻辑与核心视图
│   ├── App.css              # 核心样式（涵盖亮暗模式、高亮解析等）
│   ├── index.css            # 全局样式初始化
│   └── main.tsx             # React 挂载入口
└── package.json             # 依赖与脚本配置
```

## 🛠️ 数据结构参考 (questions.json)

如果你想自己添加题目，可以参考以下 JSON 格式：

```json
{
  "id": 1,
  "type": "choice",
  "question": "关系数据库管理系统应能实现的专门关系运算包括（ ）。",
  "answer": "B",
  "options": [
    { "label": "A", "text": "排序、索引、统计" },
    { "label": "B", "text": "选择、投影、连接" }
  ],
  "difficulty": "B",
  "chapter": "关系代数",
  "conceptKeys": ["关系运算"],
  "explanation": "专门的关系运算主要包括：选择、投影、连接和除法。"
}
```

---
*Developed by Gemini Antigravity Agent*
