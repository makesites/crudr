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
	var url = req.query.redirect_uri;
		
	loadCreds( host );
	
	// check if the request uri is in the same domain as the domain on file
	if( !isValid(key, host) || !validRedirect( url, host ) ) {
		return false;
	}
	
	
	// either way create the token 
	var secret = nconf.get("secret");
		
	return createToken( secret );
		
};

// generate token by validating the host (domain) and adding the current date (accurate to the month = token resets every month)  
function createToken( secret ){
	var now = new Date();
	
	var access_token = crypto.createHash('md5').update("" +  secret + (new Date(now.getFullYear(), now.getMonth()) ).getTime() ).digest("hex");
	var expires_in = (new Date(now.getFullYear(), now.getMonth()+1) ).getTime() - now;
	
	/* {
  "error": {
    "type": "OAuthException",
    "message": "Error validating access token."
  } 
}*/
	return { access_token : access_token, expires_in : expires_in};
}


function loadCreds( host ){
	//nconf.file({ file: access+"default.json" });
	nconf.use('file', { file: access+host+".json" });
	nconf.load();
	
	if( typeof( nconf.get("key") ) == "undefined" ||  typeof( nconf.get("secret") ) == "undefined" ){
		// check to see if the key is initialized
		createKeyPair( host );
	}
	
}

function createKeyPair( host ){
	// create the key (unique) based on the date
	var key = crypto.createHash('md5').update("" + (new Date()).getTime()).digest("hex");
	nconf.set("key", key);
	// create a random generator 
	var generator = Math.floor( Math.random()*1000000 );
	nconf.set("generator", generator);
	// create the secret base on the key + host
	var secret = crypto.createHash('md5').update("" + key + host + generator ).digest("hex");
	nconf.set("secret", secret);
	nconf.save();
}


function validRedirect( url, host ) {
	return (strpos(url, host) != false);
}

function isValid( key, host ) {
	var generator = nconf.get("generator");
	var secret = crypto.createHash('md5').update("" + key + host + generator ).digest("hex");
	return ( secret ==  nconf.get("secret") );
}


Access.prototype.key = function() {

    return this;
};

// Helpers
function strpos (haystack, needle, offset) {
  var i = (haystack+'').indexOf(needle, (offset || 0));
  return i === -1 ? false : i;
}

