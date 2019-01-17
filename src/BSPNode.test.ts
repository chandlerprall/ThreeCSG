import {BoxGeometry, Mesh} from 'three';
import convertMeshToTriangles from './convertMeshToTriangles';
import BSPNode from './BSPNode';

describe('BSPNode', () => {
    describe('buildFrom', () => {
        it('creates a single-node tree for already convex geometry', () => {
            const boxGeometry = new BoxGeometry(5);
            const boxMesh = new Mesh(boxGeometry);
            const triangles = convertMeshToTriangles(boxMesh);
            const bspTree = new BSPNode();
            bspTree.buildFrom(triangles);

            expect(bspTree.divider).not.toBe(triangles[0]);
            expect(bspTree.divider).toEqual(triangles[0]);
            expect(bspTree.triangles).toBe(triangles);
            expect(bspTree).not.toHaveProperty('front');
            expect(bspTree).not.toHaveProperty('back');
        });
    });
});