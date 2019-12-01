import Triangle, {
  CLASSIFY_BACK,
  CLASSIFY_COPLANAR,
  CLASSIFY_FRONT,
  CLASSIFY_SPANNING,
} from './Triangle';
import { isConvexSet } from './utils';
import { Box3, Face3, Geometry, BufferGeometry, Float32BufferAttribute, Matrix4, Vector3 } from 'three';

const MINIMUM_RELATION = 0.8; // 0 -> 1
const MINIMUM_RELATION_SCALE = 10; // should always be >2

/**
 * Algorithm adapted from Binary Space Partioning Trees and Polygon Removal in Real Time 3D Rendering
 * Samuel Ranta-Eskola, 2001
 */
function chooseDividingTriangle(triangles: Triangle[]): Triangle | undefined {
  if (isConvexSet(triangles)) return triangles[0];

  let minimumRelation = MINIMUM_RELATION;
  let bestTriangle: Triangle | undefined = undefined;
  let leastSplits = Infinity;
  let bestRelation = 0;

  // Find the triangle that best divides the set
  while (bestTriangle === undefined) {
    for (let i = 0; i < triangles.length; i++) {
      const triangleOuter = triangles[i];

      // Count the number of polygons on the positive side, negative side, and spanning the plane defined by the current triangle
      let numFront = 0;
      let numBack = 0;
      let numSpanning = 0;
      for (let j = 0; j < triangles.length; j++) {
        if (i === j) continue;
        const triangleInner = triangles[j];
        const side = triangleOuter.classifySide(triangleInner);

        if (side === CLASSIFY_SPANNING) {
          numSpanning++;
        } else if (side === CLASSIFY_FRONT) {
          numFront++;
        } else if (side === CLASSIFY_BACK) {
          numBack++;
        }
      }

      // Calculate the relation between the number of triangles in the two sets divided by the current triangle
      const relation =
        numFront < numBack ? numFront / numBack : numBack / numFront;

      // Compare the results given by the current triangle to the best so far.
      // If the this triangle splits fewer triangles and the relation
      // between the resulting sets is acceptable this is the new candidate
      // triangle. If the current triangle splits the same amount of triangles
      // as the best triangle so far and the relation between the two
      // resulting sets is better then this triangle is the new candidate
      // triangle.
      if (
        minimumRelation === 0 ||
        (relation > minimumRelation &&
          (numSpanning < leastSplits ||
            (numSpanning === leastSplits && relation > bestRelation)))
      ) {
        bestTriangle = triangleOuter;
        leastSplits = numSpanning;
        bestRelation = relation;
      }
    }
    minimumRelation = minimumRelation / MINIMUM_RELATION_SCALE;
  }

  return bestTriangle;
}

export default class BSPNode {
  public divider?: Triangle;
  public front?: BSPNode;
  public back?: BSPNode;
  public triangles: Triangle[];
  public isInverted: boolean;
  public boundingBox: Box3;

  static interpolateVectors(a: Vector3, b: Vector3, t: number): Vector3 {
    return a.clone().lerp(b, t);
  }

  static splitTriangle(
    triangle: Triangle,
    divider: Triangle,
    frontTriangles: Triangle[],
    backTriangles: Triangle[]
  ): void {
    const vertices = [triangle.a, triangle.b, triangle.c];
    const frontVertices: Vector3[] = [];
    const backVertices: Vector3[] = [];

    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      const vi = vertices[i];
      const vj = vertices[j];
      const ti = divider.classifyPoint(vi);
      const tj = divider.classifyPoint(vj);

      if (ti != CLASSIFY_BACK) frontVertices.push(vi);
      if (ti != CLASSIFY_FRONT) backVertices.push(vi);
      if ((ti | tj) === CLASSIFY_SPANNING) {
        const t =
          (divider.w - divider.normal.dot(vi)) /
          divider.normal.dot(vj.clone().sub(vi));
        const v = BSPNode.interpolateVectors(vi, vj, t);
        frontVertices.push(v);
        backVertices.push(v);
      }
    }

