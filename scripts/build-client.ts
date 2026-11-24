import { build } from "esbuild";

await build({
  entryPoints: ["src/client/main.tsx"],
  tsconfig: "tsconfig.client.json",
  bundle: true,
  format: "esm",
  outdir: "public/build",
  loader: { ".png": "file", ".woff2": "file", ".woff": "file" },
  assetNames: "assets/[name]-[hash]",
  jsx: "automatic",
  jsxImportSource: "react",
  minify: true,
  sourcemap: true,
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  logLevel: "warning",
});
