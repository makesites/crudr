# CRUDr

__Open source module for socket-enabled CRUD operations in Node.js__


## Features

* Authentication compatible with OAuth2 (using middleware) 


## Install
```
	npm install crudr
```

## Usage

On the server:
```
	var http = require('http'), 
	crudr = require('crudr'), 
	app = http.createServer(),     
	
	app.listen(80);
	crudr.listen(options);
```

On the client:
```
	<script src="/crudr/client.js"></script>
	
	<script>
		crudr.connect( options, function(){ 
			// .. initiate app
		});
	</script>
	
```

## Dependencies 

- Socket.io
- Express (only for uri routes)
- Underscore



## Events

When a model is synced with a particular backend, the backend will trigger events
on the object (across multiple clients) that share the backend. 

To initialize the binding logic we create a backend key on the object of specific Model we are interested in


For example, 

```
var Model;
...
Model.backend = "{{name}}";
Model.backend = buildBackend( Model );
```

We can keep data synced in realtime with the following event bindings:

```
	var self = this;
	
	element.addEventListener('{{name}}:create', function(e) {
		var data = e.response;
	}, false);
	element.addEventListener('{{name}}:update', function(e) {
		var data = e.response;
	}, false);
	element.addEventListener('{{name}}:delete', function(e) {
		var data = e.response;
	}, false);
```

In addition to `{{name}}:create`, `{{name}}:read`, `{{name}}:update`, and `{{name}}:delete`
events, a generic `{{name}}` event is also triggered when a model is synced.
```	
	element.addEventListener('{{name}}', function(e) {
		// Method will be one of create, read, update, or delete
		var method = e.method;
		var data = e.response;
	});
```   
The event prefix `backend` is used by default but this can be customized by setting the
event name on the server.
```
	options.event = '{{name}}';
	crudr.listen(options);
```
More information on the [initialization options](https://github.com/makesites/crudr/wiki/Initialization-Options) is available [at the wiki](https://github.com/makesites/crudr/wiki/Initialization-Options)

## Backends

Backends are stacks of composable middleware (inspired by Connect) that are responsible
for handling sync requests and responding appropriately.  Each middleware is a function
that accepts request and response objects (and optionally a function that can be called
to continue down the stack).  A middleware will generally either return a result by
calling `end` on the response object or pass control downward.  For example, to add a
logger to our backend:

    var backend = crudr.createBackend();
    backend.use(function(req, res, next) {
        console.log(req.backend);
        console.log(req.method);
        console.log(JSON.stringify(req.model));
        next();
    });
    
    backend.use(crudr.helpers.memoryStore());
    
A request object will contain the following objects (in addition to those set by
the various middleware):

* `method`: the sync method (`create`, `read`, `update`, or `delete`)
* `model`: the model object to by synced
* `options`: any options set by the client (except success and error callbacks)
* `backend`: name of the backend responsible for handling the request
* `socket`: the client socket that initiated the request
    
We can also target only particular types of requests by passing the desired contexts to `use`:

    backend.use('create', 'update', 'delete', function(req, res, next) {
        if (isAuthorized(req)) {
            next();
        } else {
            next(new Error('Unauthorized'));
        }
    });
    
Or alternatively by using one of the four helper methods (`create`, `read`, `update`, `delete`):

    backend.read(function(req, res) {
        if (req.model.id) {
            req.end(mymodels[req.model.id]);
        } else {
            req.end(mymodels);
        }
    });
    
If the bottom of the middleware stack is reached before a result is returned then the requested
model is returned by default: `res.end(req.model)`. 

Clients are automatically notified of events triggered by other clients, however, there may
be cases where other server-side code needs to make updates to a model outside of a backend
handler.  In such a case, one can notify clients by emitting events directly on the backend.
For example:

    var backend = crudr.createBackend();
    backend.use(crudr.helpers.memoryStore());
    
    // Clients will receive 'backend:create', 'backend:update',
    // and 'backend:delete' events respectively.
    backend.emit('created', { id: 'myid', foo: 'bar' });
    backend.emit('updated', { id: 'myid', foo: 'baz' });
    backend.emit('deleted', { id: 'myid' });
 
    
## Customizing

In addition to middleware, the behavior of CRUDr can be customized via standard Socket.IO
mechanisms.  The object returned from the call to `listen` is the Socket.IO object and can be
manipulated further.  See [http://socket.io](http://socket.io) for more details.

## Tests

Install development dependencies:

    npm install
    
Run the test suite:

    make test
	

## Constributors

*	Makis Tracend
[github](http://github.com/tracend "Github account")
*	Lyndel Thomas
[github](https://github.com/ryndel "Github account")
*	Scott Nelson
[github](https://github.com/scttnlsn "Github account")


## Credits 

Distributed by [Makesites.org](http://makesites.org)

Released under the [Apache License, Version 2.0](http://makesites.org/licenses/APACHE-2.0)