    if (frontVertices.length >= 3)
      Array.prototype.push.apply(
        frontTriangles,
        BSPNode.verticesToTriangles(frontVertices)
      );
    if (backVertices.length >= 3)
      Array.prototype.push.apply(
        backTriangles,
        BSPNode.verticesToTriangles(backVertices)
      );
  };

  static verticesToTriangles(vertices: Vector3[]): Triangle[] {
    const triangles = [];
    for (let i = 2; i < vertices.length; i++) {
      const a = vertices[0];
      const b = vertices[i - 1];
      const c = vertices[i];
      const triangle = new Triangle(a, b, c);
      triangles.push(triangle);
    }
    return triangles;
  }

  constructor(triangles?: Triangle[]) {
    this.triangles = [];
    this.isInverted = false;
    this.boundingBox = new Box3();

    if (triangles !== undefined) {
      this.buildFrom(triangles);
    }
  }

  public buildFrom(triangles: Triangle[]) {
    if (this.divider === undefined) {
      const bestDivider = chooseDividingTriangle(triangles);
      if (bestDivider === undefined) {
        this.divider = triangles[0].clone();
        this.triangles = triangles;
      } else {
        this.divider = bestDivider.clone();
        this.triangles = [];
        this.addTriangles(triangles);
      }
    } else {
      this.addTriangles(triangles);
    }
  }

  public toArrayBuffer(): ArrayBuffer {
    const arr = this.toNumberArray();
    return Float32Array.from(arr).buffer;
  };

  public toNumberArray(): number[] {

    debugger;
    const arr = [];
    // fill with triangles

    // number of triangles
    arr.push(this.triangles.length);
    // the triangles
    for (let triangle of this.triangles) {
      arr.push(...triangle.toNumberArray());
    }

    // fill with front triangles
    // number of front and data
    if (!this.front) arr.push(0);
    else {
      const frontArr: number[] = this.front.toNumberArray();
      arr.push(frontArr.length);
      arr.push(...frontArr);
    }

    // fill with back triangles
    // number of back and data
    if (!this.back) arr.push(0);
    else {
      const backArr: number[] = this.back.toNumberArray();
      arr.push(backArr.length);
      arr.push(...backArr);
    }

    //divider
    if (!this.divider) arr.push(0);
    else {
      const dividerArray = this.divider.toNumberArray();
      arr.push(dividerArray.length)
      arr.push(...dividerArray)
    }

    arr.push(this.isInverted ? 1 : 0);
    arr.push(this.boundingBox.min.x, this.boundingBox.min.y, this.boundingBox.min.z);
    arr.push(this.boundingBox.max.x, this.boundingBox.max.y, this.boundingBox.max.z);

    return arr;
  }

  public fromNumberArray(arr: number[]): void {
    const trianglesLength = arr[0];
    const triangleOffset = 1;

    for (let i = 0; i < trianglesLength; i += 1) {
      const triangle: Triangle = new Triangle();
      let index = i * 13 + triangleOffset;
      const triangleArray: number[] = arr.slice(index, index + 13);
      triangle.fromNumberArray(triangleArray);
      this.triangles.push(triangle)
    }

    let frontOffset: number = triangleOffset + trianglesLength * 13;
    const frontLength: number = arr[frontOffset];
    frontOffset += 1;
    if (frontLength > 0) {
      const frontArray: number[] = arr.slice(frontOffset, frontOffset + frontLength);
      if (this.front) this.front.fromNumberArray(frontArray);
      else {
        this.front = new BSPNode();
        this.front.fromNumberArray(frontArray);
      }
    }

    debugger;
    let backOffset: number = frontOffset + frontLength;
    const backLength: number = arr[backOffset];
    backOffset += 1;
    if (backLength > 0) {
      const backArray: number[] = arr.slice(backOffset, backOffset + backLength);
      if (this.back) this.back.fromNumberArray(backArray);
      else {
        this.back = new BSPNode();
        this.back.fromNumberArray(backArray);
      }
    }

    let dividerOffset: number = backOffset + backLength;
    const dividerLength: number = arr[dividerOffset];
    dividerOffset += 1;
    if (dividerLength > 0) {
      const dividerArray: number[] = arr.slice(dividerOffset, dividerOffset + dividerLength);
      if (this.divider) this.divider.fromNumberArray(dividerArray);
      else {
        this.divider = new Triangle();
        this.divider.fromNumberArray(dividerArray);
      }
    }

    const invertedIndex = dividerOffset + dividerLength;
    this.isInverted = arr[invertedIndex] === 1 ? true : false;

    const boundingBoxOffset = invertedIndex + 1;
    this.boundingBox.min.set(arr[boundingBoxOffset], arr[boundingBoxOffset + 1], arr[boundingBoxOffset + 2]);
    this.boundingBox.max.set(arr[boundingBoxOffset + 3], arr[boundingBoxOffset + 4], arr[boundingBoxOffset + 5]);
  }

  public fromArrayBuffer(buff: ArrayBuffer): void {
    this.triangles = [];
    const arr: Float32Array = new Float32Array(buff, 0,
      buff.byteLength / Float32Array.BYTES_PER_ELEMENT);

    this.fromNumberArray(Array.from(arr));


  }

  private addTriangles(triangles: Triangle[]) {
    const frontTriangles = [];
    const backTriangles = [];

    for (let i = 0; i < triangles.length; i++) {
      const triangle = triangles[i];

      this.boundingBox.min.set(
        Math.min(
          this.boundingBox.min.x,
          triangle.a.x,
          triangle.b.x,
          triangle.c.x
        ),
        Math.min(
          this.boundingBox.min.y,
          triangle.a.y,
          triangle.b.y,
          triangle.c.y
        ),
        Math.min(
          this.boundingBox.min.z,
          triangle.a.z,
          triangle.b.z,
          triangle.c.z
        )
      );
      this.boundingBox.max.set(
        Math.max(
          this.boundingBox.max.x,
          triangle.a.x,
          triangle.b.x,
          triangle.c.x
        ),
        Math.max(
          this.boundingBox.max.y,
          triangle.a.y,
          triangle.b.y,
          triangle.c.y
        ),
        Math.max(
          this.boundingBox.max.z,
          triangle.a.z,
          triangle.b.z,
          triangle.c.z
        )
      );

      const side = this.divider!.classifySide(triangle);

      if (side === CLASSIFY_COPLANAR) {
        this.triangles.push(triangle);
      } else if (side === CLASSIFY_FRONT) {
        frontTriangles.push(triangle);
      } else if (side === CLASSIFY_BACK) {
        backTriangles.push(triangle);
      } else {
        BSPNode.splitTriangle(
          triangle,
          this.divider!,
          frontTriangles,
          backTriangles
        );
      }
    }

    if (frontTriangles.length) {
      if (this.front === undefined) {
        this.front = new BSPNode(frontTriangles);
      } else {
        this.front.addTriangles(frontTriangles);
      }
    }
    if (backTriangles.length) {
      if (this.back === undefined) {
        this.back = new BSPNode(backTriangles);
      } else {
        this.back.addTriangles(backTriangles);
      }
    }
  }

  invert() {
    this.isInverted = !this.isInverted;

    if (this.divider !== undefined) this.divider.invert();
    if (this.front !== undefined) this.front.invert();
    if (this.back !== undefined) this.back.invert();

    const temp = this.front;
    this.front = this.back;
    this.back = temp;

    for (let i = 0; i < this.triangles.length; i++) {
      this.triangles[i].invert();
    }
  }

  // Remove all triangles in this BSP tree that are inside the other BSP tree
  clipTo(tree: BSPNode) {
    if (
      tree.isInverted === false &&
      this.isInverted === false &&
      this.boundingBox.intersectsBox(tree.boundingBox) === false
    )
      return;
    this.triangles = tree.clipTriangles(this.triangles);
    if (this.front !== undefined) this.front.clipTo(tree);
    if (this.back !== undefined) this.back.clipTo(tree);
  }

  // Recursively remove all triangles from `triangles` that are inside this BSP tree
  clipTriangles(triangles: Triangle[]): Triangle[] {
    if (!this.divider) return triangles.slice();

    let frontTriangles: Triangle[] = [];
    let backTriangles: Triangle[] = [];

    // not a leaf node / convex set
    for (let i = 0; i < triangles.length; i++) {
      const triangle = triangles[i];
      const side = this.divider.classifySide(triangle);

      if (side === CLASSIFY_FRONT) {
        frontTriangles.push(triangle);
      } else if (side === CLASSIFY_BACK) {
        backTriangles.push(triangle);
      } else if (side == CLASSIFY_COPLANAR) {
        const dot = this.divider.normal.dot(triangle.normal);
        if (dot > 0) {
          frontTriangles.push(triangle);
        } else {
          backTriangles.push(triangle);
        }
      } else if (side === CLASSIFY_SPANNING) {
        BSPNode.splitTriangle(
          triangle,
          this.divider,
          frontTriangles,
          backTriangles
        );
      }
    }

    if (this.front !== undefined)
      frontTriangles = this.front.clipTriangles(frontTriangles);
    if (this.back !== undefined) {
      backTriangles = this.back.clipTriangles(backTriangles);
    } else {
      backTriangles = [];
    }

    return frontTriangles.concat(backTriangles);
  }

  getTriangles(): Triangle[] {
    let triangles = this.triangles.slice();

    if (this.front !== undefined)
      triangles = triangles.concat(this.front.getTriangles());
    if (this.back !== undefined)
      triangles = triangles.concat(this.back.getTriangles());

    return triangles;
  }

  clone(transform?: Matrix4): BSPNode {
    const clone = new BSPNode();

    clone.isInverted = this.isInverted;

    clone.boundingBox.min.copy(this.boundingBox.min);
    clone.boundingBox.max.copy(this.boundingBox.max);

    if (transform) {
      clone.boundingBox.min.applyMatrix4(transform);
      clone.boundingBox.max.applyMatrix4(transform);
    }

    if (this.divider !== undefined) {
      clone.divider = this.divider.clone();
      if (transform) {
        clone.divider.a.applyMatrix4(transform);
        clone.divider.b.applyMatrix4(transform);
        clone.divider.c.applyMatrix4(transform);
      }
    }
    if (this.front !== undefined) clone.front = this.front.clone(transform);
    if (this.back !== undefined) clone.back = this.back.clone(transform);

    const clonedTriangles = [];
    for (let i = 0; i < this.triangles.length; i++) {
      const clonedTriangle = this.triangles[i].clone();
      if (transform) {
        clonedTriangle.a.applyMatrix4(transform);
        clonedTriangle.b.applyMatrix4(transform);
        clonedTriangle.c.applyMatrix4(transform);
        clonedTriangle.computeNormal();
      }
      clonedTriangles.push(clonedTriangle);
    }
    clone.triangles = clonedTriangles;

    return clone;
  }

  toGeometry(): Geometry {
    const geometry = new Geometry();

    const triangles = this.getTriangles();
    for (let i = 0; i < triangles.length; i++) {
      const triangle = triangles[i];
      const vertexIndex = geometry.vertices.length;
      geometry.vertices.push(triangle.a, triangle.b, triangle.c);

      const face = new Face3(
        vertexIndex,
        vertexIndex + 1,
        vertexIndex + 2,
        triangle.normal
      );
      geometry.faces.push(face);
    }

    return geometry;
  }

  toBufferGeometry(): BufferGeometry {
    const geometry = new BufferGeometry();
    const triangles = this.getTriangles();
    const coords = [];
    for (let i = 0; i < triangles.length; i++) {
      const triangle = triangles[i];
      coords.push(
        triangle.a.x, triangle.a.y, triangle.a.z,
        triangle.b.x, triangle.b.y, triangle.b.z,
        triangle.c.x, triangle.c.y, triangle.c.z
      );
    }
    // @types/three does not have setAttribute, so...
    (geometry as any).setAttribute('position', new Float32BufferAttribute(coords, 3, false));
    return geometry;
  }
}
