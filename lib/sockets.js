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
		
		// if there is no server or db, exit now
		if( !this.server || !this.db ) return;
		
		// save io for later...
		this.io = socketio.listen( this.server );
		// sockets configuration (deserves its own function?)
		// - no debug messages in production
		//this.io.set('log level', 1);
		// initialize authentication (optionally)
		this.authorize();
		// add backend events
		this.events( this.db );
		
	}, 
	
	authorize: function(){
		var self = this;
	
		self.io.on('connection', function(socket) {
			
			// handle uthentication (if required)
			socket.on('token', function (token) {
				// check if there's an auth method
				var auth = ( !self.auth ) ? true : self.auth(token);
				// disconnect the user if they are not authorized
				if( !auth ) return socket.disconnect();
				socket.set('access_token', token, function () { socket.emit('ready'); });
			});
			
			// get the session info from app (express)
			if( self.sessions && typeof(self.sessions) != "undefined"  && typeof(self.app.cookieParser) != "undefined" ){ 
				// need to add this line to your express app 
				// app.cookieParser = express.cookieParser("session secret");
				self.app.cookieParser(socket.handshake, {}, function(err) {
					self.sessions.get(socket.handshake.signedCookies["connect.sid"], function(err, session) {
						// this is ridicilous btw - session info should be available in the socket by default
						socket.session = session;
					});
				});
			} 
			
		});
		
	}, 
	
	setup : function( domain ){
		
		var scope = ( this.config.scope && this.config.scope[domain]) ? this.config.scope[domain] : false;
		
		// check if we're namespacing the domains
		// if so, use the string after the first underscore
		var backend = ( this.config.namespace ) ? domain.substring( domain.indexOf("_") +1 ) : domain;
		
		return {
			// replacing legacy event 'backend' with domain name
			event : domain, 
			backend : backend, 
			// defining scope for each domain name
			scope : scope
		}
		
	}, 
	
	events : function( db ){
		
		var self = this;
		// Listen for backend syncs
		Object.keys( db ).forEach(function(domain) {
			
			self.io.of(domain).on('connection', function(socket) {
				// check auth against domain this time
				socket.get('access_token', function (err, token) {
					var auth = ( !self.auth ) ? true : self.auth(token, domain);
					// disconnect the user if they are not authorized
					if( !auth ) return socket.disconnect();
				});
				
				var options = self.setup(domain);
				var sync = new Sync(domain, socket, options);
				
				socket.on('listen', function(callback) {
					callback(options);
				});
				
				socket.on('sync', function(req, callback) {
					//req || (req = {});
					//req.method || (req.method = 'create');
					// add the user session (if available)
					
					if(socket.session) req.session = socket.session;
					// use the right scope 
					req.scope = options.scope;
					//req.backend = options.backend;
					
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
		
	}

}