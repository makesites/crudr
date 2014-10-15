var _ = require("underscore"),
	socketio = require('socket.io'),
	Sync = require('./sync');

module.exports = Sockets;

function Sockets() {
	this.io = {};
};

Sockets.prototype = {

	init : function( options ){
		var self = this;
		_.bindAll(this, 'onSubscribe', 'onSync', 'onToken');

		// save options as objects for future reference
		for( i in options){
			this[i] = options[i] || false;
		}

		// if there is no server or db, exit now
		if( !this.server || !this.db ) return;

		// save io for later...
		this.io = socketio( this.server );
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
		var io = this.io;

		// general events
		io.sockets.on('connection', function (socket) {
			// unique request object for every client
			var req = {};
			//
			req.socket = socket;
			req.sync = {};
			//
			socket.on('token', function( data ){
				var res = {};
				req.data = data;
				self.onToken(req, res);
			});
			// subscribe to a data channel
			socket.on('subscribe', function( data , callback ){
				var res = {};
				req.data = data;
				// attach the right events to the
				self.onSubscribe(req, res, callback);
			});
			socket.on('sync', function( data, callback ){
				var res = {};
				req.data = data;
				self.onSync(req, res, callback);
			});
		});

/*
		self.io.on('connection', function(socket) {

			// handle uthentication (if required)

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
*/
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

			self._setOptions( domain );

/*
			//

			//self.io.of(domain).on('connection', function(socket) {
				// check auth against domain this time

				socket.get('access_token', function (err, token) {
					var auth = ( !self.auth ) ? true : self.auth(token, domain);
					// disconnect the user if they are not authorized
					if( !auth ) return socket.disconnect();
				});

				var options = self.setup(domain);
				var sync = new Sync(domain, socket, options);

				socket.on('sync', function(req, callback) {
					//req || (req = {});
					//req.method || (req.method = 'create');
					// add the user session (if available)
console.log("socket.session", socket.session);
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
*/
			//});
		});

	},

	// Domain methods

	// remove event listeners for domain
	unbind : function( domain ){

		this.io.of(domain).removeAllListeners('connection');

	},

	add : function( db ){
		// update the db list
		for( var i in db ){
			this.db[i] = db[i];
		}
		// add new events
		this.events( db );
	},

	update : function( db ){

		// only add the new events
		if( this.db[i] )
		for( var i in db ){
			// remove events for specific domain
			if( typeof this.db[i] != "undefined" ){
				this.unbind( i );
			}
			this.db[i] = db[i];
		}
		// add new events
		this.events( db );

	},

	remove : function( db ){

		for( var i in db ){
			// remove events for specific domain
			if( typeof this.db[i] != "undefined" ){
				this.unbind( i );
				// remove from db
				delete this.db[i];
			}
		}

	},

	// Events methods
	onSubscribe: function(req, res, callback) {
		var self = this;
		// make sure data domain exists
		//data
		var data = res.data;
		var socket = req.socket;

		var domain = req.data.backend;
		if( !domain ) return callback( false );
		// init options once?
		var options = this._getOptions(domain);
		// sync events for specific backend
		req.sync[domain] = new Sync(domain, req.socket, options);

		// join the data backend 'channel'
		// run authority first...
		socket.join(domain);
		var store = this.db[domain];
		// Proxy events on the backend to the socket
		/*
		var events = { 'created': 'create', 'updated': 'update', 'deleted': 'delete' };
		Object.keys(events).forEach(function(event) {
			store.on(event, function(){
				socket.broadcast.to( domain ).emit('synced', events[event], data);
			});
		});
		*/
		// continue...
		callback(options);
	},

	onSync: function(req, res, callback) {
		// make sure the user in the data domain
		// socket.rooms
		var domain = req.data.backend;
		var options = this._getOptions( domain );
		var socket = req.socket;
		var method = req.data.method;
		//req || (req = {});
		//req.method || (req.method = 'create');
		// add the user session (if available)

		//if(socket.session) req.session = socket.session;
		// use the right scope
		req.scope = options.scope;
		//req.backend = options.backend;

		req.sync[domain].handle(this.db[domain], req.data, function(err, result) {

			callback(err, result);

			if (!err && method !== 'read') {
				socket.broadcast.to( domain ).emit('synced', method, result);
			} else if(req.method == 'read') {
				// return data back to the client
				socket.emit('synced', method, result);
			}
		});

	//});

	},

	onToken: function (req, res) {
		// get socket from session
		var socket = req.socket;
		// check if there's an auth method
		//var auth = ( !this.auth ) ? true : self.auth(token);
		// disconnect the user if they are not authorized
		//if( !auth ) return socket.disconnect();
		var token = res.token;
		//socket.set('access_token', token, function () { socket.emit('ready'); });
		socket.emit('ready');
	},

	// internal

	_db_options: {},

	_setOptions: function( domain ){
		this._db_options[domain] = this.setup(domain);
	},

	_getOptions: function( domain ){
		return this._db_options[domain] || {}; // why the fallback?
	},

/*
	getSocket: function(){
		var io = this.io;
		//var id = socket.io.engine.id;
		console.log( "id", id );
		return io.sockets.socket[id];

	}
*/
}