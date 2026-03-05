import { execSync } from 'child_process'

// Get Rust target triple
const target = execSync('rustc -vV')
  .toString()
  .match(/host: (.+)/)?.[1]
  ?.trim()

if (!target) {
  console.error('Failed to detect Rust target triple')
  process.exit(1)
}

const outfile = `../apichat-mcp-${target}`

console.log(`Building for target: ${target}`)
execSync(`bun build src/index.ts --compile --minify --outfile ${outfile}`, {
  stdio: 'inherit',
})
console.log(`Output: ${outfile}`)
