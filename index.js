// anandp:
// dockromancer: maintains zero downtime for containers
// restarts killed containers
// returns exit code

// future work
// get run command
// server api where we can restart/change containers
// add a way to stop listening
// add way to change container

/*
  emits:
  error: on error
  watching: emited when container is beging watched. contaier id is passed back
  exited: called back after container exits. containerId and data from docker wait is passed in
  restarting: called when container is getting restarted. containerId passed in
*/

var events = require('events');
var eventEmitter = new events.EventEmitter();

var Docker = require('dockerode');
var watching = {};
var docker = null;

/* finds running containers and attaches wait listener no them
dockerOpts = same as dcokerode

opts:
  filters:
  containerId : connect to specific container
  imageId : connect to all containres with this image as parent
  custom : custom function for which to filter. callback is passed in obj from dockerode container for each

  params:
  doRestart : should container be restarted?
*/
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

  console.log("start doRestart ", doRestart);
  docker.listContainers(function(err, containers) {
    if (err) {
      eventEmitter.emit("error", "error getting list of containers err: "+err);
      console.log("error", "error getting list of containers err: "+err);
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
    eventEmitter.emit("error", "invalid containerId");
    return "invalid containerId";
  }

  eventEmitter.emit("watching", containerId);
  console.log("watching Container id: "+containerId);
  var container = docker.getContainer(containerId);
  watching[containerId] = {
    doRestart: doRestart
  };
  container.wait(afterWait(container));
}

function afterWait (container) {
  return function (err, data) {
    if (err) {
      console.log("error", "error waiting for container: "+container.id+" err: "+err);
      eventEmitter.emit("error", "error waiting for container: "+container.id+" err: "+err);
      return err;
    }
    var doRestart = watching[container.id].doRestart;
    console.log("container died", container, data, watching[container.id]);
    eventEmitter.emit("exited", container.id, data);
    if (doRestart) {
      console.log("restarting container id: "+container.id);
      eventEmitter.emit("restarting", container.id);
      if (watching[container.id].nextContainer) {
        startNextContainer(container.id);
      } else {
        container.start(afterContainerStart(container.id, doRestart));
      }
    }
  };
}

function afterContainerStart(containerId, doRestart) {
  return function (err, data) {
    watchContainer(containerId, doRestart);
  };
}

function startNextContainer(currentContainterId) {
  var imageId = watching[currentContainterId].nextContainer.id;
  var cmd = watching[currentContainterId].nextContainer.cmd;
  var doRestart = watching[currentContainterId].nextContainer.doRestart;

  docker.createContainer({
    Image: imageId,
    Cmd: cmd
  }, function(err, container) {
    container.start(afterContainerStart(container.id, doRestart));
  });
}

/*
 nextContainer: {
      id: ""
      cmd: []
      doRestart: true/false
    }
*/
function setNextContainer(containerId, nextContainer) {
  // validate inputs
  var err = null;
  if (! nextContainer.hasOwnProperty(containerId)) {
    err = new Error("not watching containerId");
    eventEmitter.emit("error", err);
    return err;
  }
  if (!nextContainer.hasOwnProperty("id") ||
      nextContainer.id === "" ||
      !nextContainer.hasOwnProperty("cmd") ||
      nextContainer.cmd === [] ||
      !nextContainer.hasOwnProperty("doRestart") ||
      typeof nextContainer.doRestart !== "boolean") {
    err = new Error("malfomed nextContainer");
    eventEmitter.emit("error", err);
    return err;
  }
  eventEmitter.emit("addingNewContainer", containerId, nextContainer);
  watching[containerId].nextContainer = nextContainer;
}

function setRestart(containerId, doRestart) {
  // validate inputs
  var err = null;
  if (! containerId.hasOwnProperty(containerId)) {
    err = new Error("not watching containerId");
    eventEmitter.emit("error", err);
    return err;
  }
  if (!containerId.hasOwnProperty("doRestart") ||
      typeof containerId.doRestart !== "boolean") {
    err = new Error("invalid input, doRestart needs to be a boolean");
    eventEmitter.emit("error", err);
    return err;
  }

  eventEmitter.emit("updateRestart", containerId, containerId);
  watching[containerId].doRestart = doRestart;
}

module.exports = discover;