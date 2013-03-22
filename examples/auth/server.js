var express = require("express"),
	crudr = require("crudr"), // Include CRUDr lib
	http = require("http"); 
	
var app = express();
var server = http.createServer(app);

// override default config
var config = {
  "backends" : {
      "test" : "memoryStore"
  },
  /* custom auth link:
  "routes" : {
	  "auth" : "auth"
  }
  */
}

// setup options
var options = {
    config: config,
    app: app, 
    server: server
};

// initialize CRUDr
crudr.listen(options);

// map  static folder
app.use(express.static(__dirname + '/public'));
  
// Authentication
// - simplistic example to verify client
app.get("/auth", function( req, res ){
	// verify host
	// create token
	var access_token = "234tyh34567865432";
	var expires_in = 3600; // an hour
	// send response
	res.send({ access_token: access_token, expires_in : expires_in });
});

server.listen(80);