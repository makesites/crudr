var _ = require("underscore"),
	socketio = require('socket.io'),
	sessions = require('socket.io-handshake'),
	cookieParser = require('cookie-parser'),
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
		this.setup();
		// add backend events
		this.events( this.db );

	},

	setup: function(){
		var self = this;
		var io = this.io;

		// general events
		io.sockets.on('connection', function (socket) {
			// unique request object for every client
			var req = {};
			//
			req.socket = socket;
			req.sync = {};
			// authorize
			socket.on('token', function( data, callback ){
				var res = {};
				req.data = data;
				self.onToken(req, res, callback);
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
			// sessions
			socket.on('_set', function ( data, callback ) {
				// fallbacks
				callback = callback || function(){};
				//
				if( socket.handshake ){
					// sessions not ready?
					if( !socket.handshake.session ) return callback(false);
					if(typeof data == "object"){
						for( var i in data ){
							// sanitize data?
							socket.handshake.session[i] = data[i];
						}
					} else {
						var val = data;
						socket.handshake.session[val] = 1; // set boolean
					}
					// save session data (error control?)
					socket.handshake.session.save();
					// exec callback
					if( typeof callback == "function" ) callback(true);
				}
			});
			socket.on('_get', function ( key, callback ) {
				if( socket.handshake ){
					// sessions not ready?
					if( !socket.handshake.session ) return callback(false);
					var value = socket.handshake.session[ key ];
					// exec callback?
					if( typeof callback == "function" ) callback( value );
				} else {
					callback(""); // return error message?
				}
			});
		});

		// io middleware
		// - session support
		if( this.session ){
			// variables
			var options = {
				store: this.session.store || false,
				key: this.session.key || 'sid',
				secret: this.session.secret || '',
			};
			// prerequisite
			if( options.store ){
				options.parser = this.session.parser || cookieParser(options.secret);
				// add middleware
				io.use( sessions( options ) );
			}
		}
		// - logging (TBA)

		// + auth?

	},

	events: function( dbs ){

		var self = this;

		// Listen for backend syncs
		for( var domain in dbs ){
			var backend = dbs[ domain ];
			var options = {
				// replacing legacy event 'backend' with domain name
				event: domain,
				name: backend.name,
				namespace: backend.namespace,
				// defining scope for each domain name
				scope: backend.scope
			}

			this._db_options[domain] = options;
		}

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

	},

	// Domain methods

	// remove event listeners for domain
	unbind : function( domain ){
		/*
		var io = this.io;
		var backend = this._getBackend( domain );
		var namespace = this._getNamespace( domain );

		io.of( namespace ).in( backend ).removeAllListeners('connection');
		*/
	},

	add: function( db ){
		// update the db list
		for( var i in db ){
			this.db[i] = db[i];
		}
		// add new events
		this.events( db );
	},

	update: function( db ){

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
		// variables
		var data = res.data;
		var socket = req.socket;
		var domain = this._getDomain( req );
		var options = this._getOptions(domain);
		// prerequisites
		if( !options ) return callback( false );
		// init options once?
		// sync events for specific backend
		req.sync[domain] = req.sync[domain] || new Sync(domain, req.socket, options);

		// join the data backend 'channel'
		// run authority first...
		socket.join( req.data.name ); // is this already namespaced?

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
		var self = this;
		// make sure the user in the data domain
		// socket.rooms
		var domain = this._getDomain( req );
		var options = this._getOptions( domain );
		var socket = req.socket;
		var method = ( req.data )? req.data.method : false;
		if( !domain || !method ) return; // transmit anything?
		//req || (req = {});
		//req.method || (req.method = 'create');
		// add the user session (if available)

		//if(socket.session) req.session = socket.session;
		// use the right scope
		req.scope = options.scope; //overwrite what the client is requesting...
		//req.backend = options.backend;

		var sync = req.sync[domain];
		if( !sync ) return; // transmit anything?

		sync.handle(this.db[domain], req.data, function(err, result) {

			if (!err && method !== 'read') {
				// creating response object
				var res = {
					name: req.data.name,
					namespace: req.data.namespace || false,
					method: method,
					data: result
				};
				// alias for ending the request
				res.end = function(){
					callback(err, result);
				}
				// broadcast message to other clients
				self.onBroadcast(req, res);
			} else if(req.method == 'read') {
				// return data back to the client
				socket.emit('synced', method, result);
				res.end();
			}

		});

	},

	// generate a token based on OAuth credentials, using authority (TBA?)
	onAuth: function( req, res, callback ){

	},

	// verify an existing token
	onToken: function (req, res, callback ){
		var socket = req.socket;
		// check if there's an auth method
		//var auth = ( !this.auth ) ? true : self.auth(token);
		// disconnect the user if they are not authorized
		// check against config for auth flag first?
		//if( !auth ) return socket.disconnect();
		var token = res.token;
		//socket.set('access_token', token, function () { socket.emit('ready'); });
		// execute authentication authority
		if( this.authority ) return this.authority( req, res, function( auth ){
			if( auth ){
				socket.emit('ready');
				//callback( null, true );
			} else {
				socket.emit('failed');
				//callback( null, false );
			}
		});
	},

	onBroadcast: function(req, res){
		var io = this.io;
		var socket = req.socket;
		var namespace = socket.nsp.name;
		// potentially filter the members that recieve this update...
		// use async syntax instead...
		this.filters( req, res, function( result ){

			if( result ){
				// loop through group
				for( var i in result ){
					var id = result[i];
					io.sockets.socket( id ).emit('synced', res.method, res.data);
				}
			} else {
				// broadcast to all...
				// error control?
				socket.broadcast.to( res.name ).emit('synced', res.method, res.data);
				//io.of( namespace ).to( res.name ).emit('synced', res.method, res.data); // this is broadcasting to the sender as well...
			}
			res.end();

		});

	},

	// internal

	_db_options: {},
/*
	_setOptions: function( domain ){
		this._db_options[domain] = this.setupOptions(domain);
	},
*/
	_getOptions: function( domain ){
		return this._db_options[domain] || {}; // why the fallback?
	},

	_getDomain: function( req ){
		var socket = req.socket;
		var name = req.data.name || false; // does this always validate?
		// if we're not namespacing, just use the name
		if(!this.options.namespace) return name;
		var namespace = req.data.namespace || req.socket.nsp.name; // fallback to false?
		//if( !namespace ) return name;
		if( namespace !== "/" ){
			return name +"_"+ namespace;
		}
		// in all other cases return the backend name
		return name;
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