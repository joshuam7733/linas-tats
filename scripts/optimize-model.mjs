// Prepares a body model for the web: removes the rig (the preview never animates), puts every surface
// under one node, then welds and meshopt-compresses it. The body is the first (largest) primitive; small
// helper parts such as nails, lips and eyes are kept after it because some models have holes without them.
// Usage: node scripts/optimize-model.mjs <input.glb> <output.glb>
// Run `npm run optimize-model` to rebuild both bodies.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, weld } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('Usage: node scripts/optimize-model.mjs <input.glb> <output.glb>');
  process.exit(1);
}

await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder,
});

const doc = await io.read(input);
const root = doc.getRoot();

// The body is the primitive with the most vertices; everything else is a helper surface.
let body = null;
for (const node of root.listNodes()) {
  for (const prim of node.getMesh()?.listPrimitives() ?? []) {
    const count = prim.getAttribute('POSITION').getCount();
    if (!body || count > body.count) body = { node, prim, count };
  }
}
if (!body) throw new Error(`No mesh found in ${input}`);

// Gather every primitive onto the body's mesh, body first, so the app can treat primitive 0 as the skin.
const mesh = body.node.getMesh();
mesh.setName('Body');
const helpers = [];
for (const node of root.listNodes()) {
  const other = node.getMesh();
  if (!other) continue;
  for (const prim of other.listPrimitives()) {
    if (prim === body.prim) continue;
    if (!node.getWorldMatrix().every((v, i) => Math.abs(v - body.node.getWorldMatrix()[i]) < 1e-6)) continue;
    helpers.push(prim);
    other.removePrimitive(prim);
  }
}
for (const prim of mesh.listPrimitives()) mesh.removePrimitive(prim);
for (const prim of [body.prim, ...helpers]) {
  mesh.addPrimitive(prim);
  for (const semantic of prim.listSemantics()) {
    if (semantic.startsWith('JOINTS_') || semantic.startsWith('WEIGHTS_')) prim.setAttribute(semantic, null);
  }
}

for (const node of root.listNodes()) node.setSkin(null);
for (const skin of root.listSkins()) skin.dispose();
for (const anim of root.listAnimations()) anim.dispose();

// Keep only the body node, at its world transform, directly under the scene.
for (const scene of root.listScenes()) {
  const worldMatrix = body.node.getWorldMatrix();
  for (const child of scene.listChildren()) scene.removeChild(child);
  body.node.getParentNode()?.removeChild(body.node);
  body.node.setMatrix(worldMatrix);
  scene.addChild(body.node);
}
for (const node of root.listNodes()) if (node !== body.node) node.dispose();

await doc.transform(prune(), dedup(), weld(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(output, doc);
console.log(`Wrote ${output} (${body.count} body vertices)`);
