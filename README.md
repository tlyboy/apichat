# ApiChat

🤖 一个基于 Tauri 构建的现代化 API 客户端

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./img/dark.png">
  <img alt="ApiChat 应用截图" src="./img/light.png">
</picture>

## ✨ 特性

- 🚀 基于 Tauri 2.0 构建，性能优异
- 🎨 支持深色/浅色主题切换
- 📱 跨平台支持 (macOS, Windows, Linux)

## 📦 安装

### 从 Release 下载

1. 前往 [Releases](https://github.com/tlyboy/apichat/releases) 页面
2. 下载对应平台的安装包
3. 按照下方说明进行安装

### macOS 安装说明

由于 macOS 的安全机制，首次安装可能需要以下步骤：

1. **下载并安装应用**
2. **解除安全限制**（如果遇到"无法打开"的提示）：
   ```bash
   sudo xattr -rd com.apple.quarantine /Applications/ApiChat.app
   ```
3. **在系统偏好设置中允许**：
   - 打开 系统偏好设置 > 安全性与隐私
   - 点击"仍要打开"或"允许"

### Windows 安装

1. 下载 `.msi` 安装包
2. 双击运行安装程序
3. 按照向导完成安装

### Linux 安装

1. 下载 `.AppImage` 文件
2. 给文件添加执行权限：
   ```bash
   chmod +x ApiChat-*.AppImage
   ```
3. 双击运行或通过终端启动

## 🚀 开发

### 环境要求

- Node.js 22+
- Rust 1.70+
- pnpm

### 本地开发

```bash
# 克隆项目
git clone https://github.com/tlyboy/apichat.git
cd apichat

# 安装依赖
pnpm install

# 启动开发服务器
pnpm tauri dev
```

### 构建

```bash
# 构建应用
pnpm tauri build
```

## 📝 许可证

本项目采用 [MIT 许可证](LICENSE)。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

如果遇到问题，请：

1. 查看 [Issues](https://github.com/tlyboy/apichat/issues)
2. 创建新的 Issue 描述问题
3. 提供详细的错误信息和系统环境
