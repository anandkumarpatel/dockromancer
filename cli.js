/*
useage
-cID : container ID
-iID : image id
-r=[true/false] : restart container
TODO:
-d : deamon
-s : use socket
-h : docker host
-p : docker port
*/

dm = require("./index.js");
var argv = require('minimist')(process.argv.slice(2), {
	string: ["cID", "iID"],
	boolean: ["r"],
	alias: { 
		cID: 'containerId',
		iID: 'imageId'
	}
});

var opts = {};
if (argv.hasOwnProperty("cID")) {
	opts.containerId = argv.containerId;
} else if (argv.hasOwnProperty("iID")) {
	opts.iID = argv.iID;
}

console.log('looking for container : ' + val);

dm({
	host: 'http://localhost', 
	port: 4242
}, opts);

console.log('done');