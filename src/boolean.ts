import BSPNode from './BSPNode';

export function intersect(a: BSPNode, b: BSPNode) {
    const a2 = a.clone();
    const b2 = b.clone();
    a2.invert();
    b2.clipTo(a2);
    b2.invert();
    a2.clipTo(b2);
    b2.clipTo(a2);
    a2.invert();
    b2.invert();
    return new BSPNode(a2.getTriangles().concat(b2.getTriangles()));
}

export function union(a: BSPNode, b: BSPNode) {
    const a2 = a.clone();
    const b2 = b.clone();
    a2.clipTo(b2);
    b2.clipTo(a);
    b2.invert();
    b2.clipTo(a);
    b2.invert();
    return new BSPNode(a2.getTriangles().concat(b2.getTriangles()));
}

export function subtract(a: BSPNode, b: BSPNode) {
    const a2 = a.clone();
    const b2 = b.clone();
    a2.invert();
    a2.clipTo(b2);
    b2.clipTo(a2);
    b2.invert();
    b2.clipTo(a2);
    a2.invert();
    return new BSPNode(a2.getTriangles().concat(b2.getTriangles()));
}