/**
 * CRUD Operations MongoDB Module
 * @module mongo
 */

/**
 * @FIXME check 'id' length where required before _makeMongoId(id)
 * @FIXME use 'assert' npm module for parameters checking
 */

'use strict';

var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var _makeMongoId = mongodb.ObjectID;
var util = require('util');

var ajv = require('ajv')();
var userSchema = require('./model/schema/user.json');
var validate = ajv.compile(userSchema);

var url = 'mongodb://localhost:27017/chattina';
var dbHandle;

MongoClient.connect(url, function(err, db) {
  if(err) {
    console.error('Error connecting with MongoDB');
    throw err;
  }

  console.log('Connected with MongoDB');

  dbHandle = db;
});

/**
 * Inserts new document into collection
 * @param  {string} colName Collection name
 * @param  {object} data User JSON object, must be valid schema
 * @param  {Function} callback Callback
 */
var create = function(colName, data, callback) {
  var options = {};
  var error;
  callback = callback || function() {};

  if( (typeof data !== 'object') || (Object.keys(data).length === 0) ) {
    error = new Error('create(): No POST object data');
    console.error(error);
    callback(error, null);
    return;
  }

  // Validate data with 'userSchema' and check if there is a name
  // We are not using 'required' in the schema for the name property because
  // it's not required when updating a user document
  if( !validate(data) || (!data.name) ) {
    error = new Error('create(): data is not valid');
    console.error(error);
    callback(error, null);
    return;
  }

  console.log( util.inspect(data, {depth: 0}) );

  dbHandle.collection(colName, function(err, col) {
    if(err) {
      console.error('create(): Collection with name "' + colName + '" not found', err);
      callback(err, null);
      return;
    }

    col.insertOne(data, options, function(err, result) {
      if(err) {
        console.error('create(): Error inserting the data.\n', err);
      }

      callback(err, result);
    });
  });
};

/**
 * Finds the document stored in the collection or returns the all the documents
 * if 'id' is not provided
 * @param  {string} colName Name of the collection
 * @param {string} id Id of the object
 * @param {function} callback Callback
 */
var read = function(colName, id, callback) {
  callback = callback || function() {};

  if( (typeof id !== 'string') && (id !== null) ) {
    var err = new Error('read(): id parameter must be string');
    console.error(err);
    callback(err, null);
    return;
  }

  dbHandle.collection(colName, function(err, col) {
    if(err) {
      console.error('read(): Collection with name "' + colName + '" not found.\n', err);
      callback(err, null);
      return;
    }

    var limit = 0, query;

    if(id) {
      limit = 1;
      query = {
        _id: _makeMongoId(id)
      };
    }

    col.find(query).limit(limit).toArray(function(err, docs) {
      if(err) {
        console.error('Cannot find document.\n', err);
      }

      callback(err, docs);
    });
  });
};

/**
 * Updates the document with given 'id'
 * @param  {string} colName Collection name
 * @param  {string} id Document ID
 * @param  {object} fields Update properties
 * @param  {Function} callback Callback
 */
var update = function(colName, id, fields, callback) {
  var error;

  if( (typeof id !== 'string') || (typeof fields !== 'object') || (Object.keys(fields).length === 0) ) {
    error = new Error('read(): id parameter must be string and fields paramater must be a not empty object');
    console.error(error);
    callback(error, null);
    return;
  }

  // Validate data with 'userSchema'
  if( !validate(fields) ) {
    error = new Error('update(): data is not valid');
    console.error(error);
    callback(error, null);
    return;
  }

  console.log( util.inspect(fields, {depth: 0}) );

  var filter = {
    _id: _makeMongoId(id)
  };
  var options = {};
  var update = {
    //@see {@url https://docs.mongodb.org/manual/reference/operator/update/set/#up._S_set}
    $set: fields
  };
  callback = callback || function() {};

  dbHandle.collection(colName, function(err, col) {
    if(err) {
      console.error('Collection with name "' + colName + '" not found.\n', err);
      callback(err, null);
      throw err;
    }

    col.findOneAndUpdate(filter, update, options, function(err, result) {
      if(err) {
        console.error('Cannot update document', err);
      }

      callback(err, result);
    });
  });
};

/**
 * Removes document from collection
 * @param  {string} colName Collection name
 * @param  {string} id Document ID
 * @param  {Function} callback Callback
 */
var remove = function(colName, id, callback) {
  if(typeof id !== 'string') {
    var err = new Error('remove(): id parameter must be string');
    console.error(err);
    callback(err, null);
    return;
  }

  var filter = {
    _id: _makeMongoId(id)
  };
  callback = callback || function() {};

  console.log(filter);

  dbHandle.collection(colName, function(err, col) {
    if(err) {
      console.error('remove(): Collection with name "' + colName + '" not found.\n', err);
      callback(err, null);
      return;
    }

    col.findOneAndDelete(filter, function(err, result) {
      if(err) {
        console.error('Cannot delete document.\n', err);
      }
      callback(err, result);
    });
  });
};

module.exports = {
  create: create,
  read: read,
  remove: remove,
  update: update
};
