var fs = require('fs'),
	path = require('path'),
	//crypto = require('crypto'),
	_ = require('underscore'),
	options = require('./options'),
	config = require('../config/default'),
	util = require('./util'),
	Sockets = require('./sockets'),
	Routes = require('./routes'),
	Backend = require('./backend');


var CRUDr = function (){

	// load stores
	this._loadStores();

}

CRUDr.prototype = {

	options : options,

	sockets : new Sockets(),
	routes : new Routes(),

	defaults: config,

	listen : function( options ) {

		var self = this;

		// extend defaults with the existing options
		// #23 FIX: extend default config with the existing config (recursive)
		var config = util.extend({}, this.defaults, (options.config|| {}) );
		// parse other options
		this._parseOptions( options );

		// initialize the backend
		this.db = this.backends( config );

		// setup routes if express is available
		if( !_.isEmpty( this.app) )
			this.routes.init( this.app, this.db, this.options );

		//  setup sockets if  server is available
		if( !_.isEmpty( this.server) ){
			this.sockets.init({
				server: this.server,
				db: this.db,
				session: this.session || false,
				options: this.options,
				filters: this._runFilters.bind(self),
				authority: this._runAuthority.bind(self)
			});
		}

		// return the io object in case the dev needs to make further setup
		return this.sockets.io;
	},

	// middleware support, as a generic way to set class level vars or sync filters
	use: function( middleware ){

		// if passing a method assums it's a filter
		if( typeof middleware == "function" ){
			this._filters.push( middleware );
		} else if( typeof middleware == "object" ){
			for( var i in middleware ){
				// supported keys = authority, filter
				if(i == "authority"){
					this[i] = middleware[i];
				} else if( i == "filter" ){
					this._filters.push[ middleware[i] ];
				}
			}
		}
		// separate condition for arrays?
	},

	// connects db objects with backend helpers
	backends: function( config ){
		// fallbacks
		config = config || {};
		// merge config with defaults (that also work as fallbacks ;)
		config = util.extend({}, this.defaults, config );
		// variables
		var backends = config.backends || false;
		var namespace = config.namespace || false;
		var store = config.store || false;
		var scope = config.scope || false;
		scope: scope
		var dbs = config.db || this._db || false;
		var stores = {};
		// prerequisites
		if( !backends || !dbs ) return stores;

		// loop through the backends
		for(var i in backends ){
			// variables
			var type;
			// fallback to the default type of store
			if( backends instanceof Array ){
				type = store;
				name = backends[i];
			} else {
				type = backends[i];
				name = i;
			}
			// if namespaced, save the info as part of the key
			var key = ( this.options.namespace && namespace)
				? namespace +"_"+ name
				: name;

			var backend = new Backend();
			// see if there's a db specifically for the backend (or return the whole object)
			var db = dbs[ key ] || dbs[ name ] || dbs;
			var sync = config.sync[ key ] || config.sync[ name ] || config.sync;
			// setup backend options
			var options = {
				name: name,
				namespace: namespace,
				middleware: this.stores[ type ]( db ),
				scope: scope,
				sync: sync
			};
			backend.use( options );

			// Proxy events on the backend back to the app
			/*var events = { 'created': 'create', 'updated': 'update', 'deleted': 'delete' };
			Object.keys(events).forEach(function(event) {
				backend.on(event, function(model) {
					console.log( events[event]);
				});
			});*/

			stores[ key ] = backend;

		}

		return stores;
	},
	// include dbs / backends
	add: function( config ){
		//console.log( "----- add ------");
		var db = config.db || false;
		var backends = config.backends || false;
		// stop if there's no db or backend
		if( !db || !backends ) return;
		// create new backends
		var dbs = this.backends( config );
		// extend the existing db object
		this.db = _.extend( this.db, dbs);
		// update routes
		this.routes.add( dbs );
		// update sockets
		this.sockets.add( dbs );

	},
	// update an existing backend
	update : function( config ){
		//console.log( "----- update ------");
		var db = config.db || false;
		var backends = config.backends || false;
		// stop if there's no db or backend
		if( !db || !backends ) return;
		// create new backends
		var dbs = this.backends( config );
		// extend the existing db object (replacing the old dbs)
		this.db = _.extend( this.db, dbs);
		// update routes
		this.routes.update( dbs );
		// update sockets
		this.sockets.update( dbs );

	},
	// remove a backend
	remove: function( config ){
		//console.log( "----- remove ------");
		var db = config.db || false;
		var backends = config.backends || false;
		// stop if there's no db or backend
		if( !db || !backends ) return;
		// create new backends
		var dbs = this.backends( config );
		// update routes
		this.routes.remove( dbs );
		// update sockets
		this.sockets.remove( dbs );

	},

	// internal
	// containers
	_filters: [],

	_parseOptions: function( options ){

		options = options || {};

		if( options.app ) this.app = options.app;
		if ( options.filter ) this._filters.push[options.filter];
		if ( options.server ) this.server = options.server;
		// support for express 2.x
		if ( typeof options.server == "undefined" && this.app) this.server = this.app;

		// always setup a db
		this._db = options.db || {};

		// delete options
		delete options.app;
		delete options.config;
		delete options.db;
		delete options.filter;
		delete options.server;
		delete options.session;

		// finally save the remaining options
		this.options = _.extend( this.options, options); // equation superfluous?

	},

	_loadStores: function(){
		var self = this;

		// container
		this.stores = this.stores  || {};

		fs.readdirSync(path.dirname(__dirname) + '/stores').forEach(function(filename) {
			// stop if this is not a js file
			if(filename.substr(-3) == ".js"){
				var name = path.basename(filename, '.js');
				self.stores.__defineGetter__(name, function() {
					return require('../stores/' + name);
				});
			}
		});
	},

	_runAuthority: function(req, res, callback){

		if(!this.config.auth) return callback( true );

		if( this.authority ){
			this.authority(req, res, callback);
		} else {
			return callback( false );
		}

	},

	_runFilters: function(req, res, callback){
		// run through filters,
		// only supporting one for now, use async module for more...
		if( this._filters.length ){
			this._filters[0](req, res, callback);
		} else {
			callback( false );
		}
	}

}


var crudr = new CRUDr();

module.exports = crudr;