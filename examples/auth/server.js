var express = require('express');
var crudr = require('../lib/index');

var sessions = new express.session.MemoryStore();
var app = express.createServer();

app.use(express.cookieParser());
app.use(express.session({ secret: 'mysecret', store: sessions }));
app.use(express.static(__dirname));

app.get('/login', function(req, res) {
    req.session.user = 'myuser';
    res.redirect('/');
});

app.get('/logout', function(req, res) {
    req.session.user = undefined;
    res.redirect('/');
});

app.listen(3000);
console.log('http://localhost:3000/');

var auth = function(req, res, next) {
    if (!req.session.user) {
        next(new Error('Unauthorized'));
    } else {
        next();
    }
};

var messages = crudr.createBackend();
messages.use(crudr.middleware.cookieParser());
messages.use(crudr.middleware.session({ store: sessions }));
messages.use('create', 'update', 'delete', auth);
messages.use(crudr.middleware.memoryStore());

crudr.listen(app, { messages: messages });