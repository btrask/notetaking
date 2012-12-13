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

/* Converts \r\n to \n in all plain text entries. There was a bug with this in the initial version. */
var fs = require("fs");
var pathModule = require("path");

var BASE = __dirname+"/..";
var DATA = BASE+"/data";
var PLAIN = DATA+"/plain";

var folders = fs.readdirSync(PLAIN);
for(var i = 0; i < folders.length; ++i) {
	var entries;
	try { entries = fs.readdirSync(PLAIN+"/"+folders[i]); }
	catch(e) { continue; }
	for(var j = 0; j < entries.length; ++j) convertCRLF(PLAIN+"/"+folders[i]+"/"+entries[j]);
}
function convertCRLF(path) {
	var str = fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
	fs.writeFileSync(path, str, "utf8");
}
