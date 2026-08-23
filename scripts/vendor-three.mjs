/* Copy the pinned three.js build out of node_modules and into vendor/.
   The site ships as plain static files with no build step on the host, so the
   renderer has to live in the repo rather than come from a CDN at runtime.
   Re-run with `npm run vendor` after bumping the version in package.json. */

import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules/three/build/three.module.min.js");
const destDir = join(root, "vendor");
const dest = join(destDir, "three.module.min.js");

const pkg = JSON.parse(await readFile(join(root, "node_modules/three/package.json"), "utf8"));
const wanted = JSON.parse(await readFile(join(root, "package.json"), "utf8")).devDependencies.three;

if (pkg.version !== wanted) {
  console.error(`three is ${pkg.version} on disk but package.json pins ${wanted}. Run npm install first.`);
  process.exit(1);
}

await mkdir(destDir, { recursive: true });
await copyFile(src, dest);
const { size } = await stat(dest);

/* The bloom on the windows needs three's postprocessing modules. They import
   from "three", which the page's import map already points at the file above,
   so they can be copied across as-is with their relative paths intact. */
const EXAMPLES = [
  "postprocessing/EffectComposer.js",
  "postprocessing/Pass.js",
  "postprocessing/RenderPass.js",
  "postprocessing/ShaderPass.js",
  "postprocessing/MaskPass.js",
  "postprocessing/UnrealBloomPass.js",
  "shaders/CopyShader.js",
  "shaders/LuminosityHighPassShader.js",
];
for (const rel of EXAMPLES) {
  const from = join(root, "node_modules/three/examples/jsm", rel);
  const to = join(destDir, "three-examples", rel);
  await mkdir(dirname(to), { recursive: true });
  await copyFile(from, to);
}
console.log(`vendored ${EXAMPLES.length} postprocessing modules`);

/* Stamp the version into the import map. The filename stays put so the header
   rule keeps matching; the query is what makes `immutable` safe to serve. */
const indexPath = join(root, "index.html");
const html = await readFile(indexPath, "utf8");
const stamped = html.replace(
  /"three":\s*"\/vendor\/three\.module\.min\.js(\?v=[^"]*)?"/,
  `"three": "/vendor/three.module.min.js?v=${pkg.version}"`
);
if (stamped !== html) await writeFile(indexPath, stamped);

console.log(`vendored three ${pkg.version} → vendor/three.module.min.js (${(size / 1024).toFixed(0)} KB)`);
console.log(stamped === html ? "import map already current" : "import map updated");
