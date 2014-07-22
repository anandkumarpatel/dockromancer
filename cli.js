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

var dm = require("./index.js");
var parse = require('minimist');

var argv = parse(process.argv.slice(2), {
	boolean: ['r', 's'],
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

// check if socket
if (!argv.s) {
	dm({
		host: 'http://localhost',
		port: 4242
	}, opts);
} else {
	dm({socketPath: '/var/run/docker.sock'}, opts);
}
console.log('done');