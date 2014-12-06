(function(canvas) {
	
	//
	// Globals
	//
	var cx = canvas.getContext("2d");
	var W = canvas.width;
	var H = canvas.height;
	var mode;
	
	//
	// Input Listeners
	//
	
	canvas.addEventListener("mousedown", function(e) {
	});
	canvas.addEventListener("mouseup", function(e) {
	});
	
	//
	// Main Loop
	//
	
	function gameLoop() {
		
		cx.fillStyle = "#000000";
		cx.fillRect(0,0, W,H);
	}

	// Init
	mode = gameLoop;
	
	window.setInterval(function() {
		mode();
	}, 1000/60);
	
})(document.getElementById("theCanvas"));
