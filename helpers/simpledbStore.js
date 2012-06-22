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
		
		aws.sdb.listDomains({}, 'sdb.amazonaws.com').onSuccess(function() {
		  console.log(this.requestId, this.data);
		})
		// create the domain (if not availabe)
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
				
                if( typeof( req.model.id ) == "undefined" ) req.model.id = (new Date).getTime();
				
				aws.sdb.putAttributes(
				  {
					domainName: req.backend,
					itemName: req.model.id,
					attributes: attributes,
				  }
				  // You can optionally override the default endpoint on a
				  // per-request basis as well.
				  //'sdb.us-west-1.amazonaws.com'
				).onSuccess(function() {
				  //console.log(this.requestId, this.data);
				  res.end(req.model);
				}).onFailure(function() {
				  console.log(this.requestId, this.error);
				  if (this.error) return next(this.error);
                    res.end(req.model);
				});
            },
            
            read: function() {
				
				var query = "select * from "+ req.backend;
				
				if (req.model.id) {
					query += " where  itemName() = '"+ req.model.id +"'";
				}
				
                aws.sdb.select({ selectExpression: query })
					
					.onSuccess(function() {
					  // it worked!
					  //console.log(this.requestId, this.data);
					  // deconstruct the response to an array
					  var collection = [];
					  for( i in this.data.items ){
						  var model = {};
						  model.id  = this.data.items[i].name;
						  var attributes = this.data.items[i].attributes;
						  for( k in attributes ){
							  model[attributes[k].name] = attributes[k].value;
						  }
						  collection.push(model);
					  }
					  //console.log( collection );
					  res.end(collection);
					  
					}).onFailure(function() {
					  console.log(this.requestId, this.error);
					  if (this.error) return next(this.error);
						res.end(req.model);
					});

            },
            
            update: function() {
                var attributes = [];
                for (var key in req.model) {
					if( key == "id" ) continue;
					attributes.push({ name: key, value: req.model[key], replace: true });
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
				  //console.log(this.requestId, this.data);
				  res.end(req.model);
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
				  //console.log(this.requestId, this.data);
				  res.end(req.model);
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

