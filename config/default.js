module.exports = config = {
	"name" : "crudr",
	"host" : "localhost",
	"domain_prefix" : "",
	"routes" : {
		"oauth" : "/oauth",
		"auth" : "auth",
		"rest" : "/data",
		"client": "/crudr.js"
	},
	"action" : {
		"register" : "/crudr/register",
		"reset" : "/crudr/reset"
	},
	"backends" : {},
	"scope" : {},
	"namespace" : false
}