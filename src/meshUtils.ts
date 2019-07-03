import { Geometry, Mesh } from 'three';
import Triangle from './Triangle';
import { isBufferGeometry } from './utils';
import BSPNode from './BSPNode';

export function convertGeometryToTriangles(
  geometry: Mesh['geometry']
): Triangle[] {
  if (isBufferGeometry(geometry)) {
    throw new Error('threecsg: Only Three.Geometry is supported.');
  }

  const triangles: Triangle[] = [];

  const { faces, vertices } = geometry;
  for (let i = 0; i < faces.length; i++) {
    const face = faces[i];

    const a = vertices[face.a];
    const b = vertices[face.b];
    const c = vertices[face.c];

    const triangle = new Triangle(a, b, c);

    triangles.push(triangle);
  }

  return triangles;
}

export function transformBSP(bsp: BSPNode, mesh: Mesh) {
  mesh.updateMatrixWorld(true);
  const { matrixWorld: transform } = mesh;
  return bsp.clone(transform);
}
