/**
 * Initialize the canvas.
 * Render the scene.
 * @namespace cog1
 * @module scene
 */
define(["exports", "dojo", "dojo/dom-style", "app", "scenegraph", "createScene", "animation", "raster", "shader", "framebuffer", "data", "glMatrix"], //
function(exports, dojo, domStyle, app, scenegraph, createScene, animation, raster, shader, framebuffer, data) {
    "use strict";

	// Variables with initialization parameters.
	//
	// Fill or stroke polygon.
	var fill = false;
	// Display normals for debug.
	var displayNormals = false;
	var defaultNormalLength = 50;
	// Display edges together with normals as default.
	var displayEdges = false;
	// Color for normals and edges, set in init.
	var lineColor3DName = "black";
	var lineColor3D;
	// Display the z-buffer instead of the frame-buffer.
	var debug_zBuffer = false;
	// Display model-view and perspective matrices
	// for the interactive node on the canvas.
	var displayMatrices = true;
	// Show a grid along the axis-planes for debug.
	var showGrid = false;
	// Perform backface culling.
	var backfaceCulling = false;
	// Clean the data on initialization.
	var cleanDataOnInit = false;
	// Set true if triangulation should be performed on the data on init.
	// Which is done anyway, but current data points to the original mesh,
	// if set to false.
	var triangulateDataOnInit = false;
	// Set when triangulation is toggled.
	var dataIsTriangulated = triangulateDataOnInit;
	// Use textures defined in model data.
	var texturing = false;

	// Font for info on canvas (not in GUI) .
	var fontsizeInPt = 10;
	var font = fontsizeInPt + "pt Helvetica normal";
	var fontLineHeightInPt = Math.ceil(fontsizeInPt * 1.5);
	// Default drawing foreground color.
	var defaultColor = "black";
	var defaultTextColor = "grey";
	// Background color and style for the canvas.
	var bgColorCanvas;
	var bgColorStyleCanvas;

	// Module variable to remember and clear the last location of the light marker,
	// which may be outside the clearing rectangle.
	var posLightLocationMarker;

	// Use an exponential tail average.
	var framerate;
	// Number of polygons rendered in the current frame.
	var polycount;

	// Internal module variables.
	//
	// Keep the canvas to access context and parameters.
	var canvas = null;
	// Drawing context for canvas.
	var ctx;
	// Object with x,y,w,h to clear canvas.
	var clearRect = null;

	// Scene is up to date, i.e. nothing changed,
	// all (model-) data has been loaded,
	// no animations are running.
	var upToDate = false;

	// In glMatrix vectors are columns.
	// Thus OpenGL-Matrices have to be transposed.
	//
	// There is one projection matrix for the scene.
	var projection = mat4.identity(mat4.create());
	// The projection type can be set from the UI, see setProjectionType.
	var projectionType = "ortho";
	var projectionTypes = ["ortho", "frustum", "perspective"];
	// Viewport transformation matrix.
	var viewport = mat4.identity(mat4.create());
	// Combined matrix for faster calculation.
	var viewportProjection = mat4.create();

	/**
	 * Create scene with instances of all models.
	 * This should only be done once, also on resize.
	 */
	function init() {
		//console.log("scene.init()");

		// Init data, models, nodes and scene-graph.
		scenegraph.init(triangulateDataOnInit, cleanDataOnInit);

		// Create the scene.
		createScene.init();

		// Avoid an interactive node that is not visible.
		scenegraph.setInteractiveNodeToFirstVisibleNode();		
	}

	/**
	 * Init canvas and graphics-context.
	 * Initialize rendering pipeline.
	 * Init display parameter, projection, viewport and matrices.
	 * Init pipeline module raster and shader.
	 */
	function initPipeline() {
		// Check if there is already a canvas in the scene.
		canvas = dojo.query("canvas")[0];
		if(!dojo.isObject(canvas)) {
			console.error("Scene: No canvas found.")
			return;
		}
		// Get the drawing context.
		if(canvas.getContext) {
			ctx = canvas.getContext("2d");
		}
		// Get background-color from canvas to pass to the framebuffer.
		bgColorStyleCanvas = domStyle.get(canvas, "backgroundColor");
		//console.log("background-color: "+bgColorStyleCanvas);
		var rgb = bgColorStyleCanvas.match(/rgb\((\d+),\s(\d+),\s(\d+)\)/);
		bgColorCanvas = rgb.slice(1, 4);
		//console.log(rgb);
		//console.log(bgColorCanvas);
		// Also store dimension of the canvas in the context,
		// to pass them all together as parameter.
		ctx.width = canvas.width;
		ctx.height = canvas.height;
		// Default display setting.
		ctx.strokeStyle = defaultColor;
		ctx.fillStyle = defaultColor;
		ctx.font = font;
		ctx.textAlign = "left";
		lineColor3D = data.getColorByName(lineColor3DName);

		// Initialize an calculate matrices that do not chance.
		setProjection();
		setViewport();
		calcviewportProjection();

		// Init modules for rendering.
		// Shorthands for width, height, depth.
		animation.init(ctx);
		raster.init(ctx, bgColorCanvas);
		shader.init();
		upToDate = false;
	}


	/**
	 * Set a projection matrix, see setProjectionType().
	 * As a result all vertices inside the frustum
	 * should be in a -1,+1 cube (clip coordinates).
	 * Default is an orthogonal-projection without scaling (z-value will be ignored).
	 * 
	 * @parameter mat is a custom mat4 matrix.
	 */
	function setProjection(matrix) {
	    // Prefer a custom matrix.
		if(matrix) {
			mat4.set(matrix, projection);
		} else {
		    // Start fresh.
            mat4.identity(projection);
            // Right = left.
            var r = ctx.width;
            // Top = bottom.
            var t = ctx.height;
            // Near clipping plane.
            var n = 1;
            // Far clipping plane.
            // Be as deep as wide.
            var f = r;
            
            switch(projectionType){
                case "ortho": {
                    // Set frustum to +- size of the canvas.
                    // This will compensate for the view-port transform.
                    //
                    // glMatrix has a bug. Set near to far to cancel the wrong transform in glMatrix.
                    // mat4.ortho(-r, r, -t, t, 2, 0, projection);
                    // Assume an orthogonal projection with a symmetric frustum.
                    // Projection should be the unity matrix at this point.
                    // See  mat4.multiplyVec4 for indices.
                    projection[0] = n / r;
                    projection[5] = n / t;
                    // We do not clip at the near or far plane,
                    // thus we leave out scaling the z-coordinate.
                    //projection[10] = //-2/f-n;
                    //projection[11] = -(f+n)/(f-n);                    
                    break;
                }
                case "frustum": {
                    // mat4.frustum(left, right, bottom, top, near, far, projection);
                    mat4.frustum(-r, r, -t, t, n, f, projection);
                    break;
                }
                case "perspective": {
                    var fovy = 1;
                    var aspect = r/t;
                    mat4.perspective(fovy, aspect, n, f, projection);
                    break;
                }
                default:{
                    console.error("Unknown projection type.");
                }
            }	    
		}
	}

	/**
	 * Set a default for the viewport matrix.
	 * This may be overwritten.
	 * If you do not do anything here, result will be no transformation.
	 */
	function setViewport() {
		// Center the scene and scale frustum to the canvas.
		// Thus move (0,0,0) to (width/2, height/2,0).
		// See  mat4.multiplyVec4 for indices.
		var w = ctx.width;
		var h = ctx.height;
		var w2 = w / 2.0;
		var h2 = h / 2.0;
		viewport[0] = w2;
		// Flip the world upside down the compensate the coordinates of the canvas.
		viewport[5] = h2;
		viewport[5] *= -1;
		viewport[12] = w2;
		viewport[13] = h2;
		//console.log("viewport: w" + w + " h" + h + " w2 " + w2 + " h2 " + h2);
		//var matrix = [w2, 0, 0, 0,  0, h2, 0, 0,  0, 0, 1, 0,  w2, h2, 1, 1];
		//mat4.set(matrix, viewport);
	}

	function calcviewportProjection() {
		//mat4.multiply(projection, viewport, viewportProjection);
		mat4.multiply(viewport, projection, viewportProjection);
	}

	/**
	 * Run the complete rendering pipeline for all nodes.
	 */
	function render() {
				
		if(upToDate) {
			return true;
		}

		// Measure the render time in ms.
		var startDate = Date.now();
		polycount = 0;

        clearCanvas();

		// Assume all is ready for rendering.
		upToDate = true;

		// A shorthand to the nodes.
		var nodes = scenegraph.getNodes();

		if(showGrid) {
			drawGrid(true, false, false);
		}

		// Check if there is an interactive node or if node is not ready yet.
		// Otherwise we cannot display matrix information for it.
		var foundInteractiveNode = false;

		//console.log("scene.render() notes:" + nodes.length);
		// Loop over all nodes in the scene.
		// Leave out nodes if they are not ready yet
		// and report that.
		for(var i = 0; i < nodes.length; i++) {

			// Verify that node is ready.
			if(!nodes[i].isReady()) {
				upToDate = false;
				// console.log("note not ready:" + i);
				// console.log(nodes[i]);
				// console.log(nodes[i].getModel());
				continue;
			}
			//console.log("nodes[" + i + "] is ready");
			
			// Render the node.
			// Perform modelview, projection and viewport transformations in 3D.
			var worldModelview = nodes[i].updateModelview();

			// Store matrices for interactive node for debug.
			if(scenegraph.isInteractiveNode(i)){
				foundInteractiveNode = true;	
				if(displayMatrices) {
					var interactiveNodeLocalModelview = mat4.create(nodes[i].getLocalModelview());
					var interactiveNodeWorldModelview = mat4.create(worldModelview);
				}							
			}

			// Skip nodes that are not visible.
			if(!nodes[i].isVisible()) {
				continue;
			}

			// Apply the worldModelview matrix to the node.
			// The result is stored in the transformedVertices of node.model.
			nodes[i].applyMatrixToVertices(worldModelview);

			// Apply the viewportProjection matrix to the node.
			// The result is stored in the projectedVertices of node.model.
			nodes[i].projectTransformedVertices(viewportProjection);

			// Transform, i.e. only rotate, normals for shading.
			var worldRotation = nodes[i].updateRotation();
			// Store result in transformed normals.
			nodes[i].applyMatrixToNormals(worldRotation);

			// Display normals for debug.
			if(displayNormals) {
				renderModelNormals(nodes[i].getModel());
			}

			// Raster the 2D polygons of the node.
			renderModel(nodes[i].getModel());
		}

		framebuffer.display();

		// The following text of 2D images are displayed on top of the scene.
		
		// Show location if light in 2D, if shader users it.
		// Draw on top of models.
		if(shader.usesLightLocation()) {//&& ! scenegraph.getPointLightNode()) {
			drawLightLocationMarker();
		}

		// Display data for interactive node.
		displayInfoForNode(scenegraph.getInteractiveNode());
		// Display
		if(displayMatrices && foundInteractiveNode) {
			// Display matrices that are common for all nodes.
			displayViewProjectionMatrices();
			// Display matrices for interactive node for debug.
			displayModelViewMatrix(scenegraph.getInteractiveNodename(), interactiveNodeWorldModelview, interactiveNodeLocalModelview);
			// Display local transformation vectors.
			displayTransformationVectorsForNode(scenegraph.getInteractiveNode());
		}


		if(upToDate) {
			displayRenderStatistics(startDate);
		}

		return upToDate;
	}

	/**
	 * Rasterization, interpolation and shading.
	 */
	function renderModel(model) {
		var modelData = model.getData();
		var vertices = model.getProjectedVertices();
		var polygons = modelData.polygonVertices;
		var polygonNormals = model.getTransformedPolygonNormals();
		var textureCoord = modelData.textureCoord;
		var texture = texturing ? model.getTexture() : null;

		// Reset the colors of the model.
		// They are modified from texture sampling.
		// Colors may be shared by different models,
		// if the default colors from the data module are referenced.
		if(!texturing || !texture) {
			data.resetColors.call(modelData);
		}
		// Register the current model with the shader.
		shader.setModel(model);

		// Loop over polygons in model.
		for(var p = 0; p < polygons.length; p++) {

			// Prepare the data of polygon p to pass to scanline.
			var polygon = polygons[p];
			var normal = polygonNormals[p];
			var color = modelData.colors[modelData.polygonColors[p]];
			if(texture != null) {
				var polygonTextureCoord = modelData.polygonTextureCoord[p];
			}

			// To fill the polygon, we want at least a triangle to proceed.
			if(fill && polygon.length < 3) {
				continue;
			}

			// BEGIN exercise Back-Face Culling

			// Back-face culling.
			// Check if polygon is facing away from the camera (in negative z-direction).

			if (normal[2]<0 && backfaceCulling){
				continue;
			}

			// END exercise Back-Face Culling
						
			// Register the current polygon with the shader.
			shader.setPolygon(p);

			// Fill polygon.
			if(fill) {
				raster.scanlineFillPolygon(vertices, polygon, color, textureCoord, polygonTextureCoord, texture);
			} else if(!displayEdges) {
				// Stroke with colored edges.
				raster.scanlineStrokePolygon(vertices, polygon, color);
			}

			// Stroke polygon edges on top to see edges
			// (and to cover up (a bit) for edge fighting).
			if(displayEdges) {
				raster.scanlineStrokePolygon(vertices, polygon, lineColor3D);
			}
			polycount++;
		}
	}

	/**
	 * Create some debug geometry for the normals on the fly
	 * and apply view-port transformation and projection and rasterization to it.
	 * For lighting the normals are not projected, it is done here for debug display only.
	 */
	function renderModelNormals(model) {
		var modelData = model.getData();
		var vertices = model.getProjectedVertices();
		var polygons = modelData.polygonVertices;
		var vertexNormals = model.getTransformedVertexNormals();
		var polygonNormals = model.getTransformedPolygonNormals();
		// For display (but not for light calculations) normals
		// have to undergo perspective and view transformations
		// without the translation part.
		var perspectiveNormal = [0, 0, 0, 0];

		var polygonCenter;
		// Loop over polygons in model.
		for(var p = 0; p < polygons.length; p++) {

			var polygon = polygons[p];
			var normal = polygonNormals[p];

			// BEGIN exercise Back-Face Culling

			// Back-face culling.
			// Check if polygon is facing away from the camera (in negative z-direction).

			if (backfaceCulling && normal[2]<0 ){
				continue;
			}

			// END exercise Back-Face Culling

			// The average of all vertices as debug geometry for the normals.
			polygonCenter = [0, 0, 0];

			// Loop over vertices/edges in polygon.
			for(var v = 0; v < polygon.length; v++) {

				// viewportProjection for vertex-normal.
				var vertexIndex = polygon[v];
				vec3.set(vertexNormals[vertexIndex], perspectiveNormal)
				mat4.multiplyVec4(viewportProjection, perspectiveNormal);
				// Draw normal for vertex.
				renderNormal(vertices[vertexIndex], perspectiveNormal);

				// Accumulate vertices to calculate center of polygon.
				vec3.add(polygonCenter, vertices[vertexIndex]);
			}
			vec3.scale(polygonCenter, (1.0 / polygon.length));

			// viewportProjection for polygon-normal.
			vec3.set(normal, perspectiveNormal)
			mat4.multiplyVec4(viewportProjection, perspectiveNormal);
			// Draw normal for polygon beginning in the averaged center.
			renderNormal(polygonCenter, perspectiveNormal);
		}
	}

	/**
	 * Renders a normal as a line taking care of projection
	 * and view-port and scaling it.
	 */
	function renderNormal(_startPoint, normal, scale) {

		if(scale == undefined) {
			scale = defaultNormalLength;
		};
		// To apply transformations make a working copy.
		var startPoint = vec3.create();
		vec3.set(_startPoint, startPoint);
		var endPoint = vec3.create();
		var scaledNormal = vec3.create();
		vec3.scale(normal, scale, scaledNormal);

		vec3.add(startPoint, scaledNormal, endPoint);

		raster.drawLineBresenhamGivenStartEndPoint(startPoint, endPoint, lineColor3D);
	}

	function clearLightLocationMarker() {
		if(!posLightLocationMarker) {
			return;
		}
		var x = posLightLocationMarker[0];
		var y = posLightLocationMarker[1];
		//var z = posLightLocationMarker[2];
		// Assume z max = 500.
		var radius = 20;
		var diameter = 2 * radius;
		ctx.clearRect(x - radius, y - radius, diameter, diameter);
	}

	function drawLightLocationMarker() {
		// Get light position in world coordinates.
		posLightLocationMarker = vec3.create(shader.getLightPosition());
		// Transform to viewport.
		mat4.multiplyVec3(viewportProjection, posLightLocationMarker);
		var x = posLightLocationMarker[0];
		var y = posLightLocationMarker[1];
		var z = posLightLocationMarker[2];
		// The size/radius depends on z position of light.
		// Assume z in [-500,+500]
		var r = Math.floor((z + 500) / 100) + 5;
		var quater = Math.PI * 0.5;
		ctx.fillStyle = "grey";
		// Background circle.
		ctx.beginPath();
		ctx.arc(x, y, r, 0, 4 * quater);
		ctx.fill();
		// Two filled quarter arcs.
		ctx.fillStyle = "orange";
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(x + r, y)
		ctx.arc(x, y, r, 0, quater);
		ctx.lineTo(x, y)
		ctx.lineTo(x - r, y)
		ctx.arc(x, y, r, 2 * quater, 3 * quater);
		ctx.fill();
		// A black cross.
		ctx.strokeStyle = "black";
		ctx.beginPath();
		ctx.moveTo(x - r, y);
		ctx.lineTo(x + r, y)
		ctx.moveTo(x, y - r);
		ctx.lineTo(x, y + r)
		ctx.stroke();
		// Reset color.
		ctx.strokeStyle = defaultColor;
		ctx.fillStyle = defaultColor;
	}

	/**
	 * Draw grids in xy, xz, yz planes for debug.
	 * @parameter xy, xz, yz are boolean.
	 */
	function drawGrid(xy, xz, yz) {
		var range = 500;
		var step = 10;
		var color = data.getColorByName("grey");
		var i;
		var drawLine = function(varIndex, constIndex) {
			var startPoint = [0, 0, 0];
			var endPoint = [0, 0, 0];
			//var normal = [1, 1, 1];
			startPoint[varIndex] = i;
			startPoint[constIndex] = -range;
			endPoint[varIndex] = i;
			endPoint[constIndex] = +range;
			//normal[varIndex] = 0;
			//normal[constIndex] = 0;
			mat4.multiplyVec3(viewportProjection, startPoint, startPoint);
			mat4.multiplyVec3(viewportProjection, endPoint, endPoint);
			raster.drawLineBresenhamGivenStartEndPoint(startPoint, endPoint, color);
		}
		for( i = -range; i <= range; i += step) {
			for(var j = -range; j <= range; j += range) {
				if(xy) {
					drawLine(0, 1);
					drawLine(1, 0);
				}
				if(xz) {
					drawLine(0, 2);
					drawLine(2, 0);
				}
				if(yz) {
					drawLine(1, 2);
					drawLine(2, 1);
				}
			}
		}
	}

	/**
	 * Display Projection and View-port matrices.
	 */
	function displayViewProjectionMatrices() {
		displayMatrix("Projection", projection, 10, 100);
		displayMatrix("Viewport", viewport, 10, 200);
		displayMatrix("Projection-Viewport", viewportProjection, 10, 300);
	}

	function displayModelViewMatrix(nodename, worldModelview, localModelview) {
		displayMatrix("Local Modelview", localModelview, ctx.width - 190, 100);
		displayMatrix("World Modelview", worldModelview, ctx.width - 190, 200);
	}

	/**
	 * Display the transformation vectors for a node.
	 */
	function displayTransformationVectorsForNode(node) {
		displayVector("translation", node.transformation.translate, ctx.width - 190, 300);
		displayVector("rotation", node.transformation.rotate, ctx.width - 190, 330);
		displayVector("scale", node.transformation.scale, ctx.width - 190, 360);
		displayVector("shear", node.transformation.shear, ctx.width - 190, 390);
	}
	
	/**
	 * Display name texture etc for (interactive) node.
	 */
	function displayInfoForNode(node) {
		var str = "interactive node";

		if(!node.isVisible()){
			str += " is not visible"; 
		}
		str += ": "+node.name;
		var texture = scenegraph.getTextureNameForNode(node);
		if(texture){
			str += " ("+texture+")";		
		}

		displayText(str, undefined, ctx.height-10, true);
	}

	function displayVector(name, vec, xOffset, yOffset) {
		ctx.fillStyle = defaultTextColor;
		var str = "";
		var x = xOffset || 0, y = yOffset || 0;
		ctx.fillText(name + ":", x, y);
		x += fontLineHeightInPt;
		y += fontLineHeightInPt;
		for(var i = 0; i < 3; i++) {
			str += vec[i].toFixed(2) + "  ";
		}
		ctx.fillText(str, x, y);
		// Reset color.
		ctx.fillStyle = defaultColor;
	}

	/**
	 * Display a matrix for debug.
	 * The matrix is transposed for easier formatting.
	 * @parameter name of the matrix for debug, matrix and position on canvas
	 */
	function displayMatrix(name, _matrix, xOffset, yOffset) {
		var matrix = mat4.create();
		mat4.transpose(_matrix, matrix);
		ctx.fillStyle = defaultTextColor;
		var str;
		var x = xOffset || 0, y = yOffset || 0;
		ctx.fillText(name + ":", x, y);
		x += fontLineHeightInPt;
		y += fontLineHeightInPt;
		var index = 0;
		// Loop over rows.
		for(var i = 0; i < 4; i++) {
			str = "";
			// Assemble one line/row in a string.
			for(var j = 0; j < 4; j++) {
				str += matrix[index].toFixed(2) + "  ";
				index++;
			}
			ctx.fillText(str, x, y);
			y += fontLineHeightInPt;
		}
		// Reset color.
		ctx.fillStyle = defaultColor;
	}

	/**
	 * Calculate the render time in ms if scene has finished.
	 */
	function displayRenderStatistics(startDate) {

		// Calculate frame-rate.
		var curDate = Date.now();
		var frameDuration = (curDate - startDate);
		var curFramerate;
		if(!frameDuration) {
			curFramerate = 0;
		} else {
			curFramerate = 1000 / frameDuration;
		}
		// Calculate an exponential tail average.
		if(framerate == undefined) {
			framerate = curFramerate;
		} else {
			framerate = framerate * 0.95 + curFramerate * 0.05;
		}
		var str = "frames: " + curFramerate.toFixed(1) + " <" + framerate.toFixed(1) + ">";
		//console.log(str);
		displayText(str, 10, 18, true);

		// Display polycount.
		if(polycount != 0) {
			str = "polys: " + polycount;
			//console.log(str);
			displayText(str, 10, 38, true);
		}
	}

    //////////////////////////////////////////
    //////// Utility functions
    //////////////////////////////////////////

    /**
     * Clear all or part of the canvas,
     * depending on the dirty rect from the framebuffer.
     * 
     * @parameter clearAll clears the entire canvas.
     */
    function clearCanvas(clearAll){
        // Reset the framebuffer to prepare it for the next frame.
        clearRect = framebuffer.reset();

        // Clear the canvas from debug info and from the
        // remains of the last (maybe larger) dirty rectangle.
        if(clearRect == null || displayMatrices || clearAll) {
            // Reset all to clear the text.
            ctx.clearRect(0, 0, ctx.width, ctx.height);
        } else {
            ctx.clearRect(clearRect.x, clearRect.y, clearRect.w, clearRect.h);
            //ctx.strokeRect(clearRect.x, clearRect.y, clearRect.w, clearRect.h);
            // Clean frame-counter.
            ctx.clearRect(0, 0, 150, 30);
            clearLightLocationMarker();
        }        
    }

	/**
	 * Display a text message on the canvas. 
	 */
	function displayMessage(text, pos) {
		// Position at top center.
		var	x = 160+ctx.width/6;
		var y = 0;
		// Position at bottom left.
		// var	x = undefined;
		// var y = ctx.height-10;
		displayText(text, x, y, true);
	}

	/**
	 * Display some text on the canvas for debug.
	 */
	function displayText(text, xOffset, yOffset, clearfirst) {
		var x = xOffset || 10, y = yOffset || 18;

		// Clear first.
		if(clearfirst) {
			var clearWidth = text.length * fontLineHeightInPt * 0.6;
			ctx.fillStyle = bgColorStyleCanvas;
			ctx.fillRect(x, y - fontLineHeightInPt, clearWidth, 1.8 * fontLineHeightInPt);
		}

		ctx.fillStyle = defaultTextColor;
		ctx.fillText(text, x, y);
		// Reset color.
		//ctx.fillStyle = defaultColor;
	}

	//////////////////////////////////////////
	//////// UI Interface functions
	//////////////////////////////////////////

	function toggleFill() {
		fill = !fill;
		setUpToDate();
	}

	function toggleDebugZBuffer() {
		debug_zBuffer = !debug_zBuffer;
		setUpToDate();
	}

	function toggleBackfaceCulling() {
		backfaceCulling = !backfaceCulling;
		setUpToDate();
	}

	function toggleDebugNormals() {
		displayNormals = !displayNormals;
		setUpToDate();
	}

	function toggleDebugEdges() {
		displayEdges = !displayEdges;
		setUpToDate();
	}

	function toggleShowGrid() {
		showGrid = !showGrid;
		setUpToDate();
	}

	function toggleDisplayMatrices() {
		displayMatrices = !displayMatrices;
		if(!displayMatrices) {
            // Clear remains once if disabled.
            clearCanvas(true);		    
    	}
		setUpToDate();
	}

	/*
	 * Switch between original data and triangulation result.
	 */
	function toggleTriangulation() {
		scenegraph.toggleTriangulation();
		dataIsTriangulated = !dataIsTriangulated;
		setUpToDate();
	}

	function toggleTexturing() {
		texturing = !texturing;
		setUpToDate();
	}

	//////////////////////////////////////////
	//////// getter/setter functions for UI
	//////////////////////////////////////////

	/**
	 * When nodes are modified or some other interaction occurred,
	 * the scene needs re-rendering.
	 * Tell the app to restart the render loop, which calls the scene in turn.
	 * @parameter val default is false.
	 */
	function setUpToDate(val) {
		//console.log("scene.setUpToDate()...");
		upToDate = val || false;
		// Tell app to run the loop.
		if(!upToDate) {
			app.requestUpdate();
		}
	}

	function getUpToDate() {
		return upToDate;
	}

	function getCtx() {
		return ctx;
	}

	function getFill() {
		return fill;
	}

	function getDisplayNormals() {
		return displayNormals;
	}

	function getDisplayEdges() {
		return displayEdges;
	}

	function getDataIsTriangulated() {
		return dataIsTriangulated;
	}

	function getTexturing() {
		return texturing;
	}

	function getDebug_zBuffer() {
		return debug_zBuffer;
	}

	function getBackfaceCulling() {
		return backfaceCulling;
	}

	function getShowGrid() {
		return showGrid;
	}

	function getDisplayMatrices() {
		return displayMatrices;
	}
	
	/**
     * @parameter projectionType can be one in projectionTypes.
     */
    function setProjectionType(_projectionType){
        // Default is ortho.
        if(! projectionType){
            projectionType = "ortho";
        } else {
            projectionType = _projectionType;
        }
        setProjection();
        calcviewportProjection();
    }


    function getProjectionType(){
        return projectionType;
    }

    /**
     * Check the current projection type.
     */
    function isProjectionType(_projectionType){
        if(projectionType == _projectionType){
            return true;
        } else {
            return false;
        }
    }


	// Public API.
	exports.init = init;
	exports.initPipeline = initPipeline;
	exports.render = render;
	exports.displayText = displayText;
	exports.displayMessage = displayMessage;
	// GUI switches.
	exports.toggleFill = toggleFill;
	exports.toggleDebugNormals = toggleDebugNormals;
	exports.toggleDebugEdges = toggleDebugEdges;
	exports.toggleTriangulation = toggleTriangulation;
	exports.toggleDebugZBuffer = toggleDebugZBuffer;
	exports.toggleBackfaceCulling = toggleBackfaceCulling;
	exports.toggleShowGrid = toggleShowGrid;
	exports.toggleDisplayMatrices = toggleDisplayMatrices;
	exports.toggleTexturing = toggleTexturing;
	// Public getter/setter for variables.
	exports.setUpToDate = setUpToDate;
	exports.getUpToDate = getUpToDate;
	exports.getCtx = getCtx;
	exports.getFill = getFill;
	exports.getDisplayNormals = getDisplayNormals;
	exports.getDisplayEdges = getDisplayEdges;
	exports.getDataIsTriangulated = getDataIsTriangulated;
	exports.getDebug_zBuffer = getDebug_zBuffer;
	exports.getBackfaceCulling = getBackfaceCulling;
	exports.getShowGrid = getShowGrid;
	exports.getDisplayMatrices = getDisplayMatrices;
	exports.getTexturing = getTexturing;
    exports.setProjectionType = setProjectionType;
    exports.getProjectionType = getProjectionType;
    exports.isProjectionType = isProjectionType;
    // Public constants.
    exports.projectionTypes = projectionTypes;
});
