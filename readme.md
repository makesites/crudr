# CRUDr

__Open source module for socket-enabled CRUD operations in Node.js__


## Install

    npm install crudr


## Example

On the server:
```
	var http = require('http'), 
	crud = require('crudr'), 
	app = http.createServer(),     
	
	app.listen(3000);
	crudr.listen(app, options);
```

On the client:
```
	<script src="/client.js"></script>
    
	<script>
	crudr.connect( key, options, function(){ 
	// .. initiate app
	});
	</script>
	
```

## Dependencies 

- Socket.io
- Express
- Nconf



## Events

When a model is synced with a particular backend, the backend will trigger events
on collections (across multiple clients) that share the backend.  For example, we
could keep collections synced in realtime with the following event bindings:

```
	var self = this;
	
	this.bind('backend:create', function(model) {
	self.add(model);
	});
	this.bind('backend:update', function(model) {
	self.get(model.id).set(model);
	});
	this.bind('backend:delete', function(model) {
	self.remove(model.id);
	});
```

In addition to `backend:create`, `backend:read`, `backend:update`, and `backend:delete`
events, a generic `backend` event is also triggered when a model is synced.
```	
	this.bind('backend', function(method, model) {
	// Method will be one of create, read, update, or delete
	});
```   
The event prefix `backend` is used by default but this can be customized by setting the
event name on the server.
```
	crudr.listen(app, options, { event: 'myevent' });
```

## Backends and Middleware

Backends are stacks of composable middleware (inspired by Connect) that are responsible
for handling sync requests and responding appropriately.  Each middleware is a function
that accepts request and response objects (and optionally a function that can be called
to continue down the stack).  A middleware will generally either return a result by
calling `end` on the response object or pass control downward.  For example, let's add a
logger middleware to our backend:

    var backend = crudr.createBackend();
    backend.use(function(req, res, next) {
        console.log(req.backend);
        console.log(req.method);
        console.log(JSON.stringify(req.model));
        next();
    });
    
    backend.use(crudr.middleware.memoryStore());
    
A request object will contain the following components (in addition to those set by
various middleware):

* `method`: the sync method (`create`, `read`, `update`, or `delete`)
* `model`: the model object to by synced
* `options`: any options set by the client (except success and error callbacks)
* `backend`: name of the backend responsible for handling the request
* `socket`: the client socket that initiated the request
    
Middleware can also be applied to only particular types of requests by passing the desired
contexts to `use`:

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
model is returned by default: `res.end(req.model)`.  Look in the `middleware` directory for more
examples.

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

In addition to middleware, the behavior of Backbone.IO can be customized via standard Socket.IO
mechanisms.  The object returned from the call to `listen` is the Socket.IO object and can be
manipulated further.  See http://socket.io for more details.

## Tests

Install development dependencies:

    npm install
    
Run the test suite:

    make test
	

## Constributors

*	Makis Tracend <makis@makesit.es> 
[github](http://github.com/tracend/ "Github account")
[website](http://makesites.org/ "Make Sites .Org")

based on the structure of backbone.io by Scott Nelson

## License 

Distributed under the GPL v2
http://www.apache.org/licenses/LICENSE-2.0
