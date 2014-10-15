var express = require("express"),
	crudr = require("../../index"), // or as a module: crudr = require("crudr")
	http = require("http");

var app = express();
var server = http.createServer(app);

// override default config
var config = {
	"backends": {
		"test": "memoryStore"
	}
}

// setup options
var options = {
	config: config,
	app: app,
	server: server
};

// initialize CRUDr
crudr.listen(options);

// map static folder
app.use(express.static(__dirname + '/public'));

// post-init setup
//crudr.db["messages"].use(crudr.helpers.cookieParser());
//crudr.db["messages"].use(crudr.helpers.session({ store: sessions }));
//crudr.db["messages"].use('create', 'update', 'delete', auth);


server.listen(80);
