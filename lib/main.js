var fs = require('fs'),
	path = require('path'),
	//crypto = require('crypto'),
	_ = require('underscore'),
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

	options : {
			//config : config,
			//app : {},
			//db : {},
			sync : false,
			auth : false
	},

	sockets : new Sockets(),
	routes : new Routes(),

	listen : function(options) {

		var self = this;

		this.options = this._parseOptions( options );

		// initialize the backend
		this.db = this.backends();

		// setup routes if express is available
		if( !_.isEmpty( this.app) )
			this.routes.init( this.app, this.db, this.config );

		//  setup sockets if  server is available
		if( !_.isEmpty( this.server) )
			this.sockets.init( { server: this.server, db: this.db, config: this.config, filters: this._runFilters.bind(self) });

		// return the io object in case the dev needs to make further setup
		return this.sockets.io;
	},

	// middleware support, as a generic way to set class variables
	use: function( middleware ){

		// if passing a method assums it's a filter
		if( typeof middleware == "function" ){
			this._filters.push( middleware );
		} else if( typeof middleware == "object" ){
			for( var i in middleware ){
				// supported keys = authority, filter
				this[i] = middleware[i];
			}
		}
		// separate condition for arrays?
	},

	// connects db objects with backend helpers
	backends : function() {
		var backends = ( this.config ) ? this.config.backends : false;
		var stores = {};
		// if there are no backends, exit now...
		if( !backends ) return stores;

		// loop through the backends
		for(var i in backends ){
			// variables
			var type;
			// fallback to the default type of store
			if( backends instanceof Array ){
				type = this.config.store;
				name = backends[i];
			} else {
				type = backends[i];
				name = i;
			}

			var backend = new Backend();
			// see if there's a db specifically for the backend (or return the whole object)
			var db = this._db[ name ] || this._db;
			var sync = (this.options.sync) ? (this.options.sync[ name ] || false) : false;

			backend.use({ middleware: this.stores[ type ]( db ), sync: sync });

			// Proxy events on the backend back to the app
			/*var events = { 'created': 'create', 'updated': 'update', 'deleted': 'delete' };
			Object.keys(events).forEach(function(event) {
				backend.on(event, function(model) {
					console.log( events[event]);
				});
			});*/

			stores[ name ] = backend;

		}

		return stores;
	},
	// include dbs / backends
	add: function ( options ) {
		//console.log( "----- add ------");
		var db = options.db || false;
		var backends = options.backends || false;
		// stop if there's no db or backend
		if( !db || !backends ) return;
		// create new backends
		var dbs = this.backends( options );
		// extend the existing db object
		this.db = _.extend( this.db, dbs);
		// update routes
		this.routes.add( dbs );
		// update sockets
		this.sockets.add( dbs );

	},
	// update an existing backend
	update : function( options ){
		//console.log( "----- update ------");
		var db = options.db || false;
		var backends = options.backends || false;
		// stop if there's no db or backend
		if( !db || !backends ) return;
		// create new backends
		var dbs = this.backends( options );
		// extend the existing db object (replacing the old dbs)
		this.db = _.extend( this.db, dbs);
		// update routes
		this.routes.update( dbs );
		// update sockets
		this.sockets.update( dbs );

	},
	// remove a backend
	remove: function ( options ) {
		//console.log( "----- remove ------");
		var db = options.db || false;
		var backends = options.backends || false;
		// stop if there's no db or backend
		if( !db || !backends ) return;
		// create new backends
		var dbs = this.backends( options );
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

		// extend defaults with the existing options
		// #23 FIX: extend default config with the existing config (recursive)
		this.config = util.extend( config, (options.config|| {}) );

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
		delete options.filter;
		delete options.server;

		// finally save the remaining options
		return _.extend( this.options, options);

	},

	_loadStores:  function(){
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