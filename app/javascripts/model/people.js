'use strict';

var fake = require('../fake');
var PouchDB = require('pouchdb');

var configMap = {
  anonId: 'a0' //Special ID per anonymous person
};
var stateMap = {
  anonUser: null,
  peopleIdMap: {

  },
  peopleDb: new PouchDB('people'),
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

  var person = Object.create(personProto);
  person._id = personMap._id;
  person.name = personMap.name;
  person.cssMap = personMap.cssMap;

  stateMap.peopleIdMap[personMap._id] = person;

  db.put(person)
    .catch(function(err) {
      if(err.status === 409) {
        console.log('It\'s alright');
      }
    })
    .then(function(response) {
      console.log(response);
    });

  return person;
};

var people = {
  getDb: function() {
    return stateMap.peopleDb;
  },
  getIdMap: function() {
    return stateMap.peopleIdMap;
  }
};

var init = function() {
  //Expose PouchDB to window for debug. Required by PouchDB Chrome Extension
  window.PouchDB = PouchDB;

  stateMap.anonUser = makePerson({
    _id: configMap.anonId,
    name: 'Anonymous'
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
  people: people
};
