/*
useage
-c/containerId : container ID
-i/imageId : image id (currently only image name)
-r=[true/false] : restart container
TODO:
-d : deamon
-s : use socket
-h : docker host
-p : docker port
*/

dm = require("./index.js");
parse = require('minimist');

var argv = parse(process.argv.slice(2), {
	boolean: 'r',
	string: ["i", "c"],
	alias: { 
		c: 'containerId',
		i: 'imageId'
	},
	default: {
		r: false
	}
});

var opts = {};
if (argv.hasOwnProperty("c")) {
	opts.containerId = argv.c;
} else if (argv.hasOwnProperty("i")) {
	opts.imageId = argv.i;
}

opts.doRestart = argv.r;

dm({
	host: 'http://localhost', 
	port: 4242
}, opts);

console.log('done');