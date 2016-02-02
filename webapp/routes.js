/**
 * Routes module
 * @module routes
 */

'use strict';

var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
var auth = require('basic-auth');

/**
 * Configures routes
 * @param  {Object.Express} app Express application
 */
var init = function(app) {
  app.get('/', function(request, response) {
    response.redirect('/index.html');
  });

  //Authentication
  app.all('/:object/*?', function(request, response, next) {
    var credentials = auth(request);

    if (!credentials || credentials.name !== 'jiayi' || credentials.pass !== 'secret') {
      response.status(401);
      response.set('WWW-Authenticate', 'Basic realm="Chattina API"');
      response.end('Access denied');
    } else {
      next();
    }
  });

  app.all('/:object/*?', function(request, response, next) {
    response.type('json');
    next();
  });
  app.get('/:object/list', function(request, response) {
    response.send({
      title: request.params.object + ' list'
    });
  });
  app.get('/:object/read/:id([0-9]+)', function(request, response) {
    response.send({
      title: request.params.object + ' with id ' + request.params.id + ' found'
    });
  });
  app.post('/:object/create', jsonParser, function(request, response) {
    response.send({
      title: request.params.object + ' created'
    });
  });
  app.post('/:object/update/:id([0-9]+)', jsonParser, function(request, response) {
    response.send({
      title: request.params.object + ' with id ' + request.params.id + ' updated'
    });
  });
  app.get('/:object/delete/:id([0-9]+)', function(request, response) {
    response.send({
      title: request.params.object + ' with id ' + request.params.id + ' deleted'
    });
  });
};

module.exports = {
  init: init
};
