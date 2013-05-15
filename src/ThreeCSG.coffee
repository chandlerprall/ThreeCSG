V3 = new THREE.Vector3()
V2 = new THREE.Vector2()

class ThreeBSP.Vertex extends THREE.Vector3
  constructor: (x, y, z, @normal=V3.clone(), @uv=V2.clone()) ->
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