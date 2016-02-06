var http = require('http');
var express = require('express');
var logger = require('morgan');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var routes = require('./routes');
var socket = require('./socket');

var app = express();
var server = http.createServer(app);
var env = app.settings.env;

if(env === 'development') {
  app.use(logger('dev'));
} else {
  app.use(logger('common'));
}

app.use(bodyParser.json());
app.use(methodOverride());
app.use(express.static( __dirname + '/public' ));

// Routes
routes.init(app, server);

socket.init(server);

//Error handling
app.use(function(err, req, response, next) {
  if(err) {
    response.status(500);
    var msg = err.message ? err.message : err;
    response.send({
      err: msg
    });
  } else {
    next();
  }
});

server.listen(3000);

console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
