/**
 * Routes module
 * @module routes
 */

'use strict';

var db = require('./mongo');

var allowedObjects = ['user'];

/**
 * Checks if an object is allowed for CRUD operations
 * @param  {string} object Object type/name like 'user', 'books' etc.
 * @return {boolean}
 */
var _checkObj = function(object) {
  return ~ allowedObjects.indexOf(object);
};

/**
 * Configures routes
 * @param  {Object.Express} app Express application
 * @param {Object.net.Server} server Node.js HTTP Server
 */
var init = function(app) {
  app.get('/', function(request, response) {
    response.redirect('/index.html');
  });

  app.all('/:object/*?', function(request, response, next) {
    var object = request.params.object;
    response.type('json');

    if( _checkObj(object) ) {
      next();
    } else {
      response.status(403).send({
        error: object + ' is not a valid object type'
      });
    }
  });

  app.get('/:object/list', function(request, response) {
    var object = request.params.object;

    db.read(object, null, function(err, list) {
      if(!err) {
        response.send(list);
      } else {
        throw err;
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
        throw err;
      }
    });
  });

  app.post('/:object/create', function(request, response) {
    var object = request.params.object;
    db.create(object, request.body, function(err, result) {
      if( !err && (result.insertedCount === 1) ) {
        response.send({
          success: object + ' created!'
        });
      } else {
        console.log(typeof err);
        throw err;
      }
    });
  });

  app.post('/:object/update/:id', function(request, response) {
    var object = request.params.object;
    var id = request.params.id;
    db.update(object, id, request.body, function(err, result) {
      if( !err && result.ok ) {
        //No problems with MongoDB operation but check if any document was
        //actually updated
        if(result.value === null) {
          response.status(403).send({
            error: 'Cannot find ' + object  + ' with ID ' + id
          });
        } else {
          response.send({
            success: object + ' with ID ' + id + ' updated!'
          });
        }
      } else {
        throw err;
      }
    });
  });

  app.get('/:object/remove/:id', function(request, response) {
    var object = request.params.object;
    var id = request.params.id;
    db.remove(object, id, function(err, result) {
      if( !err && result.ok ) {
        //No problems with MongoDB operation but check if any document was
        //actually deleted
        if(result.value === null) {
          response.status(403).send({
            error: 'Cannot find ' + object  + ' with ID ' + id
          });
        } else {
          response.send({
            success: object + ' with ID ' + id + ' deleted!'
          });
        }
      } else {
        throw err;
      }
    });
  });
};

module.exports = {
  init: init
};
