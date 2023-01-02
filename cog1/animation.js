/**
 * Assign one or more animation functions to a node.
 * The reference to the scene-graph allows interactions between all nodes.
 *
 * @namespace cog1
 * @module animation
 */
define(["exports", "scene", "scenegraph", "node"], //
function(exports, scene, scenegraph, node) {
    "use strict";

	// Assignments of animations to nodes.
	// Elements a objects containing:
	// node for UI lookup and reference and visibility check,
	// animation function name,
	// animation function reference.
	var assignments = [];

	// 3D-vectors min and max of frustum for xyz-values
	// may be used as boundaries (in local coordinate system).
	var min = [];
	var max = [];

	/**
	 * Initialize animation parameter. 
	 * This should done again on resize to adjust spatial bounds.
	 */
	function init(ctx) {
		var w = ctx.width / 2;
		var h = ctx.height / 2;
		var d = 100;
		min = [-w, -h, -d];
		max = [w, h, d];
	}

	/**
	 * Assign an animation function to a node.
	 * It can be called multiple times on the same node,
	 * thus a node may have more than on animation.
	 * The animation function is stored in the assignments object.
	 *
	 * This should be done in createScene.
	 *
	 * @parameters parameter is an object with parameter that the animation function expects.
	 */
	function assign(node, animationFunctionName, parameter) {
		var animationFunction = this[animationFunctionName](node, parameter);
		var assignment = {
			node : node,
			animationFunctionName : animationFunctionName,
			animationFunction : animationFunction,
		};
		assignments.push(assignment);
		// Set notes with animations to animated as default.
		node.setAnimated(true);
	}

	/**
	 * @returns comma separated list of animations for node.
	 */
	function getAnimationsForNodeByName(nodeName) {
		var animNames = "";
		assignments.forEach(function(element, index, array) {
			if(element.node.name == nodeName) {
				if(animNames != "") {
					animNames += ",";
				}
				animNames += element.animationFunctionName;
			};
		});
		return animNames;
	}

	/**
	 * Perform one animation step for all nodes
	 * by calling all assigned functions.
	 * Reference to the affected node and parameters are
	 * stored in the closure of the animation function.
	 */
	function step() {
		var sceneChanged = false;
		assignments.forEach(function(element, index, array) {
			if(element.node.isVisible() && element.node.isAnimated()) {
				var nodeChanged = element.animationFunction();
				sceneChanged |= nodeChanged;
			}
		});
		if(sceneChanged) {
			scene.setUpToDate();
		}
	}

	/**
	 * Animation function creator that can be assigned to a node.
	 * Local parameters become accessible to the created function
	 * within its closure, thus separately for each node.
	 *
	 * @returns an animation function that in turn returns,
	 * if the node changed and the scene should be updated.
	 *
	 * @parameters parameter is an object with: rotationSpeed:vec3.
	 */
	function rotate(node, parameter) {
		if(parameter) {
			var rotationSpeed = parameter.rotationSpeed;
		}
		if(rotationSpeed == undefined) {
			rotationSpeed = [Math.random(), Math.random(), Math.random()];
			vec3.scale(rotationSpeed, 0.2);
		}
		//console.log("rotate register node " + node.name + " rotationSpeed:" + rotationSpeed);

		return function() {
			// Assume dTime=1.
			node.rotate(rotationSpeed);
			return true;
		}
	}

	/**
	 * See rotate.
	 * 
	 * @parameters parameter is an object with: 3D-speed vector.
	 */
	function move(node, parameter) {

		// BEGIN exercise Move-Animation
		
		return function() {

			return true;
		}
		// END exercise Move-Animation
	}


	// Public API.
	exports.init = init;
	exports.assign = assign;
	exports.step = step;
	exports.getAnimationsForNodeByName = getAnimationsForNodeByName;
	// Animation functions.
	exports.move = move;
	exports.rotate = rotate;
});
