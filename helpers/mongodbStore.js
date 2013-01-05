module.exports = function( db ) {
    return function(req, res, next) {
        var callback = function(err, result) {
			if (err) return next(err);
			res.end(result);
        };
        
        var crud = {
            create: function() {
				db.insert(req.model, {safe:true}, callback);
            },
            
            read: function() {
				// "normalize" to what MongoDB expects
				if (req.model.id) req.model._id = req.model.id;
				
				if (req.model._id) {
					// model
                   db.find({ _id: req.model._id }, {limit:1}, callback);
                } else {
					// collection
					// - use a scope if available
					if(req.scope){ 
						db.find(req.model, req.scope, callback);
					} else {
						db.find(req.model, callback);
					}
                }
            },
            
            update: function() {
                // copy model and delete _id
                var model = req.model;
				delete model._id;
                
                db.update({ _id: req.model._id }, { '$set': model }, function(err) {
                    if (err) return next(err);
                    res.end(req.model);
                });
            },
            
            delete: function() {
                db.remove({ _id: req.model._id }, function(err) {
                    if (err) return next(err);
                    res.end(req.model);
                });
            }
        };
        
        if (!crud[req.method]) return next(new Error('Unsuppored method ' + req.method));
        crud[req.method]();
    }
};