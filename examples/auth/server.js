var express = require("express"),
	crudr = require("../../index"), // or as a module: crudr = require("crudr")
	http = require("http");

var app = express();
var server = http.createServer(app);

// Authentication
// - simplistic example to verify client
function authority( req, res, callback ){
	// verify token (against a db in production)
	var token = "37fff53aeb6094f55b0328082aaf1de7";
	return callback( token == req.data );
}

// override default config
var config = {
	auth: true,
	backends: ["test"]
}

// setup options
var options = {
	config: config,
	app: app,
	server: server
};

// initialize CRUDr
crudr.use({ authority: authority });
crudr.listen(options);

// map  static folder
app.use(express.static(__dirname + '/public'));


server.listen(80);