(function(tags, resource) {
	
	//
	// Globals
	//
	
	var canvas = tags.canvas;
	var wrapper = tags.wrapper;
	var text = tags.text;
	
	var cx = canvas.getContext("2d");
	var W = canvas.width;
	var H = canvas.height;
	var G = 30;
	var G_FALLOFF = 3;
	var MAX_SPEED = 75;
	var mode, messageAction;
	
	var tau = Math.PI * 2;
	
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
		this.gScale = 1;
	};
	PhysicsObject.prototype.tick = function(timeScale) {
		// AI
		if(this.think) {
			this.think(timeScale);
		}
	
		// apply thrust
		
		this.vx += this.thrust * Math.sin(this.angle) * timeScale;
		this.vy += this.thrust * Math.cos(this.angle) * timeScale;
		

		// apply gravity
		if(xTouch) {
			// calc. normalized gravity direction
			var dx = xTouch - this.x;
			var dy = yTouch - this.y;
			var dist = Math.sqrt(dx*dx + dy*dy);
			dx /= dist;
			dy /= dist;
			
			// apply
			var force = this.gScale * G * G_FALLOFF/dist;
			
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
		var asteroid = new PhysicsObject(resource.asteroid, 50);
		
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
		ship.gScale = 0;
	
		ship.cooldown = 0;
	
		ship.isShip = true;
		
		objects.push(ship);
		
		return ship;
	}

	function bulletThink(rate) {
		this.lifespan -= rate;
		if(this.lifespan <= 0) {
			this.dead = true;
		}
	}

	function spawnBullet(x, y, sprite, angle) {
		var bullet = new PhysicsObject(sprite, 50);
		bullet.x = x;
		bullet.y = y;
		bullet.angle = angle;
		bullet.vx = 75 * Math.sin(angle);
		bullet.vy = 75 * Math.cos(angle);
		bullet.think = bulletThink;
		bullet.gScale = 0;

		bullet.isBullet = true;

		bullet.lifespan = 3.5;

		objects.push(bullet);
	}
	
	//
	// Collision Logic
	//
	
	function handleCollide(a, b) {
		if(a.isShip) {
			if(b.isAsteroid) {
				a.dead = true;
			}
		}
		if (a.isBullet) {
			if(b.isAsteroid) {
				a.dead = true;
				b.dead = true;
			}
		}
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
					
				}
			}
		}
	}
	
	function reap() {
		for(var i = 0; i < objects.length; i++) {
			if(objects[i].dead) {
				objects[i].die();
				remove(i--);
			}
		}
	}
	
	//
	// Input Listeners
	//
	
	var bounds = wrapper.getBoundingClientRect();
	wrapper.addEventListener("mousedown", function(e) {
		//console.log(e.pageX, wrapper.pageX)
		xTouch = e.clientX - bounds.left;
		yTouch = e.clientY - bounds.top;
		e.preventDefault();
		//console.log(xTouch, yTouch);
	});
	window.addEventListener("mouseup", function(e) {
		xTouch = null;
		yTouch = null;
		touchID = null;
	});
	wrapper.addEventListener("touchstart", function(e) {
		xTouch = e.changedTouches[0].pageX - wrapper.pageX;
		yTouch = e.changedTouches[0].pageY - wrapper.pageY;
		touchID = e.changedTouches[0].identifier;
		e.preventDefault();
		//console.log(xTouch, yTouch);
	});
	window.addEventListener("touchend", function(e) {
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
	
	function render() {
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
	
	var clickReady = false;
	var timeReady = false;
	function messageIdle(rate) {
		if(xTouch && timeReady) {
			clickReady = true;
		} else if(clickReady) {
			text.style.display = "none";
			messageAction();
		}
		
		render();
	}
	
	function showMessage(msg, nextFunc) {
		text.style.display = "block";
		text.innerHTML = msg;
		
		clickReady = false;
		timeReady = false;
		mode = messageIdle;
		
		messageAction = nextFunc || function() {
			mode = gameLoop;
		};
		
		setTimeout(function() {
			timeReady = true;
		}, 1000);
	}
	
	function gameLoop(rate) {
		
		// physics
		for(var i = 0; i < objects.length; i++) {
			objects[i].tick(rate);
		}
		
		checkHits();
		
		reap();
		
		render();
	}

	// Stages
	function clearWorld() {
		objects.length = 0;
	}
	
	function level1() {
		clearWorld();
		
		spawnAsteroid(500, 400);
		spawnAsteroid(300, 200);
		spawnAsteroid(400, 50);

		function dummy(timeScale) {
			this.angle += Math.PI / 2 * timeScale;
			this.thrust = 50;
		};

		
		function shipAI(timeScale) {
			
			var TURN_SPEED = Math.PI * 2;
			
			// Find the nearest object
			
			var nearestRock = null;
			var nearestDist = 1000000;

			for(var i = 0; i < objects.length; i++) {
				if (objects[i].isAsteroid) {
					var dx = objects[i].x - this.x;
					var dy = objects[i].y - this.y;
					var dist = Math.sqrt(dx*dx + dy*dy);
					if (dist < nearestDist) {
						nearestDist = dist;
						nearestRock = objects[i];
					}
				}
			}

			if(nearestRock == null) {
				// game lost
				showMessage(
"<p>You struggled valiantly, but in the end your efforts were for naught. At this point, resistance is futile. You will be assimilated. Or enslaved. Or probed. Or something or other. But you’re definitely broke given that all of your mineable asteroids are now stardust.\
<p>Have a good time.\
<p>GAME OVER", level1);
				return;
			}

			// Turn towards it

			var del_x = nearestRock.x - this.x;
			var del_y = nearestRock.y - this.y;

			var targetAngle = Math.atan2(del_x, -del_y);

			var angleDiff = targetAngle - this.angle;

			if(angleDiff > Math.PI) angleDiff -= tau;
			if(angleDiff < -Math.PI) angleDiff += tau;

			if(angleDiff > 0) {
				this.angle += TURN_SPEED * timeScale;
			} else {
				this.angle -= TURN_SPEED * timeScale;
			}

			// Back away from the closest asteroid

			this.thrust = -50;

			// Fire a bullet
			this.cooldown -= timeScale;

			if (this.cooldown <= 0) {
				this.cooldown = 0.7;
				spawnBullet(this.x, this.y, resource.bullet, this.angle);
			}
		};
		var ship = spawnShip(200, 200, resource.ship, shipAI);
		
		ship.die = function() {
			showMessage(
"<p>After turning the S.S. Triangle into a collection of space junk, you went back to your old life of hollowing out asteroids and eating freeze-dried paste. Who knows? Maybe you can even make some extra credits by sneaking the S.S. Triangle’s debris into your next ore shipment! It seems like you can rest easy for now…\
<p>At least until the next ship comes around, anyways.\
<p>YOU WIN", level1);
		};
		
		showMessage(
"<p>You are an intrepid spacer of the Erehwon Asteroid Fields. Life is pretty good between hollowing out asteroids for their rich ore-y innards and the freeze-dried meals.\
<p>Oh who are we kidding? Life sucks. It’s claustrophobic, the food bites, and you need to put up panels over the windows just to sleep properly at what passes for “night”. And it’s just gotten significantly worse now that the S.S. Triangle has shown up to launch a raid.\
<p>Being types who stand to lose a lot here, it’s time to fight back with what you can… Which would be with some good-old fashioned space rocks and some gravity wells to launch them with.\
<p>Objective: Click to place gravity wells and destroy the S.S. Triangle with your arsenal.");
	}

	// Init
	level1();
	
	well = new PhysicsObject(resource.spiral, 25);
	
	var clockrate = 1000/60;
	window.setInterval(function() {
		mode(clockrate/1000);
	}, clockrate);
	
})({
canvas: document.getElementById("theCanvas"),
wrapper: document.getElementById("gameWrapper"),
text: document.getElementById("gameText")
}, {
ship: document.getElementById("ship"),
ship2: document.getElementById("ship2"),
ship3: document.getElementById("ship3"),
bullet: document.getElementById("bullet"),
asteroid: document.getElementById("asteroid"),
spiral: document.getElementById("spiral")
});
