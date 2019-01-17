import {Geometry, Mesh, Vector3} from 'three';
import BSPNode from './BSPNode';
import convertMeshToTriangles from './convertMeshToTriangles';
import * as boolean from './boolean';

export {BSPNode, convertMeshToTriangles, boolean};

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

export function subtract(mesh1: Mesh, mesh2: Mesh, material?: Mesh['material']) {
    const bsp1 = new BSPNode(convertMeshToTriangles(mesh1));
    const bsp2 = new BSPNode(convertMeshToTriangles(mesh2));
    const geometry = boolean.subtract(bsp1, bsp2).toGeometry();
    return geometryToMesh(geometry, material);
}

export function union(mesh1: Mesh, mesh2: Mesh, material?: Mesh['material']) {
    const bsp1 = new BSPNode(convertMeshToTriangles(mesh1));
    const bsp2 = new BSPNode(convertMeshToTriangles(mesh2));
    const geometry = boolean.union(bsp1, bsp2).toGeometry();
    return geometryToMesh(geometry, material);
}

export function intersect(mesh1: Mesh, mesh2: Mesh, material?: Mesh['material']) {
    const bsp1 = new BSPNode(convertMeshToTriangles(mesh1));
    const bsp2 = new BSPNode(convertMeshToTriangles(mesh2));
    const geometry = boolean.intersect(bsp1, bsp2).toGeometry();
    return geometryToMesh(geometry, material);
}