# CRUDr

__Open source module for socket-enabled CRUD operations in Node.js__


## Install

    npm install crudr


## Example

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
	options.event = 'myevent';
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


## License 

Distributed under the GPL v2
http://www.apache.org/licenses/LICENSE-2.0
