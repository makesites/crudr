var fs = require("fs"), 
	jade = require("jade"), 
	path = require("path"),
	//nconf = require("nconf"), 
	//crypto = require('crypto'), 
	//access = path.normalize( __dirname + '/../access/'), 
	socketio = require('socket.io'),
	extend = require("node.extend"),
	config = require('../config/default'),
	oauth = require('./oauth'),
	Backend = require('./backend'),
	Sync = require('./sync'), 
	io; 

//exports.version = '0.1.0';
/*
exports.create = function( container, data ){
		var file = fs.readFileSync( path.join(__dirname, "../views/crudr.jade"), 'utf8');

		// Compile template rendering function
		html = jade.compile(file, { pretty: true});
	
		return html({ container: container, data: data });
		
	};

exports.Backend = Backend;
*/
exports.oauth = oauth;

function createBackend() {
    return new Backend();
};

exports.listen = function(server, options) {
    // Configure default options
    options || (options = {});
    options.event || (options.event = 'backend');

	// initialize the backend
	var backend = createBackend();
	backend.use(this.helpers.memoryStore());
	backends = { mybackend: backend }; 
	
	// merge with default configuration
	options = config = extend( config, options);
	
	// setup routes 
	setupRoutes( server );
	
	// setup static
	setupStatic( server );
	
	// setup the sockets
    io = socketio.listen(server);
	
	// Listen for backend syncs
    Object.keys(backends).forEach(function(backend) {
        io.of(backend).on('connection', function(socket) {
            var sync = new Sync(backend, socket, options);
            
            socket.on('listen', function(callback) {
                callback(options);
            });
            
            socket.on('sync', function(req, callback) {
                sync.handle(backends[backend], req, function(err, result) {
                    callback(err, result);

                    if (!err && req.method !== 'read') {
                        socket.broadcast.emit('synced', req.method, result);
                    }
                });
            });
            
            // Proxy events on the backend to the socket
            var events = { 'created': 'create', 'updated': 'update', 'deleted': 'delete' };
            Object.keys(events).forEach(function(event) {
                backends[backend].on(event, function(model) {
                    socket.emit('synced', events[event], model);
                });
            });
        });  
    });
    
    return io;
};


function setupRoutes( server ){
	
	// add crud events... 
	
	// handle authentication
	server.get( config.auth , function(req, res){ 
		// validate the request
		result = oauth( req );
		if( typeof(result.token) != "undefined" ) 
			res.redirect('/#'+result.token);
	});
	
}

function setupStatic( server ){
	
    // Serve client-side code
    //io.static.add('/crudr.js', { file: __dirname + '/socket.js' });
    server.get( config.static["client.js"], function(req, res){
		res.sendfile( __dirname + '/client.js' );
	});
	
}

function setupSockets( server ){
	
}



exports.helpers = {};

fs.readdirSync(path.dirname(__dirname) + '/helpers').forEach(function(filename) {
    var name = path.basename(filename, '.js');
    exports.helpers.__defineGetter__(name, function() {
        return require('../helpers/' + name);
    });
});
