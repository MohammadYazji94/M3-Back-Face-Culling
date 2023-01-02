/**
 * Populate the scene-graph with nodes,
 * calling methods form the scene-graph and node modules.
 *
 * Texture files have to exist in the "textures" sub-directory.
 *
 * @namespace cog1
 * @module createScene
 */
define(["exports", "scenegraph", "animation"], //
function(exports, scenegraph, animation) {
    "use strict";

	/**
	 * 	Call methods form the scene-graph (tree) module to create the scene.
	 *
	 */
	function init() {
		/**var insideOutPolyNode = scenegraph.createNodeWithModel("insideOutPoly", "insideOutPoly");**/

		var cubeNode = scenegraph.createNodeWithModel("cube", "cube", {scale:200});
		cubeNode.rotateTo([0.5, 1, 0]);

		// BEGIN exercise myModel
		/**var cubeNode = scenegraph.createNodeWithModel("myModel", "myModel", {scale:300});
		cubeNode.rotateTo([0.2, -0.2, 0]);**/
		// END exercise myModel

		return;

		//var cubeNode = scenegraph.createNodeWithModel("cube", "cube", {scale:100, textureURL:"brickWall.jpg"});
		var cubeNode1 = scenegraph.createNodeWithModel("cube 1", "cube", {scale:70, textureURL:"stoneWall.jpg"});
		cubeNode1.translate([50,200,0]);
		//cubeNode1.rotate([1,1,1]);
		var cubeNode2 = scenegraph.createNodeWithModel("cube 2", "cube", {scale:50, textureURL:"uvTest.jpg"});
		cubeNode2.translate([-100,-400,0]);
		//cubeNode2.rotate([-1,-1,-1]);
		var cubeNode3 = scenegraph.createNodeWithModel("cube procedural texture", "cube", {scale:50, textureURL:"sampleProceduralRGB"});
		var cubeNode4 = scenegraph.createNodeWithModel("cube six faces texture", "cube", {scale:200, textureURL:"OrbitCube.gif", sixFacesTexture:true});
		var cubeNode5 = scenegraph.createNodeWithModel("cube 3x3 texture", "cube", {scale:50, textureURL:"cubeColor.png", sixFacesTexture:true});
		var cubeNode6 = scenegraph.createNodeWithModel("cube Escher texture", "cube", {scale:200, textureURL:"EscherCubeFish.gif", sixFacesTexture:true});

		var insideOutPolyNode = scenegraph.createNodeWithModel("insideOutPoly", "insideOutPoly");

		var diamondNode = scenegraph.createNodeWithModel("diamond", "diamond");

		var torusNode = scenegraph.createNodeWithModel("torus", "torus");
		var torusNode1 = scenegraph.createNodeWithModel("torus 13", "torus", {r2:50,n2:13,color:8});

		var teapotNode = scenegraph.createNodeWithModel("teapot", "teapot", {color:0, scale:40});
		var dirtyTeapotNode = scenegraph.createNodeWithModel("dirtyTeapot", "teapot_dirty", {color:8});
		//teapotNode.rotate([1,1,1]);

		var waltheadNode = scenegraph.createNodeWithModel("walthead", "walthead", {color:8});

		var plainNode1 = scenegraph.createNodeWithModel("plain", "plain", {scale:200, color:9, textureURL:"land_ocean_ice_2048.jpg"});

		var emptyNode1 = scenegraph.createNodeWithModel("empty", "empty");


        // BEGIN exercise Scenegraph

		// Set parent-child relationships for scene-graph nodes.

        // END exercise Scenegraph

        // Assign animations.
        // animation.assign(cubeNode, "move");
        // animation.assign(cubeNode1, "move");
        // animation.assign(cubeNode2, "rotate");

        // BEGIN exercise Rotating-Planet-Animation

        // Mind the the order of transformation types get mixed up
        // then traversing the hierarchy in the scene-graph.
        //
        // Animation of a Planet with an also rotation moon or a ring.
        // The planet rotates around an small sun.

        // END exercise Rotating-Planet-Animation


		// Set visibility of nodes (hide: set to false).
		// Comment out what you want to see as the default is visible.
        // cubeNode.setVisible(false);
        cubeNode1.setVisible(false);
        cubeNode2.setVisible(false);
        cubeNode3.setVisible(false);
        cubeNode4.setVisible(false);
        cubeNode5.setVisible(false);
        cubeNode6.setVisible(false);
        insideOutPolyNode.setVisible(false);
        diamondNode.setVisible(false);
        torusNode.setVisible(false);
        torusNode1.setVisible(false);
        teapotNode.setVisible(false);
        dirtyTeapotNode.setVisible(false);
        waltheadNode.setVisible(false);
        plainNode1.setVisible(false);
        emptyNode1.setVisible(false);


		// Set the initially interactive node [by name].
		// If not set, it is the first node created.
		//scenegraph.setInteractiveNodeByName("sphere");
		//scenegraph.setInteractiveNode(torusNode);

		// Create a node for the light, which is not visible by default.
		var lightnode = scenegraph.createPointLightNode("light", "diamond");

		// Set light parameter.
		// ambientLI, pointLI, pointPos, specularLI, specularLIExpo
		scenegraph.setLights(0.5, 0.6, [200, 200, 300], 4.0, 10);
	}

	// Public API.
	exports.init = init;
});
