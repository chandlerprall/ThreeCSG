import { BufferGeometry, Face3, Geometry, Material, Matrix4, Mesh, Vector2, Vector3 } from "three";

//ref: https://github.com/chandlerprall/ThreeCSG/blob/master/threeCSG.es6


const EPSILON = 1e-5;

enum Side
{
    Coplanar = 0,
    Front = 1,
    Back = 2,
    Spanning = 3
}

export class CSG
{
    tree: Node;
    matrix: Matrix4;
    constructor(obj: Geometry | Mesh | Node, matrix?: Matrix4)
    {
        let geometry: Geometry;
        if (obj instanceof Geometry)
        {
            geometry = obj;
            this.matrix = matrix || new Matrix4();
        }
        else if (obj instanceof Mesh)
        {
            // #todo: add hierarchy support
            this.matrix = obj.matrix.clone();
            let geo = obj.geometry;
            if (geo instanceof BufferGeometry)
                geometry = new Geometry().fromBufferGeometry(geo);
            else
                geometry = geo;
        }
        else if (obj instanceof Node)
        {
            this.tree = obj;
            this.matrix = matrix || new Matrix4();
            return this;
        }
        else
        {
            throw '未支持的类型';
        }


        let polgons: Polygon[] = [];
        for (let i = 0; i < geometry.faces.length; i++)
        {
            let face = geometry.faces[i];
            let faceVertexUvs = geometry.faceVertexUvs[0][i];
            let polygon = new Polygon();

            if (face instanceof Face3)
            {
                let uvs = faceVertexUvs ? faceVertexUvs[0].clone() : null;
                let vertex1 = new Vertex(geometry.vertices[face.a], face.vertexNormals[0], uvs);
                vertex1.applyMatrix4(this.matrix);
                polygon.vertices.push(vertex1);

                uvs = faceVertexUvs ? faceVertexUvs[1].clone() : null;
                let vertex2 = new Vertex(geometry.vertices[face.b], face.vertexNormals[1], uvs);
                vertex2.applyMatrix4(this.matrix);
                polygon.vertices.push(vertex2);

                uvs = faceVertexUvs ? faceVertexUvs[2].clone() : null;
                let vertex3 = new Vertex(geometry.vertices[face.c], face.vertexNormals[2], uvs);
                vertex3.applyMatrix4(this.matrix);
                polygon.vertices.push(vertex3);
            }

            polygon.calculateProperties();
            polgons.push(polygon);
        }

        this.tree = new Node(polgons);
    }

    subtract(other_tree: CSG)
    {
        let a = this.tree.clone(),
            b = other_tree.tree.clone();

        a.invert();
        a.clipTo(b);
        b.clipTo(a);
        b.invert();
        b.clipTo(a);
        b.invert();
        a.build(b.allPolygons());
        a.invert();
        return new CSG(a, this.matrix);
    }

    union(other_tree: CSG)
    {
        let a = this.tree.clone(),
            b = other_tree.tree.clone();

        a.clipTo(b);
        b.clipTo(a);
        b.invert();
        b.clipTo(a);
        b.invert();
        a.build(b.allPolygons());
        return new CSG(a, this.matrix);
    }

    intersect(other_tree: CSG)
    {
        let a = this.tree.clone(),
            b = other_tree.tree.clone();

        a.invert();
        b.clipTo(a);
        b.invert();
        a.clipTo(b);
        b.clipTo(a);
        a.build(b.allPolygons());
        a.invert();
        return new CSG(a, this.matrix);
    }

