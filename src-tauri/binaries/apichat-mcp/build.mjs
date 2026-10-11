import { execSync } from 'child_process'

// Use TAURI_ENV_TARGET_TRIPLE if available (set by Tauri during build),
// otherwise detect from rustc
const target =
  process.env.TAURI_ENV_TARGET_TRIPLE ||
  execSync('rustc -vV')
    .toString()
    .match(/host: (.+)/)?.[1]
    ?.trim()

if (!target) {
  console.error('Failed to detect target triple')
  process.exit(1)
}

// Map Rust target triple to Bun --target for cross-compilation
const BUN_TARGET_MAP = {
  'x86_64-apple-darwin': 'bun-darwin-x64',
  'aarch64-apple-darwin': 'bun-darwin-arm64',
  'x86_64-unknown-linux-gnu': 'bun-linux-x64',
  'aarch64-unknown-linux-gnu': 'bun-linux-arm64',
  'x86_64-pc-windows-msvc': 'bun-windows-x64',
}

const bunTarget = BUN_TARGET_MAP[target]
const targetFlag = bunTarget ? `--target=${bunTarget}` : ''
const outfile = `../apichat-mcp-${target}${target.includes('windows') ? '.exe' : ''}`

console.log(`Building for target: ${target}${bunTarget ? ` (bun: ${bunTarget})` : ''}`)
execSync(`bun build src/index.ts --compile --minify ${targetFlag} --outfile ${outfile}`, {
  stdio: 'inherit',
})
console.log(`Output: ${outfile}`)
