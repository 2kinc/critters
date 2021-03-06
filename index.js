(function (global) {
  var mod = {
    Mouse: class Mouse {
      constructor(window, world) {
        this.window = window;
        this.world = world;
        this.clicked = false;
        this.x = 0;
        this.y = 0;
        this.world.el.addEventListener('mousedown', e => this.clicked = true);
        this.world.el.addEventListener('mouseup', e => this.clicked = false);
        this.world.el.addEventListener('mousemove', e => {this.x = Math.floor(e.clientX - this.world.el.getBoundingClientRect().left + this.world.cam.x); this.y = Math.floor(e.clientY - this.world.el.getBoundingClientRect().top + this.world.cam.y); })
      }
    },
    World: function (bgcolor, parent, width, height, camx, camy, gravity, customprops) {
      //Get everything started
      var that = this;
      this.cam = {};
      this.cam.x = camx;
      this.cam.y = camy;
      this.cam.zoom = 1;
      this.color = bgcolor;
      this.width = width;
      this.height = height;
      this.el = document.createElement('canvas');
      this.el.width = this.width;
      this.el.height = this.height;
      this.parent = parent || document.body;
      this.parent.appendChild(this.el);
      this.context = this.el.getContext('2d');
      this.gravity = gravity;
      if (customprops) for (prop in customprops) this[prop] = customprops[prop];
      this.keys = {};
      document.addEventListener('keydown', e => this.keys[e.key.toLowerCase()] = e.type = true);
      document.addEventListener('keyup', e => this.keys[e.key.toLowerCase()] = false);
      document.addEventListener('mouseleave', () => this.keys = {});
      document.addEventListener('blur', () => this.keys = {});
      this.mouse = new mod.Mouse(global, this);
      this.mouse.clicked = false;
      this.objects = new Map();
      this.set = (...obs) => obs.forEach(ob => this.objects.set(ob.name, ob));
      this.get = ob => this.objects.get(ob);
      this.$ = this.get;
      this.paused = true;
      this.update = function () {/*This is for users update (updates every frame)*/ };
      this.mainUpdate = function () { //updates every frame
        that.context.beginPath();
        that.context.fillStyle = that.color;
        that.context.fillRect(0, 0, that.width, that.height);
        that.objects.forEach(function (obj) {
          that.context.beginPath();
          that.context.save();
          that.context.strokeStyle = obj.outlineColor || obj.color;
          that.context.lineWidth = obj.outlineWidth;
          that.context.fillStyle = obj.color;
          if (!obj.fixed) that.context.translate((obj.x - that.cam.x) * that.cam.zoom, (obj.y - that.cam.y) * that.cam.zoom);
          else that.context.translate(obj.x * that.cam.zoom, obj.y * that.cam.zoom);
          if (obj.type == 'polygon') {
            if (obj.typetemp == 'rectangle') obj.points = [new mod.Vector(-obj.width / 2, -obj.height / 2), new mod.Vector(obj.width / 2, -obj.height / 2), new mod.Vector(obj.width / 2, obj.height / 2), new mod.Vector(-obj.width / 2, obj.height / 2)];
            obj.edges = [];
            var oblen = obj.computedPoints.length;
            for (var i = 0; i < oblen; i++) obj.edges[i] = new mod.Line(obj.computedPoints[i % oblen], obj.computedPoints[(i + 1) % (oblen)]);
            that.context.moveTo(obj.computedPoints[0].x, obj.computedPoints[0].y);
            obj.computedPoints.forEach(a => that.context.lineTo(a.x, a.y));
            that.context.closePath();
            that.context.fill();
          } else if (obj.type == 'circle') {
            that.context.arc(0, 0, obj.radius * that.cam.zoom, 0, Math.PI * 2);
            that.context.fill();
          } else if (obj.type == 'text') {
            that.context.font = obj.font;
            that.context.fillText(obj.text, 0, 0);
          }
          that.context.restore();
        });
      };
      this.physicsUpdate = function () {
        that.objects.forEach(function (obj) {
          if (obj.physics){
            previous = { x: obj.x, y: obj.y };
            obj.x += obj.acceleration.x;
            obj.y += obj.acceleration.y;
            obj.acceleration.x *= 0.9;
            obj.acceleration.y *= 0.9;
            if (obj.gravity) obj.addForce({ x: 0, y: 1.1 })
            that.objects.forEach(function (object) {
              if (obj != object && mod.Collision(object, obj)) {
                if (obj.type == 'polygon' && object.type == 'polygon') {

                }
              }
            });
          }
        });
      };
      this.frame = function () {
        if (that.paused) return;
        that.update();
        that.mainUpdate();
        that.physicsUpdate();
        requestAnimationFrame(that.frame);
      };
      (this.start = () => {
        requestAnimationFrame(this.frame);
        this.paused = false;
      })();
      this.stop = () => this.paused = true;
    },
    // Vector constructor
    Vector: class Vector {
      constructor(x, y) {
        this.x = x || 0;
        this.y = y || 0;
      }
      get type() { return 'vector' }
      static sum(...vectors) {
        var x = 0;
        var y = 0;
        vectors.forEach(function (vector) {
          x += vector.x;
          y += vector.y;
        });
        return new Vector(x, y);
      }
      perp() {
        return new Vector(-(this.y), this.x);
      }
      project(line) {
        var slope2 = -1 / line.slope;
        var yint2 = this.y - slope2 * this.x;
        var nx = (yint2 - line.yint) / (slope - slope2);
        return new Vector(nx, (slope * nx) + line.yint);
      }
      add(vector) {
        return new Vector(this.x + vector.x, this.y + vector.y);
      }
      subtract(vector) {
        return new Vector(this.x - vector.x, this.y - vector.y);
      }
      static dot(vector1, vector2) {
        return vector1.x * vector2.x + vector1.y * vector2.y;
      }
      dot(vector) {
        return this.x * vector.x + this.y * vector.y;
      }
      get dist() {
        return this.dot(this) ** 0.5;
      }
      static rotateAroundOrigin(vector, angle) {
        var radians = (Math.PI / 180) * angle,
          cos = Math.cos(radians), sin = Math.sin(radians),
          nx = (cos * vector.x) - (sin * vector.y),
          ny = (cos * vector.y) + (sin * vector.x);
        return new Vector(nx, ny);
      }
      get physics () {return false;}
    },
    //Line constructor
    Line: class Line {
      constructor(start, end) {
        this.start = start || new mod.Vector;
        this.end = end || new mod.Vector;
      }
      static sum(...lines) {
        var result = new Line;
        lines.forEach(function (line) {
          result.start.x += line.start.x;
          result.start.y += line.start.y;
          result.end.x += line.end.x;
          result.end.y += line.end.y;
        });
        return result;
      }
      get type() { return 'line' }
      get slope() {
        return -(this.start.y - this.end.y) / (this.start.x - this.end.x);
      }
      get yint() {
        var slope = this.slope;
        if (slope == undefined) return undefined;
        return this.start.y - slope * this.start.x;
      }
      get angle() {
        return Math.atan(-(this.start.y - this.end.y) / (this.start.x - this.end.x)) * (180 / Math.PI);
      }
      dot(vector) {
        var slope = new mod.Vector(this.slope, 1);
        return slope.x * vector.x + slope.y * vector.y;
      }
      add(line) {
        var result = JSON.parse(JSON.stringify(this));
        result.start.x += line.start.x;
        result.start.y += line.start.y;
        result.end.x += line.end.x;
        result.end.y += line.end.y;
        return result;
      }
      get physics() {return false;}
    },
    Projection: class Projection {
      constructor(min, max) {
        this.min = min;
        this.max = max;
      }
      overlap(proj) {
        if (this.max > proj.min)
          return true;
        if (this.min > proj.max)
          return true;
        return false;
      }
      get physics() {return false;}
    },
    Axis: class Axis {
      constructor(vector_or_x, y) {
        if (y) {
          this.x = vector_or_x;
          this.y = y;
        } else {
          this.x = vector_or_x.x;
          this.y = vector_or_x.y;
        }
      }
      dot(vector) {
        return this.x * vector.x + this.y * vector.y;
      }
      get normalized() {
        var l = Math.sqrt(this.x ** 2 + this.y ** 2);
        return new Axis(this.x / l, this.y / l);
      }
      get physics() {return false;}
    },
    //Polygon constructor
    Polygon: class Polygon {
      constructor(name, x, y, points, color, mass, customprops) {
        this.name = name;
        this.x = x;
        this.y = y;
        this.type = 'polygon';
        if (typeof points == 'string') {
          var d = [];
          points.split(' ').forEach(function (itm) {
            d.push(new mod.Vector(Number(itm.split(',')[0]), Number(itm.split(',')[1])))
          });
          points = d;
        }
        this.points = points;
        this.edges = [];
        this.rotation = 0;
        this.color = color;
        this.mass = mass || 1;
        this.acceleration = { x: 0, y: 0 };
        this.outlineColor = "transparent";
        this.outlineWidth = 1;
        for (var customprop in customprops) {
          this[customprop] = customprops[customprop];
        }
      }
      static NGON(name, sides, size, center, color, customprops) {
        var step = 2 * Math.PI / sides;
        var shift = (Math.PI / 180.0) * -18;
        var vertices = [];
        for (var i = 0; i < sides; i++) {
          var s = i * step + shift;
          vertices.push(new mod.Vector(size * Math.cos(s), size * Math.sin(s)))
        }
        return new Polygon(name, center.x, center.y, vertices, color, customprops);
      }
      get minx() {
        var min = Infinity;
        this.computedPoints.forEach(function (itm) {
          if (min > itm.x) min = itm.x;
        });
        return min + this.x;
      }
      get miny() {
        var min = Infinity;
        this.computedPoints.forEach(function (itm) {
          if (min > itm.y) min = itm.y;
        });
        return min + this.y;
      }
      get maxx() {
        var max = 0;
        this.computedPoints.forEach(function (itm) {
          if (max < itm.x) max = itm.x;
        });
        return max + this.x;
      }
      get maxy() {
        var max = 0;
        this.computedPoints.forEach(function (itm) {
          if (max < itm.y) max = itm.y;
        });
        return max + this.y;
      }
      get computedPoints() {
        var points = [];
        var that = this;
        this.points.forEach(function (point) {
          var newPoint = mod.Vector.rotateAroundOrigin(point, that.rotation);
          points.push(newPoint);
        });
        return points;
      }
      project(axis) {
        var vertices = this.computedPoints;
        var normalized = axis.normalized;
        var min = normalized.dot(vertices[0].add(new mod.Vector(this.x, this.y)));
        var max = min;
        for (var i = 1; i < vertices.length; i++) {
          var p = normalized.dot(vertices[i].add(new mod.Vector(this.x, this.y)));
          if (p < min) {
            min = p;
          } else if (p > max) {
            max = p;
          }
        }
        var projection = new mod.Projection(min, max);
        return projection;
      }
      static getAxes(polygon) {
        var axes = [];
        var vertices = polygon.computedPoints;
        for (var i = 0; i < vertices.length; i++) {
          var p1 = vertices[i]; //current vertex
          var p2 = vertices[(i + 1) % vertices.length]; //next vertex
          var edge = p1.subtract(p2); //get edge vector
          var normal = edge.perp();
          axes[i] = new mod.Axis(normal);
        }
        axes.normalized = function () {
          var normalized = [];
          for (var i = 0; i < axes.length; i++) {
            normalized[i] = axes[i].normalized;
          }
          return normalized;
        }
        return axes;
      }
      getAxes() {
        return mod.Polygon.getAxes(this);
      }
      addForce(force) {
        this.acceleration.x += (force.x / (this.mass || 1)) || 0;
        this.acceleration.y += (force.y / (this.mass || 1)) || 0;
      }
      up(d) {
        var vec = new mod.Vector(0, 0);
        vec.y -= d * Math.cos((this.rotation * (Math.PI / 180)));
        vec.x += d * Math.sin((this.rotation * (Math.PI / 180)));
        return vec;
      }
      down(d) {
        var vec = new mod.Vector(0, 0);
        vec.y += d * Math.cos((this.rotation * (Math.PI / 180)));
        vec.x -= d * Math.sin((this.rotation * (Math.PI / 180)));
        return vec;
      }
      right(d) {
        var vec = new mod.Vector(0, 0);
        vec.x += d * Math.cos((this.rotation * (Math.PI / 180)));
        vec.y -= d * Math.sin((this.rotation * (Math.PI / 180)));
        return vec;
      }
      left(d) {
        var vec = new mod.Vector(0, 0);
        vec.x -= d * Math.cos((this.rotation * (Math.PI / 180)));
        vec.y += d * Math.sin((this.rotation * (Math.PI / 180)));
        return vec;
      }
      get physics() {return true;}
    },
    Text: class Text {
      constructor(name, x, y, text, font, color, maxwidth, customprops) {
        this.name = name;
        this.x = x || 0;
        this.y = y || 0;
        this.text = text || '';
        this.font = font || '12px Arial';
        this.color = color || 'black';
        this.maxwidth = maxwidth || Infinity;
        for (var customprop in customprops) {
          this[customprop] = customprops[customprop];
        }
      }

      get type () {return 'text';}

      get physics() {return false;}
    },
    Rectangle: class Rectangle {
      constructor(name, x, y, width, height, color, mass) {
        var poly = new mod.Polygon(name, x, y, [
          new mod.Vector(0, 0), new mod.Vector(width, 0), new mod.Vector(width, height), new mod.Vector(0, height)
        ], color, mass);
        for (var prop in poly) this[prop] = poly[prop];
        this.typetemp = 'rectangle';
        this.width = width;
        this.height = height;
      }
      get minx() {
        var min = Infinity;
        this.computedPoints.forEach(function (itm) {
          if (min > itm.x) min = itm.x;
        });
        return min + this.x;
      }
      get miny() {
        var min = Infinity;
        this.computedPoints.forEach(function (itm) {
          if (min > itm.y) min = itm.y;
        });
        return min + this.y;
      }
      get maxx() {
        var max = 0;
        this.computedPoints.forEach(function (itm) {
          if (max < itm.x) max = itm.x;
        });
        return max + this.x;
      }
      get maxy() {
        var max = 0;
        this.computedPoints.forEach(function (itm) {
          if (max < itm.y) max = itm.y;
        });
        return max + this.y;
      }
      get computedPoints() {
        var points = [];
        var that = this;
        this.points.forEach(function (point) {
          var newPoint = mod.Vector.rotateAroundOrigin(point, that.rotation);
          points.push(newPoint);
        });
        return points;
      } addForce(force) {
        this.acceleration.x += (force.x / (this.mass || 1)) || 0;
        this.acceleration.y += (force.y / (this.mass || 1)) || 0;
      } up(d) {
        var vec = new mod.Vector(0, 0);
        vec.y -= d * Math.cos((this.rotation * (Math.PI / 180)));
        vec.x += d * Math.sin((this.rotation * (Math.PI / 180)));
        return vec;
      } down(d) {
        var vec = new mod.Vector(0, 0);
        vec.y += d * Math.cos((this.rotation * (Math.PI / 180)));
        vec.x -= d * Math.sin((this.rotation * (Math.PI / 180)));
        return vec;
      } right(d) {
        var vec = new mod.Vector(0, 0);
        vec.x += d * Math.cos((this.rotation * (Math.PI / 180)));
        vec.y -= d * Math.sin((this.rotation * (Math.PI / 180)));
        return vec;
      } left(d) {
        var vec = new mod.Vector(0, 0);
        vec.x -= d * Math.cos((this.rotation * (Math.PI / 180)));
        vec.y += d * Math.sin((this.rotation * (Math.PI / 180)));
        return vec;
      }
      get physics() {return true;}
    },
    Circle: class Circle {
      constructor(name, x, y, radius, color, mass) {
        this.name = name;
        this.x = x;
        this.y = y;
        this.type = 'circle';
        this.acceleration = { x: 0, y: 0 };
        this.radius = radius;
        this.color = color;
        this.mass = mass;
      } addForce(force) {
        this.acceleration.x += (force.x / (this.mass || 1)) || 0;
        this.acceleration.y += (force.y / (this.mass || 1)) || 0;
      } up(d) {
        var vec = new mod.Vector(0, 0);
        vec.y -= d * Math.cos((this.rotation * (Math.PI / 180)));
        vec.x += d * Math.sin((this.rotation * (Math.PI / 180)));
        return vec;
      } down(d) {
        var vec = new mod.Vector(0, 0);
        vec.y += d * Math.cos((this.rotation * (Math.PI / 180)));
        vec.x -= d * Math.sin((this.rotation * (Math.PI / 180)));
        return vec;
      } right(d) {
        var vec = new mod.Vector(0, 0);
        vec.x += d * Math.cos((this.rotation * (Math.PI / 180)));
        vec.y -= d * Math.sin((this.rotation * (Math.PI / 180)));
        return vec;
      } left(d) {
        var vec = new mod.Vector(0, 0);
        vec.x -= d * Math.cos((this.rotation * (Math.PI / 180)));
        vec.y += d * Math.sin((this.rotation * (Math.PI / 180)));
        return vec;
      }
      get minx() {
        return this.x - this.radius;
      }
      get miny() {
        return this.y - this.radius;
      }
      get maxx() {
        return this.x + this.radius;
      }
      get maxy() {
        return this.y + this.radius;
      }
      get physics() {return true;}
    },
    Collision: function (a, b) {
      if (a.type == 'line' && b.type == 'line') {
        var ap = a.start.x, bp = a.start.y, c = a.end.x, d = a.end.y, p = b.start.x, q = b.start.y, r = b.end.x, s = b.end.y, det, gamma, lambda;
        det = (c - ap) * (s - q) - (r - p) * (d - bp);
        if (det === 0) {
          return 'hi';
        } else {
          lambda = ((s - q) * (r - ap) + (p - r) * (s - bp)) / det;
          gamma = ((bp - d) * (r - ap) + (c - ap) * (s - bp)) / det;
          return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
        }
      }
      if (a.type == 'vector' && b.type == 'polygon') {
        var points = b.computedPoints;
        var x = a.x, y = a.y;
        var inside = false;
        for (var i = 0, j = points.length - 1; i < points.length; j = i++) {
          var xi = points[i].x + b.x, yi = points[i].y + b.y;
          var xj = points[j].x + b.x, yj = points[j].y + b.y;
          var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
        }
        return inside;
      }
      if (b.type == 'vector' && a.type == 'polygon') {
        var points = a.computedPoints;
        var x = b.x, y = b.y;
        var inside = false;
        for (var i = 0, j = points.length - 1; i < points.length; j = i++) {
          var xi = points[i].x + a.x, yi = points[i].y + a.y;
          var xj = points[j].x + a.x, yj = points[j].y + a.y;
          var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
        }
        return inside;
      }
      if (a.type == 'vector' && b.type == 'circle') {
        return ((a.x - b.x) ** 2 + (a.y - b.y) ** 2) <= b.radius ** 2;
      }
      if (b.type == 'vector' && a.type == 'circle') {
        return ((b.x - a.x) ** 2 + (b.y - a.y) ** 2) <= a.radius ** 2;
      }
      if (a.type == 'line' && b.type == 'circle') {
        var line = a;
        var circle = b;
        var A = line.start;
        var B = line.end;
        var C = { x: circle.x, y: circle.y };
        var radius = circle.radius;
        var dist;
        const v1x = B.x - A.x;
        const v1y = B.y - A.y;
        const v2x = C.x - A.x;
        const v2y = C.y - A.y;
        const u = (v2x * v1x + v2y * v1y) / (v1y * v1y + v1x * v1x);
        if (u >= 0 && u <= 1) {
          dist = (A.x + v1x * u - C.x) ** 2 + (A.y + v1y * u - C.y) ** 2;
        } else {
          dist = u < 0 ? (A.x - C.x) ** 2 + (A.y - C.y) ** 2 : (B.x - C.x) ** 2 + (B.y - C.y) ** 2;
        }
        return dist < radius ** 2;
      }
      if (a.type == 'polygon' && b.type == 'polygon') {
        a.edges.forEach(function (a) {
          var normal = l => new mod.Line(new mod.Vector(-(l.end.x - l.start.x), l.end.y - l.start.y), new mod.Vector(l.end.x - l.start.x, -(l.end.y - l.start.y)));
          normal.slope
        })
      }
      if (b.type == 'line' && a.type == 'circle') {
        var line = b;
        var circle = a;
        var A = line.start;
        var B = line.end;
        var C = { x: circle.x, y: circle.y };
        var radius = circle.radius;
        var dist;
        const v1x = B.x - A.x;
        const v1y = B.y - A.y;
        const v2x = C.x - A.x;
        const v2y = C.y - A.y;
        const u = (v2x * v1x + v2y * v1y) / (v1y * v1y + v1x * v1x);
        if (u >= 0 && u <= 1) {
          dist = (A.x + v1x * u - C.x) ** 2 + (A.y + v1y * u - C.y) ** 2;
        } else {
          dist = u < 0 ? (A.x - C.x) ** 2 + (A.y - C.y) ** 2 : (B.x - C.x) ** 2 + (B.y - C.y) ** 2;
        }
        return dist < radius ** 2;
      }
      if (a.type == 'circle' && b.type == 'polygon') {
        function pointinpolygon(point, vs) {
          return mod.Collision(point, vs);
        };
        function lineCircle(line, circle) {
          var A = line.start;
          var B = line.end;
          var C = { x: circle.x, y: circle.y };
          var radius = circle.radius;
          var dist;
          const v1x = B.x - A.x;
          const v1y = B.y - A.y;
          const v2x = C.x - A.x;
          const v2y = C.y - A.y;
          const u = (v2x * v1x + v2y * v1y) / (v1y * v1y + v1x * v1x);
          if (u >= 0 && u <= 1) {
            dist = (A.x + v1x * u - C.x) ** 2 + (A.y + v1y * u - C.y) ** 2;
          } else {
            dist = u < 0 ? (A.x - C.x) ** 2 + (A.y - C.y) ** 2 : (B.x - C.x) ** 2 + (B.y - C.y) ** 2;
          }
          return dist < radius ** 2;
        }
        if (pointinpolygon({ x: a.x, y: a.y }, b)) return true;
        for (var i = 0; i < b.edges.length; i++) {
          if (lineCircle(b.edges[i].add({ start: { x: b.x, y: b.y }, end: { x: b.x, y: b.y } }), a)) return true;
        };
        return false;
      }
      if (a.type == 'polygon' && b.type == 'circle') {
        function pointinpolygon(point, vs) {
          mod.Collision(point, vs);
        };
        function lineCircle(line, circle) {
          var A = line.start;
          var B = line.end;
          var C = { x: circle.x, y: circle.y };
          var radius = circle.radius;
          var dist;
          const v1x = B.x - A.x;
          const v1y = B.y - A.y;
          const v2x = C.x - A.x;
          const v2y = C.y - A.y;
          const u = (v2x * v1x + v2y * v1y) / (v1y * v1y + v1x * v1x);
          if (u >= 0 && u <= 1) {
            dist = (A.x + v1x * u - C.x) ** 2 + (A.y + v1y * u - C.y) ** 2;
          } else {
            dist = u < 0 ? (A.x - C.x) ** 2 + (A.y - C.y) ** 2 : (B.x - C.x) ** 2 + (B.y - C.y) ** 2;
          }
          return dist < radius ** 2;
        }
        if (pointinpolygon({ x: b.x, y: b.y }, a)) return true;
        for (var i = 0; i < a.edges.length; i++) {
          if (lineCircle(a.edges[i].add({ start: { x: a.x, y: a.y }, end: { x: a.x, y: a.y } }), b)) return true;
        };
        return false;
      }
      if (a.type == 'circle' && b.type == 'circle') {
        return ((a.x - b.x) ** 2 + (a.y - b.y) ** 2) ** 0.5 < a.radius + b.radius;
      }
    },
    newCollision: function (a, b) {
      if (a.type == 'polygon' && b.type == 'polygon') {
        var axes1 = a.getAxes();
        var axes2 = a.getAxes();

        for (var i = 0; i < axes1.length; i++) { //loop through axes1
          var axis = axes1[i];
          //project the shapes!
          var p1 = a.project(axis);
          var p2 = b.project(axis);

          if (!p1.overlap(p2))
            return false; //if they don't overlap, then there's no collision
        }

        for (var i = 0; i < axes2.length; i++) { //loop through axes2
          var axis = axes2[i];
          //project the shapes!
          var p1 = a.project(axis);
          var p2 = b.project(axis);

          if (!p1.overlap(p2))
            return false; //if they don't overlap, then there's no collision
        }

        return true; //all of them overlap, collision
      }
    }
  };
  global.critters = global.critters || mod;
})(this);
var $C = critters;
