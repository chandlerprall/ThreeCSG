'use strict';
window._ThreeBSP = (function() {

	var _ThreeBSP,
		EPSILON = 1e-5,
		COPLANAR = 0,
		FRONT = 1,
		BACK = 2,
		SPANNING = 3;

	_ThreeBSP = function( geometry ) { return "PLACEHOLDER"; };

	_ThreeBSP.prototype.toGeometry = function() {
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
	_ThreeBSP.prototype.toMesh = function( material ) {
		var geometry = this.toGeometry(),
			mesh = new THREE.Mesh( geometry, material );

		mesh.position.getPositionFromMatrix( this.matrix );
		mesh.rotation.setEulerFromRotationMatrix( this.matrix );

		return mesh;
	};

	return _ThreeBSP;
})();