var fs = require("fs"),
	  Rest = require("./rest");

module.exports = Routes;

function Routes() {
    this.io = {};
};

Routes.prototype = {
	init: function( server, db, options ){
		this.server = server;
		this.db = db;
		this.options = options;
		// 
		this.crud();
		this.static();
	}, 
	crud: function(){
		var self = this;
		var server = this.server;
		var config = this.options.routes;
		// add crud events... 
		var routes = { 'post': 'create', 'get': 'read', 'put': 'update', 'del': 'delete' };
		var events = { 'post': 'created', 'get': 'read', 'put': 'updated', 'del': 'deleted' };
		
		Object.keys(routes).forEach(function(route) {
		
			// Collections
			server[route]( config.rest + '/:domain', function (req, res) {
				
				// update the model from the URL, if required
				req.model || (req.model = {});
				// save the method requested
				var route = req.method.toLowerCase();
				req.method = routes[route];
				req.promise = events[route];
				
				// fetch the data
				self.get(req, res);
				
			});
			
			// Models
			server[route]( config.rest + '/:domain/:id', function (req, res) {
				
				// update the model from the URL, if required
				req.model || (req.model = {});
				// set id
				req.model.id || (req.model.id = req.params.id );
				// save the method requested
				var route = req.method.toLowerCase();
				req.method = routes[route];
				req.promise = events[route];
				
				// fetch the data
				self.get(req, res);
				
			});
			
		});
		// Alternative method with seperate paths for operations
		/*Object.keys(config.routes).forEach(function(route) {
		
			server.get( config.routes[route] + '/:domain/:id', function(req, res) {
				var domain = this.backend( req.params.domain );
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
		server.get( config.oauth +'/:action', function(req, res){ 
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
		
	}, 

	static : function(){
		
		var server = this.server;
		var routes = this.options.routes;
		
		// Serve client-side code
		//io.static.add('/crudr.js', { file: __dirname + '/socket.js' });
		
		server.get( routes.client, function(req, res){
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
		
	}, 

	get : function( req, res ){
		
			var domain = ( typeof(this.options.domain_prefix) == "undefined" ) 
								? req.params.domain
								: this.options.domain_prefix+req.params.domain;
				
			var backend = this.backend( domain );
			// exit now if no backend was found
			if(!backend) return;
			
			var rest = new Rest(backend, res, {});
			
			rest.handle(this.db[ backend ], req, function(err, result) {
				if (err) res.end( JSON.stringify({ message: err}) );
			});
			// wtf?
			this.db[ backend ].on(req.promise, function(model) {
				res.send( model );
			});
			
	}, 
	
	backend : function( domain ){
		// app name
		var name = this.options.name;
		
		for(i in this.options.backends){
			// check if the domain exists
			if ( i == domain ) return domain;
			// alternatively check the name-domain
			if ( i ==  name +"_"+ domain ) return name +"_"+ domain;
		}
		// otherwise return false
		return false;
	}
	
}

// Helpers

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

