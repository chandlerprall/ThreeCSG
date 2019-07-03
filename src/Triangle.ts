import { Vector3 } from 'three';

const EPSILON = 1e-6;

export const CLASSIFY_COPLANAR = 0;
export const CLASSIFY_FRONT = 1;
export const CLASSIFY_BACK = 2;
export const CLASSIFY_SPANNING = 3;

export type SIDE_CLASSIFICATION =
  | typeof CLASSIFY_COPLANAR
  | typeof CLASSIFY_FRONT
  | typeof CLASSIFY_BACK
  | typeof CLASSIFY_SPANNING;

const tempVector3 = new Vector3();

export default class Triangle {
  a: Vector3;
  b: Vector3;
  c: Vector3;
  normal: Vector3;
  w: number;

  constructor(a: Vector3, b: Vector3, c: Vector3) {
    this.a = a.clone();
    this.b = b.clone();
    this.c = c.clone();

    this.normal = new Vector3();
    this.w = 0;
    this.computeNormal();
  }

  computeNormal(): void {
    tempVector3.copy(this.c).sub(this.a);
    this.normal
      .copy(this.b)
      .sub(this.a)
      .cross(tempVector3)
      .normalize();
    this.w = this.normal.dot(this.a);
  }

  classifyPoint(point: Vector3): SIDE_CLASSIFICATION {
    const side = this.normal.dot(point) - this.w;

    if (Math.abs(side) < EPSILON) return CLASSIFY_COPLANAR;
    if (side > 0) return CLASSIFY_FRONT;
    return CLASSIFY_BACK;
  }

  classifySide(triangle: Triangle): SIDE_CLASSIFICATION {
    let side = CLASSIFY_COPLANAR;

    side |= this.classifyPoint(triangle.a);
    side |= this.classifyPoint(triangle.b);
    side |= this.classifyPoint(triangle.c);

    return side as SIDE_CLASSIFICATION;
  }

  invert(): void {
    const { a, c } = this;
    this.a = c;
    this.c = a;
    this.normal.multiplyScalar(-1);
    this.w *= -1;
  }

  clone(): Triangle {
    return new Triangle(this.a, this.b, this.c);
  }
}
