/** 
 * This script is the entry point of the framework, called from index.
 * Project dependent code may go into the index file.
 * Load initial set of dependencies and start rendering.
 * This is the file to set the initial breakpoint when debugging. 
 */ 
require(["dojo", "dojo/parser", "dojo/domReady!"], function(dojo) {
    "use strict";

    // Check the dojo version.
	//alert("Dojo version " + dojo.version + " is loaded" + '\n\ndojoConfig = '+ dojo.toJson(dojo.config, true));

	// Reconfigure the loader at runtime by passing
	// require a configuration object as the first parameter.
	require({
		async : true,
		parseOnLoad : true,
		debug : true,
		cacheBust : new Date(),
		waitSeconds : 5,
		// Base URL replaces the path to dojo as default,
		// When dojo come from the local file-system,
		// we need the path to dojo to load siblings like dijit.
		// Thus, the path must then be reset in packages.
		// baseUrl: "cog1/",
		// Set absolute path to dojo packages if not linked via http.
		// packages:[
		  // {
		    // name:'dojo',
		    // //location:'/Users/felixgers/BHT/software/dojo-release-xxxx/dojo'
		    // location:'/Users/felixgers/BHT/src/cog1/cog1_JS_template/dojo-release-xxxx/dojo'
		  // },{
		    // name:'dijit',
		    // //location:'/Users/felixgers/BHT/software/dojo-release-xxxx/dijit'
		    // location:'/Users/felixgers/BHT/src/cog1/cog1_JS_template/dojo-release-xxxx/dijit'
		  // }],
		// If the local path to dojo is kept, we can set an absolute path to
		// the cog1 project instead.
		paths : {
			// Absolute path to cog1 project, local directory without
			// HTTP-server:
			// "cog1" : "/Users/felixgers/BHT/src/cog1/cog1_JS_template/cog1"
			//"cog1" : "/Users/felixgers/BHT/src/cog1/cog1_JS_template/cog1"
			//"cog1" : "/home/felix/BHT/src/cog1/cog1_JS_template/cog1"
			// "cog1" : "file:///U:/BHT/src/cog1/cog1_JS_template"
			// On same [maybe local] HTTP-server as used to load dojo:
			//"cog1" : "/BHT/src/cog1/cog1_JS_template/cog1" this one
			// cog1: `${window.location.href}/../cog1`,
			"cog1" : "/../cog1"
			// "cog1" : "/~gers/cog1_sol/cog1"
		},
		// Add one entry for each custom module.
		// This is, among others, necessary to apply the path parameter.
		aliases : [
			["app","cog1/app"],
			["layout","cog1/layout"],
			["ui","cog1/ui"],
			["scene","cog1/scene"],
			["scenegraph","cog1/scenegraph"],
			["createScene","cog1/createScene"],
			["model","cog1/model"],
			["node","cog1/node"],
			["raster","cog1/raster"],
			["shader","cog1/shader"],
			["framebuffer","cog1/framebuffer"],
			["texture","cog1/texture"],
			["animation","cog1/animation"],
			// Template data for models (other models are not aliased here)
			["data","cog1/data"],
			// external (ext)
			["glMatrix","cog1/ext/glMatrix.js"]
		]
	});

	// Load the framework with the re-configured parameters.
	require(["app"], function(app) {
		app.load();
	});
});
