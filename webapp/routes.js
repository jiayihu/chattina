/**
 * Routes module
 * @module routes
 */

'use strict';

var db = require('./mongo');
var socket = require('./socket');

/**
 * Configures routes
 * @param  {Object.Express} app Express application
 * @param {object} server Node.js HTTP Server
 */
var init = function(app, server) {
  app.get('/', function(request, response) {
    response.redirect('/index.html');
    socket.init(server);
  });

  app.all('/:object/*?', function(request, response, next) {
    response.type('json');
    next();
  });

  app.get('/:object/list', function(request, response) {
    var object = request.params.object;

    db.read(object, null, function(err, list) {
      if(!err) {
        response.send(list);
      } else {
        response.status(500).send(err);
      }
    });
  });

  app.get('/:object/read/:id', function(request, response) {
    var object = request.params.object;
    var id = request.params.id;
    db.read(object, id, function(err, doc) {
      if(!err) {
        response.send(doc);
      } else {
        response.status(500).send(err);
      }
    });
  });

  app.post('/:object/create', function(request, response) {
    var object = request.params.object;
    db.create(object, request.body, function(err, result) {
      if( !err && (result.insertedCount === 1) ) {
        response.send(object + ' created!');
      } else {
        response.status(500).send(err);
      }
    });
  });

  app.post('/:object/update/:id', function(request, response) {
    var object = request.params.object;
    var id = request.params.id;
    db.update(object, id, request.body, function(err, result) {
      if(!err && result.ok) {
        response.send(object + ' updated!');
      } else {
        response.status(500).send(err);
      }
    });
  });

  app.get('/:object/delete/:id', function(request, response) {
    var object = request.params.object;
    var id = request.params.id;
    db.remove(object, id, function(err, result) {
      if( !err && (result.deletedCount === 1) ) {
        response.send(object + ' with ID ' + id + ' deleted!');
      } else {
        response.status(500).send(err);
      }
    });
  });
};

module.exports = {
  init: init
};
