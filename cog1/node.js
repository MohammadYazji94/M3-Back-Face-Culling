/**
 * An node in the scene contains a model (3D-data) and a
 * transform, i.e. translate, rotate, scale vectors for a node in the scene.
 * It can have a parent node.
 * 
 * @namespace cog1
 * @module node
 */
define(["exports", "shader"], function(exports, shader) {
    "use strict";

	/**
	 * Create a node and return an interface object to it.
	 * This interface node is used in the scene-graph.
	 * @ returns node.
	 */
	function create(_name, _model, _parent, _isLightNode, _visible) {
		//console.log("cog1.node.create:" + _model);
		if(!_name || !_model) {
			console.log("Error node.create no name or model");
			return;
		}
		if(_visible == undefined) {
			_visible = true;
		}
		var newNodeObj = {
			//
			// Fields for each object instance.
			//
			// The UI finds nodes by name.
			name : _name,
			// 3D-Model, if null the node may only serve as an empty group.
			model : _model,
			// Parent node, should not be undefined but null if not set.
			parent : _parent || null,
			// List of children /child nodes.
			children : [],
			// Only visible nodes are rendered.
			visible : _visible,
			// ran the animations of the node if it has assigned animations.
			animated : false,
			// This is the node that visualizes the light source.
			// Indicates to move the light when node is translated.
			isLightNode : _isLightNode,

			// Local transformations (translation, rotation, scale)
			// for the model or group.
			transformation : {
				translate : [0, 0, 0],
				rotate : [0, 0, 0], // around x,y,z axis angle in radiant.
				scale : [1, 1, 1],
				shear : [0, 0, 0],
			},
			// Modelview matrix as 4x4 glMatrix to
			// Transform, i.e. translate, rotate, scale the node.
			// Local Modelview not including the transformations of the parents.
			localModelview : mat4.identity(mat4.create()),
			// World coordinates, including transformation of parents.
			worldModelview : mat4.identity(mat4.create()),
			// Track changes via transformations and update only when necessary.
			localModelviewUpToDate : false,
			worldModelviewUpToDate : false,
			// Separate rotation-matrix for normals.
			// Because normals should only subject of rotation not translation.
			// Alternative: calculate the inverse of the model-view matrix.
			localRotation : mat4.identity(mat4.create()),
			worldRotation : mat4.identity(mat4.create()),
			// Local shearing matrix.
			localShear : mat4.identity(mat4.create()),

			//
			// Public functions.
			//
			addChild : addChild,
			// Getter (some only for debug).
			getLocalModelview : getLocalModelview,
			getWorldModelview : getWorldModelview,
			getModel : getModel,
			getModelData : getModelData,
			getParent : getParent,
			isReady : isReady,
			isVisible : isVisible,
			isAnimated : isAnimated,
			getTexture : getTexture,
			// Setter.
			setVisible : setVisible,
			setAnimated : setAnimated,
			setParent : setParent,
			// Transforms and matrix operations.
			rotate : rotate,
			rotateTo : rotateTo,
			scale : scale,
			scaleTo : scaleTo,
			shear : shear,
			shearTo : shearTo,
			translate : translate,
			transform : transform,
			applyMatrixToVertices : applyMatrixToVertices,
			applyMatrixToTransformedVertices : applyMatrixToTransformedVertices,
			projectTransformedVertices : projectTransformedVertices,
			applyMatrixToNormals : applyMatrixToNormals,
			// Update
			setWorldModelviewNotUpToDate : setWorldModelviewNotUpToDate,
			updateModelview : updateModelview,
			updateRotation : updateRotation,
			tellChildren : tellChildren,
			// Operations on data/mesh.
			toggleTriangulation : toggleTriangulation,
			cleanData : cleanData,
		};
		// Register as child;
		if(_parent) {
			_parent.addChild(newNodeObj);
		}
		// Return access object to the node.
		return newNodeObj;
	}

	function getLocalModelview() {
		this.updateModelview();
		return this.localModelview;
	}

	function getWorldModelview() {
		this.updateModelview();
		return this.worldModelview;
	}

	function getModel() {
		return this.model;
	}

	function getModelData() {
		if(this.model === null) {
			return null;
		}
		return this.model.getData();
	}

	function getParent() {
		return this.parent;
	}

	function setParent(_parent) {
		this.parent = _parent;
		// Register as child;
		if(_parent) {
			_parent.addChild(this);
		}

	}

	function setWorldModelviewNotUpToDate() {
		this.worldModelviewUpToDate = false;
	}

	function addChild(node) {
		node.parent = this;
		this.children.push(node);
	}

	/**
	 * Tell node an children to call a given update function.
	 *  @parameter fktName is a name of a function in this given as string.
	 */
	function tellChildren(fktName) {
		// First tell myself.
		this[fktName]();
		for(var i = 0; i < this.children.length; i++) {
			this.children[i]["tellChildren"](fktName);
		};
	}

	/**
	 * Checks if model data has finished loading.
	 * @returns true if model is ready for rendering
	 */
	function isReady() {
		var ready = false;
		if(this.model !== null) {
			ready = this.model.isReady();
		} else {
			// The model may not have finished loading.
			//console.log("this.node.isReady: this.model==null");
		}
		return ready;
	}

	function isVisible() {
		return this.visible;
	}

	/**
	 * Set a node visible (default if val is undefined) or invisible.
	 */
	function setVisible(val) {
		if(val == undefined) {
			val = true;
		}
		this.visible = val;
	}

	function isAnimated() {
		return this.animated;
	}

	/**
	 * Set a node animated (default if val is undefined).
	 */
	function setAnimated(val) {
		if(val == undefined) {
			val = true;
		}
		this.animated = val;
	}

	function getTexture() {
		if(this.model !== null) {
			return this.model.getTexture();
		} else {
			return null;
		}
	}

	/**
	 * First update the local model-view matrix
	 * then traverse up the graph and incorporate
	 * the transformations of the parents recursively.
	 * This is due to optimization as calculations
	 * are performed more than once in each frame.
	 *
	 * This order is the same in the parent an applied fist.
	 * Thus in the scene-graph, the different types of transformations are mixed.
	 *
	 * Update the rotation matrices for the rotation as well.
	 *
	 * @ returns worldModelview Matrix
	 */
	function updateModelview() {
		// update LocalModelview() {
		if(!this.localModelviewUpToDate) {

			// Calculate local modelview.
			mat4.identity(this.localModelview);

			// Translate last, thus include the code first.
			mat4.translate(this.localModelview, this.transformation.translate);

			// Calculate and store the rotation separately, because it is used for normals.
			// Mind the this is not commutative, thus only the rotation applied last (x)
			// will work as expected. Rotation around z will always turn the original (not rotated) model.
			mat4.identity(this.localRotation);
			mat4.rotateX(this.localRotation, this.transformation.rotate[0]);
			mat4.rotateY(this.localRotation, this.transformation.rotate[1]);
			mat4.rotateZ(this.localRotation, this.transformation.rotate[2]);
			// Include rotation.
			mat4.multiply(this.localModelview, this.localRotation, this.localModelview);

			// Include scaling.
			mat4.scale(this.localModelview, this.transformation.scale);

			// BEGIN exercise Shear
			// Include shearing.
			// Modify the matrix this.localShear (see mat4.translate for matrix data structure).

			this.localShear[1] = this.transformation.shear[1];
			this.localShear[2] = this.transformation.shear[1];
			this.localShear[4] = this.transformation.shear[0];
			this.localShear[6] = this.transformation.shear[0];
			this.localShear[8] = this.transformation.shear[2];
			this.localShear[9] = this.transformation.shear[2];

			mat4.multiply(this.localModelview, this.localShear);

			// END exercise Shear

			// Locally we are up to date, but we have to adjust world MV.
			this.localModelviewUpToDate = true;
			this.worldModelviewUpToDate = false;
		}
		// Update WorldModelview and worldRotation.
		if(!this.worldModelviewUpToDate) {
			mat4.identity(this.worldModelview);
			mat4.identity(this.worldRotation);
			// Include transformation of parent node.
			if(this.parent !== null) {
				var PWMV = this.parent.updateModelview();
				var PWR = this.parent.updateRotation();
				mat4.multiply(this.worldModelview, PWMV, this.worldModelview);
				mat4.multiply(this.worldRotation, PWR, this.worldRotation);
			}
			// Combine world of parents with local to this world.
			mat4.multiply(this.worldModelview, this.localModelview, this.worldModelview);
			mat4.multiply(this.worldRotation, this.localRotation, this.worldRotation);
			this.worldModelviewUpToDate = true;
		}
		return this.worldModelview;
	}

	/**
	 * @returns world rotation matrix.
	 */
	function updateRotation() {
		this.updateModelview();
		return this.worldRotation;
	}

	/**
	 * @parameter vec to add to the current translation.
	 * @parameter setTo sets transform to vec if true, otherwise adds.
	 */
	function translate(vec, setTo) {
		this.transform(this.transformation.translate, vec, setTo, this.isLightNode);
	}

	/**
	 * @parameter vec to add to the current rotation.
	 * @parameter setTo sets transform to vec if true, otherwise adds.
	 */
	function rotate(vec, setTo) {
		// Omit the clampLight parameter (i.e. false), because
		// we assume only point-lights exist, no spotlights,
		// thus light rotation does not make sense.
		this.transform(this.transformation.rotate, vec, setTo);
	}

	/**
	 * See rotate().
	 */
	function rotateTo(vec) {
		this.rotate(vec, true);
	}

	/**
	 * To set the absolute scale setTo must be true.
	 *
	 * @parameter vec to add to the current scale.
	 * @parameter setTo sets transform to vec if true, otherwise adds.
	 */
	function scale(vec, setTo) {
		this.transform(this.transformation.scale, vec, setTo);
	}

	/**
	 * See scale().
	 */
	function scaleTo(vec) {
		this.scale(vec, true);
	}

	/**
	 * @parameter vec to add to the current rotation.
	 * @parameter setTo sets transform to vec if true, otherwise adds.
	 */
	function shear(vec, setTo) {
		// BEGIN exercise Shear
		this.transform(this.transformation.shear, vec, setTo);
		// END exercise Shear
	}

	function shearTo(vec) {
		this.shear(vec, true);
	}

	/**
	 * @parameter vec delta to add to the current transformation, given as trans.
	 * @parameter setTo sets transform to vec if true, otherwise adds.
	 */
	function transform(trans, vec, setTo, clampLight) {
		//console.log("transform name: " + name);
		this.localModelviewUpToDate = false;
		this.worldModelviewUpToDate = false;
		if(setTo == true) {
			vec3.set(vec, trans);
		} else {
			vec3.add(trans, vec, null);
		}
		// Tell children the world of their parents has changed.
		this.tellChildren("setWorldModelviewNotUpToDate");

		// Keep the light attached (also move it) if this node if it is the light node
		// and was translated.
		if(clampLight) {
			shader.setLights(undefined, undefined, trans);
		}
		// Scene-update should be done in UI or by animation.
		// this.updateModelview() is called from render function in scene.
	}

	/**
	 * Apply a matrix to vertices if node contains a model.
	 * @parameter mat mat4 matrix
	 */
	function applyMatrixToVertices(matrix) {
		// Transform the model.
		if(this.model !== null) {
			this.model.applyMatrixToVertices(matrix);
		}
	}

	/**
	 * Apply a matrix to transformed vertices if node contains a model.
	 * @parameter mat mat4 matrix
	 */
	function applyMatrixToTransformedVertices(matrix) {
		// Transform the model.
		if(this.model !== null) {
			this.model.applyMatrixToTransformedVertices(matrix);
		}
	}

	/**
	 * @parameter mat mat4 matrix
	 */
	function projectTransformedVertices(matrix) {
		// Transform the model.
		if(this.model !== null) {
			this.model.projectTransformedVertices(matrix);
		}
	}

	/**
	 * Apply a matrix to normals if node contains a model.
	 * @parameter mat mat4 matrix
	 */
	function applyMatrixToNormals(matrix) {
		if(this.model !== null) {
			this.model.applyMatrixToNormals(matrix);
		}
	}

	function toggleTriangulation() {
		if(this.model !== null) {
			this.model.toggleTriangulation();
		}
	}

	function cleanData() {
		if(this.model !== null) {
			this.model.cleanData();
		}
	}

	// Public API to module.
	// The API of the node object is defines in the create() method.
	exports.create = create;
});
