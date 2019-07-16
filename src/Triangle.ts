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



export default class Triangle {
  public a: Vector3;
  public b: Vector3;
  public c: Vector3;
  public normal: Vector3;
  public w: number;

  constructor(a?: Vector3, b?: Vector3, c?: Vector3) {
    if (a === undefined || b === undefined || c === undefined) {
      this.a = new Vector3();
      this.b = new Vector3();
      this.c = new Vector3();
      this.normal = new Vector3();
      this.w = 0;
      return;
    }

    this.a = a.clone();
    this.b = b.clone();
    this.c = c.clone();

    this.normal = new Vector3();
    this.w = 0;
    this.computeNormal();
  }

  public toArrayBuffer(): ArrayBuffer {
    const arr: number[] = this.toNumberArray();
    return Float32Array.from(arr).buffer;
  }

  public toNumberArray(): number[] {
    const arr: number[] = [
      this.a.x, this.a.y, this.a.z,
      this.b.x, this.b.y, this.b.z,
      this.c.x, this.c.y, this.c.z,
      this.normal.x, this.normal.y, this.normal.z,
      this.w,
    ];

    return arr;
  }

  public fromNumberArray(arr: Float32Array): void {
    if (arr.length !== 13)
      throw new Error(`Array buffer has incorrect size. It's ${arr.length} and should be 13`);

    this.a.set(arr[0], arr[1], arr[2]);
    this.b.set(arr[3], arr[4], arr[5]);
    this.c.set(arr[6], arr[7], arr[8]);
    this.normal.set(arr[9], arr[10], arr[11]);
    this.w = arr[12];
  }

  public fromArrayBuffer(buff: ArrayBuffer) {
    const arr: Float32Array = new Float32Array(buff, 0,
      buff.byteLength / Float32Array.BYTES_PER_ELEMENT);

    this.fromNumberArray(arr);
  }

  public computeNormal(): void {
    const tempVector3 = new Vector3();
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
