/**
 * Framebuffer is used buffer the rendering output and to draw to the canvas.
 * Z-Buffer is included in this module.
 *
 * For pixel manipulation in imageData see:
 * http://jsperf.com/canvas-pixel-manipulation
 * http://www.javascripture.com/Float32Array
 *
 * @namespace cog1
 * @module framebuffer
 */
define(["exports", "scene"], function(exports, scene) {
    "use strict";

	// Drawing context for canvas.
	var ctx;
	// Width and Height of the ctx for fast access.
	var width;
	var height;

	// We remember the size of the buffers for speedup.
	// Bytes (assuming one byte per channel) in a frame.
	var bufSize;
	var zBufSize;

	// Framebuffer as ImageData with size of canvas * 4 (rgba).
	// Thus we use a 1D buffer as storage.
	// We assume that the dimension of the canvas pixel match the CSS pixel.
	var imageData;
	// The data reference of the buffer (imageData.data).
	var framebuffer;

	// Z-Buffer, with size number of pixels.
	// Stores z-coordinate as floats.
	// Internal variable,  for z-buffer.
	//  Float 32 bit View on zBuffer (with ArrayBuffer).
	var zBuf;

	// Buffer (of type DataView with Arraybuffer) for fast reset.
	// Reset buffer are filled with the background color
	// an copied to buf for reset.
	var resetBuffer32;
	var resetZBuffer;

	// For z buffer. Camera look in -z direction.
	var maxDistance = -10000;
	// Background color rgb
	var bgColor = [255, 255, 255, 255];
	// "white";

	// Rectangle with region of modified pixel.
	// We only repazBuf[i] the dirty rectangle.
	var dirtyRect = {
		x : undefined,
		y : undefined,
		xMax : undefined,
		yMax : undefined,
		width : undefined,
		height : undefined
	};

	/**
	 * @parameter _ctx is a 2D context of the canvas.
	 * @parameter _bgColor is an rgb array.
	 */
	function init(_ctx, _bgColor) {
		ctx = _ctx;
		width = ctx.width;
		height = ctx.height;
		// Calculate size for rgba pixel.
		bufSize = width * height * 4;

		if(_bgColor != undefined) {
			// Create a new local array, not a slow remote reference,
			// and not as a string but as a number ("255" != 255).
			for(var i = 0; i < _bgColor.length; i++) {
				bgColor[i] = Number(_bgColor[i]);
			}
			// Set alpha.
			bgColor[3] = 255;
		}

		// Initialize the frame-buffer.
		// console.log("framebuffer: " + width + " " + .height);
		imageData = ctx.getImageData(0, 0, width, height);
		framebuffer = imageData.data;
		if((width != imageData.width) || (height != imageData.height)) {
			console.log("WARNING: Dimension of the canvas pixel match the CSS pixel.");
		}
		// Initialize the zBuffer.
		zBufSize = width * height;
		zBuf = new Float32Array(zBufSize);

		initResetBuffer();

		// Reset to initialize framebuffer and z-buffer.
		setMaxDirtyRect();
		reset();
	}

	function initResetBuffer() {
		var r = bgColor[0];
		var g = bgColor[1];
		var b = bgColor[2];
		var a = bgColor[3];
		var bgcolor = (a << 24) | (b << 16) | (g << 8) | r;
		resetBuffer32 = new Uint32Array(bufSize/4);

		// Initialize color of the reset buffer to bgColor.
		var nEndIndex = bufSize / 4;
		for(var i = 0; i < nEndIndex; ++i) {
			resetBuffer32[i] = bgcolor;
		}
		resetZBuffer = new Float32Array(zBufSize);
		for(var i = 0; i < zBufSize; i++) {
			resetZBuffer[i] = maxDistance;
		}
	}

	/**
	 * Perform zBuffer test.
	 * @parameter color is an object-array with rgba values
	 * @return true on pass.
	 */
	function zBufferTest(x, y, z, color) {

		var indexZBuf = y * width + x;

		// BEGIN exercise Z-Buffer
		// Z-Buffer pixel starts a frame as undefined.
		// The first access on a pixel does not need a test.
		let current = zBuf[indexZBuf];

		if (current === maxDistance) {
			zBuf[indexZBuf] = z;
			return true;
		}

		//if (color.colorname === 'magenta') {
		//console.log('Wanted:', z, 'Current:', current);
		//}

		// On z-buffer fights color black should win to emphasize debug edges.
		// Use some small epsilon to determine z-buffer fights
		// in favor of the the polygon processed first or last (depending on sign).
		// Epsilon depends on the z-range of the scene.

		// Guess some decent epsilon (which may be >1 despite the name).
		let e = 1;

		if (z - current >= e || z - current <= -e) {
			if (z - current > 0) {
				zBuf[indexZBuf] = z;
				return true;
			}
		}

		// The camera is in the origin looking in negative z-direction.


		// END exercise Z-Buffer

		return false;
	}

	/**
	 * Set a pixel/fragment in the frame-buffer and in z-buffer.
	 * Check range should be done in raster.
	 * On scan-line z-buffer test and dirty rectangle adjust my be skipped.
	 *
	 * @parameter color is an object with colorname : rgba values
	 * @parameter  doZBufferTest is done per default if not given.
	 * @parameter adjustDirtyRect is done per default if not given.
	 */
	function set(x, y, z, color, doZBufferTest, adjustDirtyRect) {


		// Check range could be done in raster.
		// It is done here to cover (horizontal) clipping artifacts.
		// There is no range check in Bresenham (used for edges).
		if(x < 0 || y < 0 || x >= width || y >= height) {
			//console.log("Error: Framebuffer out of range: " + x + " ," + y);
			return;
		}

		if(doZBufferTest == undefined || doZBufferTest == true) {
			// Perform zBuffer-test (default).
			if(! zBufferTest(x, y, z, color)) {
				return;
			}
		}

		if(adjustDirtyRect == undefined || adjustDirtyRect == true) {
			adjustDirtyRectangle(x, y);
		}

		// Used shaded color.
		var rgba = color.rgbaShaded;

		// Set color in framebuffer.
		// Index in frame-buffer.
		var index = (y * width + x) * 4;
		framebuffer[index] = rgba[0]; // red
		framebuffer[++index] = rgba[1]; // green
		framebuffer[++index] = rgba[2]; // blue
		framebuffer[++index] = rgba[3]; // alpha
		// force alpha to 100%.
		// framebuffer[index + 3] = 255;
		// Also slower:
		//framebuffer.set(color.rgbaShaded, index);
	}

    /**
     * Set to the min values.
     * Canvas coordinates range [0,width|height-1].
     */
    function resetDirtyRect() {
        dirtyRect.x = width - 1;
        dirtyRect.y = height - 1;
        dirtyRect.xMax = 0;
        dirtyRect.yMax = 0;
    }

    /**
     * Set to the max values. Used for initial reset.
     */
    function setMaxDirtyRect() {
        dirtyRect.x = 0;
        dirtyRect.y = 0;
        dirtyRect.xMax = width - 1;
        dirtyRect.yMax = height - 1;
    }

	/**
	 * Adjust the dirty rectangle adding a point.
	 * Check of correct the range must be done before.
	 */
	function adjustDirtyRectangle(x, y) {
		if(x < dirtyRect.x) {
			dirtyRect.x = x;
		} else if(x > dirtyRect.xMax) {
			dirtyRect.xMax = x;
		}
		if(y < dirtyRect.y) {
			dirtyRect.y = y;
		} else if(y > dirtyRect.yMax) {
			dirtyRect.yMax = y;
		}
	}

	/**
	 * Reset framebuffer and z-buffer.
	 * Called before every frame or to clear.
	 * Values are reset by copying buffers.
	 *  @returns clearect object, i.e., the last dirty rect to be cleared in scene.
	 *  or null if nothing is to be cleared.
	 */
	function reset() {

		var dirtyStartIndex = dirtyRect.y * width + dirtyRect.x;
		var dirtyEndIndex = dirtyRect.yMax * width + dirtyRect.xMax;
		var dirtyWidth;
		var dirtyData, dirtyDataReset;
		// Return null if nothing is to be cleared on the canvas.
		var clearrect = null;


		// Check if there was anything drawn.
		if(dirtyEndIndex > dirtyStartIndex) {
			// Dirty width in 4 bytes.
			dirtyWidth = dirtyEndIndex - dirtyStartIndex;
			// Reset zBuffer (may be set to undefined instead of maxDistance).
			// Cut rectangles as views fitting the dirtyRect.
			// Parameter: Offset in bytes, length is number of floats (with 4 bytes each).
			dirtyStartIndex *= 4;
			dirtyData = new Float32Array(zBuf.buffer, dirtyStartIndex, dirtyWidth);
			dirtyDataReset = new Float32Array(resetZBuffer.buffer, 0, dirtyWidth);
			dirtyData.set(dirtyDataReset);
			// zBuffer reset in loops.
			// This is slower. Use only if above does not work on device.
			// for(var i = dirtyStartIndex; i < dirtyEndIndex; i++) {
			// zBuf[i] = maxDistance;
			// }

			// Reset framebuffer to bgColor.
			dirtyEndIndex *= 4;
			// Dirty width in bytes.
			dirtyWidth = dirtyEndIndex - dirtyStartIndex;
			// console.log("dirtyWidth:" + dirtyWidth);
			// console.log("dirtyStartIndex:" + dirtyStartIndex + " dirtyEndIndex:" + dirtyEndIndex);
			// console.log("dirtyRect x y xMax yMax  " + dirtyRect.x + " " + dirtyRect.y + " " + dirtyRect.xMax + " " + dirtyRect.yMax);
			// Cut rectangles  as views fitting the dirtyRect.
			dirtyData = new Uint8ClampedArray(framebuffer.buffer, dirtyStartIndex, dirtyWidth);
			dirtyDataReset = new Uint8ClampedArray(resetBuffer32.buffer, 0, dirtyWidth);
			dirtyData.set(dirtyDataReset);

            // framebuffer reset in loops.
            // This is slower. Use only if above does not work on device.
            // for( i = dirtyStartIndex; i < dirtyEndIndex; i += 4) {
            // framebuffer[i] = r;
            // framebuffer[i + 1] = g;
            // framebuffer[i + 2] = b;
            // framebuffer[i + 3] = a;

            var clearRect = {
                x : dirtyRect.x,
                y : dirtyRect.y,
                // Add 1 to include the max edge.
                w : dirtyRect.xMax - dirtyRect.x + 1,
                h : dirtyRect.yMax - dirtyRect.y + 1
            };
        }

		resetDirtyRect();

		return clearRect
	}

	/**
	 * Copy the buffer onto the canvas.
	 */
	function display() {

		if(scene.getDebug_zBuffer()) {
			MultiplyFramebufferWithZBuffer(true);
		}

		dirtyRect.width = dirtyRect.xMax - dirtyRect.x;
		dirtyRect.height = dirtyRect.yMax - dirtyRect.y;
		// Check if nothing changed.
		if(dirtyRect.width < 0 || dirtyRect.height < 0) {
			return;
		} else {
			// Add one pixel to include the max.
			dirtyRect.width++;
			dirtyRect.height++;
		}

		//console.log("dirtyRect x y w h  " + dirtyRect.x + " " + dirtyRect.y + " " + dirtyRect.width + " " + dirtyRect.height);
		ctx.putImageData(imageData, 0, 0, dirtyRect.x, dirtyRect.y, dirtyRect.width, dirtyRect.height);
	}

	/**
	 * Scale the z-buffer for visualization to interval [0,1].
	 */
	function scaleZBuffer() {
		// Initialize z-min and z-max (maxDistance is large negative)
		// reversed, complementary and scale linearly.
		var min = -maxDistance;
		var max = maxDistance;
		// Get min and max.
		for(var i = 0; i < zBufSize; i++) {
			if(zBuf[i] == maxDistance)
				continue;
			if(zBuf[i] > max) {
				max = zBuf[i];
			} else if(zBuf[i] < min) {
				min = zBuf[i];
			}
		}
		var range = Math.abs(max - min);
		if(range == 0)
			range = 1;
		//console.log("min="+min+" max="+max+" range="+range);
		// Scale between min and max.
		for(var i = 0; i < zBufSize; i++) {
			if(zBuf[i] == maxDistance) {
				continue;
			}
			// Set offset to zero (also if min is negative) than scale.
			zBuf[i] = (zBuf[i] - min) / range;
		}
	}

	/**
	 * Multiply the z-buffer for visualization to interval [0,1].
	 */
	function MultiplyFramebufferWithZBuffer(greyOnly) {

		scaleZBuffer();

		var dirtyStartIndex = dirtyRect.y * width + dirtyRect.x;
		var dirtyEndIndex = dirtyRect.yMax * width + dirtyRect.xMax;

		for(var i = dirtyStartIndex; i < dirtyEndIndex; i++) {
			var z = zBuf[i];
			var j = i * 4;
			// Set the bgColor if z not maxDistance, which is not
			// scaled.
			if(z != maxDistance) {
				z = 1 - z;
				if(greyOnly) {
					z *= 255.0;
					framebuffer[j] = z;
					framebuffer[j + 1] = z;
					framebuffer[j + 2] = z;
					// framebuffer[j + 3] = z // Alpha remains.
				} else {
					framebuffer[j] *= z;
					framebuffer[j + 1] *= z;
					framebuffer[j + 2] *= z;
				}
			}
		}
	}

	// Public API.
	exports.init = init;
	exports.set = set;
	exports.zBufferTest = zBufferTest;
	exports.adjustDirtyRectangle = adjustDirtyRectangle;
	exports.reset = reset;
	exports.display = display;
	// Constants.
	exports.maxDistance = maxDistance;
});
