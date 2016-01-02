'use strict';
var people = require('./model/people');

/**
 * PUBLIC FUNCTIONS
 */

var init = function() {
  people.init();
  window.peopleDb = people.getDb();
  window.user = people.getPerson('a0');
};

module.exports = {
  init: init
};
