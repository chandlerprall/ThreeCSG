V3 = new THREE.Vector3()
V2 = new THREE.Vector2()

class ThreeBSP.Vertex extends THREE.Vector3
  constructor: (x, y, z, @normal=V3.clone(), @uv=V2.clone()) ->
    super x, y, z

    # Method aliases
    @subtract = @sub

  clone: ->
    new ThreeBSP.Vertex @x, @y, @z, @normal.clone(), @uv.clone()

  lerp: (v, alpha) =>
    @normal.add (v.normal ? V3).clone().sub(@normal).multiplyScalar(alpha)
    @uv.add (v.uv ? V2).clone().sub(@uv).multiplyScalar(alpha)
    super v, alpha

  interpolate: (args...) =>
    @clone().lerp args...