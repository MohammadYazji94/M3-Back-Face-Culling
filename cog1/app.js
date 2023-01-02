/**
 * The application controller
 * @namespace cog1
 * @module app
 */
define(["exports", "layout", "ui", "scene", "animation"], //
function(exports, layout, ui, scene, animation) {
    "use strict";

	// Animation loop is running Continuously and scene is rendered continuously.
	// This is set true for animations.
	var runAnimation = false;
	// A frame is being rendered, and we ignore requests, e.g., from the UI.
	var busyRendering = false;

	// The initialization process must finish before we can start the rendering loop.
	// But it should also not be called two times, thus to be sure.
	var initDone = false;

	/**
	 * This is the entry point.
	 * Load all external resources,
	 * then initialize own modules.
	 * Optionally create or augment the HTML-page.
	 * Finally start to rendering an animation loop.
	 */
	function load() {
		init();
		// Proceed directly to startup of the loop.
		start();
	}

	/**
	 * Initialize all modules from here.
	 */
	function init() {
		//console.log("app.init()");

		if(initDone) {
			//console.log("initialization already done.");
			return;
		}

		// Create the scene.
		scene.init();

		// Initialize HTML layout and from there the GUI/UI with interaction.
		// After layout is done the canvas exists in its final size.
		layout.init(resizeCbk);

		// Initialize context within the canvas.
		// Initialize rendering modules, raster and shader.
		// This must be done after layout to have the final size of the canvas.
		scene.initPipeline();

		initDone = true;
	}

	/**
	 * Called from the canvas ContentPane after resize.
	 */
	function resizeCbk() {
		// Initialize should be through once.
		if(!initDone) {
			return;
		}

		// A clean new initialize with new canvas size.
		//console.log("app resizeCbk initialize pipeline with new size");
		scene.initPipeline();

		// Initialize UI with new canvas size, among other things for slider ranges.
		var ctx = scene.getCtx();
		ui.postSceneInit(ctx.width, ctx.height);

		// This does not work when the resize occurs during rendering.
		scene.setUpToDate(false);
	}

	/**
	 * Start the animation and interaction in the scene/on the canvas.
	 * @ parameter _runAnimation determines if loop should run and animate continuously.
	 * @ returns true if loop has been started.
	 */
	function start(_runAnimation) {

		if(runAnimation && _runAnimation) {
			//console.log("Animation loop is already running continuously.");
			return true;
		}
		// Leave parameter as is if undefined.
		if(_runAnimation != undefined) {
			runAnimation = _runAnimation;
		}

		animLoop();
		return true;
	}

	/**
	 * Toggle the animation of the scene.
	 */
	function toggleRunAnimation() {
		var _runAnimation = ! runAnimation;
		start(_runAnimation);
	}

	function getRunAnimation() {
		return runAnimation;
	}

	/**
	 * @returns a setTimeout function that stops when browser-tab is not visible.
	 */
	var requestAnimFrame = (function() {
		return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
		function(/* function */callback, /* DOMElement */element) {
			// Try for 24 frames per second as fall-back.
			window.setTimeout(callback, 1000 / 24);
		};

	})();

	/*
	 * The animation loop is only run when something
	 * changed in the scene.
	 * The scene is dirty (changed) as long as not all
	 * modules have finish loading their required data.
	 * We do not use the finished loading callback, because
	 * the do not want to track how many modes load.
	 * Instead we try continuously until the scene is clean.
	 */
	function animLoop() {
		//console.log("animLoop...");

		if(busyRendering) {
			// Skip a frame and wait, if rendering is too slow.
			//console.log("Skip a frame");
			return;
		} else {
			busyRendering = true;
		}

		// Scene.render returns if it is up to date.
		var sceneIsUpToDate = scene.render();

		if(sceneIsUpToDate) {
			ui.update();
		}

		// Perform animations on nodes.
		// Animations set the scene to not up-to-date.
		if(runAnimation){
			animation.step();
		}
		
		// Restart render loop.
		if(!sceneIsUpToDate || runAnimation) {
			requestAnimFrame(animLoop);
			//console.log("requestAnimFrame");
		}
				
		busyRendering = false;
		//console.log("animLoop done.");
	}

	/**
	 * Called on changes in the scene only by the scene.
	 * This does not set the update status of the scene.
	 * To update the scene use scene.setUpToDate().
	 */
	function requestUpdate() {
		// This may have been called by some paranoid UI-element,
		// though the scene may be up-to-date.
		if(busyRendering || runAnimation) {
			//console.log("Animation loop busy rendering.");
			return;
		}
		if(!initDone) {
			//console.log("Animation loop but initialize is not done.");
			return;
		}
		start();
	}

	// Public API.
	exports.load = load;
	exports.stop = stop;
	exports.start = start;
	exports.requestUpdate = requestUpdate;
	exports.toggleRunAnimation = toggleRunAnimation;
	exports.getRunAnimation = getRunAnimation;
});
