var express = require("express"),
	crudr = require("crudr"), // Include CRUDr lib
	http = require("http"); 
	
var app = express();
var server = http.createServer();

var sessions = new express.session.MemoryStore();

app.use(express.cookieParser());
app.use(express.session({ secret: 'mysecret', store: sessions }));

// Main routes
app.get('/login', function(req, res) {
    req.session.user = 'myuser';
    res.redirect('/');
});

app.get('/logout', function(req, res) {
    req.session.user = undefined;
    res.redirect('/');
});

var auth = function(req, res, next) {
    if (!req.session.user) {
        next(new Error('Unauthorized'));
    } else {
        next();
    }
};

// override default config
var config = {
  "backends" : {
      "messages" : "memoryStore"
  }
}

// setup options
var options = {
    config: config,
    app: app, 
    server: server, 
	event: { messages: messages }
};

// initialize CRUDr
crudr.listen(options);

// post-init setup
crudr.db["messages"].use(crudr.helpers.cookieParser());
crudr.db["messages"].use(crudr.helpers.session({ store: sessions }));
crudr.db["messages"].use('create', 'update', 'delete', auth);


server.listen(80);
