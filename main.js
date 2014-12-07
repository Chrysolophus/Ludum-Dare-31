(function(canvas, resource) {
	
	//
	// Globals
	//
	
	var cx = canvas.getContext("2d");
	var W = canvas.width;
	var H = canvas.height;
	var mode;
	
	var xTouch = null;
	var yTouch;
	
	var objects = [];
	
	function rand(max) {
		return Math.random() * max;
	}
	
	//
	// Objects
	//
	
	function PhysicsObject(sprite) {
		this.x = 0;
		this.y = 0;
		this.vx = 0;
		this.vy = 0;
		this.angle = 0;
		this.thrust = 0;
		
		this.img = sprite;
	};
	PhysicsObject.prototype.tick = function(timeScale) {
		// AI
		if(this.think) {
			this.think();
		}
		
		// apply thrust
		
		// apply velocity
		this.x += this.vx * timeScale;
		this.y += this.vy * timeScale;
		
		// wrap to bounds
		if(this.x > W) this.x = this.x % W;
		if(this.y > H) this.y = this.y % H;
		if(this.x < 0) this.x = (this.x % W) + W;
		if(this.y < 0) this.y = (this.y % H) + H;

		//this.debug();
		//console.log(timeScale);
	};
	PhysicsObject.prototype.drawAt = function(x, y) {
		cx.save();
			cx.translate(x, y);
			cx.rotate(this.angle);
			cx.drawImage(this.img, -50,-50,100,100);
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
	PhysicsObject.prototype.debug = function() {
		console.log(this.x, this.y, this.vx);
	};
	
	function spawnAsteroid(x, y) {
		var asteroid = new PhysicsObject(resource.asteroid);
		
		asteroid.x = x;
		asteroid.y = y;
		asteroid.angle = rand(Math.PI * 2);
		asteroid.vx = Math.cos(asteroid.angle) * 100;
		asteroid.vy = Math.sin(asteroid.angle) * 100;
		
		objects.push(asteroid);
	};
	
	//
	// Input Listeners
	//
	
	canvas.addEventListener("mousedown", function(e) {
		xTouch = e.offsetX;
		yTouch = e.offsetY;
		e.preventDefault();
		console.log(xTouch, yTouch);
	});
	window.addEventListener("mouseup", function(e) {
		xTouch = null;
		yTouch = null;
	});
	
	//
	// Main Loop
	//
	
	function gameLoop(rate) {
		
		// physics
		for(var i = 0; i < objects.length; i++) {
			objects[i].tick(rate);
		}
		
		// render
		cx.fillStyle = "#000000";
		cx.fillRect(0,0, W,H);
		
		for(var i = 0; i < objects.length; i++) {
			objects[i].draw();
		}
		
	}

	// Init
	mode = gameLoop;
	
	spawnAsteroid(100, 100);
	spawnAsteroid(300, 200);
	spawnAsteroid(400, 50);
	
	var clockrate = 1000/60;
	window.setInterval(function() {
		mode(clockrate/1000);
	}, clockrate);
	
})(document.getElementById("theCanvas"), {
ship: document.getElementById("ship"),
ship2: document.getElementById("ship2"),
ship3: document.getElementById("ship3"),
bullet: document.getElementById("bullet"),
asteroid: document.getElementById("asteroid")
});
