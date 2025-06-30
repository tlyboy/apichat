# Tauri + Vue 3 + TypeScript 桌面应用模板

🚀 基于 Vite + Vue 3 + TypeScript + Tauri 的现代桌面应用启动模板

## 特性

- ⚡ 极速 Vite 构建，热更新体验极佳
- 🖥️ 使用 Tauri 打包，轻量高性能跨平台桌面应用
- 🎨 Vue 3 + TypeScript 现代化开发体验
- 🗂️ 支持文件系统自动路由与布局（可扩展）
- 🪄 自动导入 API 与组件（可集成 unplugin-auto-import/unplugin-vue-components）
- 🌈 集成 Tailwind CSS，支持自定义图标
- 🗃️ 状态管理集成 Pinia，支持持久化
- 📱 响应式设计，兼容桌面与移动端
- 🚀 一键打包发布，支持 Windows/macOS/Linux

## 快速开始

1. 克隆项目：

   ```bash
   git clone https://github.com/tlyboy/tauri-vue-starter.git my-tauri-app
   cd my-tauri-app
   ```

2. 安装依赖：

   ```bash
   pnpm install
   ```

3. 本地开发（Web 端预览）：

   ```bash
   pnpm dev
   ```

4. 启动 Tauri 桌面应用开发模式：

   ```bash
   pnpm tauri dev
   ```

5. 构建生产包（Web）：

   ```bash
   pnpm build
   ```

6. 打包桌面应用（Tauri）：

   ```bash
   pnpm tauri build
   ```

## 环境要求

- Node.js 22.x
- pnpm 10.6.2 及以上
- Rust 环境（Tauri 依赖，详见 [Tauri 安装文档](https://tauri.app/zh-cn/start/prerequisites/)）

## 目录结构

```
├── src/
│   ├── components/    # 组件
│   ├── layouts/       # 页面布局
│   ├── pages/         # 页面（自动路由）
│   ├── router/        # 路由配置
│   ├── styles.css     # 全局样式
│   └── main.ts        # 应用入口
├── public/            # 静态资源
├── src-tauri/         # Tauri 后端（Rust 代码）
├── package.json
├── vite.config.ts
├── tauri.conf.json
└── ...
```

## 打包与发布

### 桌面端（Tauri）

1. 构建前端：

   ```bash
   pnpm build
   ```

2. 打包桌面应用：

   ```bash
   pnpm tauri build
   ```

   生成的安装包在 `src-tauri/target/release/bundle/` 目录下。

### Web 端

可部署 `dist/` 目录到任意静态服务器。

## 常见问题

- Tauri 相关依赖或打包问题请参考 [Tauri 官方文档](https://tauri.app/zh-cn/)
- 如需集成更多插件或功能，欢迎提 Issue 或 PR

## 使用许可

[MIT](LICENSE) © Guany
