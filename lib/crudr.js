var fs = require("fs"), 
	jade = require("jade"), 
	path = require("path"),
	//nconf = require("nconf"), 
	//crypto = require('crypto'), 
	//access = path.normalize( __dirname + '/../access/'), 
	socketio = require('socket.io'),
	extend = require("node.extend"),
	config = require('../config/default'),
	oauth = require('./oauth'),
	Backend = require('./backend'),
	Sync = require('./sync'), 
	io, db; 

//exports.version = '0.1.0';
/*
exports.create = function( container, data ){
		var file = fs.readFileSync( path.join(__dirname, "../views/crudr.jade"), 'utf8');

		// Compile template rendering function
		html = jade.compile(file, { pretty: true});
	
		return html({ container: container, data: data });
		
	};

exports.Backend = Backend;
*/
exports.oauth = oauth;

exports.backends = function(list) {
    
	var backends = {};
	
	for( i in list ){ 
		var backend = new Backend();
		backend.use(this.helpers[list[i]]( config.db ));
		
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
};

exports.listen = function(server, options, res) {
    // Configure default options
    res || (res = {});
    res.event || (res.event = 'backend');

	// merge with default configuration
	config = extend( config, options);
	
	// initialize the backend
	db = this.backends(config.backends); 
	
	// setup the sockets
    io = socketio.listen(server);
	
	// setup routes 
	setupRoutes( server );
	
	// setup static
	setupStatic( server );
	
	// setup static
	setupSockets( server, res );
	
    
    return io;
};


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
		if( typeof( oauth[action] ) == "undefined") res.end("method not supported");
		
		result = oauth[action]( req );
		
		if( !result ) res.end("oAuth "+ action +" failed");
		
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



exports.helpers = {};

fs.readdirSync(path.dirname(__dirname) + '/helpers').forEach(function(filename) {
    var name = path.basename(filename, '.js');
    exports.helpers.__defineGetter__(name, function() {
        return require('../helpers/' + name);
    });
});

// helpers
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
			
			//console.log( route +', domain: ' + req.backend + ' id: ' + req.model.id);
			db[ req.backend ].handle(req, res, function(err) {
				if (err) res.end( JSON.stringify({ message: err}) );
			});
			db[ req.backend ].on(req.promise, function(model) {
				//console.log(model);
				res.send( model );
			});
			
}
