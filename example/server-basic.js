var express = require('express');
var crudr = require('../lib/index');

var app = express.createServer();
app.use(express.static(__dirname));

app.listen(3000);
console.log('http://localhost:3000/');

var messages = crudr.createBackend();
messages.use(crudr.middleware.memoryStore());

crudr.listen(app, { messages: messages });