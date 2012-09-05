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
	"path" : "/data", 
	"domain_prefix" : "", 
	/*
	"routes" : {
		"create" : "/crudr/create", 
		"read" : "/crudr/read", 
		"update" : "/crudr/update", 
		"delete" : "/crudr/delete"
	}, 
	*/
	"action" : {
		"register" : "/crudr/register", 
		"reset" : "/crudr/reset"
	}, 
	"backends" : { 
		"mybackend" : "memoryStore"
	}
}