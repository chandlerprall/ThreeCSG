(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('three')) :
    typeof define === 'function' && define.amd ? define(['exports', 'three'], factory) :
    (global = global || self, factory(global.threecsg = {}, global.THREE));
}(this, (function (exports, three) { 'use strict';

    const EPSILON = 1e-6;
    const CLASSIFY_COPLANAR = 0;
    const CLASSIFY_FRONT = 1;
    const CLASSIFY_BACK = 2;
    const CLASSIFY_SPANNING = 3;
    class Triangle {
        constructor(a, b, c) {
            if (a === undefined || b === undefined || c === undefined) {
                this.a = new three.Vector3();
                this.b = new three.Vector3();
                this.c = new three.Vector3();
                this.normal = new three.Vector3();
                this.w = 0;
                return;
            }
            this.a = a.clone();
            this.b = b.clone();
            this.c = c.clone();
            this.normal = new three.Vector3();
            this.w = 0;
            this.computeNormal();
        }
        toArrayBuffer() {
            const arr = this.toNumberArray();
            return Float32Array.from(arr).buffer;
        }
        toNumberArray() {
            const arr = [
                this.a.x, this.a.y, this.a.z,
                this.b.x, this.b.y, this.b.z,
                this.c.x, this.c.y, this.c.z,
                this.normal.x, this.normal.y, this.normal.z,
                this.w,
            ];
            return arr;
        }
        fromNumberArray(arr) {
            if (arr.length !== 13)
                throw new Error(`Array has incorrect size. It's ${arr.length} and should be 13`);
            this.a.set(arr[0], arr[1], arr[2]);
            this.b.set(arr[3], arr[4], arr[5]);
            this.c.set(arr[6], arr[7], arr[8]);
            this.normal.set(arr[9], arr[10], arr[11]);
            this.w = arr[12];
        }
        fromArrayBuffer(buff) {
            const arr = new Float32Array(buff, 0, buff.byteLength / Float32Array.BYTES_PER_ELEMENT);
            this.fromNumberArray(Array.from(arr));
        }
        computeNormal() {
            const tempVector3 = new three.Vector3();
            tempVector3.copy(this.c).sub(this.a);
            this.normal
                .copy(this.b)
                .sub(this.a)
                .cross(tempVector3)
                .normalize();
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
            return new Triangle(this.a, this.b, this.c);
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
        static splitTriangle(triangle, divider, frontTriangles, backTriangles) {
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
                    const t = (divider.w - divider.normal.dot(vi)) /
                        divider.normal.dot(vj.clone().sub(vi));
                    const v = BSPNode.interpolateVectors(vi, vj, t);
                    frontVertices.push(v);
                    backVertices.push(v);
                }
            }
            if (frontVertices.length >= 3)
                Array.prototype.push.apply(frontTriangles, BSPNode.verticesToTriangles(frontVertices));
            if (backVertices.length >= 3)
                Array.prototype.push.apply(backTriangles, BSPNode.verticesToTriangles(backVertices));
        }
        ;
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
        toArrayBuffer() {
            const arr = this.toNumberArray();
            return Float32Array.from(arr).buffer;
        }
        ;
        toNumberArray() {
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
            if (!this.front)
                arr.push(0);
            else {
                const frontArr = this.front.toNumberArray();
                arr.push(frontArr.length);
                arr.push(...frontArr);
            }
            // fill with back triangles
            // number of back and data
            if (!this.back)
                arr.push(0);
            else {
                const backArr = this.back.toNumberArray();
                arr.push(backArr.length);
                arr.push(...backArr);
            }
            //divider
            if (!this.divider)
                arr.push(0);
            else {
                const dividerArray = this.divider.toNumberArray();
                arr.push(dividerArray.length);
                arr.push(...dividerArray);
            }
            arr.push(this.isInverted ? 1 : 0);
            arr.push(this.boundingBox.min.x, this.boundingBox.min.y, this.boundingBox.min.z);
            arr.push(this.boundingBox.max.x, this.boundingBox.max.y, this.boundingBox.max.z);
            return arr;
        }
        fromNumberArray(arr) {
            const trianglesLength = arr[0];
            const triangleOffset = 1;
            for (let i = 0; i < trianglesLength; i += 1) {
                const triangle = new Triangle();
                let index = i * 13 + triangleOffset;
                const triangleArray = arr.slice(index, index + 13);
                triangle.fromNumberArray(triangleArray);
                this.triangles.push(triangle);
            }
            let frontOffset = triangleOffset + trianglesLength * 13;
            const frontLength = arr[frontOffset];
            frontOffset += 1;
            if (frontLength > 0) {
                const frontArray = arr.slice(frontOffset, frontOffset + frontLength);
                if (this.front)
                    this.front.fromNumberArray(frontArray);
                else {
                    this.front = new BSPNode();
                    this.front.fromNumberArray(frontArray);
                }
            }
            debugger;
            let backOffset = frontOffset + frontLength;
            const backLength = arr[backOffset];
            backOffset += 1;
            if (backLength > 0) {
                const backArray = arr.slice(backOffset, backOffset + backLength);
                if (this.back)
                    this.back.fromNumberArray(backArray);
                else {
                    this.back = new BSPNode();
                    this.back.fromNumberArray(backArray);
                }
            }
            let dividerOffset = backOffset + backLength;
            const dividerLength = arr[dividerOffset];
            dividerOffset += 1;
            if (dividerLength > 0) {
                const dividerArray = arr.slice(dividerOffset, dividerOffset + dividerLength);
                if (this.divider)
                    this.divider.fromNumberArray(dividerArray);
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
        fromArrayBuffer(buff) {
            this.triangles = [];
            const arr = new Float32Array(buff, 0, buff.byteLength / Float32Array.BYTES_PER_ELEMENT);
            this.fromNumberArray(Array.from(arr));
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
            if (tree.isInverted === false &&
                this.isInverted === false &&
                this.boundingBox.intersectsBox(tree.boundingBox) === false)
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

    function convertGeometryToTriangles(geometry) {
        const triangles = [];
        if (isBufferGeometry(geometry)) {
            const position = geometry.getAttribute('position');
            const index = geometry.getIndex();
            if (index) {
                for (let i = 0; i < index.array.length; i += 3) {
                    let j = index.array[i];
                    const a = new three.Vector3(position.getX(j), position.getY(j), position.getZ(j));
                    j = index.array[i + 1];
                    const b = new three.Vector3(position.getX(j), position.getY(j), position.getZ(j));
                    j = index.array[i + 2];
                    const c = new three.Vector3(position.getX(j), position.getY(j), position.getZ(j));
                    triangles.push(new Triangle(a, b, c));
                }
            }
            else {
                for (let j = 0; j < position.count; j++) {
                    const a = new three.Vector3(position.getX(j), position.getY(j), position.getZ(j));
                    j++;
                    const b = new three.Vector3(position.getX(j), position.getY(j), position.getZ(j));
                    j++;
                    const c = new three.Vector3(position.getX(j), position.getY(j), position.getZ(j));
                    triangles.push(new Triangle(a, b, c));
                }
            }
            return triangles;
        }
        const { faces, vertices } = geometry;
        for (let i = 0; i < faces.length; i++) {
            const face = faces[i];
            const a = vertices[face.a];
            const b = vertices[face.b];
            const c = vertices[face.c];
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

    /**
     * Performs union of an array fo BSPNode
     * @param bspArr
     */
    function unionArray(bspArr) {
        let resultBSP = bspArr[0];
        for (let i = 1; i < bspArr.length; i++) {
            resultBSP = union(resultBSP, bspArr[i]);
        }
        return resultBSP;
    }
    /**
     * Performs subtraction of an array fo BSPNode - First minus rest
     * @param bspArr
     */
    function sutractArray(bspArr) {
        let resultBSP = bspArr[0];
        for (let i = 1; i < bspArr.length; i++) {
            resultBSP = subtract(resultBSP, bspArr[i]);
        }
        return resultBSP;
    }
    /**
     * Performs intersection of an array fo BSPNode
     * @param bspArr
     */
    function intersectionArray(bspArr) {
        let resultBSP = bspArr[0];
        for (let i = 1; i < bspArr.length; i++) {
            resultBSP = intersect(resultBSP, bspArr[i]);
        }
        return resultBSP;
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
        __proto__: null,
        unionArray: unionArray,
        sutractArray: sutractArray,
        intersectionArray: intersectionArray,
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
        __proto__: null,
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
    /**
     *
     * @param meshArray Array of meshes
     * @param operation Reference to the boolean operation to be perfomed
     * @param material
     */
    function booleanOperationArray(meshArray, operation, material) {
        const bspArray = [];
        for (const mesh of meshArray) {
            const bsp = new BSPNode(convertGeometryToTriangles(mesh.geometry));
            const bspTransformed = transformBSP(bsp, mesh);
            bspArray.push(bspTransformed);
        }
        const result = operation(bspArray);
        const geometry = result.toGeometry();
        return geometryToMesh(geometry, material);
    }
    /**
     *
     * @param mesh1
     * @param mesh2
     * @param operation reference to the boolean operation to be performed
     * @param material
     */
    function booleanOperation(mesh1, mesh2, operation, material) {
        const bsp1 = getOrSetBSP(mesh1.geometry);
        const bsp2 = getOrSetBSP(mesh2.geometry);
        const bsp1Transformed = transformBSP(bsp1, mesh1);
        const bsp2Transformed = transformBSP(bsp2, mesh2);
        const result = operation(bsp1Transformed, bsp2Transformed);
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
    exports.boolean = boolean;
    exports.booleanOperation = booleanOperation;
    exports.booleanOperationArray = booleanOperationArray;
    exports.cache = cache;
    exports.convertGeometryToTriangles = convertGeometryToTriangles;
    exports.intersect = intersect$1;
    exports.subtract = subtract$1;
    exports.transformBSP = transformBSP;
    exports.union = union$1;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
