# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

ApiChat 是一个基于 Tauri v2 + Vue 3 的跨平台 API 调试工具，支持 HTTP 和 WebSocket 请求测试。

## 常用命令

```bash
# 安装依赖
pnpm install

# 开发模式（仅前端）
pnpm dev

# 开发模式（Tauri 桌面应用）
pnpm tauri dev

# 构建生产版本
pnpm build

# 构建 Tauri 桌面应用
pnpm tauri build
```

## 技术架构

### 前端技术栈
- **Vue 3** + TypeScript + Composition API
- **Vite**（使用 rolldown-vite）作为构建工具
- **Tailwind CSS v4** 样式方案
- **Pinia** 状态管理（带持久化插件）
- **Vue Router** 文件系统路由（unplugin-vue-router）
- **Monaco Editor** 代码编辑器（带 Shiki 语法高亮）

### Tauri 后端
- **Tauri v2** 桌面应用框架
- 插件：http（请求代理）、websocket、opener、os

### 自动导入配置
项目配置了多个自动导入插件（vite.config.ts）：
- **unplugin-auto-import**: 自动导入 Vue、VueRouter、VueUse、Pinia API
- **unplugin-vue-components**: 自动注册 Vue 组件
- **unplugin-vue-router**: 文件系统路由，页面放在 `src/pages/` 目录
- **vite-plugin-vue-layouts**: 布局系统，布局放在 `src/layouts/` 目录

### 目录结构
```
src/
├── pages/           # 页面组件（自动生成路由）
│   ├── index.vue    # HTTP 请求页面
│   └── websocket.vue # WebSocket 页面
├── layouts/         # 布局组件
├── components/      # 通用组件
├── composables/     # 组合式函数
├── utils/           # 工具函数
│   ├── request.ts   # HTTP 请求封装（使用 Tauri HTTP 插件）
│   └── websocket.ts # WebSocket 客户端封装
└── styles.css       # 全局样式

src-tauri/          # Tauri Rust 后端
```

## 关键实现

### HTTP 请求
使用 `@tauri-apps/plugin-http` 发送请求，绕过浏览器 CORS 限制。请求封装在 `src/utils/request.ts`。

### WebSocket
使用 `@tauri-apps/plugin-websocket` 建立 WebSocket 连接。客户端类封装在 `src/utils/websocket.ts`。

### 深色模式
通过 VueUse 的 `useDark()` 实现，支持 View Transition API 动画切换。

### 图标
使用 `@egoist/tailwindcss-icons` + `@iconify-json/carbon`，通过 Tailwind 类名使用图标（如 `i-carbon-send`）。
