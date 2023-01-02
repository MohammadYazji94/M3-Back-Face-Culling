/**
 * Empty object for groups in scenegraph.
 * 
 * @namespace cog1.data
 * @module empty
 */
define(["exports", "data"], function(exports, data) {
	"use strict";

	/**
	 * Create an instance of the model defined in this module.
	 * 
	 * @parameter object with fields:
	 * @returns instance of this model.
	 */
	exports.create = function(parameter) {
		
		// Instance of the model to be returned.
		var instance = {};

		instance.vertices = [];
		instance.polygonVertices = [];	
		instance.polygonColors = [];
		
		return instance;		
	};
});