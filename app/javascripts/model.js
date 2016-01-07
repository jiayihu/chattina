'use strict';
var people = require('./model/people');

/**
 * PUBLIC FUNCTIONS
 */

var init = function() {
  people.init();
  window.people = people;
};

module.exports = {
  init: init,
  people: people
};
