/**
 * People list
 * @module features/people-list
 */

'use strict';

var stateMap = {
  button: null,
  peopleList: null
};

var init = function() {
  stateMap.button = document.getElementsByClassName('toggle-list')[0];
  stateMap.peopleList = document.qs('.content .left');

  stateMap.button.addEventListener('click', function() {
    stateMap.peopleList.classList.toggle('visible');
  });
};

module.exports = {
  /** Init the 'people-list' module */
  init: init
};
