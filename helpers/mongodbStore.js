var ObjectID = require('mongodb').ObjectID;

module.exports = function( db ) {
    return function(req, res, next) {
        var callback = function(err, result) {
			if (err) return next(err);
			if (result) {
				// is the result always an array?
				for( var i in result ){
					// rename the "_id" to "id"
					if(result[i]._id){
						result[i].id = result[i]._id;
						delete result[i]._id;
					}
				}
			};
			res.end(result);
        };
        
        var crud = {
            create: function() {
				db.insert(req.model, {safe:true}, callback);
            },
            
            read: function() {
				// "normalize" to what MongoDB expects
				var id = (req.model.id) ? req.model.id : false;
				
				if (id) {
					// model
                   db.find({ _id: id }, {limit:1}, callback);
                } else {
					// collection
					// - use a scope if available
					if(req.scope){ 
						db.find(req.model, req.scope, callback);
					} else {
						db.find(req.model).toArray(callback);
					}
                }
            },
            
            update: function() {
				// copy model and delete id
				var id = req.model.id;
                var model = req.model;
				//delete model.id;
				//
				db.update({ _id: new ObjectID( id ) }, { '$set': model }, {safe:true}, function(err, result) {
					 if (err) return next(err);
                    res.end(req.model);
                });
            },
            
            delete: function() {
				var id = req.model.id;
				//
				db.remove({ _id: new ObjectID( id ) }, function(err, result) {
					if (err) return next(err);
                    res.end(req.model);
                });
            }
        };
        
        if (!crud[req.method]) return next(new Error('Unsuppored method ' + req.method));
        crud[req.method]();
    }
};