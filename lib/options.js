// default options
module.exports = {
	name: "crudr", // define name to support multiple instances of CRUDr?
	auth: false, // flag to define if authentication is required
	//domain_prefix: "",
	routes: {
	//	"oauth" : "/oauth",
	//	"auth" : "auth",
		"rest" : "/data",
		"client": "/crudr.js"
	},
	/*
	"action" : {
		"register" : "/crudr/register",
		"reset" : "/crudr/reset"
	},
	*/
	namespace: false // a flag to define if the backends are restricted in a specified namespace
}