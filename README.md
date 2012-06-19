# Fluent Logger Node.js

**fluent-logger-node** is a structured event logger for Fluent.

[![Build Status](https://secure.travis-ci.org/dakatsuka/fluent-logger-node.png)](http://travis-ci.org/dakatsuka/fluent-logger-node)

## Requirements

- Node.js v0.6 or higher
- fluentd

# Installation

```
npm install fluent-logger-node
```

# Usage

```
var fluent = require('fluent-logger-node');
var logger = fluent.createLogger();

logger.post("debug.test", {hello: "world!"});
// output: debug.test {"hello":"world!"}



var logger = fluent.createLogger({
  host: "127.0.0.1",
  port: 24224,
  tagPrefix: "app"
});

logger.post("app.test", {hello: "world!"});
// output: app.test {"hello":"world!"}
```

# License

The MIT License

# Contributors

- Dai Akatsuka
- Minoru Takase
