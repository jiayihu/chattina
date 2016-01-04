'use strict';

var fake = require('../fake'); //Fake data
var localforage = require('localforage');
var pubSub = require('pubsub-js');

var configMap = {
  anonId: 'a0', //Special ID per anonymous person
  defaultAvatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/adellecharles/128.jpg'
};
var stateMap = {
  anonUser: null,
  cidSerial: 0,
  peopleCidMap: {},
  peopleDb: localforage.createInstance({
    name: 'people'
  }),
  currentUser: null
};
var isFakeData = true;

/**
 * PRIVATE FUNCTIONS
 */

 /**
  * Prototype for a 'person' object
  */
var personProto = {
  getIsUser: function() {
    return this.cid === stateMap.currentUser.cid;
  },
  getIsAnon: function() {
    return this.cid === stateMap.currentUser.cid;
  }
};

/**
 * Creates the 'person' object and stores it in the db
 * @param  {object} personMap The person makePerson
 * @return {object} person The created person
 */
var makePerson = function(personMap) {
  var db = stateMap.peopleDb;
  var cid = personMap.cid;
  var id = personMap.id;
  var name = personMap.name;
  var avatar = personMap.avatar;

  if(cid === undefined || !name) {
    throw 'Client id and name are required';
  }

  var person = Object.create(personProto);
  person.cid = cid;
  person.name = name;
  person.avatar = avatar;

  if(id) {
    person.id = id;
  }

  stateMap.peopleCidMap[cid] = person;

  db.setItem(cid, person, function(error) {
    if(error) {
      console.error(error);
    }
  });

  return person;
};

var makeCid = function() {
  return 'c' + String(stateMap.cidSerial++);
};

/**
 * Updates the current user information and publishes an 'login' event when
 * backend sends confirmation and data for the user login
 * @param  {object} user User data returned from the backend
 */
var completeLogin = function(user) {
  stateMap.currentUser.cid = user._id;
  stateMap.currentUser.id = user._id;
  stateMap.currentUser.name = user.name;
  stateMap.currentUser.avatar = user.avatar;

  stateMap.peopleCidMap[user._id] = user;

  pubSub.publish('login', user);
};

var removePerson = function(person) {
  if( !person || (person.id === configMap.anonId) ) {
    return false;
  }

  stateMap.peopleDb.removeItem(person.cid, function(err) {
    if(err) {
      console.error(err);
    }
  });

  if(person.cid) {
    delete stateMap.peopleCidMap[person.cid];
  }

  return true;
};

/**
 * PUBLIC FUNCTIONS
 */

var getByCid = function(cid) {
  return stateMap.peopleCidMap[cid];
};

var getCurrentUser = function() {
  return stateMap.currentUser;
};

var getDb = function() {
  return stateMap.peopleDb;
};

var init = function() {
  stateMap.anonUser = makePerson({
    cid: configMap.anonId,
    id: configMap.anonId,
    name: 'Anonymous',
    avatar: configMap.defaultAvatar
  });
  stateMap.currentUser = stateMap.anonUser;

  if(isFakeData) {
    var peopleList = fake.getPeopleList();
    var i = 0;
    var personMap = {};

    for(i = 0; i < peopleList.length; i++) {
      personMap = peopleList[i];
      makePerson({
        cid: personMap._id,
        id: personMap._id,
        name: personMap.name,
        avatar: personMap.avatar
      });
    }
  }
};

var login = function(userName) {
  var sio = isFakeData? fake.mockSio : console.error('No Sio');

  stateMap.currentUser = makePerson({
    cid: makeCid(),
    name: userName,
    avatar: configMap.defaultAvatar
  });

  sio.on('userupdate', completeLogin);

  sio.emit('adduser', {
    cid: stateMap.currentUser.cid,
    name: stateMap.currentUser.name,
    avatar: stateMap.currentUser.avatar
  });
};

var logout = function() {
  var isRemoved = false;
  var user = stateMap.currentUser;

  isRemoved = removePerson(user);
  stateMap.currentUser = stateMap.anonUser;

  pubSub.publish('logout', user);

  return isRemoved;
};

module.exports = {
  init: init,
  getByCid: getByCid,
  getCurrentUser: getCurrentUser,
  getDb: getDb,
  login: login,
  logout: logout
};
