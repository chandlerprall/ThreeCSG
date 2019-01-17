Constructive Solid Geometry library for Three.js

## Installation

### npm/yarn

`npm install --save three-csg`

`yarn add three-csg@1.0.0-alpha.1`

### Manually

The top-level `three-csg.js` file in this repo is a UMD build you can copy into your project and include via a `<script>` tag, or by `require()`ing it in commonjs-enabled environments like `node` and `webpack`.

## Usage

There are three methods on the top level library: `union`, `intersect`, and `subtract`. Each takes the target meshes as arguments and optionally a material to apply to the new mesh as the third.

The operations take into account any translation, rotation, and scaling transforms on the source meshes and are non-destructive, leaving the original meshes fully intact. The resulting geometry is centered in its bounding box and the new mesh is positioning relative to the original objects.

### Example   

```javascript
// assuming Three.js and threecsg have been included
// either by a <script> tag or require()ing them

const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
const sphere = new THREE.Mesh(new THREE.SphereGeometry(1));
sphere.position.y = 0.5; // sit the sphere's center on top of box

const material = new THREE.MeshNormalMaterial();

const unionmesh = threecsg.union(box, sphere, material); // combine box and sphere
const intersectmesh = threecsg.intersect(box, sphere, material); // find intersection of box and sphere
const subtractmesh = threecsg.subtract(box, sphere, material); // removes parts of box that don't overlap with sphere
``` 