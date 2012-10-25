module.exports = config = {
	"name" : "crudr",
	"host" : "localhost", 
	"static" : {
		"client.js": "/crudr/client.js", 
		"socket.io.js": "/socket.io/socket.io.js"
	}, 
	"oauth" : {
		"authorize" : "/oauth/authorize"
	}, 
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