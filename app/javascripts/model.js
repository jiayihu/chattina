'use strict';
var people = require('./model/people');

/**
 * PUBLIC FUNCTIONS
 */

var init = function() {
  people.init();
};

module.exports = {
  init: init
};
