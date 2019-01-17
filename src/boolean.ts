import BSPNode from './BSPNode';

export function intersect(a: BSPNode, b: BSPNode) {
    a = a.clone();
    b = b.clone();
    a.invert();
    b.clipTo(a);
    b.invert();
    a.clipTo(b);
    b.clipTo(a);
    a.invert();
    b.invert();
    return new BSPNode(a.getTriangles().concat(b.getTriangles()));
}

export function union(a: BSPNode, b: BSPNode) {
    a = a.clone();
    b = b.clone();
    a.clipTo(b);
    b.clipTo(a);
    b.invert();
    b.clipTo(a);
    b.invert();
    return new BSPNode(a.getTriangles().concat(b.getTriangles()));
}

export function subtract(a: BSPNode, b: BSPNode) {
    a = a.clone();
    b = b.clone();
    a.invert();
    b.clipTo(a);
    a.clipTo(b);
    b.invert();
    b.clipTo(a);
    a.invert();
    return new BSPNode(a.getTriangles().concat(b.getTriangles()));
}