// Globals
var crudr;

(function() {

	// Variables
	var socket;

	var CRUDr = function (){

		//this.url = window.location.protocol + "://" + window.location.host + "/" + window.location.pathname
		this.init();

		return this;
	}

	CRUDr.prototype = {

		state : {
			init : false,
			auth : false,
			deps: false,
			socket: false,
			ready: false
		},

		// defaults
		options : {
			log : false,
			auth : true,
			namespace: ""
		},

		init : function(){
			var self = this;
			this.token = false;

			this.promise = new Promise();
			//this.promise.add( this.sockets );

			// this does nothing??
			//this.status("initialized");
		},

		connect: function( options, callback){
			var self = this;
			// fallbacks
			options = options || {};

			// merge with defaults (use object extend?)
			for( var i in options ){
				this.options[i] = options[i];
			}
			//this.redirect_uri = window.location;
			// add the (original) calback in the promise list
			if( typeof callback != "undefined" ) {
				this.promise.add( callback );
			}

			this.status("init");

		},

		sync : function(req, callbacks) {
			var self = this;
			// check if this.status is initialized first...
			socket.emit('sync', req, function(err, resp) {
				var log = self.options.log;
				if (err) {
					callbacks.error(err);
					if( log ) self.log( err );
				} else {
					//make sure the response is a JSON;
					var data = (typeof resp != "object") ? JSON.parse(resp) : resp;
					// fallback for null data
					if( data == null ) data = [];
					callbacks.success(data);
					if( log ) self.log( data );
				}
			});
		},

		// CRUD methods
		create: function( req, callbacks ){
			req.method = "create";
			this.sync(req, callbacks);
		},

		read: function( req, callbacks ){
			req.method = "read";
			this.sync("read", req, callbacks);
		},

		update: function( req, callbacks ){
			req.method = "update";
			this.sync("update", req, callbacks);
		},

		"delete": function( req, callbacks ){
			req.method = "delete";
			this.sync("delete", req, callbacks);
		},

		status : function( flag ){
			// states, in order expected
			switch( flag ){
				case "loaded":
					// flags
					this.state.deps = true;
					// events
					if(this.state.init) this.sockets();
				break;
				case "init":
					// flags
					this.state.init = true;
					// async execution - if deps loaded continue...
					if(this.state.deps) this.sockets();
				break;
				case "connected":
					// flags
					this.state.socket = true;
					// events
					this.auth();
				break;
				case "ready":
					// flags
					this.state.ready = true;
					// events
					this.promise.resolve();
				break;
				case "failed":
					// flags
					this.state.auth = false;
					// events
					// close connection
					socket.disconnect();
				break;
				case "disconnected":
					// flags
					this.state.socket = false;
					// events
					//... try again?
				break;
			};

			// log the state...
			var log = this.options.log;
			if( log ) this.log(flag);

		}

	}

	CRUDr.prototype.subscribe = function(options) {
		//
		options = options || {};
		var self = this;
		var name = options.name || false;
		var el = options.el || false;
		var log = this.options.log;

		var promise = new Promise( el );

		var options = {
			name: name,
			ready: promise.add
		};

		var backend = setupBackend( options );

		socket.emit('subscribe', { name: name }, function(options) {
			backend.options = options;
			socket.on('synced', function(method, resp) {
				var event = backend.options.event;

				// create standard events for "dumb" objects
				if(typeof el.trigger == "undefined"){
					// fallback to a regular event dispatcher
					var evt = document.createEvent("Events");
					evt.initEvent(event,true,true);
					evt.method = method;
					evt.response = resp;
					el.dispatchEvent(evt);

					var evt = document.createEvent("Events");
					evt.initEvent(event + ':' + method,true,true);
					evt.response = resp;
					el.dispatchEvent(evt);

				} else {
					el.trigger(event, method, resp);
					el.trigger(event + ':' + method, resp);
				}
				// log event
				if( log ) self.log( resp );
			});

			promise.resolve();
		});

		return backend;
	};


	// authenticate token
	CRUDr.prototype.auth = function(){
		// settings
		var log = this.options.log;

		this.token = this.token || this.options.token || Cookie.get("crudr_token") || false;
		var auth = this.options.auth;
		// authentication
		if( !auth ) return this.status("ready"); // skip this step
		// If token is provided expect a valid confirmation from the callback
		// unless auth=false, then the token is disegarded...
		if( this.token ){
			//authenticate
			socket.emit('token', this.token);
			//socket.emit('token', req, function(err, resp) {
		} else {
			// if authentication is required you'll need to sort out the token before connecting...
			return this.status("failed");
		};
/*
			// get the token...
			var token = ;

			// if (window.location.hash.length == 0) {
			//if( typeof( cookie ) == "undefined" && typeof( token ) == "undefined" ){
			if( typeof( token ) == "undefined" ){

				var path = '{{host}}/{{authorize}}';
				var params = [];
				// condition the use of the following params
				if( options.key ) params.push( 'client_id=' + options.key );
				if( options.secret ) params.push( 'client_secret=' + options.secret );
				// always add a redirect uri and the response type
				//params.push( 'redirect_uri=' + this.redirect_uri );
				params.push( 'response_type=token' );

				var url = path + "?" + params.join('&');

				//window.location= url;
				ajax( url, function( res ){ self.auth( res ); } );
*/


		/* OLD auth
		try{

			if( response.error ){
				this.status("failed");
				if( log ) this.log(response.message);
			} else {
				var token = response["access_token"];
				var expiry = response["expires_in"];
				// console.log access token?
				//
				// save token in cookie...
				Cookie.set("crudr_token", token, expiry); // namespace this to allow more than one cookies?
				this.token = token;
				// in any case set the state of the object to:
				this.status("authenticated");

			}
		} catch( e ) {
			// there was an exception in processing the request - output a default message (for now)
			console.log("There was an unexpected error loading CRUDr. Please send a report to: http://crudr.com/support");
		}
		*/

		/* else {
			this.state("connected");
		}
		*/

	};

	CRUDr.prototype.sockets = function(){
		var self = this;
		var io = this.io || window.io || io || false;

		if( !io) return this.log("sockets are not available");

		// initiate handshake
		socket = io('/'+ this.options.namespace );

		// main sockets switch
		socket.on('connect', function(){
			self.status("connected");
		});

		socket.on('ready', function () {
			self.status("ready");
		});

		socket.on('failed', function( auth ){
			self.status("failed");
		});

		socket.on('disconnect', function(){
			self.status("disconnected");
		});

	};

	// Based on the Paul Irish's log(): http://paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
	CRUDr.prototype.log = function(){
		this.history = this.history || [];   // store logs to an array for reference
		this.history.push(arguments);
		if(window.console){
			console.log( Array.prototype.slice.call(arguments) );
		}
	};


// Helpers (not available in the global namespace)

// - setup a backend
function setupBackend( options ){

	// extend options
	var req = options;
	// crud
	req.create = crud("create").bind(req);
	req.read = crud("read").bind(req);
	req.update = crud("update").bind(req);
	req.delete = crud("delete").bind(req);
	// is this needed?
	req.options = null;
	return req;
}

function crud( method ){

	return function( data, callbacks){
		//
		var req = {
			name: this.name,
			model: data
		};
		// execute global crudr method
		crudr[method](req, callbacks);
	}

}

// - grouping callbacks
function Promise (obj) {
	var args = null;
	var callbacks = [];
	var resolved = false;

	this.add = function(callback) {
		if (resolved) {
			callback.apply(obj, args);
		} else {
			callbacks.push(callback);
		}
	},

	this.resolve = function() {
		if (!resolved) {
			args = arguments;
			resolved = true;

			var callback;
			while (callback = callbacks.shift()) {
				callback.apply(obj, arguments);
			}

			callbacks = null;
		}
	}
};


// - create an ajax request
/*
function ajax( url, callback ){

	var req = new XMLHttpRequest();
	var self = this;

	req.open("GET",url,true);
	req.send(null);
	req.onerror = function(){
		console.log("there was an error with your request");
	};
	req.onload = function(e){
		var response = JSON.parse(e.target.responseText);
		callback.call(self, response);
	}

}
*/

// - cookies...
var Cookie = {
	get : function(name) {
		var i,key,value,cookies=document.cookie.split(";");
		for (i=0;i<cookies.length;i++){
			key=cookies[i].substr(0,cookies[i].indexOf("="));
			value=cookies[i].substr(cookies[i].indexOf("=")+1);
			key=key.replace(/^\s+|\s+$/g,"");
			if (key==name){
				return unescape(value);
			}
		}
	},

	set : function(name,val,expiry){
		var date = new Date( ( new Date() ).getTime() + parseInt(expiry) );
		var value=escape(val) + ((expiry==null) ? "" : "; expires="+date.toUTCString());
		document.cookie=name + "=" + value;
	},

	check : function( name ){
		var cookie=this.get( name );
		if (cookie!=null && cookie!=""){
			return true;
		} else {
			return false;
		}
	}

};

// lookup query params
function query(name) {
	var query = window.location.search.substring(1);
	var vars = query.split("&");
	for (i=0; i < vars.length; i++) {
		var target = vars[i].split("=");
		if (target[0] == name) {
			return target[1];
		}
	}
}


// create a new instance of the lib in the global namespace
this.crudr = new CRUDr();

}).call(this);

// load dependencies
// - the socket.io lib
var _socket_io_js = "{{host}}/socket.io/socket.io.js";

// could also use: //cdn.socket.io/socket.io-1.1.0.js

// #43 Optionally loading socket.io client
if(typeof io !== "undefined"){
	// sockets already loaded...
	crudr.status("loaded");
} else {
	// first check if there is a module loader
	if (typeof define === "function" && define.amd) {
		define([_socket_io_js], function( io ){
			crudr.io = io;
			crudr.status("loaded");
		});
	} else {
	// load the script with a new tag
		(function() {
			var po = document.createElement('script'); po.type = 'text/javascript'; po.async = false;
			po.src = _socket_io_js;
			po.onreadystatechange = po.onload = function(){ crudr.status("loaded") };
			var head = document.getElementsByTagName("head")[0];
			head.appendChild(po);
		})();
	}
}