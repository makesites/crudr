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
			res.end( result );
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
			for (var key in model) {
				//if( key == "id" ) continue;
				var item = new Array()
				query["Attribute."+ count +".Name"] = key; 
				query["Attribute."+ count +".Value"] = ( typeof(model[key]) != "object") ? model[key] : JSON.stringify(model[key]); 
				if(options.replace) query["Attribute."+ count +".Replace"] = true; 
				count++;
			}
			/*
			if(options.json) { 
				// save the whole model in one value
				//query["Attribute.Name"] = "json"; 
				//query["Attribute.Value"] = JSON.stringify(model); 
				//if(options.replace) query["Attribute.Replace"] = true; 
				for (var key in model) {
					//if( key == "id" ) continue;
					var item = new Array()
					query["Attribute."+ count +".Name"] = key; 
					query["Attribute."+ count +".Value"] = model[key]; 
					if(options.replace) query["Attribute."+ count +".Replace"] = true; 
					count++;
				}
				
			} else {
				// split the model to seperate attributes
				for (var key in model) {
					//if( key == "id" ) continue;
					var item = new Array()
					query["Attribute."+ count +".Name"] = key; 
					query["Attribute."+ count +".Value"] = model[key]; 
					if(options.replace) query["Attribute."+ count +".Replace"] = true; 
					count++;
				}
			}*/
			
			return query;
		}
		
		var createResponse = function( data ) {
					
			// return empty if there are no results
			if( typeof(data["Item"]) == "undefined"){ 
				return false;
			}
				
			if( data["Item"] instanceof Array ){ 
			
				// deconstruct the response to an array
				var collection = [];
			
				for( i in data["Item"] ){
					
					var model = {};
					var attr = data["Item"][i]["Attribute"];
					//var attr = data["Item"][i];
					
					// parse as independent attributes 
					var key = "";	
					for( k in attr ){
						
						try{
							model[attr[k]["Name"]] = JSON.parse( attr[k]["Value"] );
						} catch(err) {
							// output err.message ?
							model[attr[k]["Name"]] = attr[k]["Value"];
						}
						
					}
					// ovewrite any model id present with the Attribute Name
					model.id  = data["Item"][i]["Name"];
					collection.push(model);
					
				}
				
			} else {
				
				var model = {};
				var attr = data["Item"]["Attribute"];
				
				for (var i in attr) {
					try{
						model[attr[i]["Name"]] = JSON.parse( attr[i]["Value"] );
					} catch(err) {
						// output err.message ?
						model[attr[i]["Name"]] = attr[i]["Value"];
					}
				}
				
				// ovewrite any model id present with the Attribute Name
				model.id  = data["Item"]["Name"];
				
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
		/*
		sdb.call("CreateDomain", { DomainName: req.backend }, function(err, result) {
            if (err) return next(err);
			//console.log(JSON.stringify(result));
		});
		*/
        var crud = {
            create: function() {
                // create a new id 
				if( typeof( req.model.id ) == "undefined" ) req.model.id = (new Date).getTime();
			
				var query = createQuery( req.model, { json: true });
				
				sdb.call("PutAttributes", query, function(err, result) {
					if (err) return callback(err);
					// return the data back to the client
					callback(err, req.model);
				});
				
            },
            
            read: function() {
				
				var query = "select * from "+ req.backend;
				
				if (req.model.id) {
					query += " where  itemName() = '"+ req.model.id +"'";
				}
				
				sdb.call("Select", { SelectExpression: query }, function(err, result) {
					if (err) return callback(err);
					var response = createResponse( result["SelectResult"] );
					// pass as an array if no id requested
					// convert to an array if returning a single object
					if ( (typeof req.model.id == "undefined") && !(response instanceof Array) ){
						response = [response];
					}
					callback(err, response);
					//if(!response) response = req.model;
					//res.end( JSON.stringify( response ) );
				});
				
            },
            
            update: function() {
                // exit if there's no data id
				if( typeof( req.model.id ) == "undefined" ) res.end();
				
				var query = createQuery( req.model, { replace : true, json: true });
				
				sdb.call("PutAttributes", query, function(err, result) {
					if (err) return callback(err);
					// return the data back to the client
					callback(err, req.model);
				});
				
            },
            
            delete: function() {
				// exit if there's no data id
				if( typeof( req.model.id ) == "undefined" ) res.end();
				
				var query = createQuery( req.model, { json: true, noAttr: true } );
				
				sdb.call("DeleteAttributes", query, function(err, result) {
					if (err) return callback(err);
					// return the data back to the client
					callback(err, req.model);
				});
				
            }
        };
        
        if (!crud[req.method]) return next(new Error('Unsuppored method ' + req.method));
        crud[req.method]();
    }
	
};

