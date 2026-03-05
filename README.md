# ApiChat

🤖 A modern API client built with Tauri

- 🚀 Built with Tauri 2.0 + React 19 for excellent performance
- 🎨 Dark / Light theme support
- 🌐 i18n support (English, 简体中文)
- 📱 Cross-platform support (macOS, Windows, Linux)
- 🔌 Built-in MCP Server for AI integration
- 📦 OpenAPI import / export
- 📝 Request history
- 🔗 WebSocket client

## Install

### Download from Releases

Go to the [Releases](https://github.com/tlyboy/apichat/releases) page and download the installer for your platform.

### Build from Source

Requires [Rust](https://www.rust-lang.org/) and [Bun](https://bun.sh/) to be installed.

```bash
git clone https://github.com/tlyboy/apichat.git
cd apichat
pnpm install
pnpm tauri dev
```

## MCP Server

ApiChat includes a built-in MCP (Model Context Protocol) server that allows AI assistants to interact with your saved APIs, history, and WebSocket connections.

### Configuration

**Claude Code** (`.mcp.json`):

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

**Codex** (`.codex/config.toml`):

```toml
[mcp_servers.apichat]
url = "http://localhost:45677/mcp"
```

## License

[MIT](https://opensource.org/licenses/MIT) © Guany
