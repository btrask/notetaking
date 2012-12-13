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

/* This is incomplete and unused. It was designed to replace "EasyIndex" with a real, scalable data structure. */
var fs = require("../external/fs+");
var ReadWriteQueue = require("./ReadWriteQueue");

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
function equalBuffers(a, b) {
	var l = a.length; // We assume the buffers are equal length.
	for(var i = 0; i < l; ++i) if(a[i] !== b[i]) return false;
	return true;
}
function queueable(callback, func) {
	return function(done) {
		func(function(arg1, arg2, etc) {
			done();
			if(callback) callback.apply(this, arguments);
		});
	};
}

function PersistentIndex(path, bytes) {
	var a = this;
	a.path = path;
	a.bytes = bytes;
	a.fd = null;
	a.length = null;
	a.queue = new ReadWriteQueue();
}
PersistentIndex.prototype.open = function(callback/* (err) */) {
	var a = this;
	a.queue.write(queueable(callback, function(callback) {
		if(null !== a.fd) return callback(new Error("PersistentIndex already open"));
		fs.open(a.path, "ax+", function(err, fd) {
			if(err) return callback(err);
			fs.fstat(fd, function(err, stats) {
				if(err) return callback(err);
				a.fd = fd;
				a.length = stats.size / a.bytes;
				callback(null);
			});
		});
	}));
};
PersistentIndex.prototype.close = function(callback/* (err) */) {
	var a = this;
	a.queue.write(queueable(callback, function(callback) {
		if(null === a.fd) return callback(new Error("PersistentIndex already closed"));
		fs.close(a.fd, function(err) {
			if(err) return callback(err);
			a.fd = null;
			callback(null);
		});
	}));
};
PersistentIndex.prototype.append = function(buffer, callback/* (err) */) {
	var a = this;
	a.queue.write(queueable(callback, function(callback) {
		var l = a.length * a.bytes;
		if(a.bytes !== buffer.length) return callback(new Error("PersistentIndex appending wrong sized value"));
		fs.writeAll(a.fd, buffer, 0, buffer.length, l, function(err) {
			if(err) return callback(err);
			++a.length;
			callback(null);
		});
	}));
};
PersistentIndex.prototype.read = function(index, length, callback/* (err, buffer) */) {
	var a = this;
	a.queue.read(queueable(callback, function(callback) {
		if(length <= 0) return callback(new Error("PersistentIndex read with invalid length"), null);
		if(index < 0) return callback(new Error("PersistentIndex read below bounds"), null);
		if(index+length > a.length) return callback(new Error("PersistentIndex read beyond bounds"), null);
		var buffer = new Buffer(length * a.bytes);
		fs.readAll(a.fd, buffer, 0, buffer.length, index * a.bytes, function(err) {
			if(err) return callback(err, null);
			callback(null, buffer);
		});
	}));
};
PersistentIndex.intersect = function(array, result, callback) {
	array.sort(function(a, b) {
		return a.length - b.length;
	});
	
};

function intersect(a, indexA, lengthA, b, indexB, lengthB, target, callback/* (err) */) {
	if(!lengthA || !lengthB) return callback(null);
	a.queue.read(queueable(callback, function(callback) {
		var middle = Math.floor(lengthA / 2) + indexA;
		var offset = 0;
		var sign = 1;
		var iA = middle;
		asyncLoop(function(next) {
			if(iA < 0 || iA >= indexA+lengthA) return callback(err);
			a.read(iA, 1, function(err, pivot) {
				linearSearch(b, indexB, lengthB, pivot, function(err, iB) {
					if(err) return callback(err);
					if(-1 === iB) {
						++offset;
						iA = middle + offset*sign;
						sign *= -1;
						return next();
					}
					intersect(a, indexA, ia, b, indexB, ib, function(err) {
						target.append(pivot);
						intersect(a, indexA+iA+1, lengthA-iA-1, b, indexB+iB+1, lengthB-iB-1, callback);
					});
				});
			});
		});
	}));
}
function linearSearch(a, index, length, val, callback/* (err, index) */) {
	a.queue.read(queueable(callback, function(callback) {
		var i = index;
		asyncLoop(function(next) {
			if(i >= index+length) return callback(null, -1);
			a.read(i, 1, function(err, buffer) {
				if(err) return callback(err, null);
				if(equalBuffers(val, buffer)) return callback(null, i);
				++i;
				next();
			});
		});
	}));
}
