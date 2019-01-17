import {Mesh} from 'three';
import Triangle from './Triangle';
import {isBufferGeometry} from './utils';

export default function convertMeshToTriangles(mesh: Mesh): Triangle[] {
    if (isBufferGeometry(mesh.geometry)) {
        throw new Error(' Only meshes with Three.Geometry are supported.');
    }

    const triangles: Triangle[] = [];

    mesh.updateMatrixWorld(true);
    const { matrixWorld: transform } = mesh;

    const { geometry: { faces, vertices } } = mesh;
    for (let i = 0; i < faces.length; i++) {
        const face = faces[i];

        const a = vertices[face.a].clone();
        const b = vertices[face.b].clone();
        const c = vertices[face.c].clone();
        a.applyMatrix4(transform);
        b.applyMatrix4(transform);
        c.applyMatrix4(transform);

        const triangle = new Triangle(a, b, c);

        triangles.push(triangle);
    }

    return triangles;
}