import * as THREE from 'three';
import BSPNode, { bspTree2NumberArray, bspTree2ArrayBuffer, arrayBuffer2BSPTree, numberArray2BSPTree } from './BSPNode';
import Triangle from './Triangle';
import { convertGeometryToTriangles } from './meshUtils';



describe('BSPNode', () => {
  describe('toNumberArray - fromNumberArray', () => {
    it('Serializes BSPNode to an array of numbers', () => {
      debugger;
      const cubeGeom: THREE.CubeGeometry = new THREE.CubeGeometry(20, 20, 20);
      const triangles: Triangle[] = convertGeometryToTriangles(cubeGeom);
      const bsp: BSPNode = new BSPNode(triangles);
      const arr: number[] = bspTree2NumberArray(bsp);

      const bsp2: BSPNode = numberArray2BSPTree(arr);



      expect(bsp2.triangles).toEqual(bsp.triangles);
      if (bsp.front) {
        expect(bsp2.front).toBeDefined();
        expect(bsp2.front!.triangles).toEqual(bsp.front!.triangles);
      }

      if (bsp.back) {
        expect(bsp2.back).toBeDefined();
        expect(bsp2.back!.triangles).toEqual(bsp.back!.triangles);
      }

      expect(bsp.isInverted).toEqual(bsp2.isInverted);

      if (bsp.boundingBox) {
        expect(bsp2.boundingBox).toBeDefined();
        expect(bsp.boundingBox!).toEqual(bsp2.boundingBox!);
      }
    })
  });

  describe('toBufferArray - fromBufferArray', () => {
    it('Serializes BSPNode to an ArrayBuffer', () => {
      const cubeGeom: THREE.CubeGeometry = new THREE.CubeGeometry(20, 20, 20);
      const triangles: Triangle[] = convertGeometryToTriangles(cubeGeom);
      const bsp: BSPNode = new BSPNode(triangles);
      const buff: ArrayBuffer = bspTree2ArrayBuffer(bsp);

      const bsp2: BSPNode = arrayBuffer2BSPTree(buff);

      expect(bsp2.triangles).toEqual(bsp.triangles);
      if (bsp.front) {
        expect(bsp2.front).toBeDefined();
        expect(bsp2.front!.triangles).toEqual(bsp.front!.triangles);
      }

      if (bsp.back) {
        expect(bsp2.back).toBeDefined();
        expect(bsp2.back!.triangles).toEqual(bsp.back!.triangles);
      }

      expect(bsp.isInverted).toEqual(bsp2.isInverted);

      if (bsp.boundingBox) {
        expect(bsp2.boundingBox).toBeDefined();
        expect(bsp.boundingBox!).toEqual(bsp2.boundingBox!);
      }
    })
  })
});