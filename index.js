// anandp: 
// dockromancer: maintains zero downtime for containers
// restarts killed containers
// returns exit code

// future work
// opts: auto-discover
// get run command
// discover filters
// server api where we can restart/change containers
// add rollbar/err tacking callbacks

var events = require('events');
var eventEmitter = new events.EventEmitter();

var Docker = require('dockerode');
var docker = new Docker({host: 'http://localhost', port: 4242});
var watching = {};

docker.version(function(data) {
  console.log(data);
});

// finds running containers and attaches wait listener no them
function discover(opts) {
  // setup filter
  var filter = function() {
    return true;
  };
  if (opts["containerId"]) {
    filter = function (obj) {
      if (obj.Id.indexOf(opts.containerId) === 0) {
        return true;
      }
      return false;
    };
  } else if (opts.imageId) {
    filter = function (obj) {
      if (obj.Image.indexOf(opts.imageId) === 0) {
        return true;
      }
      return false;
    };
  } else if (opts.custom) {
    filter = custom;
  }

 // other opts
 var doRestart = opts.doRestart || false;

  console.log("start");
  docker.listContainers(function(err, containers) {
    if (err) {
      eventEmitter.emit("msg", "error getting list of containers err: "+err);
      console.log("msg", "error getting list of containers err: "+err);
      return err;
    }
    containers.forEach(function(containerInfo) {
      if (filter(containerInfo)) {
        watchContainer(containerInfo.Id, doRestart);
      }
    });
  });
}

// watch continer which matches id
function watchContainer (containerId, doRestart) {
  if (!containerId) {
    console.error("invalid containerId");
    eventEmitter.emit("msg", "invalid containerId");
    return "invalid containerId";
  }

  eventEmitter.emit("watching", containerId);
  console.log("watching Container id: "+containerId);
  var container = docker.getContainer(containerId);
  container.wait(afterWait(containerId, doRestart));
}

function afterWait (containerId, doRestart) {
  return function (err, data) {
    if (err) {
      console.log("msg", "error waiting for container: "+containerId+" err: "+err);
      eventEmitter.emit("msg", "error waiting for container: "+containerId+" err: "+err);
      return err;
    }
    eventEmitter.emit("exited", containerId, data);

    if (doRestart) {
      console.log("restarting container id: "+containerId);
      eventEmitter.emit("restarting", containerId);
      container.start(function () {
        watchContainer(containerId, doRestart);
      });
    }
  };
}

// print process.argv
process.argv.forEach(function (val, index, array) {
  if(index === 2) {
    console.log( ' looking for container : ' + val);
    discover({containerId: val});
  }
});
console.log('done');


