import BSPNode from './BSPNode';
import {Mesh} from 'three';
import {convertGeometryToTriangles} from './meshUtils';

let geometryToBSP: WeakMap<Mesh['geometry'], BSPNode> = new WeakMap();
let enabled = true;

export function clear() {
    geometryToBSP = new WeakMap();
}

export function enable() {
    enabled = true;
}

export function disable() {
    enabled = false;
    clear();
}

export function getBSPForGeometry(geometry: Mesh['geometry']) {
    return enabled ? geometryToBSP.get(geometry) : undefined;
}

export function setBSPForGeometry(geometry: Mesh['geometry'], bsp: BSPNode) {
    if (enabled) {
        geometryToBSP.set(geometry, bsp);
    }
}

export function getOrSetBSP(geometry: Mesh['geometry']): BSPNode {
    if (enabled) {
        let bsp = geometryToBSP.get(geometry);

        if (bsp === undefined) {
            bsp = new BSPNode(convertGeometryToTriangles(geometry));
            geometryToBSP.set(geometry, bsp);
        }

        return bsp;
    } else {
        return new BSPNode(convertGeometryToTriangles(geometry));
    }
}

export function remove(geometry: Mesh['geometry']) {
    geometryToBSP.delete(geometry);
}