var net = require('net');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

exports.debug = false;

var FluentLogger = function(port, host, options) {
  var options = options || {};
  this.port = port;
  this.host = host;
  this.connected = false;
  this.queues = [];
  this.retryTimer = null;
  this.bufferSize = options.bufferSize || 10000;
  this.head = 0;
  this.tail = 0;

  this.stream = net.createConnection(port, host);

  this.stream.on('connect', function() {
    this.onConnect();
  }.bind(this));

  this.stream.on('error', function(error) {
    this.onError(error);
    this.stream.destroy();
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

  if (this.queues.length > 0) {
    this.flushQueue();
  }

  this.emit('connect');
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
  if (this.connected) {
    try {
      this.stream.write(buffer, function (err) {
        if (err) {
          this.pushQueue(buffer);
        }
      }.bind(this));
    } catch(e) {
      this.pushQueue(buffer);
    }
  } else {
    this.pushQueue(buffer);
  }
};

FluentLogger.prototype.pushQueue = function(buffer) {
  this.queues[this.tail] = buffer;
  this.tail++;
  if (this.tail >= this.bufferSize) {
    this.tail = 0;
  }
  if (this.head === this.tail) {
    this.head++;
    if (this.head >= this.bufferSize) {
      this.head = 0;
    }
  }
};

FluentLogger.prototype.flushQueue = function() {
  var i;

  if (this.head > this.tail) {
    for (i = this.head; i < this.queues.length; i++) {
      this.sendQueue(this.queues[i]);
    }
    for (i = 0; i < this.tail; i++) {
      this.sendQueue(this.queues[i]);
    }
  } else {
    for (i = this.head; i < this.tail; i++) {
      this.sendQueue(this.queues[i]);
    }
  }

  this.queues = [];
  this.head = 0;
  this.tail = 0;
};

exports.FluentLogger = FluentLogger;
exports.createLogger = function(portArg, hostArg, options) {
  var port = portArg || 24224;
  var host = hostArg || '127.0.0.1';
    
  return new FluentLogger(port, host, options);
};
