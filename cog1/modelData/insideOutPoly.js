/**
 * 
 * Polygon to test scan-line algorithm.
 * 
 * @namespace cog1.data
 * @module insideOutPoly
 */
define(["exports", "data"], function(exports, data) {
	"use strict";

	//    7
	// 9_8/\6_5  3_2
	// |       \/  |
	// |        4  |
	// 0___________1
	//

	/**
	 * @parameter object with fields:
	 * @parameter scale is the edge length of the cube.
	 * @returns instance of this model.
	 */
	exports.create = function(parameter) {
		if(parameter) {
			var scale = parameter.scale;
		}
		// Set default values if parameter is undefined.
		if(scale == undefined){
			scale = 1;
		}
		// Edge length.
		var a = 100;
		// xOffset
		var x0 = -300;
		
		// Instance of the model to be returned.
		var instance = {};
			
		instance.vertices = [
			[+x0,0, 0],
			[ 7*a+x0,0, 0],
			[ 7*a+x0,2*a, 0],
			[ 6*a+x0,2*a, 0],
			[ 5*a+x0,1*a, 0],
			[ 4*a+x0,2*a, 0],
			[ 3*a+x0,2*a, 0],
			[ 2*a+x0,3*a, 0],
			[ 1*a+x0,2*a, 0],
			[ +x0,2*a, 0]
		];
		instance.polygonVertices = [
			[0,1,2,3,4,5,6,7,8,9]
		];	
		instance.polygonColors = [6];

		data.applyScale.call(instance, scale);

		return instance;		
	} 		
});