import Triangle, { CLASSIFY_BACK, CLASSIFY_COPLANAR, CLASSIFY_FRONT, CLASSIFY_SPANNING } from './Triangle';
import { Vector3 } from 'three';

describe('Triangle', () => {
    describe('constructor', () => {
        it('sets vertices and w', () => {
            const a = new Vector3(0, 0, 5);
            const b = new Vector3(-1, 1, 5);
            const c = new Vector3(-2, 0, 5);

            const triangle = new Triangle(a, b, c);
            expect(triangle.a).not.toBe(a);
            expect(triangle.a).toEqual(a);

            expect(triangle.b).not.toBe(b);
            expect(triangle.b).toEqual(b);

            expect(triangle.c).not.toBe(c);
            expect(triangle.c).toEqual(c);

            expect(triangle.normal).toEqual({ x: 0, y: 0, z: 1 });
            expect(triangle.w).toEqual(5);
        });
    });

    describe('classifyPoint', () => {
        it('classifies coplanar points', () => {
            const triangle = new Triangle(
                new Vector3(-3, 0, 1),
                new Vector3(-3, 1, 0),
                new Vector3(-3, 0, -1)
            );

            expect(triangle.classifyPoint(new Vector3(-3, 0.5, 0.5))).toBe(CLASSIFY_COPLANAR);
            expect(triangle.classifyPoint(new Vector3(-3, -700, 5))).toBe(CLASSIFY_COPLANAR);
            expect(triangle.classifyPoint(triangle.a)).toBe(CLASSIFY_COPLANAR);
            expect(triangle.classifyPoint(triangle.b)).toBe(CLASSIFY_COPLANAR);
            expect(triangle.classifyPoint(triangle.c)).toBe(CLASSIFY_COPLANAR);
        });

        it('classifies front points', () => {
            const triangle = new Triangle(
                new Vector3(2, -3, 0),
                new Vector3(0, -3, 1),
                new Vector3(-1, -3, 0)
            );

            expect(triangle.classifyPoint(new Vector3(0, -6, 0.5))).toBe(CLASSIFY_FRONT);
            expect(triangle.classifyPoint(new Vector3(200, -3.0001, -400))).toBe(CLASSIFY_FRONT);
        });

        it('classifies back points', () => {
            const triangle = new Triangle(
                new Vector3(-1, -3, 0),
                new Vector3(0, -3, 1),
                new Vector3(-2, -3, 0)
            );

            expect(triangle.classifyPoint(new Vector3(0, 6, 0.5))).toBe(CLASSIFY_BACK);
            expect(triangle.classifyPoint(new Vector3(200, -2.9999, -400))).toBe(CLASSIFY_BACK);
        });
    });

    describe('classifySide', () => {
        it('classifies as coplanar', () => {
            const triangleA = new Triangle(
                new Vector3(1, 0, 0),
                new Vector3(0, 1, 0),
                new Vector3(-1, 0, 0)
            );
            const triangleB = new Triangle(
                new Vector3(5, -4, 0),
                new Vector3(3, -8, 0),
                new Vector3(2, -2, 0)
            );

            expect(triangleA.classifySide(triangleB)).toBe(CLASSIFY_COPLANAR);
        });

        it('classifies as front', () => {
            const triangleA = new Triangle(
                new Vector3(1, 0, 0),
                new Vector3(0, 1, 0),
                new Vector3(-1, 0, 0)
            );
            const triangleB = new Triangle(
                new Vector3(1, 0, 1.5),
                new Vector3(0, 1, 1),
                new Vector3(-1, 0, 2)
            );

            expect(triangleA.classifySide(triangleB)).toBe(CLASSIFY_FRONT);
        });

        it('classifies as back', () => {
            const triangleA = new Triangle(
                new Vector3(1, 0, 0),
                new Vector3(0, 1, 0),
                new Vector3(-1, 0, 0)
            );
            const triangleB = new Triangle(
                new Vector3(1, 0, -1.5),
                new Vector3(0, 1, -1),
                new Vector3(-1, 0, -2)
            );

            expect(triangleA.classifySide(triangleB)).toBe(CLASSIFY_BACK);
        });

        it('classifies as spanning', () => {
            const triangleA = new Triangle(
                new Vector3(1, 0, 0),
                new Vector3(0, 1, 0),
                new Vector3(-1, 0, 0)
            );
            const triangleB = new Triangle(
                new Vector3(1, 0, 1.5),
                new Vector3(0, 1, -1),
                new Vector3(-1, 0, 2)
            );

            expect(triangleA.classifySide(triangleB)).toBe(CLASSIFY_SPANNING);
        });
    });

    describe('clone', () => {
        it('clones the triangle', () => {
            const a = new Vector3(1, 2, 3);
            const b = new Vector3(4, 5, 6);
            const c = new Vector3(7, 8, 9);
            const triangle = new Triangle(a, b, c);

            const cloned = triangle.clone();
            expect(cloned).not.toBe(triangle);
            expect(cloned.a).not.toBe(a);
            expect(cloned.b).not.toBe(b);
            expect(cloned.c).not.toBe(c);

            expect(cloned).toEqual(triangle);
        });
    });

    describe('toNumberArray', () => {
        it('Serialize the triangle into an array', () => {
            const a = new Vector3(1, 2, 3);
            const b = new Vector3(4, 5, 6);
            const c = new Vector3(7, 8, 9);
            const triangle = new Triangle(a, b, c);

            const arr: number[] = triangle.toNumberArray();
            expect(arr).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 0, 0, 0]);
        })
    });



    describe('fromNumberArray', () => {
        it('Deserialize the triangle into an array', () => {
            const a = new Vector3(1, 2, 3);
            const b = new Vector3(4, 6, 6);
            const c = new Vector3(7, 8, 9);
            const triangle = new Triangle(a, b, c);
            const normal = triangle.normal.clone();
            const w = triangle.w;

            const arr: number[] = triangle.toNumberArray();
            const deTriangle: Triangle = new Triangle();
            deTriangle.fromNumberArray(arr);

            expect(deTriangle.a).toEqual(a);
            expect(deTriangle.b).toEqual(b);
            expect(deTriangle.c).toEqual(c);
            expect(deTriangle.normal).toEqual(normal);
            expect(deTriangle.w).toEqual(w);
        })
    });

    describe('toBufferArray', () => {
        it('Serialize the triangle into an array', () => {
            const a = new Vector3(1, 2, 3);
            const b = new Vector3(4, 5, 6);
            const c = new Vector3(7, 8, 9);

            const triangle = new Triangle(a, b, c);

            const buff: ArrayBuffer = triangle.toArrayBuffer();
            const arr: number[] = triangle.toNumberArray();
            expect(Float32Array.from(arr).buffer).toEqual(buff);
        })
    });

    describe('fromBufferArray', () => {
        it('Deserialize the triangle into an array', () => {
            const a = new Vector3(1, 2, 3);
            const b = new Vector3(4, 5, 6);
            const c = new Vector3(2, 8, 9);
            const triangle = new Triangle(a, b, c);
            const normal = triangle.normal.clone();
            const w = triangle.w;


            const buff: ArrayBuffer = triangle.toArrayBuffer();
            const deTriangle: Triangle = new Triangle();
            deTriangle.fromArrayBuffer(buff);

            expect(deTriangle.a).toEqual(a);
            expect(deTriangle.b).toEqual(b);
            expect(deTriangle.c).toEqual(c);
            expect(deTriangle.normal.x).toBeCloseTo(normal.x);
            expect(deTriangle.normal.y).toBeCloseTo(normal.y);
            expect(deTriangle.normal.z).toBeCloseTo(normal.z);
            expect(deTriangle.w).toBeCloseTo(w);
        })
    })
});