var socketio = require('socket.io'),
	Sync = require('./sync');

module.exports = Sockets;

function Sockets() {
    this.io = {};
};

Sockets.prototype = {
	init : function( server, db, options ){
		var self = this;
		
		this.server = server;
		this.db = db;
		this.options = options;
		
		var io = socketio.listen( server );
		// no debug messages in production
		//this.io.set('log level', 1);
		
		// Listen for backend syncs
		Object.keys(db).forEach(function(domain) {
			
			io.of(domain).on('connection', function(socket) {
				var options = self.setup(domain);
				var sync = new Sync(domain, socket, options);
				socket.on('listen', function(callback) {
					callback(options);
				});
				
				socket.on('sync', function(req, callback) {
					//req || (req = {});
					//req.method || (req.method = 'create');
					
					// use the right scope 
					req.scope = options.scope;
					
					sync.handle(db[domain], req, function(err, result) {
						callback(err, result);
						
						if (!err && req.method !== 'read') {
							socket.broadcast.emit('synced', req.method, result);
						} else if(req.method == 'read') {
							// return data back to the client
							socket.emit('synced', req.method, result);
						}
					});
				});
				
				// Proxy events on the backend to the socket
				var events = { 'created': 'create', 'updated': 'update', 'deleted': 'delete' };
				Object.keys(events).forEach(function(event) {
					db[domain].on(event, function(model) {
						socket.emit('synced', events[event], model);
					});
				});
			});  
		});
		
		// save io for later...
		this.io = io;
		
	}, 
	
	setup : function( domain ){
		
		var scope = (typeof this.options.scope[domain] === "undefined") ? false : this.options.scope[domain];
		
		return {
			// replacing legacy event 'backend' with domain name
			event : domain, 
			// defining scope for each domain name
			scope : scope
		}
		
	}

}