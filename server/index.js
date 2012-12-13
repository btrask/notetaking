#!env /usr/local/bin/node
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
var qs = require("querystring");
var crypto = require("crypto");
var urlModule = require("url");
var pathModule = require("path");

var fs = require("./external/fs+");
var http = require("./external/http+");

var ometa = require("ometajs");
var markup = require("./markup.ometajs").markup;

var EasyIndex = require("./utilities/EasyIndex");

var TMP = (
	process.env.TMP ||
	process.env.TMPDIR ||
	process.env.TEMP ||
	"/tmp" ||
	process.cwd()
).replace(/^(.*)\/$/, "$1");
var BASE = __dirname+"/..";
var CLIENT = BASE+"/client";
var TEMPLATE = CLIENT+"/template/index.html";
var DATA = BASE+"/data";

crypto.Hash.prototype.hash = function() {
	return this.digest("base64").slice(0, 14).replace(/\+/g, "-").replace(/\//g, "_");
}

function has(obj, prop) {
	return Object.prototype.hasOwnProperty.call(obj, prop);
}
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

function componentsFromPath(path) {
	var l = path.length;
	var a = "/" === path[0] ? 1 : 0;
	var b = "/" === path[l - 1] ? 1 : 0;
	if(a + b >= l) return [];
	return path.slice(a, -b || undefined).split("/");
}
function pathFromComponents(components) {
	if(!components.length) return "";
	return "/"+components.join("/");
}
function lookup(obj, prop) {
	if(!obj || !prop) return null; // TODO: Be more robust.
	if(Object.prototype.hasOwnProperty.call(obj, prop)) return obj[prop];
	return null;
}
function first(array) {
	return array.length ? array[0] : null;
}
function rest(array) {
	return array.slice(1);
}

function tagsFromString(hash, str) {
	var re = /(^|\s)#([\w\d_-]+)(\s|$)/g;
	var tags = ["index", hash], x;
	while(x = re.exec(str)) {
		x = x[2].toLowerCase();
		if(-1 === tags.indexOf(x)) tags.push(x);
	}
	return tags;
}
function pathForTag(tag) {
	return DATA+"/tags/"+tag.slice(0, 1)+"/"+tag;
}

var serve = function(req, res) {
	var path = urlModule.parse(req.url).pathname;
	var components = componentsFromPath(path).map(function(x) {
		return decodeURIComponent(x);
	});
	if(-1 !== components.indexOf("..")) {
		res.sendMessage(400, "Bad Request");
		return;
	}
	serve.root(req, res, {
		"path": path,
		"components": components,
	});
};
serve.root = function(req, res, root) {
	var components = root.components;
	var imp = lookup(serve.root, first(components));
	if(!imp) {
		var path = CLIENT+root.path;
		fs.stat(path, function(err, stats) {
			if(err) return res.sendError(err);
			res.sendFile(stats.isDirectory() ? path+"/index.html" : path);
		});
		return;
	}
	imp(req, res, root, {
		"components": rest(components),
	});
};
serve.root.submit = function(req, res, root, submit) {
	var data = "";
	req.setEncoding("utf8");
	req.addListener("data", function(chunk) {
		data += chunk;
	});
	req.addListener("end", function() {
		var obj = qs.parse(data);
		if(!obj || !has(obj, "content")) return res.sendMessage(400, "Bad Request");
		var plain = obj["content"].replace(/\r\n/g, "\n").trim();
		if(!plain) return res.sendMessage(400, "Bad Request");
		var sha1 = crypto.createHash("sha1");
		sha1.update(plain, "utf8");
		var hash = sha1.hash();
		var plainDir = DATA+"/plain/"+hash.slice(0, 2);
		var plainPath = plainDir+"/"+hash;
		fs.stat(plainPath, function(err, stats) {
			if(!err || err.code !== "ENOENT") {
				res.writeHead(303, {Location: "/id/"+hash});
				res.end();
				return;
			}
			tagsFromString(hash, plain).forEach(function(tag) {
				var path = pathForTag(tag);
				fs.mkdirRecursive(pathModule.dirname(path), function(err) {
					if(err) return;
					var index = new EasyIndex(path, 14);
					index.append(hash);
				});
			});
			var htmlDir = DATA+"/html/"+hash.slice(0, 2);
			fs.mkdirRecursive(htmlDir, function(err) {
				if(err) return res.sendError(err);
				var html = markup.matchAll([hash, plain], "main");
				fs.writeFile(htmlDir+"/"+hash, html, "utf8", function(err) {
					if(err) return res.sendError(err);
					res.writeHead(303, {Location: "/id/"+hash});
					res.end();
				});
			});
			fs.mkdirRecursive(plainDir, function(err) {
				fs.writeFile(plainPath, plain, "utf8");
			});
		});
	});
};
serve.root.id = function(req, res, root, id) {
	var tags = (first(id.components) || "").split("+");
	if(!tags.length) return res.sendMessage(400, "Bad Request");
	var indexes = tags.map(function(tag) {
		return new EasyIndex(pathForTag(tag), 14);
	});
	EasyIndex.intersect(indexes, function(map) {
		var template = fs.createReadStream(TEMPLATE);
		res.writeHead(200, {});
		template.pipe(res, {end: false});
		template.addListener("end", function() {
			var entries = Object.keys(map);
			var i = 0;
			asyncLoop(function(next) {
				if(i >= entries.length) {
					res.end();
					return;
				}
				var hash = entries[i];
				var entry = fs.createReadStream(DATA+"/html/"+hash.slice(0, 2)+"/"+hash);
				if(i) res.write("\n\n<hr>\n");
				entry.pipe(res, {end: false});
				entry.addListener("end", next);
				entry.addListener("error", function(err) {
					res.write("Entry #"+hash+" could not be read.");
					next();
				});
				++i;
			});
		});
		
	});
};

http.createServer(function(req, res) {
	serve(req, res);
}).listen(8000);
