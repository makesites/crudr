(function () { 

	this.CRUDr = function ( key ){ 
	
		this.key = key;
		
		//this.url = window.location.protocol + "://" + window.location.host + "/" + window.location.pathname
		//this.authorize = this.url
		//this.redirect = 
		
		this.init();
		
		return this;
	}
	
	CRUDr.prototype = {
		init : function(){
			
			// get the token...
			var cookie = getCookie("access_token");
			var query = getQuery("access_token");
			
			// if (window.location.hash.length == 0) {
			if( typeof( cookie ) == "undefined" && typeof( query ) == "undefined" ){ 
			   var path = '/oauth/authorize?';
				var queryParams = ['client_id=' + this.key,
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
			 /*
		   var accessToken = window.location.hash.substring(1);
		   var path = "/read?";
		   var queryParams = [accessToken, 'callback=displayUser'];
		   var query = queryParams.join('&');
		   var url = path + query;
		   
			// use jsonp to call the graph
		   var script = document.createElement('script');
		   script.src = url; 
		   */    
		 
			
		}
	}

}).call(this);

// load the socket.io lib
(function() {
    var po = document.createElement('script'); po.type = 'text/javascript'; po.async = false;
    po.src = '/socket.io/socket.io.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(po, s);
  })();

(function() {
    //var socket = io.connect();
    //var origSync = Backbone.sync;
    var socket = {};
    var origSync = {};
    
    window.sync = function(method, model, options) {
        var backend = model.backend || (model.collection && model.collection.backend);
        
        var error = options.error || function() {};
        var success = options.success || function() {};
        
        // Don't pass the callbacks to the backend
        delete options.error;
        delete options.success;
        
        if (backend) {
            // Use Socket.IO backend
            backend.ready(function() {
                var req = {
                    method: method,
                    model: model.toJSON(),
                    options: options
                };
                
                backend.socket.emit('sync', req, function(err, resp) {
                    if (err) {
                        error(err);
                    } else {
                        success(resp);
                    }
                });
            });
        } else {
            // Call the original Backbone.sync
            origSync(method, model, options);
        }
    };
    
    var Promise = function(obj) {
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
    
    var inherit = function(Parent, Child, mixins) {
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
    
    var buildBackend = function(collection) {
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
    
    var Helpers = {
        // Listen for backend notifications and update the
        // collection models accordingly.
        bindBackend: function() {
            var self = this;
            var idAttribute = this.model.prototype.idAttribute;
            
            this.backend.ready(function() {
                var event = self.backend.options.event;
                
                self.bind(event + ':create', function(model) {
                    self.add(model);
                });
                self.bind(event + ':update', function(model) {
                    var item = self.get(model[idAttribute]);
                    if (item) item.set(model);
                });
                self.bind(event + ':delete', function(model) {
                    self.remove(model[idAttribute]);
                });
            });
        }  
    };
    /*
    Backbone.Collection = (function(Parent) {
        // Override the parent constructor
        var Child = function() {
            if (this.backend) {
                this.backend = buildBackend(this);
            }
            
            Parent.apply(this, arguments);
        };
        
        // Inherit everything else from the parent
        return inherit(Parent, Child, [Helpers]);
    })(Backbone.Collection);
	*/
})();

// helpers
function getQuery(name) {
	var query = window.location.search.substring(1);
	var vars = query.split("&");
	for (i=0; i < vars.length; i++) {
		var target = vars[i].split("=");
		if (target[0] == name) {
			return target[1];
		}
	}
}

// - cookies
function getCookie(name) {
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

function setCookie(name,val,expiry){
	var date = new Date( ( new Date() ).getTime() + parseInt(expiry) );
	var value=escape(val) + ((expiry==null) ? "" : "; expires="+date.toUTCString());
	document.cookie=name + "=" + value;
}

function checkCookie( name ){
	var cookie=getCookie( name );
	if (cookie!=null && cookie!=""){
		return true;
	} else {
		return false;
	}
}
