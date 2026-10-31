// Lists every mesh primitive in a GLB with its vertex count and bounds, to pick out the body surface.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(process.argv[2]);
for (const node of doc.getRoot().listNodes()) {
  const mesh = node.getMesh();
  if (!mesh) continue;
  mesh.listPrimitives().forEach((prim, i) => {
    const pos = prim.getAttribute('POSITION');
    const min = pos.getMinNormalized([]).map((v) => v.toFixed(3));
    const max = pos.getMaxNormalized([]).map((v) => v.toFixed(3));
    const attrs = prim.listSemantics().join(',');
    const indices = prim.getIndices()?.getCount() ?? 0;
    console.log(`${node.getName()} / ${mesh.getName()}[${i}] verts=${pos.getCount()} tris=${indices / 3} min=${min} max=${max} attrs=${attrs} mat=${prim.getMaterial()?.getName()}`);
  });
}
