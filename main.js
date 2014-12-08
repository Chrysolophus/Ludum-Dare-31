(function(canvas, resource) {
	
	//
	// Globals
	//
	
	var cx = canvas.getContext("2d");
	var W = canvas.width;
	var H = canvas.height;
	var G = 20;
	var G_FALLOFF = 5;
	var MAX_SPEED = 40;
	var mode;
	
	var xTouch = null;
	var yTouch = null;
	var touchID = null;
	
	var objects = [];
	var well;
	
	function rand(max) {
		return Math.random() * max;
	}
	
	//
	// Objects
	//
	
	function PhysicsObject(sprite, scale) {
		this.x = 0;
		this.y = 0;
		this.vx = 0;
		this.vy = 0;
		this.angle = 0;
		this.thrust = 0;
		this.scale = scale;	
		this.img = sprite;
	};
	PhysicsObject.prototype.tick = function(timeScale) {
		// AI
		if(this.think) {
			this.think(timeScale);
		}
		
		// apply thrust

		this.vx += this.thrust * Math.cos(this.angle) * timeScale;
		this.vy += this.thrust * Math.sin(this.angle) * timeScale;
		
		// apply gravity
		if(xTouch) {
			// calc. normalized gravity direction
			var dx = xTouch - this.x;
			var dy = yTouch - this.y;
			var dist = Math.sqrt(dx*dx + dy*dy);
			dx /= dist;
			dy /= dist;
			
			// apply
			var force = G * G_FALLOFF/dist;
			
			this.vx += dx * force;
			this.vy += dy * force;
		}
		
		// ensure that velocity is ceilinged at MAX_SPEED

		var speed = Math.sqrt((this.vx * this.vx) + (this.vy * this.vy));
		if (speed > MAX_SPEED) {
			this.vx = this.vx * (MAX_SPEED / speed);
			this.vy = this.vy * (MAX_SPEED / speed);
		}

		// apply velocity
		this.x += this.vx * timeScale;
		this.y += this.vy * timeScale;
		
		// wrap to bounds
		if(this.x > W) this.x = this.x % W;
		if(this.y > H) this.y = this.y % H;
		if(this.x < 0) this.x = (this.x % W) + W;
		if(this.y < 0) this.y = (this.y % H) + H;

		var tau = 2 * Math.PI;
		if(this.angle < 0) this.angle = (this.angle % tau) + tau;
		if(this.angle > tau) this.angle = this.angle % tau;

		//this.debug();
		//console.log(timeScale);
	};
	PhysicsObject.prototype.drawAt = function(x, y) {
		cx.save();
			cx.translate(x, y);
			cx.rotate(this.angle);
			cx.drawImage(this.img, -this.scale/2, -this.scale/2, this.scale, this.scale);
		cx.restore();
	};
	PhysicsObject.prototype.draw = function() {
		// draw copies to make wrapping look nice
		var xSign = (this.x > W/2) ? -1 : 1;
		var ySign = (this.y > H/2) ? -1 : 1;
		
		this.drawAt(this.x, this.y);
		this.drawAt(this.x + W * xSign, this.y);
		this.drawAt(this.x, this.y + H * ySign);
		this.drawAt(this.x + W * xSign, this.y + H * ySign);
		
	};
	PhysicsObject.prototype.die = function() {
		// hook
	};
	PhysicsObject.prototype.debug = function() {
		console.log(this.x, this.y, this.vx);
	};
	
	function spawnAsteroid(x, y) {
		var asteroid = new PhysicsObject(resource.asteroid, 100);
		
		asteroid.x = x;
		asteroid.y = y;
		asteroid.angle = rand(Math.PI * 2);
		asteroid.vx = Math.cos(asteroid.angle) * 100;
		asteroid.vy = Math.sin(asteroid.angle) * 100;
		
		asteroid.isAsteroid = true;
		
		objects.push(asteroid);
	};
	
	function spawnShip(x, y, sprite, ai) {
		var ship = new PhysicsObject(sprite, 50);
		
		ship.x = x;
		ship.y = y;
		ship.angle = rand(Math.PI * 2);
		ship.vx = 0;
		ship.vy = 0;
		ship.think = ai;
		
		ship.isShip = true;
		
		objects.push(ship);
	}

	function spawnBullet(x, y, angle) {
	}
	
	//
	// Collision Logic
	//
	
	function handleCollide(a, b) {
		if(a.isShip) {
			if(b.isAsteroid) {
				a.dead = true;
				a.die();
				return true;
			}
		}
		return false;
	}
	
	function remove(i) {
		objects[i] = objects[objects.length - 1];
		objects.length--;
	}
	
	function checkHits() {
		for(var i = 0; i < objects.length; i++) {
			for(var j = 0; j < objects.length; j++) {
				if(i == j) continue;
				
				var dx = objects[i].x - objects[j].x;
				var dy = objects[i].y - objects[j].y;
				
				var dist = Math.sqrt(dx*dx + dy*dy);
				var sizeSum = objects[i].scale + objects[j].scale;
				sizeSum /= 3; // 2 is more "correct", but 3 looks more intuitive.
				
				if(dist < sizeSum) {
					var removeFirst = handleCollide(objects[i], objects[j]);
					var removeSecond = handleCollide(objects[j], objects[i]);
					
					if(removeFirst) {
						remove(i--);
					}
					if(removeSecond) {
						remove(j--);
					}
				}
			}
		}
	}
	
	//
	// Input Listeners
	//
	
	canvas.addEventListener("mousedown", function(e) {
		xTouch = e.offsetX;
		yTouch = e.offsetY;
		e.preventDefault();
		//console.log(xTouch, yTouch);
	});
	window.addEventListener("mouseup", function(e) {
		xTouch = null;
		yTouch = null;
		touchID = null;
	});
	canvas.addEventListener("touchstart", function(e) {
		xTouch = e.changedTouches[0].pageX - canvas.pageX;
		yTouch = e.changedTouches[0].pageY - canvas.pageY;
		touchID = e.changedTouches[0].identifier;
		e.preventDefault();
		//console.log(xTouch, yTouch);
	});
	canvas.addEventListener("touchend", function(e) {
		for(var i = 0; i < e.changedTouches.length; i++) {
			if(touchID == e.changedTouches[i].identifier) {
				xTouch = null;
				yTouch = null;
				touchID = null;
			}
		}
		e.preventDefault();
	});
	
	
	//
	// Main Loop
	//
	
	function gameLoop(rate) {
		
		// physics
		for(var i = 0; i < objects.length; i++) {
			objects[i].tick(rate);
		}
		
		checkHits();
		
		// render
		cx.fillStyle = "#000000";
		cx.fillRect(0,0, W,H);
		
		if(xTouch) {
			well.x = xTouch;
			well.y = yTouch;
			well.draw();
		}
		
		for(var i = 0; i < objects.length; i++) {
			objects[i].draw();
		}
		
	}

	// Stages
	function clearWorld() {
		objects.length = 0;
	}
	
	function level1() {
		clearWorld();
		
		spawnAsteroid(100, 100);
		spawnAsteroid(300, 200);
		spawnAsteroid(400, 50);

		function dummy(timeScale) {
			this.angle += Math.PI / 2 * timeScale;
			this.thrust = 50;
		};

		
		function shipAI(timeScale) {
			
			// Find the nearest object
			
			var nearestRock;
			var nearestDist = 1000000;

			for(var i = 0; i < objects.length; i++) {
                        if (objects[i].isAsteroid) {
				var dist = 0;
				dist += (objects[0].x - this.x) * (objects[0].x - this.x);
				dist += (objects[0].y - this.y) * (objects[0].y - this.y);
				dist = Math.sqrt(dist);
				if (dist < nearestDist) {
					nearestDist = dist;
					nearestRock = objects[0];
					}
				}
                	}

			// Turn towards it

			var turnAngle = Math.PI / 2 * timeScale;
			
			var del_x = nearestRock.x - this.x;
			var del_y = nearestRock.y - this.y;

			var targetAngle = Math.atan2(del_y, del_x);

			console.log("***");
			console.log(turnAngle);
			console.log(this.angle);
			console.log(targetAngle);

			if ((targetAngle - this.angle) > 0) {
				this.angle = targetAngle; // += Math.min((targetAngle - this.angle), turnAngle);
			} else {
				this.angle = targetAngle; //-= Math.max((targetAngle - this.angle), (turnAngle * -1));
			}

			// Back away from the closest asteroid

			//this.thrust = -50;

			// Fire a bullet
		};
		spawnShip(200, 200, resource.ship, shipAI);
		
		mode = gameLoop;
	}

	// Init
	level1();
	
	well = new PhysicsObject(resource.spiral, 25);
	
	var clockrate = 1000/60;
	window.setInterval(function() {
		mode(clockrate/1000);
	}, clockrate);
	
})(document.getElementById("theCanvas"), {
ship: document.getElementById("ship"),
ship2: document.getElementById("ship2"),
ship3: document.getElementById("ship3"),
bullet: document.getElementById("bullet"),
asteroid: document.getElementById("asteroid"),
spiral: document.getElementById("spiral")
});
