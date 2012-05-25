var express = require("express"),
	jade = require("jade")
	// First important line: 
	cruder = require("cruder");

var app = express.createServer();

app.configure(function(){
    app.use(express.methodOverride());
    app.use(express.bodyParser());
    app.use(app.router);
	app.set('views', __dirname + '/views');
	// Second Important line: add the path of the static files for the module
	app.use(express.static(__dirname + '/node_modules/cruder/public'));
  

});

app.get('/', function(req, res){

  // Third important line: Generate the view with variables for the container and the data
  var output = cruder.create("container", "/sample-json/search.json");
  
  res.send( output );
  
});

app.configure('development', function(){
    //set path to static files
	app.use(express.static(__dirname + '/public'));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  var oneYear = 31557600000;
  //set path to static files (with expiry)
  app.use(express.static(__dirname + '/public', { maxAge: oneYear }));
  app.use(express.errorHandler());
});

app.listen(80);