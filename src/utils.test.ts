import {Mesh, BoxGeometry, SphereGeometry, Face3} from 'three';
import {convertGeometryToTriangles} from './meshUtils';
import {isConvexSet} from './utils';

describe('utils', () => {
    describe('isConvexSet', () => {
        it('recognizes a box as convex', () => {
            const boxGeometry = new BoxGeometry(1, 1, 1);
            const mesh = new Mesh(boxGeometry);
            const triangles = convertGeometryToTriangles(mesh.geometry);

            expect(isConvexSet(triangles)).toBe(true);
        });

        it('recognizes a box with one flipped face as concave', () => {
            const boxGeometry = new BoxGeometry(1, 1, 1);
            boxGeometry.faces[0] = new Face3(boxGeometry.faces[0].c, boxGeometry.faces[0].b, boxGeometry.faces[0].a);
            const mesh = new Mesh(boxGeometry);
            const triangles = convertGeometryToTriangles(mesh.geometry);

            expect(isConvexSet(triangles)).toBe(false);
        });

        it('recognizes a sphere as convex', () => {
            const sphereGeometry = new SphereGeometry(5);
            const mesh = new Mesh(sphereGeometry);
            const triangles = convertGeometryToTriangles(mesh.geometry);

            expect(isConvexSet(triangles)).toBe(true);
        });

        it('recognizes a sphere with one flipped face as concave', () => {
            const sphereGeometry = new SphereGeometry(5);
            sphereGeometry.faces[10] = new Face3(sphereGeometry.faces[10].c, sphereGeometry.faces[10].b, sphereGeometry.faces[10].a);
            const mesh = new Mesh(sphereGeometry);
            const triangles = convertGeometryToTriangles(mesh.geometry);

            expect(isConvexSet(triangles)).toBe(false);
        });
    });
});