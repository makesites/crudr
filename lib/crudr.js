var fs = require("fs"), 
	jade = require("jade"), 
	path = require("path"),
	socketio = require('socket.io'),
	config = require('../config/default'),
	Backend = require('./backend'),
	Sync = require('./sync');

//exports.version = '0.1.0';
/*
exports.create = function( container, data ){
		var file = fs.readFileSync( path.join(__dirname, "../views/crudr.jade"), 'utf8');

		// Compile template rendering function
		html = jade.compile(file, { pretty: true});
	
		return html({ container: container, data: data });
		
	};
*/

exports.Backend = Backend;

exports.createBackend = function() {
    return new Backend();
};

exports.listen = function(server, backends, options) {
    // Configure default options
    options || (options = {});
    options.event || (options.event = 'backend');

    var io = socketio.listen(server);

    // Serve client-side code
    //io.static.add('/crudr.js', { file: __dirname + '/socket.js' });
    server.get( config.static["client.js"], function(req, res){
		res.sendfile( __dirname + '/client.js' );
	});
	
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

exports.helpers = {};

fs.readdirSync(path.dirname(__dirname) + '/helpers').forEach(function(filename) {
    var name = path.basename(filename, '.js');
    exports.helpers.__defineGetter__(name, function() {
        return require('../helpers/' + name);
    });
});