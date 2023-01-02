/**
 * Administration of transformed data.
 *
 * Model produces/creates a modelObj that holds a pointer to a 3D modelData.
 * _functions are private, i.e., not exposed by modelObj.
 *
 * Original data is taken in each frame from the modelData loaded,
 * thus is is reused for multiple instances of the same model.
 *
 * @namespace cog1
 * @module model
 */
define(["exports", "dojo", "data", "texture", "glMatrix"], //
function(exports, dojo, data, texture) {
    "use strict";

	// Set from default in scene, which is passed to data on initialization.
	var triangulateDataOnInit;
	var cleanDataOnInit;

	/**
	 * Initialize the module, not uses for a created model.
	 */
	function init(_triangulateDataOnInit, _cleanDataOnInit) {
		data.init();
		triangulateDataOnInit = _triangulateDataOnInit;
		cleanDataOnInit = _cleanDataOnInit;
	}

	/**
	 * Link to model to its modelData/mesh.
	 * @parameter _modelDataName string, name of the modeldata
	 * @parameter _parameter for the model, if produced procedural
	 */
	function create(_modelDataName, _parameter) {
		// console.log("cog1.model.create: " + _modelDataName + " " + typeof _modelDataName);
		// Try to load a modelData-module with the name _modelDataName.
		if(_modelDataName === undefined || typeof _modelDataName !== "string") {
			console.error("Error: Parameter for modelData not a String.");
			//alert("Error: Parameter for modelData not a String.");
			return;
		}
		// Return access object to the model.
		var newModelObj = {
			//
			// Fields.
			//
			// Name of the model data module. Used for debug.
			name : _modelDataName,
			// 3D Data Store, containing the mesh, etc.
			// Vertices are blocks of points with X Y Z.
			// Polygons should be closed, i.e. first=last point.
			// Colors are assigned to polygons corresponding to the order in polygonData.
			modelData : null,
			// 4d (quad4) working copy of the vertices to apply transforms to eye/camera coordinates.
			transformedVertices : null,
			// 4d (quad4) vertices after transformation and projection in screen coordinates.
			projectedVertices : null,
			// Needed for ready.
			initTransformedVertricesDone : false,
			initProjectedVerticesDone : false,
			// Working copy of the normals to apply transform.
			transformedVertexNormals : null,
			transformedPolygonNormals : null,
			// Needed for ready.
			initTransformedNormalsDone : false,
			// Set true if no texture defined in modelData.
			loadingTextureDone : false,
			// Texture object with image data.
			texture : null,
			//
			// Public functions.
			//
			isReady : isReady,
			setData : setData,
			getData : getData,
			getTexture : getTexture,
			getTransformedVertices : getTransformedVertices,
			getProjectedVertices : getProjectedVertices,
			getTransformedVertexNormals : getTransformedVertexNormals,
			getTransformedPolygonNormals : getTransformedPolygonNormals,
			//
			applyMatrixToVertices : applyMatrixToVertices,
			applyMatrixToTransformedVertices : applyMatrixToTransformedVertices,
			applyMatrixToNormals : applyMatrixToNormals,
			projectTransformedVertices : projectTransformedVertices,
			toggleTriangulation : toggleTriangulation,
			cleanData : cleanData
		};

		// Load the modelData of the required 3d model.
		// The require forks, loads then calls given callback.
		require(["cog1/modelData/" + _modelDataName], function(_modelData) {
			_requiredModelDataCbk.call(newModelObj, _modelData, _parameter);
		});
		return newModelObj;
	}

	/**
	 * Called from require when model data module has been read.
	 * One data module is parsed only once, but this callback
	 * is call for every instance of the moduleData.
	 * Callback within the closure of this module-(function).
	 */
	function _requiredModelDataCbk(_modelData, _parameter) {
		//console.log("requiredModelDataCbk...." + this.name);
		if(!dojo.isObject(_modelData)) {
			console.error("Error: The modelData for the model is not valid: " + _modelData);
			//alert("Error: model.create: " + _modelData);
			return;
		}
		//console.log("Initialize modelData: ");
		// Create [calculate procedural] model Data.
		// Here this points to the newly creates model instance.
		this.setData(_modelData.create(_parameter));
		// Initialize modelData.
		//console.dir(this.modelData);
		data.initModelData.call(this.modelData, cleanDataOnInit);
		_initTransformedVertrices.apply(this);
		_initProjectedVertrices.apply(this);
		_initTransformedNormals.apply(this);

		// Load the texture if given in modelData, providing a callback.
		if(this.modelData.textureURL == "") {
			this.loadingTextureDone = true;
			// Initialize triangulation status when all of model is ready.
			if(!triangulateDataOnInit) {
				toggleTriangulation.call(this);
			}
		} else {
			this.texture = texture.create(this.modelData.textureURL, ( function(newModelObj) {
				return function() {
					_onTextureLoaded.call(newModelObj);
					// Initialize triangulation status when all of model is ready.
					if(!triangulateDataOnInit) {
						toggleTriangulation.call(newModelObj);
					}
				}
			}(this)));
		}
	}

	function _onTextureLoaded() {
		//console.log("texture loaded: " + this.modelData.textureURL);
		this.loadingTextureDone = true;
	}

	/**
	 * Set the dimensions of the modelData to the 2D-array structure.
	 */
	function _initTransformedVertrices() {
		if(!this.modelData) {
			return;
		}
		this.transformedVertices = [];
		for(var i = 0, len = this.modelData.vertices.length; i < len; i++) {
			this.transformedVertices[i] = [];
		}
		
		// Add the homogengous component.
        // todo this.transformedVertices[3] = 1.0;
		
		
		// We may copy the initial, not transformed modelData over.
		// But we may leave this out as well, it is done when the model-view matrix is applied.
		//_copyVertexDataToTransformedVertrices.apply(this);
		this.initTransformedVertricesDone = true;
	}

	/**
	 * Set the dimensions of the modelData to the 2D-array structure.
	 */
	function _initProjectedVertrices() {
		if(!this.modelData) {
			return;
		}
		this.projectedVertices = [];
		for(var i = 0, len = this.modelData.vertices.length; i < len; i++) {
			this.projectedVertices[i] = [];
		}
		this.initProjectedVerticesDone = true;
	}

	/**
	 * This is only used for debugging when we want to see the
	 * untransformed vertices.
	 */
	function _copyVertexDataToTransformedVertrices() {
		// Store array length for speedup.
		for(var i = 0, leni = this.modelData.vertices.length; i < leni; i++) {
			// Speedup vars to save indices.
			var vertex = this.modelData.vertices[i];
			var transformedVertex = this.transformedVertices[i];
			for(var j = 0, lenj = vertex.length; j < lenj; j++) {
				transformedVertex[j] = vertex[j];
			}
		}
	}


	function _initTransformedNormals() {
		if(!this.modelData) {
			return;
		}
		this.transformedVertexNormals = [];
		this.transformedPolygonNormals = [];
		for(var i = 0, len = this.modelData.vertexNormals.length; i < len; i++) {
			this.transformedVertexNormals[i] = [];
		}
		for(var i = 0, len = this.modelData.polygonNormals.length; i < len; i++) {
			this.transformedPolygonNormals[i] = [];
		}
		this.initTransformedNormalsDone = true;
	}


	/**
	 * Apply matrix to normals or to the mash given as vertices.
	 * Store the result in transformedVertices.
	 * The 4th component w is assumed to be 1 in glMatrix.
	 * 
	 * @parameter matrix is a mat4 matrix
     * @parameter verices is vec3 or vec4 array.
     * @parameter _transformedVertices is vec3 or vec4 array.
     * @parameter mult4d determines if homogeneous component w is used.
	 */
	function _applyMatrix(matrix, vertices, _transformedVertices, mult4d) {
		// Check if the modelData has finished loading.
		if(!this.isReady()) {
			return;
		}
		if(!matrix || !vertices || !_transformedVertices) {
			console.error("model.applyMatrix parameter error.");
			return;
		}
		
		if(mult4d){
            // Use homogeneous component w
		    var multFkt = mat4.multiplyVec4;
		} else {
            // Assume homogeneous component w to be on
            multFkt = mat4.multiplyVec3;		    
		}
		
		// We may start empty or just overwrite the existing array.
		for(var i = 0, len = vertices.length; i < len; i++) {
            //mat4.multiplyVec3(matrix, vertices[i], _transformedVertices[i]);
            multFkt(matrix, vertices[i], _transformedVertices[i]);
		}
	}

	/**
	 * Apply matrix to the mash given the modelData.
	 * Store the result in transformedVertices
	 * @parameter matrix is a mat4 matrix
	 */
	function applyMatrixToVertices(matrix) {
		// Check if the modelData has finished loading.
		if(!this.isReady()) {
			return;
		}
		var vertices = this.modelData.vertices;
		_applyMatrix.call(this, matrix, vertices, this.transformedVertices);
	}

	/**
	 * Apply matrix to already transformedVertices and
	 * store the result in transformedVertices
	 * @parameter matrix is a mat4 matrix
	 */
	function applyMatrixToTransformedVertices(matrix) {
		// Check if the modelData has finished loading.
		if(!this.isReady()) {
			return;
		}
		_applyMatrix.call(this, matrix, this.transformedVertices, this.transformedVertices);
	}

	/**
	 * Apply matrix to normals given the modelData.
	 * Store the result in transformedNormals
	 * @parameter matrix is a mat4 matrix
	 */
	function applyMatrixToNormals(matrix) {
		// Check if the modelData has finished loading.
		if(!this.isReady()) {
			return;
		}
		var vertexNormals = this.modelData.vertexNormals;
		var polygonNormals = this.modelData.polygonNormals;
		_applyMatrix.call(this, matrix, vertexNormals, this.transformedVertexNormals);
		_applyMatrix.call(this, matrix, polygonNormals, this.transformedPolygonNormals);
	}

	/**
	 * Apply a projection matrix to the transformed vertices
	 * store the result in projectedVertices
	 * @parameter matrix is a mat4 matrix
	 */
	function projectTransformedVertices(matrix) {
		if(this.transformedVertices === null) {
			return;
		}
		_applyMatrix.call(this, matrix, this.transformedVertices, this.projectedVertices);
	}

	/**
	 * Call/apply on current data.
	 */
	function toggleTriangulation() {
		if(!this.isReady()) {
			return;
		}
		data.toggleTriangulation.apply(this.modelData);
	}

	/**
	 * Call/apply on current data.
	 */
	function cleanData() {
		if(!this.isReady()) {
			return;
		}
		data.cleanData.apply(this.modelData);
	}

	// Ready is true when the model data finished loading.
	function isReady() {
		if(this.modelData === null) {
			return false;
			//console.log("model.isReady: this.modelData==null");
		}
		if(!this.initTransformedVertricesDone) {
			return false;
		}
		if(!this.initProjectedVerticesDone) {
			return false;
		}
		if(!this.initTransformedNormalsDone) {
			return false;
		}
		if(!this.loadingTextureDone) {
			return false;
		}
		return true;
	}

	/**
	 * @returns null until the model data finished loading.
	 *
	 */
	function getData() {
		return this.modelData;
	}

	function getTexture() {
		return this.texture;
	}

	function setData(_modelData) {
		this.modelData = _modelData;
	}

	function getTransformedVertices() {
		return this.transformedVertices;
	}

	function getProjectedVertices() {
		return this.projectedVertices;
	}

	function getTransformedVertexNormals() {
		return this.transformedVertexNormals;
	}

	function getTransformedPolygonNormals() {
		return this.transformedPolygonNormals;
	}

	// Public API to module.
	exports.init = init;
	exports.create = create;
});
