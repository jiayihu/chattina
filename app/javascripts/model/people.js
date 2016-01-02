'use strict';

var fake = require('../fake'); //Fake data
var localforage = require('localforage');

var configMap = {
  anonId: 'a0' //Special ID per anonymous person
};
var stateMap = {
  anonUser: null,
  peopleDb: localforage.createInstance({
    name: 'people'
  }),
  user: null
};
var isFakeData = true;

/**
 * Prototype for a 'person' object
 */
var personProto = {
  getIsUser: function() {
    return this._id === stateMap.user._id;
  },
  getIsAnon: function() {
    return this._id === stateMap.user._id;
  }
};

/**
 * Creates the 'person' object and stores it in the db
 * @param  {object} personMap The person makePerson
 * @return {object} person The created person
 */
var makePerson = function(personMap) {
  var db = stateMap.peopleDb;

  if(personMap._id === undefined || !personMap.name) {
    throw 'Client id and name are required';
  }

  db.setItem(personMap._id, personMap, function(error) {
    if(error) {
      console.error(error);
    }
  });

  return personMap;
};

/**
 * PUBLIC FUNCTIONS
 */

var getDb = function() {
 return stateMap.peopleDb;
};

/**
 * Gets the person for db and returns a 'person' object from the data
 * @param  {string} _id Person's id
 * @return {object}
 */
var getPerson = function(_id) {
  var person = Object.create(personProto);
  person._id = _id;
  stateMap.peopleDb.getItem(_id, function(err, value) {
    person.name = value.name;
    person.avatar = value.avatar;
  });

  return person;
};

var init = function() {
  stateMap.anonUser = makePerson({
    _id: configMap.anonId,
    name: 'Anonymous',
    avatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/adellecharles/128.jpg'
  });
  stateMap.user = stateMap.anonUser;

  if(isFakeData) {
    var peopleList = fake.getPeopleList();
    var i = 0;
    var personMap = {};

    for(i = 0; i < peopleList.length; i++) {
      personMap = peopleList[i];
      makePerson({
        avatar: personMap.avatar,
        _id: personMap._id,
        name: personMap.name
      });
    }
  }
};

module.exports = {
  init: init,
  getDb: getDb,
  getPerson: getPerson
};
