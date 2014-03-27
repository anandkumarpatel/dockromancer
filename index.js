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


var Docker = require('dockerode');
var docker = new Docker({socketPath: '/var/run/docker.sock'});
var watching = {};

// finds running containers and attaches wait listener no them
function discover() {
  console.log("start");
  docker.listContainers(function(err, containers) {
    if (err) {
      console.log("error", "error waiting for container: "+containerId+" err: "+err);
    }
    containers.forEach(function(containerInfo) {
      watchContainer(containerInfo.Id, true, function(err, containerId, StatusCode) {
        console.log("error", "Container: "+containerId+" StatusCode: "+StatusCode);
      });
    });
  });
}

// watch continer which matches id and call cb when process exits 
function watchContainer (containerId, doRestart, cb) {
  if (!containerId) {
    console.error("invalid containerId");
    return cb(new Error("invalid containerId"));
  }
  console.log("watching Container id: "+containerId);
  var container = docker.getContainer(containerId);
  container.wait(function(err, data) {
    if (err) {
      console.log("error", "error waiting for container: "+containerId+" err: "+err);
    }
    if (doRestart) {
      console.log("restarting container id: "+containerId);
      container.start(function () {
        watchContainer(containerId, doRestart, cb);
      });
    }
    if (cb) {
      cb(err, container, data.StatusCode);
    }
  });
}

discover();