
module.exports = Rest;

function Rest(backend, res, options) {
    this.backend = backend;
    this.res = res;
    this.options = options || {};
};

Rest.prototype.init = function(req) {
    var self = this;
    
    req.backend = this.backend;
    
    return {
        end: function(result) {
			self.res.end( JSON.stringify(result) );
        },
        error: function(err) {
            self.res.end( JSON.stringify(err) );
        }
    };
};

Rest.prototype.error = function(err) {
    var result = {
        error: err.name,
        message: err.message
    };
    
    if (this.options.debug) {
        result.stack = err.stack;
    }
    
    return result;
};

Rest.prototype.handle = function(backend, req, callback) {
    var self = this;
    var res = this.init(req);
    
    backend.handle(req, res, function(err) {
        if (err) console.log('respond', err);
    });
};