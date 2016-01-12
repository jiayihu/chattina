'use strict';

var fake = require('./fake'); //Fake data
var localforage = require('localforage');
var pubSub = require('pubsub-js');

var configMap = {
  anonId: 'a0', //Special ID per anonymous person
  defaultAvatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/adellecharles/128.jpg'
};
var stateMap = {
  anonUser: null,
  cidSerial: 0,
  isConnected: false,
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
    return this.cid === stateMap.anonUser.cid;
  }
};

/**
 * Creates the 'person' object and stores it in the db
 * @param  {object} personMap The person map
 * @return {object} person The created person
 */
var _makePerson = function(personMap) {
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

var _makeCid = function() {
  return 'c' + String(stateMap.cidSerial++);
};

var _removePerson = function(person) {
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
 * Refresh the 'people' object when a new people list is received
 * @param  {array} peopleList Array of people returned from back-end
 */
var _updateList = function(peopleList) {
  var currentUser = people.getCurrentUser();

  people.clearDb();

  peopleList.forEach(function(person) {
    if(!person.name) {
      return;
    }

    if(currentUser && currentUser.id === person._id) {
      currentUser.avatar = person.avatar;
      return;
    }

    people._makePerson({
      cid: person._id,
      id: person._id,
      name: person.name,
      avatar: person.avatar
    });

  });
};

/**
 * EVENT HANDLERS
 */

/**
 * Updates the current user information and publishes an 'login' event when
 * backend sends confirmation and data for the user login
 * @param  {object} user User data returned from the backend
 */
var _completeLogin = function(userList) {
  var user = userList[0];
  stateMap.currentUser.id = user._id;
  stateMap.currentUser.name = user.name;
  stateMap.currentUser.avatar = user.avatar;

  stateMap.peopleCidMap[user._id] = user;

  pubSub.publish('login', stateMap.currentUser);
};

var _publishListChange = function(peopleList) {
  _updateList(peopleList);
  pubSub.publish('listChange', peopleList);
};

/**
 * PUBLIC FUNCTIONS
 */

var people = {
  clearDb: function() {
    var user = stateMap.user;

    stateMap.peopleDb.clear(function(err) {
      if(err) {
        console.error('Error: clearDb.');
      } else {
        console.log('People db has been cleared');
      }

      stateMap.peopleDb.setItem(user.cid, user, function(err) {
        if(err) {
          console.error('Error. setItem in clearDb');
        }
      });
    });

    stateMap.peopleCidMap = {};
    stateMap.peopleCidMap[user.cid] = user;

  },

  getByCid: function(cid) {
    return stateMap.peopleCidMap[cid];
  },

  getCurrentUser: function() {
    return stateMap.currentUser;
  },

  getDb: function() {
    return stateMap.peopleDb;
  },

  login: function(userName) {
    var sio = isFakeData? fake.mockSio : console.error('No Sio');

    stateMap.currentUser = _makePerson({
      cid: _makeCid(),
      name: userName,
      avatar: configMap.defaultAvatar
    });

    sio.on('userupdate', _completeLogin);

    sio.emit('adduser', {
      cid: stateMap.currentUser.cid,
      name: stateMap.currentUser.name,
      avatar: stateMap.currentUser.avatar
    });
  },

  logout: function() {
    var isRemoved = false;
    var user = stateMap.currentUser;

    isRemoved = _removePerson(user);
    stateMap.currentUser = stateMap.anonUser;

    pubSub.publish('logout', user);

    return isRemoved;
  }
};

var chat = {
  leave: function() {
    var sio = fake.mockSio;

    stateMap.isConnected = false;

    if(sio) {
      sio.emit('leaveChat');
    }
  },

  join: function() {
    var sio = fake.mockSio;

    if(stateMap.isConnected) {
      return false;
    }

    sio.on('listChange', _publishListChange);
    stateMap.isConnected = true;

    return true;
  }
};

var init = function() {
  stateMap.anonUser = _makePerson({
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
      _makePerson({
        cid: personMap._id,
        id: personMap._id,
        name: personMap.name,
        avatar: personMap.avatar
      });
    }
  }
};

module.exports = {
  chat: chat,
  init: init,
  people: people
};
