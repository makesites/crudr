module.exports = config = {
	"name" : "crudr",
	"host" : "localhost", 
	"domain_prefix" : "", 
	"routes" : {
		"oauth" : "/oauth", 
		"rest" : "/data", 
		"client": "/crudr/client.js", 
	}, 
	"action" : {
		"register" : "/crudr/register", 
		"reset" : "/crudr/reset"
	}, 
	"backends" : { 
		"mybackend" : "memoryStore"
	}
}