import { Geometry, Mesh, Vector3 } from 'three';
import BSPNode from './BSPNode';
import { convertGeometryToTriangles, transformBSP } from './meshUtils';
import * as boolean from './boolean';
import * as cache from './cache';

export { BSPNode, convertGeometryToTriangles, transformBSP, boolean, cache };

function geometryToMesh(geometry: Geometry, material?: Mesh['material']) {
  // center geometry & apply position to a new mesh
  geometry.computeBoundingBox();
  const offset = new Vector3();
  geometry.boundingBox.getCenter(offset);
  geometry.translate(-offset.x, -offset.y, -offset.z);

  const mesh = new Mesh(geometry, material);
  mesh.position.copy(offset);
  return mesh;
}

export function subtract(
  mesh1: Mesh,
  mesh2: Mesh,
  material?: Mesh['material']
) {
  const bsp1 = cache.getOrSetBSP(mesh1.geometry);
  const bsp2 = cache.getOrSetBSP(mesh2.geometry);

  const bsp1Transformed = transformBSP(bsp1, mesh1);
  const bsp2Transformed = transformBSP(bsp2, mesh2);

  const result = boolean.subtract(bsp1Transformed, bsp2Transformed);
  const geometry = result.toGeometry();
  cache.setBSPForGeometry(geometry, result);
  return geometryToMesh(geometry, material);
}

/**
 *
 * @param meshArray Array of meshes
 * @param operation Reference to the boolean operation to be perfomed
 * @param material
 */
export function booleanOperationArray(
  meshArray: Mesh[],
  operation: (arr: BSPNode[]) => BSPNode,
  material?: Mesh['material']
) {
  const bspArray: BSPNode[] = [];

  for (const mesh of meshArray) {
    const bsp = new BSPNode(
      convertGeometryToTriangles(mesh.geometry as THREE.Geometry)
    );
    const bspTransformed = transformBSP(bsp, mesh);

    bspArray.push(bspTransformed);
  }

  const result: BSPNode = operation(bspArray);
  const geometry = result.toGeometry();
  return geometryToMesh(geometry, material);
}

/**
 *
 * @param mesh1
 * @param mesh2
 * @param operation reference to the boolean operation to be performed
 * @param material
 */
export function booleanOperation(
  mesh1: Mesh,
  mesh2: Mesh,
  operation: (bsp1: BSPNode, bsp2: BSPNode) => BSPNode,
  material?: Mesh['material']
): Mesh {
  const bsp1 = cache.getOrSetBSP(mesh1.geometry);
  const bsp2 = cache.getOrSetBSP(mesh2.geometry);

  const bsp1Transformed = transformBSP(bsp1, mesh1);
  const bsp2Transformed = transformBSP(bsp2, mesh2);

  const result = operation(bsp1Transformed, bsp2Transformed);
  const geometry = result.toGeometry();
  cache.setBSPForGeometry(geometry, result);
  return geometryToMesh(geometry, material);
}

export function union(mesh1: Mesh, mesh2: Mesh, material?: Mesh['material']) {
  const bsp1 = cache.getOrSetBSP(mesh1.geometry);
  const bsp2 = cache.getOrSetBSP(mesh2.geometry);

  const bsp1Transformed = transformBSP(bsp1, mesh1);
  const bsp2Transformed = transformBSP(bsp2, mesh2);

  const result = boolean.union(bsp1Transformed, bsp2Transformed);
  const geometry = result.toGeometry();
  cache.setBSPForGeometry(geometry, result);
  return geometryToMesh(geometry, material);
}

export function intersect(
  mesh1: Mesh,
  mesh2: Mesh,
  material?: Mesh['material']
) {
  const bsp1 = cache.getOrSetBSP(mesh1.geometry);
  const bsp2 = cache.getOrSetBSP(mesh2.geometry);

  const bsp1Transformed = transformBSP(bsp1, mesh1);
  const bsp2Transformed = transformBSP(bsp2, mesh2);

  const result = boolean.intersect(bsp1Transformed, bsp2Transformed);
  const geometry = result.toGeometry();
  cache.setBSPForGeometry(geometry, result);
  return geometryToMesh(geometry, material);
}
