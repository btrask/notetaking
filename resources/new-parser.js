/* Copyright (c) 2012, Ben Trask
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE AUTHORS ''AS IS'' AND ANY
EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/* Incomplete parser framework, similar to OMeta. A lot faster and easier to debug. */
var util = require("util");

function has(o, p) {
	return Object.prototype.hasOwnProperty.call(o, p);
}
function lineCount(str, i) {
	return str.slice(0, i+1).split(/\r\n|\r|\n/).length;
}
function repeat(str, count) {
	return new Array(count+1).join(str);
}
function err(val) {
	var a = [];
	var x = arguments.callee.caller;
	while(x && -1 === a.indexOf(x)) { a.push(x); x = x.caller; }
	return { stack: a.map(function(x) { return (x.label ? x.label+": " : "")+(x.code || x.name || "(func)")+(x.state || ""); }).join("\n"), i: val.i };
}
function toCode() {
	var f = arguments.callee.caller;
	var args = Array.isArray(f.arguments[0]) ? f.arguments[0] : f.arguments; // WTF?
	return f.name+"("+Array.prototype.slice.call(args).map(function(arg) {
		if("string" === typeof arg) return JSON.stringify(arg);
		return arg.label || arg.code || arg.name || util.inspect(arg, false, 0);
	}).join(", ")+")";
}

function keep(str) {
	function _keep(val) {
		var a = val.i, b = a+str.length
		if(val.s.slice(a, b) !== str) throw err(val);
		val.i = b;
		return str;
	}
	_keep.code = toCode();
	return _keep;
}
function lit(str) {
	var _lit = ignore(keep(str));
	_lit.code = toCode();
	return _lit;
}
function charset(str) {
	var l = str.length, set = Object.create(null);
	for(var i = 0; i < l; ++i) set[str[i]] = 1;
	function _charset(val) {
		var c = val.s[val.i];
		if(!set[c]) throw err(val);
		++val.i;
		return c;
	}
	_charset.code = toCode();
	return _charset;
}
function char() {
	function _char(val) {
		if(val.s.length === val.i) throw err(val);
		return val.s[val.i++];
	}
	_char.code = toCode();
	return _char;
}
function ignore(func) {
	function _ignore(val) {
		func(val);
		return undefined;
	}
	_ignore.code = toCode();
	return _ignore;
}
function any(a, b, c, etc) {
	var a = Array.prototype.slice.call(arguments), l = a.length;
	function _any(val) {
		for(var i = 0, r; i < l; ++i) {
			try { return a[i](val); }
			catch(e) {}
		}
		throw err(val);
	}
	_any.code = toCode();
	return _any;
}
function all(a, b, c, etc) {
	var a = Array.prototype.slice.call(arguments), l = a.length;
	function _all(val) {
		var r = [], o = val.i, t;
		try {
			for(var i = 0; i < l; ++i) {
				_all.state = ":"+i;
				t = a[i](val);
				if(undefined !== t) r.push(t);
			}
			return r;
		} catch(e) {
			val.i = o;
			throw e;
			// TODO: Store information on which one we were on.
		}
	}
	_all.code = toCode();
	return _all;
}
function not(bad, good) {
	function _not(val) {
		var o = val.i;
		try { bad(val); val.i = o; }
		catch(e) { val.i = o; return good(val); }
		throw err(val);
	}
	_not.code = toCode();
	return _not;
}
function star(func) {
	function _star(val) {
		var a = [];
		try { for(;;) a.push(func(val)); }
		catch(e) { return a; }
	}
	_star.code = toCode();
	return _star;
}
function plus(func) {
	function _plus(val) {
		var a = [func(val)];
		try { for(;;) a.push(func(val)); }
		catch(e) { return a; }
	}
	_plus.code = toCode();
	return _plus;
}
function maybe(func, other) {
	function _maybe(val) {
		try { return func(val); }
		catch(e) { return other; }
	}
	_maybe.code = toCode();
	return _maybe;
}
function replace(func, replacer) {
	function _replace(val) {
		return replacer(func(val));
	}
	_replace.code = toCode();
	return _replace;
}
function join(func, glue) {
	var glue = glue || "";
	var _join = replace(func, function(array) {
		return array.join(glue);
	});
	_join.code = toCode();
	return _join;
}
function flatten(func) {
	var _flatten = replace(func, function(array) {
		if(1 !== array.length) console.log("Invalid length", err(val).stack);
		return array[0];
	});
	_flatten.code = toCode();
	return _flatten;
}
function unify(func) {
	var _unify = replace(func, function(a) {
		var r = {}, l = a.length, o;
		for(var i = 0; i < l; ++i) {
			o = a[i];
			for(var p in o) if(has(o, p)) r[p] = o[p];
		}
		return r;
	});
	_unify.code = toCode();
	return _unify;
}
function name(func, name) {
	function _name(val) {
		var r = {};
		r[name] = func(val);
		return r;
	}
	_name.code = toCode();
	return _name;
}
function eof() {
	function _eof(val) {
		if(val.s.length !== val.i) throw err(val);
		return undefined;
	}
	_eof.code = toCode();
	return _eof;
}
function log(func, message) {
	function _log(val) {
		var i = val.i, r, e;
		try { r = func(val); }
		catch(err) { e = err; }
		var j = e ? e.i : val.i;
		var a = JSON.stringify(val.s.slice(i-30, i)).slice(1, -1);
		var b = JSON.stringify(val.s.slice(i, j)).slice(1, -1);
		var c = JSON.stringify(val.s.slice(j, j+30)).slice(1, -1);
		console.log("\""+a+b+c+"\""+"\n"+repeat(" ", a.length+1)+repeat("^", Math.max(b.length, 0))+" "+(e ? "Unmatched" : "Matched")+"(line: "+lineCount(val.s, i)+")\n"+(e || err(val)).stack);
		if(e) throw e;
		return r;
	}
	_log.code = toCode();
	return _log;
}
function assert(func, min, name) {
	var count = 0, min = min || 0, name = name || func.code || "(func)";
	var logger = log(func);
	function _assert(val) {
		var i = val.i;
		try { return func(val); }
		catch(e) {
			var j = e ? e.i : val.i;
			var a = JSON.stringify(val.s.slice(j-30, j)).slice(1, -1);
			var c = JSON.stringify(val.s.slice(j, j+30)).slice(1, -1);
			if(e && count >= min) console.log("\""+a+c+"\""+"\n"+repeat(" ", a.length+1)+"^ "+"Assertion failed (line: "+lineCount(val.s, j)+", hit: "+(count++)+")\n"+e.stack);
			throw e;
		}
	}
	_assert.code = toCode();
	return _assert;
}

function run(func, s) {
	try { return func({s: s, i: 0}); }
	catch(e) {}
}

function define(label, func) {
	this[label] = func;
	func.label = label;
}
