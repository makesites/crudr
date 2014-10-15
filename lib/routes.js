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
		var routes = { 'post': 'create', 'get': 'read', 'put': 'update', 'delete': 'delete' };
		var events = { 'post': 'created', 'get': 'read', 'put': 'updated', 'delete': 'deleted' };

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
				var authorize = (routes.auth) ? routes.auth : "";
				data = data.toString().replace(/{{host}}/gi, host).replace(/{{authorize}}/gi, authorize);
				res.writeHead(200, {'Content-Type': 'text/javascript'});
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

		console.log( domain );
		//console.log( this.db );
		//for(i in this.options.backends){
		for(i in this.db){
			// check if the domain exists
			if ( i == domain ) return domain;
			// alternatively check the name-domain
			if ( i ==  name +"_"+ domain ) return name +"_"+ domain;
		}
		// otherwise return false
		return false;
	},


	add : function( db ){
		// update the db list
		for( var i in db ){
			this.db[i] = db[i];
		}
		// anything else?
	},

	update : function( db ){

		// only add the new events
		for( var i in db ){
			// ...
			this.db[i] = db[i];
		}

	},

	remove : function( db ){

		// remove from the local db
		for( var i in db ){
			if( typeof this.db[i] != "undefined" ){
				// remove from db
				delete this.db[i];
			}
		}
		// anything else?

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

