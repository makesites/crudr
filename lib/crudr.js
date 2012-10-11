var fs = require("fs"), 
	path = require("path"),
	//crypto = require('crypto'), 
	socketio = require('socket.io'),
	_ = require("underscore"),
	config = require('../config/default'),
	oauth = require('./oauth'),
	Backend = require('./backend'),
	Sync = require('./sync'), 
	io, db; 


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
	
	options : {}, 
	oauth : oauth, 
	listen : function(options) {
		// Configure default options
		var defaults = {
			config : {},
			app : {}
		}
		options.config || (options.config = {});
		options.app || (options.app = {});
		options.db || (options.db = {});
		// support for express 2.x
		if ( typeof options.server == "undefined" ) options.server = options.app;
		// options.res might not be needed...
		options.res || (options.res = {});
		options.res.event || (options.res.event = 'test');
		
		// save as a global var (change this to this.options with a class structure)
		this.options = options;
		
		// merge with default configuration
		config = _.extend( config, options.config );
		
		// initialize the backend
		db = this.backends( config.backends ); 
		
		// setup routes if express is available
		if( !_.isEmpty(options.app) ){
			// setup routes 
			setupRoutes( options.app );
			// setup static
			setupStatic( options.app );
		}
		
		//  setup sockets if  server is available
		if( !_.isEmpty(options.server) ){
			
			io = socketio.listen( options.server );
			//io.set('log level', 1);
			setupSockets( options.server, options.res );
			
		}
		
		return io;
	}, 
	
	backends : function(list) {
		
		var backends = {};
		
		for( i in list ){ 
			var backend = new Backend();
			
			// see if there's a db specifically for the backend (or return the whole object)
			var db =  (typeof this.options.db[i] != "undefined" ) ? this.options.db[i] : this.options.db; 
			
			backend.use(this.helpers[list[i]]( db ));
			
			// Proxy events on the backend back to the app
			/*var events = { 'created': 'create', 'updated': 'update', 'deleted': 'delete' };
			Object.keys(events).forEach(function(event) {
				backend.on(event, function(model) {
					console.log( events[event]);
				});
			});*/
			
			backends[i] = backend;
			
		}
		
		return backends;
	}


}


// Helpers

function setupRoutes( server ){
	
	// add crud events... 
	var routes = { 'post': 'create', 'get': 'read', 'put': 'update', 'del': 'delete' };
    var events = { 'post': 'created', 'get': 'read', 'put': 'updated', 'del': 'deleted' };
	
	Object.keys(routes).forEach(function(route) {
		// Collections
		server[route]( config.path + '/:domain', function reRoute(req, res) {
			
			// update the model from the URL, if required
			req.model || (req.model = {});
			// save the method requested
			req.method = routes[route];
			// fetch the data
			getData(req, res);
			
		});
		
		// Models
		server[route]( config.path + '/:domain/:id', function reRoute(req, res) {
				
			// update the model from the URL, if required
			req.model || (req.model = {});
			// set id
			req.model.id || (req.model.id = req.params.id );
			// save the method requested
			req.method = routes[route];
			req.promise = events[route];
			// fetch the data
			getData(req, res);
			
		});
		
	});
	// Alternative method with seperate paths for operations
	/*Object.keys(config.routes).forEach(function(route) {
	
		server.get( config.routes[route] + '/:domain/:id', function(req, res) {
			var domain = getBackend( req.params.domain );
			var backend = db[ domain ]; 
			// save the method requested
			req.method = route;
			backend.handle(req, res, function(err) {
				if (err) res.send(err);
				res.send( route +', domain: ' + req.params.domain + ' id: ' + req.params.id);
			});
		  
		});
	
	});*/
	
	/*
	// register app 
	server.get( config.action.register , function(req, res){ 
		// validate the request
		result = oauth.register( req.headers['host'] );
		res.send( result );
	});
	*/ 
	
	// reset app key
	/*
	server.get( config.action.reset , function(req, res){ 
		// validate the request
		result = oauth.reset( req.headers['host'] );
		res.send( result );
	});
	*/
	
	// consider decoupling this for every instance of crudr...
	// handle authentication
	server.get( '/oauth/:action', function(req, res){ 
		// validate the request
		//...
		var action = req.params.action;
		if( typeof( oauth[action] ) == "undefined") res.end({ error: "method not supported" });
		
		result = oauth[action]( req );
		
		if( !result ) res.end({ error: "oAuth "+ action +" failed" });
		
		// post-actions
		switch( action ){
			case "authorize":
			// condition when to redirect, based on the request_type and redirect_uri 
			//res.redirect( req.query.redirect_uri + '?' + serialize (result ) );
			res.send(result);
			break;
		}
		
		// if nothing matches this far, just end the request
		res.end();
		
	});
	
}

function setupStatic( server ){
	
    // Serve client-side code
    //io.static.add('/crudr.js', { file: __dirname + '/socket.js' });
    server.get( config.static["client.js"], function(req, res){
		//res.sendfile( __dirname + '/client.js' );

		fs.readFile( __dirname + '/client.js', function (err, data) {
			if (err) throw err;
			// manual replace - use a template instead ?
			/*res.render('client', {
				locals: {"socket.io.js": config.static["socket.io.js"]},
				headers: {'content-type': 'text/javascript'}
			});*/
			var host = "http://"+ req.headers['host'];
			data = data.toString().replace(/{{host}}/g, host);
			res.write(data);
			res.end();
		});

	});
	
}

function setupSockets( server, res ){
	// Listen for backend syncs
    Object.keys(db).forEach(function(domain) {
        io.of(domain).on('connection', function(socket) {
			var sync = new Sync(domain, socket, res);
            socket.on('listen', function(callback) {
				callback(res);
            });
            
			socket.on('sync', function(req, callback) {
				//req || (req = {});
				//req.method || (req.method = 'create');
                
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
	
}


function serialize(obj, prefix) {
    var str = [];
    for(var p in obj) {
        var k = prefix ? prefix + "[" + p + "]" : p, v = obj[p];
        str.push(typeof v == "object" ? 
            serialize(v, k) :
            encodeURIComponent(k) + "=" + encodeURIComponent(v));
    }
    return str.join("&");
}


function getBackend( domain ) {
	for(i in config.backends){
		// check if the domain exists
		if ( i == domain ) return domain;
		// alternatively check the name-domain
		if ( i == config.name +"_"+ domain ) return config.name +"_"+ domain;
	}
	// otherwise return false
	return false;
}

function getData(req, res) {

			var domain = ( typeof(config.domain_prefix) == "undefined" ) 
								? req.params.domain
								: config.domain_prefix+req.params.domain;
				
			req.backend = getBackend( domain );
			// exit now if no backend was found
			if(!req.backend) return;
			
			console.log( 'domain: ' + req.backend + ' id: ' + req.model.id);
			db[ req.backend ].handle(req, res, function(err) {
				if (err) res.end( JSON.stringify({ message: err}) );
			});
			db[ req.backend ].on(req.promise, function(model) {
				//console.log(model);
				res.send( model );
			});
			
}

var crudr = new CRUDr();

module.exports = crudr;