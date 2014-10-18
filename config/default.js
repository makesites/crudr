// this is sample config of a list of backends
module.exports = config = {
	hosts: [], // limit requests from specific hosts
	backends: [], // an array or object of every backend binded
	store: "memory", // the type of store to be used, if a common store type is applicable
	scope: [], // array of attributes, used to filter the data transmitted
	namespace: false, // limit backends to sockets of a specific namespace
	db: [], // list of database collections, matching the backend definitions
	sync: [] // remote methods (middleware) to be triggered on sync
}