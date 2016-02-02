'use strict';

/**
 * List of online users. This is a temp variable since we are not using any
 * Database yet.
 * @type {Array}
 */
var peopleList = [
  {
    name: 'Daenerys',
    _id: 'id_1',
    avatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/pixeliris/128.jpg',
    role: 'fake user'
  },
  {
    name: 'Jon',
    _id: 'id_2',
    avatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/teclaro/128.jpg',
    role: 'fake user'
  },
  {
    name: 'Sansa',
    _id: 'id_3',
    avatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/brynn/128.jpg',
    role: 'fake user'
  },
  {
    name: 'Arya',
    _id: 'id_4',
    avatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/nuraika/128.jpg',
    role: 'fake user'
  },
  {
    name: 'Cersei',
    _id: 'id_5',
    avatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/kfriedson/128.jpg',
    role: 'fake user'
  }
];

var idSerial = peopleList.length;

var _makeId = function() {
  return 'id_' + String(idSerial+=1);
};

/**
 * Adds the new people to the list of online users
 * @param  {array} people New online people
 * @return {array} newPeople New online people with back-end ids
 */
var add = function(people) {
  if( !Array.isArray(people) ) {
    throw new Error('peopleList.add() expects array as parameter');
  }

  var newPeople = [];

  people.forEach(function(newPerson) {
    var person = {
      _id: _makeId(),
      name: newPerson.name,
      avatar: newPerson.avatar,
      role: 'guest',
      socketId: newPerson.socketId
    };
    newPeople.push(person);
  });

  Array.prototype.push.apply(peopleList, newPeople);

  return newPeople;
};

/**
 * Returns the person by id
 * @param  {string} destId Person's id
 * @return {object}
 */
var getById = function(destId) {
  if(typeof destId !== 'string') {
    throw new Error('peopleList.getById() requires a string as parameter');
  }

  var result = peopleList.find(function(person) {
    return person._id === destId;
  });

  return result;
};

var getList = function() {
  return peopleList;
};

var remove = function(people) {
  if( !Array.isArray(people) ) {
    throw new Error('peopleList.remove() expects array as parameter');
  }

  var removedPerson;

  people.forEach(function(oldPerson) {
    peopleList.forEach(function(person, index, array) {
      if(oldPerson.socketId === person.socketId) {
        removedPerson = array.splice(index, 1);
      }
    });
  });

  return removedPerson? true : false;
};

module.exports = {
  add: add,
  getById: getById,
  getList: getList,
  remove: remove
};
