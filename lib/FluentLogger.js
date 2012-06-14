var net = require('net');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

exports.debug = false;

var FluentLogger = function(port, host, options) {
  this.port = port;
  this.host = host;
  this.connected = false;
  this.queues = [];
  this.retryTimer = null;

  this.stream = net.createConnection(port, host);

  this.stream.on('connect', function() {
    this.onConnect();
  }.bind(this));

  this.stream.on('error', function(error) {
    this.onError(error);
  }.bind(this));

  this.stream.on('close', function() {
    this.onClose();
  }.bind(this));

  EventEmitter.call(this);
};

util.inherits(FluentLogger, EventEmitter);

FluentLogger.prototype.onConnect = function() {
  if (exports.debug) {
    util.log("Fluentd connected " + this.host + ":" + this.port);
  }

  this.connected = true;
  this.emit('connect');

  if (this.queues.length > 0) {
    for (var i = 0; i < this.queues.length; i++) {
      var buffer = this.queues.pop();
      this.sendQueue(buffer);
    }
  }
};

FluentLogger.prototype.onError = function(error) {
  var message = "Fluentd connection to " + this.host + ":" + this.port + " failed - " + error.message;

  if (exports.debug) {
    util.log(message);
  }

  this.connected = false;
  this.retry();
};

FluentLogger.prototype.onClose = function() {
  var message = "Fluentd connection to " + this.host + ":" + this.port + " failed - connect CLOSED";

  if (exports.debug) {
    util.log(message);
  }

  this.connected = false;
  this.emit('close');
  this.retry();
};

FluentLogger.prototype.retry = function() {
  if (this.retryTimer) {
    return;
  }

  this.retryTimer = setTimeout(function() {
    if (exports.debug) {
      util.log("Retrying connection...");
    }

    this.emit('retry');
    this.stream.connect(this.port, this.host);
    this.retryTimer = null;
  }.bind(this), 1000);
};

FluentLogger.prototype.post = function(tag, data) {
  var timestamp = Date.now() / 1000;
  var packet = JSON.stringify([tag, timestamp, data]);
  var buffer = new Buffer(packet);

  this.sendQueue(buffer);
};

FluentLogger.prototype.sendQueue = function(buffer) {
  try {
    this.stream.write(buffer);
  } catch(e) {
    this.queues.push(buffer);
  }
};

exports.FluentLogger = FluentLogger;
exports.createLogger = function(portArg, hostArg, options) {
  var port = portArg || 24224;
  var host = hostArg || '127.0.0.1';
    
  return new FluentLogger(port, host, options);
};
