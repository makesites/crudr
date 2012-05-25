# cruder

__Crud functionality for mongoose-models. Fits well with express.js__


## Install

    λ npm install cruder


## With express.js magic

    var express = require('express')
      , app = module.exports = express.createServer()
      , models = require('./models')
      , cruder = require('cruder')

    app.get('/create/:model', cruder.middleware, function (req, res) {
      res.render('cruder')
    })


## Without express.js magic

    var mongoose = require('mongoose')
      , Model = mongoose.model('Model')
      , cruder = require('cruded').form

    cruder(Model, function (err, form) {
      if (err) return console.err(err)
      console.dir(form)
    })


## Constributors

*	Makis Tracend <makis@makesit.es> 
[github](http://github.com/tracend/ "Github account")
[website](http://makesites.org/ "Make Sites .Org")


## License 

Distributed under the GPL v2
http://www.apache.org/licenses/LICENSE-2.0
