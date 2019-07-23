import BSPNode from './BSPNode';

/**
 * Performs union of an array fo BSPNode
 * @param bspArr
 */

export function unionArray(bspArr: BSPNode[]): BSPNode {
    let resultBSP: BSPNode = bspArr[0];
    for (let i = 1; i < bspArr.length; i++) {
        resultBSP = union(resultBSP, bspArr[i]);
    }

    return resultBSP;
}

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
    a2.buildFrom(b2.getTriangles());
    return a2;
}

export function union(a: BSPNode, b: BSPNode) {
    const a2 = a.clone();
    const b2 = b.clone();
    a2.clipTo(b2);
    b2.clipTo(a2);
    b2.invert();
    b2.clipTo(a2);
    b2.invert();
    a2.buildFrom(b2.getTriangles());
    return a2;
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
    a2.buildFrom(b2.getTriangles());
    return a2;
}