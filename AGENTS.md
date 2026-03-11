# AGENTS.md

This file provides guidance to AI agents when working with code in this repository.

## Development Commands

```bash
# Install dependencies
pnpm install

# Start development (Tauri + Vite)
pnpm tauri dev

# Build for production
pnpm tauri build

# Frontend only development
pnpm dev

# Type check
pnpm build  # runs tsc && vite build

# Format code
pnpm prettier --write .
```

## Architecture Overview

This is a **Tauri 2.0 + React 19 + TypeScript** desktop application.

### Tech Stack

- **Frontend**: React 19 with React Compiler (babel-plugin-react-compiler)
- **Styling**: Tailwind CSS 4 with @egoist/tailwindcss-icons (Carbon icons)
- **Build**: Vite (via rolldown-vite) with Tauri integration
- **Backend**: Rust (Tauri 2.0)
- **Package Manager**: pnpm

### Project Structure

- `src/` - React frontend code
  - `components/` - Reusable React components (theme-provider, mode-toggle)
  - `layouts/` - Page layout wrappers
  - `index.css` - Global styles and Tailwind configuration
- `src-tauri/` - Rust backend code
  - `src/lib.rs` - Tauri commands and app initialization
  - `src/main.rs` - Application entry point
  - `tauri.conf.json` - Tauri configuration

### Key Patterns

- **Path alias**: Use `@/` to import from `src/` directory
- **Theme system**: ThemeProvider with dark/light/system modes, persisted to localStorage
- **Icons**: Use Tailwind classes like `i-carbon-*` for Carbon icons
- **Custom components**: `.btn` and `.icon-btn` utility classes defined in index.css

### Tauri Commands

Define Rust commands in `src-tauri/src/lib.rs` using `#[tauri::command]` macro, then register them in `invoke_handler`.
