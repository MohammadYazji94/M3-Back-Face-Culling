
/**
 * 3D Data Store for a model.
 *
 * This is an empty data template
 * that explains the format.
 * See cube.js as an example.
 *
 * Model may also have a procedural calculation.
 * In this case a model must contain the function calculate(parameter),
 * where parameter is an array of parameter.
 * It is called with the parameters given in the call in
 * createScene. See cube.js and sphere.js as an example.
 *
 *
 * Data defines some default colors.
 *
 * Data requires a reference to itself to mix its own properties
 * into the model data.
 *
 *  *  Coordinate System:
 *        y
 *        |
 *        |____
 *       /     x
 *     z/
 *
 * @namespace cog1
 * @module data
 */
define(["exports", "data", "glMatrix"], function(data, exports) {
	"use strict";

	// Array with data for one model.
	//
	// Vertices with x,y,z. Coordinate system as in OpenGL.
	var vertices = [];

	// Color array  with default colors "red", "green".
	// The color array contains objects of the form:
	// {colorname : [r,g,b,a]}, the name can be accessed
	// via the Object.keys() function.
	// But this is not necessary as the color object get
	// augmented with the fields name and rgba during initialization.
	var colors = [
		{red : [255, 0, 0, 255]},
		{green : [0, 255, 0, 255]},
		{blue : [0, 0, 255, 255]},
		//
		{cyan : [0, 255, 255, 255]},
		{magenta : [255, 0, 255, 255]},
		{yellow : [255, 255,0, 255]},
		//
		{black : [0, 0, 0, 255]},
		{grey : [128, 128, 128, 255]},
		{gold : [83, 75, 44, 255]},
		{bluegrey : [64, 64, 128, 255]},
		{white : [255, 255, 255, 255]},
	];

	// 2D-array of texture coordinates. Indices used by polygonTextureCoord.
	// Origin is at the left bottom of the texture image (as for openGL).
	// Used as default the corners of a rectangular texture
	// in mathematical positive direction (starting bottom-left):
	var textureCoord = [ [0,0],[0,1],[1,1],[1,0] ];

	// Vertices can be combined to polygons
	// referencing the indices of the arrays above.

	// 2D-Array that specifies faces/polygons as its vertex reference number,
	// i.e. the index in the vertices array.
	// The last vertex is assumed to form an edge with the first one to close the polygon.
	// The sign of the normal is calculated from the order of the vertices
	// according to the right hand rule.
	var polygonVertices = [];

	// Color for each polygon as index in color array.
	// There can be only one color per polygon (not one for each vertex).
	var polygonColors = [];

	// One normal for each vertex (with the same index).
	// One vertex may occur in several polygons, but it cannot
	// have different normals for each occurrence.
	// Given or calculated from the mesh or from polygonNormals.
	var vertexNormals = [];

	// One normal for each polygon (with the same index).
	// Given or calculated from the mesh or from vertexNormals.
	// Normals are calculated during initialization
	// and a copy in model is kept up-to-date while transforming.
	var polygonNormals = [];

	// 2D-array of texture coordinates for each vertex of a polygon.
	// Data are the indices in the textureCoord array.
	// Dimensions must match polygonVertices array.
	// If not given (empty array), indices [1,2,3,..]
	// for each polygon separately, are created as default.
	// If there is exactly one texture coordinate per vertex
	// and the order fits the vertices array, set the
	// reference: polygonTextureCoord = polygonVertices.
	var polygonTextureCoord = [];

	// URL of an texture image.
	// There is only one texture per model.
	var textureURL = "";

	/////////////////////////////////////////////////////////////////
	// Variable that do not refer to the model-data.
	/////////////////////////////////////////////////////////////////

	// If the some data/model is uses several times in the
	// scene initialization should be run only for the fist instance.
	var initDone = false;

	/////////////////////////////////////////////////////////////////
	// Functions that work on the data.
	/////////////////////////////////////////////////////////////////

	/**
	 * Initialize the data module.
	 */
	function init(){
		//console.log("data.init()");
		augmentColorObjecstWithColornameAndRgba.apply(this);
	}

	/**
	 * Calculate normals, if not given.
	 * This initialize function is applied to model data.
	 */
	function initModelData(_cleanData){
		if(this.initDone == true){
			return;
		}

		// Mix in mission members from data template the are missing in model data.
		// As this is applied to the model data this is it.
		for(var prop in data) {
			if(data.hasOwnProperty(prop)){
				// Only array, for the data.
				if( ! this.hasOwnProperty(prop)){
					if(Array.isArray(data[prop])){
						// Create empty arrays for the missing props
						// or link to the array in data if default not empty.
						this[prop] = (data[prop].length > 0) ? data[prop] : [];
						//this.exports[prop] = data[prop];
					} else {
						// Not of type array.
						// Set the value to the default in data.
						this[prop] = data[prop];
					}
				}
			}
		}

		// Create some default for polygonTextureCoord if not given.
		if(this.textureURL != ""){
			if(this.polygonTextureCoord.length == 0){
				createDefaultPolygonTextureCoord.apply(this);
			}
		}

		if(_cleanData == true){
			cleanData.apply(this);
		}

		// Triangulate data and keep results,
		// but if default in scene is false then it will be toggled
		// back or original data by the model.
		triangulate.apply(this);

		if(this.polygonNormals.length == 0) {
			calcuatePolygonNormalsFromMesh.apply(this);
		}
		if(this.vertexNormals.length == 0) {
			calcuateVertexNormalsFromPolygonNormals.apply(this);
		}

		augmentColorObjecstWithColornameAndRgba.apply(this);

		// If the some data/model is used several times in the
		// scene initialize should be run only for the fist instance.
		this.intiDone = true;
	}

	/**
	 * Called from init.
	 * Indices [1,2,3,..] for each polygon separately, are created as default.
	 */
	function createDefaultPolygonTextureCoord(){
		// Loop polygons.
		for(var p = 0; p < this.polygonVertices.length; p++) {
			this.polygonTextureCoord[p] = [];
			// Loop over vertices/edges in polygon.
			for(var v = 0; v < this.polygonVertices[p].length; v++) {
				// Assign texture coordinates via index.
				// Just start with the first, then second and so forth (wrap if not enough).
				this.polygonTextureCoord[p][v] = v % textureCoord.length;
			}
		}
	}

	/**
	 * Identify duplicate vertices.
	 * This is an n2 algorithm.
	 *
	 * Test the result on dirty teapot.
	 */
	function cleanData(){

		// BEGIN exercise Clean-Data

		// List of index pairs to merge.
		// Index of the list is the vertex to modify.

		// Find equal vertices.

		// Take the lowest index as replacement.

		//console.log("Clean Vertex Data: "+v2+" -> "+v1);


		// Replace indices of equal vertices,
		// by always using the first index.
		// Loop over polygons.

		// Loop vertices of polygon.

		// Check for polygon vertex exist in merge list and replace.


		// Dump the cleaned data to copy it from the console into a clean model.
		//console.log(JSON.stringify(this.vertices));
		//console.log(JSON.stringify(this.polygonVertices));

		// END exercise Clean-Data

		// Re-calculate the vertex normals.
		calcuateVertexNormalsFromPolygonNormals.apply(this);
	}

	/**
	 * Augment all color objects with color-name, rgba  for speed
	 * and with rgbaShaded, which is modified by the shader.
	 * Called during initialization.
	 */
	function augmentColorObjecstWithColornameAndRgba(){
		for(var i = 0, len = this.colors.length; i < len; i++) {
			var color = this.colors[i];
			// Read the colorname from the key and store it.
			color.colorname = Object.keys(color)[0];
			// Keep the original polygon color for reset.
			color.rgbaOriginal = color[color.colorname];
			// Create an extra rgba variable
			// for texturing and shading work-flow.
			color.rgba = [];
			color.rgbaShaded = [];
		}
		resetColors.call(this);
	}

	/**
	 * Reset all colors.
	 */
	function resetColors(){
		for(var i = 0, len = this.colors.length; i < len; i++) {
			var color = this.colors[i];
			resetColor(color);
		}
	}

	/**
	 * Set rgbaShaded to rgba for functions that do not perform shading.
	 * This may also be on in raster by hand, for the color in use.
	 *
	 * @parameter color: object as defined in colors.
	 */
	function resetColor(color){
		// Color of polygon of after texturing.
		vec3.set(color.rgbaOriginal, color.rgba );
		// set Alpha.
		color.rgba[3] = color.rgbaOriginal[3];
		//
		// Color after shading.
		vec3.set(color.rgbaOriginal, color.rgbaShaded );
		// set Alpha.
		color.rgbaShaded[3] = color.rgbaOriginal[3];
	}


	function getColorByName(name){
		for(var i = 0, len = this.colors.length; i < len; i++) {
			var color = this.colors[i];
			// Read the colorname from the key and store it.
			if(color.colorname == name){
				return color;
			}
		}
		console.log("color not found: "+name);
		return null;
	}


	////////////// Service functions for procedural modeling ////////////////

	/**
	 * @parameter color or many colors if color==-1.
	 */
	function setColorForAllPolygons(color) {
		var manyColors = color == -1 ? true : false;
		this.polygonColors = [];
		for (var i = 0; i < this.polygonVertices.length; ++i) {
			if(manyColors){
				color = (++color % colors.length);
			}
			this.polygonColors.push(color);
		}
	}


	function applyScale(scale) {
		for (var i = 0; i < this.vertices.length; i++) {
			vec3.scale(this.vertices[i], scale);
		}
	}


	/**
	 * Search vertex in vertices array.
	 *
	 * @return index if vertex is found, false otherwise.
	 */
	function vertexExists(vertex, epsilon){
		for(var v = 0; v < this.vertices.length; v++) {
			if(vectorsEqual( this.vertices[v], vertex, epsilon)){
				return v;
			}
		}
		return false;
	}

	/**
	 * Compare two vectors element-wise.
	 * @parameter epsilon gives the accepted deviation,
	 * which is 0 if not specified.
	 */

	function vectorsEqual(vec1, vec2, epsilon) {
		for(var i = 0, len = vec1.length; i < len; i++) {
			if(epsilon) {
				if( Math.abs(vec1[i] - vec2[i]) > epsilon ) {
					return false;
				}
			} else {
				if(vec1[i] != vec2[i]) {
					return false;
				}
			}
		}
		return true;
	}

	/**
	 * Use the cross product of the edge vectors.
	 * The order of the vertices determines the sign of the normal.
	 */
	function calcuatePolygonNormalsFromMesh(){
		// Loop over polygons.
		for(var p = 0; p < this.polygonVertices.length; p++) {
			var polygon = this.polygonVertices[p];
			this.polygonNormals[p] = [0,0,0];
			var normal = this.polygonNormals[p]
			calculateNormalForPolygon(this.vertices, polygon, normal);

		}
	}

	/**
	 * Calculate a separate normal for each vertex, but not for each
	 * corner of each polygon.
	 * For a vertex normal averages over all polygon normals
	 * the vertex is part of.
	 * The weight of the angle at the vertex is used as weight.
	 * No check if calculation has been already done.
	 */
	function calcuateVertexNormalsFromPolygonNormals(){
		// Polygon normals must be calculated first.
		if(this.polygonNormals.length == 0) {
			calcuatePolygonNormalsFromMesh.apply(this);
		}

		// Initialize normal array.
		for(var v = 0; v < this.vertices.length; v++) {
			this.vertexNormals[v] = [0,0,0];
		}



		//console.log("Polygonnormals");
		//console.log(this.polygonNormals);

		// BEGIN exercise Vertex-Normals

		//console.log("Vertexnormals");
		//console.log(this.vertexNormals);
		// Loop over polygons.

		for(var p = 0; p < this.polygonVertices.length; p++) {
			//let polygon= this.polygonVertices[p];
			//console.log(polygon);
			// Loop over vertices/edges in polygon.
			for(var v = 0; v < this.polygonVertices[p].length; v++) {
				let ver =this.polygonVertices[p][v]
				//console.log(vertex);
				// Accumulate/add all vertex normals from polygonNormals.
				this.vertexNormals[ver]= vec3.add(this.vertexNormals[ver], this.polygonNormals[p]);
			}
		}

		// Normalize normals.

		for (let i=0; i<this.vertexNormals.length;i++){
			let normvec=vec3.normalize(this.vertexNormals[i]);
			this.vertexNormals[i]= normvec;
		}
		// END exercise Vertex-Normals
	}

	/**
	 * Assume that all vertices of the polygon are in one plane.
	 * Calculate two (non parallel) vectors inside the plane of the polygon.
	 * Assume that at least two (consecutive) vertices of a polygon
	 * are not on a straight line with the first vertex.
	 *
	 * @ parameter vertices may be the transformed vertices.
	 * @ parameter polygon as defined in data.
	 * @ parameter n is the normal vector or calculate.
	 * @ returns i.e. modifies parameter n as array (vec3) or null-vector if normal does not exist.
	 * @ returns length of normal, which is 1 or 0, if normal does not exist.
	 */

	//Z-BuFFer  function calculateNormalForPolygon
	/**DONE*/function calculateNormalForPolygon(vertices, polygon, n){

		if(n == null){
			console.log("Error: Parameter normal n is null.");
		}

		// BEGIN exercise Z-Buffer
		// BEGIN exercise Vertex-Normals

		// Two edge-vectors dim 3:

		var e1=[0,0,0];
		var e2=[0,0,0];

		// Check for polygon vertex exist (common index error in data).
		for (let i=0;i<3; i++){
			e1[i]=vertices[polygon[1]][i]-vertices[polygon[0]][i];
			e2[i]=vertices[polygon[2]][i]-vertices[polygon[0]][i];
		}

		// Calculate normal vector from vector product of edges.
		var n0=(e1[1]*e2[2]-e1[2]*e2[1]);
		var n1=(e1[2]*e2[0]-e1[0]*e2[2]);
		var n2=(e1[0]*e2[1]-e1[1]*e2[0]);

		// Normalize n, ignoring w.
		// We do this by hand as the length is already calculated.

		let length = Math.sqrt(Math.pow(n0,2)+Math.pow(n1,2)+Math.pow(n2,2));

		n[0]= n0/length ;
		n[1]= n1/length ;
		n[2]= n2/length ;
		// Only  for template, comment this out for solution.
		return n;

		// END exercise Vertex-Normals
		// END exercise Z-Buffer


	}

	/**
	 * Create triangle fans (123, 134, 145, ...)
	 * from polygons.
	 * Remember the original mesh, to undo the triangulation,
	 * see toggleTriangulation.
	 * Adjust: polygonVertices, polygonColors and polygonTextureCoord.
	 */
	function triangulate(){
		// Create new array for the triangles and colors,
		// but keep all polygon data.
		this.triangles = [];
		this.orgPolygonVertices = this.polygonVertices;
		this.triangleColors = [];
		this.orgPolygonColors = this.polygonColors;
		this.orgPolygonTextureCoord = this.polygonTextureCoord;
		this.trianglePolygonTextureCoord = [];

		var nbTris = 0;
		// Loop over polygons.
		for(var p = 0; p < this.polygonVertices.length; p++) {
			var polygon = this.polygonVertices[p];
			if(polygon.length < 3) {
				console.error("triangulate: skip polygon: "+p);
				continue;
			}
			// Loop over vertices of polygon.
			var firstVertex = polygon[0];
			for(var v = 1; v < polygon.length-1; v++) {
				// Crate the triangle fan.
				this.triangles[nbTris] = [firstVertex, polygon[v], polygon[v+1]];
				this.triangleColors.push(this.polygonColors[p]);
				// Adjust the texture coordinates.
				if((this.textureURL != "") && (this.polygonTextureCoord.length != 0)){
					this.trianglePolygonTextureCoord[nbTris] = [];
					this.trianglePolygonTextureCoord[nbTris].push(this.polygonTextureCoord[p][0]);
					this.trianglePolygonTextureCoord[nbTris].push(this.polygonTextureCoord[p][v]);
					this.trianglePolygonTextureCoord[nbTris].push(this.polygonTextureCoord[p][v+1]);
				}
				// Count created triangles.
				nbTris++;
			}
		}

		// Set triangles as new polygons.
		this.polygonVertices = this.triangles;
		this.polygonColors = this.triangleColors;
		this.polygonTextureCoord = this.trianglePolygonTextureCoord;
	}

	function isTriangulated(){
		if(this.polygonVertices === this.triangles){
			return true;
		}
		return false;
	}

	function toggleTriangulation(){
		if(isTriangulated.apply(this)){
			// Set original polygons as new polygons.
			this.polygonVertices = this.orgPolygonVertices;
			this.polygonColors = this.orgPolygonColors;
			this.polygonTextureCoord = this.orgPolygonTextureCoord;
		} else {
			// Set triangles as new polygons.
			this.polygonVertices = this.triangles;
			this.polygonColors = this.triangleColors;
			this.polygonTextureCoord = this.trianglePolygonTextureCoord;
		}
		// Re.calculate normals.
		this.vertexNormals = [];
		this.polygonNormals = [];
		calcuateVertexNormalsFromPolygonNormals.apply(this);
	}

	// Public API.
	exports.init = init;
	exports.initModelData = initModelData;
	exports.calculateNormalForPolygon = calculateNormalForPolygon;
	exports.isTriangulated = isTriangulated;
	exports.toggleTriangulation = toggleTriangulation;
	exports.augmentColorObjecstWithColornameAndRgba = augmentColorObjecstWithColornameAndRgba;
	exports.resetColors = resetColors;
	exports.resetColor = resetColor;
	exports.cleanData = cleanData;
	// Getter.
	exports.getColorByName = getColorByName;
	// Functions for procedural modeling.
	exports.setColorForAllPolygons = setColorForAllPolygons;
	exports.applyScale = applyScale;
	// Some convenience functions
	exports.vertexExists = vertexExists;
	exports.vectorsEqual = vectorsEqual;
	// Public data (which does not make sense if reference is modified after load).
	// These are default or null data array.
	// They are mixed into the real model data object, if not present
	// (which is why they are exported).
	exports.vertices = vertices;
	exports.colors = colors;
	exports.textureCoord = textureCoord;
	exports.polygonVertices = polygonVertices;
	exports.polygonColors = polygonColors;
	exports.vertexNormals = vertexNormals;
	exports.polygonNormals = polygonNormals;
	exports.polygonTextureCoord = polygonTextureCoord;
	exports.textureURL = textureURL;
});