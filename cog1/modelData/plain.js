/**
 * Empty 3D Data Store for a model.
 * 
 * @namespace cog1.data
 * @module plain
 */
define(["exports", "data"], function(exports, data) {
	"use strict";

	/**
	 * Create an instance of the model defined in this module.
	 * 
	 * @parameter object with fields:
	 * @parameter scale is the edge length of the cube.
	 * @parameter color 
	 * 
	 * @returns instance of this model.
	 */
	exports.create = function(parameter) {
		
		if(parameter) {
			var scale = parameter.scale;
			var color = parameter.color;
			var textureURL = parameter.textureURL;
		}
		// Set default values if parameter is undefined.
		if(scale == undefined){
			scale = 200;
		}
		if(color == undefined) {
			color = 9;
		}
		if(textureURL == undefined){
			textureURL = "";
		}

		// Instance of the model to be returned.
		var instance = {};

		// Vertex indices:							
		// 3----2
		// |    |
		// 0----1
		instance.vertices = [
			// x-y plain (z=0)
			[-1,-1,0],
			[ 1,-1,0],
			[ 1,1,0],
			[-1,1,0],
		];
		// Use default colors, implicitly.
		// instance.colors = data.colors;

		// Corners of the faces have to fit the texture coordinates.			
		// Faces: bottom/down, top/up, front, right, back, left. 
		instance.polygonVertices = [
			[0,1,2,3]
		];	

		instance.polygonColors = [color];
		
		//instance.vertexNormals = [];
		//instance.polygonNormals = [];

	    // Use default texture coordinates.
		// instance.textureCoord = [];	
		instance.polygonTextureCoord = [
			[0,3,2,1]
		];
		
		instance.textureURL = textureURL;

		data.applyScale.call(instance, scale);

		return instance;		
	} 	
});