    toGeometry()
    {
        let matrix = new Matrix4().getInverse(this.matrix),
            geometry = new Geometry(),
            polygons = this.tree.allPolygons(),
            polygon_count = polygons.length,
            vertice_dict = {},
            vertex_idx_a: number, vertex_idx_b: number, vertex_idx_c: number;

        for (let i = 0; i < polygon_count; i++)
        {
            let polygon = polygons[i];
            let polygon_vertice_count = polygon.vertices.length;

            for (let j = 2; j < polygon_vertice_count; j++)
            {
                let verticeUvs = [];

                let vertex = polygon.vertices[0];
                verticeUvs.push(new Vector2(vertex.uv.x, vertex.uv.y));
                let vertex1 = new Vector3(vertex.x, vertex.y, vertex.z);
                vertex1.applyMatrix4(matrix);

                if (typeof vertice_dict[vertex1.x + ',' + vertex1.y + ',' + vertex1.z] !== 'undefined')
                {
                    vertex_idx_a = vertice_dict[vertex1.x + ',' + vertex1.y + ',' + vertex1.z];
                } else
                {
                    geometry.vertices.push(vertex1);
                    vertex_idx_a = vertice_dict[vertex1.x + ',' + vertex1.y + ',' + vertex1.z] = geometry.vertices.length - 1;
                }

                vertex = polygon.vertices[j - 1];
                verticeUvs.push(new Vector2(vertex.uv.x, vertex.uv.y));
                let vertex2 = new Vector3(vertex.x, vertex.y, vertex.z);
                vertex2.applyMatrix4(matrix);
                if (typeof vertice_dict[vertex2.x + ',' + vertex2.y + ',' + vertex2.z] !== 'undefined')
                {
                    vertex_idx_b = vertice_dict[vertex2.x + ',' + vertex2.y + ',' + vertex2.z];
                } else
                {
                    geometry.vertices.push(vertex2);
                    vertex_idx_b = vertice_dict[vertex2.x + ',' + vertex2.y + ',' + vertex2.z] = geometry.vertices.length - 1;
                }

                vertex = polygon.vertices[j];
                verticeUvs.push(new Vector2(vertex.uv.x, vertex.uv.y));
                let vertex3 = new Vector3(vertex.x, vertex.y, vertex.z);
                vertex3.applyMatrix4(matrix);
                if (typeof vertice_dict[vertex3.x + ',' + vertex3.y + ',' + vertex3.z] !== 'undefined')
                {
                    vertex_idx_c = vertice_dict[vertex3.x + ',' + vertex3.y + ',' + vertex3.z];
                }
                else
                {
                    geometry.vertices.push(vertex3);
                    vertex_idx_c = vertice_dict[vertex3.x + ',' + vertex3.y + ',' + vertex3.z] = geometry.vertices.length - 1;
                }

                let face = new Face3(
                    vertex_idx_a,
                    vertex_idx_b,
                    vertex_idx_c,
                    new Vector3(polygon.normal.x, polygon.normal.y, polygon.normal.z)
                );

                geometry.faces.push(face);
                geometry.faceVertexUvs[0].push(verticeUvs);
            }

        }
        return geometry;
    }

    toMesh(material?: Material | Material[])
    {
        let geometry = this.toGeometry(),
            mesh = new Mesh(geometry, material);

        mesh.applyMatrix(this.matrix)
        return mesh;
    }
}

export class Polygon
{
    constructor(
        public vertices: Vertex[] = [],
        public normal?: Vector3,
        public w?: number)
    {
        if (vertices.length > 0 && !normal)
            this.calculateProperties();
    }

    calculateProperties()
    {
        let a = this.vertices[0],
            b = this.vertices[1],
            c = this.vertices[2];

        this.normal = b.clone().sub(a)
            .cross(c.clone().sub(a))
            .normalize();

        this.w = this.normal.dot(a);

        return this;
    }

    clone()
    {
        return new Polygon(
            this.vertices.map(v => v.clone()),
            this.normal.clone(),
            this.w
        );
    }

    flip()
    {
        this.normal.multiplyScalar(-1);
        this.w *= -1;
        this.vertices.reverse();
        return this;
    }

    classifyVertex(vertex: Vector3 | Vertex): Side
    {
        let side_value = this.normal.dot(vertex) - this.w;

        if (side_value < -EPSILON)
        {
            return Side.Back;
        }
        else if (side_value > EPSILON)
        {
            return Side.Front;
        }
        else
        {
            return Side.Coplanar;
        }
    }

    classifySide(polygon: Polygon): Side
    {
        let num_positive = 0,
            num_negative = 0,
            vertice_count = polygon.vertices.length;

        for (let i = 0; i < vertice_count; i++)
        {
            let vertex = polygon.vertices[i];
            let classification = this.classifyVertex(vertex);
            if (classification === Side.Front)
                num_positive++;
            else if (classification === Side.Back)
                num_negative++;
        }

        if (num_positive > 0 && num_negative === 0)
            return Side.Front;
        else if (num_positive === 0 && num_negative > 0)
            return Side.Back;
        else if (num_positive === 0 && num_negative === 0)
            return Side.Coplanar;
        else
            return Side.Spanning;
    }

