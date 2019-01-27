(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('three')) :
    typeof define === 'function' && define.amd ? define(['exports', 'three'], factory) :
    (global = global || self, factory(global.threecsg = {}, global.THREE));
}(this, function (exports, three) { 'use strict';

    const EPSILON = 1e-6;
    const CLASSIFY_COPLANAR = 0;
    const CLASSIFY_FRONT = 1;
    const CLASSIFY_BACK = 2;
    const CLASSIFY_SPANNING = 3;
    const tempVector3 = new three.Vector3();
    class Triangle {
        constructor(a, b, c) {
            this.a = a.clone();
            this.b = b.clone();
            this.c = c.clone();
            this.normal = new three.Vector3();
            this.w = 0;
            this.computeNormal();
        }
        computeNormal() {
            tempVector3.copy(this.c).sub(this.a);
            this.normal.copy(this.b).sub(this.a).cross(tempVector3).normalize();
            this.w = this.normal.dot(this.a);
        }
        classifyPoint(point) {
            const side = this.normal.dot(point) - this.w;
            if (Math.abs(side) < EPSILON)
                return CLASSIFY_COPLANAR;
            if (side > 0)
                return CLASSIFY_FRONT;
            return CLASSIFY_BACK;
        }
        classifySide(triangle) {
            let side = CLASSIFY_COPLANAR;
            side |= this.classifyPoint(triangle.a);
            side |= this.classifyPoint(triangle.b);
            side |= this.classifyPoint(triangle.c);
            return side;
        }
        invert() {
            const { a, c } = this;
            this.a = c;
            this.c = a;
            this.normal.multiplyScalar(-1);
            this.w *= -1;
        }
        clone() {
            return new Triangle(this.a.clone(), this.b.clone(), this.c.clone());
        }
    }

    function isBufferGeometry(geometry) {
        return geometry instanceof three.BufferGeometry;
    }
    function isConvexSet(triangles) {
        for (let i = 0; i < triangles.length; i++) {
            for (let j = i + 1; j < triangles.length; j++) {
                const side = triangles[i].classifySide(triangles[j]);
                if (side & CLASSIFY_FRONT)
                    return false;
            }
        }
        return true;
    }

    const MINIMUM_RELATION = 0.8; // 0 -> 1
    const MINIMUM_RELATION_SCALE = 10; // should always be >2
    /**
     * Algorithm adapted from Binary Space Partioning Trees and Polygon Removal in Real Time 3D Rendering
     * Samuel Ranta-Eskola, 2001
     */
    function chooseDividingTriangle(triangles) {
        if (isConvexSet(triangles))
            return triangles[0];
        let minimumRelation = MINIMUM_RELATION;
        let bestTriangle = undefined;
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
                    if (i === j)
                        continue;
                    const triangleInner = triangles[j];
                    const side = triangleOuter.classifySide(triangleInner);
                    if (side === CLASSIFY_SPANNING) {
                        numSpanning++;
                    }
                    else if (side === CLASSIFY_FRONT) {
                        numFront++;
                    }
                    else if (side === CLASSIFY_BACK) {
                        numBack++;
                    }
                }
                // Calculate the relation between the number of triangles in the two sets divided by the current triangle
                const relation = numFront < numBack ? numFront / numBack : numBack / numFront;
                // Compare the results given by the current triangle to the best so far.
                // If the this triangle splits fewer triangles and the relation
                // between the resulting sets is acceptable this is the new candidate
                // triangle. If the current triangle splits the same amount of triangles
                // as the best triangle so far and the relation between the two
                // resulting sets is better then this triangle is the new candidate
                // triangle.
                if (minimumRelation === 0 ||
                    (relation > minimumRelation &&
                        (numSpanning < leastSplits ||
                            (numSpanning === leastSplits && relation > bestRelation)))) {
                    bestTriangle = triangleOuter;
                    leastSplits = numSpanning;
                    bestRelation = relation;
                }
            }
            minimumRelation = minimumRelation / MINIMUM_RELATION_SCALE;
        }
        return bestTriangle;
    }
    class BSPNode {
        constructor(triangles) {
            this.triangles = [];
            this.isInverted = false;
            this.boundingBox = new three.Box3();
            if (triangles !== undefined) {
                this.buildFrom(triangles);
            }
        }
        static interpolateVectors(a, b, t) {
            return a.clone().lerp(b, t);
        }
        static verticesToTriangles(vertices) {
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
        buildFrom(triangles) {
            if (this.divider === undefined) {
                const bestDivider = chooseDividingTriangle(triangles);
                if (bestDivider === undefined) {
                    this.divider = triangles[0].clone();
                    this.triangles = triangles;
                }
                else {
                    this.divider = bestDivider.clone();
                    this.triangles = [];
                    this.addTriangles(triangles);
                }
            }
            else {
                this.addTriangles(triangles);
            }
        }
        addTriangles(triangles) {
            const frontTriangles = [];
            const backTriangles = [];
            for (let i = 0; i < triangles.length; i++) {
                const triangle = triangles[i];
                this.boundingBox.min.set(Math.min(this.boundingBox.min.x, triangle.a.x, triangle.b.x, triangle.c.x), Math.min(this.boundingBox.min.y, triangle.a.y, triangle.b.y, triangle.c.y), Math.min(this.boundingBox.min.z, triangle.a.z, triangle.b.z, triangle.c.z));
                this.boundingBox.max.set(Math.max(this.boundingBox.max.x, triangle.a.x, triangle.b.x, triangle.c.x), Math.max(this.boundingBox.max.y, triangle.a.y, triangle.b.y, triangle.c.y), Math.max(this.boundingBox.max.z, triangle.a.z, triangle.b.z, triangle.c.z));
                const side = this.divider.classifySide(triangle);
                if (side === CLASSIFY_COPLANAR) {
                    this.triangles.push(triangle);
                }
                else if (side === CLASSIFY_FRONT) {
                    frontTriangles.push(triangle);
                }
                else if (side === CLASSIFY_BACK) {
                    backTriangles.push(triangle);
                }
                else {
                    BSPNode.splitTriangle(triangle, this.divider, frontTriangles, backTriangles);
                }
            }
            if (frontTriangles.length) {
                if (this.front === undefined) {
                    this.front = new BSPNode(frontTriangles);
                }
                else {
                    this.front.addTriangles(frontTriangles);
                }
            }
            if (backTriangles.length) {
                if (this.back === undefined) {
                    this.back = new BSPNode(backTriangles);
                }
                else {
                    this.back.addTriangles(backTriangles);
                }
            }
        }
        invert() {
            this.isInverted = !this.isInverted;
            if (this.divider !== undefined)
                this.divider.invert();
            if (this.front !== undefined)
                this.front.invert();
            if (this.back !== undefined)
                this.back.invert();
            const temp = this.front;
            this.front = this.back;
            this.back = temp;
            for (let i = 0; i < this.triangles.length; i++) {
                this.triangles[i].invert();
            }
        }
        // Remove all triangles in this BSP tree that are inside the other BSP tree
        clipTo(tree) {
            if (tree.isInverted === false && this.isInverted === false && this.boundingBox.intersectsBox(tree.boundingBox) === false)
                return;
            this.triangles = tree.clipTriangles(this.triangles);
            if (this.front !== undefined)
                this.front.clipTo(tree);
            if (this.back !== undefined)
                this.back.clipTo(tree);
        }
        // Recursively remove all triangles from `triangles` that are inside this BSP tree
        clipTriangles(triangles) {
            if (!this.divider)
                return triangles.slice();
            let frontTriangles = [];
            let backTriangles = [];
            // not a leaf node / convex set
            for (let i = 0; i < triangles.length; i++) {
                const triangle = triangles[i];
                const side = this.divider.classifySide(triangle);
                if (side === CLASSIFY_FRONT) {
                    frontTriangles.push(triangle);
                }
                else if (side === CLASSIFY_BACK) {
                    backTriangles.push(triangle);
                }
                else if (side == CLASSIFY_COPLANAR) {
                    const dot = this.divider.normal.dot(triangle.normal);
                    if (dot > 0) {
                        frontTriangles.push(triangle);
                    }
                    else {
                        backTriangles.push(triangle);
                    }
                }
                else if (side === CLASSIFY_SPANNING) {
                    BSPNode.splitTriangle(triangle, this.divider, frontTriangles, backTriangles);
                }
            }
            if (this.front !== undefined)
                frontTriangles = this.front.clipTriangles(frontTriangles);
            if (this.back !== undefined) {
                backTriangles = this.back.clipTriangles(backTriangles);
            }
            else {
                backTriangles = [];
            }
            return frontTriangles.concat(backTriangles);
        }
        getTriangles() {
            let triangles = this.triangles.slice();
            if (this.front !== undefined)
                triangles = triangles.concat(this.front.getTriangles());
            if (this.back !== undefined)
                triangles = triangles.concat(this.back.getTriangles());
            return triangles;
        }
        clone(transform) {
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
            if (this.front !== undefined)
                clone.front = this.front.clone(transform);
            if (this.back !== undefined)
                clone.back = this.back.clone(transform);
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
        toGeometry() {
            const geometry = new three.Geometry();
            const triangles = this.getTriangles();
            for (let i = 0; i < triangles.length; i++) {
                const triangle = triangles[i];
                const vertexIndex = geometry.vertices.length;
                geometry.vertices.push(triangle.a, triangle.b, triangle.c);
                const face = new three.Face3(vertexIndex, vertexIndex + 1, vertexIndex + 2, triangle.normal);
                geometry.faces.push(face);
            }
            return geometry;
        }
    }
    BSPNode.splitTriangle = function splitTriangle(triangle, divider, frontTriangles, backTriangles) {
        const vertices = [triangle.a, triangle.b, triangle.c];
        const frontVertices = [];
        const backVertices = [];
        for (let i = 0; i < 3; i++) {
            const j = (i + 1) % 3;
            const vi = vertices[i];
            const vj = vertices[j];
            const ti = divider.classifyPoint(vi);
            const tj = divider.classifyPoint(vj);
            if (ti != CLASSIFY_BACK)
                frontVertices.push(vi);
            if (ti != CLASSIFY_FRONT)
                backVertices.push(vi);
            if ((ti | tj) === CLASSIFY_SPANNING) {
                const t = (divider.w - divider.normal.dot(vi)) / divider.normal.dot(vj.clone().sub(vi));
                const v = BSPNode.interpolateVectors(vi, vj, t);
                frontVertices.push(v);
                backVertices.push(v);
            }
        }
        if (frontVertices.length >= 3)
            Array.prototype.push.apply(frontTriangles, BSPNode.verticesToTriangles(frontVertices));
        if (backVertices.length >= 3)
            Array.prototype.push.apply(backTriangles, BSPNode.verticesToTriangles(backVertices));
    };

    function convertGeometryToTriangles(geometry) {
        if (isBufferGeometry(geometry)) {
            throw new Error('threecsg: Only Three.Geometry is supported.');
        }
        const triangles = [];
        const { faces, vertices } = geometry;
        for (let i = 0; i < faces.length; i++) {
            const face = faces[i];
            const a = vertices[face.a].clone();
            const b = vertices[face.b].clone();
            const c = vertices[face.c].clone();
            const triangle = new Triangle(a, b, c);
            triangles.push(triangle);
        }
        return triangles;
    }
    function transformBSP(bsp, mesh) {
        mesh.updateMatrixWorld(true);
        const { matrixWorld: transform } = mesh;
        return bsp.clone(transform);
    }

    function intersect(a, b) {
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
    function union(a, b) {
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
    function subtract(a, b) {
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

    var boolean = /*#__PURE__*/Object.freeze({
        intersect: intersect,
        union: union,
        subtract: subtract
    });

    let geometryToBSP = new WeakMap();
    let enabled = true;
    function clear() {
        geometryToBSP = new WeakMap();
    }
    function enable() {
        enabled = true;
    }
    function disable() {
        enabled = false;
        clear();
    }
    function getBSPForGeometry(geometry) {
        return enabled ? geometryToBSP.get(geometry) : undefined;
    }
    function setBSPForGeometry(geometry, bsp) {
        if (enabled) {
            geometryToBSP.set(geometry, bsp);
        }
    }
    function getOrSetBSP(geometry) {
        if (enabled) {
            let bsp = geometryToBSP.get(geometry);
            if (bsp === undefined) {
                bsp = new BSPNode(convertGeometryToTriangles(geometry));
                geometryToBSP.set(geometry, bsp);
            }
            return bsp;
        }
        else {
            return new BSPNode(convertGeometryToTriangles(geometry));
        }
    }
    function remove(geometry) {
        geometryToBSP.delete(geometry);
    }

    var cache = /*#__PURE__*/Object.freeze({
        clear: clear,
        enable: enable,
        disable: disable,
        getBSPForGeometry: getBSPForGeometry,
        setBSPForGeometry: setBSPForGeometry,
        getOrSetBSP: getOrSetBSP,
        remove: remove
    });

    function geometryToMesh(geometry, material) {
        // center geometry & apply position to a new mesh
        geometry.computeBoundingBox();
        const offset = new three.Vector3();
        geometry.boundingBox.getCenter(offset);
        geometry.translate(-offset.x, -offset.y, -offset.z);
        const mesh = new three.Mesh(geometry, material);
        mesh.position.copy(offset);
        return mesh;
    }
    function subtract$1(mesh1, mesh2, material) {
        const bsp1 = getOrSetBSP(mesh1.geometry);
        const bsp2 = getOrSetBSP(mesh2.geometry);
        const bsp1Transformed = transformBSP(bsp1, mesh1);
        const bsp2Transformed = transformBSP(bsp2, mesh2);
        const result = subtract(bsp1Transformed, bsp2Transformed);
        const geometry = result.toGeometry();
        setBSPForGeometry(geometry, result);
        return geometryToMesh(geometry, material);
    }
    function union$1(mesh1, mesh2, material) {
        const bsp1 = getOrSetBSP(mesh1.geometry);
        const bsp2 = getOrSetBSP(mesh2.geometry);
        const bsp1Transformed = transformBSP(bsp1, mesh1);
        const bsp2Transformed = transformBSP(bsp2, mesh2);
        const result = union(bsp1Transformed, bsp2Transformed);
        const geometry = result.toGeometry();
        setBSPForGeometry(geometry, result);
        return geometryToMesh(geometry, material);
    }
    function intersect$1(mesh1, mesh2, material) {
        const bsp1 = getOrSetBSP(mesh1.geometry);
        const bsp2 = getOrSetBSP(mesh2.geometry);
        const bsp1Transformed = transformBSP(bsp1, mesh1);
        const bsp2Transformed = transformBSP(bsp2, mesh2);
        const result = intersect(bsp1Transformed, bsp2Transformed);
        const geometry = result.toGeometry();
        setBSPForGeometry(geometry, result);
        return geometryToMesh(geometry, material);
    }

    exports.BSPNode = BSPNode;
    exports.convertGeometryToTriangles = convertGeometryToTriangles;
    exports.transformBSP = transformBSP;
    exports.boolean = boolean;
    exports.cache = cache;
    exports.subtract = subtract$1;
    exports.union = union$1;
    exports.intersect = intersect$1;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
