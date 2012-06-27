/*
	Available SimpleDB methods: 
	
	BatchPutAttributes
	CreateDomain
	DeleteDomain
	ListDomains
	DomainMetadata
	DeleteAttributes
	PutAttributes
	Select
	GetAttributes
	
*/

module.exports = function(sdb) {
    return function(req, res, next) {
		
		// general parsing of the model
        var callback = function(err, result) {
			//console.log(err);
			if (err) return next(err);
            //console.log(result);
			res.end(req.model);
        };
        
		var createQuery = function(model, options){
			//default options
			options || (options = {});
			options.replace || (options.replace = false);
			options.json || (options.json = false);
			options.noAttr || (options.noAttr = false);
			
			var query = {};
			var count = 0;
			
			query.DomainName = req.backend;
			query.ItemName = model.id;
			// if we don't require any attributes end now
			if(options.noAttr) return query;
			
			// deal with attributes
			if(options.json) { 
				// save the whole model in one value
				query["Attribute.Name"] = "json"; 
				query["Attribute.Value"] = JSON.stringify(model); 
				if(options.replace) query["Attribute.Replace"] = true; 
				
			} else {
				// split the model to seperate attributes
				for (var key in model) {
					if( key == "id" ) continue;
					var item = new Array()
					query["Attribute."+ count +".Name"] = key; 
					query["Attribute."+ count +".Value"] = model[key]; 
					if(options.replace) query["Attribute."+ count +".Replace"] = true; 
					count++;
				}
			}
			
			return query;
		}
		
		var createResponse = function( result ) {
			
			// return empty if there are no results
			if( typeof(result["SelectResult"]["Item"]) == "undefined"){ 
				return {};
			}
			
			if( result["SelectResult"]["Item"] instanceof Array ){ 
			
				// deconstruct the response to an array
				var collection = [];
			
				for( i in result["SelectResult"]["Item"] ){
					var model = {};
					var attr = result["SelectResult"]["Item"][i]["Attribute"];
					
					// parse as independent attributes 
					var key = "";	
					for( k in attr ){
						
						switch(k){
							case "Name":
								key = attr[k];
								model[key] = 0;
							break;
							case "Value":
								if( key == "json" ){ 	
									model = JSON.parse( attr[k] );
								} else {
									model[key] = attr[k];
								}
							break;
						}
						//model[attr[k]["Name"]] = attr[k]["Value"];
					}
					// ovewrite any model id present with the Attribute Name
					model.id  = result["SelectResult"]["Item"][i]["Name"];
					collection.push(model);
					
				}
				
			} else {
				var model = {};
				var attr = result["SelectResult"]["Item"]["Attribute"];
				
				if( attr["Name"] == "json" ){ 	
					// parse as a json file
					model = JSON.parse( attr["Value"] );
				} else {
					model[attr["Name"]] = attr["Value"];
				}
				
				// ovewrite any model id present with the Attribute Name
				model.id  = result["SelectResult"]["Item"]["Name"];
				
			}
			
			// check if we have a model or collection returned 
			return collection || model;
			
		}
		
		// - helpers
		/*var size = function(obj) {
			var size = 0, key;
			for (key in obj) {
				if (obj.hasOwnProperty(key)) size++;
			}
			return size;
		}*/
	
		/*sdb.call("ListDomains", {}, function(err, result) {
		  console.log(JSON.stringify(result));
		});*/
		// create the domain (if not availabe)
		sdb.call("CreateDomain", { DomainName: req.backend }, function(err, result) {
            if (err) return next(err);
			console.log(JSON.stringify(result));
		});
        var crud = {
            create: function() {
                
				if( typeof( req.model.id ) == "undefined" ) req.model.id = (new Date).getTime();
			
				var query = createQuery( req.model, { json: true });
				
				sdb.call("PutAttributes", query, callback);
				
            },
            
            read: function() {
				
				var query = "select * from "+ req.backend;
				
				if (req.model.id) {
					query += " where  itemName() = '"+ req.model.id +"'";
				}
				
				sdb.call("Select", { SelectExpression: query }, function(err, result) {
					if (err) return next(err);
					res.end( createResponse(result) );
				});
				
            },
            
            update: function() {
                
                if( typeof( req.model.id ) == "undefined" ) req.model.id = (new Date).getTime();
				
				var query = createQuery( req.model, { replace : true, json: true });
				
				sdb.call("PutAttributes", query, callback);
				
            },
            
            delete: function() {
				
				if( typeof( req.model.id ) == "undefined" ) req.model.id = (new Date).getTime();
				
				var query = createQuery( req.model, { json: true, noAttr: true } );
				
				sdb.call("DeleteAttributes", query, callback);
				
            }
        };
        
        if (!crud[req.method]) return next(new Error('Unsuppored method ' + req.method));
        crud[req.method]();
    }
	
};

