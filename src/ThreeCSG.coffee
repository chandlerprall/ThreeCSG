EPSILON = 1e-5
COPLANAR = 0
FRONT = 1
BACK = 2
SPANNING = 3

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

  flip: () =>
    @normal.multiplyScalar -1
    @w *= -1
    @vertices.reverse()
    @

  classifyVertex: (vertex) =>
    side = @normal.dot(vertex) - @w
    switch
      when side < -EPSILON then BACK
      when side > EPSILON then FRONT
      else COPLANAR

  classifySide: (polygon) =>
    [front, back] = [0, 0]
    tally = (v) => switch @classifyVertex v
      when FRONT then front += 1
      when BACK  then back += 1
    (tally v for v in polygon.vertices)
    return FRONT    if front > 0  and back == 0
    return BACK     if front == 0 and back > 0
    return COPLANAR if front == back == 0
    return SPANNING

  splitPolygon: (poly, cp_front, cp_back, front, back) =>
    super