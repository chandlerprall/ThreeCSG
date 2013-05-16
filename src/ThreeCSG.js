'use strict';
window.ThreeBSP = (function() {

	var ThreeBSP,
		EPSILON = 1e-5,
		COPLANAR = 0,
		FRONT = 1,
		BACK = 2,
		SPANNING = 3;

	ThreeBSP = function( geometry ) {
		// Convert THREE.Geometry to ThreeBSP
		var i, _length_i,
			face, vertex, faceVertexUvs,
			polygon,
			polygons = [],
			tree;

		if ( geometry instanceof THREE.Geometry ) {
			this.matrix = new THREE.Matrix4;
		} else if ( geometry instanceof THREE.Mesh ) {
			// #todo: add hierarchy support
			geometry.updateMatrix();
			this.matrix = geometry.matrix.clone();
			geometry = geometry.geometry;
		} else if ( geometry instanceof ThreeBSP.Node ) {
			this.tree = geometry;
			this.matrix = new THREE.Matrix4;
			return this;
		} else {
			throw 'ThreeBSP: Given geometry is unsupported';
		}

		for ( i = 0, _length_i = geometry.faces.length; i < _length_i; i++ ) {
			face = geometry.faces[i];
			faceVertexUvs = geometry.faceVertexUvs[0][i];
			polygon = new ThreeBSP.Polygon;

			if ( face instanceof THREE.Face3 ) {
				vertex = geometry.vertices[ face.a ];
				vertex = new ThreeBSP.Vertex( vertex.x, vertex.y, vertex.z, face.vertexNormals[0], new THREE.Vector2( faceVertexUvs[0].x, faceVertexUvs[0].y ) );
				vertex.applyMatrix4(this.matrix);
				polygon.vertices.push( vertex );

				vertex = geometry.vertices[ face.b ];
				vertex = new ThreeBSP.Vertex( vertex.x, vertex.y, vertex.z, face.vertexNormals[1], new THREE.Vector2( faceVertexUvs[1].x, faceVertexUvs[1].y ) );
				vertex.applyMatrix4(this.matrix);
				polygon.vertices.push( vertex );

				vertex = geometry.vertices[ face.c ];
				vertex = new ThreeBSP.Vertex( vertex.x, vertex.y, vertex.z, face.vertexNormals[2], new THREE.Vector2( faceVertexUvs[2].x, faceVertexUvs[2].y ) );
				vertex.applyMatrix4(this.matrix);
				polygon.vertices.push( vertex );
			} else if ( typeof THREE.Face4 ) {
				vertex = geometry.vertices[ face.a ];
				vertex = new ThreeBSP.Vertex( vertex.x, vertex.y, vertex.z, face.vertexNormals[0], new THREE.Vector2( faceVertexUvs[0].x, faceVertexUvs[0].y ) );
				vertex.applyMatrix4(this.matrix);
				polygon.vertices.push( vertex );

				vertex = geometry.vertices[ face.b ];
				vertex = new ThreeBSP.Vertex( vertex.x, vertex.y, vertex.z, face.vertexNormals[1], new THREE.Vector2( faceVertexUvs[1].x, faceVertexUvs[1].y ) );
				vertex.applyMatrix4(this.matrix);
				polygon.vertices.push( vertex );

				vertex = geometry.vertices[ face.c ];
				vertex = new ThreeBSP.Vertex( vertex.x, vertex.y, vertex.z, face.vertexNormals[2], new THREE.Vector2( faceVertexUvs[2].x, faceVertexUvs[2].y ) );
				vertex.applyMatrix4(this.matrix);
				polygon.vertices.push( vertex );

				vertex = geometry.vertices[ face.d ];
				vertex = new ThreeBSP.Vertex( vertex.x, vertex.y, vertex.z, face.vertexNormals[3], new THREE.Vector2( faceVertexUvs[3].x, faceVertexUvs[3].y ) );
				vertex.applyMatrix4(this.matrix);
				polygon.vertices.push( vertex );
			} else {
				throw 'Invalid face type at index ' + i;
			}

			polygon.calculateProperties();
			polygons.push( polygon );
		};

		this.tree = new ThreeBSP.Node( polygons );
	};
	ThreeBSP.prototype.subtract = function( other_tree ) {
		var a = this.tree.clone(),
			b = other_tree.tree.clone();

		a.invert();
		a.clipTo( b );
		b.clipTo( a );
		b.invert();
		b.clipTo( a );
		b.invert();
		a.build( b.allPolygons() );
		a.invert();
		a = new ThreeBSP( a );
		a.matrix = this.matrix;
		return a;
	};
	ThreeBSP.prototype.union = function( other_tree ) {
		var a = this.tree.clone(),
			b = other_tree.tree.clone();

		a.clipTo( b );
		b.clipTo( a );
		b.invert();
		b.clipTo( a );
		b.invert();
		a.build( b.allPolygons() );
		a = new ThreeBSP( a );
		a.matrix = this.matrix;
		return a;
	};
	ThreeBSP.prototype.intersect = function( other_tree ) {
		var a = this.tree.clone(),
			b = other_tree.tree.clone();

		a.invert();
		b.clipTo( a );
		b.invert();
		a.clipTo( b );
		b.clipTo( a );
		a.build( b.allPolygons() );
		a.invert();
		a = new ThreeBSP( a );
		a.matrix = this.matrix;
		return a;
	};
	ThreeBSP.prototype.toGeometry = function() {
		var i, j,
			matrix = new THREE.Matrix4().getInverse( this.matrix ),
			geometry = new THREE.Geometry(),
			polygons = this.tree.allPolygons(),
			polygon_count = polygons.length,
			polygon, polygon_vertice_count,
			vertice_dict = {},
			vertex_idx_a, vertex_idx_b, vertex_idx_c,
			vertex, face,
			verticeUvs;

		for ( i = 0; i < polygon_count; i++ ) {
			polygon = polygons[i];
			polygon_vertice_count = polygon.vertices.length;

			for ( j = 2; j < polygon_vertice_count; j++ ) {
				verticeUvs = [];

				vertex = polygon.vertices[0];
				verticeUvs.push( new THREE.Vector2( vertex.uv.x, vertex.uv.y ) );
				vertex = new THREE.Vector3( vertex.x, vertex.y, vertex.z );
				vertex.applyMatrix4(matrix);

				if ( typeof vertice_dict[ vertex.x + ',' + vertex.y + ',' + vertex.z ] !== 'undefined' ) {
					vertex_idx_a = vertice_dict[ vertex.x + ',' + vertex.y + ',' + vertex.z ];
				} else {
					geometry.vertices.push( vertex );
					vertex_idx_a = vertice_dict[ vertex.x + ',' + vertex.y + ',' + vertex.z ] = geometry.vertices.length - 1;
				}

				vertex = polygon.vertices[j-1];
				verticeUvs.push( new THREE.Vector2( vertex.uv.x, vertex.uv.y ) );
				vertex = new THREE.Vector3( vertex.x, vertex.y, vertex.z );
				vertex.applyMatrix4(matrix);
				if ( typeof vertice_dict[ vertex.x + ',' + vertex.y + ',' + vertex.z ] !== 'undefined' ) {
					vertex_idx_b = vertice_dict[ vertex.x + ',' + vertex.y + ',' + vertex.z ];
				} else {
					geometry.vertices.push( vertex );
					vertex_idx_b = vertice_dict[ vertex.x + ',' + vertex.y + ',' + vertex.z ] = geometry.vertices.length - 1;
				}

				vertex = polygon.vertices[j];
				verticeUvs.push( new THREE.Vector2( vertex.uv.x, vertex.uv.y ) );
				vertex = new THREE.Vector3( vertex.x, vertex.y, vertex.z );
				vertex.applyMatrix4(matrix);
				if ( typeof vertice_dict[ vertex.x + ',' + vertex.y + ',' + vertex.z ] !== 'undefined' ) {
					vertex_idx_c = vertice_dict[ vertex.x + ',' + vertex.y + ',' + vertex.z ];
				} else {
					geometry.vertices.push( vertex );
					vertex_idx_c = vertice_dict[ vertex.x + ',' + vertex.y + ',' + vertex.z ] = geometry.vertices.length - 1;
				}

				face = new THREE.Face3(
					vertex_idx_a,
					vertex_idx_b,
					vertex_idx_c,
					new THREE.Vector3( polygon.normal.x, polygon.normal.y, polygon.normal.z )
				);

				geometry.faces.push( face );
				geometry.faceVertexUvs[0].push( verticeUvs );
			}

		}
		return geometry;
	};
	ThreeBSP.prototype.toMesh = function( material ) {
		var geometry = this.toGeometry(),
			mesh = new THREE.Mesh( geometry, material );

		mesh.position.getPositionFromMatrix( this.matrix );
		mesh.rotation.setEulerFromRotationMatrix( this.matrix );

		return mesh;
	};

	ThreeBSP.Node = function( polygons ) {
		var i, polygon_count,
			front = [],
			back = [];

		this.polygons = [];
		this.front = this.back = undefined;

		if ( !(polygons instanceof Array) || polygons.length === 0 ) return;

		this.divider = polygons[0].clone();

		for ( i = 0, polygon_count = polygons.length; i < polygon_count; i++ ) {
			this.divider.splitPolygon( polygons[i], this.polygons, this.polygons, front, back );
		}

		if ( front.length > 0 ) {
			this.front = new ThreeBSP.Node( front );
		}

		if ( back.length > 0 ) {
			this.back = new ThreeBSP.Node( back );
		}
	};
	ThreeBSP.Node.isConvex = function( polygons ) {
		var i, j;
		for ( i = 0; i < polygons.length; i++ ) {
			for ( j = 0; j < polygons.length; j++ ) {
				if ( i !== j && polygons[i].classifySide( polygons[j] ) !== BACK ) {
					return false;
				}
			}
		}
		return true;
	};
	ThreeBSP.Node.prototype.build = function( polygons ) {
		var i, polygon_count,
			front = [],
			back = [];

		if ( !this.divider ) {
			this.divider = polygons[0].clone();
		}

		for ( i = 0, polygon_count = polygons.length; i < polygon_count; i++ ) {
			this.divider.splitPolygon( polygons[i], this.polygons, this.polygons, front, back );
		}

		if ( front.length > 0 ) {
			if ( !this.front ) this.front = new ThreeBSP.Node();
			this.front.build( front );
		}

		if ( back.length > 0 ) {
			if ( !this.back ) this.back = new ThreeBSP.Node();
			this.back.build( back );
		}
	};
	ThreeBSP.Node.prototype.allPolygons = function() {
		var polygons = this.polygons.slice();
		if ( this.front ) polygons = polygons.concat( this.front.allPolygons() );
		if ( this.back ) polygons = polygons.concat( this.back.allPolygons() );
		return polygons;
	};
	ThreeBSP.Node.prototype.clone = function() {
		var node = new ThreeBSP.Node();

		node.divider = this.divider.clone();
		node.polygons = this.polygons.map( function( polygon ) { return polygon.clone(); } );
		node.front = this.front && this.front.clone();
		node.back = this.back && this.back.clone();

		return node;
	};
	ThreeBSP.Node.prototype.invert = function() {
		var i, polygon_count, temp;

		for ( i = 0, polygon_count = this.polygons.length; i < polygon_count; i++ ) {
			this.polygons[i].flip();
		}

		this.divider.flip();
		if ( this.front ) this.front.invert();
		if ( this.back ) this.back.invert();

		temp = this.front;
		this.front = this.back;
		this.back = temp;

		return this;
	};
	ThreeBSP.Node.prototype.clipPolygons = function( polygons ) {
		var i, polygon_count,
			front, back;

		if ( !this.divider ) return polygons.slice();

		front = [], back = [];

		for ( i = 0, polygon_count = polygons.length; i < polygon_count; i++ ) {
			this.divider.splitPolygon( polygons[i], front, back, front, back );
		}

		if ( this.front ) front = this.front.clipPolygons( front );
		if ( this.back ) back = this.back.clipPolygons( back );
		else back = [];

		return front.concat( back );
	};

	ThreeBSP.Node.prototype.clipTo = function( node ) {
		this.polygons = node.clipPolygons( this.polygons );
		if ( this.front ) this.front.clipTo( node );
		if ( this.back ) this.back.clipTo( node );
	};


	return ThreeBSP;
})();