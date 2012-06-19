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
var logger = fluent.createLogger(24224, '127.0.0.1');

logger.post("debug.test", {hello: "world!"});
```

# License

The MIT License

# Contributors

- Dai Akatsuka
- Minoru Takase
