/**
 * The application layout
 * HTML and div containers
 *
 * For custom widgets see:
 * https://bitbucket.org/dojo/dijit/src/1ee880ddbb72/tests/layout/nestedStack.html
 *
 * @namespace cog1
 * @module layout
 */
define(["exports", "ui", "dojo", "dojo/parser", "dojo/on", "dojo/dom", "dojo/dom-construct", "dojo/dom-style", "dijit/layout/BorderContainer", "dijit/layout/ContentPane"],
// Local parameters for required modules.
function(exports, ui, dojo, parser, on, dom, domConstruct, domStyle, BorderContainer, ContentPane) {
    // Somehow dojo needs the arguments.callee in resize which does not comply with strict mode.
    //"use strict";

    // Layout container for the canvas.
    var headerPane, canvasPane, controlsPane, helpPane, infoPane;

    /**
     * Initialize HTML skeleton with dijit layout widgets.
     *
     * @ parameter resizeCbk is executed when canvas was resized.
     */
    function init(resizeCbk) {

        // Create the top div container and append it to the HTML body.
        var body = dojo.body();
        var appLayoutDiv = domConstruct.create("div", {
            id : "appLayout",
            "class" : "appLayout",
            splitter : true,
        }, body);

        // Create a BorderContainer and attach it to the top appLayout div.
        var appLayout = new BorderContainer({
            design : "sidebar",//"headline",
        }, "appLayout");

        // Create content panes within the border container.
        headerPane = new ContentPane({
            region : "top",
            "class" : "edgePanel",
            content : "COG1 Rendering Pipeline"
        });
        appLayout.addChild(headerPane);

        // infoPane = new ContentPane({
        // region: "left",
        // id : "leftCol",
        // "class": "edgePanel",
        // });
        // appLayout.addChild(infoPane);

        helpPane = new ContentPane({
            region : "bottom",
            "class" : "edgePanel",
            //content: "help"
        });
        appLayout.addChild(helpPane);

        controlsPane = new ContentPane({
            region : "right",
            id : "rightCol",
            "class" : "edgePanel",
            splitter : true,
            //content: "controls"
        });
        appLayout.addChild(controlsPane);

        // Use a custom ContentPane widget to track resize events for the canvas.
        dojo.declare("dijit.CanvasContentPane",
        //dijit.layout._LayoutWidget, {
        dijit.layout.ContentPane, {
            startup : function() {
                //console.log("CanvasContentPane startup");
            },
            resize : function() {
                // In strict mode 'arguments' properties may not be accessed in this way:
                //this.inherited(arguments);
                // See:  http://www.jspatterns.com/arguments-considered-harmful/
                // If array generics are not available use the next line otherwise the following:
                var args = Array.prototype.slice.call(arguments);
                //var args = Array.slice(arguments);
                // Somehow dojo needs the arguments.callee:
                args.callee = arguments.callee; 
                this.inherited(args);
                //console.log("CanvasContentPane Resize");
                if(!storeCanvasSize){
                    return;
                }
                storeCanvasSize();
                resizeCbk();
            }
            
        });

        // Canvas  pane get a custom resize.
        //canvasPane = new ContentPane({
        canvasPane = new dijit.CanvasContentPane({
            region : "center",
            "class" : "centerPanel",
            doLayout : true,
            //content: "canvas"
        });

        appLayout.addChild(canvasPane);

        // Now that the basic layout with the controls container exists, initialize the GUI.
        ui.init();

        // start up widgets and do layout.
        appLayout.startup();

        // Create a canvas for the scene.
        // This is done after layout and sized are settled.
        // Resize canvas to size of center region.
        // Deduce some small value to avoid scroll bars.
        // The sizes are set directly in the pane and its domNode and its containerNode:
        // .domNode.scrollWidth;//w ;//containerNode//domNode.style.width//clientHeight;//.containerNode.clientWidth;
        // .domNode.scrollHeight;//h ;//domNode.style.height;//.containerNode.clientHeight;
        //console.log("canvas width x height:"+canvasWidth+" x "+canvasHeight);
        var canvas = domConstruct.create("canvas", {
            id : "canvas",
            // use dynamic canvas size from center container.
            //Úwidth : canvasWidth,//800,
            //height : canvasHeight,//500
            className : "canvas"
        }, canvasPane.domNode, "first");

        // Also called on resize.
        var storeCanvasSize = function() {
                canvas.width = canvas.clientWidth;
                canvas.height = canvas.clientHeight;
        };
        storeCanvasSize();
 
        // UI need the interactive node, and the canvas dimensions.
        // Also scene-graph must have finished initializing.
        ui.postSceneInit(canvas.width, canvas.height);
    }

    function getHeaderContainer() {
        return headerPane.domNode;
    }

    function getCanvasContainer() {
        return canvasPane.domNode;
    }

    function getContorlsContainer() {
        return controlsPane.domNode;
    }

    function getHelpContainer() {
        return helpPane.domNode;
    }

    function getInfoContainer() {
        return infoPane.domNode;
    }

    // Public API.
    exports.init = init;
    exports.getHeaderContainer = getHeaderContainer;
    exports.getCanvasContainer = getCanvasContainer;
    exports.getContorlsContainer = getContorlsContainer;
    exports.getHelpContainer = getHelpContainer;
    exports.getInfoContainer = getInfoContainer;
});
