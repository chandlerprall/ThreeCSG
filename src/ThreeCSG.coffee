EPSILON = 1e-5
COPLANAR = 0
FRONT = 1
BACK = 2
SPANNING = 3

##
## ThreeBSP.Vertex
class ThreeBSP.Vertex extends THREE.Vector3
  constructor: (x, y, z, @normal=THREE.Vector3(), @uv=THREE.Vector2()) ->
    super x, y, z
    # TODO: Update callsites and remove aliases
    @subtract = @sub

  clone: ->
    new ThreeBSP.Vertex @x, @y, @z, @normal.clone(), @uv.clone()

  lerp: (args...) =>
    @uv.lerp args...
    @normal.lerp args...
    super args...

  interpolate: (args...) =>
    @clone().lerp args...

##
## ThreeBSP.Polygon
class ThreeBSP.Polygon
  constructor: (@vertices=[], @normal, @w) ->
    @calculateProperties() if @vertices.length
    # TODO: Update callsites and remove aliases
    @splitPolygon = @subdivide

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

  # Return a list of polygons from `poly` such
  # that no polygons span the plane defined by
  # `this`. Should be a list of one or two Polygons
  tessellate: (poly) =>
    {f, b, count} = {f: [], b: [], count: poly.vertices.length}

    return [poly] unless @classifySide(poly) == SPANNING
    for vi, i in poly.vertices
      vj = poly.vertices[(j = (i + 1) % count)]
      [ti, tj] = (@classifyVertex v for v in [vi, vj])
      f.push vi if ti != BACK
      b.push vi if ti != FRONT
      if (ti | tj) == SPANNING
        t = (@w - @normal.dot vi) / @normal.dot vj.clone().sub(vi)
        v = vi.interpolate vj, t
        f.push v
        b.push v

    polys = []
    polys.push new ThreeBSP.Polygon(f) if f.length >= 3
    polys.push new ThreeBSP.Polygon(b) if f.length >= 3
    polys

  subdivide: (polygon, coplanar_front, coplanar_back, front, back) =>
    for poly in @tessellate polygon
      side = @classifySide poly
      switch side
        when FRONT then front.push poly
        when BACK  then back.push poly
        when COPLANAR
          if @normal.dot(poly.normal) > 0
            coplanar_front.push poly
          else
            coplanar_back.push poly
        else
          throw new Error("BUG: Polygon of classification #{side} in subdivision")

##
## ThreeBSP.Node
class ThreeBSP.Node extends ThreeBSP._Node
  constructor: (polygons) ->
    @polygons = []
    @front = @back = undefined
    @divider = polygons?[0]?.clone()

    return unless polygons? and polygons.length

    [front, back] = [[], []]
    for poly in polygons
      @divider.subdivide poly, @polygons, @polygons, front, back

    @front = new ThreeBSP.Node front if front.length
    @back  = new ThreeBSP.Node back if back.length