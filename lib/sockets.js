var socketio = require('socket.io'),
	Sync = require('./sync');

module.exports = Sockets;

function Sockets() {
    this.io = {};
};

Sockets.prototype = {
	init : function( options ){
		var self = this;
		
		this.options = options;
		// save options as objects for future reference 
		for( i in options){
			this[i] = options[i] || false;
		}
		// if there is no server or db quite now
		if( !this.server || !this.db ) return;
		
		var io = socketio.listen( server );
		// no debug messages in production
		//this.io.set('log level', 1);
		
		// Listen for backend syncs
		Object.keys( this.db ).forEach(function(domain) {
			
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
					
					sync.handle(self.db[domain], req, function(err, result) {
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
					self.db[domain].on(event, function(model) {
						socket.emit('synced', events[event], model);
					});
				});
			});  
		});
		
		// save io for later...
		this.io = io;
		
	}, 
	
	setup : function( domain ){
		
		var scope = (typeof this.config.scope[domain] === "undefined") ? false : this.config.scope[domain];
		
		return {
			// replacing legacy event 'backend' with domain name
			event : domain, 
			// defining scope for each domain name
			scope : scope
		}
		
	}

}