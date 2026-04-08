import { build, context } from "esbuild";

const shared = {
  entryPoints: ["client/game.ts"],
  bundle: true,
  format: "esm",
  sourcemap: true,
  target: "es2022",
  outfile: "public/game.js",
  logLevel: "info",
};

if (process.argv.includes("--watch")) {
  const ctx = await context(shared);
  await ctx.watch();
  console.log("Watching client bundle...");
} else {
  await build(shared);
}
