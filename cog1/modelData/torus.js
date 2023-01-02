/**
 * 3D Torus
 *
 * The mesh is build up like a rolled piece of paper with n x m vertices. 
 * The two seams with identical points are:
 * (0,0) = (m-1,0) ... (0,n) = (m-1,n)
 * and (0,0) = (0,n-1) ... (m-1,0) = (m-1,n-1)
 * These points a are not calculated but copied, they exist two times:
 * (0,n-1) := (0,0) and so forth. 
 *
 * @author Ingo Struck, Felix Gers
 * @namespace cog1.data
 * @module torus
 */

define(["exports", "data"], function(exports, data) {
	"use strict";

	/**
	 * Procedural calculation.
	 *
	 * @parameter object with fields:
	 * @parameter r1,r2,n1,n2,color
	 * @parameter parameter may be left [partly] undefined. See above the details.
	 * @parameter scale
	 * @parameter color [-1 for many colors]
	 */
	exports.create = function(parameter) {
		if(parameter) {
			// large radius
			var r1 = parameter.r1;
			// small radius
			var r2 = parameter.r2;
			// number of points in the mesh
			var n1 = parameter.n1;
			var n2 = parameter.n2;
			var scale = parameter.scale;
			var color = parameter.color;
		}
		// Set default values if parameter is undefined.
		if(r2 == undefined) {
			// large radius
			r2 = 90;
		}
		if(r1 == undefined) {
			r1 = 4 * r2;
		}
		if(n2 == undefined) {
			// number of points in the mesh
			n2 = 17;
		}
		if(n1 == undefined) {
			n1 = n2 * 2;
		}
		if(scale == undefined) {
			scale = 1;
		}
		if(color == undefined) {
			color = 9;
		}

		// Instance of the model to be returned.
		var instance = {};
		instance.vertices = torus(r1, r2, n1, n2);
		instance.polygonVertices = vert2poly(n1, n2);

		data.applyScale.call(instance, scale);
		data.setColorForAllPolygons.call(instance, color);

		return instance;
	}

	/**
	 * create a torus; return vertices only
	 * r1 is the larger radius
	 */
	function torus(r1, r2, n1, n2) {
		// console.log('TORUS ',r1,' ',r2,' ',n1,' ',n2);
		var cth, cah, dct, dst, st = 0, ct = r1, dca, dsa, ca = r2, sa = 0;
		var a, t, tmp;
		var PI2 = 2 * Math.PI;
		var mesh = []; --n2;
		dct = Math.cos(PI2 / (n1 - 1));
		dst = Math.sin(PI2 / (n1 - 1));
		dca = Math.cos(PI2 / n2);
		dsa = Math.sin(PI2 / n2);
		for( a = 0; a < n2; ++a) {
			ct = r1 + sa;
			st = 0;
			for( t = 0; t < n1; ++t) {
				var p = [ct, st, ca];
				mesh[a * n1 + t] = p;
				// console.log('P',a*n1 + t,p);
				tmp = ct;
				ct = ct * dct - st * dst;
				st = st * dct + tmp * dst;
			}
			tmp = ca;
			ca = ca * dca - sa * dsa;
			sa = sa * dca + tmp * dsa;
		}
		// copy duplicate points
		tmp = n1 - 1;
		for( a = 0; a < (n2 - 1) * n1; a += n1)
		mesh[a + tmp] = mesh[a];
		tmp = n1 * n2;
		for( t = 0; t < n1; ++t)
		mesh[t + tmp] = mesh[t];
		// console.log('POINT HAS',mesh.length,'ENTRIES');
		return mesh;
	}

	function vert2poly(n1, n2) {
		var poly = [];
		// 2*(n1-1)*(n2-1) entries
		var n1m = n1 - 1;
		var n1m2 = n1m * 2; --n2;
		// console.log('VERT2POLY',n1,n2);
		for(var i2 = 0; i2 < n2; ++i2) {
			var moff = i2 * n1;
			// offset into mesh array
			var poff = i2 * n1m2;
			// offset into polygon array
			for(var i1 = 0; i1 < n1m; ++i1) {
				var poff1 = poff + 2 * i1;
				// offset into polygon array
				var moff1 = moff + i1;
				//poly[poff1] = [moff1, moff1 + 1, moff1 + n1];
				poly[poff1] = [moff1, moff1 + n1, moff1 + 1];
				// console.log('POLY',poff1,moff1, moff1+1, moff1+n1);
				//poly[poff1 + 1] = [moff1 + n1, moff1 + 1, moff1 + n1 + 1];
				poly[poff1 + 1] = [moff1 + n1, moff1 + n1 + 1, moff1 + 1];
				// console.log('POLY',poff1+1,moff1+n1, moff1+1, moff1+n1+1);
			}
		}
		// console.log('POLY HAS ',poly.length,' ENTRIES');
		return poly;
	}

});
