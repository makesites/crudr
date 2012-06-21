module.exports = config = {
	"name" : "CRUDr",
	"host" : "localhost", 
	"static" : {
		"client.js": "/crudr/client.js", 
		"socket.io.js": "/socket.io/socket.io.js"
	}, 
	"oauth" : {
		"authorize" : "/oauth/authorize"
	}, 
	"routes" : {
		"create" : "/crudr/create", 
		"read" : "/crudr/read", 
		"update" : "/crudr/update", 
		"delete" : "/crudr/delete"
	}
}