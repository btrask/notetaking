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

/* This finds all of the entries and prepends them to their own tags. Initially, entry references and tag references were separate, but now they are unified. */
var fs = require("fs");
var pathModule = require("path");

var BASE = __dirname+"/..";
var DATA = BASE+"/data";

var folders = fs.readdirSync(DATA+"/plain");
for(var i = 0; i < folders.length; ++i) {
	var entries;
	try { entries = fs.readdirSync(DATA+"/plain/"+folders[i]); }
	catch(e) { continue; }
	for(var j = 0; j < entries.length; ++j) addTag(entries[j]);
}
function addTag(hash) {
	var path = DATA+"/tags/"+hash.slice(0, 1)+"/"+hash;
	var str;
	try { str = fs.readFileSync(path, "utf8"); }
	catch(e) { str = ""; }
	if(str.slice(0, hash.length) === hash) return;
	try { fs.mkdirSync(pathModule.dirname(path)); } catch(e) {}
	fs.writeFileSync(path, hash+str, "utf8");
}
