/**
 * Load texture and sample via a texture-canvas.
 *
 * For loading local files, see:
 * http://www.chromium.org/developers/how-tos/run-chromium-with-flags
 *	Use on chrome: --allow-file-access-from-files
 *
 * For texture mapping see:
 * http://de.wikipedia.org/wiki/Texture_Mapping
 *
 * @namespace cog1.texture
 * @module texture
 */
define(["exports", "dojo/dom-construct"], function(exports, domConstruct) {
    "use strict";

	/**
	 * Sample a color from a texture object (with an image stored in imageData),
	 * which must be set as this.
	 * The origin of the image data is at the top left.
	 * Origin of uv-coordinates is at the left bottom, see data module.
	 *
	 * Use the nearest neighbor as default.
	 *
	 * @parameter color (rgba part) to the modified with texel color.
	 * @parameter uvVec (x,y with origin top left) 2D texel coordinates vector.
	 * @return none (Modify the color object).
	 */
	function sample(uvVec, color) {
		// Check in for procedural textures.
		//return sampleProceduralGRB(uvVec, color);
		if(this.sampleProcedural){
			this.proceduralSampleFunction(uvVec, color);
			return;
		}

		// Shorthands matching different origins and mapping.
		var u = uvVec[0];
		// Flip y-axis from openGL texture- to image-coordinates. 
		var v = 1 - uvVec[1];

		var rgba = color.rgba;
		// Loaded texture data.
		var textureRGBA = this.imageData;

		// Index into the texture image.
		var index;		

		// BEGIN exercise Texture
		
		// Use ~~ bitwise not not or alternatively >> 0 to cast to integer.
		// The uv-range [0,1] (including 1) has to be mapped on
		// image pixel ranges [0,width-1] and [0,height-1].
		// Short form: index = 4*~~(((this.width * ~~(this.height * v) + this.width * u)));

		// Calculate horizontal texel index.
		// Correct sample for u=1.

		// Calculate vertical texel index.

		// Correct sample for v=1.

		
		// Step index to beginning of horizontal texel line.

		// Add horizontal texel index.

		// Cast to integer.

		// Four bytes per Pixel.


		// END exercise Texture
	}


	/**
	 * Generate procedural texture.
	 * If the texture name, specified in createScene, does not contain a dot
	 * the create function takes it as a function name for procedural sampling.
	 * 
	 * See sample function for parameter and return.
	 */
	function sampleProceduralRGB(uvVec, color) {
		// Shorthands.
		var u = uvVec[0];
		var v = uvVec[1];

		var rgba = color.rgba;
		
		// Generated rgb colors in the corners.
		rgba[0] = (u * 255) >> 0;
		rgba[1] = (v * 255) >> 0;
		rgba[2] = ((1 - u + v) * 0.5 * 255) >> 0;
		rgba[3] = 255;

		// BEGIN exercise Procedural Texture
		
		// Think of your own texture.
		// Maybe a regular checkerboard pattern.

		// END exercise Procedural Texture
	}

	/**
	 * Linear 4-point merged sampling.
	 */
	function sampleMerge4(uvVec, color) {
	}

	/**
	 *
	 * Load an image and return a texture object.
	 * Access to the texture data is realized via a texture canvas.
	 * If the texture name does not contain a dot take it as a function
	 * name for procedural sampling. 
	 *
	 * NOTE: if you run locally and get an error here and using chrome
	 * you may need to pass --allow-file-access-from-files to chrome.
	 *
	 * @parameter URL of image
	 * @parameter callback after load of image.
	 *
	 * @returns texture object including canvas/imageData for sampling and
	 *          references to texture coordinates arrays in modelData.
	 */
	function create(textureURL, callback) {
		//console.log("texture.create: "+textureURL);
		var texture = {
			sample : sample,
			sampleProcedural : false,
			proceduralSampleFunctionName : "sampleProceduralRGB",
			// Keep the URL for UI and debug.
			textureURL : textureURL
		};
		// Set procedural sampling function if not dot is found in URL.
		if(String(textureURL).indexOf(".") == -1){
			texture.proceduralSampleFunctionName = textureURL;
			texture.proceduralSampleFunction = this[textureURL];
			texture.sampleProcedural = true;
			callback();
			return texture;
		}
		// Image object to load image as src.
		texture.image = new Image();
		texture.image.data = null;
		texture.image.ready = false;
		texture.image.crossOrigin = "Anonymous";
		texture.image.onload = function() {
			// Set the canvas width and height to the size of the texture image.
			texture.width = this.width;
			texture.height = this.height;
			// Create a canvas to read out pixel/texel from image.
			texture.canvas = domConstruct.create("canvas", {width:texture.width, height:texture.height}, dojo.body(), "last");
			var ctx = texture.canvas.getContext('2d');
			// Transfer texture data onto the canvas.
			ctx.drawImage(this, 0, 0);
			try {
				texture.imageData = ctx.getImageData(0, 0, texture.width, texture.height).data;
			} catch (ex) {
				console.error("Image data could not be loaded: textures/" + textureURL);
				console.error("If on local file protocoll (file:///):");
				console.error("Try --allow-file-access-from-files with chrome");
			}
			// Discard the original image as the data is stored on the image canvas as well.
			texture.image = null;
			callback();
		}
		// Assume texture are in the "textures" sub-directory.
		texture.image.src = "textures/"+textureURL;
		return texture;
	}

	// Public API.
	exports.create = create;
	// Procedural sample functions.
	exports.sampleProceduralRGB = sampleProceduralRGB;
});
