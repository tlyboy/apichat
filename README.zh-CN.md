# ApiChat

🤖 基于 Tauri 构建的现代 API 客户端

- 🚀 基于 Tauri 2.0 + React 19，性能优异
- 🎨 深色 / 浅色主题
- 🌐 国际化支持（English、简体中文）
- 📱 跨平台支持（macOS、Windows、Linux）
- 🔌 内置 MCP Server，支持 AI 集成
- 📦 OpenAPI 导入 / 导出
- 📝 请求历史记录
- 🔗 WebSocket 客户端

## 安装

### 从 Releases 下载

前往 [Releases](https://github.com/tlyboy/apichat/releases) 页面下载对应平台的安装包。

### 从源码构建

需要安装 [Rust](https://www.rust-lang.org/) 和 [Bun](https://bun.sh/)。

```bash
git clone https://github.com/tlyboy/apichat.git
cd apichat
pnpm install
pnpm tauri dev
```

## MCP Server

ApiChat 内置 MCP（Model Context Protocol）服务器，AI 助手可以通过它操作已保存的 API、历史记录和 WebSocket 连接。

### 配置

**Claude Code**（`.mcp.json`）：

```json
{
  "mcpServers": {
    "apichat": {
      "type": "http",
      "url": "http://localhost:45677/mcp"
    }
  }
}
```

**Codex**（`.codex/config.toml`）：

```toml
[mcp_servers.apichat]
url = "http://localhost:45677/mcp"
```

## 使用许可

[MIT](https://opensource.org/licenses/MIT) © Guany
