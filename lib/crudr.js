var fs = require("fs"), 
	path = require("path"),
	//crypto = require('crypto'), 
	_ = require("underscore"),
	config = require('../config/default'),
	
	oauth = require('./oauth'),
	Sockets = require('./sockets'),
	Routes = require('./routes'),
	Backend = require('./backend'); 


var CRUDr = function (){ 
	
	var self = this;
	
	// load helper files
	this.helpers = {}; 
	
	fs.readdirSync(path.dirname(__dirname) + '/helpers').forEach(function(filename) {
		// stop if this is not a js file 
		if(filename.substr(-3) == ".js"){
			var name = path.basename(filename, '.js');
			self.helpers.__defineGetter__(name, function() {
				return require('../helpers/' + name);
			});
		}
	});
	
}
	
CRUDr.prototype = {
	
	defaults : {
			config : config,
			app : {},
			db : {}, 
			sync : false
	}, 
	
	oauth : oauth, 
	sockets : new Sockets(), 
	routes : new Routes(), 
	
	listen : function(options) {
		// support for express 2.x
		if ( typeof options.server == "undefined" ) options.server = options.app;
		// #23 FIX: extend default config with the existing config (recursive)
		for( i in config){
			options.config[i] = _.extend( config[i], options.config[i]);
		}
		
		// extend defaults with the existing options
		options = _.extend( this.defaults, options);
		// initialize the backend
		options.db = this.backends( options.db, options.config.backends ); 
		
		// save options as objects for future reference 
		for( i in options){
			this[i] = options[i];
		}
		
		// setup routes if express is available
		if( !_.isEmpty( this.app) )
			this.routes.init( this.app, this.db, this.config );
		
		//  setup sockets if  server is available
		if( !_.isEmpty( this.server) )
			this.sockets.init( options );
		
		
		// return the io object in case the dev needs to make further setup
		return this.sockets.io;
	}, 
	// connects db objects with backend helpers
	backends : function( dbs, backends) {
			
		var stores = {};
		// loop through the backends
		for(var i in backends ){ 
			var name = backends[i];
			
			var backend = new Backend();
			// see if there's a db specifically for the backend (or return the whole object)
			var db =  (typeof dbs[i] != "undefined" ) ? dbs[i] : dbs; 
			
			backend.use(this.helpers[name]( db ));
			
			// Proxy events on the backend back to the app
			/*var events = { 'created': 'create', 'updated': 'update', 'deleted': 'delete' };
			Object.keys(events).forEach(function(event) {
				backend.on(event, function(model) {
					console.log( events[event]);
				});
			});*/
			
			stores[i] = backend;
			
		}
		
		return stores;
	}


}


var crudr = new CRUDr();

module.exports = crudr;