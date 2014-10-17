module.exports = config = {
	name: "crudr",
	host: "localhost",
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
	backends: [], // an array or object of every backend binded
	store: "memory", // the type of store to be used, if a common store type is applicable
	scope: [], // array of attributes to filter the data
	namespace: false
}