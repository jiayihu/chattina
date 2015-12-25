'use strict';

var helpers = require('./helpers');
var director = require('./lib/director').Router;
var configMap = {

};

var routing = function() {
  var author = function () { console.log('author'); };
  var books = function () { console.log('books'); };
  var viewBook = function (bookId) {
    console.log('viewBook: bookId is populated: ' + bookId);
  };

  var routes = {
    '/author': author,
    '/books': books,
    '/books/view/:bookId': viewBook
  };

  var router = director(routes);

  router.init();
};

/**
 * PUBLIC FUNCTIONS
 */

var configModule = function(inputMap) {
  helpers.configMap(inputMap, configMap);
};

var init = function() {
  routing();
};

module.exports = {
  configModule,
  init: init
};
