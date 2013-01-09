// Globals
var crudr, socket;

(function() {
    
	CRUDr = function (){ 
		
		//this.url = window.location.protocol + "://" + window.location.host + "/" + window.location.pathname
		this.init();
		
		return this;
	}
	
	CRUDr.prototype = {
		status : false, 
		init : function(){
			
			this.promise = new Promise();
			this.promise.add(function(){
				socket = io.connect('{{host}}');
			});
			
			this.state("initialized");
			/*
			// main sockets switch
			socket.on('connect', function(){ 
				SOCKETS = true;
				
			});
			
			socket.on('disconnect', function(){ 
				SOCKETS = false;
			});
			*/
		}, 
		connect: function( options, callback){ 
			
			options || (options = {});
			this.options = options;
			this.redirect_uri = window.location;
			// add the (original) calback in the promise list
			if( typeof callback != "undefined" ) {
				this.promise.add( callback );
			}
			//var token = query("access_token");
			// set auth state
			if( typeof options.auth == "undefined" ) options.auth = true;
			
			
			// If key is provided expect a valid confirmation from the callback
			// unless auth=false, then the key is disegarded...
			if( typeof options.key != "undefined" &&  options.auth ) {
				
				// get the token...
				var cookie = Cookie.get("access_token");
			
				// if (window.location.hash.length == 0) {
				//if( typeof( cookie ) == "undefined" && typeof( token ) == "undefined" ){ 
				if( typeof( cookie ) == "undefined" ){ 
					
					var path = '{{host}}/{{authorize}}';
					var params = [	
										'client_id=' + key,
										'redirect_uri=' + this.redirect_uri,
										'response_type=token'
										];
					
					var url = path + "?" + params.join('&');
					//window.location= url;
					ajax( url, this.auth );
					
				
				} else {
					// continue with the cookie we already have...
					//alert(cookie);
				
				}
			} else {
				
				// skip authentication...  
				
				if( this.status == "loaded" ) {
					this.promise.resolve();
				}
				/* 
				 else {
					this.state("connected");
				}
				*/
			}
			
			
			
		}, 
		sync : function(socket, req, callbacks) {
			// check if this.status is initialized first...
			socket.emit('sync', req, function(err, resp) {
				if (err) {
					callbacks.error(err);
				} else {
					//make sure the response is a JSON;
					var data = (typeof resp != "object") ? JSON.parse(resp) : resp;
					callbacks.success(data);
				}
			});
		}, 
		state : function( status ){
			if(typeof status != "undefined") { 
				this.status = status;
				// load the sockets as soon as possible
				if(status == "loaded") this.promise.resolve();
			}
		}
		
	}
 
    CRUDr.prototype.subscribe = function(options) {
        //
		if(typeof options == "undefined") options = {};
		var name = options.name || false;
        var el = options.el || false;
        
		var promise = new Promise( el );
        
		var backend = {
            name: name,
            socket: socket.of(name),
            options: null,
            ready: promise.add
        };
        
		backend.socket.emit('listen', function(options) {
            backend.options = options; 
            backend.socket.on('synced', function(method, resp) {
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
            });
            
            promise.resolve();
        });
        
					
        return backend;
    };
	
	
	CRUDr.prototype.auth = function( response ){
		
		try{ 
			var token = response["access_token"];			
			var expiry = response["expires_in"];
			
			// save token in cookie... 
			Cookie.set("access_token", token, expiry);
			
		} catch( e ) {
			// there was an exception in processing the request - output a default message (for now) 
			console.log("CRUDr could not be loaded at the present time"); 
			
		}
		// in any case set the state of the object to: 
		if( this.status == "loaded" ) {
			this.promise.resolve();
		} 
		/* else {
			this.state("connected");
		}
		*/
		
	}
	
// Helpers (not available in the global namespace) 
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

(function() {
	var po = document.createElement('script'); po.type = 'text/javascript'; po.async = false;
	po.src = '{{host}}/socket.io/socket.io.js';
	po.onreadystatechange = po.onload = function(){ crudr.state("loaded") };
	var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(po, s);
})();