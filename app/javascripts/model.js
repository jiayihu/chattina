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
  chatee: null,
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

/**
 * Refresh the 'peopleDb' when a new people list is received
 * @param  {array} peopleList Array of people returned from back-end
 */
var _updateList = function(peopleList) {
  var currentUser = people.getCurrentUser();
  var isChateeonline = false;

  people.clearDb();

  peopleList.forEach(function(person) {
    if(!person.name) {
      return;
    }

    if(currentUser && currentUser.id === person._id) {
      currentUser.avatar = person.avatar;
      return;
    }

    var clientPerson = _makePerson({
      cid: person._id,
      id: person._id,
      name: person.name,
      avatar: person.avatar
    });

    //Update any changes about the chatee (logged in or updated avatar)
    if(stateMap.chatee && stateMap.chatee.id === person._id) {
      isChateeonline = true;
      stateMap.chatee = clientPerson;
    }
  });

  if(stateMap.chatee && !isChateeonline) {
    chat.setChatee('');
  }
};

/**
 * EVENT HANDLERS
 */

/**
 * EVENTS PUBLISHED BY THE MODEL
 * -----------------------------
 * 	* setChatee: when a new chatee is set
 * 	* listChange: when the list of online people changes
 * 	* updateChat: when a new msg is set or received
 * 	* login: when login is completed
 * 	* logout: when logout is completed
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

  console.log('Hello ' + user.name + ' !');

  chat.join();

  pubSub.publish('login', stateMap.currentUser);
};

/**
 * Updates 'peopleDb' and publish 'listChange' event
 * @param  {array} peopleList New peopleList returned from backend
 */
var _publishListChange = function(peopleList) {
  _updateList(peopleList);
  pubSub.publish('listChange', peopleList);
};

var _publishUpdateChat = function(msg) {
  console.log(msg);
  //If user is not chatting with anyone or someone else wrote to us we set a new chatee
  if(
    !stateMap.chatee ||
    ( (msg.senderId !== stateMap.currentUser.id) && (msg.senderId !== stateMap.chatee.id) )
  ) {
    chat.setChatee(msg.senderId);
  }

  pubSub.publish('updateChat', msg);
};

/**
 * PUBLIC FUNCTIONS
 */

/**
 * Object with methods relevant to 'people' such as peopleDb, log-in/out etc.
 * @type {Object}
 */
var people = {
  clearDb: function() {
    var currentUser = stateMap.currentUser;

    stateMap.peopleDb.clear(function(err) {
      if(err) {
        console.error('Error: clearDb.');
      }

      stateMap.peopleDb.setItem(currentUser.cid, currentUser, function(err) {
        if(err) {
          console.error('Error. setItem in clearDb');
        }
      });
    });

    stateMap.peopleCidMap = {};
    stateMap.peopleCidMap[currentUser.cid] = currentUser;

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

    sio.emit('addUser', {
      cid: stateMap.currentUser.cid,
      name: stateMap.currentUser.name,
      avatar: stateMap.currentUser.avatar
    });
  },

  logout: function() {
    var user = stateMap.currentUser;

    chat.leave();

    stateMap.currentUser = stateMap.anonUser;
    people.clearDb();
    pubSub.publish('logout', user);

    return true;
  }
};

/**
 * Object with methods relevant to the chat such as join, set/get chatee, sendMsg
 * @type {Object}
 */
var chat = {
  getChatee: function() {
    return stateMap.chatee;
  },

  leave: function() {
    var sio = fake.mockSio;

    stateMap.chatee = null;
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

    if(stateMap.currentUser.getIsAnon()) {
      console.warn('User must be signed in before joining chat');
      return false;
    }

    sio.on('listChange', _publishListChange);
    sio.on('updateChat', _publishUpdateChat);
    stateMap.isConnected = true;

    return true;
  },

  sendMsg: function(msgText) {
    var msg;
    var sio = fake.mockSio;

    //Abort sending a msg if there is no connection or user/chatee is not set
    if( !sio || !(stateMap.currentUser && stateMap.chatee) ) {
      return false;
    }

    msg = {
      destId: stateMap.chatee.id,
      destName: stateMap.chatee.name,
      senderId: stateMap.currentUser.id,
      msgText: msgText
    };

    _publishUpdateChat(msg);
    sio.emit('updateChat', msg);

    return true;
  },

  setChatee: function(personId) {
    var newChatee = stateMap.peopleCidMap[personId];

    if(newChatee) {
      if( stateMap.chatee && (stateMap.chatee.id === newChatee.id) ) {
        return false;
      }
    } else {
      newChatee = '';
    }

    pubSub.publish('setChatee', {
      oldChatee: stateMap.chatee,
      newChatee: newChatee
    });
    stateMap.chatee = newChatee;

    return true;
  },

  /**
   * Updates the avatar in the back-end
   * @param  {object} avatarMap Object map
   * @example updateAvatar({
   *   personId: {string},
   *   avatar: {string}
   * })
   */
  updateAvatar: function(avatarMap) {
    var sio = fake.mockSio;
    if(sio) {
      sio.emit('updateAvatar', avatarMap);
    }
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
    //Init fake Socket IO
    fake.init();
  }

  //DEVELOPMENT ONLY
  window.chat = chat;
  window.people = people;
};

module.exports = {
  chat: chat,
  init: init,
  people: people
};
