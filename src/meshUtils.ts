import { Geometry, Mesh, Vector3 } from 'three';
import Triangle from './Triangle';
import { isBufferGeometry } from './utils';
import BSPNode from './BSPNode';

export function convertGeometryToTriangles(
  geometry: Mesh['geometry']
): Triangle[] {
  const triangles: Triangle[] = [];

  if (isBufferGeometry(geometry)) {
    const position = geometry.getAttribute('position');
    const index = geometry.getIndex();
    if (index) {
      for (let i = 0; i < index.array.length; i+=3) {
        let j = index.array[i];
        const a = new Vector3(position.getX(j), position.getY(j), position.getZ(j));
        j = index.array[i + 1];
        const b = new Vector3(position.getX(j), position.getY(j), position.getZ(j));
        j = index.array[i + 2];
        const c = new Vector3(position.getX(j), position.getY(j), position.getZ(j));

        triangles.push(new Triangle(a, b, c));
      }
    } else {
      for (let j = 0; j < position.count; j++) {
        const a = new Vector3(position.getX(j), position.getY(j), position.getZ(j));
        j++;
        const b = new Vector3(position.getX(j), position.getY(j), position.getZ(j));
        j++;
        const c = new Vector3(position.getX(j), position.getY(j), position.getZ(j));

        triangles.push(new Triangle(a, b, c));
      }
    }
    return triangles;
  }

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
