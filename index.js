(function (global) {
  var moduleExports = {
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

          if (obj.type == 'polygon') {
            if (obj.typetemp == 'rectangle') obj.points = [new moduleExports.Vector(0, 0), new moduleExports.Vector(obj.width, 0), new moduleExports.Vector(obj.width, obj.height), new moduleExports.Vector(0, obj.height)];
            obj.edges = [];
            var oblen = obj.points.length;
            for (var i = 0; i < oblen; i++) {
              obj.edges[i] = new moduleExports.Line(obj.points[i % oblen], obj.points[(i + 1) % (oblen)]);
            }

            that.context.translate((obj.x - that.cam.x) * that.cam.zoom, (obj.y - that.cam.y) * that.cam.zoom);
            that.context.rotate(obj.rotation * Math.PI / 180);
            that.context.moveTo(obj.points[0].x, obj.points[0].y);
            obj.points.forEach(a => that.context.lineTo(a.x, a.y));
            that.context.closePath();
            that.context.fill();

          } else if (obj.type == 'circle') {

            that.context.translate((obj.x - that.cam.x) * that.cam.zoom, (obj.y - that.cam.y) * that.cam.zoom);
            that.context.rotate(obj.rotation * Math.PI / 180);

            that.context.arc(0, 0, obj.radius * that.cam.zoom, 0, Math.PI * 2);
            that.context.fill();

          }

          that.context.restore();

        });
      };
      this.frame = function () {
        if (that.paused) return;
        that.update();
        that.mainUpdate();
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
      static sum(...vectors) {
        var x = 0;
        var y = 0;
        vectors.forEach(function (vector) {
          x += vector.x;
          y += vector.y;
        });
        return new Vector(x, y);
      }
      add(vector) {
        return moduleExports.Vector.sum(this, vector);
      }
    },
    //Line constructor
    Line: class Line {
      constructor(start, end) {
        this.start = start || new moduleExports.Vector;
        this.end = end || new moduleExports.Vector;
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
      dist() {
        return 'hi';//(this.start.)
      }
      slope() {
        return -(this.start.y - this.end.y) / (this.start.x - this.end.x);
      }
      angle() {
        return Math.atan(this.slope()) * (180 / Math.PI);
      }
      add(line) {
        var result = JSON.parse(JSON.stringify(this));
        result.start.x += line.start.x;
        result.start.y += line.start.y;
        result.end.x += line.end.x;
        result.end.y += line.end.y;
        return result;
      }
    },
    //Polygon constructor
    Polygon: class Polygon {
      constructor(name, x, y, points, color, mass, customprops) {
        this.name = name;
        this.x = x;
        this.y = y;
        this.type = 'polygon';
        this.points = points;
        this.edges = [];
        this.rotation = 0;
        this.color = color;
        this.mass = mass || 1;
        this.outlineColor = "transparent";
        this.outlineWidth = 1;
        for (var customprop in customprops) {
          this[customprop] = customprops[customprop];
        }
      }
    },
    Rectangle: class Rectangle {
      constructor(name, x, y, width, height, color, mass) {
        var poly = new moduleExports.Polygon(name, x, y, [
          new moduleExports.Vector(0, 0), new moduleExports.Vector(width, 0), new moduleExports.Vector(width, height), new moduleExports.Vector(0, height)
        ], color, mass);
        for (var prop in poly) this[prop] = poly[prop];
        this.typetemp = 'rectangle';
        this.width = width;
        this.height = height;
      }
    },
    Circle: class Circle {
      constructor(name, x, y, radius, color, mass) {
        this.name = name;
        this.x = x;
        this.y = y;
        this.type = 'circle';
        this.radius = radius;
        this.color = color;
        this.mass = mass;
      }
    },
    Collision: function (a, b) {
      if (a.type == 'polygon' && b.type == 'polygon') {
        function pointinpolygon(point, vs) {
          var x = point.x, y = point.y;
          var inside = false;
          for (var i = 0, j = vs.points.length - 1; i < vs.points.length; j = i++) {
            var xi = vs.points[i].x + vs.x, yi = vs.points[i].y + vs.y;
            var xj = vs.points[j].x + vs.x, yj = vs.points[j].y + vs.y;
            var intersect = ((yi > y) != (yj > y))
              && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
          }
          return inside;
        };
        var colliding = false;
        a.points.forEach(pnt => {
          if (pointinpolygon(pnt.add({ x: a.x, y: a.y }), b)) { colliding = true; }
        });
        if (colliding) return true;
        b.points.forEach(pnt => {
          if (pointinpolygon(pnt.add({ x: b.x, y: b.y }), a)) { colliding = true; }
        });
        if (colliding) return true;
        return false;
      }
      if (a.type == 'circle' && b.type == 'polygon') {
        function pointinpolygon(point, vs) {
          var x = point.x, y = point.y;
          var inside = false;
          for (var i = 0, j = vs.points.length - 1; i < vs.points.length; j = i++) {
            var xi = vs.points[i].x + vs.x, yi = vs.points[i].y + vs.y;
            var xj = vs.points[j].x + vs.x, yj = vs.points[j].y + vs.y;
            var intersect = ((yi > y) != (yj > y))
              && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
          }
          return inside;
        };
        function lineCircle(line, circle) {
          var A = line.start;
          var B = line.end;
          var C = {x: circle.x, y: circle.y};
          var radius = circle.radius;
          var dist;
          const v1x = B.x - A.x;
          const v1y = B.y - A.y;
          const v2x = C.x - A.x;
          const v2y = C.y - A.y;
          const u = (v2x * v1x + v2y * v1y) / (v1y * v1y + v1x * v1x);
          if(u >= 0 && u <= 1){
              dist  = (A.x + v1x * u - C.x) ** 2 + (A.y + v1y * u - C.y) ** 2;
          } else {
              dist = u < 0 ? (A.x - C.x) ** 2 + (A.y - C.y) ** 2 : (B.x - C.x) ** 2 + (B.y - C.y) ** 2;
          }
          return dist < radius ** 2;
        }
        if (pointinpolygon({x:a.x, y:a.y}, b)) return true;
        for (var i = 0; i < b.edges.length; i++) {
          if (lineCircle(b.edges[i].add({start:{x:b.x, y:b.y}, end:{x:b.x, y:b.y}}), a)) return true;
        };
        return false;
      }
      if (a.type == 'polygon' && b.type == 'circle') {
        function pointinpolygon(point, vs) {
          var x = point.x, y = point.y;
          var inside = false;
          for (var i = 0, j = vs.points.length - 1; i < vs.points.length; j = i++) {
            var xi = vs.points[i].x + vs.x, yi = vs.points[i].y + vs.y;
            var xj = vs.points[j].x + vs.x, yj = vs.points[j].y + vs.y;
            var intersect = ((yi > y) != (yj > y))
              && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
          }
          return inside;
        };
        function lineCircle(line, circle) {
          var A = line.start;
          var B = line.end;
          var C = {x: circle.x, y: circle.y};
          var radius = circle.radius;
          var dist;
          const v1x = B.x - A.x;
          const v1y = B.y - A.y;
          const v2x = C.x - A.x;
          const v2y = C.y - A.y;
          const u = (v2x * v1x + v2y * v1y) / (v1y * v1y + v1x * v1x);
          if(u >= 0 && u <= 1){
              dist  = (A.x + v1x * u - C.x) ** 2 + (A.y + v1y * u - C.y) ** 2;
          } else {
              dist = u < 0 ? (A.x - C.x) ** 2 + (A.y - C.y) ** 2 : (B.x - C.x) ** 2 + (B.y - C.y) ** 2;
          }
          return dist < radius ** 2;
        }
        if (pointinpolygon({x:b.x, y:b.y}, a)) return true;
        for (var i = 0; i < a.edges.length; i++) {
          if (lineCircle(a.edges[i].add({start:{x:a.x, y:a.y}, end:{x:a.x, y:a.y}}), b)) return true;
        };
        return false;
      }
      if (a.type == 'circle' && b.type == 'circle') {
        return ((a.x - b.x) ** 2 + (a.y - b.y) ** 2) ** 0.5 < a.radius + b.radius;
      }
    }
  };
  global.critters = global.critters || moduleExports;
})(this);
var $C = critters;
