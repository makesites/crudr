// Globals
var crudr, socket;

(function() {
    
	CRUDr = function (){ 
		
		//this.url = window.location.protocol + "://" + window.location.host + "/" + window.location.pathname
		//this.init();
		
		return this;
	}
	
	CRUDr.prototype = {
		init : function(){
			
			socket = io.connect();
			
			// initialize other logic
			if( typeof(this.callback) != "undefined" ) this.callback();
			
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
			
			this.callback = callback;
			// get the token...
			var cookie = getCookie("access_token");
			var query = getQuery("access_token");
			
			options || (options = {});
			
			if( typeof( options.auth ) != "undefined" && !options.auth ) {
				// skip authentication 
			} else { 
				// if (window.location.hash.length == 0) {
				if( typeof( cookie ) == "undefined" && typeof( query ) == "undefined" ){ 
				   var path = '{{authorize}}'+'?';
					var queryParams = ['client_id=' + key,
				 'redirect_uri=' + window.location,
				 'response_type=token'];
				   var query = queryParams.join('&');
				   var url = path + query;
				   window.location= url;
				 } else if( typeof( query ) != "undefined" && query != "false" ) {
					 var expiry = getQuery("expires_in");
					 // save token in cookie... 
					 setCookie("access_token", query, expiry);
					 
					 // redirect to the url without the query
				   var url = window.location.protocol + "//" + window.location.host + window.location.pathname;
				   window.location = url;
				 } else if (query == "false") {
					alert("CRUDr authentication failed");
				 }
			}
			
		}, 
		sync : function(socket, req, callbacks) {
				
                socket.emit('sync', req, function(err, resp) {
                    if (err) {
                        callbacks.error(err);
                    } else {
						//make sure the response is a JSON;
						var data = JSON.parse(resp);
                        callbacks.success(data);
                    }
                });
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

                collection.trigger(event, method, resp);
                collection.trigger(event + ':' + method, resp);
            });
            
            promise.resolve();
        });
        
        return backend;
    };


	// helpers
	// - cookies
	this.getCookie = function(name) {
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
	
	this.setCookie = function(name,val,expiry){
		var date = new Date( ( new Date() ).getTime() + parseInt(expiry) );
		var value=escape(val) + ((expiry==null) ? "" : "; expires="+date.toUTCString());
		document.cookie=name + "=" + value;
	}
	
	this.checkCookie = function( name ){
		var cookie=getCookie( name );
		if (cookie!=null && cookie!=""){
			return true;
		} else {
			return false;
		}
	}

	this.getQuery = function(name) {
		var query = window.location.search.substring(1);
		var vars = query.split("&");
		for (i=0; i < vars.length; i++) {
			var target = vars[i].split("=");
			if (target[0] == name) {
				return target[1];
			}
		}
	}


  this.crudr = new CRUDr();
  
}).call(this);

// load dependencies
// - the socket.io lib

(function() {
	var po = document.createElement('script'); po.type = 'text/javascript'; po.async = false;
	po.src = '{{socket.io.js}}';
	po.onreadystatechange = po.onload = function(){ crudr.init() };
	var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(po, s);
})();