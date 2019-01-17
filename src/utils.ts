import {BufferGeometry, Mesh} from 'three';
import Triangle, {CLASSIFY_FRONT, CLASSIFY_BACK} from './Triangle';

export function isBufferGeometry(geometry: Mesh['geometry']): geometry is BufferGeometry {
    return geometry instanceof BufferGeometry;
}

export function isConvexSet(triangles: Triangle[]): boolean {
    for (let i = 0; i < triangles.length; i++) {
        for (let j = i + 1; j < triangles.length; j++) {
            const side = triangles[i].classifySide(triangles[j]);
            if (side & CLASSIFY_FRONT) return false;
        }
    }
    return true;
}