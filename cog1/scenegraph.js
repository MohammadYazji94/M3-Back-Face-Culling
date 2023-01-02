/**
 * The scene-graph with nodes.
 * @namespace cog1
 * @module scene
 */
define(["exports", "dojo", "scene", "model", "node", "shader"], //
function(exports, dojo, scene, model, node, shader) {
    "use strict";

	// Contains the scene-graph, a tree of
	// nodes (a model with a transform) in the scene.
	var nodes = new Array();

	// Node controlled by the UI.
	var interactiveNodename;
	var interactiveNode;

	// Node to visualize the point light.
	// If not set this is done with a 2D marker in scene.js.
	var pointLightNode = null;

	/**
	 * 	Create scene-graph (tree).
	 */
	function init(triangulateDataOnInit, cleanDataOnInit) {
		//console.log("scenegraph.init()");
		model.init(triangulateDataOnInit, cleanDataOnInit);
	}

	/**
	 * Create a node with model and given model data.
	 *
	 * @parameter name is the name of the node
	 * @parameter modelData is name of model-module in modelData directory.
	 * @parameter parameters are passed to the model
	 * @parameter parent node is optional
	 * @parameter isLightNode is false per default, if true the spot light is attache to this node.
	 *
	 * @returns node
	 */
	function createNodeWithModel(name, modeldata, parameter, parent, isLightNode) {
		var newModle = model.create(modeldata, parameter);
		//console.log(newModle);
		var newNode = node.create(name, newModle, parent, isLightNode);
		//console.log(newNode);
		nodes.push(newNode);

		// Take this node (the first one as default) as the interactive one.
		if(!interactiveNode) {
			//console.log("Interactive Node as default, take: "+name);
			setInteractiveNodeByName(name);
		}

		// Return node for initial transformations in createScene.
		return newNode;
	}

	/**
	 * Chose an interactive node that is visible,
	 * if this is not the case.
	 */
	function setInteractiveNodeToFirstVisibleNode() {
		if(interactiveNode.isVisible()) {
			return;
		}

		// Find first visible node.
		for(var n = 0; n < nodes.length; n++) {
			var newInteractiveNode = nodes[n];
			if(newInteractiveNode.isVisible()) {
				break;
			}
		}
		//console.log("New interactive Node, take: "+newInteractiveNode.name);
		setInteractiveNode(newInteractiveNode);
	}


	/**
	 * @parameters node sets a Nodes to visualize the light.
	 * @returns node
	 */
	function createPointLightNode(name, modeldata, parameter, parent) {
		pointLightNode = createNodeWithModel(name, modeldata, parameter, parent, true);
		// The node may be selected as interactive, but visible does not
		// make much sense as there is also a 2D marker for the light.
		pointLightNode.setVisible(false);
		return pointLightNode;
	}

	/**
	 * Interface function for setLights in shader.
	 * Used in createScene and by UI.
	 *
	 */
	function setLights(ambientLI, pointLI, pointPos, specularLI, specularLIExpo) {

		// Store values also in the shader for speed-up.
		shader.setLights(ambientLI, pointLI, pointPos, specularLI, specularLIExpo);

		if(pointLightNode) {
			pointLightNode.translate(shader.getLightPosition(), true);
		} else {
			// The scene will render a 2D marker for the light.
		}
	}

	/**
	 * 	Access to the nodes in the scene-graph.
	 */
	function getNodes() {
		return nodes;
	}

	/**
	 * Used in the UI.
	 *
	 *  @returns array of node names of all nodes in the scene-graph.
	 */
	function getNodeNames() {
		var names = [];
		for(var n in nodes) {
			names.push(nodes[n].name);
		}
		return names;
	}

	function getNodeByName(name) {
		for(var n in nodes) {
			if(nodes[n].name == name) {
				return nodes[n];
			}
		}
		console.error("Error: node not found in scenegraph: " + name);
		return null;
	}

	/**
	 * @ returns first node in the list, normally the root of a node-tree.
	 */
	function getRootNode() {
		if(nodes[0] != undefined) {
			return nodes[0];
		} else {
			console.log("No Root node found in scenegraph");
			return null;
		}
	}

	function getPointLightNode() {
		return pointLightNode;
	}

	function getInteractiveNodename() {
		return interactiveNodename;
	}

	/**
	 * If not set explicitly in createScene take the first one added.
	 */
	function getInteractiveNode() {
		if(!interactiveNode) {
			interactiveNode = scenegraph.getRootNode();
		}
		return interactiveNode;
	}

	/**
	 * Called from scene during rendering
	 * to show debug information (matrices).
	 *
	 * @returns true if index belongs to the interactive node.
	 */
	function isInteractiveNode(index) {
		if(nodes[index] == interactiveNode) {
			return true;
		}
		return false;
	}

	/**
	 * Set which node is interactive, there can only be one.
	 */
	function setInteractiveNode(node) {
		interactiveNode = node;
		interactiveNodename = node.name;
	}

	/**
	 * See setInteractiveNode.
	 */
	function setInteractiveNodeByName(nodeName) {
		interactiveNodename = nodeName;
		interactiveNode = getNodeByName(nodeName);
		if(!interactiveNode) {
			console.error("No interactive Node: " + nodeName)
		} else {
			//console.log("Set interactive Node: "+nodeName)
		}
	}

	/**
	 * Set a node visible or invisible.
	 */
	function setNodeVisibleByName(name, visible) {
		getNodeByName(name).setVisible(visible);
	}

	function isNodeVisibleByName(name) {
		return getNodeByName(name).isVisible();
	}

	/**
	 * Activate the animation (which is must be run as well to see it).
	 */
	function setNodeAnimatedByName(name, visible) {
		getNodeByName(name).setAnimated(visible);
	}

	function isNodeAnimatedByName(name) {
		return getNodeByName(name).isAnimated();
	}

	/**
	 * @returns name or false if there is no parent.
	 */
	function getParentNameOfNodeByName(name) {
		var parent = getNodeByName(name).parent;
		if(!parent) {
			return false;
		}
		return parent.name;
	}
	
	/**
	 * @returns texture URL which is the empty string if on specified in createScene.
	 */
	 function getTextureNameForNode(node) {
		var texture =  node.getTexture();
		if(!texture) {
			return "";
		}
		return texture.textureURL;		
	}

	/**
	 * Call toggleTriangulation on all nodes.
	 */
	function toggleTriangulation() {
		for(var n in nodes) {
			nodes[n].toggleTriangulation();
		}
	}

	// Public API.
	exports.init = init;
	// Interface to createScene for geometry.
	exports.createNodeWithModel = createNodeWithModel;
	exports.createPointLightNode = createPointLightNode;
	// Lights
	exports.setLights = setLights;
	// Notes setter
	exports.setNodeVisibleByName = setNodeVisibleByName;
	exports.isNodeVisibleByName = isNodeVisibleByName;
	// Animation of nodes
	exports.setNodeAnimatedByName = setNodeAnimatedByName;
	exports.isNodeAnimatedByName = isNodeAnimatedByName;
	// Nodes getter
	exports.getNodes = getNodes;
	exports.getNodeNames = getNodeNames;
	exports.getNodeByName = getNodeByName;
	exports.getRootNode = getRootNode;
	exports.getPointLightNode = getPointLightNode;
	exports.getParentNameOfNodeByName = getParentNameOfNodeByName;
	exports.getTextureNameForNode = getTextureNameForNode;
	// Interactive Node.
	exports.getInteractiveNode = getInteractiveNode;
	exports.getInteractiveNodename = getInteractiveNodename;
	exports.setInteractiveNode = setInteractiveNode;
	exports.setInteractiveNodeByName = setInteractiveNodeByName;
	exports.isInteractiveNode = isInteractiveNode;
	exports.setInteractiveNodeToFirstVisibleNode = setInteractiveNodeToFirstVisibleNode;
	// Geometry.
	exports.toggleTriangulation = toggleTriangulation;
});
