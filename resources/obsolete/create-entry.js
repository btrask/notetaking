/* Original implementation of git-commit-like editor system. */
var fs = require("fs");
var cp = require("child_process");
var crypto = require("crypto");

var TMP = (
	process.env.TMP ||
	process.env.TMPDIR ||
	process.env.TEMP ||
	"/tmp" ||
	process.cwd()
).replace(/^(.*)\/$/, "$1");

function fileHash(path, callback/* (err, sha1) */) {
	var sha1 = crypto.createHash("sha1");
	var stream = fs.createReadStream(path);
	stream.addListener("data", function(chunk) {
		sha1.update(chunk);
	});
	stream.addListener("end", function() {
		callback(null, sha1);
	});
	stream.addListener("error", function(err) {
		callback(err, null);
	});
}

var path = TMP+"/NEW_ENTRY";
fs.writeFile(path, "", "utf8", function(err) {
	var nano = cp.spawn("/Applications/TextEdit.app/Contents/MacOS/TextEdit", [path]);
	nano.on("exit", function(code) {
		if(code) return; // TODO: Handle.
		fileHash(path, function(err, sha1) {
			if(err) return; // TODO: Maybe the user quit without saving.
			// TODO: Salt?
			var hash = sha1.digest("hex");
			fs.rename(path, process.cwd()+"/"+hash, function(err) {
				console.log(hash);
			});
		});
	});
});
