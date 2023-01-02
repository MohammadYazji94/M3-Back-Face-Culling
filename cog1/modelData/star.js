/**
 * 
 * Polygon to test scan-line algorithm.
 * By Nathalia Prost.
 * 
 * @namespace cog1.data
 * @module insideOutPoly
 */
define(["exports", "data"], function(exports, data) {
	"use strict";

	//         6           ---- obereLinieY + hoeheDreieck
	//        / \
	//       /   \
	// 8----6     5----4   ----obereLinieY
	//  \_     _    _/
	//    9        3  
	//   /   _1_   \       -----y1
	//  /  /     \  \    
	// 0 -         -2      y=0
	//        |
	//        x1 
	// schenkel = 0->9 = 0->1 = 2->1 = 2->3 = 4->3 = 4->5 = 6->5 = 6->7 = 8->6 = 8->9
	// Winkel in den Spitzendreiecken sind: 36°, 72°, 72°
	// Aussenwinkel an den Schenkeln = 180° - 72 = 108°
	// --> davon die Haelfte zur Berechnung der Hoehe y1 bei [1] = 54°
	// Linie ziehen von [9] zu [3], Senkrechte runter bis [1]
	// --> wieder zwei rechtwinklige Dreiecke mit den Winkeln 90°, 36° und 54°
	

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
		
		var schenkel = 20; // Seite 1 und Seite 2
		//var spitzenwinkel = 36;
		var spitzenwinkelInRad = 36 * (Math.PI / 180);
		//var aussenSchenkelWinkel = 54;
		var aussenSchenkelWinkelInRad = 54 * (Math.PI / 180);
		
		var seite3 = Math.sqrt(2*schenkel*schenkel*(1-Math.cos(spitzenwinkelInRad)));
		var seite3halbe = seite3 / 2;
		
		//var schenkelWinkel = 72;
		var schenkelWinkelInRad = 72 * (Math.PI / 180);
		var hoeheDreieck = Math.sin(schenkelWinkelInRad) * schenkel;
		
		// Berechnung der fehlenden Werte der Ankatheten und Gegenkatheten
		var x1 = Math.sin(aussenSchenkelWinkelInRad) * schenkel; // Hypotenuse = gleichseitige Schenkel
		var y1 = Math.cos(aussenSchenkelWinkelInRad) * schenkel;
		var x2 = Math.sin(aussenSchenkelWinkelInRad) * seite3; // Hypotenuse = 3. Seite bzw. Grundlinie
		var y2 = Math.cos(aussenSchenkelWinkelInRad) * seite3;
		
		var obereLinieY = y1 + y2 + x2; // hier liegen Punkte 4, 5, 7 und 8
		
		
		// Konstruktion ist berechnet ausgehend von der unteren linken Ecke
		// Mittelpunkt des Sterns durch Offsets;  x0 = ... und y0 = ... auskommentieren fuer linke untere Ecke
		var x0 = 0;
		// xOffset
		x0 = -x1;
		var y0 = 0;
		// xOffset
		y0 = -(obereLinieY + hoeheDreieck) / 2;
		
		
		// Instance of the model to be returned.
		var instance = {};
			
		instance.vertices = [
			[+x0,0+y0, 0], // Spitze unten links 0
			[ x1+x0,y1+y0, 0], // unten Mitte 1
			[ 2*x1+x0,0+y0, 0], // Spitze unten rechts 2
			[ x1+x2+x0,y1+y2+y0, 0], // rechts Mitte 3
			[ x1+seite3halbe+schenkel+x0,obereLinieY+y0, 0], // Spitze rechts oben 4
			[ x1+seite3halbe+x0,obereLinieY+y0, 0],// oben rechts von mitte 5
			[ x1+x0,obereLinieY+hoeheDreieck+y0, 0], // Spitze oben 6
			[ x1-seite3halbe+x0,obereLinieY+y0, 0], // oben links von Mitte 7
			[ x1-seite3halbe-schenkel+x0,obereLinieY+y0, 0], // Spitze oben links 8
			[ x1-x2+x0,y1+y2+y0, 0] // links Mitte 9
		];
		instance.polygonVertices = [
			[0,1,2,3,4,5,6,7,8,9]
		];	
		instance.polygonColors = [6];

		data.applyScale.call(instance, scale);

		return instance;		
	} 		
});