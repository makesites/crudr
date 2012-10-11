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
		connect: function( key, options, callback){ 
			
			options || (options = {});
			this.options = options;
			this.callback = callback;
			this.redirect_uri = window.location;
			// get the token...
			var cookie = this.getCookie("access_token");
			//var query = this.getQuery("access_token");
			
			if( typeof( options.auth ) != "undefined" && !options.auth ) {
				// skip authentication 
			} else { 
				// if (window.location.hash.length == 0) {
				//if( typeof( cookie ) == "undefined" && typeof( query ) == "undefined" ){ 
				if( typeof( cookie ) == "undefined" ){ 

					var path = '{{host}}/oauth/authorize?';
					var queryParams = [	'client_id=' + key,
				 									'redirect_uri=' + this.redirect_uri,
													'response_type=token'];
				 
				   var query = queryParams.join('&');
				   var url = path + query;
				   //window.location= url;
				   this.ajaxRequest( url, this.processResponse );
				
				/* deprecated...
				 } else if( typeof( query ) != "undefined" && query != "false" ) {
					 // go straight to processing the response
					 processResponse();
				*/
				 
				 } else {
					 // continue with the cookie we already have...
					 //alert(cookie);
				 }
			}
			
			// call callback function
			if( this.status == "loaded" && typeof(callback) != "undefined" ) {
				callback();
			} else {
				this.promise.add(callback);
			}
			
		}, 
		sync : function(socket, req, callbacks) {
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
				if(status == "loaded") this.promise.resolve();
			}
		}
	}
 
    this.Promise = function(obj) {
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
    
    this.inherit = function(Parent, Child, mixins) {
        var Func = function() {};
        Func.prototype = Parent.prototype;

        mixins || (mixins = [])
        mixins.forEach(function(mixin) {
            _.extend(Func.prototype, mixin);
        });

        Child.prototype = new Func();
        Child.prototype.constructor = Child;

        return _.extend(Child, Parent);
    };
    
    this.buildBackend = function(collection) {
        var name = collection.backend;
        var promise = new Promise(collection);
        
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
				
				if(typeof collection.trigger == "undefined"){
					// fallback to a regular event dispatcher
					var evt = document.createEvent("Events");
					evt.initEvent(event,true,true); 
					evt.method = method; 
					evt.response = resp; 
					collection.el.dispatchEvent(evt);

            		var evt = document.createEvent("Events");
					evt.initEvent(event + ':' + method,true,true); 
					evt.response = resp; 
					collection.el.dispatchEvent(evt);

				} else {
                	collection.trigger(event, method, resp);
                	collection.trigger(event + ':' + method, resp);
				}
            });
            
            promise.resolve();
        });
        
					
        return backend;
    };


	// helpers
	// - cookies
	CRUDr.prototype.getCookie = function(name) {
		var i,key,value,cookies=document.cookie.split(";");
		for (i=0;i<cookies.length;i++){
			key=cookies[i].substr(0,cookies[i].indexOf("="));
			value=cookies[i].substr(cookies[i].indexOf("=")+1);
			key=key.replace(/^\s+|\s+$/g,"");
			if (key==name){
				return unescape(value);
			}
		}
	}
	
	CRUDr.prototype.setCookie = function(name,val,expiry){
		var date = new Date( ( new Date() ).getTime() + parseInt(expiry) );
		var value=escape(val) + ((expiry==null) ? "" : "; expires="+date.toUTCString());
		document.cookie=name + "=" + value;
	}
	
	CRUDr.prototype.checkCookie = function( name ){
		var cookie=getCookie( name );
		if (cookie!=null && cookie!=""){
			return true;
		} else {
			return false;
		}
	}

	CRUDr.prototype.getQuery = function(name) {
		var query = window.location.search.substring(1);
		var vars = query.split("&");
		for (i=0; i < vars.length; i++) {
			var target = vars[i].split("=");
			if (target[0] == name) {
				return target[1];
			}
		}
	}
	
	
	CRUDr.prototype.processResponse = function( response ){
		var token = response["access_token"];			
		var expiry = response["expires_in"];
		
		// save token in cookie... 
		this.setCookie("access_token", token, expiry);
		if( typeof(this.callback) == "undefined"){
			window.location= this.redirect_uri;
		}	else {
			this.callback.call(this, response);
		}
	}
	
	// create an ajax request
	CRUDr.prototype.ajaxRequest = function( url, callback ){
					
		var req = new XMLHttpRequest();
		var self = this;
		
		req.open("GET",url,true);
		req.send(null);
		req.onerror = function(){
			alert("there was an error with your request");
		};
		req.onload = function(e){
			var response = JSON.parse(e.target.responseText);
			callback.call(self, response);
		}
					
	}

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