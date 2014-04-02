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
var watching = {};
var docker = null;

// finds running containers and attaches wait listener no them
function discover(dockerOpts, opts) {
  docker = new Docker(dockerOpts);

  // setup filter
  var filter = function() {
    return true;
  };

  if (opts.hasOwnProperty("containerId")) {
    filter = function (obj) {
      if (obj.Id.indexOf(opts.containerId) === 0) {
        return true;
      }
      return false;
    };
  } else if (opts.hasOwnProperty("imageId")) {
    filter = function (obj) {
      if (obj.Image.indexOf(opts.imageId) === 0) {
        return true;
      }
      return false;
    };
  } else if (opts.hasOwnProperty("custom")) {
    filter = custom;
  }

 // other opts
 var doRestart = opts.hasOwnProperty("doRestart") ? opts.doRestart : false;

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
  return eventEmitter;
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
  container.wait(afterWait(container, doRestart));
}

function afterWait (container, doRestart) {
  return function (err, data) {
    if (err) {
      console.log("msg", "error waiting for container: "+container.id+" err: "+err);
      eventEmitter.emit("msg", "error waiting for container: "+container.id+" err: "+err);
      return err;
    }
    eventEmitter.emit("exited", container.id, data);

    if (doRestart) {
      console.log("restarting container id: "+container.id);
      eventEmitter.emit("restarting", container.id);
      container.start(function () {
        watchContainer(container.id, doRestart);
      });
    }
  };
}

module.exports = discover;