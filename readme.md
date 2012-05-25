# CRUDer

__Open source module for socket-enabled CRUD operations in Node.js__


## Install

    λ npm install cruder


## Example

    var express = require('express')
      , app = module.exports = express.createServer()
      , models = require('./models')
      , cruder = require('cruder')

    app.get('/create/:model', cruder.middleware, function (req, res) {
      res.render('cruder')
    })


## Dependencies 

- Socket.io
- Express
- Jade


## Constributors

*	Makis Tracend <makis@makesit.es> 
[github](http://github.com/tracend/ "Github account")
[website](http://makesites.org/ "Make Sites .Org")


## License 

Distributed under the GPL v2
http://www.apache.org/licenses/LICENSE-2.0
