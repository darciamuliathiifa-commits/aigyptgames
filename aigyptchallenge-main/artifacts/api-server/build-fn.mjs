/**
 * Bundles src/app.ts into a CJS bundle for the Vercel serverless function.
 * Output dir: api/_bundled/
 * Main entry: _bundled/app.cjs  (pino worker files land alongside it)
 * Run via: pnpm --filter @workspace/api-server run build:fn
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { mkdir } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(artifactDir, "../../api/_bundled");

await mkdir(outDir, { recursive: true });

await esbuild({
  entryPoints: [path.resolve(artifactDir, "src/app.ts")],
  platform: "node",
  bundle: true,
  format: "cjs",
  outdir: outDir,
  outExtension: { ".js": ".cjs" },
  logLevel: "info",
  external: [
    "*.node",
    "pg-native",
    "fsevents",
    "bufferutil",
    "utf-8-validate",
    "cpu-features",
    "ssh2",
  ],
  plugins: [
    esbuildPluginPino({ transports: ["pino-pretty"] }),
  ],
});

console.log(`\n✓ Bundled serverless function → ${outDir}/app.cjs\n`);
