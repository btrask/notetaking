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

/* This is untested but was made for use by PersistentIndex. */
function ReadWriteQueue() {
	var queue = this;
	queue.count = 0;
	queue.reads = [];
	queue.writes = [];
}
ReadWriteQueue.prototype.read = function(func) {
	var queue = this;
	queue.reads.push(func);
	if(queue.count >= 0) startReads(queue);
};
ReadWriteQueue.prototype.write = function(func) {
	var queue = this;
	queue.writes.push(func);
	if(queue.count === 0) startWrite(queue);
};

function startReads(queue) {
	if(!queue.reads.length) return false;
	while(queue.reads.length) {
		++queue.count;
		queue.reads.shift()(function() {
			if(!--queue.count) startWrite(queue) || startReads(queue);
		});
	}
	return true;
}
function startWrite(queue) {
	if(!queue.writes.length) return false;
	--queue.count;
	queue.writes.shift()(function() {
		if(!++queue.count) startReads(queue) || startWrite(queue);
	});
	return true;
}

module.exports = ReadWriteQueue;
