/**
 * The user interface UI communicates with the app and with the scene.
 *
 * @namespace cog1
 * @module ui
 */
define(["exports", "app", "layout", "scene", "scenegraph", "animation", "shader", "dojo", "dojo/sniff", "dojo/html", "dojo/on", "dojo/dom", "dojo/dom-construct", "dojo/dom-style", "dojo/dom-prop", "dojo/mouse", "dijit/form/Button", "dijit/form/ToggleButton", "dijit/form/RadioButton", "dijit/form/Slider", "dijit/form/VerticalSlider", "dijit/form/HorizontalSlider", "dijit/form/TextBox", "dojo/domReady!", "glMatrix"],
// Local parameters for required modules.
function ui(exports, app, layout, scene, scenegraph, animation, shader, dojo, sniff, html, on, dom, domConstruct, domStyle, domProp, mouse) {
    "use strict";

    // Transformation deltas for on step.
    var delta = {
        rotate : 0.3,
        translate : 20.0,
        scale : 0.1,
        shear : 0.1
    };
    // Rotation axis.
    var axises = {
        X : [1, 0, 0],
        Y : [0, 1, 0],
        Z : [0, 0, 1]
    };
    var signs = {
        plus : "+",
        minus : "-"
    };

    // Variables to track mouse movement.
    var mousePosX;
    var mousePosY;
    var currMouseButton;

    // Connect keys with modifier keys to callbacks.
    var keyCallbacks = {
        none : {
            tranformation : "rotate"
        },
        altKey : {
            tranformation : "translate"
        },
        ctrlKey : {
            tranformation : "scale"
        }
    };

    // Some HTML help text on the UI.
    var helpText = "";

    // Layout container DOM Nodes.
    var controlsContainer;
    var helpContainer;
    var headerContainer;

    // Values of the slider have to be set in postSceneInit.
    var lightSliders = [];
    var ambientLightIntensitySlider;
    var pointLightIntensitySlider;
    var specularLightIntensitySlider;
    var specularLightExponentSlider;

    /**
     * Function for dynamic changes in the GUI,
     * Called from the render loop in each frame,
     * i.e. after each render-update.
     */
    function update() {
    }

    /**
     * Initialize the UI callbacks. Display help text.
     */
    function init() {
        controlsContainer = layout.getContorlsContainer();
        helpContainer = layout.getHelpContainer();
        headerContainer = layout.getHeaderContainer();

        // Create GUI elements and callbacks.
        //
        //initDebugButtons();
        initDisplayButtons();
        initTransformationButtons();
        initEffektButtons();
        //initProjectionControls();

		// BEGIN exercise Shading       
       	// Comment this in. 
        //initShaderControls();
        //initLightControls();
		// END exercise Shading        
        
        initScenegraphButtons();
        initMouseEvents();
        intiHelpText();
    }

    /**
     * This init is called after the init to the scenegraph.
     * It is called by scene at the end of its init.
     *
     * @parameter: width, height of the canvas/context.
     */
    function postSceneInit(width, height) {

        // Set values and range of the light sliders.
        // Values relative to the canvas size only make sense
        // if projection is in a similar range.
        var max = [width, height, 500];
        var lightPos = shader.getLightPosition();
        //console.log("max"+max);
        //console.log("lightPos"+lightPos);
        for (var i = 0; i < 3; i++) {
        	if(! lightSliders[i]) {
        		continue;
        	}
            lightSliders[i].attr('maximum', max[i]);
            lightSliders[i].attr('minimum', -max[i]);
            lightSliders[i].attr('value', lightPos[i]);
            // Tell dijit to re-scale the sliders.
            // domProp.set(lightSliders[i], 'maximum', max[i]);
            // domProp.set(lightSliders[i], 'value', lightPos[i]);
            domStyle.set(lightSliders[i], 'active', true);
            domStyle.set(lightSliders[i], 'disabled', false);
            //lightSliders[i].startup();
        };

        // Do initial update.
        update();
    }

    /**
     * Button for software debug.
     */
    function initDebugButtons() {
        createButton("test", debugButtonCallback);
    }

    function debugButtonCallback() {
        var fkt = shader.getShadingFunction();
        console.log(fkt);
    }

    function initDisplayButtons() {
        // Fullscreen
        var callback = function() {
            var elem = document.querySelector("#canvas");
            if (elem.webkitRequestFullscreen) {// chrome
                elem.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
            } else {
                if (elem.mozRequestFullScreen) {// firefox
                    elem.mozRequestFullScreen();
                } else {// opera
                    elem.requestFullscreen();
                }
            }
        };
        var button = createButton("fullscreen", callback, false, headerContainer, "floatRight");
        domStyle.set(button, "text-align", "right");
        domStyle.set(button, "background-color", "red");
    }

    function initTransformationButtons() {
        // Buttons for transformations: translate, rotate, scale, (shear).
        for (var transform in delta) {
            label(transform + ":");
            br();
            for (var axis in axises) {
                for (var sign in signs) {
                    var labeltext = signs[sign] + axis;
                    var callback = callbackFactoryTransformNode(transform, signs[sign], delta[transform], axises[axis]);
                    createButton(labeltext, callback, false);
                    initKey(callback, transform, axis, sign);
                }
            }
            br();
        }
        // Zoom, i.e. scale in all dimensions.
        for (var sign in signs) {
            labeltext = "scale xyz " + signs[sign];
            callback = callbackFactoryTransformNode("scale", signs[sign], delta["scale"], [1, 1, 1]);
            createButton(labeltext, callback, false);
        }
        p();
    }

    function initEffektButtons() {
        // Set polygon fill or wireframe for all models.
        createToggleButton("wireframe", scene.toggleFill, !scene.getFill(), false);
        // Toggle perform backface culling.
        createToggleButton("backface culling", scene.toggleBackfaceCulling, scene.getBackfaceCulling());
        // Toggle display matrices, common ones and for interactive node.
        createToggleButton("matrices", scene.toggleDisplayMatrices, scene.getDisplayMatrices(), false);
        // Toggle show z-buffer debug.
        createToggleButton("show z-buffer", scene.toggleDebugZBuffer, scene.getDebug_zBuffer());
        // Toggle show debug normals.
        createToggleButton("normals", scene.toggleDebugNormals, scene.getDisplayNormals(), false);
        // Toggle show debug edges.
        createToggleButton("edges", scene.toggleDebugEdges, scene.getDisplayEdges(), false);
        // Toggle show grid.
        createToggleButton("grid", scene.toggleShowGrid, scene.getShowGrid());
        // Toggle triangulation.
        createToggleButton("triangulation", scene.toggleTriangulation, scene.getDataIsTriangulated(), false);
        // Use textures defined in model data.
        createToggleButton("texture", scene.toggleTexturing, scene.getTexturing(), false);
        // Clean data only of interactive node (this cannot be undone).
        createButton("clean data", function() {
            var interactiveNode = scenegraph.getInteractiveNode();
            if (interactiveNode) {
                var model = interactiveNode.getModel();
                if (model) {
                    model.cleanData();
                }
            }
            scene.setUpToDate();
        }, false);
        // Start and stop animations.
        createToggleButton("run animations", app.toggleRunAnimation, app.getRunAnimation(), false);
    }

    /**
     * Change projection types.
     */
    function initProjectionControls() {

        p();
        label("projection: ");
        br();
        var currentProjectionType = scene.getProjectionType();
        scene.projectionTypes.forEach(function(name) {
            var checked = scene.isProjectionType(name);
            var callback = ( function(_name) {
                    return function() {
                        scene.setProjectionType(_name);
                        scene.setUpToDate();
                    }
                }(name));
            createRadioButton("projection", name, callback, checked, false);
        });
    }

    function initShaderControls() {
        p();
        label("shader: ");
        br();
        var currentShadingFunctionName = shader.getShadingFunctionName();
        for (var i = 0; i < shader.shadingFunctionNames.length; i++) {
            var name = shader.shadingFunctionNames[i];
            var checked = currentShadingFunctionName == name ? true : false;
            var callback = ( function(_name) {
                    return function() {
                        shader.setShadingFunctionName(_name);
                        scene.setUpToDate();
                    }
                }(name));
            createRadioButton("shader", name, callback, checked, false);
        }
    }

    /**
     * Buttons and selectors for interactive an visible models.
     * On start only the interactive model is visible.
     */
    function initScenegraphButtons() {
        p();
        label("scenegraph nodes [(anim)->parent]");
        br();
        label("interactive / visible / run : ");
        br();
        var nodeNames = scenegraph.getNodeNames();
        for (var n in nodeNames) {
            var name = nodeNames[n];

            // Radiobuttons for interactive node.
            checked = scenegraph.getInteractiveNodename() == name ? true : false;
            callback = ( function(_name) {
                    return function() {
                        scenegraph.setInteractiveNodeByName(_name);
                        scene.setUpToDate();
                    }
                }(name));
            createRadioButton("node", "", callback, checked, false);

            // Checkboxes for visibility.
            var checked = scenegraph.isNodeVisibleByName(name);
            var callback = ( function(_name) {
                    return function(val) {
                        scenegraph.setNodeVisibleByName(_name, val);
                        scene.setUpToDate();
                    }
                }(name));
            createCheckBox("", callback, checked, false);

            // Checkboxes to run animation.
            var checked = scenegraph.isNodeAnimatedByName(name);
            var hasNoAnim = !checked;
            var callback = ( function(_name) {
                    return function(val) {
                        scenegraph.setNodeAnimatedByName(_name, val);
                        scene.setUpToDate();
                    }
                }(name));
            createCheckBox(name, callback, checked, false, undefined, hasNoAnim);

            // Show animations for node.
            var animStr = animation.getAnimationsForNodeByName(name);
            if (animStr) {
                text(" (" + animStr + ")");
            }
            // Show the parent
            var parentName = scenegraph.getParentNameOfNodeByName(name);
            if (parentName) {
                text(" -> " + parentName);
            }
            br();
        }

    }

    /** Move the light with sliders.
     * Create sliders for light intensities and position.
     * Final starting values and range are set in postSceneInit.
     */
    function initLightControls() {

        // Sliders for light intensities.
        ambientLightIntensitySlider = createSlider(0, 0, 3, 31, "ambient light intensity: ", function(value) {
            scenegraph.setLights(value, undefined, undefined);
            scene.setUpToDate();
        }, true);
        pointLightIntensitySlider = createSlider(1.0, 0, 5, 51, "point light intensity: ", function(value) {
            scenegraph.setLights(undefined, value, undefined);
            scene.setUpToDate();
        }, true);
        specularLightIntensitySlider = createSlider(1.0, 0, 20, 41, "specular light intensity: ", function(value) {
            scenegraph.setLights(undefined, undefined, undefined, value, undefined);
            scene.setUpToDate();
        }, true);
        specularLightExponentSlider = createSlider(1.0, 0, 20, 41, "specular light exponent: ", function(value) {
            scenegraph.setLights(undefined, undefined, undefined, undefined, value);
            scene.setUpToDate();
        }, true);
        // Set light intensities again when sliders are instanced.
        ambientLightIntensitySlider.attr('value', shader.getAmbientLightIntensity());
        domStyle.set(ambientLightIntensitySlider, 'active', true);
        domStyle.set(ambientLightIntensitySlider, 'disabled', false);
        //
        pointLightIntensitySlider.attr('value', shader.getPointLightIntensity());
        domStyle.set(pointLightIntensitySlider, 'active', true);
        domStyle.set(pointLightIntensitySlider, 'disabled', false);
        //
        specularLightIntensitySlider.attr('value', shader.getSpecularLightIntensity());
        domStyle.set(specularLightIntensitySlider, 'active', true);
        domStyle.set(specularLightIntensitySlider, 'disabled', false);
        //
        specularLightExponentSlider.attr('value', shader.getSpecularLightExponent());
        domStyle.set(specularLightExponentSlider, 'active', true);
        domStyle.set(specularLightExponentSlider, 'disabled', false);

        // Sliders for point light position.
        for (var i = 0; i < 3; i++) {
            var dirctions = ["X", "Y", "Z"];
            var labelText = "point light pos " + dirctions[i] + ": ";
            var sliderCallbackFct = ( function(dim) {
                    // Set the initial values of the slider to 0.
                    return function(value) {
                        var pos = [undefined, undefined, undefined];
                        pos[dim] = value;
                        scenegraph.setLights(undefined, undefined, pos);
                        scene.setUpToDate();
                    };
                }(i));
            // The current value of the slider is set later, after the scene loaded.
            lightSliders[i] = createSlider(0, 0, 30, 101, labelText, sliderCallbackFct);
        };
    }

    /////////////////////// Controls helper functions ///////////////////////

    /**
     * @parameter dim is 0,1,2 for x,y,z direction
     */
    function createSlider(val, min, max, steps, labelText, onChangeFct, floatValues) {
        p();
        var idStringPostfix = labelText.replace(/\s/g, "_");
        var sliderNode = domConstruct.create('div', {
            id : "sliderNode" + idStringPostfix
        }, controlsContainer);
        label(labelText, sliderNode);
        var valX = text(val.toString(2), sliderNode);
        var slider = new dijit.form.HorizontalSlider({
            name : idStringPostfix,
            value : val,
            minimum : min,
            maximum : max,
            discreteValues : steps,
            intermediateChanges : true,
            style : "width:280px;",
            onChange : function(value) {
                var valueStr;
                if (floatValues == true) {
                    try {
                        valueStr = value.toFixed(1);
                    } catch(e) {
                    }
                } else {
                    value = Math.round(value);
                    valueStr = value;
                }
                // Adjust the label.
                valX.innerHTML = valueStr;
                //console.log("slider val:" + value);
                onChangeFct(value);
            }
            //}, "sliderNode"+labelText);
        }, sliderNode);
        //slider.startup();
        return slider;
    }

    /**
     * @parameter br adds a line-break after the button, default is true
     * @return the DOM node for the button
     */
    function createButton(label, onClickFct, _br, container, _class) {

        if (container == undefined) {
            container = controlsContainer;
        }
        if (_class == undefined) {
            _class = "";
        }

        var button = new dijit.form.Button({
            label : label,
            onClick : onClickFct,
            "class" : _class,
        }).placeAt(container);

        // Button without dijit.
        // button = domConstruct.create("button", {
        // id : "toggleDebugZBuffer",
        // innerHTML : "z-buffer"
        // }, controlsContainer);
        //on(button.domNode,'click',onClickFct);

        if (_br == true || _br == undefined) {
            br();
        }
        return button;
    }

    /**
     * @parameter -br adds a line-break after the button, default is true
     * @parameter checked is per default false, if undefined
     * @return the DOM node for the button
     */
    function createToggleButton(label, onClickFct, checked, _br, container) {
        // Start up of the widgets is done in layout
        // (automatically because of the hierarchy)
        if (container == undefined) {
            container = controlsContainer;
        }
        if (checked == undefined) {
            checked = false;
        }
        var button = new dijit.form.ToggleButton({
            iconClass : "dijitCheckBoxIcon",
            label : label,
            checked : checked,
            onClick : onClickFct
        }).placeAt(container);
        //dojo.place(toggleLightButton.domNode, controlsContainer);
        //toggleLightButton.startup();

        if (_br == true || _br == undefined) {
            br(container);
        }
        return button;
    }

    /**
     * @parameter _br adds a line-break after the button, default is true
     * @parameter checked is per default false, if undefined
     * @return the DOM node for the button
     */
    function createRadioButton(groupname, _label, onClickFct, checked, _br, container) {
        // Start up of the widgets is done in layout
        // (automatically because of the hierarchy)
        if (checked == undefined) {
            checked = false;
        }
        if (container == undefined) {
            container = controlsContainer;
        }
        var button = new dijit.form.RadioButton({
            //iconClass : "dijitCheckBoxIcon",
            checked : checked,
            value : _label,
            name : groupname,
            onClick : onClickFct
        }).placeAt(container);
        //dojo.place(toggleLightButton.domNode, controlsContainer);
        //toggleLightButton.startup();

        label(_label);
        text(" ", container);

        if (_br == true || _br == undefined) {
            br(container);
        }
        return button;
    }

    /**
     * @parameter _br adds a line-break after the button, default is true
     * @parameter checked is per default false, if undefined
     * @return the DOM node for the button
     */
    function createCheckBox(_label, onClickFct, checked, _br, container, _disabled) {
        // Start up of the widgets is done in layout
        // (automatically because of the hierarchy)
        if (checked == undefined) {
            checked = false;
        }
        if (container == undefined) {
            container = controlsContainer;
        }
        if (_disabled == undefined) {
            _disabled = false;
        }
        var button = new dijit.form.CheckBox({
            //iconClass : "dijitCheckBoxIcon",
            checked : checked,
            disabled : _disabled,
            value : _label,
            onClick : function(event) {
                onClickFct(event.currentTarget.checked)
            }
        }).placeAt(container);

        label(_label);
        text(" ", container);

        if (_br == true || _br == undefined) {
            br(container);
        }
        return button;
    }

    /**
     * Adds span with text into the current flow of controls.
     */
    function text(_text, container) {
        if (container == undefined) {
            container = controlsContainer;
        }
        var span = domConstruct.create("span", {}, container);
        html.set(span, _text);
        return span;
    }

    /**
     * Adds label with text into the current flow of controls.
     */
    function label(_text, container) {
        if (container == undefined) {
            container = controlsContainer;
        }
        var label = domConstruct.create("label", {
            innerHTML : _text
        }, container);
        return label;
    }

    /**
     * Adds a line-break into the current flow of controls.
     */
    function br(container) {
        if (container == undefined) {
            container = controlsContainer;
        }
        domConstruct.create("br", {}, container);
    }

    /**
     * Adds a paragraph into the current flow of controls.
     */
    function p(container) {
        if (container == undefined) {
            container = controlsContainer;
        }
        domConstruct.create("p", {}, container);
    }

    function intiHelpText() {
        helpText = "";
        // Display the help text.
        helpText += "<strong>Mouse:</strong> left = rotate, middle = translate, wheel = scale";
        helpText += " "
        helpText += "<strong>Keys:</strong> x,y,z  to rotate plus Shift = +-sign, Alt = translate, Ctrl = scale";
        domConstruct.create("label", {
            id : "helpText",
            innerHTML : helpText
        }, helpContainer);
    }

    /**
     * Create callback function for all transformation.
     */
    function callbackFactoryTransformNode(transformation, sign, delta, axis) {

        // Scale the transformation.
        if (sign == "-") {
            delta *= -1;
        }
        var scaledAxis = [];
        vec3.scale(axis, delta, scaledAxis);

        return function() {
            var interactiveNode = scenegraph.getInteractiveNode();
            // Check if we have a node to interact with.
            if (interactiveNode == null) {
                console.log("Button: No interactive node.");
                return;
            }
            // Transform node.
            interactiveNode[transformation](scaledAxis);
            // Wake up the animation-loop in case it is not running
            // continuously.
            scene.setUpToDate();
        };
    }

    // //////////////////// Key Events //////////////////////

    /**
     * Calls a function, stored during init, depending on the key.
     */
    function handleKeyEvent(e) {
        // The key as a char.
        var key = "";
        var keyCode = e.keyCode;
        // If the keyCode is 0 it must be a special key.
        if (keyCode == 0) {
            key = "";
        } else {
            key = String.fromCharCode(keyCode);
            // key = keyCode.charCodeAt[0];
        }
        // Adjust the case as key-codes corresponds to capital letters.
        if (e.shiftKey == true) {
            key = key.toUpperCase();
        } else {
            key = key.toLowerCase();
        }
        // console.log("Keydown: " + key);
        // console.log("keyCode: " + keyCode);
        // console.log(e);
        var modifierKey = "none";
        if (e.altKey) {
            modifierKey = "altKey";
        }
        if (e.ctrlKey) {
            modifierKey = "ctrlKey";
        }
        // Set stored callback for the pressed key and call it.
        var callback = keyCallbacks[modifierKey][key];
        if (callback == undefined) {
            // console.log("Key not defined: " + key);
            return;
        }
        callback();
    }

    /*
     * Assign keys for transformations to callbacks. Keys are x,y,z plus
     * modifiers plus shift for sign. @parameter callback: Use the same callback
     * as for the buttons.
     */
    function initKey(callback, transform, axis, sign) {

        var key = "";
        var modifierKey = "";
        // Set the modifier keys for the transforms.
        switch(transform) {
            case("rotate"):
                modifierKey = "none";
                break;
            case("translate"):
                modifierKey = "altKey";
                break;
            case("scale"):
                modifierKey = "ctrlKey";
                break;
            default :
                return;
        }
        // Use shift to toggle the sign.
        if (sign == "plus") {
            key = axis.toLowerCase();
        } else {
            key = axis.toUpperCase();
        }

        keyCallbacks[modifierKey][key] = callback;
        // helpText += key + "+" + modifierKey + " : " + transform + " " +
        // signs[sign] + axis + "<br/>";
    }

    // //////////////////// Mouse Events //////////////////////

    function initMouseEvents() {
        var canvasDiv = layout.getCanvasContainer();
        //dom.byId("canvasDiv");
        on(canvasDiv, (!sniff("mozilla") ? "mousewheel" : "DOMMouseScroll"), onMouseScroll);
        on(canvasDiv, "scroll", onMouseScroll);
        on(canvasDiv, "mousedown", onMouseDown);
        on(canvasDiv, "mouseup", onMouseUp);
        on(canvasDiv, "mousemove", onMouseMove);
        // Register key event handler function.
        // Key events: keydown, keypress, keyup.
        on(dojo.body(), "keydown", handleKeyEvent);
    }

    function onMouseScroll(e) {
        var interactiveNode = scenegraph.getInteractiveNode();
        // Check if we have a node to interact with.
        if (interactiveNode == null) {
            console.log("Mouse: No interactive node.");
            return;
        }
        // console.log("onMouseScroll "+e);
        //console.log("currMouseButton "+currMouseButton);
        //console.dir(e);
        // except the direction is REVERSED, and the event is not normalized.
        var scroll = e[(!sniff("mozilla") ? "wheelDelta" : "detail")] * (!sniff("mozilla") ? 1 : -1);
        //console.log(scroll);
        var scaledAxis = [1, 1, 1];
        var sign = "+";
        if (scroll < 0) {
            var sign = "-";
        }
        var callback = callbackFactoryTransformNode("scale", sign, delta["scale"], [1, 1, 1]);
        callback();
    }

    function onMouseDown(e) {
        // console.log("onMouseDown "+e);
        mousePosX = e.clientX;
        mousePosY = e.clientY;
        currMouseButton = e.button;
        // console.log("currMouseButton "+currMouseButton);
    }

    function onMouseUp(e) {
        // console.log("onMouseUp "+e);
        mousePosX = undefined;
        mousePosY = undefined;
        currMouseButton = undefined;
        // console.log("currMouseButton "+currMouseButton);
    }

    function onMouseMove(e) {
        var interactiveNode = scenegraph.getInteractiveNode();
        // Check if we have a node to interact with.
        if (interactiveNode == null) {
            console.log("Mouse: No interactive node.");
            return;
        }

        // console.log("onMouseMove "+e);
        // Consider only mouse dragged events.
        // console.log("currMouseButton "+currMouseButton);
        if (currMouseButton == undefined) {
            return;
        }

        // Calculate movement.
        var mousePosXNew = e.clientX;
        var mousePosYNew = e.clientY;
        // currMouseButton = e.button;
        var diffX = mousePosXNew - mousePosX;
        var diffY = mousePosYNew - mousePosY;
        mousePosX = mousePosXNew;
        mousePosY = mousePosYNew;

        // Some representation of Z dim with a 2D mouse :(
        var diffZ = (diffX + diffY) / (Math.abs(diffX - diffY) + 1.0);
        //console.log("diff XYZ:"+diffX+"\t "+diffY+"\t "+diffZ+"\t ");
        // Difference vector for the transformation.
        var diffVec = [0, 0, 0];
        // The type of transformation.
        var transformation = undefined;
        // Scale the stepsize.
        var factor = 1;

        // Rotate.
        if (currMouseButton == "0") {
            transformation = "rotate";
            // Map movement in x-direction on rotation around y-axis
            // and vice versa. This is more intuitive.
            factor = 0.01;
            diffVec[0] += diffY * factor;
            diffVec[1] += diffX * factor;
            //diffVec[2] += diffZ * factor;
        }
        // Translate.
        if (currMouseButton == "1") {
            transformation = "translate";
            factor = 2;
            diffVec[0] += diffX * factor;
            // Mind the y-axis points down on the canvas.
            diffVec[1] -= diffY * factor;
            // diffVec[2] += diffZ * factor;
        }
        // Scale.
        // The right button does not really work in the browser.
        if (currMouseButton == "2") {
            transformation = "scale";
            // Max scale limit per mouse move.
            var limit = 1.1;
            // Adjust sensibility.
            diffX *= 0.5;
            diffY *= 0.5;
            diffZ *= 0.5;
            diffVec[0] *= Math.min(limit, Math.max(1, diffX));
            diffVec[1] *= Math.min(limit, Math.max(1, diffY));
            diffVec[2] *= Math.min(limit, Math.max(1, diffZ));
            // Divide if negative.
            diffVec[0] /= -Math.max(-limit, Math.min(-1, diffX));
            diffVec[1] /= -Math.max(-limit, Math.min(-1, diffY));
            diffVec[2] /= -Math.max(-limit, Math.min(-1, diffZ));
        }

        // Execute the transformation.
        if (transformation == undefined) {
            return;
        }

        // Perform the transformation.
        // This will wake up the animation-loop in case it is not running continuously.
        // console.log("diffVec: "+diffVec);
        interactiveNode[transformation](diffVec);

        scene.setUpToDate();
    }

    // //////////////////// Event Debug //////////////////////

    function debugEventAlert(e) {
        console.log(e);
        alert("Event:" + e);
    }

    // Public API.
    exports.init = init;
    exports.postSceneInit = postSceneInit;
    exports.update = update;
});
