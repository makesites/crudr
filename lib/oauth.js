var fs = require("fs"), 
	path = require("path"),
	nconf = require("nconf"), 
	crypto = require('crypto'), 
	access = path.normalize( __dirname + '/../access/'), 
	config = require('../config/default');
	
module.exports = Access;

function Access( req ) {
   
	var host = req.headers['host'];
	var key = req.query.client_id;
	
	nconf.use('file', { file: access+host+".json" });
	nconf.load();
	
	if( validKey(key) ) {
		// setup a key (if not available) 
		//var key = Key();
		
		// check if the request uri is in the same domain as the domain on file
		var url = req.query.redirect_uri;
		// generate token by validating the host (domain) and adding the current date (accurate to the day = token resets every 24 hours)  
		
		return { token : createToken() };
		
	} else { 
		// check to see if the key is initialized
		createKeyPair( host );
		
		return { token : 0 };
		
	}
	
		
		
};

function createToken( secret ){
	console.log( nconf.get("secret") );
	var token = crypto.createHash('md5').update("" +  nconf.get("secret") + (new Date(d.getFullYear(), d.getMonth()) ).getTime() ).digest("hex");
	return token;
}


function initKey( key ){
	//nconf.file({ file: access+"default.json" });
	nconf.use('file', { file: access+"default.json" });
	nconf.load();
  
	// get domain name from the config
	var host = "localhost"; 
	// 
	if( typeof( nconf.get( host ) ) == "undefined"){
		
	}
	nconf.save();
}

function createKeyPair( host ){
	// create the key (unique) based on the date
	var key = crypto.createHash('md5').update("" + (new Date()).getTime()).digest("hex");
	nconf.set("key", key);
	// create the secret base on the key + host
	var secret = crypto.createHash('md5').update("" + key + host ).digest("hex");
	nconf.set("secret", secret);
	nconf.save();
}


function validHost( host ) {
	return true;
}

function validKey( key, host ) {
	var secret = crypto.createHash('md5').update("" + key + host ).digest("hex");
	console.log( secret );
	console.log( nconf.get("secret") );
	return ( secret ==  nconf.get("secret") );
}


Access.prototype.key = function() {

    return this;
};

