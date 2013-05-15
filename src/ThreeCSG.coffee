class ThreeBSP.Vertex extends THREE.Vector3
  constructor: (x, y, z, @normal=THREE.Vector3(), @uv=THREE.Vector2()) ->
    super x, y, z
    @subtract = @sub

  clone: ->
    new ThreeBSP.Vertex @x, @y, @z, @normal.clone(), @uv.clone()

  lerp: (args...) =>
    @uv.lerp args...
    @normal.lerp args...
    super args...

  interpolate: (args...) =>
    @clone().lerp args...

class ThreeBSP.Polygon extends ThreeBSP._Polygon
  constructor: (@vertices=[], @normal, @w) ->
    @calculateProperties() if @vertices.length

  calculateProperties: () =>
    [a, b, c] = @vertices
    @normal = b.clone().sub(a).cross(
      c.clone().subtract a
    ).normalize()
    @w = @normal.clone().dot a
    @

  clone: () =>
    new ThreeBSP.Polygon(
      (v.clone() for v in @vertices),
      @normal.clone(),
      @w
    )

	# ThreeBSP.Polygon.prototype.flip = function() {
	# 	var i, vertices = [];

	# 	this.normal.multiplyScalar( -1 );
	# 	this.w *= -1;

	# 	for ( i = this.vertices.length - 1; i >= 0; i-- ) {
	# 		vertices.push( this.vertices[i] );
	# 	};
	# 	this.vertices = vertices;

	# 	return this;
	# };
	# ThreeBSP.Polygon.prototype.classifyVertex = function( vertex ) {
	# 	var side_value = this.normal.dot( vertex ) - this.w;

	# 	if ( side_value < -EPSILON ) {
	# 		return BACK;
	# 	} else if ( side_value > EPSILON ) {
	# 		return FRONT;
	# 	} else {
	# 		return COPLANAR;
	# 	}
	# };
	# ThreeBSP.Polygon.prototype.classifySide = function( polygon ) {
	# 	var i, vertex, classification,
	# 		num_positive = 0,
	# 		num_negative = 0,
	# 		vertice_count = polygon.vertices.length;

	# 	for ( i = 0; i < vertice_count; i++ ) {
	# 		vertex = polygon.vertices[i];
	# 		classification = this.classifyVertex( vertex );
	# 		if ( classification === FRONT ) {
	# 			num_positive++;
	# 		} else if ( classification === BACK ) {
	# 			num_negative++;
	# 		}
	# 	}

	# 	if ( num_positive > 0 && num_negative === 0 ) {
	# 		return FRONT;
	# 	} else if ( num_positive === 0 && num_negative > 0 ) {
	# 		return BACK;
	# 	} else if ( num_positive === 0 && num_negative === 0 ) {
	# 		return COPLANAR;
	# 	} else {
	# 		return SPANNING;
	# 	}
	# };
	# ThreeBSP.Polygon.prototype.splitPolygon = function( polygon, coplanar_front, coplanar_back, front, back ) {
	# 	var classification = this.classifySide( polygon );

	# 	if ( classification === COPLANAR ) {

	# 		( this.normal.dot( polygon.normal ) > 0 ? coplanar_front : coplanar_back ).push( polygon );

	# 	} else if ( classification === FRONT ) {

	# 		front.push( polygon );

	# 	} else if ( classification === BACK ) {

	# 		back.push( polygon );

	# 	} else {

	# 		var vertice_count,
	# 			i, j, ti, tj, vi, vj,
	# 			t, v,
	# 			f = [],
	# 			b = [];

	# 		for ( i = 0, vertice_count = polygon.vertices.length; i < vertice_count; i++ ) {

	# 			j = (i + 1) % vertice_count;
	# 			vi = polygon.vertices[i];
	# 			vj = polygon.vertices[j];
	# 			ti = this.classifyVertex( vi );
	# 			tj = this.classifyVertex( vj );

	# 			if ( ti != BACK ) f.push( vi );
	# 			if ( ti != FRONT ) b.push( vi );
	# 			if ( (ti | tj) === SPANNING ) {
	# 				t = ( this.w - this.normal.dot( vi ) ) / this.normal.dot( vj.clone().subtract( vi ) );
	# 				v = vi.interpolate( vj, t );
	# 				f.push( v );
	# 				b.push( v );
	# 			}
	# 		}


	# 		if ( f.length >= 3 ) front.push( new ThreeBSP.Polygon( f ).calculateProperties() );
	# 		if ( b.length >= 3 ) back.push( new ThreeBSP.Polygon( b ).calculateProperties() );
	# 	}
	# };
