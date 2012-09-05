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
			res.end( JSON.stringify( req.model ));
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
			
				console.log(data["Item"]);
				
				for( i in data["Item"] ){
					
					var model = {};
					//var attr = data["Item"][i]["Attribute"];
					var attr = data["Item"][i];
					
					// parse as independent attributes 
					var key = "";	
					for( k in attr ){
						
						switch(k){
							case "Name":
								key = attr[k];
								model[key] = 0;
							break;
							case "Value":
								/*
								var attr = data["Item"]["Attribute"];
								var attr = data["Item"]["Attribute"];
				
								for (var i in attr) {
									try{
										model[attr[i]["Name"]] = JSON.parse( attr[i]["Value"] );
									} catch(err) {
										// output err.message ?
										model[attr[i]["Name"]] = attr[i]["Value"];
									}
								}
				
								try{
									model[attr[i]["Name"]] = JSON.parse( attr[i]["Value"] );
								} catch(err) {
									// output err.message ?
									model[attr[i]["Name"]] = attr[i]["Value"];
								}
								//if( key == "json" ){ 
								// parse all attributes as json
									//console.log(attr[k]);
									model = JSON.parse( attr[k] );
									//console.log(model);
								//} else {
								//	model[key] = attr[k];
								//}
								*/
							break;
						}
						//model[attr[k]["Name"]] = attr[k]["Value"];
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
		sdb.call("CreateDomain", { DomainName: req.backend }, function(err, result) {
            if (err) return next(err);
			//console.log(JSON.stringify(result));
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
					var response = createResponse( result["SelectResult"] );
					if(!response) response = req.model;
					res.end( JSON.stringify( response  ));
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

