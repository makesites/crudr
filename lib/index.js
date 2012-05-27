var fs = require("fs"), 
	jade = require("jade"), 
	path = require("path");

exports.version = '0.1.0';

exports.create = function( container, data ){
		var file = fs.readFileSync( path.join(__dirname, "../views/cruder.jade"), 'utf8');

		// Compile template rendering function
		html = jade.compile(file, { pretty: true});
	
		return html({ container: container, data: data });
		
	};
