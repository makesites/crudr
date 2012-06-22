/*
	Available SimpleDB methods: 
	
	batchDeleteAttributes
	batchPutAttributes
	createDomain
	deleteAttributes
	deleteDomain
	domainMetadata
	getAttributes
	listDomains
	putAttributes
	select
*/

module.exports = function(aws) {
    return function(req, res, next) {
		
		// create the domain if not availabe
		aws.sdb.createDomain({ domainName: req.backend});
		
        var callback = function(err, result) {
            if (err) return next(err);
            res.end(result);
        };
        
        var crud = {
            create: function() {
                var attributes = [];
                for (var key in req.model) {
					if( key == "id" ) continue;
					attributes.push({ name: key, value: req.model[key] });
                }
                var id = ( typeof( req.model.id ) != "undefined" ) ? req.model.id : (new Date).getTime();
				
				aws.sdb.putAttributes(
				  {
					domainName: req.backend,
					itemName: id,
					attributes: attributes,
				  }
				  // You can optionally override the default endpoint on a
				  // per-request basis as well.
				  //'sdb.us-west-1.amazonaws.com'
				).onSuccess(function() {
				  // it worked!
				  console.log(this.requestId, this.data);
				  callback(this.error, req.model);
				}).onFailure(function() {
				  // uh oh!
				  console.log(this.requestId, this.error);
				  if (this.error) return next(this.error);
                    res.end(req.model);
				});
            },
            
            read: function() {
                if (req.model.id) {
                    aws.sdb.select({ selectExpression: "select * from "+ req.backend +" where  itemName() = '"+ req.model.id +"'" })
					
					.onSuccess(function() {
					  // it worked!
					  console.log(this.requestId, this.data);
					  callback(this.error, req.model);
					}).onFailure(function() {
					  // uh oh!
					  console.log(this.requestId, this.error);
					  if (this.error) return next(this.error);
						res.end(req.model);
					});

                } else {
                    return false;
                }
            },
            
            update: function() {
                var attributes = [];
                for (var key in req.model) {
					if( key == "id" ) continue;
					attributes.push({ name: key, value: req.model[key], replace: true });
                }
                var id = ( typeof( req.model.id ) != "undefined" ) ? req.model.id : (new Date).getTime();
				
				console.log( attributes );
                aws.sdb.putAttributes(
				  {
					domainName: req.backend,
					itemName: id,
					attributes: attributes,
				  }
				  // You can optionally override the default endpoint on a
				  // per-request basis as well.
				  //'sdb.us-west-1.amazonaws.com'
				).onSuccess(function() {
				  // it worked!
				  console.log(this.requestId, this.data);
				}).onFailure(function() {
				  // uh oh!
				  console.log(this.requestId, this.error);
				  if (this.error) return next(this.error);
                    res.end(req.model);
				});

            },
            
            delete: function() {
				var attributes = [];
                for (var key in req.model) {
					if( key == "id" ) continue;
					attributes.push({ name: key, value: req.model[key], replace: true });
                }
				var id = ( typeof( req.model.id ) != "undefined" ) ? req.model.id : (new Date).getTime();
				
                aws.sdb.deleteAttributes({
					domainName: req.backend,
					itemName: id,
					attributes: attributes,
					expected: [ { name: "quantity", value: "1", exists: true } ]
				}).onSuccess(function() {
				  // it worked!
				  console.log(this.requestId, this.data);
				}).onFailure(function() {
				  // uh oh!
				  console.log(this.requestId, this.error);
				  if (this.error) return next(this.error);
                    res.end(req.model);
				});
            }
        };
        
        if (!crud[req.method]) return next(new Error('Unsuppored method ' + req.method));
        crud[req.method]();
    }
};

