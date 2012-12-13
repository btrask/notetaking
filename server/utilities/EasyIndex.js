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
var fs = require("fs");

function read(index, callback/* (map, count) */) {
	fs.readFile(index.path, "ascii", function(err, data) {
		var map = Object.create(null);
		if(err) return callback(map, 0);
		for(var i = 0; i+index.chars <= data.length; i += index.chars) {
			map[data.slice(i, i+index.chars)] = true;
		}
		callback(map, Math.floor(data.length / index.chars));
	});
}
function intersect(a, b) {
	var r = {};
	for(var p in a) if(b[p]) r[p] = true;
	return r;
}

function EasyIndex(path, chars) {
	var a = this;
	a.path = path;
	a.chars = chars;
}
EasyIndex.prototype.append = function(ascii, callback/* (err) */) {
	var a = this;
	if(ascii.length !== a.chars) throw new Error("Bad data length");
	fs.appendFile(a.path, ascii, "ascii", callback || function(){});
};
EasyIndex.intersect = function(a, callback/* (err, map) */) {
	if(!a.length) return callback(Object.create(null)); // In theory this would list all objects...
	var b = [];
	for(var i = 0; i < a.length; ++i) read(a[i], function(map, count) {
		b.push({map: map, count: count});
		if(b.length !== a.length) return;
		b.sort(function(a, b) { return a.count - b.count; });
		var r = b[0].map;
		for(var j = 1; j < b.length; ++j) r = intersect(r, b[j].map);
		callback(r);
	});
};

module.exports = EasyIndex;
