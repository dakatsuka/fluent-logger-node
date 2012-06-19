var root = __dirname + "/../";
var path = require('path');
var net = require('net');
var util = require('util');
var fluent = require(path.join(root, 'lib/FluentLogger'));
var should = require('should');

var testPort = 24242;
var testHost = '127.0.0.1';

describe('FluentLogger', function() {
  var server;

  beforeEach(function(done) {
    server = new net.Server();
    server.listen(testPort, function() {
      done();
    });
  });

  afterEach(function(done) {
    try { server.close(); } catch(e) {}
    done();
  });

  describe('new instance', function() {
    it('should connect fluentd server', function(done) {
      server.on('connection', function(socket) {
        done();
      });
      new fluent.FluentLogger(testPort, testHost);
    });
  });

  describe('#post()', function() {
    var logger;

    it('should post log', function(done) {
      server.on('connection', function(socket) {
        socket.setEncoding('utf8');
        socket.on('data', function(data) {
          var json = JSON.parse(data);
          json[0].should.eql('test.fluent');
          json[1].should.be.a('number');
          json[2].should.eql({ foo: "bar" });
          done();
        });
      });

      logger = new fluent.FluentLogger(testPort, testHost);
      logger.post('test.fluent', { foo: "bar" });
    });
  });

  describe('retry feature', function() {
    beforeEach(function(done) {
      server.close();
      done();
    });

    it('should be retry if connection was broken', function(done) {
      var logger = new fluent.FluentLogger(testPort, testHost);
      var count = 1;

      logger.on('connect', function() {
        done();
      });

      server.listen(testPort);
    });
  });

  describe('buffer feature', function() {
    beforeEach(function(done) {
      server.close();
      process.nextTick(function() {
        done();
      });
    });

    it('should be push buffer if connection was broken', function(done) {
      var logger = new fluent.FluentLogger(testPort, testHost, { bufferSize: 100 });

      for (var i = 0; i < 10; i++) {
        logger.post('test.fluent', { foo: "bar" });
      }

      logger.head.should.eql(0);
      logger.tail.should.eql(10);
      logger.queues.length.should.eql(10);
      done();
    });

    it('should be rotated buffer if number of post is greater than buffer size', function(done) {
      var logger = new fluent.FluentLogger(testPort, testHost, { bufferSize: 10 });

      for (var i = 0; i < 15; i++) {
        logger.post('test.fluent', { foo: "bar" });
      }

      logger.head.should.eql(6);
      logger.tail.should.eql(5);
      logger.queues.length.should.eql(10);
      done();
    });
  });

  describe('flush buffer', function() {
    beforeEach(function(done) {
      server.close();
      process.nextTick(function() {
        done();
      });
    });

    it('should be flushed buffer after reconnected', function(done) {
      var logger = new fluent.FluentLogger(testPort, testHost);

      logger.on('connect', function() {
        logger.head.should.eql(0);
        logger.tail.should.eql(0);
        done();
      });

      for (var i = 0; i < 10; i++) {
        logger.post('test.fluent', { foo: "bar" });
      }

      server.listen(testPort, function () {});
    });
  });
});
