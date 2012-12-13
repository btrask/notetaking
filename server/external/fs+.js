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
var pathModule = require("path");

function asyncLoop(func/* (next) */) { // TODO: Put this somewhere too.
	var called, finished;
	for(;;) {
		called = false;
		finished = false;
		func(function next() {
			called = true;
			if(finished) asyncLoop(func);
		});
		finished = true;
		if(!called) break;
	}
}

function fsWrapper(func) {
	return function(fd, buffer, offset, length, position, callback/* (err) */) {
		var o = 0, l = length, p = position;
		asyncLoop(function(next) {
			func(fd, buffer, o, l, p, function(err, count) {
				if(err) {
					if(callback) callback(err);
					return;
				}
				o += count;
				l -= count;
				if(null !== p) p += count;
				if(l > 0) return next();
				if(callback) callback(null);
			});
		});
	};
}
fs.readAll = fsWrapper(fs.read);
fs.writeAll = fsWrapper(fs.write);

fs.mkdirRecursive = function(filename, callback/* (err) */) {
	fs.mkdir(filename, function(err) {
		if(!err || "EEXIST" === err.code) return callback(null);
		if("ENOENT" !== err.code) return callback(err);
		fs.mkdirRecursive(pathModule.dirname(filename), function(err) {
			if(err) return callback(err);
			fs.mkdir(filename, callback);
		})
	});
};
fs.rmRecursive = function(path, callback/* (err) */) {
	if("/" === path) return callback(new Error("Are you out of your mind?"));
	fs.readdir(path, function(err, files) {
		if(!err) {
			var remaining = files.length;
			for(var i = 0; i < files.length; ++i) {
				fs.rmRecursive(path+"/"+files[i], function(err) {
					if(err) return remaining = 0, callback(err);
					if(!--remaining) fs.rmdir(path, callback);
				});
			}
		} else if("ENOTDIR" === err.code) {
			fs.unlink(path, callback);
		} else {
			callback(err);
		}
	});
};

module.exports = fs;