    splitPolygon(polygon: Polygon, coplanar_front: Polygon[], coplanar_back: Polygon[], front: Polygon[], back: Polygon[])
    {
        let classification = this.classifySide(polygon);

        if (classification === Side.Coplanar)
        {
            (this.normal.dot(polygon.normal) > 0 ? coplanar_front : coplanar_back).push(polygon);
        }
        else if (classification === Side.Front)
        {
            front.push(polygon);
        }
        else if (classification === Side.Back)
        {
            back.push(polygon);
        }
        else
        {
            let f = [];
            let b = [];

            for (let i = 0, vertice_count = polygon.vertices.length; i < vertice_count; i++)
            {
                let j = (i + 1) % vertice_count;
                let vi = polygon.vertices[i];
                let vj = polygon.vertices[j];
                let ti = this.classifyVertex(vi);
                let tj = this.classifyVertex(vj);

                if (ti != Side.Back) f.push(vi);
                if (ti != Side.Front) b.push(vi);
                if ((ti | tj) === Side.Spanning)
                {
                    let t = (this.w - this.normal.dot(vi)) / this.normal.dot(vj.clone().sub(vi));
                    let v = vi.clone().lerp(vj, t);
                    f.push(v);
                    b.push(v);
                }
            }

            if (f.length >= 3) front.push(new Polygon(f).calculateProperties());
            if (b.length >= 3) back.push(new Polygon(b).calculateProperties());
        }
    }
}

class Vertex extends Vector3
{
    constructor(
        pos: Vector3,
        public normal = new Vector3(),
        public uv = new Vector2())
    {
        super(pos.x, pos.y, pos.z);
    }

    clone(): Vertex
    {
        return new Vertex(this, this.normal.clone(), this.uv.clone());
    }

    lerp(v: Vertex, alpha: number)
    {
        super.lerp(v, alpha);
        this.normal.lerp(v.normal, alpha);
        this.uv.lerp(v.uv, alpha);
        return this;
    }
}

class Node
{
    divider: Polygon;
    back: Node;
    front: Node;
    constructor(public polygons: Polygon[] = [])
    {
        let front: Polygon[] = [],
            back: Polygon[] = [];

        this.front = this.back = undefined;

        if (polygons.length === 0) return;

        this.divider = polygons[0].clone();

        for (let i = 0, polygon_count = polygons.length; i < polygon_count; i++)
        {
            this.divider.splitPolygon(polygons[i], this.polygons, this.polygons, front, back);
        }

        if (front.length > 0)
        {
            this.front = new Node(front);
        }

        if (back.length > 0)
        {
            this.back = new Node(back);
        }
    }

    isConvex(polygons: Polygon[])
    {
        for (let i = 0; i < polygons.length; i++)
        {
            for (let j = 0; j < polygons.length; j++)
            {
                if (i !== j && polygons[i].classifySide(polygons[j]) !== Side.Back)
                {
                    return false;
                }
            }
        }
        return true;
    }

    build(polygons: Polygon[])
    {
        let front: Polygon[] = [],
            back: Polygon[] = [];

        if (!this.divider)
        {
            this.divider = polygons[0].clone();
        }

        for (let i = 0, polygon_count = polygons.length; i < polygon_count; i++)
        {
            this.divider.splitPolygon(polygons[i], this.polygons, this.polygons, front, back);
        }

        if (front.length > 0)
        {
            if (!this.front) this.front = new Node();
            this.front.build(front);
        }

        if (back.length > 0)
        {
            if (!this.back) this.back = new Node();
            this.back.build(back);
        }
    }

    allPolygons()
    {
        let polygons = this.polygons.slice();
        if (this.front) polygons = polygons.concat(this.front.allPolygons());
        if (this.back) polygons = polygons.concat(this.back.allPolygons());
        return polygons;
    }

    clone()
    {
        let node = new Node();

        node.divider = this.divider.clone();
        node.polygons = this.polygons.map(p => p.clone());
        node.front = this.front && this.front.clone();
        node.back = this.back && this.back.clone();

        return node;
    }

    invert()
    {
        for (let p of this.polygons)
            p.flip();

        this.divider.flip();
        if (this.front) this.front.invert();
        if (this.back) this.back.invert();

        let temp = this.front;
        this.front = this.back;
        this.back = temp;

        return this;
    }

    clipPolygons(polygons: Polygon[])
    {
        if (!this.divider) return polygons.slice();

        let front: Polygon[] = [];
        let back: Polygon[] = [];

        for (let polygon of polygons)
            this.divider.splitPolygon(polygon, front, back, front, back);

        if (this.front) front = this.front.clipPolygons(front);
        if (this.back) back = this.back.clipPolygons(back);
        else back = [];

        return front.concat(back);
    }

    clipTo(node: Node)
    {
        this.polygons = node.clipPolygons(this.polygons);
        if (this.front) this.front.clipTo(node);
        if (this.back) this.back.clipTo(node);
    }
}
