'use strict';

var page = require('page');


var index = function() {
  console.log('Index');
};

var about = function() {
  console.log('About');
};

var contact = function() {
  console.log('Contact');
};

var notFound = function() {
  console.log('Not found');
};

/**
 * PUBLIC FUNCTIONS
 */

var init = function() {
  page('/', index);
  page('/about', about);
  page('/contact', contact);
  page('*', notFound);

  page({
    hashbang: true
  });

};

module.exports = {
  init: init
};
