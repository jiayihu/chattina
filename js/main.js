(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var helpers = require('./helpers');
var model = require('./model');
var shell = require('./shell');

var init = function() {
  helpers.init();
  model.init();
  shell.init();
};

module.exports = {
  init: init
};

},{"./helpers":4,"./model":6,"./shell":8}],2:[function(require,module,exports){
'use strict';

/**
 * Returns fake list of people from server
 * @return {array}
 */
var getPeopleList = function() {
  return [
    {
      name: 'Daenerys',
      _id: 'id_1',
      avatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/adellecharles/128.jpg'
    },
    {
      name: 'Jon',
      _id: 'id_2',
      avatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/teclaro/128.jpg'
    },
    {
      name: 'Sansa',
      _id: 'id_3',
      avatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/brynn/128.jpg'
    },
    {
      name: 'Arya',
      _id: 'id_4',
      avatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/nuraika/128.jpg'
    },
    {
      name: 'Cersei',
      _id: 'id_5',
      avatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/kfriedson/128.jpg'
    },
    {
      name: 'Joffrey',
      _id: 'id_6',
      avatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/jfkingsley/128.jpg'
    }
  ];
};

/**
 * Fake Socket.IO API
 */
var fakeIdSerial = 6;
var callbackMap = {};

var makeFakeId = function() {
  return 'id_' + String(fakeIdSerial+=1);
};

var mockSio = {
  on: function(msgType, callback) {
    callbackMap[msgType] = callback;
  },
  emit: function(msgType, data) {
    if(msgType === 'adduser' && callbackMap.userupdate) {
      setTimeout(function() {
        callbackMap.userupdate(
          [
            {
              _id: makeFakeId(),
              name: data.name,
              avatar: data.avatar
            }
          ]
        );
      }, 2000);
    }
  }
};

module.exports = {
  getPeopleList: getPeopleList,
  mockSio: mockSio
};

},{}],3:[function(require,module,exports){
'use strict';

var stateMap = {
  account: null,
  sign: null
};


var bind = function(event, callback) {
  if(event === 'onSignClick') {
    stateMap.sign.addEventListener('click', callback);
  }
};

var init = function(account) {
  stateMap.account = account;
  stateMap.sign = stateMap.account.getElementsByClassName('sign')[0];
};

module.exports = {
  bind: bind,
  init: init
};

},{}],4:[function(require,module,exports){
/**
 * [function description]
 * @param  {Function} callback Callback
 */

var notie = require('notie');

/**
 * Throws a new Error
 */
var makeError = function(msg) {
  notie.alert(3, msg, 4);
};

/**
 * Runs callback function when DOM is ready (JQuery function)
 * @param  {Function} callback [description]
 * @return {[type]}
 */
var $ready = function(callback) {
  if(document.readyState !== 'loading') {
    callback();
  } else {
    document.addEventListener('DOMContentLoaded', callback);
  }
};


/**
 * Set the configMap of the module - It goes deep in the object
 */
var setConfigMap = function(inputMap, configMap) {
  var key;

  for(key in inputMap) {
    if(configMap.hasOwnProperty(key)) {
      if(inputMap[key] instanceof Object) {
        window.setConfigMap(inputMap[key], configMap[key]);
      } else {
        configMap[key] = inputMap[key];
      }
    } else {
      window.makeError('Wrong inputMap', 'Property "' + key + '" is not available in configMap');
    }
  }
};

var init = function() {
  Element.prototype.qs = Element.prototype.querySelector;
};

module.exports = {
  init: init,
  makeError: makeError,
  $ready: $ready,
  setConfigMap: setConfigMap
};

},{"notie":11}],5:[function(require,module,exports){
'use strict';

var app = require('./app');

app.init();

},{"./app":1}],6:[function(require,module,exports){
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

},{"./model/people":7}],7:[function(require,module,exports){
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
    return this.cid === stateMap.anonUser.cid;
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
var completeLogin = function(userList) {
  var user = userList[0];
  stateMap.currentUser.id = user._id;
  stateMap.currentUser.name = user.name;
  stateMap.currentUser.avatar = user.avatar;

  stateMap.peopleCidMap[user._id] = user;

  pubSub.publish('login', stateMap.currentUser);
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

},{"../fake":2,"localforage":10,"pubsub-js":12}],8:[function(require,module,exports){
'use strict';

var helpers = require('./helpers');
var model = require('./model');
// var page = require('page');
var pubSub = require('pubsub-js');

/* Features */
var account = require('./features/account');

var configMap = {

};
var stateMap = {
  account: null
};
var isTesting = false;

var testing = function() {
  pubSub.subscribe('login', function(msg, data) {
    console.log(msg + ': ');
    console.log(data);
  });
  pubSub.subscribe('logout', function(msg, data) {
    console.log(msg + ': ');
    console.log(data);
  });
};

/**
 * FEATURES EVENT HANDLERS
 */

var onSignClick = function() {
  var userName;
  var currentUser = model.people.getCurrentUser();

  if(currentUser.getIsAnon()) {
    userName = prompt('Please sign-in');
    model.people.login(userName);
    this.textContent = '... Processing ...';
  } else {
    model.people.logout();
  }

  return false;
};

var onAccountLogin = function(msg, currentUser) {
  stateMap.account
    .getElementsByClassName('sign')[0]
    .textContent = currentUser.name;
};

var onAccountLogout = function() {
  stateMap.account
    .getElementsByClassName('sign')[0]
    .textContent = 'Please sign-in';
};

/**
 * PUBLIC FUNCTIONS
 */

var configModule = function(inputMap) {
  helpers.configMap(inputMap, configMap);
};

var init = function() {
  if(isTesting) {
    testing();
  }
  //helpers.makeError('The app is still in production, not ready for usage. Please have a cookie and come back again later.');

  //Account
  stateMap.account = document.getElementsByClassName('account')[0];
  account.init(stateMap.account);
  account.bind('onSignClick', onSignClick);
  pubSub.subscribe('login', onAccountLogin);
  pubSub.subscribe('logout', onAccountLogout);
};

module.exports = {
  configModule: configModule,
  init: init
};

},{"./features/account":3,"./helpers":4,"./model":6,"pubsub-js":12}],9:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],10:[function(require,module,exports){
(function (process,global){
/*!
    localForage -- Offline Storage, Improved
    Version 1.3.1
    https://mozilla.github.io/localForage
    (c) 2013-2015 Mozilla, Apache License 2.0
*/
(function() {
var define, requireModule, require, requirejs;

(function() {
  var registry = {}, seen = {};

  define = function(name, deps, callback) {
    registry[name] = { deps: deps, callback: callback };
  };

  requirejs = require = requireModule = function(name) {
  requirejs._eak_seen = registry;

    if (seen[name]) { return seen[name]; }
    seen[name] = {};

    if (!registry[name]) {
      throw new Error("Could not find module " + name);
    }

    var mod = registry[name],
        deps = mod.deps,
        callback = mod.callback,
        reified = [],
        exports;

    for (var i=0, l=deps.length; i<l; i++) {
      if (deps[i] === 'exports') {
        reified.push(exports = {});
      } else {
        reified.push(requireModule(resolve(deps[i])));
      }
    }

    var value = callback.apply(this, reified);
    return seen[name] = exports || value;

    function resolve(child) {
      if (child.charAt(0) !== '.') { return child; }
      var parts = child.split("/");
      var parentBase = name.split("/").slice(0, -1);

      for (var i=0, l=parts.length; i<l; i++) {
        var part = parts[i];

        if (part === '..') { parentBase.pop(); }
        else if (part === '.') { continue; }
        else { parentBase.push(part); }
      }

      return parentBase.join("/");
    }
  };
})();

define("promise/all", 
  ["./utils","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    /* global toString */

    var isArray = __dependency1__.isArray;
    var isFunction = __dependency1__.isFunction;

    /**
      Returns a promise that is fulfilled when all the given promises have been
      fulfilled, or rejected if any of them become rejected. The return promise
      is fulfilled with an array that gives all the values in the order they were
      passed in the `promises` array argument.

      Example:

      ```javascript
      var promise1 = RSVP.resolve(1);
      var promise2 = RSVP.resolve(2);
      var promise3 = RSVP.resolve(3);
      var promises = [ promise1, promise2, promise3 ];

      RSVP.all(promises).then(function(array){
        // The array here would be [ 1, 2, 3 ];
      });
      ```

      If any of the `promises` given to `RSVP.all` are rejected, the first promise
      that is rejected will be given as an argument to the returned promises's
      rejection handler. For example:

      Example:

      ```javascript
      var promise1 = RSVP.resolve(1);
      var promise2 = RSVP.reject(new Error("2"));
      var promise3 = RSVP.reject(new Error("3"));
      var promises = [ promise1, promise2, promise3 ];

      RSVP.all(promises).then(function(array){
        // Code here never runs because there are rejected promises!
      }, function(error) {
        // error.message === "2"
      });
      ```

      @method all
      @for RSVP
      @param {Array} promises
      @param {String} label
      @return {Promise} promise that is fulfilled when all `promises` have been
      fulfilled, or rejected if any of them become rejected.
    */
    function all(promises) {
      /*jshint validthis:true */
      var Promise = this;

      if (!isArray(promises)) {
        throw new TypeError('You must pass an array to all.');
      }

      return new Promise(function(resolve, reject) {
        var results = [], remaining = promises.length,
        promise;

        if (remaining === 0) {
          resolve([]);
        }

        function resolver(index) {
          return function(value) {
            resolveAll(index, value);
          };
        }

        function resolveAll(index, value) {
          results[index] = value;
          if (--remaining === 0) {
            resolve(results);
          }
        }

        for (var i = 0; i < promises.length; i++) {
          promise = promises[i];

          if (promise && isFunction(promise.then)) {
            promise.then(resolver(i), reject);
          } else {
            resolveAll(i, promise);
          }
        }
      });
    }

    __exports__.all = all;
  });
define("promise/asap", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var browserGlobal = (typeof window !== 'undefined') ? window : {};
    var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
    var local = (typeof global !== 'undefined') ? global : (this === undefined? window:this);

    // node
    function useNextTick() {
      return function() {
        process.nextTick(flush);
      };
    }

    function useMutationObserver() {
      var iterations = 0;
      var observer = new BrowserMutationObserver(flush);
      var node = document.createTextNode('');
      observer.observe(node, { characterData: true });

      return function() {
        node.data = (iterations = ++iterations % 2);
      };
    }

    function useSetTimeout() {
      return function() {
        local.setTimeout(flush, 1);
      };
    }

    var queue = [];
    function flush() {
      for (var i = 0; i < queue.length; i++) {
        var tuple = queue[i];
        var callback = tuple[0], arg = tuple[1];
        callback(arg);
      }
      queue = [];
    }

    var scheduleFlush;

    // Decide what async method to use to triggering processing of queued callbacks:
    if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
      scheduleFlush = useNextTick();
    } else if (BrowserMutationObserver) {
      scheduleFlush = useMutationObserver();
    } else {
      scheduleFlush = useSetTimeout();
    }

    function asap(callback, arg) {
      var length = queue.push([callback, arg]);
      if (length === 1) {
        // If length is 1, that means that we need to schedule an async flush.
        // If additional callbacks are queued before the queue is flushed, they
        // will be processed by this flush that we are scheduling.
        scheduleFlush();
      }
    }

    __exports__.asap = asap;
  });
define("promise/config", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var config = {
      instrument: false
    };

    function configure(name, value) {
      if (arguments.length === 2) {
        config[name] = value;
      } else {
        return config[name];
      }
    }

    __exports__.config = config;
    __exports__.configure = configure;
  });
define("promise/polyfill", 
  ["./promise","./utils","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    /*global self*/
    var RSVPPromise = __dependency1__.Promise;
    var isFunction = __dependency2__.isFunction;

    function polyfill() {
      var local;

      if (typeof global !== 'undefined') {
        local = global;
      } else if (typeof window !== 'undefined' && window.document) {
        local = window;
      } else {
        local = self;
      }

      var es6PromiseSupport = 
        "Promise" in local &&
        // Some of these methods are missing from
        // Firefox/Chrome experimental implementations
        "resolve" in local.Promise &&
        "reject" in local.Promise &&
        "all" in local.Promise &&
        "race" in local.Promise &&
        // Older version of the spec had a resolver object
        // as the arg rather than a function
        (function() {
          var resolve;
          new local.Promise(function(r) { resolve = r; });
          return isFunction(resolve);
        }());

      if (!es6PromiseSupport) {
        local.Promise = RSVPPromise;
      }
    }

    __exports__.polyfill = polyfill;
  });
define("promise/promise", 
  ["./config","./utils","./all","./race","./resolve","./reject","./asap","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __exports__) {
    "use strict";
    var config = __dependency1__.config;
    var configure = __dependency1__.configure;
    var objectOrFunction = __dependency2__.objectOrFunction;
    var isFunction = __dependency2__.isFunction;
    var now = __dependency2__.now;
    var all = __dependency3__.all;
    var race = __dependency4__.race;
    var staticResolve = __dependency5__.resolve;
    var staticReject = __dependency6__.reject;
    var asap = __dependency7__.asap;

    var counter = 0;

    config.async = asap; // default async is asap;

    function Promise(resolver) {
      if (!isFunction(resolver)) {
        throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
      }

      if (!(this instanceof Promise)) {
        throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
      }

      this._subscribers = [];

      invokeResolver(resolver, this);
    }

    function invokeResolver(resolver, promise) {
      function resolvePromise(value) {
        resolve(promise, value);
      }

      function rejectPromise(reason) {
        reject(promise, reason);
      }

      try {
        resolver(resolvePromise, rejectPromise);
      } catch(e) {
        rejectPromise(e);
      }
    }

    function invokeCallback(settled, promise, callback, detail) {
      var hasCallback = isFunction(callback),
          value, error, succeeded, failed;

      if (hasCallback) {
        try {
          value = callback(detail);
          succeeded = true;
        } catch(e) {
          failed = true;
          error = e;
        }
      } else {
        value = detail;
        succeeded = true;
      }

      if (handleThenable(promise, value)) {
        return;
      } else if (hasCallback && succeeded) {
        resolve(promise, value);
      } else if (failed) {
        reject(promise, error);
      } else if (settled === FULFILLED) {
        resolve(promise, value);
      } else if (settled === REJECTED) {
        reject(promise, value);
      }
    }

    var PENDING   = void 0;
    var SEALED    = 0;
    var FULFILLED = 1;
    var REJECTED  = 2;

    function subscribe(parent, child, onFulfillment, onRejection) {
      var subscribers = parent._subscribers;
      var length = subscribers.length;

      subscribers[length] = child;
      subscribers[length + FULFILLED] = onFulfillment;
      subscribers[length + REJECTED]  = onRejection;
    }

    function publish(promise, settled) {
      var child, callback, subscribers = promise._subscribers, detail = promise._detail;

      for (var i = 0; i < subscribers.length; i += 3) {
        child = subscribers[i];
        callback = subscribers[i + settled];

        invokeCallback(settled, child, callback, detail);
      }

      promise._subscribers = null;
    }

    Promise.prototype = {
      constructor: Promise,

      _state: undefined,
      _detail: undefined,
      _subscribers: undefined,

      then: function(onFulfillment, onRejection) {
        var promise = this;

        var thenPromise = new this.constructor(function() {});

        if (this._state) {
          var callbacks = arguments;
          config.async(function invokePromiseCallback() {
            invokeCallback(promise._state, thenPromise, callbacks[promise._state - 1], promise._detail);
          });
        } else {
          subscribe(this, thenPromise, onFulfillment, onRejection);
        }

        return thenPromise;
      },

      'catch': function(onRejection) {
        return this.then(null, onRejection);
      }
    };

    Promise.all = all;
    Promise.race = race;
    Promise.resolve = staticResolve;
    Promise.reject = staticReject;

    function handleThenable(promise, value) {
      var then = null,
      resolved;

      try {
        if (promise === value) {
          throw new TypeError("A promises callback cannot return that same promise.");
        }

        if (objectOrFunction(value)) {
          then = value.then;

          if (isFunction(then)) {
            then.call(value, function(val) {
              if (resolved) { return true; }
              resolved = true;

              if (value !== val) {
                resolve(promise, val);
              } else {
                fulfill(promise, val);
              }
            }, function(val) {
              if (resolved) { return true; }
              resolved = true;

              reject(promise, val);
            });

            return true;
          }
        }
      } catch (error) {
        if (resolved) { return true; }
        reject(promise, error);
        return true;
      }

      return false;
    }

    function resolve(promise, value) {
      if (promise === value) {
        fulfill(promise, value);
      } else if (!handleThenable(promise, value)) {
        fulfill(promise, value);
      }
    }

    function fulfill(promise, value) {
      if (promise._state !== PENDING) { return; }
      promise._state = SEALED;
      promise._detail = value;

      config.async(publishFulfillment, promise);
    }

    function reject(promise, reason) {
      if (promise._state !== PENDING) { return; }
      promise._state = SEALED;
      promise._detail = reason;

      config.async(publishRejection, promise);
    }

    function publishFulfillment(promise) {
      publish(promise, promise._state = FULFILLED);
    }

    function publishRejection(promise) {
      publish(promise, promise._state = REJECTED);
    }

    __exports__.Promise = Promise;
  });
define("promise/race", 
  ["./utils","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    /* global toString */
    var isArray = __dependency1__.isArray;

    /**
      `RSVP.race` allows you to watch a series of promises and act as soon as the
      first promise given to the `promises` argument fulfills or rejects.

      Example:

      ```javascript
      var promise1 = new RSVP.Promise(function(resolve, reject){
        setTimeout(function(){
          resolve("promise 1");
        }, 200);
      });

      var promise2 = new RSVP.Promise(function(resolve, reject){
        setTimeout(function(){
          resolve("promise 2");
        }, 100);
      });

      RSVP.race([promise1, promise2]).then(function(result){
        // result === "promise 2" because it was resolved before promise1
        // was resolved.
      });
      ```

      `RSVP.race` is deterministic in that only the state of the first completed
      promise matters. For example, even if other promises given to the `promises`
      array argument are resolved, but the first completed promise has become
      rejected before the other promises became fulfilled, the returned promise
      will become rejected:

      ```javascript
      var promise1 = new RSVP.Promise(function(resolve, reject){
        setTimeout(function(){
          resolve("promise 1");
        }, 200);
      });

      var promise2 = new RSVP.Promise(function(resolve, reject){
        setTimeout(function(){
          reject(new Error("promise 2"));
        }, 100);
      });

      RSVP.race([promise1, promise2]).then(function(result){
        // Code here never runs because there are rejected promises!
      }, function(reason){
        // reason.message === "promise2" because promise 2 became rejected before
        // promise 1 became fulfilled
      });
      ```

      @method race
      @for RSVP
      @param {Array} promises array of promises to observe
      @param {String} label optional string for describing the promise returned.
      Useful for tooling.
      @return {Promise} a promise that becomes fulfilled with the value the first
      completed promises is resolved with if the first completed promise was
      fulfilled, or rejected with the reason that the first completed promise
      was rejected with.
    */
    function race(promises) {
      /*jshint validthis:true */
      var Promise = this;

      if (!isArray(promises)) {
        throw new TypeError('You must pass an array to race.');
      }
      return new Promise(function(resolve, reject) {
        var results = [], promise;

        for (var i = 0; i < promises.length; i++) {
          promise = promises[i];

          if (promise && typeof promise.then === 'function') {
            promise.then(resolve, reject);
          } else {
            resolve(promise);
          }
        }
      });
    }

    __exports__.race = race;
  });
define("promise/reject", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /**
      `RSVP.reject` returns a promise that will become rejected with the passed
      `reason`. `RSVP.reject` is essentially shorthand for the following:

      ```javascript
      var promise = new RSVP.Promise(function(resolve, reject){
        reject(new Error('WHOOPS'));
      });

      promise.then(function(value){
        // Code here doesn't run because the promise is rejected!
      }, function(reason){
        // reason.message === 'WHOOPS'
      });
      ```

      Instead of writing the above, your code now simply becomes the following:

      ```javascript
      var promise = RSVP.reject(new Error('WHOOPS'));

      promise.then(function(value){
        // Code here doesn't run because the promise is rejected!
      }, function(reason){
        // reason.message === 'WHOOPS'
      });
      ```

      @method reject
      @for RSVP
      @param {Any} reason value that the returned promise will be rejected with.
      @param {String} label optional string for identifying the returned promise.
      Useful for tooling.
      @return {Promise} a promise that will become rejected with the given
      `reason`.
    */
    function reject(reason) {
      /*jshint validthis:true */
      var Promise = this;

      return new Promise(function (resolve, reject) {
        reject(reason);
      });
    }

    __exports__.reject = reject;
  });
define("promise/resolve", 
  ["exports"],
  function(__exports__) {
    "use strict";
    function resolve(value) {
      /*jshint validthis:true */
      if (value && typeof value === 'object' && value.constructor === this) {
        return value;
      }

      var Promise = this;

      return new Promise(function(resolve) {
        resolve(value);
      });
    }

    __exports__.resolve = resolve;
  });
define("promise/utils", 
  ["exports"],
  function(__exports__) {
    "use strict";
    function objectOrFunction(x) {
      return isFunction(x) || (typeof x === "object" && x !== null);
    }

    function isFunction(x) {
      return typeof x === "function";
    }

    function isArray(x) {
      return Object.prototype.toString.call(x) === "[object Array]";
    }

    // Date.now is not available in browsers < IE9
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now#Compatibility
    var now = Date.now || function() { return new Date().getTime(); };


    __exports__.objectOrFunction = objectOrFunction;
    __exports__.isFunction = isFunction;
    __exports__.isArray = isArray;
    __exports__.now = now;
  });
requireModule('promise/polyfill').polyfill();
}());(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["localforage"] = factory();
	else
		root["localforage"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	(function () {
	    'use strict';

	    // Custom drivers are stored here when `defineDriver()` is called.
	    // They are shared across all instances of localForage.
	    var CustomDrivers = {};

	    var DriverType = {
	        INDEXEDDB: 'asyncStorage',
	        LOCALSTORAGE: 'localStorageWrapper',
	        WEBSQL: 'webSQLStorage'
	    };

	    var DefaultDriverOrder = [DriverType.INDEXEDDB, DriverType.WEBSQL, DriverType.LOCALSTORAGE];

	    var LibraryMethods = ['clear', 'getItem', 'iterate', 'key', 'keys', 'length', 'removeItem', 'setItem'];

	    var DefaultConfig = {
	        description: '',
	        driver: DefaultDriverOrder.slice(),
	        name: 'localforage',
	        // Default DB size is _JUST UNDER_ 5MB, as it's the highest size
	        // we can use without a prompt.
	        size: 4980736,
	        storeName: 'keyvaluepairs',
	        version: 1.0
	    };

	    // Check to see if IndexedDB is available and if it is the latest
	    // implementation; it's our preferred backend library. We use "_spec_test"
	    // as the name of the database because it's not the one we'll operate on,
	    // but it's useful to make sure its using the right spec.
	    // See: https://github.com/mozilla/localForage/issues/128
	    var driverSupport = (function (self) {
	        // Initialize IndexedDB; fall back to vendor-prefixed versions
	        // if needed.
	        var indexedDB = indexedDB || self.indexedDB || self.webkitIndexedDB || self.mozIndexedDB || self.OIndexedDB || self.msIndexedDB;

	        var result = {};

	        result[DriverType.WEBSQL] = !!self.openDatabase;
	        result[DriverType.INDEXEDDB] = !!(function () {
	            // We mimic PouchDB here; just UA test for Safari (which, as of
	            // iOS 8/Yosemite, doesn't properly support IndexedDB).
	            // IndexedDB support is broken and different from Blink's.
	            // This is faster than the test case (and it's sync), so we just
	            // do this. *SIGH*
	            // http://bl.ocks.org/nolanlawson/raw/c83e9039edf2278047e9/
	            //
	            // We test for openDatabase because IE Mobile identifies itself
	            // as Safari. Oh the lulz...
	            if (typeof self.openDatabase !== 'undefined' && self.navigator && self.navigator.userAgent && /Safari/.test(self.navigator.userAgent) && !/Chrome/.test(self.navigator.userAgent)) {
	                return false;
	            }
	            try {
	                return indexedDB && typeof indexedDB.open === 'function' &&
	                // Some Samsung/HTC Android 4.0-4.3 devices
	                // have older IndexedDB specs; if this isn't available
	                // their IndexedDB is too old for us to use.
	                // (Replaces the onupgradeneeded test.)
	                typeof self.IDBKeyRange !== 'undefined';
	            } catch (e) {
	                return false;
	            }
	        })();

	        result[DriverType.LOCALSTORAGE] = !!(function () {
	            try {
	                return self.localStorage && 'setItem' in self.localStorage && self.localStorage.setItem;
	            } catch (e) {
	                return false;
	            }
	        })();

	        return result;
	    })(this);

	    var isArray = Array.isArray || function (arg) {
	        return Object.prototype.toString.call(arg) === '[object Array]';
	    };

	    function callWhenReady(localForageInstance, libraryMethod) {
	        localForageInstance[libraryMethod] = function () {
	            var _args = arguments;
	            return localForageInstance.ready().then(function () {
	                return localForageInstance[libraryMethod].apply(localForageInstance, _args);
	            });
	        };
	    }

	    function extend() {
	        for (var i = 1; i < arguments.length; i++) {
	            var arg = arguments[i];

	            if (arg) {
	                for (var key in arg) {
	                    if (arg.hasOwnProperty(key)) {
	                        if (isArray(arg[key])) {
	                            arguments[0][key] = arg[key].slice();
	                        } else {
	                            arguments[0][key] = arg[key];
	                        }
	                    }
	                }
	            }
	        }

	        return arguments[0];
	    }

	    function isLibraryDriver(driverName) {
	        for (var driver in DriverType) {
	            if (DriverType.hasOwnProperty(driver) && DriverType[driver] === driverName) {
	                return true;
	            }
	        }

	        return false;
	    }

	    var LocalForage = (function () {
	        function LocalForage(options) {
	            _classCallCheck(this, LocalForage);

	            this.INDEXEDDB = DriverType.INDEXEDDB;
	            this.LOCALSTORAGE = DriverType.LOCALSTORAGE;
	            this.WEBSQL = DriverType.WEBSQL;

	            this._defaultConfig = extend({}, DefaultConfig);
	            this._config = extend({}, this._defaultConfig, options);
	            this._driverSet = null;
	            this._initDriver = null;
	            this._ready = false;
	            this._dbInfo = null;

	            this._wrapLibraryMethodsWithReady();
	            this.setDriver(this._config.driver);
	        }

	        // The actual localForage object that we expose as a module or via a
	        // global. It's extended by pulling in one of our other libraries.

	        // Set any config values for localForage; can be called anytime before
	        // the first API call (e.g. `getItem`, `setItem`).
	        // We loop through options so we don't overwrite existing config
	        // values.

	        LocalForage.prototype.config = function config(options) {
	            // If the options argument is an object, we use it to set values.
	            // Otherwise, we return either a specified config value or all
	            // config values.
	            if (typeof options === 'object') {
	                // If localforage is ready and fully initialized, we can't set
	                // any new configuration values. Instead, we return an error.
	                if (this._ready) {
	                    return new Error("Can't call config() after localforage " + 'has been used.');
	                }

	                for (var i in options) {
	                    if (i === 'storeName') {
	                        options[i] = options[i].replace(/\W/g, '_');
	                    }

	                    this._config[i] = options[i];
	                }

	                // after all config options are set and
	                // the driver option is used, try setting it
	                if ('driver' in options && options.driver) {
	                    this.setDriver(this._config.driver);
	                }

	                return true;
	            } else if (typeof options === 'string') {
	                return this._config[options];
	            } else {
	                return this._config;
	            }
	        };

	        // Used to define a custom driver, shared across all instances of
	        // localForage.

	        LocalForage.prototype.defineDriver = function defineDriver(driverObject, callback, errorCallback) {
	            var promise = new Promise(function (resolve, reject) {
	                try {
	                    var driverName = driverObject._driver;
	                    var complianceError = new Error('Custom driver not compliant; see ' + 'https://mozilla.github.io/localForage/#definedriver');
	                    var namingError = new Error('Custom driver name already in use: ' + driverObject._driver);

	                    // A driver name should be defined and not overlap with the
	                    // library-defined, default drivers.
	                    if (!driverObject._driver) {
	                        reject(complianceError);
	                        return;
	                    }
	                    if (isLibraryDriver(driverObject._driver)) {
	                        reject(namingError);
	                        return;
	                    }

	                    var customDriverMethods = LibraryMethods.concat('_initStorage');
	                    for (var i = 0; i < customDriverMethods.length; i++) {
	                        var customDriverMethod = customDriverMethods[i];
	                        if (!customDriverMethod || !driverObject[customDriverMethod] || typeof driverObject[customDriverMethod] !== 'function') {
	                            reject(complianceError);
	                            return;
	                        }
	                    }

	                    var supportPromise = Promise.resolve(true);
	                    if ('_support' in driverObject) {
	                        if (driverObject._support && typeof driverObject._support === 'function') {
	                            supportPromise = driverObject._support();
	                        } else {
	                            supportPromise = Promise.resolve(!!driverObject._support);
	                        }
	                    }

	                    supportPromise.then(function (supportResult) {
	                        driverSupport[driverName] = supportResult;
	                        CustomDrivers[driverName] = driverObject;
	                        resolve();
	                    }, reject);
	                } catch (e) {
	                    reject(e);
	                }
	            });

	            promise.then(callback, errorCallback);
	            return promise;
	        };

	        LocalForage.prototype.driver = function driver() {
	            return this._driver || null;
	        };

	        LocalForage.prototype.getDriver = function getDriver(driverName, callback, errorCallback) {
	            var self = this;
	            var getDriverPromise = (function () {
	                if (isLibraryDriver(driverName)) {
	                    switch (driverName) {
	                        case self.INDEXEDDB:
	                            return new Promise(function (resolve, reject) {
	                                resolve(__webpack_require__(1));
	                            });
	                        case self.LOCALSTORAGE:
	                            return new Promise(function (resolve, reject) {
	                                resolve(__webpack_require__(2));
	                            });
	                        case self.WEBSQL:
	                            return new Promise(function (resolve, reject) {
	                                resolve(__webpack_require__(4));
	                            });
	                    }
	                } else if (CustomDrivers[driverName]) {
	                    return Promise.resolve(CustomDrivers[driverName]);
	                }

	                return Promise.reject(new Error('Driver not found.'));
	            })();

	            getDriverPromise.then(callback, errorCallback);
	            return getDriverPromise;
	        };

	        LocalForage.prototype.getSerializer = function getSerializer(callback) {
	            var serializerPromise = new Promise(function (resolve, reject) {
	                resolve(__webpack_require__(3));
	            });
	            if (callback && typeof callback === 'function') {
	                serializerPromise.then(function (result) {
	                    callback(result);
	                });
	            }
	            return serializerPromise;
	        };

	        LocalForage.prototype.ready = function ready(callback) {
	            var self = this;

	            var promise = self._driverSet.then(function () {
	                if (self._ready === null) {
	                    self._ready = self._initDriver();
	                }

	                return self._ready;
	            });

	            promise.then(callback, callback);
	            return promise;
	        };

	        LocalForage.prototype.setDriver = function setDriver(drivers, callback, errorCallback) {
	            var self = this;

	            if (!isArray(drivers)) {
	                drivers = [drivers];
	            }

	            var supportedDrivers = this._getSupportedDrivers(drivers);

	            function setDriverToConfig() {
	                self._config.driver = self.driver();
	            }

	            function initDriver(supportedDrivers) {
	                return function () {
	                    var currentDriverIndex = 0;

	                    function driverPromiseLoop() {
	                        while (currentDriverIndex < supportedDrivers.length) {
	                            var driverName = supportedDrivers[currentDriverIndex];
	                            currentDriverIndex++;

	                            self._dbInfo = null;
	                            self._ready = null;

	                            return self.getDriver(driverName).then(function (driver) {
	                                self._extend(driver);
	                                setDriverToConfig();

	                                self._ready = self._initStorage(self._config);
	                                return self._ready;
	                            })['catch'](driverPromiseLoop);
	                        }

	                        setDriverToConfig();
	                        var error = new Error('No available storage method found.');
	                        self._driverSet = Promise.reject(error);
	                        return self._driverSet;
	                    }

	                    return driverPromiseLoop();
	                };
	            }

	            // There might be a driver initialization in progress
	            // so wait for it to finish in order to avoid a possible
	            // race condition to set _dbInfo
	            var oldDriverSetDone = this._driverSet !== null ? this._driverSet['catch'](function () {
	                return Promise.resolve();
	            }) : Promise.resolve();

	            this._driverSet = oldDriverSetDone.then(function () {
	                var driverName = supportedDrivers[0];
	                self._dbInfo = null;
	                self._ready = null;

	                return self.getDriver(driverName).then(function (driver) {
	                    self._driver = driver._driver;
	                    setDriverToConfig();
	                    self._wrapLibraryMethodsWithReady();
	                    self._initDriver = initDriver(supportedDrivers);
	                });
	            })['catch'](function () {
	                setDriverToConfig();
	                var error = new Error('No available storage method found.');
	                self._driverSet = Promise.reject(error);
	                return self._driverSet;
	            });

	            this._driverSet.then(callback, errorCallback);
	            return this._driverSet;
	        };

	        LocalForage.prototype.supports = function supports(driverName) {
	            return !!driverSupport[driverName];
	        };

	        LocalForage.prototype._extend = function _extend(libraryMethodsAndProperties) {
	            extend(this, libraryMethodsAndProperties);
	        };

	        LocalForage.prototype._getSupportedDrivers = function _getSupportedDrivers(drivers) {
	            var supportedDrivers = [];
	            for (var i = 0, len = drivers.length; i < len; i++) {
	                var driverName = drivers[i];
	                if (this.supports(driverName)) {
	                    supportedDrivers.push(driverName);
	                }
	            }
	            return supportedDrivers;
	        };

	        LocalForage.prototype._wrapLibraryMethodsWithReady = function _wrapLibraryMethodsWithReady() {
	            // Add a stub for each driver API method that delays the call to the
	            // corresponding driver method until localForage is ready. These stubs
	            // will be replaced by the driver methods as soon as the driver is
	            // loaded, so there is no performance impact.
	            for (var i = 0; i < LibraryMethods.length; i++) {
	                callWhenReady(this, LibraryMethods[i]);
	            }
	        };

	        LocalForage.prototype.createInstance = function createInstance(options) {
	            return new LocalForage(options);
	        };

	        return LocalForage;
	    })();

	    var localForage = new LocalForage();

	    exports['default'] = localForage;
	}).call(typeof window !== 'undefined' ? window : self);
	module.exports = exports['default'];

/***/ },
/* 1 */
/***/ function(module, exports) {

	// Some code originally from async_storage.js in
	// [Gaia](https://github.com/mozilla-b2g/gaia).
	'use strict';

	exports.__esModule = true;
	(function () {
	    'use strict';

	    var globalObject = this;
	    // Initialize IndexedDB; fall back to vendor-prefixed versions if needed.
	    var indexedDB = indexedDB || this.indexedDB || this.webkitIndexedDB || this.mozIndexedDB || this.OIndexedDB || this.msIndexedDB;

	    // If IndexedDB isn't available, we get outta here!
	    if (!indexedDB) {
	        return;
	    }

	    var DETECT_BLOB_SUPPORT_STORE = 'local-forage-detect-blob-support';
	    var supportsBlobs;
	    var dbContexts;

	    // Abstracts constructing a Blob object, so it also works in older
	    // browsers that don't support the native Blob constructor. (i.e.
	    // old QtWebKit versions, at least).
	    function _createBlob(parts, properties) {
	        parts = parts || [];
	        properties = properties || {};
	        try {
	            return new Blob(parts, properties);
	        } catch (e) {
	            if (e.name !== 'TypeError') {
	                throw e;
	            }
	            var BlobBuilder = globalObject.BlobBuilder || globalObject.MSBlobBuilder || globalObject.MozBlobBuilder || globalObject.WebKitBlobBuilder;
	            var builder = new BlobBuilder();
	            for (var i = 0; i < parts.length; i += 1) {
	                builder.append(parts[i]);
	            }
	            return builder.getBlob(properties.type);
	        }
	    }

	    // Transform a binary string to an array buffer, because otherwise
	    // weird stuff happens when you try to work with the binary string directly.
	    // It is known.
	    // From http://stackoverflow.com/questions/14967647/ (continues on next line)
	    // encode-decode-image-with-base64-breaks-image (2013-04-21)
	    function _binStringToArrayBuffer(bin) {
	        var length = bin.length;
	        var buf = new ArrayBuffer(length);
	        var arr = new Uint8Array(buf);
	        for (var i = 0; i < length; i++) {
	            arr[i] = bin.charCodeAt(i);
	        }
	        return buf;
	    }

	    // Fetch a blob using ajax. This reveals bugs in Chrome < 43.
	    // For details on all this junk:
	    // https://github.com/nolanlawson/state-of-binary-data-in-the-browser#readme
	    function _blobAjax(url) {
	        return new Promise(function (resolve, reject) {
	            var xhr = new XMLHttpRequest();
	            xhr.open('GET', url);
	            xhr.withCredentials = true;
	            xhr.responseType = 'arraybuffer';

	            xhr.onreadystatechange = function () {
	                if (xhr.readyState !== 4) {
	                    return;
	                }
	                if (xhr.status === 200) {
	                    return resolve({
	                        response: xhr.response,
	                        type: xhr.getResponseHeader('Content-Type')
	                    });
	                }
	                reject({ status: xhr.status, response: xhr.response });
	            };
	            xhr.send();
	        });
	    }

	    //
	    // Detect blob support. Chrome didn't support it until version 38.
	    // In version 37 they had a broken version where PNGs (and possibly
	    // other binary types) aren't stored correctly, because when you fetch
	    // them, the content type is always null.
	    //
	    // Furthermore, they have some outstanding bugs where blobs occasionally
	    // are read by FileReader as null, or by ajax as 404s.
	    //
	    // Sadly we use the 404 bug to detect the FileReader bug, so if they
	    // get fixed independently and released in different versions of Chrome,
	    // then the bug could come back. So it's worthwhile to watch these issues:
	    // 404 bug: https://code.google.com/p/chromium/issues/detail?id=447916
	    // FileReader bug: https://code.google.com/p/chromium/issues/detail?id=447836
	    //
	    function _checkBlobSupportWithoutCaching(idb) {
	        return new Promise(function (resolve, reject) {
	            var blob = _createBlob([''], { type: 'image/png' });
	            var txn = idb.transaction([DETECT_BLOB_SUPPORT_STORE], 'readwrite');
	            txn.objectStore(DETECT_BLOB_SUPPORT_STORE).put(blob, 'key');
	            txn.oncomplete = function () {
	                // have to do it in a separate transaction, else the correct
	                // content type is always returned
	                var blobTxn = idb.transaction([DETECT_BLOB_SUPPORT_STORE], 'readwrite');
	                var getBlobReq = blobTxn.objectStore(DETECT_BLOB_SUPPORT_STORE).get('key');
	                getBlobReq.onerror = reject;
	                getBlobReq.onsuccess = function (e) {

	                    var storedBlob = e.target.result;
	                    var url = URL.createObjectURL(storedBlob);

	                    _blobAjax(url).then(function (res) {
	                        resolve(!!(res && res.type === 'image/png'));
	                    }, function () {
	                        resolve(false);
	                    }).then(function () {
	                        URL.revokeObjectURL(url);
	                    });
	                };
	            };
	        })['catch'](function () {
	            return false; // error, so assume unsupported
	        });
	    }

	    function _checkBlobSupport(idb) {
	        if (typeof supportsBlobs === 'boolean') {
	            return Promise.resolve(supportsBlobs);
	        }
	        return _checkBlobSupportWithoutCaching(idb).then(function (value) {
	            supportsBlobs = value;
	            return supportsBlobs;
	        });
	    }

	    // encode a blob for indexeddb engines that don't support blobs
	    function _encodeBlob(blob) {
	        return new Promise(function (resolve, reject) {
	            var reader = new FileReader();
	            reader.onerror = reject;
	            reader.onloadend = function (e) {
	                var base64 = btoa(e.target.result || '');
	                resolve({
	                    __local_forage_encoded_blob: true,
	                    data: base64,
	                    type: blob.type
	                });
	            };
	            reader.readAsBinaryString(blob);
	        });
	    }

	    // decode an encoded blob
	    function _decodeBlob(encodedBlob) {
	        var arrayBuff = _binStringToArrayBuffer(atob(encodedBlob.data));
	        return _createBlob([arrayBuff], { type: encodedBlob.type });
	    }

	    // is this one of our fancy encoded blobs?
	    function _isEncodedBlob(value) {
	        return value && value.__local_forage_encoded_blob;
	    }

	    // Open the IndexedDB database (automatically creates one if one didn't
	    // previously exist), using any options set in the config.
	    function _initStorage(options) {
	        var self = this;
	        var dbInfo = {
	            db: null
	        };

	        if (options) {
	            for (var i in options) {
	                dbInfo[i] = options[i];
	            }
	        }

	        // Initialize a singleton container for all running localForages.
	        if (!dbContexts) {
	            dbContexts = {};
	        }

	        // Get the current context of the database;
	        var dbContext = dbContexts[dbInfo.name];

	        // ...or create a new context.
	        if (!dbContext) {
	            dbContext = {
	                // Running localForages sharing a database.
	                forages: [],
	                // Shared database.
	                db: null
	            };
	            // Register the new context in the global container.
	            dbContexts[dbInfo.name] = dbContext;
	        }

	        // Register itself as a running localForage in the current context.
	        dbContext.forages.push(this);

	        // Create an array of readiness of the related localForages.
	        var readyPromises = [];

	        function ignoreErrors() {
	            // Don't handle errors here,
	            // just makes sure related localForages aren't pending.
	            return Promise.resolve();
	        }

	        for (var j = 0; j < dbContext.forages.length; j++) {
	            var forage = dbContext.forages[j];
	            if (forage !== this) {
	                // Don't wait for itself...
	                readyPromises.push(forage.ready()['catch'](ignoreErrors));
	            }
	        }

	        // Take a snapshot of the related localForages.
	        var forages = dbContext.forages.slice(0);

	        // Initialize the connection process only when
	        // all the related localForages aren't pending.
	        return Promise.all(readyPromises).then(function () {
	            dbInfo.db = dbContext.db;
	            // Get the connection or open a new one without upgrade.
	            return _getOriginalConnection(dbInfo);
	        }).then(function (db) {
	            dbInfo.db = db;
	            if (_isUpgradeNeeded(dbInfo, self._defaultConfig.version)) {
	                // Reopen the database for upgrading.
	                return _getUpgradedConnection(dbInfo);
	            }
	            return db;
	        }).then(function (db) {
	            dbInfo.db = dbContext.db = db;
	            self._dbInfo = dbInfo;
	            // Share the final connection amongst related localForages.
	            for (var k = 0; k < forages.length; k++) {
	                var forage = forages[k];
	                if (forage !== self) {
	                    // Self is already up-to-date.
	                    forage._dbInfo.db = dbInfo.db;
	                    forage._dbInfo.version = dbInfo.version;
	                }
	            }
	        });
	    }

	    function _getOriginalConnection(dbInfo) {
	        return _getConnection(dbInfo, false);
	    }

	    function _getUpgradedConnection(dbInfo) {
	        return _getConnection(dbInfo, true);
	    }

	    function _getConnection(dbInfo, upgradeNeeded) {
	        return new Promise(function (resolve, reject) {
	            if (dbInfo.db) {
	                if (upgradeNeeded) {
	                    dbInfo.db.close();
	                } else {
	                    return resolve(dbInfo.db);
	                }
	            }

	            var dbArgs = [dbInfo.name];

	            if (upgradeNeeded) {
	                dbArgs.push(dbInfo.version);
	            }

	            var openreq = indexedDB.open.apply(indexedDB, dbArgs);

	            if (upgradeNeeded) {
	                openreq.onupgradeneeded = function (e) {
	                    var db = openreq.result;
	                    try {
	                        db.createObjectStore(dbInfo.storeName);
	                        if (e.oldVersion <= 1) {
	                            // Added when support for blob shims was added
	                            db.createObjectStore(DETECT_BLOB_SUPPORT_STORE);
	                        }
	                    } catch (ex) {
	                        if (ex.name === 'ConstraintError') {
	                            globalObject.console.warn('The database "' + dbInfo.name + '"' + ' has been upgraded from version ' + e.oldVersion + ' to version ' + e.newVersion + ', but the storage "' + dbInfo.storeName + '" already exists.');
	                        } else {
	                            throw ex;
	                        }
	                    }
	                };
	            }

	            openreq.onerror = function () {
	                reject(openreq.error);
	            };

	            openreq.onsuccess = function () {
	                resolve(openreq.result);
	            };
	        });
	    }

	    function _isUpgradeNeeded(dbInfo, defaultVersion) {
	        if (!dbInfo.db) {
	            return true;
	        }

	        var isNewStore = !dbInfo.db.objectStoreNames.contains(dbInfo.storeName);
	        var isDowngrade = dbInfo.version < dbInfo.db.version;
	        var isUpgrade = dbInfo.version > dbInfo.db.version;

	        if (isDowngrade) {
	            // If the version is not the default one
	            // then warn for impossible downgrade.
	            if (dbInfo.version !== defaultVersion) {
	                globalObject.console.warn('The database "' + dbInfo.name + '"' + ' can\'t be downgraded from version ' + dbInfo.db.version + ' to version ' + dbInfo.version + '.');
	            }
	            // Align the versions to prevent errors.
	            dbInfo.version = dbInfo.db.version;
	        }

	        if (isUpgrade || isNewStore) {
	            // If the store is new then increment the version (if needed).
	            // This will trigger an "upgradeneeded" event which is required
	            // for creating a store.
	            if (isNewStore) {
	                var incVersion = dbInfo.db.version + 1;
	                if (incVersion > dbInfo.version) {
	                    dbInfo.version = incVersion;
	                }
	            }

	            return true;
	        }

	        return false;
	    }

	    function getItem(key, callback) {
	        var self = this;

	        // Cast the key to a string, as that's all we can set as a key.
	        if (typeof key !== 'string') {
	            globalObject.console.warn(key + ' used as a key, but it is not a string.');
	            key = String(key);
	        }

	        var promise = new Promise(function (resolve, reject) {
	            self.ready().then(function () {
	                var dbInfo = self._dbInfo;
	                var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly').objectStore(dbInfo.storeName);
	                var req = store.get(key);

	                req.onsuccess = function () {
	                    var value = req.result;
	                    if (value === undefined) {
	                        value = null;
	                    }
	                    if (_isEncodedBlob(value)) {
	                        value = _decodeBlob(value);
	                    }
	                    resolve(value);
	                };

	                req.onerror = function () {
	                    reject(req.error);
	                };
	            })['catch'](reject);
	        });

	        executeCallback(promise, callback);
	        return promise;
	    }

	    // Iterate over all items stored in database.
	    function iterate(iterator, callback) {
	        var self = this;

	        var promise = new Promise(function (resolve, reject) {
	            self.ready().then(function () {
	                var dbInfo = self._dbInfo;
	                var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly').objectStore(dbInfo.storeName);

	                var req = store.openCursor();
	                var iterationNumber = 1;

	                req.onsuccess = function () {
	                    var cursor = req.result;

	                    if (cursor) {
	                        var value = cursor.value;
	                        if (_isEncodedBlob(value)) {
	                            value = _decodeBlob(value);
	                        }
	                        var result = iterator(value, cursor.key, iterationNumber++);

	                        if (result !== void 0) {
	                            resolve(result);
	                        } else {
	                            cursor['continue']();
	                        }
	                    } else {
	                        resolve();
	                    }
	                };

	                req.onerror = function () {
	                    reject(req.error);
	                };
	            })['catch'](reject);
	        });

	        executeCallback(promise, callback);

	        return promise;
	    }

	    function setItem(key, value, callback) {
	        var self = this;

	        // Cast the key to a string, as that's all we can set as a key.
	        if (typeof key !== 'string') {
	            globalObject.console.warn(key + ' used as a key, but it is not a string.');
	            key = String(key);
	        }

	        var promise = new Promise(function (resolve, reject) {
	            var dbInfo;
	            self.ready().then(function () {
	                dbInfo = self._dbInfo;
	                if (value instanceof Blob) {
	                    return _checkBlobSupport(dbInfo.db).then(function (blobSupport) {
	                        if (blobSupport) {
	                            return value;
	                        }
	                        return _encodeBlob(value);
	                    });
	                }
	                return value;
	            }).then(function (value) {
	                var transaction = dbInfo.db.transaction(dbInfo.storeName, 'readwrite');
	                var store = transaction.objectStore(dbInfo.storeName);

	                // The reason we don't _save_ null is because IE 10 does
	                // not support saving the `null` type in IndexedDB. How
	                // ironic, given the bug below!
	                // See: https://github.com/mozilla/localForage/issues/161
	                if (value === null) {
	                    value = undefined;
	                }

	                var req = store.put(value, key);
	                transaction.oncomplete = function () {
	                    // Cast to undefined so the value passed to
	                    // callback/promise is the same as what one would get out
	                    // of `getItem()` later. This leads to some weirdness
	                    // (setItem('foo', undefined) will return `null`), but
	                    // it's not my fault localStorage is our baseline and that
	                    // it's weird.
	                    if (value === undefined) {
	                        value = null;
	                    }

	                    resolve(value);
	                };
	                transaction.onabort = transaction.onerror = function () {
	                    var err = req.error ? req.error : req.transaction.error;
	                    reject(err);
	                };
	            })['catch'](reject);
	        });

	        executeCallback(promise, callback);
	        return promise;
	    }

	    function removeItem(key, callback) {
	        var self = this;

	        // Cast the key to a string, as that's all we can set as a key.
	        if (typeof key !== 'string') {
	            globalObject.console.warn(key + ' used as a key, but it is not a string.');
	            key = String(key);
	        }

	        var promise = new Promise(function (resolve, reject) {
	            self.ready().then(function () {
	                var dbInfo = self._dbInfo;
	                var transaction = dbInfo.db.transaction(dbInfo.storeName, 'readwrite');
	                var store = transaction.objectStore(dbInfo.storeName);

	                // We use a Grunt task to make this safe for IE and some
	                // versions of Android (including those used by Cordova).
	                // Normally IE won't like `.delete()` and will insist on
	                // using `['delete']()`, but we have a build step that
	                // fixes this for us now.
	                var req = store['delete'](key);
	                transaction.oncomplete = function () {
	                    resolve();
	                };

	                transaction.onerror = function () {
	                    reject(req.error);
	                };

	                // The request will be also be aborted if we've exceeded our storage
	                // space.
	                transaction.onabort = function () {
	                    var err = req.error ? req.error : req.transaction.error;
	                    reject(err);
	                };
	            })['catch'](reject);
	        });

	        executeCallback(promise, callback);
	        return promise;
	    }

	    function clear(callback) {
	        var self = this;

	        var promise = new Promise(function (resolve, reject) {
	            self.ready().then(function () {
	                var dbInfo = self._dbInfo;
	                var transaction = dbInfo.db.transaction(dbInfo.storeName, 'readwrite');
	                var store = transaction.objectStore(dbInfo.storeName);
	                var req = store.clear();

	                transaction.oncomplete = function () {
	                    resolve();
	                };

	                transaction.onabort = transaction.onerror = function () {
	                    var err = req.error ? req.error : req.transaction.error;
	                    reject(err);
	                };
	            })['catch'](reject);
	        });

	        executeCallback(promise, callback);
	        return promise;
	    }

	    function length(callback) {
	        var self = this;

	        var promise = new Promise(function (resolve, reject) {
	            self.ready().then(function () {
	                var dbInfo = self._dbInfo;
	                var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly').objectStore(dbInfo.storeName);
	                var req = store.count();

	                req.onsuccess = function () {
	                    resolve(req.result);
	                };

	                req.onerror = function () {
	                    reject(req.error);
	                };
	            })['catch'](reject);
	        });

	        executeCallback(promise, callback);
	        return promise;
	    }

	    function key(n, callback) {
	        var self = this;

	        var promise = new Promise(function (resolve, reject) {
	            if (n < 0) {
	                resolve(null);

	                return;
	            }

	            self.ready().then(function () {
	                var dbInfo = self._dbInfo;
	                var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly').objectStore(dbInfo.storeName);

	                var advanced = false;
	                var req = store.openCursor();
	                req.onsuccess = function () {
	                    var cursor = req.result;
	                    if (!cursor) {
	                        // this means there weren't enough keys
	                        resolve(null);

	                        return;
	                    }

	                    if (n === 0) {
	                        // We have the first key, return it if that's what they
	                        // wanted.
	                        resolve(cursor.key);
	                    } else {
	                        if (!advanced) {
	                            // Otherwise, ask the cursor to skip ahead n
	                            // records.
	                            advanced = true;
	                            cursor.advance(n);
	                        } else {
	                            // When we get here, we've got the nth key.
	                            resolve(cursor.key);
	                        }
	                    }
	                };

	                req.onerror = function () {
	                    reject(req.error);
	                };
	            })['catch'](reject);
	        });

	        executeCallback(promise, callback);
	        return promise;
	    }

	    function keys(callback) {
	        var self = this;

	        var promise = new Promise(function (resolve, reject) {
	            self.ready().then(function () {
	                var dbInfo = self._dbInfo;
	                var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly').objectStore(dbInfo.storeName);

	                var req = store.openCursor();
	                var keys = [];

	                req.onsuccess = function () {
	                    var cursor = req.result;

	                    if (!cursor) {
	                        resolve(keys);
	                        return;
	                    }

	                    keys.push(cursor.key);
	                    cursor['continue']();
	                };

	                req.onerror = function () {
	                    reject(req.error);
	                };
	            })['catch'](reject);
	        });

	        executeCallback(promise, callback);
	        return promise;
	    }

	    function executeCallback(promise, callback) {
	        if (callback) {
	            promise.then(function (result) {
	                callback(null, result);
	            }, function (error) {
	                callback(error);
	            });
	        }
	    }

	    var asyncStorage = {
	        _driver: 'asyncStorage',
	        _initStorage: _initStorage,
	        iterate: iterate,
	        getItem: getItem,
	        setItem: setItem,
	        removeItem: removeItem,
	        clear: clear,
	        length: length,
	        key: key,
	        keys: keys
	    };

	    exports['default'] = asyncStorage;
	}).call(typeof window !== 'undefined' ? window : self);
	module.exports = exports['default'];

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	// If IndexedDB isn't available, we'll fall back to localStorage.
	// Note that this will have considerable performance and storage
	// side-effects (all data will be serialized on save and only data that
	// can be converted to a string via `JSON.stringify()` will be saved).
	'use strict';

	exports.__esModule = true;
	(function () {
	    'use strict';

	    var globalObject = this;
	    var localStorage = null;

	    // If the app is running inside a Google Chrome packaged webapp, or some
	    // other context where localStorage isn't available, we don't use
	    // localStorage. This feature detection is preferred over the old
	    // `if (window.chrome && window.chrome.runtime)` code.
	    // See: https://github.com/mozilla/localForage/issues/68
	    try {
	        // If localStorage isn't available, we get outta here!
	        // This should be inside a try catch
	        if (!this.localStorage || !('setItem' in this.localStorage)) {
	            return;
	        }
	        // Initialize localStorage and create a variable to use throughout
	        // the code.
	        localStorage = this.localStorage;
	    } catch (e) {
	        return;
	    }

	    // Config the localStorage backend, using options set in the config.
	    function _initStorage(options) {
	        var self = this;
	        var dbInfo = {};
	        if (options) {
	            for (var i in options) {
	                dbInfo[i] = options[i];
	            }
	        }

	        dbInfo.keyPrefix = dbInfo.name + '/';

	        if (dbInfo.storeName !== self._defaultConfig.storeName) {
	            dbInfo.keyPrefix += dbInfo.storeName + '/';
	        }

	        self._dbInfo = dbInfo;

	        return new Promise(function (resolve, reject) {
	            resolve(__webpack_require__(3));
	        }).then(function (lib) {
	            dbInfo.serializer = lib;
	            return Promise.resolve();
	        });
	    }

	    // Remove all keys from the datastore, effectively destroying all data in
	    // the app's key/value store!
	    function clear(callback) {
	        var self = this;
	        var promise = self.ready().then(function () {
	            var keyPrefix = self._dbInfo.keyPrefix;

	            for (var i = localStorage.length - 1; i >= 0; i--) {
	                var key = localStorage.key(i);

	                if (key.indexOf(keyPrefix) === 0) {
	                    localStorage.removeItem(key);
	                }
	            }
	        });

	        executeCallback(promise, callback);
	        return promise;
	    }

	    // Retrieve an item from the store. Unlike the original async_storage
	    // library in Gaia, we don't modify return values at all. If a key's value
	    // is `undefined`, we pass that value to the callback function.
	    function getItem(key, callback) {
	        var self = this;

	        // Cast the key to a string, as that's all we can set as a key.
	        if (typeof key !== 'string') {
	            globalObject.console.warn(key + ' used as a key, but it is not a string.');
	            key = String(key);
	        }

	        var promise = self.ready().then(function () {
	            var dbInfo = self._dbInfo;
	            var result = localStorage.getItem(dbInfo.keyPrefix + key);

	            // If a result was found, parse it from the serialized
	            // string into a JS object. If result isn't truthy, the key
	            // is likely undefined and we'll pass it straight to the
	            // callback.
	            if (result) {
	                result = dbInfo.serializer.deserialize(result);
	            }

	            return result;
	        });

	        executeCallback(promise, callback);
	        return promise;
	    }

	    // Iterate over all items in the store.
	    function iterate(iterator, callback) {
	        var self = this;

	        var promise = self.ready().then(function () {
	            var dbInfo = self._dbInfo;
	            var keyPrefix = dbInfo.keyPrefix;
	            var keyPrefixLength = keyPrefix.length;
	            var length = localStorage.length;

	            // We use a dedicated iterator instead of the `i` variable below
	            // so other keys we fetch in localStorage aren't counted in
	            // the `iterationNumber` argument passed to the `iterate()`
	            // callback.
	            //
	            // See: github.com/mozilla/localForage/pull/435#discussion_r38061530
	            var iterationNumber = 1;

	            for (var i = 0; i < length; i++) {
	                var key = localStorage.key(i);
	                if (key.indexOf(keyPrefix) !== 0) {
	                    continue;
	                }
	                var value = localStorage.getItem(key);

	                // If a result was found, parse it from the serialized
	                // string into a JS object. If result isn't truthy, the
	                // key is likely undefined and we'll pass it straight
	                // to the iterator.
	                if (value) {
	                    value = dbInfo.serializer.deserialize(value);
	                }

	                value = iterator(value, key.substring(keyPrefixLength), iterationNumber++);

	                if (value !== void 0) {
	                    return value;
	                }
	            }
	        });

	        executeCallback(promise, callback);
	        return promise;
	    }

	    // Same as localStorage's key() method, except takes a callback.
	    function key(n, callback) {
	        var self = this;
	        var promise = self.ready().then(function () {
	            var dbInfo = self._dbInfo;
	            var result;
	            try {
	                result = localStorage.key(n);
	            } catch (error) {
	                result = null;
	            }

	            // Remove the prefix from the key, if a key is found.
	            if (result) {
	                result = result.substring(dbInfo.keyPrefix.length);
	            }

	            return result;
	        });

	        executeCallback(promise, callback);
	        return promise;
	    }

	    function keys(callback) {
	        var self = this;
	        var promise = self.ready().then(function () {
	            var dbInfo = self._dbInfo;
	            var length = localStorage.length;
	            var keys = [];

	            for (var i = 0; i < length; i++) {
	                if (localStorage.key(i).indexOf(dbInfo.keyPrefix) === 0) {
	                    keys.push(localStorage.key(i).substring(dbInfo.keyPrefix.length));
	                }
	            }

	            return keys;
	        });

	        executeCallback(promise, callback);
	        return promise;
	    }

	    // Supply the number of keys in the datastore to the callback function.
	    function length(callback) {
	        var self = this;
	        var promise = self.keys().then(function (keys) {
	            return keys.length;
	        });

	        executeCallback(promise, callback);
	        return promise;
	    }

	    // Remove an item from the store, nice and simple.
	    function removeItem(key, callback) {
	        var self = this;

	        // Cast the key to a string, as that's all we can set as a key.
	        if (typeof key !== 'string') {
	            globalObject.console.warn(key + ' used as a key, but it is not a string.');
	            key = String(key);
	        }

	        var promise = self.ready().then(function () {
	            var dbInfo = self._dbInfo;
	            localStorage.removeItem(dbInfo.keyPrefix + key);
	        });

	        executeCallback(promise, callback);
	        return promise;
	    }

	    // Set a key's value and run an optional callback once the value is set.
	    // Unlike Gaia's implementation, the callback function is passed the value,
	    // in case you want to operate on that value only after you're sure it
	    // saved, or something like that.
	    function setItem(key, value, callback) {
	        var self = this;

	        // Cast the key to a string, as that's all we can set as a key.
	        if (typeof key !== 'string') {
	            globalObject.console.warn(key + ' used as a key, but it is not a string.');
	            key = String(key);
	        }

	        var promise = self.ready().then(function () {
	            // Convert undefined values to null.
	            // https://github.com/mozilla/localForage/pull/42
	            if (value === undefined) {
	                value = null;
	            }

	            // Save the original value to pass to the callback.
	            var originalValue = value;

	            return new Promise(function (resolve, reject) {
	                var dbInfo = self._dbInfo;
	                dbInfo.serializer.serialize(value, function (value, error) {
	                    if (error) {
	                        reject(error);
	                    } else {
	                        try {
	                            localStorage.setItem(dbInfo.keyPrefix + key, value);
	                            resolve(originalValue);
	                        } catch (e) {
	                            // localStorage capacity exceeded.
	                            // TODO: Make this a specific error/event.
	                            if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
	                                reject(e);
	                            }
	                            reject(e);
	                        }
	                    }
	                });
	            });
	        });

	        executeCallback(promise, callback);
	        return promise;
	    }

	    function executeCallback(promise, callback) {
	        if (callback) {
	            promise.then(function (result) {
	                callback(null, result);
	            }, function (error) {
	                callback(error);
	            });
	        }
	    }

	    var localStorageWrapper = {
	        _driver: 'localStorageWrapper',
	        _initStorage: _initStorage,
	        // Default API, from Gaia/localStorage.
	        iterate: iterate,
	        getItem: getItem,
	        setItem: setItem,
	        removeItem: removeItem,
	        clear: clear,
	        length: length,
	        key: key,
	        keys: keys
	    };

	    exports['default'] = localStorageWrapper;
	}).call(typeof window !== 'undefined' ? window : self);
	module.exports = exports['default'];

/***/ },
/* 3 */
/***/ function(module, exports) {

	'use strict';

	exports.__esModule = true;
	(function () {
	    'use strict';

	    // Sadly, the best way to save binary data in WebSQL/localStorage is serializing
	    // it to Base64, so this is how we store it to prevent very strange errors with less
	    // verbose ways of binary <-> string data storage.
	    var BASE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	    var BLOB_TYPE_PREFIX = '~~local_forage_type~';
	    var BLOB_TYPE_PREFIX_REGEX = /^~~local_forage_type~([^~]+)~/;

	    var SERIALIZED_MARKER = '__lfsc__:';
	    var SERIALIZED_MARKER_LENGTH = SERIALIZED_MARKER.length;

	    // OMG the serializations!
	    var TYPE_ARRAYBUFFER = 'arbf';
	    var TYPE_BLOB = 'blob';
	    var TYPE_INT8ARRAY = 'si08';
	    var TYPE_UINT8ARRAY = 'ui08';
	    var TYPE_UINT8CLAMPEDARRAY = 'uic8';
	    var TYPE_INT16ARRAY = 'si16';
	    var TYPE_INT32ARRAY = 'si32';
	    var TYPE_UINT16ARRAY = 'ur16';
	    var TYPE_UINT32ARRAY = 'ui32';
	    var TYPE_FLOAT32ARRAY = 'fl32';
	    var TYPE_FLOAT64ARRAY = 'fl64';
	    var TYPE_SERIALIZED_MARKER_LENGTH = SERIALIZED_MARKER_LENGTH + TYPE_ARRAYBUFFER.length;

	    // Get out of our habit of using `window` inline, at least.
	    var globalObject = this;

	    // Abstracts constructing a Blob object, so it also works in older
	    // browsers that don't support the native Blob constructor. (i.e.
	    // old QtWebKit versions, at least).
	    function _createBlob(parts, properties) {
	        parts = parts || [];
	        properties = properties || {};

	        try {
	            return new Blob(parts, properties);
	        } catch (err) {
	            if (err.name !== 'TypeError') {
	                throw err;
	            }

	            var BlobBuilder = globalObject.BlobBuilder || globalObject.MSBlobBuilder || globalObject.MozBlobBuilder || globalObject.WebKitBlobBuilder;

	            var builder = new BlobBuilder();
	            for (var i = 0; i < parts.length; i += 1) {
	                builder.append(parts[i]);
	            }

	            return builder.getBlob(properties.type);
	        }
	    }

	    // Serialize a value, afterwards executing a callback (which usually
	    // instructs the `setItem()` callback/promise to be executed). This is how
	    // we store binary data with localStorage.
	    function serialize(value, callback) {
	        var valueString = '';
	        if (value) {
	            valueString = value.toString();
	        }

	        // Cannot use `value instanceof ArrayBuffer` or such here, as these
	        // checks fail when running the tests using casper.js...
	        //
	        // TODO: See why those tests fail and use a better solution.
	        if (value && (value.toString() === '[object ArrayBuffer]' || value.buffer && value.buffer.toString() === '[object ArrayBuffer]')) {
	            // Convert binary arrays to a string and prefix the string with
	            // a special marker.
	            var buffer;
	            var marker = SERIALIZED_MARKER;

	            if (value instanceof ArrayBuffer) {
	                buffer = value;
	                marker += TYPE_ARRAYBUFFER;
	            } else {
	                buffer = value.buffer;

	                if (valueString === '[object Int8Array]') {
	                    marker += TYPE_INT8ARRAY;
	                } else if (valueString === '[object Uint8Array]') {
	                    marker += TYPE_UINT8ARRAY;
	                } else if (valueString === '[object Uint8ClampedArray]') {
	                    marker += TYPE_UINT8CLAMPEDARRAY;
	                } else if (valueString === '[object Int16Array]') {
	                    marker += TYPE_INT16ARRAY;
	                } else if (valueString === '[object Uint16Array]') {
	                    marker += TYPE_UINT16ARRAY;
	                } else if (valueString === '[object Int32Array]') {
	                    marker += TYPE_INT32ARRAY;
	                } else if (valueString === '[object Uint32Array]') {
	                    marker += TYPE_UINT32ARRAY;
	                } else if (valueString === '[object Float32Array]') {
	                    marker += TYPE_FLOAT32ARRAY;
	                } else if (valueString === '[object Float64Array]') {
	                    marker += TYPE_FLOAT64ARRAY;
	                } else {
	                    callback(new Error('Failed to get type for BinaryArray'));
	                }
	            }

	            callback(marker + bufferToString(buffer));
	        } else if (valueString === '[object Blob]') {
	            // Conver the blob to a binaryArray and then to a string.
	            var fileReader = new FileReader();

	            fileReader.onload = function () {
	                // Backwards-compatible prefix for the blob type.
	                var str = BLOB_TYPE_PREFIX + value.type + '~' + bufferToString(this.result);

	                callback(SERIALIZED_MARKER + TYPE_BLOB + str);
	            };

	            fileReader.readAsArrayBuffer(value);
	        } else {
	            try {
	                callback(JSON.stringify(value));
	            } catch (e) {
	                console.error("Couldn't convert value into a JSON string: ", value);

	                callback(null, e);
	            }
	        }
	    }

	    // Deserialize data we've inserted into a value column/field. We place
	    // special markers into our strings to mark them as encoded; this isn't
	    // as nice as a meta field, but it's the only sane thing we can do whilst
	    // keeping localStorage support intact.
	    //
	    // Oftentimes this will just deserialize JSON content, but if we have a
	    // special marker (SERIALIZED_MARKER, defined above), we will extract
	    // some kind of arraybuffer/binary data/typed array out of the string.
	    function deserialize(value) {
	        // If we haven't marked this string as being specially serialized (i.e.
	        // something other than serialized JSON), we can just return it and be
	        // done with it.
	        if (value.substring(0, SERIALIZED_MARKER_LENGTH) !== SERIALIZED_MARKER) {
	            return JSON.parse(value);
	        }

	        // The following code deals with deserializing some kind of Blob or
	        // TypedArray. First we separate out the type of data we're dealing
	        // with from the data itself.
	        var serializedString = value.substring(TYPE_SERIALIZED_MARKER_LENGTH);
	        var type = value.substring(SERIALIZED_MARKER_LENGTH, TYPE_SERIALIZED_MARKER_LENGTH);

	        var blobType;
	        // Backwards-compatible blob type serialization strategy.
	        // DBs created with older versions of localForage will simply not have the blob type.
	        if (type === TYPE_BLOB && BLOB_TYPE_PREFIX_REGEX.test(serializedString)) {
	            var matcher = serializedString.match(BLOB_TYPE_PREFIX_REGEX);
	            blobType = matcher[1];
	            serializedString = serializedString.substring(matcher[0].length);
	        }
	        var buffer = stringToBuffer(serializedString);

	        // Return the right type based on the code/type set during
	        // serialization.
	        switch (type) {
	            case TYPE_ARRAYBUFFER:
	                return buffer;
	            case TYPE_BLOB:
	                return _createBlob([buffer], { type: blobType });
	            case TYPE_INT8ARRAY:
	                return new Int8Array(buffer);
	            case TYPE_UINT8ARRAY:
	                return new Uint8Array(buffer);
	            case TYPE_UINT8CLAMPEDARRAY:
	                return new Uint8ClampedArray(buffer);
	            case TYPE_INT16ARRAY:
	                return new Int16Array(buffer);
	            case TYPE_UINT16ARRAY:
	                return new Uint16Array(buffer);
	            case TYPE_INT32ARRAY:
	                return new Int32Array(buffer);
	            case TYPE_UINT32ARRAY:
	                return new Uint32Array(buffer);
	            case TYPE_FLOAT32ARRAY:
	                return new Float32Array(buffer);
	            case TYPE_FLOAT64ARRAY:
	                return new Float64Array(buffer);
	            default:
	                throw new Error('Unkown type: ' + type);
	        }
	    }

	    function stringToBuffer(serializedString) {
	        // Fill the string into a ArrayBuffer.
	        var bufferLength = serializedString.length * 0.75;
	        var len = serializedString.length;
	        var i;
	        var p = 0;
	        var encoded1, encoded2, encoded3, encoded4;

	        if (serializedString[serializedString.length - 1] === '=') {
	            bufferLength--;
	            if (serializedString[serializedString.length - 2] === '=') {
	                bufferLength--;
	            }
	        }

	        var buffer = new ArrayBuffer(bufferLength);
	        var bytes = new Uint8Array(buffer);

	        for (i = 0; i < len; i += 4) {
	            encoded1 = BASE_CHARS.indexOf(serializedString[i]);
	            encoded2 = BASE_CHARS.indexOf(serializedString[i + 1]);
	            encoded3 = BASE_CHARS.indexOf(serializedString[i + 2]);
	            encoded4 = BASE_CHARS.indexOf(serializedString[i + 3]);

	            /*jslint bitwise: true */
	            bytes[p++] = encoded1 << 2 | encoded2 >> 4;
	            bytes[p++] = (encoded2 & 15) << 4 | encoded3 >> 2;
	            bytes[p++] = (encoded3 & 3) << 6 | encoded4 & 63;
	        }
	        return buffer;
	    }

	    // Converts a buffer to a string to store, serialized, in the backend
	    // storage library.
	    function bufferToString(buffer) {
	        // base64-arraybuffer
	        var bytes = new Uint8Array(buffer);
	        var base64String = '';
	        var i;

	        for (i = 0; i < bytes.length; i += 3) {
	            /*jslint bitwise: true */
	            base64String += BASE_CHARS[bytes[i] >> 2];
	            base64String += BASE_CHARS[(bytes[i] & 3) << 4 | bytes[i + 1] >> 4];
	            base64String += BASE_CHARS[(bytes[i + 1] & 15) << 2 | bytes[i + 2] >> 6];
	            base64String += BASE_CHARS[bytes[i + 2] & 63];
	        }

	        if (bytes.length % 3 === 2) {
	            base64String = base64String.substring(0, base64String.length - 1) + '=';
	        } else if (bytes.length % 3 === 1) {
	            base64String = base64String.substring(0, base64String.length - 2) + '==';
	        }

	        return base64String;
	    }

	    var localforageSerializer = {
	        serialize: serialize,
	        deserialize: deserialize,
	        stringToBuffer: stringToBuffer,
	        bufferToString: bufferToString
	    };

	    exports['default'] = localforageSerializer;
	}).call(typeof window !== 'undefined' ? window : self);
	module.exports = exports['default'];

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	/*
	 * Includes code from:
	 *
	 * base64-arraybuffer
	 * https://github.com/niklasvh/base64-arraybuffer
	 *
	 * Copyright (c) 2012 Niklas von Hertzen
	 * Licensed under the MIT license.
	 */
	'use strict';

	exports.__esModule = true;
	(function () {
	    'use strict';

	    var globalObject = this;
	    var openDatabase = this.openDatabase;

	    // If WebSQL methods aren't available, we can stop now.
	    if (!openDatabase) {
	        return;
	    }

	    // Open the WebSQL database (automatically creates one if one didn't
	    // previously exist), using any options set in the config.
	    function _initStorage(options) {
	        var self = this;
	        var dbInfo = {
	            db: null
	        };

	        if (options) {
	            for (var i in options) {
	                dbInfo[i] = typeof options[i] !== 'string' ? options[i].toString() : options[i];
	            }
	        }

	        var dbInfoPromise = new Promise(function (resolve, reject) {
	            // Open the database; the openDatabase API will automatically
	            // create it for us if it doesn't exist.
	            try {
	                dbInfo.db = openDatabase(dbInfo.name, String(dbInfo.version), dbInfo.description, dbInfo.size);
	            } catch (e) {
	                return self.setDriver(self.LOCALSTORAGE).then(function () {
	                    return self._initStorage(options);
	                }).then(resolve)['catch'](reject);
	            }

	            // Create our key/value table if it doesn't exist.
	            dbInfo.db.transaction(function (t) {
	                t.executeSql('CREATE TABLE IF NOT EXISTS ' + dbInfo.storeName + ' (id INTEGER PRIMARY KEY, key unique, value)', [], function () {
	                    self._dbInfo = dbInfo;
	                    resolve();
	                }, function (t, error) {
	                    reject(error);
	                });
	            });
	        });

	        return new Promise(function (resolve, reject) {
	            resolve(__webpack_require__(3));
	        }).then(function (lib) {
	            dbInfo.serializer = lib;
	            return dbInfoPromise;
	        });
	    }

	    function getItem(key, callback) {
	        var self = this;

	        // Cast the key to a string, as that's all we can set as a key.
	        if (typeof key !== 'string') {
	            globalObject.console.warn(key + ' used as a key, but it is not a string.');
	            key = String(key);
	        }

	        var promise = new Promise(function (resolve, reject) {
	            self.ready().then(function () {
	                var dbInfo = self._dbInfo;
	                dbInfo.db.transaction(function (t) {
	                    t.executeSql('SELECT * FROM ' + dbInfo.storeName + ' WHERE key = ? LIMIT 1', [key], function (t, results) {
	                        var result = results.rows.length ? results.rows.item(0).value : null;

	                        // Check to see if this is serialized content we need to
	                        // unpack.
	                        if (result) {
	                            result = dbInfo.serializer.deserialize(result);
	                        }

	                        resolve(result);
	                    }, function (t, error) {

	                        reject(error);
	                    });
	                });
	            })['catch'](reject);
	        });

	        executeCallback(promise, callback);
	        return promise;
	    }

	    function iterate(iterator, callback) {
	        var self = this;

	        var promise = new Promise(function (resolve, reject) {
	            self.ready().then(function () {
	                var dbInfo = self._dbInfo;

	                dbInfo.db.transaction(function (t) {
	                    t.executeSql('SELECT * FROM ' + dbInfo.storeName, [], function (t, results) {
	                        var rows = results.rows;
	                        var length = rows.length;

	                        for (var i = 0; i < length; i++) {
	                            var item = rows.item(i);
	                            var result = item.value;

	                            // Check to see if this is serialized content
	                            // we need to unpack.
	                            if (result) {
	                                result = dbInfo.serializer.deserialize(result);
	                            }

	                            result = iterator(result, item.key, i + 1);

	                            // void(0) prevents problems with redefinition
	                            // of `undefined`.
	                            if (result !== void 0) {
	                                resolve(result);
	                                return;
	                            }
	                        }

	                        resolve();
	                    }, function (t, error) {
	                        reject(error);
	                    });
	                });
	            })['catch'](reject);
	        });

	        executeCallback(promise, callback);
	        return promise;
	    }

	    function setItem(key, value, callback) {
	        var self = this;

	        // Cast the key to a string, as that's all we can set as a key.
	        if (typeof key !== 'string') {
	            globalObject.console.warn(key + ' used as a key, but it is not a string.');
	            key = String(key);
	        }

	        var promise = new Promise(function (resolve, reject) {
	            self.ready().then(function () {
	                // The localStorage API doesn't return undefined values in an
	                // "expected" way, so undefined is always cast to null in all
	                // drivers. See: https://github.com/mozilla/localForage/pull/42
	                if (value === undefined) {
	                    value = null;
	                }

	                // Save the original value to pass to the callback.
	                var originalValue = value;

	                var dbInfo = self._dbInfo;
	                dbInfo.serializer.serialize(value, function (value, error) {
	                    if (error) {
	                        reject(error);
	                    } else {
	                        dbInfo.db.transaction(function (t) {
	                            t.executeSql('INSERT OR REPLACE INTO ' + dbInfo.storeName + ' (key, value) VALUES (?, ?)', [key, value], function () {
	                                resolve(originalValue);
	                            }, function (t, error) {
	                                reject(error);
	                            });
	                        }, function (sqlError) {
	                            // The transaction failed; check
	                            // to see if it's a quota error.
	                            if (sqlError.code === sqlError.QUOTA_ERR) {
	                                // We reject the callback outright for now, but
	                                // it's worth trying to re-run the transaction.
	                                // Even if the user accepts the prompt to use
	                                // more storage on Safari, this error will
	                                // be called.
	                                //
	                                // TODO: Try to re-run the transaction.
	                                reject(sqlError);
	                            }
	                        });
	                    }
	                });
	            })['catch'](reject);
	        });

	        executeCallback(promise, callback);
	        return promise;
	    }

	    function removeItem(key, callback) {
	        var self = this;

	        // Cast the key to a string, as that's all we can set as a key.
	        if (typeof key !== 'string') {
	            globalObject.console.warn(key + ' used as a key, but it is not a string.');
	            key = String(key);
	        }

	        var promise = new Promise(function (resolve, reject) {
	            self.ready().then(function () {
	                var dbInfo = self._dbInfo;
	                dbInfo.db.transaction(function (t) {
	                    t.executeSql('DELETE FROM ' + dbInfo.storeName + ' WHERE key = ?', [key], function () {
	                        resolve();
	                    }, function (t, error) {

	                        reject(error);
	                    });
	                });
	            })['catch'](reject);
	        });

	        executeCallback(promise, callback);
	        return promise;
	    }

	    // Deletes every item in the table.
	    // TODO: Find out if this resets the AUTO_INCREMENT number.
	    function clear(callback) {
	        var self = this;

	        var promise = new Promise(function (resolve, reject) {
	            self.ready().then(function () {
	                var dbInfo = self._dbInfo;
	                dbInfo.db.transaction(function (t) {
	                    t.executeSql('DELETE FROM ' + dbInfo.storeName, [], function () {
	                        resolve();
	                    }, function (t, error) {
	                        reject(error);
	                    });
	                });
	            })['catch'](reject);
	        });

	        executeCallback(promise, callback);
	        return promise;
	    }

	    // Does a simple `COUNT(key)` to get the number of items stored in
	    // localForage.
	    function length(callback) {
	        var self = this;

	        var promise = new Promise(function (resolve, reject) {
	            self.ready().then(function () {
	                var dbInfo = self._dbInfo;
	                dbInfo.db.transaction(function (t) {
	                    // Ahhh, SQL makes this one soooooo easy.
	                    t.executeSql('SELECT COUNT(key) as c FROM ' + dbInfo.storeName, [], function (t, results) {
	                        var result = results.rows.item(0).c;

	                        resolve(result);
	                    }, function (t, error) {

	                        reject(error);
	                    });
	                });
	            })['catch'](reject);
	        });

	        executeCallback(promise, callback);
	        return promise;
	    }

	    // Return the key located at key index X; essentially gets the key from a
	    // `WHERE id = ?`. This is the most efficient way I can think to implement
	    // this rarely-used (in my experience) part of the API, but it can seem
	    // inconsistent, because we do `INSERT OR REPLACE INTO` on `setItem()`, so
	    // the ID of each key will change every time it's updated. Perhaps a stored
	    // procedure for the `setItem()` SQL would solve this problem?
	    // TODO: Don't change ID on `setItem()`.
	    function key(n, callback) {
	        var self = this;

	        var promise = new Promise(function (resolve, reject) {
	            self.ready().then(function () {
	                var dbInfo = self._dbInfo;
	                dbInfo.db.transaction(function (t) {
	                    t.executeSql('SELECT key FROM ' + dbInfo.storeName + ' WHERE id = ? LIMIT 1', [n + 1], function (t, results) {
	                        var result = results.rows.length ? results.rows.item(0).key : null;
	                        resolve(result);
	                    }, function (t, error) {
	                        reject(error);
	                    });
	                });
	            })['catch'](reject);
	        });

	        executeCallback(promise, callback);
	        return promise;
	    }

	    function keys(callback) {
	        var self = this;

	        var promise = new Promise(function (resolve, reject) {
	            self.ready().then(function () {
	                var dbInfo = self._dbInfo;
	                dbInfo.db.transaction(function (t) {
	                    t.executeSql('SELECT key FROM ' + dbInfo.storeName, [], function (t, results) {
	                        var keys = [];

	                        for (var i = 0; i < results.rows.length; i++) {
	                            keys.push(results.rows.item(i).key);
	                        }

	                        resolve(keys);
	                    }, function (t, error) {

	                        reject(error);
	                    });
	                });
	            })['catch'](reject);
	        });

	        executeCallback(promise, callback);
	        return promise;
	    }

	    function executeCallback(promise, callback) {
	        if (callback) {
	            promise.then(function (result) {
	                callback(null, result);
	            }, function (error) {
	                callback(error);
	            });
	        }
	    }

	    var webSQLStorage = {
	        _driver: 'webSQLStorage',
	        _initStorage: _initStorage,
	        iterate: iterate,
	        getItem: getItem,
	        setItem: setItem,
	        removeItem: removeItem,
	        clear: clear,
	        length: length,
	        key: key,
	        keys: keys
	    };

	    exports['default'] = webSQLStorage;
	}).call(typeof window !== 'undefined' ? window : self);
	module.exports = exports['default'];

/***/ }
/******/ ])
});
;
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"_process":9}],11:[function(require,module,exports){
/*
 * notie.js - A clean and simple notification plugin (alert/growl style) for javascript, with no dependencies.
 *
 * Copyright (c) 2015 Jared Reich
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * Project home:
 * https://jaredreich.com/projects/notie.js
 *
 * Version:  2.1.0
 *
*/

var notie = function(){

    // SETTINGS
    // *********************************************

    // General
    var shadow = false;
    var font_size_small = '18px';
    var font_size_big = '18px';
    var font_change_screen_width = 600;
    var animation_delay = 0.3;
    var background_click_dismiss = true;

    // notie.alert colors
    var alert_color_success_background = '#57BF57';
    var alert_color_warning_background = '#E3B771';
    var alert_color_error_background = '#F44336';
    var alert_color_info_background = '#4D82D6';
    var alert_color_text = '#FFF';

    // notie.confirm colors
    var confirm_and_input_color_background = '#4D82D6';
    var confirm_and_input_color_yes_background = '#57BF57';
    var confirm_and_input_color_no_background = '#E1715B';
    var confirm_and_input_color_text = '#FFF';
    var confirm_and_input_color_yes_text = '#FFF';
    var confirm_and_input_color_no_text = '#FFF';

    // ID's for use within your own .css file (OPTIONAL)
    // (Be sure to use !important to override the javascript)
    // Example: #notie-alert-inner { padding: 30px !important; }
    var alert_outer_id = 'notie-alert-outer';
    var alert_inner_id = 'notie-alert-inner';
    var alert_text_id = 'notie-alert-text';
    var confirm_outer_id = 'notie-confirm-outer';
    var confirm_inner_id = 'notie-confirm-inner';
    var confirm_background_id = 'notie-confirm-background';
    var confirm_yes_id = 'notie-confirm-yes';
    var confirm_no_id = 'notie-confirm-no';
    var confirm_text_id = 'notie-confirm-text';
    var confirm_yes_text_id = 'notie-confirm-yes-text';
    var confirm_no_text_id = 'notie-confirm-no-text';
    var input_outer_id = 'notie-input-outer';
    var input_inner_id = 'notie-input-inner';
    var input_background_id = 'notie-input-background';
    var input_div_id = 'notie-input-div';
    var input_field_id = 'notie-input-field';
    var input_yes_id = 'notie-input-yes';
    var input_no_id = 'notie-input-no';
    var input_text_id = 'notie-input-text';
    var input_yes_text_id = 'notie-input-yes-text';
    var input_no_text_id = 'notie-input-no-text';

    // *********************************************





    // HELPERS
    // *********************************************

    // Function for resize listeners for font-size
    var resizeListener = function resizeListener(ele) {
        if (window.innerWidth <= font_change_screen_width) { ele.style.fontSize = font_size_small; }
        else { ele.style.fontSize = font_size_big; }
    };


    // Debounce function (credit to Underscore.js)
    var debounce_time = 500;
    var debounce = function debounce(func, wait, immediate) {
        var timeout;
        return function() {
            var context = this, args = arguments;
            var later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    }


    // Event listener for enter and escape keys
    window.addEventListener('keydown', function(event) {
        var enter_clicked = (event.which == 13 || event.keyCode == 13);
        var escape_clicked = (event.which == 27 || event.keyCode == 27);
        if (alert_is_showing) {
            if (enter_clicked || escape_clicked) {
                clearTimeout(alert_timeout_1);
                clearTimeout(alert_timeout_2);
                alert_hide();
            }
        }
        else if (confirm_is_showing) {
            if (enter_clicked) {
                confirm_yes.click();
            }
            else if (escape_clicked) {
                confirm_no.click();
            }
        }
        else if (input_is_showing) {
            if (enter_clicked) {
                input_yes.click();
            }
            else if (escape_clicked) {
                input_no.click();
            }
        }
    });


    // addEventListener polyfill, fixes a style.height issue for IE8
    if (typeof Element.prototype.addEventListener === 'undefined') {
        Element.prototype.addEventListener = Window.prototype.addEventListener = function (e, callback) {
            e = 'on' + e;
            return this.attachEvent(e, callback);
        };
    }


    // Scroll disable and enable for notie.confirm and notie.input
    var original_body_height, original_body_overflow;
    function scroll_disable() {
        original_body_height = document.body.style.height;
        original_body_overflow = document.body.style.overflow;
        document.body.style.height = '100%';
        document.body.style.overflow = 'hidden';
    }
    function scroll_enable() {
        document.body.style.height = original_body_height;
        document.body.style.overflow = original_body_overflow;
    }
    // *********************************************



    // NOTIE.ALERT
    // *********************************************

    // notie elements and styling
    var alert_outer = document.createElement('div');
    alert_outer.id = alert_outer_id;
    alert_outer.style.position = 'fixed';
    alert_outer.style.top = '0';
    alert_outer.style.left = '0';
    alert_outer.style.zIndex = '999999999';
    alert_outer.style.height = 'auto';
    alert_outer.style.width = '100%';
    alert_outer.style.display = 'none';
    alert_outer.style.textAlign = 'center';
    alert_outer.style.cursor = 'default';
    alert_outer.style.MozTransition = '';
    alert_outer.style.WebkitTransition = '';
    alert_outer.style.transition = '';
    alert_outer.style.cursor = 'pointer';

    // Hide alert on click
    alert_outer.onclick = function() {
        clearTimeout(alert_timeout_1);
        clearTimeout(alert_timeout_2);
        alert_hide();
    };

    var alert_inner = document.createElement('div');
    alert_inner.id = alert_inner_id;
    alert_inner.style.padding = '20px';
    alert_inner.style.display = 'table-cell';
    alert_inner.style.verticalAlign = 'middle';
    alert_outer.appendChild(alert_inner);

    // Initialize notie text
    var alert_text = document.createElement('span');
    alert_text.id = alert_text_id;
    alert_text.style.color = alert_color_text;
    if (window.innerWidth <= font_change_screen_width) { alert_text.style.fontSize = font_size_small; }
    else { alert_text.style.fontSize = font_size_big; }
    window.addEventListener('resize', debounce(resizeListener.bind(null, alert_text), debounce_time), true);
    alert_inner.appendChild(alert_text);

    // Attach notie to the body element
    document.body.appendChild(alert_outer);

    // Declare variables
    var height = 0;
    var alert_is_showing = false;
    var alert_timeout_1;
    var alert_timeout_2;
    var was_clicked_counter = 0;

    function alert(type, message, seconds) {

        // Blur active element for use of enter key, focus input
        document.activeElement.blur();

        was_clicked_counter++;

        setTimeout(function() {
            was_clicked_counter--;
        }, (animation_delay * 1000 + 10));

        if (was_clicked_counter == 1) {

            if (alert_is_showing) {

                clearTimeout(alert_timeout_1);
                clearTimeout(alert_timeout_2);

                alert_hide(function() {
                    alert_show(type, message, seconds);
                });

            }
            else {
                alert_show(type, message, seconds);
            }

        }

    }

    function alert_show(type, message, seconds) {

        alert_is_showing = true;

        var duration = 0;
        if (typeof seconds == 'undefined') {
            var duration = 3000;
        }
        else if (seconds < 1) {
            duration = 1000;
        }
        else {
            duration = seconds * 1000;
        }

        // Set notie type (background color)
        switch(type) {
            case 1:
                alert_outer.style.backgroundColor = alert_color_success_background;
                break;
            case 2:
                alert_outer.style.backgroundColor = alert_color_warning_background;
                break;
            case 3:
                alert_outer.style.backgroundColor = alert_color_error_background;
                break;
            case 4:
                alert_outer.style.backgroundColor = alert_color_info_background;
                break;
        }

        // Set notie text
        alert_text.innerHTML = message;

        // Get notie's height
        alert_outer.style.top = '-10000px';
        alert_outer.style.display = 'table';
        alert_outer.style.top = '-' + alert_outer.offsetHeight - 5 + 'px';

        alert_timeout_1 = setTimeout(function() {

            if (shadow) { alert_outer.style.boxShadow = '0px 0px 10px 0px rgba(0,0,0,0.5)'; }
            alert_outer.style.MozTransition = 'all ' + animation_delay + 's ease';
            alert_outer.style.WebkitTransition = 'all ' + animation_delay + 's ease';
            alert_outer.style.transition = 'all ' + animation_delay + 's ease';

            alert_outer.style.top = 0;

            alert_timeout_2 = setTimeout(function() {

                alert_hide(function() {
                    // Nothing
                });

            }, duration);

        }, 20);

    }

    function alert_hide(callback) {

        alert_outer.style.top = '-' + alert_outer.offsetHeight - 5 + 'px';

        setTimeout(function() {

            if (shadow) { alert_outer.style.boxShadow = ''; }
            alert_outer.style.MozTransition = '';
            alert_outer.style.WebkitTransition = '';
            alert_outer.style.transition = '';

            alert_outer.style.top = '-10000px';

            alert_is_showing = false;

            if (callback) { callback(); }

        }, (animation_delay * 1000 + 10));

    }



    // NOTIE.CONFIRM
    // *********************************************

    // confirm elements and styling
    var confirm_outer = document.createElement('div');
    confirm_outer.id = confirm_outer_id;
    confirm_outer.style.position = 'fixed';
    confirm_outer.style.top = '0';
    confirm_outer.style.left = '0';
    confirm_outer.style.zIndex = '999999998';
    confirm_outer.style.height = 'auto';
    confirm_outer.style.width = '100%';
    confirm_outer.style.display = 'none';
    confirm_outer.style.textAlign = 'center';
    confirm_outer.style.MozTransition = '';
    confirm_outer.style.WebkitTransition = '';
    confirm_outer.style.transition = '';

    var confirm_background = document.createElement('div');
    confirm_background.id = confirm_background_id;
    confirm_background.style.position = 'fixed';
    confirm_background.style.top = '0';
    confirm_background.style.left = '0';
    confirm_background.style.zIndex = '999999997';
    confirm_background.style.height = '100%';
    confirm_background.style.width = '100%';
    confirm_background.style.display = 'none';
    confirm_background.style.backgroundColor = 'white';
    confirm_background.style.MozTransition = 'all ' + animation_delay + 's ease';
    confirm_background.style.WebkitTransition = 'all ' + animation_delay + 's ease';
    confirm_background.style.transition = 'all ' + animation_delay + 's ease';
    confirm_background.style.opacity = '0';

    // Hide notie.confirm on background click
    confirm_background.onclick = function() {
        if (background_click_dismiss) {
            confirm_hide();
        }
    };

    var confirm_inner = document.createElement('div');
    confirm_inner.id = confirm_inner_id;
    confirm_inner.style.boxSizing = 'border-box';
    confirm_inner.style.width = '100%';
    confirm_inner.style.padding = '20px';
    confirm_inner.style.display = 'block';
    confirm_inner.style.cursor = 'default';
    confirm_inner.style.backgroundColor = confirm_and_input_color_background;
    confirm_outer.appendChild(confirm_inner);

    var confirm_yes = document.createElement('div');
    confirm_yes.id = confirm_yes_id;
    confirm_yes.style.cssFloat = 'left';
    confirm_yes.style.height = '50px';
    confirm_yes.style.lineHeight = '50px';
    confirm_yes.style.width = '50%';
    confirm_yes.style.cursor = 'pointer';
    confirm_yes.style.backgroundColor = confirm_and_input_color_yes_background;
    confirm_outer.appendChild(confirm_yes);

    var confirm_no = document.createElement('div');
    confirm_no.id = confirm_no_id;
    confirm_no.style.cssFloat = 'right';
    confirm_no.style.height = '50px';
    confirm_no.style.lineHeight = '50px';
    confirm_no.style.width = '50%';
    confirm_no.style.cursor = 'pointer';
    confirm_no.style.backgroundColor = confirm_and_input_color_no_background;
    confirm_no.onclick = function() { confirm_hide(); }
    confirm_outer.appendChild(confirm_no);

    // Initialize confirm text
    var confirm_text = document.createElement('span');
    confirm_text.id = confirm_text_id;
    confirm_text.style.color = confirm_and_input_color_text;
    if (window.innerWidth <= font_change_screen_width) { confirm_text.style.fontSize = font_size_small; }
    else { confirm_text.style.fontSize = font_size_big; }
    window.addEventListener('resize', debounce(resizeListener.bind(null, confirm_text), debounce_time), true);
    confirm_inner.appendChild(confirm_text);

    var confirm_yes_text = document.createElement('span');
    confirm_yes_text.id = confirm_yes_text_id;
    confirm_yes_text.style.color = confirm_and_input_color_yes_text;
    if (window.innerWidth <= font_change_screen_width) { confirm_yes_text.style.fontSize = font_size_small; }
    else { confirm_yes_text.style.fontSize = font_size_big; }
    window.addEventListener('resize', debounce(resizeListener.bind(null, confirm_yes_text), debounce_time), true);
    confirm_yes.appendChild(confirm_yes_text);

    var confirm_no_text = document.createElement('span');
    confirm_no_text.id = confirm_no_text_id;
    confirm_no_text.style.color = confirm_and_input_color_no_text;
    if (window.innerWidth <= font_change_screen_width) { confirm_no_text.style.fontSize = font_size_small; }
    else { confirm_no_text.style.fontSize = font_size_big; }
    window.addEventListener('resize', debounce(resizeListener.bind(null, confirm_no_text), debounce_time), true);
    confirm_no.appendChild(confirm_no_text);

    // Attach confirm elements to the body element
    document.body.appendChild(confirm_outer);
    document.body.appendChild(confirm_background);

    // Declare variables
    var confirm_height = 0;
    var confirm_is_showing = false;

    function confirm(title, yes_text, no_text, yes_callback) {

        // Blur active element for use of enter key
        document.activeElement.blur();

        if (alert_is_showing) {
            // Hide notie.alert
            clearTimeout(alert_timeout_1);
            clearTimeout(alert_timeout_2);
            alert_hide(function() {
                confirm_show(title, yes_text, no_text, yes_callback);
            });
        }
        else {
            confirm_show(title, yes_text, no_text, yes_callback);
        }


    }
    function confirm_show(title, yes_text, no_text, yes_callback) {

        scroll_disable();

        // Yes callback function
        confirm_yes.onclick = function() {
            confirm_hide();
            setTimeout(function() {
                yes_callback();
            }, (animation_delay * 1000 + 10));
        }

        function confirm_show_inner() {

            // Set confirm text
            confirm_text.innerHTML = title;
            confirm_yes_text.innerHTML = yes_text;
            confirm_no_text.innerHTML = no_text;

            // Get confirm's height
            confirm_outer.style.top = '-10000px';
            confirm_outer.style.display = 'table';
            confirm_outer.style.top = '-' + confirm_outer.offsetHeight - 5 + 'px';
            confirm_background.style.display = 'block';

            setTimeout(function() {

                if (shadow) { confirm_outer.style.boxShadow = '0px 0px 10px 0px rgba(0,0,0,0.5)'; }
                confirm_outer.style.MozTransition = 'all ' + animation_delay + 's ease';
                confirm_outer.style.WebkitTransition = 'all ' + animation_delay + 's ease';
                confirm_outer.style.transition = 'all ' + animation_delay + 's ease';

                confirm_outer.style.top = 0;
                confirm_background.style.opacity = '0.75';

                setTimeout(function() {
                    confirm_is_showing = true;
                }, (animation_delay * 1000 + 10));

            }, 20);

        }

        if (confirm_is_showing) {
            confirm_hide();
            setTimeout(function() {
                confirm_show_inner();
            }, (animation_delay * 1000 + 10));
        }
        else {
            confirm_show_inner();
        }

    }

    function confirm_hide() {

        confirm_outer.style.top = '-' + confirm_outer.offsetHeight - 5 + 'px';
        confirm_background.style.opacity = '0';

        setTimeout(function() {

            if (shadow) { confirm_outer.style.boxShadow = ''; }
            confirm_outer.style.MozTransition = '';
            confirm_outer.style.WebkitTransition = '';
            confirm_outer.style.transition = '';
            confirm_background.style.display = 'none';

            confirm_outer.style.top = '-10000px';

            scroll_enable();

            confirm_is_showing = false;

        }, (animation_delay * 1000 + 10));

    }




    // NOTIE.INPUT
    // *********************************************

    // input elements and styling
    var input_outer = document.createElement('div');
    input_outer.id = input_outer_id;
    input_outer.style.position = 'fixed';
    input_outer.style.top = '0';
    input_outer.style.left = '0';
    input_outer.style.zIndex = '999999998';
    input_outer.style.height = 'auto';
    input_outer.style.width = '100%';
    input_outer.style.display = 'none';
    input_outer.style.textAlign = 'center';
    input_outer.style.MozTransition = '';
    input_outer.style.WebkitTransition = '';
    input_outer.style.transition = '';

    var input_background = document.createElement('div');
    input_background.id = input_background_id;
    input_background.style.position = 'fixed';
    input_background.style.top = '0';
    input_background.style.left = '0';
    input_background.style.zIndex = '999999997';
    input_background.style.height = '100%';
    input_background.style.width = '100%';
    input_background.style.display = 'none';
    input_background.style.backgroundColor = 'white';
    input_background.style.MozTransition = 'all ' + animation_delay + 's ease';
    input_background.style.WebkitTransition = 'all ' + animation_delay + 's ease';
    input_background.style.transition = 'all ' + animation_delay + 's ease';
    input_background.style.opacity = '0';

    // Hide notie.input on background click
    input_background.onclick = function() {
        if (background_click_dismiss) {
            input_hide();
        }
    };

    var input_inner = document.createElement('div');
    input_inner.id = input_inner_id;
    input_inner.style.boxSizing = 'border-box';
    input_inner.style.width = '100%';
    input_inner.style.padding = '20px';
    input_inner.style.display = 'block';
    input_inner.style.cursor = 'default';
    input_inner.style.backgroundColor = confirm_and_input_color_background;
    input_outer.appendChild(input_inner);

    var input_div = document.createElement('div');
    input_div.id = input_div_id;
    input_div.style.boxSizing = 'border-box';
    input_div.style.height = '55px';
    input_div.style.width = '100%';
    input_div.style.display = 'block';
    input_div.style.cursor = 'default';
    input_div.style.backgroundColor = '#FFF';
    input_outer.appendChild(input_div);

    var input_field = document.createElement('input');
    input_field.id = input_field_id;
    input_field.setAttribute('autocomplete', 'off');
    input_field.setAttribute('autocorrect', 'off');
    input_field.setAttribute('autocapitalize', 'off');
    input_field.setAttribute('spellcheck', 'false');
    input_field.style.boxSizing = 'border-box';
    input_field.style.height = '55px';
    input_field.style.width = '100%';
    input_field.style.textAlign = 'center';
    input_field.style.textIndent = '10px';
    input_field.style.paddingRight = '10px';
    input_field.style.outline = '0';
    input_field.style.border = '0';
    input_field.style.fontFamily = 'inherit';
    input_field.style.fontSize = font_size_big;
    if (window.innerWidth <= font_change_screen_width) { input_field.style.fontSize = font_size_small; }
    else { input_field.style.fontSize = font_size_big; }
    window.addEventListener('resize', debounce(resizeListener.bind(null, input_field), debounce_time), true);
    input_div.appendChild(input_field);

    var input_yes = document.createElement('div');
    input_yes.id = input_yes_id;
    input_yes.style.cssFloat = 'left';
    input_yes.style.height = '50px';
    input_yes.style.lineHeight = '50px';
    input_yes.style.width = '50%';
    input_yes.style.cursor = 'pointer';
    input_yes.style.backgroundColor = confirm_and_input_color_yes_background;
    input_outer.appendChild(input_yes);

    var input_no = document.createElement('div');
    input_no.id = input_no_id;
    input_no.style.cssFloat = 'right';
    input_no.style.height = '50px';
    input_no.style.lineHeight = '50px';
    input_no.style.width = '50%';
    input_no.style.cursor = 'pointer';
    input_no.style.backgroundColor = confirm_and_input_color_no_background;
    input_no.onclick = function() { input_hide(); }
    input_outer.appendChild(input_no);

    // Initialize input text
    var input_text = document.createElement('span');
    input_text.id = input_text_id;
    input_text.style.color = confirm_and_input_color_text;
    if (window.innerWidth <= font_change_screen_width) { input_text.style.fontSize = font_size_small; }
    else { input_text.style.fontSize = font_size_big; }
    window.addEventListener('resize', debounce(resizeListener.bind(null, input_text), debounce_time), true);
    input_inner.appendChild(input_text);

    var input_yes_text = document.createElement('span');
    input_yes_text.id = input_yes_text_id;
    input_yes_text.style.color = confirm_and_input_color_yes_text;
    if (window.innerWidth <= font_change_screen_width) { input_yes_text.style.fontSize = font_size_small; }
    else { input_yes_text.style.fontSize = font_size_big; }
    window.addEventListener('resize', debounce(resizeListener.bind(null, input_yes_text), debounce_time), true);
    input_yes.appendChild(input_yes_text);

    var input_no_text = document.createElement('span');
    input_no_text.id = input_no_text_id;
    input_no_text.style.color = confirm_and_input_color_no_text;
    if (window.innerWidth <= font_change_screen_width) { input_no_text.style.fontSize = font_size_small; }
    else { input_no_text.style.fontSize = font_size_big; }
    window.addEventListener('resize', debounce(resizeListener.bind(null, input_no_text), debounce_time), true);
    input_no.appendChild(input_no_text);

    // Attach input elements to the body element
    document.body.appendChild(input_outer);
    document.body.appendChild(input_background);

    // Declare variables
    var input_height = 0;
    var input_is_showing = false;

    function input(title, submit_text, cancel_text, type, placeholder, submit_callback, prefilled_value_optional) {

        // Blur active element for use of enter key, focus input
        document.activeElement.blur();
        setTimeout(function() { input_field.focus(); }, (animation_delay * 1000));

        input_field.setAttribute('type', type);
        input_field.setAttribute('placeholder', placeholder);
        input_field.value = '';
        if (typeof prefilled_value_optional !== 'undefined' && prefilled_value_optional.length > 0) { input_field.value = prefilled_value_optional }

        if (alert_is_showing) {
            // Hide notie.alert
            clearTimeout(alert_timeout_1);
            clearTimeout(alert_timeout_2);
            alert_hide(function() {
                input_show(title, submit_text, cancel_text, submit_callback);
            });
        }
        else {
            input_show(title, submit_text, cancel_text, submit_callback);
        }

    }
    function input_show(title, submit_text, cancel_text, submit_callback) {

        scroll_disable();

        // Yes callback function
        input_yes.onclick = function() {
            input_hide();
            setTimeout(function() {
                submit_callback(input_field.value);
            }, (animation_delay * 1000 + 10));
        }

        function input_show_inner() {

            // Set input text
            input_text.innerHTML = title;
            input_yes_text.innerHTML = submit_text;
            input_no_text.innerHTML = cancel_text;

            // Get input's height
            input_outer.style.top = '-10000px';
            input_outer.style.display = 'table';
            input_outer.style.top = '-' + input_outer.offsetHeight - 5 + 'px';
            input_background.style.display = 'block';

            setTimeout(function() {

                if (shadow) { input_outer.style.boxShadow = '0px 0px 10px 0px rgba(0,0,0,0.5)'; }
                input_outer.style.MozTransition = 'all ' + animation_delay + 's ease';
                input_outer.style.WebkitTransition = 'all ' + animation_delay + 's ease';
                input_outer.style.transition = 'all ' + animation_delay + 's ease';

                input_outer.style.top = 0;
                input_background.style.opacity = '0.75';

                setTimeout(function() {
                    input_is_showing = true;
                }, (animation_delay * 1000 + 10));

            }, 20);

        }

        if (input_is_showing) {
            input_hide();
            setTimeout(function() {
                input_show_inner();
            }, (animation_delay * 1000 + 10));
        }
        else {
            input_show_inner();
        }

    }

    function input_hide() {

        input_outer.style.top = '-' + input_outer.offsetHeight - 5 + 'px';
        input_background.style.opacity = '0';

        setTimeout(function() {

            if (shadow) { input_outer.style.boxShadow = ''; }
            input_outer.style.MozTransition = '';
            input_outer.style.WebkitTransition = '';
            input_outer.style.transition = '';
            input_background.style.display = 'none';

            input_outer.style.top = '-10000px';

            scroll_enable();

            input_is_showing = false;

        }, (animation_delay * 1000 + 10));

    }



    return {
        alert: alert,
        confirm: confirm,
        input: input
    };

}();

if (typeof module !== 'undefined' && module) {
    module.exports = notie;
}

},{}],12:[function(require,module,exports){
/*
Copyright (c) 2010,2011,2012,2013,2014 Morgan Roderick http://roderick.dk
License: MIT - http://mrgnrdrck.mit-license.org

https://github.com/mroderick/PubSubJS
*/
(function (root, factory){
	'use strict';

    if (typeof define === 'function' && define.amd){
        // AMD. Register as an anonymous module.
        define(['exports'], factory);

    } else if (typeof exports === 'object'){
        // CommonJS
        factory(exports);

    }

    // Browser globals
    var PubSub = {};
    root.PubSub = PubSub;
    factory(PubSub);
    
}(( typeof window === 'object' && window ) || this, function (PubSub){
	'use strict';

	var messages = {},
		lastUid = -1;

	function hasKeys(obj){
		var key;

		for (key in obj){
			if ( obj.hasOwnProperty(key) ){
				return true;
			}
		}
		return false;
	}

	/**
	 *	Returns a function that throws the passed exception, for use as argument for setTimeout
	 *	@param { Object } ex An Error object
	 */
	function throwException( ex ){
		return function reThrowException(){
			throw ex;
		};
	}

	function callSubscriberWithDelayedExceptions( subscriber, message, data ){
		try {
			subscriber( message, data );
		} catch( ex ){
			setTimeout( throwException( ex ), 0);
		}
	}

	function callSubscriberWithImmediateExceptions( subscriber, message, data ){
		subscriber( message, data );
	}

	function deliverMessage( originalMessage, matchedMessage, data, immediateExceptions ){
		var subscribers = messages[matchedMessage],
			callSubscriber = immediateExceptions ? callSubscriberWithImmediateExceptions : callSubscriberWithDelayedExceptions,
			s;

		if ( !messages.hasOwnProperty( matchedMessage ) ) {
			return;
		}

		for (s in subscribers){
			if ( subscribers.hasOwnProperty(s)){
				callSubscriber( subscribers[s], originalMessage, data );
			}
		}
	}

	function createDeliveryFunction( message, data, immediateExceptions ){
		return function deliverNamespaced(){
			var topic = String( message ),
				position = topic.lastIndexOf( '.' );

			// deliver the message as it is now
			deliverMessage(message, message, data, immediateExceptions);

			// trim the hierarchy and deliver message to each level
			while( position !== -1 ){
				topic = topic.substr( 0, position );
				position = topic.lastIndexOf('.');
				deliverMessage( message, topic, data, immediateExceptions );
			}
		};
	}

	function messageHasSubscribers( message ){
		var topic = String( message ),
			found = Boolean(messages.hasOwnProperty( topic ) && hasKeys(messages[topic])),
			position = topic.lastIndexOf( '.' );

		while ( !found && position !== -1 ){
			topic = topic.substr( 0, position );
			position = topic.lastIndexOf( '.' );
			found = Boolean(messages.hasOwnProperty( topic ) && hasKeys(messages[topic]));
		}

		return found;
	}

	function publish( message, data, sync, immediateExceptions ){
		var deliver = createDeliveryFunction( message, data, immediateExceptions ),
			hasSubscribers = messageHasSubscribers( message );

		if ( !hasSubscribers ){
			return false;
		}

		if ( sync === true ){
			deliver();
		} else {
			setTimeout( deliver, 0 );
		}
		return true;
	}

	/**
	 *	PubSub.publish( message[, data] ) -> Boolean
	 *	- message (String): The message to publish
	 *	- data: The data to pass to subscribers
	 *	Publishes the the message, passing the data to it's subscribers
	**/
	PubSub.publish = function( message, data ){
		return publish( message, data, false, PubSub.immediateExceptions );
	};

	/**
	 *	PubSub.publishSync( message[, data] ) -> Boolean
	 *	- message (String): The message to publish
	 *	- data: The data to pass to subscribers
	 *	Publishes the the message synchronously, passing the data to it's subscribers
	**/
	PubSub.publishSync = function( message, data ){
		return publish( message, data, true, PubSub.immediateExceptions );
	};

	/**
	 *	PubSub.subscribe( message, func ) -> String
	 *	- message (String): The message to subscribe to
	 *	- func (Function): The function to call when a new message is published
	 *	Subscribes the passed function to the passed message. Every returned token is unique and should be stored if
	 *	you need to unsubscribe
	**/
	PubSub.subscribe = function( message, func ){
		if ( typeof func !== 'function'){
			return false;
		}

		// message is not registered yet
		if ( !messages.hasOwnProperty( message ) ){
			messages[message] = {};
		}

		// forcing token as String, to allow for future expansions without breaking usage
		// and allow for easy use as key names for the 'messages' object
		var token = 'uid_' + String(++lastUid);
		messages[message][token] = func;

		// return token for unsubscribing
		return token;
	};

	/* Public: Clears all subscriptions
	 */
	PubSub.clearAllSubscriptions = function clearAllSubscriptions(){
		messages = {};
	};

	/*Public: Clear subscriptions by the topic
	*/
	PubSub.clearSubscriptions = function clearSubscriptions(topic){
		var m; 
		for (m in messages){
			if (messages.hasOwnProperty(m) && m.indexOf(topic) === 0){
				delete messages[m];
			}
		}
	};

	/* Public: removes subscriptions.
	 * When passed a token, removes a specific subscription.
	 * When passed a function, removes all subscriptions for that function
	 * When passed a topic, removes all subscriptions for that topic (hierarchy)
	 *
	 * value - A token, function or topic to unsubscribe.
	 *
	 * Examples
	 *
	 *		// Example 1 - unsubscribing with a token
	 *		var token = PubSub.subscribe('mytopic', myFunc);
	 *		PubSub.unsubscribe(token);
	 *
	 *		// Example 2 - unsubscribing with a function
	 *		PubSub.unsubscribe(myFunc);
	 *
	 *		// Example 3 - unsubscribing a topic
	 *		PubSub.unsubscribe('mytopic');
	 */
	PubSub.unsubscribe = function(value){
		var isTopic    = typeof value === 'string' && messages.hasOwnProperty(value),
			isToken    = !isTopic && typeof value === 'string',
			isFunction = typeof value === 'function',
			result = false,
			m, message, t;

		if (isTopic){
			delete messages[value];
			return;
		}

		for ( m in messages ){
			if ( messages.hasOwnProperty( m ) ){
				message = messages[m];

				if ( isToken && message[value] ){
					delete message[value];
					result = value;
					// tokens are unique, so we can just stop here
					break;
				}

				if (isFunction) {
					for ( t in message ){
						if (message.hasOwnProperty(t) && message[t] === value){
							delete message[t];
							result = true;
						}
					}
				}
			}
		}

		return result;
	};
}));

},{}]},{},[5])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhcHAvamF2YXNjcmlwdHMvYXBwLmpzIiwiYXBwL2phdmFzY3JpcHRzL2Zha2UuanMiLCJhcHAvamF2YXNjcmlwdHMvZmVhdHVyZXMvYWNjb3VudC5qcyIsImFwcC9qYXZhc2NyaXB0cy9oZWxwZXJzLmpzIiwiYXBwL2phdmFzY3JpcHRzL21haW4uanMiLCJhcHAvamF2YXNjcmlwdHMvbW9kZWwuanMiLCJhcHAvamF2YXNjcmlwdHMvbW9kZWwvcGVvcGxlLmpzIiwiYXBwL2phdmFzY3JpcHRzL3NoZWxsLmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9sb2NhbGZvcmFnZS9kaXN0L2xvY2FsZm9yYWdlLmpzIiwibm9kZV9tb2R1bGVzL25vdGllL25vdGllLmpzIiwibm9kZV9tb2R1bGVzL3B1YnN1Yi1qcy9zcmMvcHVic3ViLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUMzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDL3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzF3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxudmFyIGhlbHBlcnMgPSByZXF1aXJlKCcuL2hlbHBlcnMnKTtcbnZhciBtb2RlbCA9IHJlcXVpcmUoJy4vbW9kZWwnKTtcbnZhciBzaGVsbCA9IHJlcXVpcmUoJy4vc2hlbGwnKTtcblxudmFyIGluaXQgPSBmdW5jdGlvbigpIHtcbiAgaGVscGVycy5pbml0KCk7XG4gIG1vZGVsLmluaXQoKTtcbiAgc2hlbGwuaW5pdCgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGluaXQ6IGluaXRcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogUmV0dXJucyBmYWtlIGxpc3Qgb2YgcGVvcGxlIGZyb20gc2VydmVyXG4gKiBAcmV0dXJuIHthcnJheX1cbiAqL1xudmFyIGdldFBlb3BsZUxpc3QgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIFtcbiAgICB7XG4gICAgICBuYW1lOiAnRGFlbmVyeXMnLFxuICAgICAgX2lkOiAnaWRfMScsXG4gICAgICBhdmF0YXI6ICdodHRwczovL3MzLmFtYXpvbmF3cy5jb20vdWlmYWNlcy9mYWNlcy90d2l0dGVyL2FkZWxsZWNoYXJsZXMvMTI4LmpwZydcbiAgICB9LFxuICAgIHtcbiAgICAgIG5hbWU6ICdKb24nLFxuICAgICAgX2lkOiAnaWRfMicsXG4gICAgICBhdmF0YXI6ICdodHRwczovL3MzLmFtYXpvbmF3cy5jb20vdWlmYWNlcy9mYWNlcy90d2l0dGVyL3RlY2xhcm8vMTI4LmpwZydcbiAgICB9LFxuICAgIHtcbiAgICAgIG5hbWU6ICdTYW5zYScsXG4gICAgICBfaWQ6ICdpZF8zJyxcbiAgICAgIGF2YXRhcjogJ2h0dHBzOi8vczMuYW1hem9uYXdzLmNvbS91aWZhY2VzL2ZhY2VzL3R3aXR0ZXIvYnJ5bm4vMTI4LmpwZydcbiAgICB9LFxuICAgIHtcbiAgICAgIG5hbWU6ICdBcnlhJyxcbiAgICAgIF9pZDogJ2lkXzQnLFxuICAgICAgYXZhdGFyOiAnaHR0cHM6Ly9zMy5hbWF6b25hd3MuY29tL3VpZmFjZXMvZmFjZXMvdHdpdHRlci9udXJhaWthLzEyOC5qcGcnXG4gICAgfSxcbiAgICB7XG4gICAgICBuYW1lOiAnQ2Vyc2VpJyxcbiAgICAgIF9pZDogJ2lkXzUnLFxuICAgICAgYXZhdGFyOiAnaHR0cHM6Ly9zMy5hbWF6b25hd3MuY29tL3VpZmFjZXMvZmFjZXMvdHdpdHRlci9rZnJpZWRzb24vMTI4LmpwZydcbiAgICB9LFxuICAgIHtcbiAgICAgIG5hbWU6ICdKb2ZmcmV5JyxcbiAgICAgIF9pZDogJ2lkXzYnLFxuICAgICAgYXZhdGFyOiAnaHR0cHM6Ly9zMy5hbWF6b25hd3MuY29tL3VpZmFjZXMvZmFjZXMvdHdpdHRlci9qZmtpbmdzbGV5LzEyOC5qcGcnXG4gICAgfVxuICBdO1xufTtcblxuLyoqXG4gKiBGYWtlIFNvY2tldC5JTyBBUElcbiAqL1xudmFyIGZha2VJZFNlcmlhbCA9IDY7XG52YXIgY2FsbGJhY2tNYXAgPSB7fTtcblxudmFyIG1ha2VGYWtlSWQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuICdpZF8nICsgU3RyaW5nKGZha2VJZFNlcmlhbCs9MSk7XG59O1xuXG52YXIgbW9ja1NpbyA9IHtcbiAgb246IGZ1bmN0aW9uKG1zZ1R5cGUsIGNhbGxiYWNrKSB7XG4gICAgY2FsbGJhY2tNYXBbbXNnVHlwZV0gPSBjYWxsYmFjaztcbiAgfSxcbiAgZW1pdDogZnVuY3Rpb24obXNnVHlwZSwgZGF0YSkge1xuICAgIGlmKG1zZ1R5cGUgPT09ICdhZGR1c2VyJyAmJiBjYWxsYmFja01hcC51c2VydXBkYXRlKSB7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBjYWxsYmFja01hcC51c2VydXBkYXRlKFxuICAgICAgICAgIFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgX2lkOiBtYWtlRmFrZUlkKCksXG4gICAgICAgICAgICAgIG5hbWU6IGRhdGEubmFtZSxcbiAgICAgICAgICAgICAgYXZhdGFyOiBkYXRhLmF2YXRhclxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgKTtcbiAgICAgIH0sIDIwMDApO1xuICAgIH1cbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGdldFBlb3BsZUxpc3Q6IGdldFBlb3BsZUxpc3QsXG4gIG1vY2tTaW86IG1vY2tTaW9cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBzdGF0ZU1hcCA9IHtcbiAgYWNjb3VudDogbnVsbCxcbiAgc2lnbjogbnVsbFxufTtcblxuXG52YXIgYmluZCA9IGZ1bmN0aW9uKGV2ZW50LCBjYWxsYmFjaykge1xuICBpZihldmVudCA9PT0gJ29uU2lnbkNsaWNrJykge1xuICAgIHN0YXRlTWFwLnNpZ24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjYWxsYmFjayk7XG4gIH1cbn07XG5cbnZhciBpbml0ID0gZnVuY3Rpb24oYWNjb3VudCkge1xuICBzdGF0ZU1hcC5hY2NvdW50ID0gYWNjb3VudDtcbiAgc3RhdGVNYXAuc2lnbiA9IHN0YXRlTWFwLmFjY291bnQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnc2lnbicpWzBdO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGJpbmQ6IGJpbmQsXG4gIGluaXQ6IGluaXRcbn07XG4iLCIvKipcbiAqIFtmdW5jdGlvbiBkZXNjcmlwdGlvbl1cbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBjYWxsYmFjayBDYWxsYmFja1xuICovXG5cbnZhciBub3RpZSA9IHJlcXVpcmUoJ25vdGllJyk7XG5cbi8qKlxuICogVGhyb3dzIGEgbmV3IEVycm9yXG4gKi9cbnZhciBtYWtlRXJyb3IgPSBmdW5jdGlvbihtc2cpIHtcbiAgbm90aWUuYWxlcnQoMywgbXNnLCA0KTtcbn07XG5cbi8qKlxuICogUnVucyBjYWxsYmFjayBmdW5jdGlvbiB3aGVuIERPTSBpcyByZWFkeSAoSlF1ZXJ5IGZ1bmN0aW9uKVxuICogQHBhcmFtICB7RnVuY3Rpb259IGNhbGxiYWNrIFtkZXNjcmlwdGlvbl1cbiAqIEByZXR1cm4ge1t0eXBlXX1cbiAqL1xudmFyICRyZWFkeSA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gIGlmKGRvY3VtZW50LnJlYWR5U3RhdGUgIT09ICdsb2FkaW5nJykge1xuICAgIGNhbGxiYWNrKCk7XG4gIH0gZWxzZSB7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGNhbGxiYWNrKTtcbiAgfVxufTtcblxuXG4vKipcbiAqIFNldCB0aGUgY29uZmlnTWFwIG9mIHRoZSBtb2R1bGUgLSBJdCBnb2VzIGRlZXAgaW4gdGhlIG9iamVjdFxuICovXG52YXIgc2V0Q29uZmlnTWFwID0gZnVuY3Rpb24oaW5wdXRNYXAsIGNvbmZpZ01hcCkge1xuICB2YXIga2V5O1xuXG4gIGZvcihrZXkgaW4gaW5wdXRNYXApIHtcbiAgICBpZihjb25maWdNYXAuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgaWYoaW5wdXRNYXBba2V5XSBpbnN0YW5jZW9mIE9iamVjdCkge1xuICAgICAgICB3aW5kb3cuc2V0Q29uZmlnTWFwKGlucHV0TWFwW2tleV0sIGNvbmZpZ01hcFtrZXldKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbmZpZ01hcFtrZXldID0gaW5wdXRNYXBba2V5XTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgd2luZG93Lm1ha2VFcnJvcignV3JvbmcgaW5wdXRNYXAnLCAnUHJvcGVydHkgXCInICsga2V5ICsgJ1wiIGlzIG5vdCBhdmFpbGFibGUgaW4gY29uZmlnTWFwJyk7XG4gICAgfVxuICB9XG59O1xuXG52YXIgaW5pdCA9IGZ1bmN0aW9uKCkge1xuICBFbGVtZW50LnByb3RvdHlwZS5xcyA9IEVsZW1lbnQucHJvdG90eXBlLnF1ZXJ5U2VsZWN0b3I7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgaW5pdDogaW5pdCxcbiAgbWFrZUVycm9yOiBtYWtlRXJyb3IsXG4gICRyZWFkeTogJHJlYWR5LFxuICBzZXRDb25maWdNYXA6IHNldENvbmZpZ01hcFxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGFwcCA9IHJlcXVpcmUoJy4vYXBwJyk7XG5cbmFwcC5pbml0KCk7XG4iLCIndXNlIHN0cmljdCc7XG52YXIgcGVvcGxlID0gcmVxdWlyZSgnLi9tb2RlbC9wZW9wbGUnKTtcblxuLyoqXG4gKiBQVUJMSUMgRlVOQ1RJT05TXG4gKi9cblxudmFyIGluaXQgPSBmdW5jdGlvbigpIHtcbiAgcGVvcGxlLmluaXQoKTtcbiAgd2luZG93LnBlb3BsZSA9IHBlb3BsZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBpbml0OiBpbml0LFxuICBwZW9wbGU6IHBlb3BsZVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGZha2UgPSByZXF1aXJlKCcuLi9mYWtlJyk7IC8vRmFrZSBkYXRhXG52YXIgbG9jYWxmb3JhZ2UgPSByZXF1aXJlKCdsb2NhbGZvcmFnZScpO1xudmFyIHB1YlN1YiA9IHJlcXVpcmUoJ3B1YnN1Yi1qcycpO1xuXG52YXIgY29uZmlnTWFwID0ge1xuICBhbm9uSWQ6ICdhMCcsIC8vU3BlY2lhbCBJRCBwZXIgYW5vbnltb3VzIHBlcnNvblxuICBkZWZhdWx0QXZhdGFyOiAnaHR0cHM6Ly9zMy5hbWF6b25hd3MuY29tL3VpZmFjZXMvZmFjZXMvdHdpdHRlci9hZGVsbGVjaGFybGVzLzEyOC5qcGcnXG59O1xudmFyIHN0YXRlTWFwID0ge1xuICBhbm9uVXNlcjogbnVsbCxcbiAgY2lkU2VyaWFsOiAwLFxuICBwZW9wbGVDaWRNYXA6IHt9LFxuICBwZW9wbGVEYjogbG9jYWxmb3JhZ2UuY3JlYXRlSW5zdGFuY2Uoe1xuICAgIG5hbWU6ICdwZW9wbGUnXG4gIH0pLFxuICBjdXJyZW50VXNlcjogbnVsbFxufTtcbnZhciBpc0Zha2VEYXRhID0gdHJ1ZTtcblxuLyoqXG4gKiBQUklWQVRFIEZVTkNUSU9OU1xuICovXG5cbiAvKipcbiAgKiBQcm90b3R5cGUgZm9yIGEgJ3BlcnNvbicgb2JqZWN0XG4gICovXG52YXIgcGVyc29uUHJvdG8gPSB7XG4gIGdldElzVXNlcjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuY2lkID09PSBzdGF0ZU1hcC5jdXJyZW50VXNlci5jaWQ7XG4gIH0sXG4gIGdldElzQW5vbjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuY2lkID09PSBzdGF0ZU1hcC5hbm9uVXNlci5jaWQ7XG4gIH1cbn07XG5cbi8qKlxuICogQ3JlYXRlcyB0aGUgJ3BlcnNvbicgb2JqZWN0IGFuZCBzdG9yZXMgaXQgaW4gdGhlIGRiXG4gKiBAcGFyYW0gIHtvYmplY3R9IHBlcnNvbk1hcCBUaGUgcGVyc29uIG1ha2VQZXJzb25cbiAqIEByZXR1cm4ge29iamVjdH0gcGVyc29uIFRoZSBjcmVhdGVkIHBlcnNvblxuICovXG52YXIgbWFrZVBlcnNvbiA9IGZ1bmN0aW9uKHBlcnNvbk1hcCkge1xuICB2YXIgZGIgPSBzdGF0ZU1hcC5wZW9wbGVEYjtcbiAgdmFyIGNpZCA9IHBlcnNvbk1hcC5jaWQ7XG4gIHZhciBpZCA9IHBlcnNvbk1hcC5pZDtcbiAgdmFyIG5hbWUgPSBwZXJzb25NYXAubmFtZTtcbiAgdmFyIGF2YXRhciA9IHBlcnNvbk1hcC5hdmF0YXI7XG5cbiAgaWYoY2lkID09PSB1bmRlZmluZWQgfHwgIW5hbWUpIHtcbiAgICB0aHJvdyAnQ2xpZW50IGlkIGFuZCBuYW1lIGFyZSByZXF1aXJlZCc7XG4gIH1cblxuICB2YXIgcGVyc29uID0gT2JqZWN0LmNyZWF0ZShwZXJzb25Qcm90byk7XG4gIHBlcnNvbi5jaWQgPSBjaWQ7XG4gIHBlcnNvbi5uYW1lID0gbmFtZTtcbiAgcGVyc29uLmF2YXRhciA9IGF2YXRhcjtcblxuICBpZihpZCkge1xuICAgIHBlcnNvbi5pZCA9IGlkO1xuICB9XG5cbiAgc3RhdGVNYXAucGVvcGxlQ2lkTWFwW2NpZF0gPSBwZXJzb247XG5cbiAgZGIuc2V0SXRlbShjaWQsIHBlcnNvbiwgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICBpZihlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gcGVyc29uO1xufTtcblxudmFyIG1ha2VDaWQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuICdjJyArIFN0cmluZyhzdGF0ZU1hcC5jaWRTZXJpYWwrKyk7XG59O1xuXG4vKipcbiAqIFVwZGF0ZXMgdGhlIGN1cnJlbnQgdXNlciBpbmZvcm1hdGlvbiBhbmQgcHVibGlzaGVzIGFuICdsb2dpbicgZXZlbnQgd2hlblxuICogYmFja2VuZCBzZW5kcyBjb25maXJtYXRpb24gYW5kIGRhdGEgZm9yIHRoZSB1c2VyIGxvZ2luXG4gKiBAcGFyYW0gIHtvYmplY3R9IHVzZXIgVXNlciBkYXRhIHJldHVybmVkIGZyb20gdGhlIGJhY2tlbmRcbiAqL1xudmFyIGNvbXBsZXRlTG9naW4gPSBmdW5jdGlvbih1c2VyTGlzdCkge1xuICB2YXIgdXNlciA9IHVzZXJMaXN0WzBdO1xuICBzdGF0ZU1hcC5jdXJyZW50VXNlci5pZCA9IHVzZXIuX2lkO1xuICBzdGF0ZU1hcC5jdXJyZW50VXNlci5uYW1lID0gdXNlci5uYW1lO1xuICBzdGF0ZU1hcC5jdXJyZW50VXNlci5hdmF0YXIgPSB1c2VyLmF2YXRhcjtcblxuICBzdGF0ZU1hcC5wZW9wbGVDaWRNYXBbdXNlci5faWRdID0gdXNlcjtcblxuICBwdWJTdWIucHVibGlzaCgnbG9naW4nLCBzdGF0ZU1hcC5jdXJyZW50VXNlcik7XG59O1xuXG52YXIgcmVtb3ZlUGVyc29uID0gZnVuY3Rpb24ocGVyc29uKSB7XG4gIGlmKCAhcGVyc29uIHx8IChwZXJzb24uaWQgPT09IGNvbmZpZ01hcC5hbm9uSWQpICkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHN0YXRlTWFwLnBlb3BsZURiLnJlbW92ZUl0ZW0ocGVyc29uLmNpZCwgZnVuY3Rpb24oZXJyKSB7XG4gICAgaWYoZXJyKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgfVxuICB9KTtcblxuICBpZihwZXJzb24uY2lkKSB7XG4gICAgZGVsZXRlIHN0YXRlTWFwLnBlb3BsZUNpZE1hcFtwZXJzb24uY2lkXTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBQVUJMSUMgRlVOQ1RJT05TXG4gKi9cblxudmFyIGdldEJ5Q2lkID0gZnVuY3Rpb24oY2lkKSB7XG4gIHJldHVybiBzdGF0ZU1hcC5wZW9wbGVDaWRNYXBbY2lkXTtcbn07XG5cbnZhciBnZXRDdXJyZW50VXNlciA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gc3RhdGVNYXAuY3VycmVudFVzZXI7XG59O1xuXG52YXIgZ2V0RGIgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHN0YXRlTWFwLnBlb3BsZURiO1xufTtcblxudmFyIGluaXQgPSBmdW5jdGlvbigpIHtcbiAgc3RhdGVNYXAuYW5vblVzZXIgPSBtYWtlUGVyc29uKHtcbiAgICBjaWQ6IGNvbmZpZ01hcC5hbm9uSWQsXG4gICAgaWQ6IGNvbmZpZ01hcC5hbm9uSWQsXG4gICAgbmFtZTogJ0Fub255bW91cycsXG4gICAgYXZhdGFyOiBjb25maWdNYXAuZGVmYXVsdEF2YXRhclxuICB9KTtcbiAgc3RhdGVNYXAuY3VycmVudFVzZXIgPSBzdGF0ZU1hcC5hbm9uVXNlcjtcblxuICBpZihpc0Zha2VEYXRhKSB7XG4gICAgdmFyIHBlb3BsZUxpc3QgPSBmYWtlLmdldFBlb3BsZUxpc3QoKTtcbiAgICB2YXIgaSA9IDA7XG4gICAgdmFyIHBlcnNvbk1hcCA9IHt9O1xuXG4gICAgZm9yKGkgPSAwOyBpIDwgcGVvcGxlTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgcGVyc29uTWFwID0gcGVvcGxlTGlzdFtpXTtcbiAgICAgIG1ha2VQZXJzb24oe1xuICAgICAgICBjaWQ6IHBlcnNvbk1hcC5faWQsXG4gICAgICAgIGlkOiBwZXJzb25NYXAuX2lkLFxuICAgICAgICBuYW1lOiBwZXJzb25NYXAubmFtZSxcbiAgICAgICAgYXZhdGFyOiBwZXJzb25NYXAuYXZhdGFyXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn07XG5cbnZhciBsb2dpbiA9IGZ1bmN0aW9uKHVzZXJOYW1lKSB7XG4gIHZhciBzaW8gPSBpc0Zha2VEYXRhPyBmYWtlLm1vY2tTaW8gOiBjb25zb2xlLmVycm9yKCdObyBTaW8nKTtcblxuICBzdGF0ZU1hcC5jdXJyZW50VXNlciA9IG1ha2VQZXJzb24oe1xuICAgIGNpZDogbWFrZUNpZCgpLFxuICAgIG5hbWU6IHVzZXJOYW1lLFxuICAgIGF2YXRhcjogY29uZmlnTWFwLmRlZmF1bHRBdmF0YXJcbiAgfSk7XG5cbiAgc2lvLm9uKCd1c2VydXBkYXRlJywgY29tcGxldGVMb2dpbik7XG5cbiAgc2lvLmVtaXQoJ2FkZHVzZXInLCB7XG4gICAgY2lkOiBzdGF0ZU1hcC5jdXJyZW50VXNlci5jaWQsXG4gICAgbmFtZTogc3RhdGVNYXAuY3VycmVudFVzZXIubmFtZSxcbiAgICBhdmF0YXI6IHN0YXRlTWFwLmN1cnJlbnRVc2VyLmF2YXRhclxuICB9KTtcbn07XG5cbnZhciBsb2dvdXQgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGlzUmVtb3ZlZCA9IGZhbHNlO1xuICB2YXIgdXNlciA9IHN0YXRlTWFwLmN1cnJlbnRVc2VyO1xuXG4gIGlzUmVtb3ZlZCA9IHJlbW92ZVBlcnNvbih1c2VyKTtcbiAgc3RhdGVNYXAuY3VycmVudFVzZXIgPSBzdGF0ZU1hcC5hbm9uVXNlcjtcblxuICBwdWJTdWIucHVibGlzaCgnbG9nb3V0JywgdXNlcik7XG5cbiAgcmV0dXJuIGlzUmVtb3ZlZDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBpbml0OiBpbml0LFxuICBnZXRCeUNpZDogZ2V0QnlDaWQsXG4gIGdldEN1cnJlbnRVc2VyOiBnZXRDdXJyZW50VXNlcixcbiAgZ2V0RGI6IGdldERiLFxuICBsb2dpbjogbG9naW4sXG4gIGxvZ291dDogbG9nb3V0XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaGVscGVycyA9IHJlcXVpcmUoJy4vaGVscGVycycpO1xudmFyIG1vZGVsID0gcmVxdWlyZSgnLi9tb2RlbCcpO1xuLy8gdmFyIHBhZ2UgPSByZXF1aXJlKCdwYWdlJyk7XG52YXIgcHViU3ViID0gcmVxdWlyZSgncHVic3ViLWpzJyk7XG5cbi8qIEZlYXR1cmVzICovXG52YXIgYWNjb3VudCA9IHJlcXVpcmUoJy4vZmVhdHVyZXMvYWNjb3VudCcpO1xuXG52YXIgY29uZmlnTWFwID0ge1xuXG59O1xudmFyIHN0YXRlTWFwID0ge1xuICBhY2NvdW50OiBudWxsXG59O1xudmFyIGlzVGVzdGluZyA9IGZhbHNlO1xuXG52YXIgdGVzdGluZyA9IGZ1bmN0aW9uKCkge1xuICBwdWJTdWIuc3Vic2NyaWJlKCdsb2dpbicsIGZ1bmN0aW9uKG1zZywgZGF0YSkge1xuICAgIGNvbnNvbGUubG9nKG1zZyArICc6ICcpO1xuICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICB9KTtcbiAgcHViU3ViLnN1YnNjcmliZSgnbG9nb3V0JywgZnVuY3Rpb24obXNnLCBkYXRhKSB7XG4gICAgY29uc29sZS5sb2cobXNnICsgJzogJyk7XG4gICAgY29uc29sZS5sb2coZGF0YSk7XG4gIH0pO1xufTtcblxuLyoqXG4gKiBGRUFUVVJFUyBFVkVOVCBIQU5ETEVSU1xuICovXG5cbnZhciBvblNpZ25DbGljayA9IGZ1bmN0aW9uKCkge1xuICB2YXIgdXNlck5hbWU7XG4gIHZhciBjdXJyZW50VXNlciA9IG1vZGVsLnBlb3BsZS5nZXRDdXJyZW50VXNlcigpO1xuXG4gIGlmKGN1cnJlbnRVc2VyLmdldElzQW5vbigpKSB7XG4gICAgdXNlck5hbWUgPSBwcm9tcHQoJ1BsZWFzZSBzaWduLWluJyk7XG4gICAgbW9kZWwucGVvcGxlLmxvZ2luKHVzZXJOYW1lKTtcbiAgICB0aGlzLnRleHRDb250ZW50ID0gJy4uLiBQcm9jZXNzaW5nIC4uLic7XG4gIH0gZWxzZSB7XG4gICAgbW9kZWwucGVvcGxlLmxvZ291dCgpO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxudmFyIG9uQWNjb3VudExvZ2luID0gZnVuY3Rpb24obXNnLCBjdXJyZW50VXNlcikge1xuICBzdGF0ZU1hcC5hY2NvdW50XG4gICAgLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ3NpZ24nKVswXVxuICAgIC50ZXh0Q29udGVudCA9IGN1cnJlbnRVc2VyLm5hbWU7XG59O1xuXG52YXIgb25BY2NvdW50TG9nb3V0ID0gZnVuY3Rpb24oKSB7XG4gIHN0YXRlTWFwLmFjY291bnRcbiAgICAuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnc2lnbicpWzBdXG4gICAgLnRleHRDb250ZW50ID0gJ1BsZWFzZSBzaWduLWluJztcbn07XG5cbi8qKlxuICogUFVCTElDIEZVTkNUSU9OU1xuICovXG5cbnZhciBjb25maWdNb2R1bGUgPSBmdW5jdGlvbihpbnB1dE1hcCkge1xuICBoZWxwZXJzLmNvbmZpZ01hcChpbnB1dE1hcCwgY29uZmlnTWFwKTtcbn07XG5cbnZhciBpbml0ID0gZnVuY3Rpb24oKSB7XG4gIGlmKGlzVGVzdGluZykge1xuICAgIHRlc3RpbmcoKTtcbiAgfVxuICAvL2hlbHBlcnMubWFrZUVycm9yKCdUaGUgYXBwIGlzIHN0aWxsIGluIHByb2R1Y3Rpb24sIG5vdCByZWFkeSBmb3IgdXNhZ2UuIFBsZWFzZSBoYXZlIGEgY29va2llIGFuZCBjb21lIGJhY2sgYWdhaW4gbGF0ZXIuJyk7XG5cbiAgLy9BY2NvdW50XG4gIHN0YXRlTWFwLmFjY291bnQgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdhY2NvdW50JylbMF07XG4gIGFjY291bnQuaW5pdChzdGF0ZU1hcC5hY2NvdW50KTtcbiAgYWNjb3VudC5iaW5kKCdvblNpZ25DbGljaycsIG9uU2lnbkNsaWNrKTtcbiAgcHViU3ViLnN1YnNjcmliZSgnbG9naW4nLCBvbkFjY291bnRMb2dpbik7XG4gIHB1YlN1Yi5zdWJzY3JpYmUoJ2xvZ291dCcsIG9uQWNjb3VudExvZ291dCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgY29uZmlnTW9kdWxlOiBjb25maWdNb2R1bGUsXG4gIGluaXQ6IGluaXRcbn07XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gc2V0VGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgc2V0VGltZW91dChkcmFpblF1ZXVlLCAwKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsIi8qIVxuICAgIGxvY2FsRm9yYWdlIC0tIE9mZmxpbmUgU3RvcmFnZSwgSW1wcm92ZWRcbiAgICBWZXJzaW9uIDEuMy4xXG4gICAgaHR0cHM6Ly9tb3ppbGxhLmdpdGh1Yi5pby9sb2NhbEZvcmFnZVxuICAgIChjKSAyMDEzLTIwMTUgTW96aWxsYSwgQXBhY2hlIExpY2Vuc2UgMi4wXG4qL1xuKGZ1bmN0aW9uKCkge1xudmFyIGRlZmluZSwgcmVxdWlyZU1vZHVsZSwgcmVxdWlyZSwgcmVxdWlyZWpzO1xuXG4oZnVuY3Rpb24oKSB7XG4gIHZhciByZWdpc3RyeSA9IHt9LCBzZWVuID0ge307XG5cbiAgZGVmaW5lID0gZnVuY3Rpb24obmFtZSwgZGVwcywgY2FsbGJhY2spIHtcbiAgICByZWdpc3RyeVtuYW1lXSA9IHsgZGVwczogZGVwcywgY2FsbGJhY2s6IGNhbGxiYWNrIH07XG4gIH07XG5cbiAgcmVxdWlyZWpzID0gcmVxdWlyZSA9IHJlcXVpcmVNb2R1bGUgPSBmdW5jdGlvbihuYW1lKSB7XG4gIHJlcXVpcmVqcy5fZWFrX3NlZW4gPSByZWdpc3RyeTtcblxuICAgIGlmIChzZWVuW25hbWVdKSB7IHJldHVybiBzZWVuW25hbWVdOyB9XG4gICAgc2VlbltuYW1lXSA9IHt9O1xuXG4gICAgaWYgKCFyZWdpc3RyeVtuYW1lXSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IGZpbmQgbW9kdWxlIFwiICsgbmFtZSk7XG4gICAgfVxuXG4gICAgdmFyIG1vZCA9IHJlZ2lzdHJ5W25hbWVdLFxuICAgICAgICBkZXBzID0gbW9kLmRlcHMsXG4gICAgICAgIGNhbGxiYWNrID0gbW9kLmNhbGxiYWNrLFxuICAgICAgICByZWlmaWVkID0gW10sXG4gICAgICAgIGV4cG9ydHM7XG5cbiAgICBmb3IgKHZhciBpPTAsIGw9ZGVwcy5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gICAgICBpZiAoZGVwc1tpXSA9PT0gJ2V4cG9ydHMnKSB7XG4gICAgICAgIHJlaWZpZWQucHVzaChleHBvcnRzID0ge30pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVpZmllZC5wdXNoKHJlcXVpcmVNb2R1bGUocmVzb2x2ZShkZXBzW2ldKSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciB2YWx1ZSA9IGNhbGxiYWNrLmFwcGx5KHRoaXMsIHJlaWZpZWQpO1xuICAgIHJldHVybiBzZWVuW25hbWVdID0gZXhwb3J0cyB8fCB2YWx1ZTtcblxuICAgIGZ1bmN0aW9uIHJlc29sdmUoY2hpbGQpIHtcbiAgICAgIGlmIChjaGlsZC5jaGFyQXQoMCkgIT09ICcuJykgeyByZXR1cm4gY2hpbGQ7IH1cbiAgICAgIHZhciBwYXJ0cyA9IGNoaWxkLnNwbGl0KFwiL1wiKTtcbiAgICAgIHZhciBwYXJlbnRCYXNlID0gbmFtZS5zcGxpdChcIi9cIikuc2xpY2UoMCwgLTEpO1xuXG4gICAgICBmb3IgKHZhciBpPTAsIGw9cGFydHMubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgICAgICB2YXIgcGFydCA9IHBhcnRzW2ldO1xuXG4gICAgICAgIGlmIChwYXJ0ID09PSAnLi4nKSB7IHBhcmVudEJhc2UucG9wKCk7IH1cbiAgICAgICAgZWxzZSBpZiAocGFydCA9PT0gJy4nKSB7IGNvbnRpbnVlOyB9XG4gICAgICAgIGVsc2UgeyBwYXJlbnRCYXNlLnB1c2gocGFydCk7IH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHBhcmVudEJhc2Uuam9pbihcIi9cIik7XG4gICAgfVxuICB9O1xufSkoKTtcblxuZGVmaW5lKFwicHJvbWlzZS9hbGxcIiwgXG4gIFtcIi4vdXRpbHNcIixcImV4cG9ydHNcIl0sXG4gIGZ1bmN0aW9uKF9fZGVwZW5kZW5jeTFfXywgX19leHBvcnRzX18pIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICAvKiBnbG9iYWwgdG9TdHJpbmcgKi9cblxuICAgIHZhciBpc0FycmF5ID0gX19kZXBlbmRlbmN5MV9fLmlzQXJyYXk7XG4gICAgdmFyIGlzRnVuY3Rpb24gPSBfX2RlcGVuZGVuY3kxX18uaXNGdW5jdGlvbjtcblxuICAgIC8qKlxuICAgICAgUmV0dXJucyBhIHByb21pc2UgdGhhdCBpcyBmdWxmaWxsZWQgd2hlbiBhbGwgdGhlIGdpdmVuIHByb21pc2VzIGhhdmUgYmVlblxuICAgICAgZnVsZmlsbGVkLCBvciByZWplY3RlZCBpZiBhbnkgb2YgdGhlbSBiZWNvbWUgcmVqZWN0ZWQuIFRoZSByZXR1cm4gcHJvbWlzZVxuICAgICAgaXMgZnVsZmlsbGVkIHdpdGggYW4gYXJyYXkgdGhhdCBnaXZlcyBhbGwgdGhlIHZhbHVlcyBpbiB0aGUgb3JkZXIgdGhleSB3ZXJlXG4gICAgICBwYXNzZWQgaW4gdGhlIGBwcm9taXNlc2AgYXJyYXkgYXJndW1lbnQuXG5cbiAgICAgIEV4YW1wbGU6XG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIHZhciBwcm9taXNlMSA9IFJTVlAucmVzb2x2ZSgxKTtcbiAgICAgIHZhciBwcm9taXNlMiA9IFJTVlAucmVzb2x2ZSgyKTtcbiAgICAgIHZhciBwcm9taXNlMyA9IFJTVlAucmVzb2x2ZSgzKTtcbiAgICAgIHZhciBwcm9taXNlcyA9IFsgcHJvbWlzZTEsIHByb21pc2UyLCBwcm9taXNlMyBdO1xuXG4gICAgICBSU1ZQLmFsbChwcm9taXNlcykudGhlbihmdW5jdGlvbihhcnJheSl7XG4gICAgICAgIC8vIFRoZSBhcnJheSBoZXJlIHdvdWxkIGJlIFsgMSwgMiwgMyBdO1xuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgSWYgYW55IG9mIHRoZSBgcHJvbWlzZXNgIGdpdmVuIHRvIGBSU1ZQLmFsbGAgYXJlIHJlamVjdGVkLCB0aGUgZmlyc3QgcHJvbWlzZVxuICAgICAgdGhhdCBpcyByZWplY3RlZCB3aWxsIGJlIGdpdmVuIGFzIGFuIGFyZ3VtZW50IHRvIHRoZSByZXR1cm5lZCBwcm9taXNlcydzXG4gICAgICByZWplY3Rpb24gaGFuZGxlci4gRm9yIGV4YW1wbGU6XG5cbiAgICAgIEV4YW1wbGU6XG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIHZhciBwcm9taXNlMSA9IFJTVlAucmVzb2x2ZSgxKTtcbiAgICAgIHZhciBwcm9taXNlMiA9IFJTVlAucmVqZWN0KG5ldyBFcnJvcihcIjJcIikpO1xuICAgICAgdmFyIHByb21pc2UzID0gUlNWUC5yZWplY3QobmV3IEVycm9yKFwiM1wiKSk7XG4gICAgICB2YXIgcHJvbWlzZXMgPSBbIHByb21pc2UxLCBwcm9taXNlMiwgcHJvbWlzZTMgXTtcblxuICAgICAgUlNWUC5hbGwocHJvbWlzZXMpLnRoZW4oZnVuY3Rpb24oYXJyYXkpe1xuICAgICAgICAvLyBDb2RlIGhlcmUgbmV2ZXIgcnVucyBiZWNhdXNlIHRoZXJlIGFyZSByZWplY3RlZCBwcm9taXNlcyFcbiAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgIC8vIGVycm9yLm1lc3NhZ2UgPT09IFwiMlwiXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBAbWV0aG9kIGFsbFxuICAgICAgQGZvciBSU1ZQXG4gICAgICBAcGFyYW0ge0FycmF5fSBwcm9taXNlc1xuICAgICAgQHBhcmFtIHtTdHJpbmd9IGxhYmVsXG4gICAgICBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlIHRoYXQgaXMgZnVsZmlsbGVkIHdoZW4gYWxsIGBwcm9taXNlc2AgaGF2ZSBiZWVuXG4gICAgICBmdWxmaWxsZWQsIG9yIHJlamVjdGVkIGlmIGFueSBvZiB0aGVtIGJlY29tZSByZWplY3RlZC5cbiAgICAqL1xuICAgIGZ1bmN0aW9uIGFsbChwcm9taXNlcykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgICAgIHZhciBQcm9taXNlID0gdGhpcztcblxuICAgICAgaWYgKCFpc0FycmF5KHByb21pc2VzKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdZb3UgbXVzdCBwYXNzIGFuIGFycmF5IHRvIGFsbC4nKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICB2YXIgcmVzdWx0cyA9IFtdLCByZW1haW5pbmcgPSBwcm9taXNlcy5sZW5ndGgsXG4gICAgICAgIHByb21pc2U7XG5cbiAgICAgICAgaWYgKHJlbWFpbmluZyA9PT0gMCkge1xuICAgICAgICAgIHJlc29sdmUoW10pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcmVzb2x2ZXIoaW5kZXgpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgIHJlc29sdmVBbGwoaW5kZXgsIHZhbHVlKTtcbiAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcmVzb2x2ZUFsbChpbmRleCwgdmFsdWUpIHtcbiAgICAgICAgICByZXN1bHRzW2luZGV4XSA9IHZhbHVlO1xuICAgICAgICAgIGlmICgtLXJlbWFpbmluZyA9PT0gMCkge1xuICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHRzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHByb21pc2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgcHJvbWlzZSA9IHByb21pc2VzW2ldO1xuXG4gICAgICAgICAgaWYgKHByb21pc2UgJiYgaXNGdW5jdGlvbihwcm9taXNlLnRoZW4pKSB7XG4gICAgICAgICAgICBwcm9taXNlLnRoZW4ocmVzb2x2ZXIoaSksIHJlamVjdCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc29sdmVBbGwoaSwgcHJvbWlzZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBfX2V4cG9ydHNfXy5hbGwgPSBhbGw7XG4gIH0pO1xuZGVmaW5lKFwicHJvbWlzZS9hc2FwXCIsIFxuICBbXCJleHBvcnRzXCJdLFxuICBmdW5jdGlvbihfX2V4cG9ydHNfXykge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHZhciBicm93c2VyR2xvYmFsID0gKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSA/IHdpbmRvdyA6IHt9O1xuICAgIHZhciBCcm93c2VyTXV0YXRpb25PYnNlcnZlciA9IGJyb3dzZXJHbG9iYWwuTXV0YXRpb25PYnNlcnZlciB8fCBicm93c2VyR2xvYmFsLldlYktpdE11dGF0aW9uT2JzZXJ2ZXI7XG4gICAgdmFyIGxvY2FsID0gKHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnKSA/IGdsb2JhbCA6ICh0aGlzID09PSB1bmRlZmluZWQ/IHdpbmRvdzp0aGlzKTtcblxuICAgIC8vIG5vZGVcbiAgICBmdW5jdGlvbiB1c2VOZXh0VGljaygpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhmbHVzaCk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVzZU11dGF0aW9uT2JzZXJ2ZXIoKSB7XG4gICAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIoZmx1c2gpO1xuICAgICAgdmFyIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgICBvYnNlcnZlci5vYnNlcnZlKG5vZGUsIHsgY2hhcmFjdGVyRGF0YTogdHJ1ZSB9KTtcblxuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICBub2RlLmRhdGEgPSAoaXRlcmF0aW9ucyA9ICsraXRlcmF0aW9ucyAlIDIpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1c2VTZXRUaW1lb3V0KCkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICBsb2NhbC5zZXRUaW1lb3V0KGZsdXNoLCAxKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgdmFyIHF1ZXVlID0gW107XG4gICAgZnVuY3Rpb24gZmx1c2goKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHF1ZXVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciB0dXBsZSA9IHF1ZXVlW2ldO1xuICAgICAgICB2YXIgY2FsbGJhY2sgPSB0dXBsZVswXSwgYXJnID0gdHVwbGVbMV07XG4gICAgICAgIGNhbGxiYWNrKGFyZyk7XG4gICAgICB9XG4gICAgICBxdWV1ZSA9IFtdO1xuICAgIH1cblxuICAgIHZhciBzY2hlZHVsZUZsdXNoO1xuXG4gICAgLy8gRGVjaWRlIHdoYXQgYXN5bmMgbWV0aG9kIHRvIHVzZSB0byB0cmlnZ2VyaW5nIHByb2Nlc3Npbmcgb2YgcXVldWVkIGNhbGxiYWNrczpcbiAgICBpZiAodHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnICYmIHt9LnRvU3RyaW5nLmNhbGwocHJvY2VzcykgPT09ICdbb2JqZWN0IHByb2Nlc3NdJykge1xuICAgICAgc2NoZWR1bGVGbHVzaCA9IHVzZU5leHRUaWNrKCk7XG4gICAgfSBlbHNlIGlmIChCcm93c2VyTXV0YXRpb25PYnNlcnZlcikge1xuICAgICAgc2NoZWR1bGVGbHVzaCA9IHVzZU11dGF0aW9uT2JzZXJ2ZXIoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2NoZWR1bGVGbHVzaCA9IHVzZVNldFRpbWVvdXQoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhc2FwKGNhbGxiYWNrLCBhcmcpIHtcbiAgICAgIHZhciBsZW5ndGggPSBxdWV1ZS5wdXNoKFtjYWxsYmFjaywgYXJnXSk7XG4gICAgICBpZiAobGVuZ3RoID09PSAxKSB7XG4gICAgICAgIC8vIElmIGxlbmd0aCBpcyAxLCB0aGF0IG1lYW5zIHRoYXQgd2UgbmVlZCB0byBzY2hlZHVsZSBhbiBhc3luYyBmbHVzaC5cbiAgICAgICAgLy8gSWYgYWRkaXRpb25hbCBjYWxsYmFja3MgYXJlIHF1ZXVlZCBiZWZvcmUgdGhlIHF1ZXVlIGlzIGZsdXNoZWQsIHRoZXlcbiAgICAgICAgLy8gd2lsbCBiZSBwcm9jZXNzZWQgYnkgdGhpcyBmbHVzaCB0aGF0IHdlIGFyZSBzY2hlZHVsaW5nLlxuICAgICAgICBzY2hlZHVsZUZsdXNoKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgX19leHBvcnRzX18uYXNhcCA9IGFzYXA7XG4gIH0pO1xuZGVmaW5lKFwicHJvbWlzZS9jb25maWdcIiwgXG4gIFtcImV4cG9ydHNcIl0sXG4gIGZ1bmN0aW9uKF9fZXhwb3J0c19fKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgdmFyIGNvbmZpZyA9IHtcbiAgICAgIGluc3RydW1lbnQ6IGZhbHNlXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGNvbmZpZ3VyZShuYW1lLCB2YWx1ZSkge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgY29uZmlnW25hbWVdID0gdmFsdWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gY29uZmlnW25hbWVdO1xuICAgICAgfVxuICAgIH1cblxuICAgIF9fZXhwb3J0c19fLmNvbmZpZyA9IGNvbmZpZztcbiAgICBfX2V4cG9ydHNfXy5jb25maWd1cmUgPSBjb25maWd1cmU7XG4gIH0pO1xuZGVmaW5lKFwicHJvbWlzZS9wb2x5ZmlsbFwiLCBcbiAgW1wiLi9wcm9taXNlXCIsXCIuL3V0aWxzXCIsXCJleHBvcnRzXCJdLFxuICBmdW5jdGlvbihfX2RlcGVuZGVuY3kxX18sIF9fZGVwZW5kZW5jeTJfXywgX19leHBvcnRzX18pIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICAvKmdsb2JhbCBzZWxmKi9cbiAgICB2YXIgUlNWUFByb21pc2UgPSBfX2RlcGVuZGVuY3kxX18uUHJvbWlzZTtcbiAgICB2YXIgaXNGdW5jdGlvbiA9IF9fZGVwZW5kZW5jeTJfXy5pc0Z1bmN0aW9uO1xuXG4gICAgZnVuY3Rpb24gcG9seWZpbGwoKSB7XG4gICAgICB2YXIgbG9jYWw7XG5cbiAgICAgIGlmICh0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBsb2NhbCA9IGdsb2JhbDtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LmRvY3VtZW50KSB7XG4gICAgICAgIGxvY2FsID0gd2luZG93O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9jYWwgPSBzZWxmO1xuICAgICAgfVxuXG4gICAgICB2YXIgZXM2UHJvbWlzZVN1cHBvcnQgPSBcbiAgICAgICAgXCJQcm9taXNlXCIgaW4gbG9jYWwgJiZcbiAgICAgICAgLy8gU29tZSBvZiB0aGVzZSBtZXRob2RzIGFyZSBtaXNzaW5nIGZyb21cbiAgICAgICAgLy8gRmlyZWZveC9DaHJvbWUgZXhwZXJpbWVudGFsIGltcGxlbWVudGF0aW9uc1xuICAgICAgICBcInJlc29sdmVcIiBpbiBsb2NhbC5Qcm9taXNlICYmXG4gICAgICAgIFwicmVqZWN0XCIgaW4gbG9jYWwuUHJvbWlzZSAmJlxuICAgICAgICBcImFsbFwiIGluIGxvY2FsLlByb21pc2UgJiZcbiAgICAgICAgXCJyYWNlXCIgaW4gbG9jYWwuUHJvbWlzZSAmJlxuICAgICAgICAvLyBPbGRlciB2ZXJzaW9uIG9mIHRoZSBzcGVjIGhhZCBhIHJlc29sdmVyIG9iamVjdFxuICAgICAgICAvLyBhcyB0aGUgYXJnIHJhdGhlciB0aGFuIGEgZnVuY3Rpb25cbiAgICAgICAgKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciByZXNvbHZlO1xuICAgICAgICAgIG5ldyBsb2NhbC5Qcm9taXNlKGZ1bmN0aW9uKHIpIHsgcmVzb2x2ZSA9IHI7IH0pO1xuICAgICAgICAgIHJldHVybiBpc0Z1bmN0aW9uKHJlc29sdmUpO1xuICAgICAgICB9KCkpO1xuXG4gICAgICBpZiAoIWVzNlByb21pc2VTdXBwb3J0KSB7XG4gICAgICAgIGxvY2FsLlByb21pc2UgPSBSU1ZQUHJvbWlzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBfX2V4cG9ydHNfXy5wb2x5ZmlsbCA9IHBvbHlmaWxsO1xuICB9KTtcbmRlZmluZShcInByb21pc2UvcHJvbWlzZVwiLCBcbiAgW1wiLi9jb25maWdcIixcIi4vdXRpbHNcIixcIi4vYWxsXCIsXCIuL3JhY2VcIixcIi4vcmVzb2x2ZVwiLFwiLi9yZWplY3RcIixcIi4vYXNhcFwiLFwiZXhwb3J0c1wiXSxcbiAgZnVuY3Rpb24oX19kZXBlbmRlbmN5MV9fLCBfX2RlcGVuZGVuY3kyX18sIF9fZGVwZW5kZW5jeTNfXywgX19kZXBlbmRlbmN5NF9fLCBfX2RlcGVuZGVuY3k1X18sIF9fZGVwZW5kZW5jeTZfXywgX19kZXBlbmRlbmN5N19fLCBfX2V4cG9ydHNfXykge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHZhciBjb25maWcgPSBfX2RlcGVuZGVuY3kxX18uY29uZmlnO1xuICAgIHZhciBjb25maWd1cmUgPSBfX2RlcGVuZGVuY3kxX18uY29uZmlndXJlO1xuICAgIHZhciBvYmplY3RPckZ1bmN0aW9uID0gX19kZXBlbmRlbmN5Ml9fLm9iamVjdE9yRnVuY3Rpb247XG4gICAgdmFyIGlzRnVuY3Rpb24gPSBfX2RlcGVuZGVuY3kyX18uaXNGdW5jdGlvbjtcbiAgICB2YXIgbm93ID0gX19kZXBlbmRlbmN5Ml9fLm5vdztcbiAgICB2YXIgYWxsID0gX19kZXBlbmRlbmN5M19fLmFsbDtcbiAgICB2YXIgcmFjZSA9IF9fZGVwZW5kZW5jeTRfXy5yYWNlO1xuICAgIHZhciBzdGF0aWNSZXNvbHZlID0gX19kZXBlbmRlbmN5NV9fLnJlc29sdmU7XG4gICAgdmFyIHN0YXRpY1JlamVjdCA9IF9fZGVwZW5kZW5jeTZfXy5yZWplY3Q7XG4gICAgdmFyIGFzYXAgPSBfX2RlcGVuZGVuY3k3X18uYXNhcDtcblxuICAgIHZhciBjb3VudGVyID0gMDtcblxuICAgIGNvbmZpZy5hc3luYyA9IGFzYXA7IC8vIGRlZmF1bHQgYXN5bmMgaXMgYXNhcDtcblxuICAgIGZ1bmN0aW9uIFByb21pc2UocmVzb2x2ZXIpIHtcbiAgICAgIGlmICghaXNGdW5jdGlvbihyZXNvbHZlcikpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignWW91IG11c3QgcGFzcyBhIHJlc29sdmVyIGZ1bmN0aW9uIGFzIHRoZSBmaXJzdCBhcmd1bWVudCB0byB0aGUgcHJvbWlzZSBjb25zdHJ1Y3RvcicpO1xuICAgICAgfVxuXG4gICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUHJvbWlzZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkZhaWxlZCB0byBjb25zdHJ1Y3QgJ1Byb21pc2UnOiBQbGVhc2UgdXNlIHRoZSAnbmV3JyBvcGVyYXRvciwgdGhpcyBvYmplY3QgY29uc3RydWN0b3IgY2Fubm90IGJlIGNhbGxlZCBhcyBhIGZ1bmN0aW9uLlwiKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5fc3Vic2NyaWJlcnMgPSBbXTtcblxuICAgICAgaW52b2tlUmVzb2x2ZXIocmVzb2x2ZXIsIHRoaXMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGludm9rZVJlc29sdmVyKHJlc29sdmVyLCBwcm9taXNlKSB7XG4gICAgICBmdW5jdGlvbiByZXNvbHZlUHJvbWlzZSh2YWx1ZSkge1xuICAgICAgICByZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gcmVqZWN0UHJvbWlzZShyZWFzb24pIHtcbiAgICAgICAgcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgICB9XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc29sdmVyKHJlc29sdmVQcm9taXNlLCByZWplY3RQcm9taXNlKTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICByZWplY3RQcm9taXNlKGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGludm9rZUNhbGxiYWNrKHNldHRsZWQsIHByb21pc2UsIGNhbGxiYWNrLCBkZXRhaWwpIHtcbiAgICAgIHZhciBoYXNDYWxsYmFjayA9IGlzRnVuY3Rpb24oY2FsbGJhY2spLFxuICAgICAgICAgIHZhbHVlLCBlcnJvciwgc3VjY2VlZGVkLCBmYWlsZWQ7XG5cbiAgICAgIGlmIChoYXNDYWxsYmFjaykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHZhbHVlID0gY2FsbGJhY2soZGV0YWlsKTtcbiAgICAgICAgICBzdWNjZWVkZWQgPSB0cnVlO1xuICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICBmYWlsZWQgPSB0cnVlO1xuICAgICAgICAgIGVycm9yID0gZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFsdWUgPSBkZXRhaWw7XG4gICAgICAgIHN1Y2NlZWRlZCA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChoYW5kbGVUaGVuYWJsZShwcm9taXNlLCB2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSBlbHNlIGlmIChoYXNDYWxsYmFjayAmJiBzdWNjZWVkZWQpIHtcbiAgICAgICAgcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2UgaWYgKGZhaWxlZCkge1xuICAgICAgICByZWplY3QocHJvbWlzZSwgZXJyb3IpO1xuICAgICAgfSBlbHNlIGlmIChzZXR0bGVkID09PSBGVUxGSUxMRUQpIHtcbiAgICAgICAgcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2UgaWYgKHNldHRsZWQgPT09IFJFSkVDVEVEKSB7XG4gICAgICAgIHJlamVjdChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIFBFTkRJTkcgICA9IHZvaWQgMDtcbiAgICB2YXIgU0VBTEVEICAgID0gMDtcbiAgICB2YXIgRlVMRklMTEVEID0gMTtcbiAgICB2YXIgUkVKRUNURUQgID0gMjtcblxuICAgIGZ1bmN0aW9uIHN1YnNjcmliZShwYXJlbnQsIGNoaWxkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbikge1xuICAgICAgdmFyIHN1YnNjcmliZXJzID0gcGFyZW50Ll9zdWJzY3JpYmVycztcbiAgICAgIHZhciBsZW5ndGggPSBzdWJzY3JpYmVycy5sZW5ndGg7XG5cbiAgICAgIHN1YnNjcmliZXJzW2xlbmd0aF0gPSBjaGlsZDtcbiAgICAgIHN1YnNjcmliZXJzW2xlbmd0aCArIEZVTEZJTExFRF0gPSBvbkZ1bGZpbGxtZW50O1xuICAgICAgc3Vic2NyaWJlcnNbbGVuZ3RoICsgUkVKRUNURURdICA9IG9uUmVqZWN0aW9uO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHB1Ymxpc2gocHJvbWlzZSwgc2V0dGxlZCkge1xuICAgICAgdmFyIGNoaWxkLCBjYWxsYmFjaywgc3Vic2NyaWJlcnMgPSBwcm9taXNlLl9zdWJzY3JpYmVycywgZGV0YWlsID0gcHJvbWlzZS5fZGV0YWlsO1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN1YnNjcmliZXJzLmxlbmd0aDsgaSArPSAzKSB7XG4gICAgICAgIGNoaWxkID0gc3Vic2NyaWJlcnNbaV07XG4gICAgICAgIGNhbGxiYWNrID0gc3Vic2NyaWJlcnNbaSArIHNldHRsZWRdO1xuXG4gICAgICAgIGludm9rZUNhbGxiYWNrKHNldHRsZWQsIGNoaWxkLCBjYWxsYmFjaywgZGV0YWlsKTtcbiAgICAgIH1cblxuICAgICAgcHJvbWlzZS5fc3Vic2NyaWJlcnMgPSBudWxsO1xuICAgIH1cblxuICAgIFByb21pc2UucHJvdG90eXBlID0ge1xuICAgICAgY29uc3RydWN0b3I6IFByb21pc2UsXG5cbiAgICAgIF9zdGF0ZTogdW5kZWZpbmVkLFxuICAgICAgX2RldGFpbDogdW5kZWZpbmVkLFxuICAgICAgX3N1YnNjcmliZXJzOiB1bmRlZmluZWQsXG5cbiAgICAgIHRoZW46IGZ1bmN0aW9uKG9uRnVsZmlsbG1lbnQsIG9uUmVqZWN0aW9uKSB7XG4gICAgICAgIHZhciBwcm9taXNlID0gdGhpcztcblxuICAgICAgICB2YXIgdGhlblByb21pc2UgPSBuZXcgdGhpcy5jb25zdHJ1Y3RvcihmdW5jdGlvbigpIHt9KTtcblxuICAgICAgICBpZiAodGhpcy5fc3RhdGUpIHtcbiAgICAgICAgICB2YXIgY2FsbGJhY2tzID0gYXJndW1lbnRzO1xuICAgICAgICAgIGNvbmZpZy5hc3luYyhmdW5jdGlvbiBpbnZva2VQcm9taXNlQ2FsbGJhY2soKSB7XG4gICAgICAgICAgICBpbnZva2VDYWxsYmFjayhwcm9taXNlLl9zdGF0ZSwgdGhlblByb21pc2UsIGNhbGxiYWNrc1twcm9taXNlLl9zdGF0ZSAtIDFdLCBwcm9taXNlLl9kZXRhaWwpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN1YnNjcmliZSh0aGlzLCB0aGVuUHJvbWlzZSwgb25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoZW5Qcm9taXNlO1xuICAgICAgfSxcblxuICAgICAgJ2NhdGNoJzogZnVuY3Rpb24ob25SZWplY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGhlbihudWxsLCBvblJlamVjdGlvbik7XG4gICAgICB9XG4gICAgfTtcblxuICAgIFByb21pc2UuYWxsID0gYWxsO1xuICAgIFByb21pc2UucmFjZSA9IHJhY2U7XG4gICAgUHJvbWlzZS5yZXNvbHZlID0gc3RhdGljUmVzb2x2ZTtcbiAgICBQcm9taXNlLnJlamVjdCA9IHN0YXRpY1JlamVjdDtcblxuICAgIGZ1bmN0aW9uIGhhbmRsZVRoZW5hYmxlKHByb21pc2UsIHZhbHVlKSB7XG4gICAgICB2YXIgdGhlbiA9IG51bGwsXG4gICAgICByZXNvbHZlZDtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKHByb21pc2UgPT09IHZhbHVlKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkEgcHJvbWlzZXMgY2FsbGJhY2sgY2Fubm90IHJldHVybiB0aGF0IHNhbWUgcHJvbWlzZS5cIik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob2JqZWN0T3JGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgICAgICB0aGVuID0gdmFsdWUudGhlbjtcblxuICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKHRoZW4pKSB7XG4gICAgICAgICAgICB0aGVuLmNhbGwodmFsdWUsIGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICAgICAgICBpZiAocmVzb2x2ZWQpIHsgcmV0dXJuIHRydWU7IH1cbiAgICAgICAgICAgICAgcmVzb2x2ZWQgPSB0cnVlO1xuXG4gICAgICAgICAgICAgIGlmICh2YWx1ZSAhPT0gdmFsKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwcm9taXNlLCB2YWwpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZ1bGZpbGwocHJvbWlzZSwgdmFsKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgZnVuY3Rpb24odmFsKSB7XG4gICAgICAgICAgICAgIGlmIChyZXNvbHZlZCkgeyByZXR1cm4gdHJ1ZTsgfVxuICAgICAgICAgICAgICByZXNvbHZlZCA9IHRydWU7XG5cbiAgICAgICAgICAgICAgcmVqZWN0KHByb21pc2UsIHZhbCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBpZiAocmVzb2x2ZWQpIHsgcmV0dXJuIHRydWU7IH1cbiAgICAgICAgcmVqZWN0KHByb21pc2UsIGVycm9yKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXNvbHZlKHByb21pc2UsIHZhbHVlKSB7XG4gICAgICBpZiAocHJvbWlzZSA9PT0gdmFsdWUpIHtcbiAgICAgICAgZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2UgaWYgKCFoYW5kbGVUaGVuYWJsZShwcm9taXNlLCB2YWx1ZSkpIHtcbiAgICAgICAgZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZnVsZmlsbChwcm9taXNlLCB2YWx1ZSkge1xuICAgICAgaWYgKHByb21pc2UuX3N0YXRlICE9PSBQRU5ESU5HKSB7IHJldHVybjsgfVxuICAgICAgcHJvbWlzZS5fc3RhdGUgPSBTRUFMRUQ7XG4gICAgICBwcm9taXNlLl9kZXRhaWwgPSB2YWx1ZTtcblxuICAgICAgY29uZmlnLmFzeW5jKHB1Ymxpc2hGdWxmaWxsbWVudCwgcHJvbWlzZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVqZWN0KHByb21pc2UsIHJlYXNvbikge1xuICAgICAgaWYgKHByb21pc2UuX3N0YXRlICE9PSBQRU5ESU5HKSB7IHJldHVybjsgfVxuICAgICAgcHJvbWlzZS5fc3RhdGUgPSBTRUFMRUQ7XG4gICAgICBwcm9taXNlLl9kZXRhaWwgPSByZWFzb247XG5cbiAgICAgIGNvbmZpZy5hc3luYyhwdWJsaXNoUmVqZWN0aW9uLCBwcm9taXNlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwdWJsaXNoRnVsZmlsbG1lbnQocHJvbWlzZSkge1xuICAgICAgcHVibGlzaChwcm9taXNlLCBwcm9taXNlLl9zdGF0ZSA9IEZVTEZJTExFRCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcHVibGlzaFJlamVjdGlvbihwcm9taXNlKSB7XG4gICAgICBwdWJsaXNoKHByb21pc2UsIHByb21pc2UuX3N0YXRlID0gUkVKRUNURUQpO1xuICAgIH1cblxuICAgIF9fZXhwb3J0c19fLlByb21pc2UgPSBQcm9taXNlO1xuICB9KTtcbmRlZmluZShcInByb21pc2UvcmFjZVwiLCBcbiAgW1wiLi91dGlsc1wiLFwiZXhwb3J0c1wiXSxcbiAgZnVuY3Rpb24oX19kZXBlbmRlbmN5MV9fLCBfX2V4cG9ydHNfXykge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIC8qIGdsb2JhbCB0b1N0cmluZyAqL1xuICAgIHZhciBpc0FycmF5ID0gX19kZXBlbmRlbmN5MV9fLmlzQXJyYXk7XG5cbiAgICAvKipcbiAgICAgIGBSU1ZQLnJhY2VgIGFsbG93cyB5b3UgdG8gd2F0Y2ggYSBzZXJpZXMgb2YgcHJvbWlzZXMgYW5kIGFjdCBhcyBzb29uIGFzIHRoZVxuICAgICAgZmlyc3QgcHJvbWlzZSBnaXZlbiB0byB0aGUgYHByb21pc2VzYCBhcmd1bWVudCBmdWxmaWxscyBvciByZWplY3RzLlxuXG4gICAgICBFeGFtcGxlOlxuXG4gICAgICBgYGBqYXZhc2NyaXB0XG4gICAgICB2YXIgcHJvbWlzZTEgPSBuZXcgUlNWUC5Qcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICByZXNvbHZlKFwicHJvbWlzZSAxXCIpO1xuICAgICAgICB9LCAyMDApO1xuICAgICAgfSk7XG5cbiAgICAgIHZhciBwcm9taXNlMiA9IG5ldyBSU1ZQLlByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgIHJlc29sdmUoXCJwcm9taXNlIDJcIik7XG4gICAgICAgIH0sIDEwMCk7XG4gICAgICB9KTtcblxuICAgICAgUlNWUC5yYWNlKFtwcm9taXNlMSwgcHJvbWlzZTJdKS50aGVuKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgICAgIC8vIHJlc3VsdCA9PT0gXCJwcm9taXNlIDJcIiBiZWNhdXNlIGl0IHdhcyByZXNvbHZlZCBiZWZvcmUgcHJvbWlzZTFcbiAgICAgICAgLy8gd2FzIHJlc29sdmVkLlxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgYFJTVlAucmFjZWAgaXMgZGV0ZXJtaW5pc3RpYyBpbiB0aGF0IG9ubHkgdGhlIHN0YXRlIG9mIHRoZSBmaXJzdCBjb21wbGV0ZWRcbiAgICAgIHByb21pc2UgbWF0dGVycy4gRm9yIGV4YW1wbGUsIGV2ZW4gaWYgb3RoZXIgcHJvbWlzZXMgZ2l2ZW4gdG8gdGhlIGBwcm9taXNlc2BcbiAgICAgIGFycmF5IGFyZ3VtZW50IGFyZSByZXNvbHZlZCwgYnV0IHRoZSBmaXJzdCBjb21wbGV0ZWQgcHJvbWlzZSBoYXMgYmVjb21lXG4gICAgICByZWplY3RlZCBiZWZvcmUgdGhlIG90aGVyIHByb21pc2VzIGJlY2FtZSBmdWxmaWxsZWQsIHRoZSByZXR1cm5lZCBwcm9taXNlXG4gICAgICB3aWxsIGJlY29tZSByZWplY3RlZDpcblxuICAgICAgYGBgamF2YXNjcmlwdFxuICAgICAgdmFyIHByb21pc2UxID0gbmV3IFJTVlAuUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgcmVzb2x2ZShcInByb21pc2UgMVwiKTtcbiAgICAgICAgfSwgMjAwKTtcbiAgICAgIH0pO1xuXG4gICAgICB2YXIgcHJvbWlzZTIgPSBuZXcgUlNWUC5Qcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICByZWplY3QobmV3IEVycm9yKFwicHJvbWlzZSAyXCIpKTtcbiAgICAgICAgfSwgMTAwKTtcbiAgICAgIH0pO1xuXG4gICAgICBSU1ZQLnJhY2UoW3Byb21pc2UxLCBwcm9taXNlMl0pLnRoZW4oZnVuY3Rpb24ocmVzdWx0KXtcbiAgICAgICAgLy8gQ29kZSBoZXJlIG5ldmVyIHJ1bnMgYmVjYXVzZSB0aGVyZSBhcmUgcmVqZWN0ZWQgcHJvbWlzZXMhXG4gICAgICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgICAgICAvLyByZWFzb24ubWVzc2FnZSA9PT0gXCJwcm9taXNlMlwiIGJlY2F1c2UgcHJvbWlzZSAyIGJlY2FtZSByZWplY3RlZCBiZWZvcmVcbiAgICAgICAgLy8gcHJvbWlzZSAxIGJlY2FtZSBmdWxmaWxsZWRcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEBtZXRob2QgcmFjZVxuICAgICAgQGZvciBSU1ZQXG4gICAgICBAcGFyYW0ge0FycmF5fSBwcm9taXNlcyBhcnJheSBvZiBwcm9taXNlcyB0byBvYnNlcnZlXG4gICAgICBAcGFyYW0ge1N0cmluZ30gbGFiZWwgb3B0aW9uYWwgc3RyaW5nIGZvciBkZXNjcmliaW5nIHRoZSBwcm9taXNlIHJldHVybmVkLlxuICAgICAgVXNlZnVsIGZvciB0b29saW5nLlxuICAgICAgQHJldHVybiB7UHJvbWlzZX0gYSBwcm9taXNlIHRoYXQgYmVjb21lcyBmdWxmaWxsZWQgd2l0aCB0aGUgdmFsdWUgdGhlIGZpcnN0XG4gICAgICBjb21wbGV0ZWQgcHJvbWlzZXMgaXMgcmVzb2x2ZWQgd2l0aCBpZiB0aGUgZmlyc3QgY29tcGxldGVkIHByb21pc2Ugd2FzXG4gICAgICBmdWxmaWxsZWQsIG9yIHJlamVjdGVkIHdpdGggdGhlIHJlYXNvbiB0aGF0IHRoZSBmaXJzdCBjb21wbGV0ZWQgcHJvbWlzZVxuICAgICAgd2FzIHJlamVjdGVkIHdpdGguXG4gICAgKi9cbiAgICBmdW5jdGlvbiByYWNlKHByb21pc2VzKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICAgICAgdmFyIFByb21pc2UgPSB0aGlzO1xuXG4gICAgICBpZiAoIWlzQXJyYXkocHJvbWlzZXMpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1lvdSBtdXN0IHBhc3MgYW4gYXJyYXkgdG8gcmFjZS4nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgdmFyIHJlc3VsdHMgPSBbXSwgcHJvbWlzZTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHByb21pc2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgcHJvbWlzZSA9IHByb21pc2VzW2ldO1xuXG4gICAgICAgICAgaWYgKHByb21pc2UgJiYgdHlwZW9mIHByb21pc2UudGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgcHJvbWlzZS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc29sdmUocHJvbWlzZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBfX2V4cG9ydHNfXy5yYWNlID0gcmFjZTtcbiAgfSk7XG5kZWZpbmUoXCJwcm9taXNlL3JlamVjdFwiLCBcbiAgW1wiZXhwb3J0c1wiXSxcbiAgZnVuY3Rpb24oX19leHBvcnRzX18pIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICAvKipcbiAgICAgIGBSU1ZQLnJlamVjdGAgcmV0dXJucyBhIHByb21pc2UgdGhhdCB3aWxsIGJlY29tZSByZWplY3RlZCB3aXRoIHRoZSBwYXNzZWRcbiAgICAgIGByZWFzb25gLiBgUlNWUC5yZWplY3RgIGlzIGVzc2VudGlhbGx5IHNob3J0aGFuZCBmb3IgdGhlIGZvbGxvd2luZzpcblxuICAgICAgYGBgamF2YXNjcmlwdFxuICAgICAgdmFyIHByb21pc2UgPSBuZXcgUlNWUC5Qcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ1dIT09QUycpKTtcbiAgICAgIH0pO1xuXG4gICAgICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICAvLyBDb2RlIGhlcmUgZG9lc24ndCBydW4gYmVjYXVzZSB0aGUgcHJvbWlzZSBpcyByZWplY3RlZCFcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgICAgIC8vIHJlYXNvbi5tZXNzYWdlID09PSAnV0hPT1BTJ1xuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgSW5zdGVhZCBvZiB3cml0aW5nIHRoZSBhYm92ZSwgeW91ciBjb2RlIG5vdyBzaW1wbHkgYmVjb21lcyB0aGUgZm9sbG93aW5nOlxuXG4gICAgICBgYGBqYXZhc2NyaXB0XG4gICAgICB2YXIgcHJvbWlzZSA9IFJTVlAucmVqZWN0KG5ldyBFcnJvcignV0hPT1BTJykpO1xuXG4gICAgICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICAvLyBDb2RlIGhlcmUgZG9lc24ndCBydW4gYmVjYXVzZSB0aGUgcHJvbWlzZSBpcyByZWplY3RlZCFcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgICAgIC8vIHJlYXNvbi5tZXNzYWdlID09PSAnV0hPT1BTJ1xuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQG1ldGhvZCByZWplY3RcbiAgICAgIEBmb3IgUlNWUFxuICAgICAgQHBhcmFtIHtBbnl9IHJlYXNvbiB2YWx1ZSB0aGF0IHRoZSByZXR1cm5lZCBwcm9taXNlIHdpbGwgYmUgcmVqZWN0ZWQgd2l0aC5cbiAgICAgIEBwYXJhbSB7U3RyaW5nfSBsYWJlbCBvcHRpb25hbCBzdHJpbmcgZm9yIGlkZW50aWZ5aW5nIHRoZSByZXR1cm5lZCBwcm9taXNlLlxuICAgICAgVXNlZnVsIGZvciB0b29saW5nLlxuICAgICAgQHJldHVybiB7UHJvbWlzZX0gYSBwcm9taXNlIHRoYXQgd2lsbCBiZWNvbWUgcmVqZWN0ZWQgd2l0aCB0aGUgZ2l2ZW5cbiAgICAgIGByZWFzb25gLlxuICAgICovXG4gICAgZnVuY3Rpb24gcmVqZWN0KHJlYXNvbikge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgICAgIHZhciBQcm9taXNlID0gdGhpcztcblxuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgcmVqZWN0KHJlYXNvbik7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBfX2V4cG9ydHNfXy5yZWplY3QgPSByZWplY3Q7XG4gIH0pO1xuZGVmaW5lKFwicHJvbWlzZS9yZXNvbHZlXCIsIFxuICBbXCJleHBvcnRzXCJdLFxuICBmdW5jdGlvbihfX2V4cG9ydHNfXykge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIGZ1bmN0aW9uIHJlc29sdmUodmFsdWUpIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gICAgICBpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZS5jb25zdHJ1Y3RvciA9PT0gdGhpcykge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9XG5cbiAgICAgIHZhciBQcm9taXNlID0gdGhpcztcblxuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUpIHtcbiAgICAgICAgcmVzb2x2ZSh2YWx1ZSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBfX2V4cG9ydHNfXy5yZXNvbHZlID0gcmVzb2x2ZTtcbiAgfSk7XG5kZWZpbmUoXCJwcm9taXNlL3V0aWxzXCIsIFxuICBbXCJleHBvcnRzXCJdLFxuICBmdW5jdGlvbihfX2V4cG9ydHNfXykge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIGZ1bmN0aW9uIG9iamVjdE9yRnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuIGlzRnVuY3Rpb24oeCkgfHwgKHR5cGVvZiB4ID09PSBcIm9iamVjdFwiICYmIHggIT09IG51bGwpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzRnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuIHR5cGVvZiB4ID09PSBcImZ1bmN0aW9uXCI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNBcnJheSh4KSB7XG4gICAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHgpID09PSBcIltvYmplY3QgQXJyYXldXCI7XG4gICAgfVxuXG4gICAgLy8gRGF0ZS5ub3cgaXMgbm90IGF2YWlsYWJsZSBpbiBicm93c2VycyA8IElFOVxuICAgIC8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0RhdGUvbm93I0NvbXBhdGliaWxpdHlcbiAgICB2YXIgbm93ID0gRGF0ZS5ub3cgfHwgZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTsgfTtcblxuXG4gICAgX19leHBvcnRzX18ub2JqZWN0T3JGdW5jdGlvbiA9IG9iamVjdE9yRnVuY3Rpb247XG4gICAgX19leHBvcnRzX18uaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG4gICAgX19leHBvcnRzX18uaXNBcnJheSA9IGlzQXJyYXk7XG4gICAgX19leHBvcnRzX18ubm93ID0gbm93O1xuICB9KTtcbnJlcXVpcmVNb2R1bGUoJ3Byb21pc2UvcG9seWZpbGwnKS5wb2x5ZmlsbCgpO1xufSgpKTsoZnVuY3Rpb24gd2VicGFja1VuaXZlcnNhbE1vZHVsZURlZmluaXRpb24ocm9vdCwgZmFjdG9yeSkge1xuXHRpZih0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcpXG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG5cdGVsc2UgaWYodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKVxuXHRcdGRlZmluZShbXSwgZmFjdG9yeSk7XG5cdGVsc2UgaWYodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKVxuXHRcdGV4cG9ydHNbXCJsb2NhbGZvcmFnZVwiXSA9IGZhY3RvcnkoKTtcblx0ZWxzZVxuXHRcdHJvb3RbXCJsb2NhbGZvcmFnZVwiXSA9IGZhY3RvcnkoKTtcbn0pKHRoaXMsIGZ1bmN0aW9uKCkge1xucmV0dXJuIC8qKioqKiovIChmdW5jdGlvbihtb2R1bGVzKSB7IC8vIHdlYnBhY2tCb290c3RyYXBcbi8qKioqKiovIFx0Ly8gVGhlIG1vZHVsZSBjYWNoZVxuLyoqKioqKi8gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4vKioqKioqLyBcdC8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG4vKioqKioqLyBcdGZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblxuLyoqKioqKi8gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuLyoqKioqKi8gXHRcdGlmKGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdKVxuLyoqKioqKi8gXHRcdFx0cmV0dXJuIGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdLmV4cG9ydHM7XG5cbi8qKioqKiovIFx0XHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuLyoqKioqKi8gXHRcdHZhciBtb2R1bGUgPSBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSA9IHtcbi8qKioqKiovIFx0XHRcdGV4cG9ydHM6IHt9LFxuLyoqKioqKi8gXHRcdFx0aWQ6IG1vZHVsZUlkLFxuLyoqKioqKi8gXHRcdFx0bG9hZGVkOiBmYWxzZVxuLyoqKioqKi8gXHRcdH07XG5cbi8qKioqKiovIFx0XHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cbi8qKioqKiovIFx0XHRtb2R1bGVzW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuLyoqKioqKi8gXHRcdC8vIEZsYWcgdGhlIG1vZHVsZSBhcyBsb2FkZWRcbi8qKioqKiovIFx0XHRtb2R1bGUubG9hZGVkID0gdHJ1ZTtcblxuLyoqKioqKi8gXHRcdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG4vKioqKioqLyBcdFx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuLyoqKioqKi8gXHR9XG5cblxuLyoqKioqKi8gXHQvLyBleHBvc2UgdGhlIG1vZHVsZXMgb2JqZWN0IChfX3dlYnBhY2tfbW9kdWxlc19fKVxuLyoqKioqKi8gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBtb2R1bGVzO1xuXG4vKioqKioqLyBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlIGNhY2hlXG4vKioqKioqLyBcdF9fd2VicGFja19yZXF1aXJlX18uYyA9IGluc3RhbGxlZE1vZHVsZXM7XG5cbi8qKioqKiovIFx0Ly8gX193ZWJwYWNrX3B1YmxpY19wYXRoX19cbi8qKioqKiovIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCJcIjtcblxuLyoqKioqKi8gXHQvLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbi8qKioqKiovIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oMCk7XG4vKioqKioqLyB9KVxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbi8qKioqKiovIChbXG4vKiAwICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0ZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxuXHRmdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoJ0Nhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvbicpOyB9IH1cblxuXHQoZnVuY3Rpb24gKCkge1xuXHQgICAgJ3VzZSBzdHJpY3QnO1xuXG5cdCAgICAvLyBDdXN0b20gZHJpdmVycyBhcmUgc3RvcmVkIGhlcmUgd2hlbiBgZGVmaW5lRHJpdmVyKClgIGlzIGNhbGxlZC5cblx0ICAgIC8vIFRoZXkgYXJlIHNoYXJlZCBhY3Jvc3MgYWxsIGluc3RhbmNlcyBvZiBsb2NhbEZvcmFnZS5cblx0ICAgIHZhciBDdXN0b21Ecml2ZXJzID0ge307XG5cblx0ICAgIHZhciBEcml2ZXJUeXBlID0ge1xuXHQgICAgICAgIElOREVYRUREQjogJ2FzeW5jU3RvcmFnZScsXG5cdCAgICAgICAgTE9DQUxTVE9SQUdFOiAnbG9jYWxTdG9yYWdlV3JhcHBlcicsXG5cdCAgICAgICAgV0VCU1FMOiAnd2ViU1FMU3RvcmFnZSdcblx0ICAgIH07XG5cblx0ICAgIHZhciBEZWZhdWx0RHJpdmVyT3JkZXIgPSBbRHJpdmVyVHlwZS5JTkRFWEVEREIsIERyaXZlclR5cGUuV0VCU1FMLCBEcml2ZXJUeXBlLkxPQ0FMU1RPUkFHRV07XG5cblx0ICAgIHZhciBMaWJyYXJ5TWV0aG9kcyA9IFsnY2xlYXInLCAnZ2V0SXRlbScsICdpdGVyYXRlJywgJ2tleScsICdrZXlzJywgJ2xlbmd0aCcsICdyZW1vdmVJdGVtJywgJ3NldEl0ZW0nXTtcblxuXHQgICAgdmFyIERlZmF1bHRDb25maWcgPSB7XG5cdCAgICAgICAgZGVzY3JpcHRpb246ICcnLFxuXHQgICAgICAgIGRyaXZlcjogRGVmYXVsdERyaXZlck9yZGVyLnNsaWNlKCksXG5cdCAgICAgICAgbmFtZTogJ2xvY2FsZm9yYWdlJyxcblx0ICAgICAgICAvLyBEZWZhdWx0IERCIHNpemUgaXMgX0pVU1QgVU5ERVJfIDVNQiwgYXMgaXQncyB0aGUgaGlnaGVzdCBzaXplXG5cdCAgICAgICAgLy8gd2UgY2FuIHVzZSB3aXRob3V0IGEgcHJvbXB0LlxuXHQgICAgICAgIHNpemU6IDQ5ODA3MzYsXG5cdCAgICAgICAgc3RvcmVOYW1lOiAna2V5dmFsdWVwYWlycycsXG5cdCAgICAgICAgdmVyc2lvbjogMS4wXG5cdCAgICB9O1xuXG5cdCAgICAvLyBDaGVjayB0byBzZWUgaWYgSW5kZXhlZERCIGlzIGF2YWlsYWJsZSBhbmQgaWYgaXQgaXMgdGhlIGxhdGVzdFxuXHQgICAgLy8gaW1wbGVtZW50YXRpb247IGl0J3Mgb3VyIHByZWZlcnJlZCBiYWNrZW5kIGxpYnJhcnkuIFdlIHVzZSBcIl9zcGVjX3Rlc3RcIlxuXHQgICAgLy8gYXMgdGhlIG5hbWUgb2YgdGhlIGRhdGFiYXNlIGJlY2F1c2UgaXQncyBub3QgdGhlIG9uZSB3ZSdsbCBvcGVyYXRlIG9uLFxuXHQgICAgLy8gYnV0IGl0J3MgdXNlZnVsIHRvIG1ha2Ugc3VyZSBpdHMgdXNpbmcgdGhlIHJpZ2h0IHNwZWMuXG5cdCAgICAvLyBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9tb3ppbGxhL2xvY2FsRm9yYWdlL2lzc3Vlcy8xMjhcblx0ICAgIHZhciBkcml2ZXJTdXBwb3J0ID0gKGZ1bmN0aW9uIChzZWxmKSB7XG5cdCAgICAgICAgLy8gSW5pdGlhbGl6ZSBJbmRleGVkREI7IGZhbGwgYmFjayB0byB2ZW5kb3ItcHJlZml4ZWQgdmVyc2lvbnNcblx0ICAgICAgICAvLyBpZiBuZWVkZWQuXG5cdCAgICAgICAgdmFyIGluZGV4ZWREQiA9IGluZGV4ZWREQiB8fCBzZWxmLmluZGV4ZWREQiB8fCBzZWxmLndlYmtpdEluZGV4ZWREQiB8fCBzZWxmLm1vekluZGV4ZWREQiB8fCBzZWxmLk9JbmRleGVkREIgfHwgc2VsZi5tc0luZGV4ZWREQjtcblxuXHQgICAgICAgIHZhciByZXN1bHQgPSB7fTtcblxuXHQgICAgICAgIHJlc3VsdFtEcml2ZXJUeXBlLldFQlNRTF0gPSAhIXNlbGYub3BlbkRhdGFiYXNlO1xuXHQgICAgICAgIHJlc3VsdFtEcml2ZXJUeXBlLklOREVYRUREQl0gPSAhIShmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgICAgIC8vIFdlIG1pbWljIFBvdWNoREIgaGVyZTsganVzdCBVQSB0ZXN0IGZvciBTYWZhcmkgKHdoaWNoLCBhcyBvZlxuXHQgICAgICAgICAgICAvLyBpT1MgOC9Zb3NlbWl0ZSwgZG9lc24ndCBwcm9wZXJseSBzdXBwb3J0IEluZGV4ZWREQikuXG5cdCAgICAgICAgICAgIC8vIEluZGV4ZWREQiBzdXBwb3J0IGlzIGJyb2tlbiBhbmQgZGlmZmVyZW50IGZyb20gQmxpbmsncy5cblx0ICAgICAgICAgICAgLy8gVGhpcyBpcyBmYXN0ZXIgdGhhbiB0aGUgdGVzdCBjYXNlIChhbmQgaXQncyBzeW5jKSwgc28gd2UganVzdFxuXHQgICAgICAgICAgICAvLyBkbyB0aGlzLiAqU0lHSCpcblx0ICAgICAgICAgICAgLy8gaHR0cDovL2JsLm9ja3Mub3JnL25vbGFubGF3c29uL3Jhdy9jODNlOTAzOWVkZjIyNzgwNDdlOS9cblx0ICAgICAgICAgICAgLy9cblx0ICAgICAgICAgICAgLy8gV2UgdGVzdCBmb3Igb3BlbkRhdGFiYXNlIGJlY2F1c2UgSUUgTW9iaWxlIGlkZW50aWZpZXMgaXRzZWxmXG5cdCAgICAgICAgICAgIC8vIGFzIFNhZmFyaS4gT2ggdGhlIGx1bHouLi5cblx0ICAgICAgICAgICAgaWYgKHR5cGVvZiBzZWxmLm9wZW5EYXRhYmFzZSAhPT0gJ3VuZGVmaW5lZCcgJiYgc2VsZi5uYXZpZ2F0b3IgJiYgc2VsZi5uYXZpZ2F0b3IudXNlckFnZW50ICYmIC9TYWZhcmkvLnRlc3Qoc2VsZi5uYXZpZ2F0b3IudXNlckFnZW50KSAmJiAhL0Nocm9tZS8udGVzdChzZWxmLm5hdmlnYXRvci51c2VyQWdlbnQpKSB7XG5cdCAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG5cdCAgICAgICAgICAgIH1cblx0ICAgICAgICAgICAgdHJ5IHtcblx0ICAgICAgICAgICAgICAgIHJldHVybiBpbmRleGVkREIgJiYgdHlwZW9mIGluZGV4ZWREQi5vcGVuID09PSAnZnVuY3Rpb24nICYmXG5cdCAgICAgICAgICAgICAgICAvLyBTb21lIFNhbXN1bmcvSFRDIEFuZHJvaWQgNC4wLTQuMyBkZXZpY2VzXG5cdCAgICAgICAgICAgICAgICAvLyBoYXZlIG9sZGVyIEluZGV4ZWREQiBzcGVjczsgaWYgdGhpcyBpc24ndCBhdmFpbGFibGVcblx0ICAgICAgICAgICAgICAgIC8vIHRoZWlyIEluZGV4ZWREQiBpcyB0b28gb2xkIGZvciB1cyB0byB1c2UuXG5cdCAgICAgICAgICAgICAgICAvLyAoUmVwbGFjZXMgdGhlIG9udXBncmFkZW5lZWRlZCB0ZXN0Lilcblx0ICAgICAgICAgICAgICAgIHR5cGVvZiBzZWxmLklEQktleVJhbmdlICE9PSAndW5kZWZpbmVkJztcblx0ICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuXHQgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuXHQgICAgICAgICAgICB9XG5cdCAgICAgICAgfSkoKTtcblxuXHQgICAgICAgIHJlc3VsdFtEcml2ZXJUeXBlLkxPQ0FMU1RPUkFHRV0gPSAhIShmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgICAgIHRyeSB7XG5cdCAgICAgICAgICAgICAgICByZXR1cm4gc2VsZi5sb2NhbFN0b3JhZ2UgJiYgJ3NldEl0ZW0nIGluIHNlbGYubG9jYWxTdG9yYWdlICYmIHNlbGYubG9jYWxTdG9yYWdlLnNldEl0ZW07XG5cdCAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcblx0ICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcblx0ICAgICAgICAgICAgfVxuXHQgICAgICAgIH0pKCk7XG5cblx0ICAgICAgICByZXR1cm4gcmVzdWx0O1xuXHQgICAgfSkodGhpcyk7XG5cblx0ICAgIHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoYXJnKSB7XG5cdCAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhcmcpID09PSAnW29iamVjdCBBcnJheV0nO1xuXHQgICAgfTtcblxuXHQgICAgZnVuY3Rpb24gY2FsbFdoZW5SZWFkeShsb2NhbEZvcmFnZUluc3RhbmNlLCBsaWJyYXJ5TWV0aG9kKSB7XG5cdCAgICAgICAgbG9jYWxGb3JhZ2VJbnN0YW5jZVtsaWJyYXJ5TWV0aG9kXSA9IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgdmFyIF9hcmdzID0gYXJndW1lbnRzO1xuXHQgICAgICAgICAgICByZXR1cm4gbG9jYWxGb3JhZ2VJbnN0YW5jZS5yZWFkeSgpLnRoZW4oZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICAgICAgcmV0dXJuIGxvY2FsRm9yYWdlSW5zdGFuY2VbbGlicmFyeU1ldGhvZF0uYXBwbHkobG9jYWxGb3JhZ2VJbnN0YW5jZSwgX2FyZ3MpO1xuXHQgICAgICAgICAgICB9KTtcblx0ICAgICAgICB9O1xuXHQgICAgfVxuXG5cdCAgICBmdW5jdGlvbiBleHRlbmQoKSB7XG5cdCAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcblx0ICAgICAgICAgICAgdmFyIGFyZyA9IGFyZ3VtZW50c1tpXTtcblxuXHQgICAgICAgICAgICBpZiAoYXJnKSB7XG5cdCAgICAgICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gYXJnKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgaWYgKGFyZy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0FycmF5KGFyZ1trZXldKSkge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJndW1lbnRzWzBdW2tleV0gPSBhcmdba2V5XS5zbGljZSgpO1xuXHQgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJndW1lbnRzWzBdW2tleV0gPSBhcmdba2V5XTtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgfVxuXHQgICAgICAgICAgICAgICAgICAgIH1cblx0ICAgICAgICAgICAgICAgIH1cblx0ICAgICAgICAgICAgfVxuXHQgICAgICAgIH1cblxuXHQgICAgICAgIHJldHVybiBhcmd1bWVudHNbMF07XG5cdCAgICB9XG5cblx0ICAgIGZ1bmN0aW9uIGlzTGlicmFyeURyaXZlcihkcml2ZXJOYW1lKSB7XG5cdCAgICAgICAgZm9yICh2YXIgZHJpdmVyIGluIERyaXZlclR5cGUpIHtcblx0ICAgICAgICAgICAgaWYgKERyaXZlclR5cGUuaGFzT3duUHJvcGVydHkoZHJpdmVyKSAmJiBEcml2ZXJUeXBlW2RyaXZlcl0gPT09IGRyaXZlck5hbWUpIHtcblx0ICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuXHQgICAgICAgICAgICB9XG5cdCAgICAgICAgfVxuXG5cdCAgICAgICAgcmV0dXJuIGZhbHNlO1xuXHQgICAgfVxuXG5cdCAgICB2YXIgTG9jYWxGb3JhZ2UgPSAoZnVuY3Rpb24gKCkge1xuXHQgICAgICAgIGZ1bmN0aW9uIExvY2FsRm9yYWdlKG9wdGlvbnMpIHtcblx0ICAgICAgICAgICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIExvY2FsRm9yYWdlKTtcblxuXHQgICAgICAgICAgICB0aGlzLklOREVYRUREQiA9IERyaXZlclR5cGUuSU5ERVhFRERCO1xuXHQgICAgICAgICAgICB0aGlzLkxPQ0FMU1RPUkFHRSA9IERyaXZlclR5cGUuTE9DQUxTVE9SQUdFO1xuXHQgICAgICAgICAgICB0aGlzLldFQlNRTCA9IERyaXZlclR5cGUuV0VCU1FMO1xuXG5cdCAgICAgICAgICAgIHRoaXMuX2RlZmF1bHRDb25maWcgPSBleHRlbmQoe30sIERlZmF1bHRDb25maWcpO1xuXHQgICAgICAgICAgICB0aGlzLl9jb25maWcgPSBleHRlbmQoe30sIHRoaXMuX2RlZmF1bHRDb25maWcsIG9wdGlvbnMpO1xuXHQgICAgICAgICAgICB0aGlzLl9kcml2ZXJTZXQgPSBudWxsO1xuXHQgICAgICAgICAgICB0aGlzLl9pbml0RHJpdmVyID0gbnVsbDtcblx0ICAgICAgICAgICAgdGhpcy5fcmVhZHkgPSBmYWxzZTtcblx0ICAgICAgICAgICAgdGhpcy5fZGJJbmZvID0gbnVsbDtcblxuXHQgICAgICAgICAgICB0aGlzLl93cmFwTGlicmFyeU1ldGhvZHNXaXRoUmVhZHkoKTtcblx0ICAgICAgICAgICAgdGhpcy5zZXREcml2ZXIodGhpcy5fY29uZmlnLmRyaXZlcik7XG5cdCAgICAgICAgfVxuXG5cdCAgICAgICAgLy8gVGhlIGFjdHVhbCBsb2NhbEZvcmFnZSBvYmplY3QgdGhhdCB3ZSBleHBvc2UgYXMgYSBtb2R1bGUgb3IgdmlhIGFcblx0ICAgICAgICAvLyBnbG9iYWwuIEl0J3MgZXh0ZW5kZWQgYnkgcHVsbGluZyBpbiBvbmUgb2Ygb3VyIG90aGVyIGxpYnJhcmllcy5cblxuXHQgICAgICAgIC8vIFNldCBhbnkgY29uZmlnIHZhbHVlcyBmb3IgbG9jYWxGb3JhZ2U7IGNhbiBiZSBjYWxsZWQgYW55dGltZSBiZWZvcmVcblx0ICAgICAgICAvLyB0aGUgZmlyc3QgQVBJIGNhbGwgKGUuZy4gYGdldEl0ZW1gLCBgc2V0SXRlbWApLlxuXHQgICAgICAgIC8vIFdlIGxvb3AgdGhyb3VnaCBvcHRpb25zIHNvIHdlIGRvbid0IG92ZXJ3cml0ZSBleGlzdGluZyBjb25maWdcblx0ICAgICAgICAvLyB2YWx1ZXMuXG5cblx0ICAgICAgICBMb2NhbEZvcmFnZS5wcm90b3R5cGUuY29uZmlnID0gZnVuY3Rpb24gY29uZmlnKG9wdGlvbnMpIHtcblx0ICAgICAgICAgICAgLy8gSWYgdGhlIG9wdGlvbnMgYXJndW1lbnQgaXMgYW4gb2JqZWN0LCB3ZSB1c2UgaXQgdG8gc2V0IHZhbHVlcy5cblx0ICAgICAgICAgICAgLy8gT3RoZXJ3aXNlLCB3ZSByZXR1cm4gZWl0aGVyIGEgc3BlY2lmaWVkIGNvbmZpZyB2YWx1ZSBvciBhbGxcblx0ICAgICAgICAgICAgLy8gY29uZmlnIHZhbHVlcy5cblx0ICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnb2JqZWN0Jykge1xuXHQgICAgICAgICAgICAgICAgLy8gSWYgbG9jYWxmb3JhZ2UgaXMgcmVhZHkgYW5kIGZ1bGx5IGluaXRpYWxpemVkLCB3ZSBjYW4ndCBzZXRcblx0ICAgICAgICAgICAgICAgIC8vIGFueSBuZXcgY29uZmlndXJhdGlvbiB2YWx1ZXMuIEluc3RlYWQsIHdlIHJldHVybiBhbiBlcnJvci5cblx0ICAgICAgICAgICAgICAgIGlmICh0aGlzLl9yZWFkeSkge1xuXHQgICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgRXJyb3IoXCJDYW4ndCBjYWxsIGNvbmZpZygpIGFmdGVyIGxvY2FsZm9yYWdlIFwiICsgJ2hhcyBiZWVuIHVzZWQuJyk7XG5cdCAgICAgICAgICAgICAgICB9XG5cblx0ICAgICAgICAgICAgICAgIGZvciAodmFyIGkgaW4gb3B0aW9ucykge1xuXHQgICAgICAgICAgICAgICAgICAgIGlmIChpID09PSAnc3RvcmVOYW1lJykge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zW2ldID0gb3B0aW9uc1tpXS5yZXBsYWNlKC9cXFcvZywgJ18nKTtcblx0ICAgICAgICAgICAgICAgICAgICB9XG5cblx0ICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb25maWdbaV0gPSBvcHRpb25zW2ldO1xuXHQgICAgICAgICAgICAgICAgfVxuXG5cdCAgICAgICAgICAgICAgICAvLyBhZnRlciBhbGwgY29uZmlnIG9wdGlvbnMgYXJlIHNldCBhbmRcblx0ICAgICAgICAgICAgICAgIC8vIHRoZSBkcml2ZXIgb3B0aW9uIGlzIHVzZWQsIHRyeSBzZXR0aW5nIGl0XG5cdCAgICAgICAgICAgICAgICBpZiAoJ2RyaXZlcicgaW4gb3B0aW9ucyAmJiBvcHRpb25zLmRyaXZlcikge1xuXHQgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0RHJpdmVyKHRoaXMuX2NvbmZpZy5kcml2ZXIpO1xuXHQgICAgICAgICAgICAgICAgfVxuXG5cdCAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcblx0ICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ3N0cmluZycpIHtcblx0ICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9jb25maWdbb3B0aW9uc107XG5cdCAgICAgICAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fY29uZmlnO1xuXHQgICAgICAgICAgICB9XG5cdCAgICAgICAgfTtcblxuXHQgICAgICAgIC8vIFVzZWQgdG8gZGVmaW5lIGEgY3VzdG9tIGRyaXZlciwgc2hhcmVkIGFjcm9zcyBhbGwgaW5zdGFuY2VzIG9mXG5cdCAgICAgICAgLy8gbG9jYWxGb3JhZ2UuXG5cblx0ICAgICAgICBMb2NhbEZvcmFnZS5wcm90b3R5cGUuZGVmaW5lRHJpdmVyID0gZnVuY3Rpb24gZGVmaW5lRHJpdmVyKGRyaXZlck9iamVjdCwgY2FsbGJhY2ssIGVycm9yQ2FsbGJhY2spIHtcblx0ICAgICAgICAgICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdCAgICAgICAgICAgICAgICB0cnkge1xuXHQgICAgICAgICAgICAgICAgICAgIHZhciBkcml2ZXJOYW1lID0gZHJpdmVyT2JqZWN0Ll9kcml2ZXI7XG5cdCAgICAgICAgICAgICAgICAgICAgdmFyIGNvbXBsaWFuY2VFcnJvciA9IG5ldyBFcnJvcignQ3VzdG9tIGRyaXZlciBub3QgY29tcGxpYW50OyBzZWUgJyArICdodHRwczovL21vemlsbGEuZ2l0aHViLmlvL2xvY2FsRm9yYWdlLyNkZWZpbmVkcml2ZXInKTtcblx0ICAgICAgICAgICAgICAgICAgICB2YXIgbmFtaW5nRXJyb3IgPSBuZXcgRXJyb3IoJ0N1c3RvbSBkcml2ZXIgbmFtZSBhbHJlYWR5IGluIHVzZTogJyArIGRyaXZlck9iamVjdC5fZHJpdmVyKTtcblxuXHQgICAgICAgICAgICAgICAgICAgIC8vIEEgZHJpdmVyIG5hbWUgc2hvdWxkIGJlIGRlZmluZWQgYW5kIG5vdCBvdmVybGFwIHdpdGggdGhlXG5cdCAgICAgICAgICAgICAgICAgICAgLy8gbGlicmFyeS1kZWZpbmVkLCBkZWZhdWx0IGRyaXZlcnMuXG5cdCAgICAgICAgICAgICAgICAgICAgaWYgKCFkcml2ZXJPYmplY3QuX2RyaXZlcikge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoY29tcGxpYW5jZUVycm9yKTtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuXHQgICAgICAgICAgICAgICAgICAgIH1cblx0ICAgICAgICAgICAgICAgICAgICBpZiAoaXNMaWJyYXJ5RHJpdmVyKGRyaXZlck9iamVjdC5fZHJpdmVyKSkge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QobmFtaW5nRXJyb3IpO1xuXHQgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG5cdCAgICAgICAgICAgICAgICAgICAgfVxuXG5cdCAgICAgICAgICAgICAgICAgICAgdmFyIGN1c3RvbURyaXZlck1ldGhvZHMgPSBMaWJyYXJ5TWV0aG9kcy5jb25jYXQoJ19pbml0U3RvcmFnZScpO1xuXHQgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY3VzdG9tRHJpdmVyTWV0aG9kcy5sZW5ndGg7IGkrKykge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY3VzdG9tRHJpdmVyTWV0aG9kID0gY3VzdG9tRHJpdmVyTWV0aG9kc1tpXTtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFjdXN0b21Ecml2ZXJNZXRob2QgfHwgIWRyaXZlck9iamVjdFtjdXN0b21Ecml2ZXJNZXRob2RdIHx8IHR5cGVvZiBkcml2ZXJPYmplY3RbY3VzdG9tRHJpdmVyTWV0aG9kXSAhPT0gJ2Z1bmN0aW9uJykge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGNvbXBsaWFuY2VFcnJvcik7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG5cdCAgICAgICAgICAgICAgICAgICAgICAgIH1cblx0ICAgICAgICAgICAgICAgICAgICB9XG5cblx0ICAgICAgICAgICAgICAgICAgICB2YXIgc3VwcG9ydFByb21pc2UgPSBQcm9taXNlLnJlc29sdmUodHJ1ZSk7XG5cdCAgICAgICAgICAgICAgICAgICAgaWYgKCdfc3VwcG9ydCcgaW4gZHJpdmVyT2JqZWN0KSB7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkcml2ZXJPYmplY3QuX3N1cHBvcnQgJiYgdHlwZW9mIGRyaXZlck9iamVjdC5fc3VwcG9ydCA9PT0gJ2Z1bmN0aW9uJykge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VwcG9ydFByb21pc2UgPSBkcml2ZXJPYmplY3QuX3N1cHBvcnQoKTtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1cHBvcnRQcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKCEhZHJpdmVyT2JqZWN0Ll9zdXBwb3J0KTtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgfVxuXHQgICAgICAgICAgICAgICAgICAgIH1cblxuXHQgICAgICAgICAgICAgICAgICAgIHN1cHBvcnRQcm9taXNlLnRoZW4oZnVuY3Rpb24gKHN1cHBvcnRSZXN1bHQpIHtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgZHJpdmVyU3VwcG9ydFtkcml2ZXJOYW1lXSA9IHN1cHBvcnRSZXN1bHQ7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgIEN1c3RvbURyaXZlcnNbZHJpdmVyTmFtZV0gPSBkcml2ZXJPYmplY3Q7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcblx0ICAgICAgICAgICAgICAgICAgICB9LCByZWplY3QpO1xuXHQgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuXHQgICAgICAgICAgICAgICAgICAgIHJlamVjdChlKTtcblx0ICAgICAgICAgICAgICAgIH1cblx0ICAgICAgICAgICAgfSk7XG5cblx0ICAgICAgICAgICAgcHJvbWlzZS50aGVuKGNhbGxiYWNrLCBlcnJvckNhbGxiYWNrKTtcblx0ICAgICAgICAgICAgcmV0dXJuIHByb21pc2U7XG5cdCAgICAgICAgfTtcblxuXHQgICAgICAgIExvY2FsRm9yYWdlLnByb3RvdHlwZS5kcml2ZXIgPSBmdW5jdGlvbiBkcml2ZXIoKSB7XG5cdCAgICAgICAgICAgIHJldHVybiB0aGlzLl9kcml2ZXIgfHwgbnVsbDtcblx0ICAgICAgICB9O1xuXG5cdCAgICAgICAgTG9jYWxGb3JhZ2UucHJvdG90eXBlLmdldERyaXZlciA9IGZ1bmN0aW9uIGdldERyaXZlcihkcml2ZXJOYW1lLCBjYWxsYmFjaywgZXJyb3JDYWxsYmFjaykge1xuXHQgICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cdCAgICAgICAgICAgIHZhciBnZXREcml2ZXJQcm9taXNlID0gKGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgICAgIGlmIChpc0xpYnJhcnlEcml2ZXIoZHJpdmVyTmFtZSkpIHtcblx0ICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGRyaXZlck5hbWUpIHtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBzZWxmLklOREVYRUREQjpcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShfX3dlYnBhY2tfcmVxdWlyZV9fKDEpKTtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXHQgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIHNlbGYuTE9DQUxTVE9SQUdFOlxuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKF9fd2VicGFja19yZXF1aXJlX18oMikpO1xuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgIGNhc2Ugc2VsZi5XRUJTUUw6XG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoX193ZWJwYWNrX3JlcXVpcmVfXyg0KSk7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblx0ICAgICAgICAgICAgICAgICAgICB9XG5cdCAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKEN1c3RvbURyaXZlcnNbZHJpdmVyTmFtZV0pIHtcblx0ICAgICAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKEN1c3RvbURyaXZlcnNbZHJpdmVyTmFtZV0pO1xuXHQgICAgICAgICAgICAgICAgfVxuXG5cdCAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKCdEcml2ZXIgbm90IGZvdW5kLicpKTtcblx0ICAgICAgICAgICAgfSkoKTtcblxuXHQgICAgICAgICAgICBnZXREcml2ZXJQcm9taXNlLnRoZW4oY2FsbGJhY2ssIGVycm9yQ2FsbGJhY2spO1xuXHQgICAgICAgICAgICByZXR1cm4gZ2V0RHJpdmVyUHJvbWlzZTtcblx0ICAgICAgICB9O1xuXG5cdCAgICAgICAgTG9jYWxGb3JhZ2UucHJvdG90eXBlLmdldFNlcmlhbGl6ZXIgPSBmdW5jdGlvbiBnZXRTZXJpYWxpemVyKGNhbGxiYWNrKSB7XG5cdCAgICAgICAgICAgIHZhciBzZXJpYWxpemVyUHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblx0ICAgICAgICAgICAgICAgIHJlc29sdmUoX193ZWJwYWNrX3JlcXVpcmVfXygzKSk7XG5cdCAgICAgICAgICAgIH0pO1xuXHQgICAgICAgICAgICBpZiAoY2FsbGJhY2sgJiYgdHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICAgICAgICAgICAgICBzZXJpYWxpemVyUHJvbWlzZS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcblx0ICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXN1bHQpO1xuXHQgICAgICAgICAgICAgICAgfSk7XG5cdCAgICAgICAgICAgIH1cblx0ICAgICAgICAgICAgcmV0dXJuIHNlcmlhbGl6ZXJQcm9taXNlO1xuXHQgICAgICAgIH07XG5cblx0ICAgICAgICBMb2NhbEZvcmFnZS5wcm90b3R5cGUucmVhZHkgPSBmdW5jdGlvbiByZWFkeShjYWxsYmFjaykge1xuXHQgICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cblx0ICAgICAgICAgICAgdmFyIHByb21pc2UgPSBzZWxmLl9kcml2ZXJTZXQudGhlbihmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgICAgICAgICBpZiAoc2VsZi5fcmVhZHkgPT09IG51bGwpIHtcblx0ICAgICAgICAgICAgICAgICAgICBzZWxmLl9yZWFkeSA9IHNlbGYuX2luaXREcml2ZXIoKTtcblx0ICAgICAgICAgICAgICAgIH1cblxuXHQgICAgICAgICAgICAgICAgcmV0dXJuIHNlbGYuX3JlYWR5O1xuXHQgICAgICAgICAgICB9KTtcblxuXHQgICAgICAgICAgICBwcm9taXNlLnRoZW4oY2FsbGJhY2ssIGNhbGxiYWNrKTtcblx0ICAgICAgICAgICAgcmV0dXJuIHByb21pc2U7XG5cdCAgICAgICAgfTtcblxuXHQgICAgICAgIExvY2FsRm9yYWdlLnByb3RvdHlwZS5zZXREcml2ZXIgPSBmdW5jdGlvbiBzZXREcml2ZXIoZHJpdmVycywgY2FsbGJhY2ssIGVycm9yQ2FsbGJhY2spIHtcblx0ICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG5cdCAgICAgICAgICAgIGlmICghaXNBcnJheShkcml2ZXJzKSkge1xuXHQgICAgICAgICAgICAgICAgZHJpdmVycyA9IFtkcml2ZXJzXTtcblx0ICAgICAgICAgICAgfVxuXG5cdCAgICAgICAgICAgIHZhciBzdXBwb3J0ZWREcml2ZXJzID0gdGhpcy5fZ2V0U3VwcG9ydGVkRHJpdmVycyhkcml2ZXJzKTtcblxuXHQgICAgICAgICAgICBmdW5jdGlvbiBzZXREcml2ZXJUb0NvbmZpZygpIHtcblx0ICAgICAgICAgICAgICAgIHNlbGYuX2NvbmZpZy5kcml2ZXIgPSBzZWxmLmRyaXZlcigpO1xuXHQgICAgICAgICAgICB9XG5cblx0ICAgICAgICAgICAgZnVuY3Rpb24gaW5pdERyaXZlcihzdXBwb3J0ZWREcml2ZXJzKSB7XG5cdCAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICAgICAgICAgIHZhciBjdXJyZW50RHJpdmVySW5kZXggPSAwO1xuXG5cdCAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gZHJpdmVyUHJvbWlzZUxvb3AoKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlIChjdXJyZW50RHJpdmVySW5kZXggPCBzdXBwb3J0ZWREcml2ZXJzLmxlbmd0aCkge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGRyaXZlck5hbWUgPSBzdXBwb3J0ZWREcml2ZXJzW2N1cnJlbnREcml2ZXJJbmRleF07XG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50RHJpdmVySW5kZXgrKztcblxuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fZGJJbmZvID0gbnVsbDtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3JlYWR5ID0gbnVsbDtcblxuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNlbGYuZ2V0RHJpdmVyKGRyaXZlck5hbWUpLnRoZW4oZnVuY3Rpb24gKGRyaXZlcikge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX2V4dGVuZChkcml2ZXIpO1xuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldERyaXZlclRvQ29uZmlnKCk7XG5cblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9yZWFkeSA9IHNlbGYuX2luaXRTdG9yYWdlKHNlbGYuX2NvbmZpZyk7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNlbGYuX3JlYWR5O1xuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlbJ2NhdGNoJ10oZHJpdmVyUHJvbWlzZUxvb3ApO1xuXHQgICAgICAgICAgICAgICAgICAgICAgICB9XG5cblx0ICAgICAgICAgICAgICAgICAgICAgICAgc2V0RHJpdmVyVG9Db25maWcoKTtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGVycm9yID0gbmV3IEVycm9yKCdObyBhdmFpbGFibGUgc3RvcmFnZSBtZXRob2QgZm91bmQuJyk7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX2RyaXZlclNldCA9IFByb21pc2UucmVqZWN0KGVycm9yKTtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNlbGYuX2RyaXZlclNldDtcblx0ICAgICAgICAgICAgICAgICAgICB9XG5cblx0ICAgICAgICAgICAgICAgICAgICByZXR1cm4gZHJpdmVyUHJvbWlzZUxvb3AoKTtcblx0ICAgICAgICAgICAgICAgIH07XG5cdCAgICAgICAgICAgIH1cblxuXHQgICAgICAgICAgICAvLyBUaGVyZSBtaWdodCBiZSBhIGRyaXZlciBpbml0aWFsaXphdGlvbiBpbiBwcm9ncmVzc1xuXHQgICAgICAgICAgICAvLyBzbyB3YWl0IGZvciBpdCB0byBmaW5pc2ggaW4gb3JkZXIgdG8gYXZvaWQgYSBwb3NzaWJsZVxuXHQgICAgICAgICAgICAvLyByYWNlIGNvbmRpdGlvbiB0byBzZXQgX2RiSW5mb1xuXHQgICAgICAgICAgICB2YXIgb2xkRHJpdmVyU2V0RG9uZSA9IHRoaXMuX2RyaXZlclNldCAhPT0gbnVsbCA/IHRoaXMuX2RyaXZlclNldFsnY2F0Y2gnXShmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG5cdCAgICAgICAgICAgIH0pIDogUHJvbWlzZS5yZXNvbHZlKCk7XG5cblx0ICAgICAgICAgICAgdGhpcy5fZHJpdmVyU2V0ID0gb2xkRHJpdmVyU2V0RG9uZS50aGVuKGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgICAgIHZhciBkcml2ZXJOYW1lID0gc3VwcG9ydGVkRHJpdmVyc1swXTtcblx0ICAgICAgICAgICAgICAgIHNlbGYuX2RiSW5mbyA9IG51bGw7XG5cdCAgICAgICAgICAgICAgICBzZWxmLl9yZWFkeSA9IG51bGw7XG5cblx0ICAgICAgICAgICAgICAgIHJldHVybiBzZWxmLmdldERyaXZlcihkcml2ZXJOYW1lKS50aGVuKGZ1bmN0aW9uIChkcml2ZXIpIHtcblx0ICAgICAgICAgICAgICAgICAgICBzZWxmLl9kcml2ZXIgPSBkcml2ZXIuX2RyaXZlcjtcblx0ICAgICAgICAgICAgICAgICAgICBzZXREcml2ZXJUb0NvbmZpZygpO1xuXHQgICAgICAgICAgICAgICAgICAgIHNlbGYuX3dyYXBMaWJyYXJ5TWV0aG9kc1dpdGhSZWFkeSgpO1xuXHQgICAgICAgICAgICAgICAgICAgIHNlbGYuX2luaXREcml2ZXIgPSBpbml0RHJpdmVyKHN1cHBvcnRlZERyaXZlcnMpO1xuXHQgICAgICAgICAgICAgICAgfSk7XG5cdCAgICAgICAgICAgIH0pWydjYXRjaCddKGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgICAgIHNldERyaXZlclRvQ29uZmlnKCk7XG5cdCAgICAgICAgICAgICAgICB2YXIgZXJyb3IgPSBuZXcgRXJyb3IoJ05vIGF2YWlsYWJsZSBzdG9yYWdlIG1ldGhvZCBmb3VuZC4nKTtcblx0ICAgICAgICAgICAgICAgIHNlbGYuX2RyaXZlclNldCA9IFByb21pc2UucmVqZWN0KGVycm9yKTtcblx0ICAgICAgICAgICAgICAgIHJldHVybiBzZWxmLl9kcml2ZXJTZXQ7XG5cdCAgICAgICAgICAgIH0pO1xuXG5cdCAgICAgICAgICAgIHRoaXMuX2RyaXZlclNldC50aGVuKGNhbGxiYWNrLCBlcnJvckNhbGxiYWNrKTtcblx0ICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2RyaXZlclNldDtcblx0ICAgICAgICB9O1xuXG5cdCAgICAgICAgTG9jYWxGb3JhZ2UucHJvdG90eXBlLnN1cHBvcnRzID0gZnVuY3Rpb24gc3VwcG9ydHMoZHJpdmVyTmFtZSkge1xuXHQgICAgICAgICAgICByZXR1cm4gISFkcml2ZXJTdXBwb3J0W2RyaXZlck5hbWVdO1xuXHQgICAgICAgIH07XG5cblx0ICAgICAgICBMb2NhbEZvcmFnZS5wcm90b3R5cGUuX2V4dGVuZCA9IGZ1bmN0aW9uIF9leHRlbmQobGlicmFyeU1ldGhvZHNBbmRQcm9wZXJ0aWVzKSB7XG5cdCAgICAgICAgICAgIGV4dGVuZCh0aGlzLCBsaWJyYXJ5TWV0aG9kc0FuZFByb3BlcnRpZXMpO1xuXHQgICAgICAgIH07XG5cblx0ICAgICAgICBMb2NhbEZvcmFnZS5wcm90b3R5cGUuX2dldFN1cHBvcnRlZERyaXZlcnMgPSBmdW5jdGlvbiBfZ2V0U3VwcG9ydGVkRHJpdmVycyhkcml2ZXJzKSB7XG5cdCAgICAgICAgICAgIHZhciBzdXBwb3J0ZWREcml2ZXJzID0gW107XG5cdCAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBkcml2ZXJzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG5cdCAgICAgICAgICAgICAgICB2YXIgZHJpdmVyTmFtZSA9IGRyaXZlcnNbaV07XG5cdCAgICAgICAgICAgICAgICBpZiAodGhpcy5zdXBwb3J0cyhkcml2ZXJOYW1lKSkge1xuXHQgICAgICAgICAgICAgICAgICAgIHN1cHBvcnRlZERyaXZlcnMucHVzaChkcml2ZXJOYW1lKTtcblx0ICAgICAgICAgICAgICAgIH1cblx0ICAgICAgICAgICAgfVxuXHQgICAgICAgICAgICByZXR1cm4gc3VwcG9ydGVkRHJpdmVycztcblx0ICAgICAgICB9O1xuXG5cdCAgICAgICAgTG9jYWxGb3JhZ2UucHJvdG90eXBlLl93cmFwTGlicmFyeU1ldGhvZHNXaXRoUmVhZHkgPSBmdW5jdGlvbiBfd3JhcExpYnJhcnlNZXRob2RzV2l0aFJlYWR5KCkge1xuXHQgICAgICAgICAgICAvLyBBZGQgYSBzdHViIGZvciBlYWNoIGRyaXZlciBBUEkgbWV0aG9kIHRoYXQgZGVsYXlzIHRoZSBjYWxsIHRvIHRoZVxuXHQgICAgICAgICAgICAvLyBjb3JyZXNwb25kaW5nIGRyaXZlciBtZXRob2QgdW50aWwgbG9jYWxGb3JhZ2UgaXMgcmVhZHkuIFRoZXNlIHN0dWJzXG5cdCAgICAgICAgICAgIC8vIHdpbGwgYmUgcmVwbGFjZWQgYnkgdGhlIGRyaXZlciBtZXRob2RzIGFzIHNvb24gYXMgdGhlIGRyaXZlciBpc1xuXHQgICAgICAgICAgICAvLyBsb2FkZWQsIHNvIHRoZXJlIGlzIG5vIHBlcmZvcm1hbmNlIGltcGFjdC5cblx0ICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBMaWJyYXJ5TWV0aG9kcy5sZW5ndGg7IGkrKykge1xuXHQgICAgICAgICAgICAgICAgY2FsbFdoZW5SZWFkeSh0aGlzLCBMaWJyYXJ5TWV0aG9kc1tpXSk7XG5cdCAgICAgICAgICAgIH1cblx0ICAgICAgICB9O1xuXG5cdCAgICAgICAgTG9jYWxGb3JhZ2UucHJvdG90eXBlLmNyZWF0ZUluc3RhbmNlID0gZnVuY3Rpb24gY3JlYXRlSW5zdGFuY2Uob3B0aW9ucykge1xuXHQgICAgICAgICAgICByZXR1cm4gbmV3IExvY2FsRm9yYWdlKG9wdGlvbnMpO1xuXHQgICAgICAgIH07XG5cblx0ICAgICAgICByZXR1cm4gTG9jYWxGb3JhZ2U7XG5cdCAgICB9KSgpO1xuXG5cdCAgICB2YXIgbG9jYWxGb3JhZ2UgPSBuZXcgTG9jYWxGb3JhZ2UoKTtcblxuXHQgICAgZXhwb3J0c1snZGVmYXVsdCddID0gbG9jYWxGb3JhZ2U7XG5cdH0pLmNhbGwodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiBzZWxmKTtcblx0bW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzWydkZWZhdWx0J107XG5cbi8qKiovIH0sXG4vKiAxICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMpIHtcblxuXHQvLyBTb21lIGNvZGUgb3JpZ2luYWxseSBmcm9tIGFzeW5jX3N0b3JhZ2UuanMgaW5cblx0Ly8gW0dhaWFdKGh0dHBzOi8vZ2l0aHViLmNvbS9tb3ppbGxhLWIyZy9nYWlhKS5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5cdChmdW5jdGlvbiAoKSB7XG5cdCAgICAndXNlIHN0cmljdCc7XG5cblx0ICAgIHZhciBnbG9iYWxPYmplY3QgPSB0aGlzO1xuXHQgICAgLy8gSW5pdGlhbGl6ZSBJbmRleGVkREI7IGZhbGwgYmFjayB0byB2ZW5kb3ItcHJlZml4ZWQgdmVyc2lvbnMgaWYgbmVlZGVkLlxuXHQgICAgdmFyIGluZGV4ZWREQiA9IGluZGV4ZWREQiB8fCB0aGlzLmluZGV4ZWREQiB8fCB0aGlzLndlYmtpdEluZGV4ZWREQiB8fCB0aGlzLm1vekluZGV4ZWREQiB8fCB0aGlzLk9JbmRleGVkREIgfHwgdGhpcy5tc0luZGV4ZWREQjtcblxuXHQgICAgLy8gSWYgSW5kZXhlZERCIGlzbid0IGF2YWlsYWJsZSwgd2UgZ2V0IG91dHRhIGhlcmUhXG5cdCAgICBpZiAoIWluZGV4ZWREQikge1xuXHQgICAgICAgIHJldHVybjtcblx0ICAgIH1cblxuXHQgICAgdmFyIERFVEVDVF9CTE9CX1NVUFBPUlRfU1RPUkUgPSAnbG9jYWwtZm9yYWdlLWRldGVjdC1ibG9iLXN1cHBvcnQnO1xuXHQgICAgdmFyIHN1cHBvcnRzQmxvYnM7XG5cdCAgICB2YXIgZGJDb250ZXh0cztcblxuXHQgICAgLy8gQWJzdHJhY3RzIGNvbnN0cnVjdGluZyBhIEJsb2Igb2JqZWN0LCBzbyBpdCBhbHNvIHdvcmtzIGluIG9sZGVyXG5cdCAgICAvLyBicm93c2VycyB0aGF0IGRvbid0IHN1cHBvcnQgdGhlIG5hdGl2ZSBCbG9iIGNvbnN0cnVjdG9yLiAoaS5lLlxuXHQgICAgLy8gb2xkIFF0V2ViS2l0IHZlcnNpb25zLCBhdCBsZWFzdCkuXG5cdCAgICBmdW5jdGlvbiBfY3JlYXRlQmxvYihwYXJ0cywgcHJvcGVydGllcykge1xuXHQgICAgICAgIHBhcnRzID0gcGFydHMgfHwgW107XG5cdCAgICAgICAgcHJvcGVydGllcyA9IHByb3BlcnRpZXMgfHwge307XG5cdCAgICAgICAgdHJ5IHtcblx0ICAgICAgICAgICAgcmV0dXJuIG5ldyBCbG9iKHBhcnRzLCBwcm9wZXJ0aWVzKTtcblx0ICAgICAgICB9IGNhdGNoIChlKSB7XG5cdCAgICAgICAgICAgIGlmIChlLm5hbWUgIT09ICdUeXBlRXJyb3InKSB7XG5cdCAgICAgICAgICAgICAgICB0aHJvdyBlO1xuXHQgICAgICAgICAgICB9XG5cdCAgICAgICAgICAgIHZhciBCbG9iQnVpbGRlciA9IGdsb2JhbE9iamVjdC5CbG9iQnVpbGRlciB8fCBnbG9iYWxPYmplY3QuTVNCbG9iQnVpbGRlciB8fCBnbG9iYWxPYmplY3QuTW96QmxvYkJ1aWxkZXIgfHwgZ2xvYmFsT2JqZWN0LldlYktpdEJsb2JCdWlsZGVyO1xuXHQgICAgICAgICAgICB2YXIgYnVpbGRlciA9IG5ldyBCbG9iQnVpbGRlcigpO1xuXHQgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgaSArPSAxKSB7XG5cdCAgICAgICAgICAgICAgICBidWlsZGVyLmFwcGVuZChwYXJ0c1tpXSk7XG5cdCAgICAgICAgICAgIH1cblx0ICAgICAgICAgICAgcmV0dXJuIGJ1aWxkZXIuZ2V0QmxvYihwcm9wZXJ0aWVzLnR5cGUpO1xuXHQgICAgICAgIH1cblx0ICAgIH1cblxuXHQgICAgLy8gVHJhbnNmb3JtIGEgYmluYXJ5IHN0cmluZyB0byBhbiBhcnJheSBidWZmZXIsIGJlY2F1c2Ugb3RoZXJ3aXNlXG5cdCAgICAvLyB3ZWlyZCBzdHVmZiBoYXBwZW5zIHdoZW4geW91IHRyeSB0byB3b3JrIHdpdGggdGhlIGJpbmFyeSBzdHJpbmcgZGlyZWN0bHkuXG5cdCAgICAvLyBJdCBpcyBrbm93bi5cblx0ICAgIC8vIEZyb20gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xNDk2NzY0Ny8gKGNvbnRpbnVlcyBvbiBuZXh0IGxpbmUpXG5cdCAgICAvLyBlbmNvZGUtZGVjb2RlLWltYWdlLXdpdGgtYmFzZTY0LWJyZWFrcy1pbWFnZSAoMjAxMy0wNC0yMSlcblx0ICAgIGZ1bmN0aW9uIF9iaW5TdHJpbmdUb0FycmF5QnVmZmVyKGJpbikge1xuXHQgICAgICAgIHZhciBsZW5ndGggPSBiaW4ubGVuZ3RoO1xuXHQgICAgICAgIHZhciBidWYgPSBuZXcgQXJyYXlCdWZmZXIobGVuZ3RoKTtcblx0ICAgICAgICB2YXIgYXJyID0gbmV3IFVpbnQ4QXJyYXkoYnVmKTtcblx0ICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICAgICAgICAgIGFycltpXSA9IGJpbi5jaGFyQ29kZUF0KGkpO1xuXHQgICAgICAgIH1cblx0ICAgICAgICByZXR1cm4gYnVmO1xuXHQgICAgfVxuXG5cdCAgICAvLyBGZXRjaCBhIGJsb2IgdXNpbmcgYWpheC4gVGhpcyByZXZlYWxzIGJ1Z3MgaW4gQ2hyb21lIDwgNDMuXG5cdCAgICAvLyBGb3IgZGV0YWlscyBvbiBhbGwgdGhpcyBqdW5rOlxuXHQgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL25vbGFubGF3c29uL3N0YXRlLW9mLWJpbmFyeS1kYXRhLWluLXRoZS1icm93c2VyI3JlYWRtZVxuXHQgICAgZnVuY3Rpb24gX2Jsb2JBamF4KHVybCkge1xuXHQgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdCAgICAgICAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0ICAgICAgICAgICAgeGhyLm9wZW4oJ0dFVCcsIHVybCk7XG5cdCAgICAgICAgICAgIHhoci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xuXHQgICAgICAgICAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcblxuXHQgICAgICAgICAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICAgICAgaWYgKHhoci5yZWFkeVN0YXRlICE9PSA0KSB7XG5cdCAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuXHQgICAgICAgICAgICAgICAgfVxuXHQgICAgICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT09IDIwMCkge1xuXHQgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNvbHZlKHtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2U6IHhoci5yZXNwb25zZSxcblx0ICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogeGhyLmdldFJlc3BvbnNlSGVhZGVyKCdDb250ZW50LVR5cGUnKVxuXHQgICAgICAgICAgICAgICAgICAgIH0pO1xuXHQgICAgICAgICAgICAgICAgfVxuXHQgICAgICAgICAgICAgICAgcmVqZWN0KHsgc3RhdHVzOiB4aHIuc3RhdHVzLCByZXNwb25zZTogeGhyLnJlc3BvbnNlIH0pO1xuXHQgICAgICAgICAgICB9O1xuXHQgICAgICAgICAgICB4aHIuc2VuZCgpO1xuXHQgICAgICAgIH0pO1xuXHQgICAgfVxuXG5cdCAgICAvL1xuXHQgICAgLy8gRGV0ZWN0IGJsb2Igc3VwcG9ydC4gQ2hyb21lIGRpZG4ndCBzdXBwb3J0IGl0IHVudGlsIHZlcnNpb24gMzguXG5cdCAgICAvLyBJbiB2ZXJzaW9uIDM3IHRoZXkgaGFkIGEgYnJva2VuIHZlcnNpb24gd2hlcmUgUE5HcyAoYW5kIHBvc3NpYmx5XG5cdCAgICAvLyBvdGhlciBiaW5hcnkgdHlwZXMpIGFyZW4ndCBzdG9yZWQgY29ycmVjdGx5LCBiZWNhdXNlIHdoZW4geW91IGZldGNoXG5cdCAgICAvLyB0aGVtLCB0aGUgY29udGVudCB0eXBlIGlzIGFsd2F5cyBudWxsLlxuXHQgICAgLy9cblx0ICAgIC8vIEZ1cnRoZXJtb3JlLCB0aGV5IGhhdmUgc29tZSBvdXRzdGFuZGluZyBidWdzIHdoZXJlIGJsb2JzIG9jY2FzaW9uYWxseVxuXHQgICAgLy8gYXJlIHJlYWQgYnkgRmlsZVJlYWRlciBhcyBudWxsLCBvciBieSBhamF4IGFzIDQwNHMuXG5cdCAgICAvL1xuXHQgICAgLy8gU2FkbHkgd2UgdXNlIHRoZSA0MDQgYnVnIHRvIGRldGVjdCB0aGUgRmlsZVJlYWRlciBidWcsIHNvIGlmIHRoZXlcblx0ICAgIC8vIGdldCBmaXhlZCBpbmRlcGVuZGVudGx5IGFuZCByZWxlYXNlZCBpbiBkaWZmZXJlbnQgdmVyc2lvbnMgb2YgQ2hyb21lLFxuXHQgICAgLy8gdGhlbiB0aGUgYnVnIGNvdWxkIGNvbWUgYmFjay4gU28gaXQncyB3b3J0aHdoaWxlIHRvIHdhdGNoIHRoZXNlIGlzc3Vlczpcblx0ICAgIC8vIDQwNCBidWc6IGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvY2hyb21pdW0vaXNzdWVzL2RldGFpbD9pZD00NDc5MTZcblx0ICAgIC8vIEZpbGVSZWFkZXIgYnVnOiBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL2Nocm9taXVtL2lzc3Vlcy9kZXRhaWw/aWQ9NDQ3ODM2XG5cdCAgICAvL1xuXHQgICAgZnVuY3Rpb24gX2NoZWNrQmxvYlN1cHBvcnRXaXRob3V0Q2FjaGluZyhpZGIpIHtcblx0ICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXHQgICAgICAgICAgICB2YXIgYmxvYiA9IF9jcmVhdGVCbG9iKFsnJ10sIHsgdHlwZTogJ2ltYWdlL3BuZycgfSk7XG5cdCAgICAgICAgICAgIHZhciB0eG4gPSBpZGIudHJhbnNhY3Rpb24oW0RFVEVDVF9CTE9CX1NVUFBPUlRfU1RPUkVdLCAncmVhZHdyaXRlJyk7XG5cdCAgICAgICAgICAgIHR4bi5vYmplY3RTdG9yZShERVRFQ1RfQkxPQl9TVVBQT1JUX1NUT1JFKS5wdXQoYmxvYiwgJ2tleScpO1xuXHQgICAgICAgICAgICB0eG4ub25jb21wbGV0ZSA9IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgICAgIC8vIGhhdmUgdG8gZG8gaXQgaW4gYSBzZXBhcmF0ZSB0cmFuc2FjdGlvbiwgZWxzZSB0aGUgY29ycmVjdFxuXHQgICAgICAgICAgICAgICAgLy8gY29udGVudCB0eXBlIGlzIGFsd2F5cyByZXR1cm5lZFxuXHQgICAgICAgICAgICAgICAgdmFyIGJsb2JUeG4gPSBpZGIudHJhbnNhY3Rpb24oW0RFVEVDVF9CTE9CX1NVUFBPUlRfU1RPUkVdLCAncmVhZHdyaXRlJyk7XG5cdCAgICAgICAgICAgICAgICB2YXIgZ2V0QmxvYlJlcSA9IGJsb2JUeG4ub2JqZWN0U3RvcmUoREVURUNUX0JMT0JfU1VQUE9SVF9TVE9SRSkuZ2V0KCdrZXknKTtcblx0ICAgICAgICAgICAgICAgIGdldEJsb2JSZXEub25lcnJvciA9IHJlamVjdDtcblx0ICAgICAgICAgICAgICAgIGdldEJsb2JSZXEub25zdWNjZXNzID0gZnVuY3Rpb24gKGUpIHtcblxuXHQgICAgICAgICAgICAgICAgICAgIHZhciBzdG9yZWRCbG9iID0gZS50YXJnZXQucmVzdWx0O1xuXHQgICAgICAgICAgICAgICAgICAgIHZhciB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKHN0b3JlZEJsb2IpO1xuXG5cdCAgICAgICAgICAgICAgICAgICAgX2Jsb2JBamF4KHVybCkudGhlbihmdW5jdGlvbiAocmVzKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoISEocmVzICYmIHJlcy50eXBlID09PSAnaW1hZ2UvcG5nJykpO1xuXHQgICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShmYWxzZSk7XG5cdCAgICAgICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgIFVSTC5yZXZva2VPYmplY3RVUkwodXJsKTtcblx0ICAgICAgICAgICAgICAgICAgICB9KTtcblx0ICAgICAgICAgICAgICAgIH07XG5cdCAgICAgICAgICAgIH07XG5cdCAgICAgICAgfSlbJ2NhdGNoJ10oZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICByZXR1cm4gZmFsc2U7IC8vIGVycm9yLCBzbyBhc3N1bWUgdW5zdXBwb3J0ZWRcblx0ICAgICAgICB9KTtcblx0ICAgIH1cblxuXHQgICAgZnVuY3Rpb24gX2NoZWNrQmxvYlN1cHBvcnQoaWRiKSB7XG5cdCAgICAgICAgaWYgKHR5cGVvZiBzdXBwb3J0c0Jsb2JzID09PSAnYm9vbGVhbicpIHtcblx0ICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShzdXBwb3J0c0Jsb2JzKTtcblx0ICAgICAgICB9XG5cdCAgICAgICAgcmV0dXJuIF9jaGVja0Jsb2JTdXBwb3J0V2l0aG91dENhY2hpbmcoaWRiKS50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuXHQgICAgICAgICAgICBzdXBwb3J0c0Jsb2JzID0gdmFsdWU7XG5cdCAgICAgICAgICAgIHJldHVybiBzdXBwb3J0c0Jsb2JzO1xuXHQgICAgICAgIH0pO1xuXHQgICAgfVxuXG5cdCAgICAvLyBlbmNvZGUgYSBibG9iIGZvciBpbmRleGVkZGIgZW5naW5lcyB0aGF0IGRvbid0IHN1cHBvcnQgYmxvYnNcblx0ICAgIGZ1bmN0aW9uIF9lbmNvZGVCbG9iKGJsb2IpIHtcblx0ICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXHQgICAgICAgICAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcblx0ICAgICAgICAgICAgcmVhZGVyLm9uZXJyb3IgPSByZWplY3Q7XG5cdCAgICAgICAgICAgIHJlYWRlci5vbmxvYWRlbmQgPSBmdW5jdGlvbiAoZSkge1xuXHQgICAgICAgICAgICAgICAgdmFyIGJhc2U2NCA9IGJ0b2EoZS50YXJnZXQucmVzdWx0IHx8ICcnKTtcblx0ICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuXHQgICAgICAgICAgICAgICAgICAgIF9fbG9jYWxfZm9yYWdlX2VuY29kZWRfYmxvYjogdHJ1ZSxcblx0ICAgICAgICAgICAgICAgICAgICBkYXRhOiBiYXNlNjQsXG5cdCAgICAgICAgICAgICAgICAgICAgdHlwZTogYmxvYi50eXBlXG5cdCAgICAgICAgICAgICAgICB9KTtcblx0ICAgICAgICAgICAgfTtcblx0ICAgICAgICAgICAgcmVhZGVyLnJlYWRBc0JpbmFyeVN0cmluZyhibG9iKTtcblx0ICAgICAgICB9KTtcblx0ICAgIH1cblxuXHQgICAgLy8gZGVjb2RlIGFuIGVuY29kZWQgYmxvYlxuXHQgICAgZnVuY3Rpb24gX2RlY29kZUJsb2IoZW5jb2RlZEJsb2IpIHtcblx0ICAgICAgICB2YXIgYXJyYXlCdWZmID0gX2JpblN0cmluZ1RvQXJyYXlCdWZmZXIoYXRvYihlbmNvZGVkQmxvYi5kYXRhKSk7XG5cdCAgICAgICAgcmV0dXJuIF9jcmVhdGVCbG9iKFthcnJheUJ1ZmZdLCB7IHR5cGU6IGVuY29kZWRCbG9iLnR5cGUgfSk7XG5cdCAgICB9XG5cblx0ICAgIC8vIGlzIHRoaXMgb25lIG9mIG91ciBmYW5jeSBlbmNvZGVkIGJsb2JzP1xuXHQgICAgZnVuY3Rpb24gX2lzRW5jb2RlZEJsb2IodmFsdWUpIHtcblx0ICAgICAgICByZXR1cm4gdmFsdWUgJiYgdmFsdWUuX19sb2NhbF9mb3JhZ2VfZW5jb2RlZF9ibG9iO1xuXHQgICAgfVxuXG5cdCAgICAvLyBPcGVuIHRoZSBJbmRleGVkREIgZGF0YWJhc2UgKGF1dG9tYXRpY2FsbHkgY3JlYXRlcyBvbmUgaWYgb25lIGRpZG4ndFxuXHQgICAgLy8gcHJldmlvdXNseSBleGlzdCksIHVzaW5nIGFueSBvcHRpb25zIHNldCBpbiB0aGUgY29uZmlnLlxuXHQgICAgZnVuY3Rpb24gX2luaXRTdG9yYWdlKG9wdGlvbnMpIHtcblx0ICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cdCAgICAgICAgdmFyIGRiSW5mbyA9IHtcblx0ICAgICAgICAgICAgZGI6IG51bGxcblx0ICAgICAgICB9O1xuXG5cdCAgICAgICAgaWYgKG9wdGlvbnMpIHtcblx0ICAgICAgICAgICAgZm9yICh2YXIgaSBpbiBvcHRpb25zKSB7XG5cdCAgICAgICAgICAgICAgICBkYkluZm9baV0gPSBvcHRpb25zW2ldO1xuXHQgICAgICAgICAgICB9XG5cdCAgICAgICAgfVxuXG5cdCAgICAgICAgLy8gSW5pdGlhbGl6ZSBhIHNpbmdsZXRvbiBjb250YWluZXIgZm9yIGFsbCBydW5uaW5nIGxvY2FsRm9yYWdlcy5cblx0ICAgICAgICBpZiAoIWRiQ29udGV4dHMpIHtcblx0ICAgICAgICAgICAgZGJDb250ZXh0cyA9IHt9O1xuXHQgICAgICAgIH1cblxuXHQgICAgICAgIC8vIEdldCB0aGUgY3VycmVudCBjb250ZXh0IG9mIHRoZSBkYXRhYmFzZTtcblx0ICAgICAgICB2YXIgZGJDb250ZXh0ID0gZGJDb250ZXh0c1tkYkluZm8ubmFtZV07XG5cblx0ICAgICAgICAvLyAuLi5vciBjcmVhdGUgYSBuZXcgY29udGV4dC5cblx0ICAgICAgICBpZiAoIWRiQ29udGV4dCkge1xuXHQgICAgICAgICAgICBkYkNvbnRleHQgPSB7XG5cdCAgICAgICAgICAgICAgICAvLyBSdW5uaW5nIGxvY2FsRm9yYWdlcyBzaGFyaW5nIGEgZGF0YWJhc2UuXG5cdCAgICAgICAgICAgICAgICBmb3JhZ2VzOiBbXSxcblx0ICAgICAgICAgICAgICAgIC8vIFNoYXJlZCBkYXRhYmFzZS5cblx0ICAgICAgICAgICAgICAgIGRiOiBudWxsXG5cdCAgICAgICAgICAgIH07XG5cdCAgICAgICAgICAgIC8vIFJlZ2lzdGVyIHRoZSBuZXcgY29udGV4dCBpbiB0aGUgZ2xvYmFsIGNvbnRhaW5lci5cblx0ICAgICAgICAgICAgZGJDb250ZXh0c1tkYkluZm8ubmFtZV0gPSBkYkNvbnRleHQ7XG5cdCAgICAgICAgfVxuXG5cdCAgICAgICAgLy8gUmVnaXN0ZXIgaXRzZWxmIGFzIGEgcnVubmluZyBsb2NhbEZvcmFnZSBpbiB0aGUgY3VycmVudCBjb250ZXh0LlxuXHQgICAgICAgIGRiQ29udGV4dC5mb3JhZ2VzLnB1c2godGhpcyk7XG5cblx0ICAgICAgICAvLyBDcmVhdGUgYW4gYXJyYXkgb2YgcmVhZGluZXNzIG9mIHRoZSByZWxhdGVkIGxvY2FsRm9yYWdlcy5cblx0ICAgICAgICB2YXIgcmVhZHlQcm9taXNlcyA9IFtdO1xuXG5cdCAgICAgICAgZnVuY3Rpb24gaWdub3JlRXJyb3JzKCkge1xuXHQgICAgICAgICAgICAvLyBEb24ndCBoYW5kbGUgZXJyb3JzIGhlcmUsXG5cdCAgICAgICAgICAgIC8vIGp1c3QgbWFrZXMgc3VyZSByZWxhdGVkIGxvY2FsRm9yYWdlcyBhcmVuJ3QgcGVuZGluZy5cblx0ICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuXHQgICAgICAgIH1cblxuXHQgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgZGJDb250ZXh0LmZvcmFnZXMubGVuZ3RoOyBqKyspIHtcblx0ICAgICAgICAgICAgdmFyIGZvcmFnZSA9IGRiQ29udGV4dC5mb3JhZ2VzW2pdO1xuXHQgICAgICAgICAgICBpZiAoZm9yYWdlICE9PSB0aGlzKSB7XG5cdCAgICAgICAgICAgICAgICAvLyBEb24ndCB3YWl0IGZvciBpdHNlbGYuLi5cblx0ICAgICAgICAgICAgICAgIHJlYWR5UHJvbWlzZXMucHVzaChmb3JhZ2UucmVhZHkoKVsnY2F0Y2gnXShpZ25vcmVFcnJvcnMpKTtcblx0ICAgICAgICAgICAgfVxuXHQgICAgICAgIH1cblxuXHQgICAgICAgIC8vIFRha2UgYSBzbmFwc2hvdCBvZiB0aGUgcmVsYXRlZCBsb2NhbEZvcmFnZXMuXG5cdCAgICAgICAgdmFyIGZvcmFnZXMgPSBkYkNvbnRleHQuZm9yYWdlcy5zbGljZSgwKTtcblxuXHQgICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGNvbm5lY3Rpb24gcHJvY2VzcyBvbmx5IHdoZW5cblx0ICAgICAgICAvLyBhbGwgdGhlIHJlbGF0ZWQgbG9jYWxGb3JhZ2VzIGFyZW4ndCBwZW5kaW5nLlxuXHQgICAgICAgIHJldHVybiBQcm9taXNlLmFsbChyZWFkeVByb21pc2VzKS50aGVuKGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgZGJJbmZvLmRiID0gZGJDb250ZXh0LmRiO1xuXHQgICAgICAgICAgICAvLyBHZXQgdGhlIGNvbm5lY3Rpb24gb3Igb3BlbiBhIG5ldyBvbmUgd2l0aG91dCB1cGdyYWRlLlxuXHQgICAgICAgICAgICByZXR1cm4gX2dldE9yaWdpbmFsQ29ubmVjdGlvbihkYkluZm8pO1xuXHQgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKGRiKSB7XG5cdCAgICAgICAgICAgIGRiSW5mby5kYiA9IGRiO1xuXHQgICAgICAgICAgICBpZiAoX2lzVXBncmFkZU5lZWRlZChkYkluZm8sIHNlbGYuX2RlZmF1bHRDb25maWcudmVyc2lvbikpIHtcblx0ICAgICAgICAgICAgICAgIC8vIFJlb3BlbiB0aGUgZGF0YWJhc2UgZm9yIHVwZ3JhZGluZy5cblx0ICAgICAgICAgICAgICAgIHJldHVybiBfZ2V0VXBncmFkZWRDb25uZWN0aW9uKGRiSW5mbyk7XG5cdCAgICAgICAgICAgIH1cblx0ICAgICAgICAgICAgcmV0dXJuIGRiO1xuXHQgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKGRiKSB7XG5cdCAgICAgICAgICAgIGRiSW5mby5kYiA9IGRiQ29udGV4dC5kYiA9IGRiO1xuXHQgICAgICAgICAgICBzZWxmLl9kYkluZm8gPSBkYkluZm87XG5cdCAgICAgICAgICAgIC8vIFNoYXJlIHRoZSBmaW5hbCBjb25uZWN0aW9uIGFtb25nc3QgcmVsYXRlZCBsb2NhbEZvcmFnZXMuXG5cdCAgICAgICAgICAgIGZvciAodmFyIGsgPSAwOyBrIDwgZm9yYWdlcy5sZW5ndGg7IGsrKykge1xuXHQgICAgICAgICAgICAgICAgdmFyIGZvcmFnZSA9IGZvcmFnZXNba107XG5cdCAgICAgICAgICAgICAgICBpZiAoZm9yYWdlICE9PSBzZWxmKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgLy8gU2VsZiBpcyBhbHJlYWR5IHVwLXRvLWRhdGUuXG5cdCAgICAgICAgICAgICAgICAgICAgZm9yYWdlLl9kYkluZm8uZGIgPSBkYkluZm8uZGI7XG5cdCAgICAgICAgICAgICAgICAgICAgZm9yYWdlLl9kYkluZm8udmVyc2lvbiA9IGRiSW5mby52ZXJzaW9uO1xuXHQgICAgICAgICAgICAgICAgfVxuXHQgICAgICAgICAgICB9XG5cdCAgICAgICAgfSk7XG5cdCAgICB9XG5cblx0ICAgIGZ1bmN0aW9uIF9nZXRPcmlnaW5hbENvbm5lY3Rpb24oZGJJbmZvKSB7XG5cdCAgICAgICAgcmV0dXJuIF9nZXRDb25uZWN0aW9uKGRiSW5mbywgZmFsc2UpO1xuXHQgICAgfVxuXG5cdCAgICBmdW5jdGlvbiBfZ2V0VXBncmFkZWRDb25uZWN0aW9uKGRiSW5mbykge1xuXHQgICAgICAgIHJldHVybiBfZ2V0Q29ubmVjdGlvbihkYkluZm8sIHRydWUpO1xuXHQgICAgfVxuXG5cdCAgICBmdW5jdGlvbiBfZ2V0Q29ubmVjdGlvbihkYkluZm8sIHVwZ3JhZGVOZWVkZWQpIHtcblx0ICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXHQgICAgICAgICAgICBpZiAoZGJJbmZvLmRiKSB7XG5cdCAgICAgICAgICAgICAgICBpZiAodXBncmFkZU5lZWRlZCkge1xuXHQgICAgICAgICAgICAgICAgICAgIGRiSW5mby5kYi5jbG9zZSgpO1xuXHQgICAgICAgICAgICAgICAgfSBlbHNlIHtcblx0ICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzb2x2ZShkYkluZm8uZGIpO1xuXHQgICAgICAgICAgICAgICAgfVxuXHQgICAgICAgICAgICB9XG5cblx0ICAgICAgICAgICAgdmFyIGRiQXJncyA9IFtkYkluZm8ubmFtZV07XG5cblx0ICAgICAgICAgICAgaWYgKHVwZ3JhZGVOZWVkZWQpIHtcblx0ICAgICAgICAgICAgICAgIGRiQXJncy5wdXNoKGRiSW5mby52ZXJzaW9uKTtcblx0ICAgICAgICAgICAgfVxuXG5cdCAgICAgICAgICAgIHZhciBvcGVucmVxID0gaW5kZXhlZERCLm9wZW4uYXBwbHkoaW5kZXhlZERCLCBkYkFyZ3MpO1xuXG5cdCAgICAgICAgICAgIGlmICh1cGdyYWRlTmVlZGVkKSB7XG5cdCAgICAgICAgICAgICAgICBvcGVucmVxLm9udXBncmFkZW5lZWRlZCA9IGZ1bmN0aW9uIChlKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgdmFyIGRiID0gb3BlbnJlcS5yZXN1bHQ7XG5cdCAgICAgICAgICAgICAgICAgICAgdHJ5IHtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgZGIuY3JlYXRlT2JqZWN0U3RvcmUoZGJJbmZvLnN0b3JlTmFtZSk7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlLm9sZFZlcnNpb24gPD0gMSkge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWRkZWQgd2hlbiBzdXBwb3J0IGZvciBibG9iIHNoaW1zIHdhcyBhZGRlZFxuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGIuY3JlYXRlT2JqZWN0U3RvcmUoREVURUNUX0JMT0JfU1VQUE9SVF9TVE9SRSk7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgIH1cblx0ICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChleCkge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXgubmFtZSA9PT0gJ0NvbnN0cmFpbnRFcnJvcicpIHtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbE9iamVjdC5jb25zb2xlLndhcm4oJ1RoZSBkYXRhYmFzZSBcIicgKyBkYkluZm8ubmFtZSArICdcIicgKyAnIGhhcyBiZWVuIHVwZ3JhZGVkIGZyb20gdmVyc2lvbiAnICsgZS5vbGRWZXJzaW9uICsgJyB0byB2ZXJzaW9uICcgKyBlLm5ld1ZlcnNpb24gKyAnLCBidXQgdGhlIHN0b3JhZ2UgXCInICsgZGJJbmZvLnN0b3JlTmFtZSArICdcIiBhbHJlYWR5IGV4aXN0cy4nKTtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IGV4O1xuXHQgICAgICAgICAgICAgICAgICAgICAgICB9XG5cdCAgICAgICAgICAgICAgICAgICAgfVxuXHQgICAgICAgICAgICAgICAgfTtcblx0ICAgICAgICAgICAgfVxuXG5cdCAgICAgICAgICAgIG9wZW5yZXEub25lcnJvciA9IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgICAgIHJlamVjdChvcGVucmVxLmVycm9yKTtcblx0ICAgICAgICAgICAgfTtcblxuXHQgICAgICAgICAgICBvcGVucmVxLm9uc3VjY2VzcyA9IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgICAgIHJlc29sdmUob3BlbnJlcS5yZXN1bHQpO1xuXHQgICAgICAgICAgICB9O1xuXHQgICAgICAgIH0pO1xuXHQgICAgfVxuXG5cdCAgICBmdW5jdGlvbiBfaXNVcGdyYWRlTmVlZGVkKGRiSW5mbywgZGVmYXVsdFZlcnNpb24pIHtcblx0ICAgICAgICBpZiAoIWRiSW5mby5kYikge1xuXHQgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcblx0ICAgICAgICB9XG5cblx0ICAgICAgICB2YXIgaXNOZXdTdG9yZSA9ICFkYkluZm8uZGIub2JqZWN0U3RvcmVOYW1lcy5jb250YWlucyhkYkluZm8uc3RvcmVOYW1lKTtcblx0ICAgICAgICB2YXIgaXNEb3duZ3JhZGUgPSBkYkluZm8udmVyc2lvbiA8IGRiSW5mby5kYi52ZXJzaW9uO1xuXHQgICAgICAgIHZhciBpc1VwZ3JhZGUgPSBkYkluZm8udmVyc2lvbiA+IGRiSW5mby5kYi52ZXJzaW9uO1xuXG5cdCAgICAgICAgaWYgKGlzRG93bmdyYWRlKSB7XG5cdCAgICAgICAgICAgIC8vIElmIHRoZSB2ZXJzaW9uIGlzIG5vdCB0aGUgZGVmYXVsdCBvbmVcblx0ICAgICAgICAgICAgLy8gdGhlbiB3YXJuIGZvciBpbXBvc3NpYmxlIGRvd25ncmFkZS5cblx0ICAgICAgICAgICAgaWYgKGRiSW5mby52ZXJzaW9uICE9PSBkZWZhdWx0VmVyc2lvbikge1xuXHQgICAgICAgICAgICAgICAgZ2xvYmFsT2JqZWN0LmNvbnNvbGUud2FybignVGhlIGRhdGFiYXNlIFwiJyArIGRiSW5mby5uYW1lICsgJ1wiJyArICcgY2FuXFwndCBiZSBkb3duZ3JhZGVkIGZyb20gdmVyc2lvbiAnICsgZGJJbmZvLmRiLnZlcnNpb24gKyAnIHRvIHZlcnNpb24gJyArIGRiSW5mby52ZXJzaW9uICsgJy4nKTtcblx0ICAgICAgICAgICAgfVxuXHQgICAgICAgICAgICAvLyBBbGlnbiB0aGUgdmVyc2lvbnMgdG8gcHJldmVudCBlcnJvcnMuXG5cdCAgICAgICAgICAgIGRiSW5mby52ZXJzaW9uID0gZGJJbmZvLmRiLnZlcnNpb247XG5cdCAgICAgICAgfVxuXG5cdCAgICAgICAgaWYgKGlzVXBncmFkZSB8fCBpc05ld1N0b3JlKSB7XG5cdCAgICAgICAgICAgIC8vIElmIHRoZSBzdG9yZSBpcyBuZXcgdGhlbiBpbmNyZW1lbnQgdGhlIHZlcnNpb24gKGlmIG5lZWRlZCkuXG5cdCAgICAgICAgICAgIC8vIFRoaXMgd2lsbCB0cmlnZ2VyIGFuIFwidXBncmFkZW5lZWRlZFwiIGV2ZW50IHdoaWNoIGlzIHJlcXVpcmVkXG5cdCAgICAgICAgICAgIC8vIGZvciBjcmVhdGluZyBhIHN0b3JlLlxuXHQgICAgICAgICAgICBpZiAoaXNOZXdTdG9yZSkge1xuXHQgICAgICAgICAgICAgICAgdmFyIGluY1ZlcnNpb24gPSBkYkluZm8uZGIudmVyc2lvbiArIDE7XG5cdCAgICAgICAgICAgICAgICBpZiAoaW5jVmVyc2lvbiA+IGRiSW5mby52ZXJzaW9uKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgZGJJbmZvLnZlcnNpb24gPSBpbmNWZXJzaW9uO1xuXHQgICAgICAgICAgICAgICAgfVxuXHQgICAgICAgICAgICB9XG5cblx0ICAgICAgICAgICAgcmV0dXJuIHRydWU7XG5cdCAgICAgICAgfVxuXG5cdCAgICAgICAgcmV0dXJuIGZhbHNlO1xuXHQgICAgfVxuXG5cdCAgICBmdW5jdGlvbiBnZXRJdGVtKGtleSwgY2FsbGJhY2spIHtcblx0ICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cblx0ICAgICAgICAvLyBDYXN0IHRoZSBrZXkgdG8gYSBzdHJpbmcsIGFzIHRoYXQncyBhbGwgd2UgY2FuIHNldCBhcyBhIGtleS5cblx0ICAgICAgICBpZiAodHlwZW9mIGtleSAhPT0gJ3N0cmluZycpIHtcblx0ICAgICAgICAgICAgZ2xvYmFsT2JqZWN0LmNvbnNvbGUud2FybihrZXkgKyAnIHVzZWQgYXMgYSBrZXksIGJ1dCBpdCBpcyBub3QgYSBzdHJpbmcuJyk7XG5cdCAgICAgICAgICAgIGtleSA9IFN0cmluZyhrZXkpO1xuXHQgICAgICAgIH1cblxuXHQgICAgICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXHQgICAgICAgICAgICBzZWxmLnJlYWR5KCkudGhlbihmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgICAgICAgICB2YXIgZGJJbmZvID0gc2VsZi5fZGJJbmZvO1xuXHQgICAgICAgICAgICAgICAgdmFyIHN0b3JlID0gZGJJbmZvLmRiLnRyYW5zYWN0aW9uKGRiSW5mby5zdG9yZU5hbWUsICdyZWFkb25seScpLm9iamVjdFN0b3JlKGRiSW5mby5zdG9yZU5hbWUpO1xuXHQgICAgICAgICAgICAgICAgdmFyIHJlcSA9IHN0b3JlLmdldChrZXkpO1xuXG5cdCAgICAgICAgICAgICAgICByZXEub25zdWNjZXNzID0gZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IHJlcS5yZXN1bHQ7XG5cdCAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBudWxsO1xuXHQgICAgICAgICAgICAgICAgICAgIH1cblx0ICAgICAgICAgICAgICAgICAgICBpZiAoX2lzRW5jb2RlZEJsb2IodmFsdWUpKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gX2RlY29kZUJsb2IodmFsdWUpO1xuXHQgICAgICAgICAgICAgICAgICAgIH1cblx0ICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHZhbHVlKTtcblx0ICAgICAgICAgICAgICAgIH07XG5cblx0ICAgICAgICAgICAgICAgIHJlcS5vbmVycm9yID0gZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXEuZXJyb3IpO1xuXHQgICAgICAgICAgICAgICAgfTtcblx0ICAgICAgICAgICAgfSlbJ2NhdGNoJ10ocmVqZWN0KTtcblx0ICAgICAgICB9KTtcblxuXHQgICAgICAgIGV4ZWN1dGVDYWxsYmFjayhwcm9taXNlLCBjYWxsYmFjayk7XG5cdCAgICAgICAgcmV0dXJuIHByb21pc2U7XG5cdCAgICB9XG5cblx0ICAgIC8vIEl0ZXJhdGUgb3ZlciBhbGwgaXRlbXMgc3RvcmVkIGluIGRhdGFiYXNlLlxuXHQgICAgZnVuY3Rpb24gaXRlcmF0ZShpdGVyYXRvciwgY2FsbGJhY2spIHtcblx0ICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cblx0ICAgICAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblx0ICAgICAgICAgICAgc2VsZi5yZWFkeSgpLnRoZW4oZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICAgICAgdmFyIGRiSW5mbyA9IHNlbGYuX2RiSW5mbztcblx0ICAgICAgICAgICAgICAgIHZhciBzdG9yZSA9IGRiSW5mby5kYi50cmFuc2FjdGlvbihkYkluZm8uc3RvcmVOYW1lLCAncmVhZG9ubHknKS5vYmplY3RTdG9yZShkYkluZm8uc3RvcmVOYW1lKTtcblxuXHQgICAgICAgICAgICAgICAgdmFyIHJlcSA9IHN0b3JlLm9wZW5DdXJzb3IoKTtcblx0ICAgICAgICAgICAgICAgIHZhciBpdGVyYXRpb25OdW1iZXIgPSAxO1xuXG5cdCAgICAgICAgICAgICAgICByZXEub25zdWNjZXNzID0gZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICAgICAgICAgIHZhciBjdXJzb3IgPSByZXEucmVzdWx0O1xuXG5cdCAgICAgICAgICAgICAgICAgICAgaWYgKGN1cnNvcikge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBjdXJzb3IudmFsdWU7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfaXNFbmNvZGVkQmxvYih2YWx1ZSkpIHtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gX2RlY29kZUJsb2IodmFsdWUpO1xuXHQgICAgICAgICAgICAgICAgICAgICAgICB9XG5cdCAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBpdGVyYXRvcih2YWx1ZSwgY3Vyc29yLmtleSwgaXRlcmF0aW9uTnVtYmVyKyspO1xuXG5cdCAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgIT09IHZvaWQgMCkge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuXHQgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3Vyc29yWydjb250aW51ZSddKCk7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgIH1cblx0ICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG5cdCAgICAgICAgICAgICAgICAgICAgfVxuXHQgICAgICAgICAgICAgICAgfTtcblxuXHQgICAgICAgICAgICAgICAgcmVxLm9uZXJyb3IgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlcS5lcnJvcik7XG5cdCAgICAgICAgICAgICAgICB9O1xuXHQgICAgICAgICAgICB9KVsnY2F0Y2gnXShyZWplY3QpO1xuXHQgICAgICAgIH0pO1xuXG5cdCAgICAgICAgZXhlY3V0ZUNhbGxiYWNrKHByb21pc2UsIGNhbGxiYWNrKTtcblxuXHQgICAgICAgIHJldHVybiBwcm9taXNlO1xuXHQgICAgfVxuXG5cdCAgICBmdW5jdGlvbiBzZXRJdGVtKGtleSwgdmFsdWUsIGNhbGxiYWNrKSB7XG5cdCAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG5cdCAgICAgICAgLy8gQ2FzdCB0aGUga2V5IHRvIGEgc3RyaW5nLCBhcyB0aGF0J3MgYWxsIHdlIGNhbiBzZXQgYXMgYSBrZXkuXG5cdCAgICAgICAgaWYgKHR5cGVvZiBrZXkgIT09ICdzdHJpbmcnKSB7XG5cdCAgICAgICAgICAgIGdsb2JhbE9iamVjdC5jb25zb2xlLndhcm4oa2V5ICsgJyB1c2VkIGFzIGEga2V5LCBidXQgaXQgaXMgbm90IGEgc3RyaW5nLicpO1xuXHQgICAgICAgICAgICBrZXkgPSBTdHJpbmcoa2V5KTtcblx0ICAgICAgICB9XG5cblx0ICAgICAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblx0ICAgICAgICAgICAgdmFyIGRiSW5mbztcblx0ICAgICAgICAgICAgc2VsZi5yZWFkeSgpLnRoZW4oZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICAgICAgZGJJbmZvID0gc2VsZi5fZGJJbmZvO1xuXHQgICAgICAgICAgICAgICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgQmxvYikge1xuXHQgICAgICAgICAgICAgICAgICAgIHJldHVybiBfY2hlY2tCbG9iU3VwcG9ydChkYkluZm8uZGIpLnRoZW4oZnVuY3Rpb24gKGJsb2JTdXBwb3J0KSB7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgIGlmIChibG9iU3VwcG9ydCkge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuXHQgICAgICAgICAgICAgICAgICAgICAgICB9XG5cdCAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBfZW5jb2RlQmxvYih2YWx1ZSk7XG5cdCAgICAgICAgICAgICAgICAgICAgfSk7XG5cdCAgICAgICAgICAgICAgICB9XG5cdCAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWU7XG5cdCAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG5cdCAgICAgICAgICAgICAgICB2YXIgdHJhbnNhY3Rpb24gPSBkYkluZm8uZGIudHJhbnNhY3Rpb24oZGJJbmZvLnN0b3JlTmFtZSwgJ3JlYWR3cml0ZScpO1xuXHQgICAgICAgICAgICAgICAgdmFyIHN0b3JlID0gdHJhbnNhY3Rpb24ub2JqZWN0U3RvcmUoZGJJbmZvLnN0b3JlTmFtZSk7XG5cblx0ICAgICAgICAgICAgICAgIC8vIFRoZSByZWFzb24gd2UgZG9uJ3QgX3NhdmVfIG51bGwgaXMgYmVjYXVzZSBJRSAxMCBkb2VzXG5cdCAgICAgICAgICAgICAgICAvLyBub3Qgc3VwcG9ydCBzYXZpbmcgdGhlIGBudWxsYCB0eXBlIGluIEluZGV4ZWREQi4gSG93XG5cdCAgICAgICAgICAgICAgICAvLyBpcm9uaWMsIGdpdmVuIHRoZSBidWcgYmVsb3chXG5cdCAgICAgICAgICAgICAgICAvLyBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9tb3ppbGxhL2xvY2FsRm9yYWdlL2lzc3Vlcy8xNjFcblx0ICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuXHQgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdW5kZWZpbmVkO1xuXHQgICAgICAgICAgICAgICAgfVxuXG5cdCAgICAgICAgICAgICAgICB2YXIgcmVxID0gc3RvcmUucHV0KHZhbHVlLCBrZXkpO1xuXHQgICAgICAgICAgICAgICAgdHJhbnNhY3Rpb24ub25jb21wbGV0ZSA9IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgICAgICAgICAvLyBDYXN0IHRvIHVuZGVmaW5lZCBzbyB0aGUgdmFsdWUgcGFzc2VkIHRvXG5cdCAgICAgICAgICAgICAgICAgICAgLy8gY2FsbGJhY2svcHJvbWlzZSBpcyB0aGUgc2FtZSBhcyB3aGF0IG9uZSB3b3VsZCBnZXQgb3V0XG5cdCAgICAgICAgICAgICAgICAgICAgLy8gb2YgYGdldEl0ZW0oKWAgbGF0ZXIuIFRoaXMgbGVhZHMgdG8gc29tZSB3ZWlyZG5lc3Ncblx0ICAgICAgICAgICAgICAgICAgICAvLyAoc2V0SXRlbSgnZm9vJywgdW5kZWZpbmVkKSB3aWxsIHJldHVybiBgbnVsbGApLCBidXRcblx0ICAgICAgICAgICAgICAgICAgICAvLyBpdCdzIG5vdCBteSBmYXVsdCBsb2NhbFN0b3JhZ2UgaXMgb3VyIGJhc2VsaW5lIGFuZCB0aGF0XG5cdCAgICAgICAgICAgICAgICAgICAgLy8gaXQncyB3ZWlyZC5cblx0ICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IG51bGw7XG5cdCAgICAgICAgICAgICAgICAgICAgfVxuXG5cdCAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh2YWx1ZSk7XG5cdCAgICAgICAgICAgICAgICB9O1xuXHQgICAgICAgICAgICAgICAgdHJhbnNhY3Rpb24ub25hYm9ydCA9IHRyYW5zYWN0aW9uLm9uZXJyb3IgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgdmFyIGVyciA9IHJlcS5lcnJvciA/IHJlcS5lcnJvciA6IHJlcS50cmFuc2FjdGlvbi5lcnJvcjtcblx0ICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcblx0ICAgICAgICAgICAgICAgIH07XG5cdCAgICAgICAgICAgIH0pWydjYXRjaCddKHJlamVjdCk7XG5cdCAgICAgICAgfSk7XG5cblx0ICAgICAgICBleGVjdXRlQ2FsbGJhY2socHJvbWlzZSwgY2FsbGJhY2spO1xuXHQgICAgICAgIHJldHVybiBwcm9taXNlO1xuXHQgICAgfVxuXG5cdCAgICBmdW5jdGlvbiByZW1vdmVJdGVtKGtleSwgY2FsbGJhY2spIHtcblx0ICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cblx0ICAgICAgICAvLyBDYXN0IHRoZSBrZXkgdG8gYSBzdHJpbmcsIGFzIHRoYXQncyBhbGwgd2UgY2FuIHNldCBhcyBhIGtleS5cblx0ICAgICAgICBpZiAodHlwZW9mIGtleSAhPT0gJ3N0cmluZycpIHtcblx0ICAgICAgICAgICAgZ2xvYmFsT2JqZWN0LmNvbnNvbGUud2FybihrZXkgKyAnIHVzZWQgYXMgYSBrZXksIGJ1dCBpdCBpcyBub3QgYSBzdHJpbmcuJyk7XG5cdCAgICAgICAgICAgIGtleSA9IFN0cmluZyhrZXkpO1xuXHQgICAgICAgIH1cblxuXHQgICAgICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXHQgICAgICAgICAgICBzZWxmLnJlYWR5KCkudGhlbihmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgICAgICAgICB2YXIgZGJJbmZvID0gc2VsZi5fZGJJbmZvO1xuXHQgICAgICAgICAgICAgICAgdmFyIHRyYW5zYWN0aW9uID0gZGJJbmZvLmRiLnRyYW5zYWN0aW9uKGRiSW5mby5zdG9yZU5hbWUsICdyZWFkd3JpdGUnKTtcblx0ICAgICAgICAgICAgICAgIHZhciBzdG9yZSA9IHRyYW5zYWN0aW9uLm9iamVjdFN0b3JlKGRiSW5mby5zdG9yZU5hbWUpO1xuXG5cdCAgICAgICAgICAgICAgICAvLyBXZSB1c2UgYSBHcnVudCB0YXNrIHRvIG1ha2UgdGhpcyBzYWZlIGZvciBJRSBhbmQgc29tZVxuXHQgICAgICAgICAgICAgICAgLy8gdmVyc2lvbnMgb2YgQW5kcm9pZCAoaW5jbHVkaW5nIHRob3NlIHVzZWQgYnkgQ29yZG92YSkuXG5cdCAgICAgICAgICAgICAgICAvLyBOb3JtYWxseSBJRSB3b24ndCBsaWtlIGAuZGVsZXRlKClgIGFuZCB3aWxsIGluc2lzdCBvblxuXHQgICAgICAgICAgICAgICAgLy8gdXNpbmcgYFsnZGVsZXRlJ10oKWAsIGJ1dCB3ZSBoYXZlIGEgYnVpbGQgc3RlcCB0aGF0XG5cdCAgICAgICAgICAgICAgICAvLyBmaXhlcyB0aGlzIGZvciB1cyBub3cuXG5cdCAgICAgICAgICAgICAgICB2YXIgcmVxID0gc3RvcmVbJ2RlbGV0ZSddKGtleSk7XG5cdCAgICAgICAgICAgICAgICB0cmFuc2FjdGlvbi5vbmNvbXBsZXRlID0gZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcblx0ICAgICAgICAgICAgICAgIH07XG5cblx0ICAgICAgICAgICAgICAgIHRyYW5zYWN0aW9uLm9uZXJyb3IgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlcS5lcnJvcik7XG5cdCAgICAgICAgICAgICAgICB9O1xuXG5cdCAgICAgICAgICAgICAgICAvLyBUaGUgcmVxdWVzdCB3aWxsIGJlIGFsc28gYmUgYWJvcnRlZCBpZiB3ZSd2ZSBleGNlZWRlZCBvdXIgc3RvcmFnZVxuXHQgICAgICAgICAgICAgICAgLy8gc3BhY2UuXG5cdCAgICAgICAgICAgICAgICB0cmFuc2FjdGlvbi5vbmFib3J0ID0gZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICAgICAgICAgIHZhciBlcnIgPSByZXEuZXJyb3IgPyByZXEuZXJyb3IgOiByZXEudHJhbnNhY3Rpb24uZXJyb3I7XG5cdCAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG5cdCAgICAgICAgICAgICAgICB9O1xuXHQgICAgICAgICAgICB9KVsnY2F0Y2gnXShyZWplY3QpO1xuXHQgICAgICAgIH0pO1xuXG5cdCAgICAgICAgZXhlY3V0ZUNhbGxiYWNrKHByb21pc2UsIGNhbGxiYWNrKTtcblx0ICAgICAgICByZXR1cm4gcHJvbWlzZTtcblx0ICAgIH1cblxuXHQgICAgZnVuY3Rpb24gY2xlYXIoY2FsbGJhY2spIHtcblx0ICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cblx0ICAgICAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblx0ICAgICAgICAgICAgc2VsZi5yZWFkeSgpLnRoZW4oZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICAgICAgdmFyIGRiSW5mbyA9IHNlbGYuX2RiSW5mbztcblx0ICAgICAgICAgICAgICAgIHZhciB0cmFuc2FjdGlvbiA9IGRiSW5mby5kYi50cmFuc2FjdGlvbihkYkluZm8uc3RvcmVOYW1lLCAncmVhZHdyaXRlJyk7XG5cdCAgICAgICAgICAgICAgICB2YXIgc3RvcmUgPSB0cmFuc2FjdGlvbi5vYmplY3RTdG9yZShkYkluZm8uc3RvcmVOYW1lKTtcblx0ICAgICAgICAgICAgICAgIHZhciByZXEgPSBzdG9yZS5jbGVhcigpO1xuXG5cdCAgICAgICAgICAgICAgICB0cmFuc2FjdGlvbi5vbmNvbXBsZXRlID0gZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcblx0ICAgICAgICAgICAgICAgIH07XG5cblx0ICAgICAgICAgICAgICAgIHRyYW5zYWN0aW9uLm9uYWJvcnQgPSB0cmFuc2FjdGlvbi5vbmVycm9yID0gZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICAgICAgICAgIHZhciBlcnIgPSByZXEuZXJyb3IgPyByZXEuZXJyb3IgOiByZXEudHJhbnNhY3Rpb24uZXJyb3I7XG5cdCAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG5cdCAgICAgICAgICAgICAgICB9O1xuXHQgICAgICAgICAgICB9KVsnY2F0Y2gnXShyZWplY3QpO1xuXHQgICAgICAgIH0pO1xuXG5cdCAgICAgICAgZXhlY3V0ZUNhbGxiYWNrKHByb21pc2UsIGNhbGxiYWNrKTtcblx0ICAgICAgICByZXR1cm4gcHJvbWlzZTtcblx0ICAgIH1cblxuXHQgICAgZnVuY3Rpb24gbGVuZ3RoKGNhbGxiYWNrKSB7XG5cdCAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG5cdCAgICAgICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdCAgICAgICAgICAgIHNlbGYucmVhZHkoKS50aGVuKGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgICAgIHZhciBkYkluZm8gPSBzZWxmLl9kYkluZm87XG5cdCAgICAgICAgICAgICAgICB2YXIgc3RvcmUgPSBkYkluZm8uZGIudHJhbnNhY3Rpb24oZGJJbmZvLnN0b3JlTmFtZSwgJ3JlYWRvbmx5Jykub2JqZWN0U3RvcmUoZGJJbmZvLnN0b3JlTmFtZSk7XG5cdCAgICAgICAgICAgICAgICB2YXIgcmVxID0gc3RvcmUuY291bnQoKTtcblxuXHQgICAgICAgICAgICAgICAgcmVxLm9uc3VjY2VzcyA9IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlcS5yZXN1bHQpO1xuXHQgICAgICAgICAgICAgICAgfTtcblxuXHQgICAgICAgICAgICAgICAgcmVxLm9uZXJyb3IgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlcS5lcnJvcik7XG5cdCAgICAgICAgICAgICAgICB9O1xuXHQgICAgICAgICAgICB9KVsnY2F0Y2gnXShyZWplY3QpO1xuXHQgICAgICAgIH0pO1xuXG5cdCAgICAgICAgZXhlY3V0ZUNhbGxiYWNrKHByb21pc2UsIGNhbGxiYWNrKTtcblx0ICAgICAgICByZXR1cm4gcHJvbWlzZTtcblx0ICAgIH1cblxuXHQgICAgZnVuY3Rpb24ga2V5KG4sIGNhbGxiYWNrKSB7XG5cdCAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG5cdCAgICAgICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdCAgICAgICAgICAgIGlmIChuIDwgMCkge1xuXHQgICAgICAgICAgICAgICAgcmVzb2x2ZShudWxsKTtcblxuXHQgICAgICAgICAgICAgICAgcmV0dXJuO1xuXHQgICAgICAgICAgICB9XG5cblx0ICAgICAgICAgICAgc2VsZi5yZWFkeSgpLnRoZW4oZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICAgICAgdmFyIGRiSW5mbyA9IHNlbGYuX2RiSW5mbztcblx0ICAgICAgICAgICAgICAgIHZhciBzdG9yZSA9IGRiSW5mby5kYi50cmFuc2FjdGlvbihkYkluZm8uc3RvcmVOYW1lLCAncmVhZG9ubHknKS5vYmplY3RTdG9yZShkYkluZm8uc3RvcmVOYW1lKTtcblxuXHQgICAgICAgICAgICAgICAgdmFyIGFkdmFuY2VkID0gZmFsc2U7XG5cdCAgICAgICAgICAgICAgICB2YXIgcmVxID0gc3RvcmUub3BlbkN1cnNvcigpO1xuXHQgICAgICAgICAgICAgICAgcmVxLm9uc3VjY2VzcyA9IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgICAgICAgICB2YXIgY3Vyc29yID0gcmVxLnJlc3VsdDtcblx0ICAgICAgICAgICAgICAgICAgICBpZiAoIWN1cnNvcikge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGlzIG1lYW5zIHRoZXJlIHdlcmVuJ3QgZW5vdWdoIGtleXNcblx0ICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShudWxsKTtcblxuXHQgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG5cdCAgICAgICAgICAgICAgICAgICAgfVxuXG5cdCAgICAgICAgICAgICAgICAgICAgaWYgKG4gPT09IDApIHtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2UgaGF2ZSB0aGUgZmlyc3Qga2V5LCByZXR1cm4gaXQgaWYgdGhhdCdzIHdoYXQgdGhleVxuXHQgICAgICAgICAgICAgICAgICAgICAgICAvLyB3YW50ZWQuXG5cdCAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoY3Vyc29yLmtleSk7XG5cdCAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFhZHZhbmNlZCkge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gT3RoZXJ3aXNlLCBhc2sgdGhlIGN1cnNvciB0byBza2lwIGFoZWFkIG5cblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlY29yZHMuXG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZHZhbmNlZCA9IHRydWU7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJzb3IuYWR2YW5jZShuKTtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdoZW4gd2UgZ2V0IGhlcmUsIHdlJ3ZlIGdvdCB0aGUgbnRoIGtleS5cblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoY3Vyc29yLmtleSk7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgIH1cblx0ICAgICAgICAgICAgICAgICAgICB9XG5cdCAgICAgICAgICAgICAgICB9O1xuXG5cdCAgICAgICAgICAgICAgICByZXEub25lcnJvciA9IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgICAgICAgICByZWplY3QocmVxLmVycm9yKTtcblx0ICAgICAgICAgICAgICAgIH07XG5cdCAgICAgICAgICAgIH0pWydjYXRjaCddKHJlamVjdCk7XG5cdCAgICAgICAgfSk7XG5cblx0ICAgICAgICBleGVjdXRlQ2FsbGJhY2socHJvbWlzZSwgY2FsbGJhY2spO1xuXHQgICAgICAgIHJldHVybiBwcm9taXNlO1xuXHQgICAgfVxuXG5cdCAgICBmdW5jdGlvbiBrZXlzKGNhbGxiYWNrKSB7XG5cdCAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG5cdCAgICAgICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdCAgICAgICAgICAgIHNlbGYucmVhZHkoKS50aGVuKGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgICAgIHZhciBkYkluZm8gPSBzZWxmLl9kYkluZm87XG5cdCAgICAgICAgICAgICAgICB2YXIgc3RvcmUgPSBkYkluZm8uZGIudHJhbnNhY3Rpb24oZGJJbmZvLnN0b3JlTmFtZSwgJ3JlYWRvbmx5Jykub2JqZWN0U3RvcmUoZGJJbmZvLnN0b3JlTmFtZSk7XG5cblx0ICAgICAgICAgICAgICAgIHZhciByZXEgPSBzdG9yZS5vcGVuQ3Vyc29yKCk7XG5cdCAgICAgICAgICAgICAgICB2YXIga2V5cyA9IFtdO1xuXG5cdCAgICAgICAgICAgICAgICByZXEub25zdWNjZXNzID0gZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICAgICAgICAgIHZhciBjdXJzb3IgPSByZXEucmVzdWx0O1xuXG5cdCAgICAgICAgICAgICAgICAgICAgaWYgKCFjdXJzb3IpIHtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShrZXlzKTtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuXHQgICAgICAgICAgICAgICAgICAgIH1cblxuXHQgICAgICAgICAgICAgICAgICAgIGtleXMucHVzaChjdXJzb3Iua2V5KTtcblx0ICAgICAgICAgICAgICAgICAgICBjdXJzb3JbJ2NvbnRpbnVlJ10oKTtcblx0ICAgICAgICAgICAgICAgIH07XG5cblx0ICAgICAgICAgICAgICAgIHJlcS5vbmVycm9yID0gZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXEuZXJyb3IpO1xuXHQgICAgICAgICAgICAgICAgfTtcblx0ICAgICAgICAgICAgfSlbJ2NhdGNoJ10ocmVqZWN0KTtcblx0ICAgICAgICB9KTtcblxuXHQgICAgICAgIGV4ZWN1dGVDYWxsYmFjayhwcm9taXNlLCBjYWxsYmFjayk7XG5cdCAgICAgICAgcmV0dXJuIHByb21pc2U7XG5cdCAgICB9XG5cblx0ICAgIGZ1bmN0aW9uIGV4ZWN1dGVDYWxsYmFjayhwcm9taXNlLCBjYWxsYmFjaykge1xuXHQgICAgICAgIGlmIChjYWxsYmFjaykge1xuXHQgICAgICAgICAgICBwcm9taXNlLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuXHQgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0KTtcblx0ICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycm9yKSB7XG5cdCAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnJvcik7XG5cdCAgICAgICAgICAgIH0pO1xuXHQgICAgICAgIH1cblx0ICAgIH1cblxuXHQgICAgdmFyIGFzeW5jU3RvcmFnZSA9IHtcblx0ICAgICAgICBfZHJpdmVyOiAnYXN5bmNTdG9yYWdlJyxcblx0ICAgICAgICBfaW5pdFN0b3JhZ2U6IF9pbml0U3RvcmFnZSxcblx0ICAgICAgICBpdGVyYXRlOiBpdGVyYXRlLFxuXHQgICAgICAgIGdldEl0ZW06IGdldEl0ZW0sXG5cdCAgICAgICAgc2V0SXRlbTogc2V0SXRlbSxcblx0ICAgICAgICByZW1vdmVJdGVtOiByZW1vdmVJdGVtLFxuXHQgICAgICAgIGNsZWFyOiBjbGVhcixcblx0ICAgICAgICBsZW5ndGg6IGxlbmd0aCxcblx0ICAgICAgICBrZXk6IGtleSxcblx0ICAgICAgICBrZXlzOiBrZXlzXG5cdCAgICB9O1xuXG5cdCAgICBleHBvcnRzWydkZWZhdWx0J10gPSBhc3luY1N0b3JhZ2U7XG5cdH0pLmNhbGwodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiBzZWxmKTtcblx0bW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzWydkZWZhdWx0J107XG5cbi8qKiovIH0sXG4vKiAyICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQvLyBJZiBJbmRleGVkREIgaXNuJ3QgYXZhaWxhYmxlLCB3ZSdsbCBmYWxsIGJhY2sgdG8gbG9jYWxTdG9yYWdlLlxuXHQvLyBOb3RlIHRoYXQgdGhpcyB3aWxsIGhhdmUgY29uc2lkZXJhYmxlIHBlcmZvcm1hbmNlIGFuZCBzdG9yYWdlXG5cdC8vIHNpZGUtZWZmZWN0cyAoYWxsIGRhdGEgd2lsbCBiZSBzZXJpYWxpemVkIG9uIHNhdmUgYW5kIG9ubHkgZGF0YSB0aGF0XG5cdC8vIGNhbiBiZSBjb252ZXJ0ZWQgdG8gYSBzdHJpbmcgdmlhIGBKU09OLnN0cmluZ2lmeSgpYCB3aWxsIGJlIHNhdmVkKS5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5cdChmdW5jdGlvbiAoKSB7XG5cdCAgICAndXNlIHN0cmljdCc7XG5cblx0ICAgIHZhciBnbG9iYWxPYmplY3QgPSB0aGlzO1xuXHQgICAgdmFyIGxvY2FsU3RvcmFnZSA9IG51bGw7XG5cblx0ICAgIC8vIElmIHRoZSBhcHAgaXMgcnVubmluZyBpbnNpZGUgYSBHb29nbGUgQ2hyb21lIHBhY2thZ2VkIHdlYmFwcCwgb3Igc29tZVxuXHQgICAgLy8gb3RoZXIgY29udGV4dCB3aGVyZSBsb2NhbFN0b3JhZ2UgaXNuJ3QgYXZhaWxhYmxlLCB3ZSBkb24ndCB1c2Vcblx0ICAgIC8vIGxvY2FsU3RvcmFnZS4gVGhpcyBmZWF0dXJlIGRldGVjdGlvbiBpcyBwcmVmZXJyZWQgb3ZlciB0aGUgb2xkXG5cdCAgICAvLyBgaWYgKHdpbmRvdy5jaHJvbWUgJiYgd2luZG93LmNocm9tZS5ydW50aW1lKWAgY29kZS5cblx0ICAgIC8vIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL21vemlsbGEvbG9jYWxGb3JhZ2UvaXNzdWVzLzY4XG5cdCAgICB0cnkge1xuXHQgICAgICAgIC8vIElmIGxvY2FsU3RvcmFnZSBpc24ndCBhdmFpbGFibGUsIHdlIGdldCBvdXR0YSBoZXJlIVxuXHQgICAgICAgIC8vIFRoaXMgc2hvdWxkIGJlIGluc2lkZSBhIHRyeSBjYXRjaFxuXHQgICAgICAgIGlmICghdGhpcy5sb2NhbFN0b3JhZ2UgfHwgISgnc2V0SXRlbScgaW4gdGhpcy5sb2NhbFN0b3JhZ2UpKSB7XG5cdCAgICAgICAgICAgIHJldHVybjtcblx0ICAgICAgICB9XG5cdCAgICAgICAgLy8gSW5pdGlhbGl6ZSBsb2NhbFN0b3JhZ2UgYW5kIGNyZWF0ZSBhIHZhcmlhYmxlIHRvIHVzZSB0aHJvdWdob3V0XG5cdCAgICAgICAgLy8gdGhlIGNvZGUuXG5cdCAgICAgICAgbG9jYWxTdG9yYWdlID0gdGhpcy5sb2NhbFN0b3JhZ2U7XG5cdCAgICB9IGNhdGNoIChlKSB7XG5cdCAgICAgICAgcmV0dXJuO1xuXHQgICAgfVxuXG5cdCAgICAvLyBDb25maWcgdGhlIGxvY2FsU3RvcmFnZSBiYWNrZW5kLCB1c2luZyBvcHRpb25zIHNldCBpbiB0aGUgY29uZmlnLlxuXHQgICAgZnVuY3Rpb24gX2luaXRTdG9yYWdlKG9wdGlvbnMpIHtcblx0ICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cdCAgICAgICAgdmFyIGRiSW5mbyA9IHt9O1xuXHQgICAgICAgIGlmIChvcHRpb25zKSB7XG5cdCAgICAgICAgICAgIGZvciAodmFyIGkgaW4gb3B0aW9ucykge1xuXHQgICAgICAgICAgICAgICAgZGJJbmZvW2ldID0gb3B0aW9uc1tpXTtcblx0ICAgICAgICAgICAgfVxuXHQgICAgICAgIH1cblxuXHQgICAgICAgIGRiSW5mby5rZXlQcmVmaXggPSBkYkluZm8ubmFtZSArICcvJztcblxuXHQgICAgICAgIGlmIChkYkluZm8uc3RvcmVOYW1lICE9PSBzZWxmLl9kZWZhdWx0Q29uZmlnLnN0b3JlTmFtZSkge1xuXHQgICAgICAgICAgICBkYkluZm8ua2V5UHJlZml4ICs9IGRiSW5mby5zdG9yZU5hbWUgKyAnLyc7XG5cdCAgICAgICAgfVxuXG5cdCAgICAgICAgc2VsZi5fZGJJbmZvID0gZGJJbmZvO1xuXG5cdCAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblx0ICAgICAgICAgICAgcmVzb2x2ZShfX3dlYnBhY2tfcmVxdWlyZV9fKDMpKTtcblx0ICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChsaWIpIHtcblx0ICAgICAgICAgICAgZGJJbmZvLnNlcmlhbGl6ZXIgPSBsaWI7XG5cdCAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcblx0ICAgICAgICB9KTtcblx0ICAgIH1cblxuXHQgICAgLy8gUmVtb3ZlIGFsbCBrZXlzIGZyb20gdGhlIGRhdGFzdG9yZSwgZWZmZWN0aXZlbHkgZGVzdHJveWluZyBhbGwgZGF0YSBpblxuXHQgICAgLy8gdGhlIGFwcCdzIGtleS92YWx1ZSBzdG9yZSFcblx0ICAgIGZ1bmN0aW9uIGNsZWFyKGNhbGxiYWNrKSB7XG5cdCAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXHQgICAgICAgIHZhciBwcm9taXNlID0gc2VsZi5yZWFkeSgpLnRoZW4oZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICB2YXIga2V5UHJlZml4ID0gc2VsZi5fZGJJbmZvLmtleVByZWZpeDtcblxuXHQgICAgICAgICAgICBmb3IgKHZhciBpID0gbG9jYWxTdG9yYWdlLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG5cdCAgICAgICAgICAgICAgICB2YXIga2V5ID0gbG9jYWxTdG9yYWdlLmtleShpKTtcblxuXHQgICAgICAgICAgICAgICAgaWYgKGtleS5pbmRleE9mKGtleVByZWZpeCkgPT09IDApIHtcblx0ICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbShrZXkpO1xuXHQgICAgICAgICAgICAgICAgfVxuXHQgICAgICAgICAgICB9XG5cdCAgICAgICAgfSk7XG5cblx0ICAgICAgICBleGVjdXRlQ2FsbGJhY2socHJvbWlzZSwgY2FsbGJhY2spO1xuXHQgICAgICAgIHJldHVybiBwcm9taXNlO1xuXHQgICAgfVxuXG5cdCAgICAvLyBSZXRyaWV2ZSBhbiBpdGVtIGZyb20gdGhlIHN0b3JlLiBVbmxpa2UgdGhlIG9yaWdpbmFsIGFzeW5jX3N0b3JhZ2Vcblx0ICAgIC8vIGxpYnJhcnkgaW4gR2FpYSwgd2UgZG9uJ3QgbW9kaWZ5IHJldHVybiB2YWx1ZXMgYXQgYWxsLiBJZiBhIGtleSdzIHZhbHVlXG5cdCAgICAvLyBpcyBgdW5kZWZpbmVkYCwgd2UgcGFzcyB0aGF0IHZhbHVlIHRvIHRoZSBjYWxsYmFjayBmdW5jdGlvbi5cblx0ICAgIGZ1bmN0aW9uIGdldEl0ZW0oa2V5LCBjYWxsYmFjaykge1xuXHQgICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuXHQgICAgICAgIC8vIENhc3QgdGhlIGtleSB0byBhIHN0cmluZywgYXMgdGhhdCdzIGFsbCB3ZSBjYW4gc2V0IGFzIGEga2V5LlxuXHQgICAgICAgIGlmICh0eXBlb2Yga2V5ICE9PSAnc3RyaW5nJykge1xuXHQgICAgICAgICAgICBnbG9iYWxPYmplY3QuY29uc29sZS53YXJuKGtleSArICcgdXNlZCBhcyBhIGtleSwgYnV0IGl0IGlzIG5vdCBhIHN0cmluZy4nKTtcblx0ICAgICAgICAgICAga2V5ID0gU3RyaW5nKGtleSk7XG5cdCAgICAgICAgfVxuXG5cdCAgICAgICAgdmFyIHByb21pc2UgPSBzZWxmLnJlYWR5KCkudGhlbihmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgICAgIHZhciBkYkluZm8gPSBzZWxmLl9kYkluZm87XG5cdCAgICAgICAgICAgIHZhciByZXN1bHQgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShkYkluZm8ua2V5UHJlZml4ICsga2V5KTtcblxuXHQgICAgICAgICAgICAvLyBJZiBhIHJlc3VsdCB3YXMgZm91bmQsIHBhcnNlIGl0IGZyb20gdGhlIHNlcmlhbGl6ZWRcblx0ICAgICAgICAgICAgLy8gc3RyaW5nIGludG8gYSBKUyBvYmplY3QuIElmIHJlc3VsdCBpc24ndCB0cnV0aHksIHRoZSBrZXlcblx0ICAgICAgICAgICAgLy8gaXMgbGlrZWx5IHVuZGVmaW5lZCBhbmQgd2UnbGwgcGFzcyBpdCBzdHJhaWdodCB0byB0aGVcblx0ICAgICAgICAgICAgLy8gY2FsbGJhY2suXG5cdCAgICAgICAgICAgIGlmIChyZXN1bHQpIHtcblx0ICAgICAgICAgICAgICAgIHJlc3VsdCA9IGRiSW5mby5zZXJpYWxpemVyLmRlc2VyaWFsaXplKHJlc3VsdCk7XG5cdCAgICAgICAgICAgIH1cblxuXHQgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuXHQgICAgICAgIH0pO1xuXG5cdCAgICAgICAgZXhlY3V0ZUNhbGxiYWNrKHByb21pc2UsIGNhbGxiYWNrKTtcblx0ICAgICAgICByZXR1cm4gcHJvbWlzZTtcblx0ICAgIH1cblxuXHQgICAgLy8gSXRlcmF0ZSBvdmVyIGFsbCBpdGVtcyBpbiB0aGUgc3RvcmUuXG5cdCAgICBmdW5jdGlvbiBpdGVyYXRlKGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuXHQgICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuXHQgICAgICAgIHZhciBwcm9taXNlID0gc2VsZi5yZWFkeSgpLnRoZW4oZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICB2YXIgZGJJbmZvID0gc2VsZi5fZGJJbmZvO1xuXHQgICAgICAgICAgICB2YXIga2V5UHJlZml4ID0gZGJJbmZvLmtleVByZWZpeDtcblx0ICAgICAgICAgICAgdmFyIGtleVByZWZpeExlbmd0aCA9IGtleVByZWZpeC5sZW5ndGg7XG5cdCAgICAgICAgICAgIHZhciBsZW5ndGggPSBsb2NhbFN0b3JhZ2UubGVuZ3RoO1xuXG5cdCAgICAgICAgICAgIC8vIFdlIHVzZSBhIGRlZGljYXRlZCBpdGVyYXRvciBpbnN0ZWFkIG9mIHRoZSBgaWAgdmFyaWFibGUgYmVsb3dcblx0ICAgICAgICAgICAgLy8gc28gb3RoZXIga2V5cyB3ZSBmZXRjaCBpbiBsb2NhbFN0b3JhZ2UgYXJlbid0IGNvdW50ZWQgaW5cblx0ICAgICAgICAgICAgLy8gdGhlIGBpdGVyYXRpb25OdW1iZXJgIGFyZ3VtZW50IHBhc3NlZCB0byB0aGUgYGl0ZXJhdGUoKWBcblx0ICAgICAgICAgICAgLy8gY2FsbGJhY2suXG5cdCAgICAgICAgICAgIC8vXG5cdCAgICAgICAgICAgIC8vIFNlZTogZ2l0aHViLmNvbS9tb3ppbGxhL2xvY2FsRm9yYWdlL3B1bGwvNDM1I2Rpc2N1c3Npb25fcjM4MDYxNTMwXG5cdCAgICAgICAgICAgIHZhciBpdGVyYXRpb25OdW1iZXIgPSAxO1xuXG5cdCAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgICAgICAgICAgICAgIHZhciBrZXkgPSBsb2NhbFN0b3JhZ2Uua2V5KGkpO1xuXHQgICAgICAgICAgICAgICAgaWYgKGtleS5pbmRleE9mKGtleVByZWZpeCkgIT09IDApIHtcblx0ICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcblx0ICAgICAgICAgICAgICAgIH1cblx0ICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKGtleSk7XG5cblx0ICAgICAgICAgICAgICAgIC8vIElmIGEgcmVzdWx0IHdhcyBmb3VuZCwgcGFyc2UgaXQgZnJvbSB0aGUgc2VyaWFsaXplZFxuXHQgICAgICAgICAgICAgICAgLy8gc3RyaW5nIGludG8gYSBKUyBvYmplY3QuIElmIHJlc3VsdCBpc24ndCB0cnV0aHksIHRoZVxuXHQgICAgICAgICAgICAgICAgLy8ga2V5IGlzIGxpa2VseSB1bmRlZmluZWQgYW5kIHdlJ2xsIHBhc3MgaXQgc3RyYWlnaHRcblx0ICAgICAgICAgICAgICAgIC8vIHRvIHRoZSBpdGVyYXRvci5cblx0ICAgICAgICAgICAgICAgIGlmICh2YWx1ZSkge1xuXHQgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gZGJJbmZvLnNlcmlhbGl6ZXIuZGVzZXJpYWxpemUodmFsdWUpO1xuXHQgICAgICAgICAgICAgICAgfVxuXG5cdCAgICAgICAgICAgICAgICB2YWx1ZSA9IGl0ZXJhdG9yKHZhbHVlLCBrZXkuc3Vic3RyaW5nKGtleVByZWZpeExlbmd0aCksIGl0ZXJhdGlvbk51bWJlcisrKTtcblxuXHQgICAgICAgICAgICAgICAgaWYgKHZhbHVlICE9PSB2b2lkIDApIHtcblx0ICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWU7XG5cdCAgICAgICAgICAgICAgICB9XG5cdCAgICAgICAgICAgIH1cblx0ICAgICAgICB9KTtcblxuXHQgICAgICAgIGV4ZWN1dGVDYWxsYmFjayhwcm9taXNlLCBjYWxsYmFjayk7XG5cdCAgICAgICAgcmV0dXJuIHByb21pc2U7XG5cdCAgICB9XG5cblx0ICAgIC8vIFNhbWUgYXMgbG9jYWxTdG9yYWdlJ3Mga2V5KCkgbWV0aG9kLCBleGNlcHQgdGFrZXMgYSBjYWxsYmFjay5cblx0ICAgIGZ1bmN0aW9uIGtleShuLCBjYWxsYmFjaykge1xuXHQgICAgICAgIHZhciBzZWxmID0gdGhpcztcblx0ICAgICAgICB2YXIgcHJvbWlzZSA9IHNlbGYucmVhZHkoKS50aGVuKGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgdmFyIGRiSW5mbyA9IHNlbGYuX2RiSW5mbztcblx0ICAgICAgICAgICAgdmFyIHJlc3VsdDtcblx0ICAgICAgICAgICAgdHJ5IHtcblx0ICAgICAgICAgICAgICAgIHJlc3VsdCA9IGxvY2FsU3RvcmFnZS5rZXkobik7XG5cdCAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG5cdCAgICAgICAgICAgICAgICByZXN1bHQgPSBudWxsO1xuXHQgICAgICAgICAgICB9XG5cblx0ICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSBwcmVmaXggZnJvbSB0aGUga2V5LCBpZiBhIGtleSBpcyBmb3VuZC5cblx0ICAgICAgICAgICAgaWYgKHJlc3VsdCkge1xuXHQgICAgICAgICAgICAgICAgcmVzdWx0ID0gcmVzdWx0LnN1YnN0cmluZyhkYkluZm8ua2V5UHJlZml4Lmxlbmd0aCk7XG5cdCAgICAgICAgICAgIH1cblxuXHQgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuXHQgICAgICAgIH0pO1xuXG5cdCAgICAgICAgZXhlY3V0ZUNhbGxiYWNrKHByb21pc2UsIGNhbGxiYWNrKTtcblx0ICAgICAgICByZXR1cm4gcHJvbWlzZTtcblx0ICAgIH1cblxuXHQgICAgZnVuY3Rpb24ga2V5cyhjYWxsYmFjaykge1xuXHQgICAgICAgIHZhciBzZWxmID0gdGhpcztcblx0ICAgICAgICB2YXIgcHJvbWlzZSA9IHNlbGYucmVhZHkoKS50aGVuKGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgdmFyIGRiSW5mbyA9IHNlbGYuX2RiSW5mbztcblx0ICAgICAgICAgICAgdmFyIGxlbmd0aCA9IGxvY2FsU3RvcmFnZS5sZW5ndGg7XG5cdCAgICAgICAgICAgIHZhciBrZXlzID0gW107XG5cblx0ICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgICAgICAgICAgICAgaWYgKGxvY2FsU3RvcmFnZS5rZXkoaSkuaW5kZXhPZihkYkluZm8ua2V5UHJlZml4KSA9PT0gMCkge1xuXHQgICAgICAgICAgICAgICAgICAgIGtleXMucHVzaChsb2NhbFN0b3JhZ2Uua2V5KGkpLnN1YnN0cmluZyhkYkluZm8ua2V5UHJlZml4Lmxlbmd0aCkpO1xuXHQgICAgICAgICAgICAgICAgfVxuXHQgICAgICAgICAgICB9XG5cblx0ICAgICAgICAgICAgcmV0dXJuIGtleXM7XG5cdCAgICAgICAgfSk7XG5cblx0ICAgICAgICBleGVjdXRlQ2FsbGJhY2socHJvbWlzZSwgY2FsbGJhY2spO1xuXHQgICAgICAgIHJldHVybiBwcm9taXNlO1xuXHQgICAgfVxuXG5cdCAgICAvLyBTdXBwbHkgdGhlIG51bWJlciBvZiBrZXlzIGluIHRoZSBkYXRhc3RvcmUgdG8gdGhlIGNhbGxiYWNrIGZ1bmN0aW9uLlxuXHQgICAgZnVuY3Rpb24gbGVuZ3RoKGNhbGxiYWNrKSB7XG5cdCAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXHQgICAgICAgIHZhciBwcm9taXNlID0gc2VsZi5rZXlzKCkudGhlbihmdW5jdGlvbiAoa2V5cykge1xuXHQgICAgICAgICAgICByZXR1cm4ga2V5cy5sZW5ndGg7XG5cdCAgICAgICAgfSk7XG5cblx0ICAgICAgICBleGVjdXRlQ2FsbGJhY2socHJvbWlzZSwgY2FsbGJhY2spO1xuXHQgICAgICAgIHJldHVybiBwcm9taXNlO1xuXHQgICAgfVxuXG5cdCAgICAvLyBSZW1vdmUgYW4gaXRlbSBmcm9tIHRoZSBzdG9yZSwgbmljZSBhbmQgc2ltcGxlLlxuXHQgICAgZnVuY3Rpb24gcmVtb3ZlSXRlbShrZXksIGNhbGxiYWNrKSB7XG5cdCAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG5cdCAgICAgICAgLy8gQ2FzdCB0aGUga2V5IHRvIGEgc3RyaW5nLCBhcyB0aGF0J3MgYWxsIHdlIGNhbiBzZXQgYXMgYSBrZXkuXG5cdCAgICAgICAgaWYgKHR5cGVvZiBrZXkgIT09ICdzdHJpbmcnKSB7XG5cdCAgICAgICAgICAgIGdsb2JhbE9iamVjdC5jb25zb2xlLndhcm4oa2V5ICsgJyB1c2VkIGFzIGEga2V5LCBidXQgaXQgaXMgbm90IGEgc3RyaW5nLicpO1xuXHQgICAgICAgICAgICBrZXkgPSBTdHJpbmcoa2V5KTtcblx0ICAgICAgICB9XG5cblx0ICAgICAgICB2YXIgcHJvbWlzZSA9IHNlbGYucmVhZHkoKS50aGVuKGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgdmFyIGRiSW5mbyA9IHNlbGYuX2RiSW5mbztcblx0ICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oZGJJbmZvLmtleVByZWZpeCArIGtleSk7XG5cdCAgICAgICAgfSk7XG5cblx0ICAgICAgICBleGVjdXRlQ2FsbGJhY2socHJvbWlzZSwgY2FsbGJhY2spO1xuXHQgICAgICAgIHJldHVybiBwcm9taXNlO1xuXHQgICAgfVxuXG5cdCAgICAvLyBTZXQgYSBrZXkncyB2YWx1ZSBhbmQgcnVuIGFuIG9wdGlvbmFsIGNhbGxiYWNrIG9uY2UgdGhlIHZhbHVlIGlzIHNldC5cblx0ICAgIC8vIFVubGlrZSBHYWlhJ3MgaW1wbGVtZW50YXRpb24sIHRoZSBjYWxsYmFjayBmdW5jdGlvbiBpcyBwYXNzZWQgdGhlIHZhbHVlLFxuXHQgICAgLy8gaW4gY2FzZSB5b3Ugd2FudCB0byBvcGVyYXRlIG9uIHRoYXQgdmFsdWUgb25seSBhZnRlciB5b3UncmUgc3VyZSBpdFxuXHQgICAgLy8gc2F2ZWQsIG9yIHNvbWV0aGluZyBsaWtlIHRoYXQuXG5cdCAgICBmdW5jdGlvbiBzZXRJdGVtKGtleSwgdmFsdWUsIGNhbGxiYWNrKSB7XG5cdCAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG5cdCAgICAgICAgLy8gQ2FzdCB0aGUga2V5IHRvIGEgc3RyaW5nLCBhcyB0aGF0J3MgYWxsIHdlIGNhbiBzZXQgYXMgYSBrZXkuXG5cdCAgICAgICAgaWYgKHR5cGVvZiBrZXkgIT09ICdzdHJpbmcnKSB7XG5cdCAgICAgICAgICAgIGdsb2JhbE9iamVjdC5jb25zb2xlLndhcm4oa2V5ICsgJyB1c2VkIGFzIGEga2V5LCBidXQgaXQgaXMgbm90IGEgc3RyaW5nLicpO1xuXHQgICAgICAgICAgICBrZXkgPSBTdHJpbmcoa2V5KTtcblx0ICAgICAgICB9XG5cblx0ICAgICAgICB2YXIgcHJvbWlzZSA9IHNlbGYucmVhZHkoKS50aGVuKGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgLy8gQ29udmVydCB1bmRlZmluZWQgdmFsdWVzIHRvIG51bGwuXG5cdCAgICAgICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9tb3ppbGxhL2xvY2FsRm9yYWdlL3B1bGwvNDJcblx0ICAgICAgICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcblx0ICAgICAgICAgICAgICAgIHZhbHVlID0gbnVsbDtcblx0ICAgICAgICAgICAgfVxuXG5cdCAgICAgICAgICAgIC8vIFNhdmUgdGhlIG9yaWdpbmFsIHZhbHVlIHRvIHBhc3MgdG8gdGhlIGNhbGxiYWNrLlxuXHQgICAgICAgICAgICB2YXIgb3JpZ2luYWxWYWx1ZSA9IHZhbHVlO1xuXG5cdCAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdCAgICAgICAgICAgICAgICB2YXIgZGJJbmZvID0gc2VsZi5fZGJJbmZvO1xuXHQgICAgICAgICAgICAgICAgZGJJbmZvLnNlcmlhbGl6ZXIuc2VyaWFsaXplKHZhbHVlLCBmdW5jdGlvbiAodmFsdWUsIGVycm9yKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG5cdCAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKGRiSW5mby5rZXlQcmVmaXggKyBrZXksIHZhbHVlKTtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUob3JpZ2luYWxWYWx1ZSk7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxvY2FsU3RvcmFnZSBjYXBhY2l0eSBleGNlZWRlZC5cblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRPRE86IE1ha2UgdGhpcyBhIHNwZWNpZmljIGVycm9yL2V2ZW50LlxuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGUubmFtZSA9PT0gJ1F1b3RhRXhjZWVkZWRFcnJvcicgfHwgZS5uYW1lID09PSAnTlNfRVJST1JfRE9NX1FVT1RBX1JFQUNIRUQnKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGUpO1xuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGUpO1xuXHQgICAgICAgICAgICAgICAgICAgICAgICB9XG5cdCAgICAgICAgICAgICAgICAgICAgfVxuXHQgICAgICAgICAgICAgICAgfSk7XG5cdCAgICAgICAgICAgIH0pO1xuXHQgICAgICAgIH0pO1xuXG5cdCAgICAgICAgZXhlY3V0ZUNhbGxiYWNrKHByb21pc2UsIGNhbGxiYWNrKTtcblx0ICAgICAgICByZXR1cm4gcHJvbWlzZTtcblx0ICAgIH1cblxuXHQgICAgZnVuY3Rpb24gZXhlY3V0ZUNhbGxiYWNrKHByb21pc2UsIGNhbGxiYWNrKSB7XG5cdCAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG5cdCAgICAgICAgICAgIHByb21pc2UudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG5cdCAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCByZXN1bHQpO1xuXHQgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyb3IpIHtcblx0ICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yKTtcblx0ICAgICAgICAgICAgfSk7XG5cdCAgICAgICAgfVxuXHQgICAgfVxuXG5cdCAgICB2YXIgbG9jYWxTdG9yYWdlV3JhcHBlciA9IHtcblx0ICAgICAgICBfZHJpdmVyOiAnbG9jYWxTdG9yYWdlV3JhcHBlcicsXG5cdCAgICAgICAgX2luaXRTdG9yYWdlOiBfaW5pdFN0b3JhZ2UsXG5cdCAgICAgICAgLy8gRGVmYXVsdCBBUEksIGZyb20gR2FpYS9sb2NhbFN0b3JhZ2UuXG5cdCAgICAgICAgaXRlcmF0ZTogaXRlcmF0ZSxcblx0ICAgICAgICBnZXRJdGVtOiBnZXRJdGVtLFxuXHQgICAgICAgIHNldEl0ZW06IHNldEl0ZW0sXG5cdCAgICAgICAgcmVtb3ZlSXRlbTogcmVtb3ZlSXRlbSxcblx0ICAgICAgICBjbGVhcjogY2xlYXIsXG5cdCAgICAgICAgbGVuZ3RoOiBsZW5ndGgsXG5cdCAgICAgICAga2V5OiBrZXksXG5cdCAgICAgICAga2V5czoga2V5c1xuXHQgICAgfTtcblxuXHQgICAgZXhwb3J0c1snZGVmYXVsdCddID0gbG9jYWxTdG9yYWdlV3JhcHBlcjtcblx0fSkuY2FsbCh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHNlbGYpO1xuXHRtb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbJ2RlZmF1bHQnXTtcblxuLyoqKi8gfSxcbi8qIDMgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRleHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuXHQoZnVuY3Rpb24gKCkge1xuXHQgICAgJ3VzZSBzdHJpY3QnO1xuXG5cdCAgICAvLyBTYWRseSwgdGhlIGJlc3Qgd2F5IHRvIHNhdmUgYmluYXJ5IGRhdGEgaW4gV2ViU1FML2xvY2FsU3RvcmFnZSBpcyBzZXJpYWxpemluZ1xuXHQgICAgLy8gaXQgdG8gQmFzZTY0LCBzbyB0aGlzIGlzIGhvdyB3ZSBzdG9yZSBpdCB0byBwcmV2ZW50IHZlcnkgc3RyYW5nZSBlcnJvcnMgd2l0aCBsZXNzXG5cdCAgICAvLyB2ZXJib3NlIHdheXMgb2YgYmluYXJ5IDwtPiBzdHJpbmcgZGF0YSBzdG9yYWdlLlxuXHQgICAgdmFyIEJBU0VfQ0hBUlMgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLyc7XG5cblx0ICAgIHZhciBCTE9CX1RZUEVfUFJFRklYID0gJ35+bG9jYWxfZm9yYWdlX3R5cGV+Jztcblx0ICAgIHZhciBCTE9CX1RZUEVfUFJFRklYX1JFR0VYID0gL15+fmxvY2FsX2ZvcmFnZV90eXBlfihbXn5dKyl+LztcblxuXHQgICAgdmFyIFNFUklBTElaRURfTUFSS0VSID0gJ19fbGZzY19fOic7XG5cdCAgICB2YXIgU0VSSUFMSVpFRF9NQVJLRVJfTEVOR1RIID0gU0VSSUFMSVpFRF9NQVJLRVIubGVuZ3RoO1xuXG5cdCAgICAvLyBPTUcgdGhlIHNlcmlhbGl6YXRpb25zIVxuXHQgICAgdmFyIFRZUEVfQVJSQVlCVUZGRVIgPSAnYXJiZic7XG5cdCAgICB2YXIgVFlQRV9CTE9CID0gJ2Jsb2InO1xuXHQgICAgdmFyIFRZUEVfSU5UOEFSUkFZID0gJ3NpMDgnO1xuXHQgICAgdmFyIFRZUEVfVUlOVDhBUlJBWSA9ICd1aTA4Jztcblx0ICAgIHZhciBUWVBFX1VJTlQ4Q0xBTVBFREFSUkFZID0gJ3VpYzgnO1xuXHQgICAgdmFyIFRZUEVfSU5UMTZBUlJBWSA9ICdzaTE2Jztcblx0ICAgIHZhciBUWVBFX0lOVDMyQVJSQVkgPSAnc2kzMic7XG5cdCAgICB2YXIgVFlQRV9VSU5UMTZBUlJBWSA9ICd1cjE2Jztcblx0ICAgIHZhciBUWVBFX1VJTlQzMkFSUkFZID0gJ3VpMzInO1xuXHQgICAgdmFyIFRZUEVfRkxPQVQzMkFSUkFZID0gJ2ZsMzInO1xuXHQgICAgdmFyIFRZUEVfRkxPQVQ2NEFSUkFZID0gJ2ZsNjQnO1xuXHQgICAgdmFyIFRZUEVfU0VSSUFMSVpFRF9NQVJLRVJfTEVOR1RIID0gU0VSSUFMSVpFRF9NQVJLRVJfTEVOR1RIICsgVFlQRV9BUlJBWUJVRkZFUi5sZW5ndGg7XG5cblx0ICAgIC8vIEdldCBvdXQgb2Ygb3VyIGhhYml0IG9mIHVzaW5nIGB3aW5kb3dgIGlubGluZSwgYXQgbGVhc3QuXG5cdCAgICB2YXIgZ2xvYmFsT2JqZWN0ID0gdGhpcztcblxuXHQgICAgLy8gQWJzdHJhY3RzIGNvbnN0cnVjdGluZyBhIEJsb2Igb2JqZWN0LCBzbyBpdCBhbHNvIHdvcmtzIGluIG9sZGVyXG5cdCAgICAvLyBicm93c2VycyB0aGF0IGRvbid0IHN1cHBvcnQgdGhlIG5hdGl2ZSBCbG9iIGNvbnN0cnVjdG9yLiAoaS5lLlxuXHQgICAgLy8gb2xkIFF0V2ViS2l0IHZlcnNpb25zLCBhdCBsZWFzdCkuXG5cdCAgICBmdW5jdGlvbiBfY3JlYXRlQmxvYihwYXJ0cywgcHJvcGVydGllcykge1xuXHQgICAgICAgIHBhcnRzID0gcGFydHMgfHwgW107XG5cdCAgICAgICAgcHJvcGVydGllcyA9IHByb3BlcnRpZXMgfHwge307XG5cblx0ICAgICAgICB0cnkge1xuXHQgICAgICAgICAgICByZXR1cm4gbmV3IEJsb2IocGFydHMsIHByb3BlcnRpZXMpO1xuXHQgICAgICAgIH0gY2F0Y2ggKGVycikge1xuXHQgICAgICAgICAgICBpZiAoZXJyLm5hbWUgIT09ICdUeXBlRXJyb3InKSB7XG5cdCAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG5cdCAgICAgICAgICAgIH1cblxuXHQgICAgICAgICAgICB2YXIgQmxvYkJ1aWxkZXIgPSBnbG9iYWxPYmplY3QuQmxvYkJ1aWxkZXIgfHwgZ2xvYmFsT2JqZWN0Lk1TQmxvYkJ1aWxkZXIgfHwgZ2xvYmFsT2JqZWN0Lk1vekJsb2JCdWlsZGVyIHx8IGdsb2JhbE9iamVjdC5XZWJLaXRCbG9iQnVpbGRlcjtcblxuXHQgICAgICAgICAgICB2YXIgYnVpbGRlciA9IG5ldyBCbG9iQnVpbGRlcigpO1xuXHQgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgaSArPSAxKSB7XG5cdCAgICAgICAgICAgICAgICBidWlsZGVyLmFwcGVuZChwYXJ0c1tpXSk7XG5cdCAgICAgICAgICAgIH1cblxuXHQgICAgICAgICAgICByZXR1cm4gYnVpbGRlci5nZXRCbG9iKHByb3BlcnRpZXMudHlwZSk7XG5cdCAgICAgICAgfVxuXHQgICAgfVxuXG5cdCAgICAvLyBTZXJpYWxpemUgYSB2YWx1ZSwgYWZ0ZXJ3YXJkcyBleGVjdXRpbmcgYSBjYWxsYmFjayAod2hpY2ggdXN1YWxseVxuXHQgICAgLy8gaW5zdHJ1Y3RzIHRoZSBgc2V0SXRlbSgpYCBjYWxsYmFjay9wcm9taXNlIHRvIGJlIGV4ZWN1dGVkKS4gVGhpcyBpcyBob3dcblx0ICAgIC8vIHdlIHN0b3JlIGJpbmFyeSBkYXRhIHdpdGggbG9jYWxTdG9yYWdlLlxuXHQgICAgZnVuY3Rpb24gc2VyaWFsaXplKHZhbHVlLCBjYWxsYmFjaykge1xuXHQgICAgICAgIHZhciB2YWx1ZVN0cmluZyA9ICcnO1xuXHQgICAgICAgIGlmICh2YWx1ZSkge1xuXHQgICAgICAgICAgICB2YWx1ZVN0cmluZyA9IHZhbHVlLnRvU3RyaW5nKCk7XG5cdCAgICAgICAgfVxuXG5cdCAgICAgICAgLy8gQ2Fubm90IHVzZSBgdmFsdWUgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcmAgb3Igc3VjaCBoZXJlLCBhcyB0aGVzZVxuXHQgICAgICAgIC8vIGNoZWNrcyBmYWlsIHdoZW4gcnVubmluZyB0aGUgdGVzdHMgdXNpbmcgY2FzcGVyLmpzLi4uXG5cdCAgICAgICAgLy9cblx0ICAgICAgICAvLyBUT0RPOiBTZWUgd2h5IHRob3NlIHRlc3RzIGZhaWwgYW5kIHVzZSBhIGJldHRlciBzb2x1dGlvbi5cblx0ICAgICAgICBpZiAodmFsdWUgJiYgKHZhbHVlLnRvU3RyaW5nKCkgPT09ICdbb2JqZWN0IEFycmF5QnVmZmVyXScgfHwgdmFsdWUuYnVmZmVyICYmIHZhbHVlLmJ1ZmZlci50b1N0cmluZygpID09PSAnW29iamVjdCBBcnJheUJ1ZmZlcl0nKSkge1xuXHQgICAgICAgICAgICAvLyBDb252ZXJ0IGJpbmFyeSBhcnJheXMgdG8gYSBzdHJpbmcgYW5kIHByZWZpeCB0aGUgc3RyaW5nIHdpdGhcblx0ICAgICAgICAgICAgLy8gYSBzcGVjaWFsIG1hcmtlci5cblx0ICAgICAgICAgICAgdmFyIGJ1ZmZlcjtcblx0ICAgICAgICAgICAgdmFyIG1hcmtlciA9IFNFUklBTElaRURfTUFSS0VSO1xuXG5cdCAgICAgICAgICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG5cdCAgICAgICAgICAgICAgICBidWZmZXIgPSB2YWx1ZTtcblx0ICAgICAgICAgICAgICAgIG1hcmtlciArPSBUWVBFX0FSUkFZQlVGRkVSO1xuXHQgICAgICAgICAgICB9IGVsc2Uge1xuXHQgICAgICAgICAgICAgICAgYnVmZmVyID0gdmFsdWUuYnVmZmVyO1xuXG5cdCAgICAgICAgICAgICAgICBpZiAodmFsdWVTdHJpbmcgPT09ICdbb2JqZWN0IEludDhBcnJheV0nKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgbWFya2VyICs9IFRZUEVfSU5UOEFSUkFZO1xuXHQgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh2YWx1ZVN0cmluZyA9PT0gJ1tvYmplY3QgVWludDhBcnJheV0nKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgbWFya2VyICs9IFRZUEVfVUlOVDhBUlJBWTtcblx0ICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodmFsdWVTdHJpbmcgPT09ICdbb2JqZWN0IFVpbnQ4Q2xhbXBlZEFycmF5XScpIHtcblx0ICAgICAgICAgICAgICAgICAgICBtYXJrZXIgKz0gVFlQRV9VSU5UOENMQU1QRURBUlJBWTtcblx0ICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodmFsdWVTdHJpbmcgPT09ICdbb2JqZWN0IEludDE2QXJyYXldJykge1xuXHQgICAgICAgICAgICAgICAgICAgIG1hcmtlciArPSBUWVBFX0lOVDE2QVJSQVk7XG5cdCAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHZhbHVlU3RyaW5nID09PSAnW29iamVjdCBVaW50MTZBcnJheV0nKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgbWFya2VyICs9IFRZUEVfVUlOVDE2QVJSQVk7XG5cdCAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHZhbHVlU3RyaW5nID09PSAnW29iamVjdCBJbnQzMkFycmF5XScpIHtcblx0ICAgICAgICAgICAgICAgICAgICBtYXJrZXIgKz0gVFlQRV9JTlQzMkFSUkFZO1xuXHQgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh2YWx1ZVN0cmluZyA9PT0gJ1tvYmplY3QgVWludDMyQXJyYXldJykge1xuXHQgICAgICAgICAgICAgICAgICAgIG1hcmtlciArPSBUWVBFX1VJTlQzMkFSUkFZO1xuXHQgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh2YWx1ZVN0cmluZyA9PT0gJ1tvYmplY3QgRmxvYXQzMkFycmF5XScpIHtcblx0ICAgICAgICAgICAgICAgICAgICBtYXJrZXIgKz0gVFlQRV9GTE9BVDMyQVJSQVk7XG5cdCAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHZhbHVlU3RyaW5nID09PSAnW29iamVjdCBGbG9hdDY0QXJyYXldJykge1xuXHQgICAgICAgICAgICAgICAgICAgIG1hcmtlciArPSBUWVBFX0ZMT0FUNjRBUlJBWTtcblx0ICAgICAgICAgICAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKCdGYWlsZWQgdG8gZ2V0IHR5cGUgZm9yIEJpbmFyeUFycmF5JykpO1xuXHQgICAgICAgICAgICAgICAgfVxuXHQgICAgICAgICAgICB9XG5cblx0ICAgICAgICAgICAgY2FsbGJhY2sobWFya2VyICsgYnVmZmVyVG9TdHJpbmcoYnVmZmVyKSk7XG5cdCAgICAgICAgfSBlbHNlIGlmICh2YWx1ZVN0cmluZyA9PT0gJ1tvYmplY3QgQmxvYl0nKSB7XG5cdCAgICAgICAgICAgIC8vIENvbnZlciB0aGUgYmxvYiB0byBhIGJpbmFyeUFycmF5IGFuZCB0aGVuIHRvIGEgc3RyaW5nLlxuXHQgICAgICAgICAgICB2YXIgZmlsZVJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG5cblx0ICAgICAgICAgICAgZmlsZVJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgICAgICAgICAvLyBCYWNrd2FyZHMtY29tcGF0aWJsZSBwcmVmaXggZm9yIHRoZSBibG9iIHR5cGUuXG5cdCAgICAgICAgICAgICAgICB2YXIgc3RyID0gQkxPQl9UWVBFX1BSRUZJWCArIHZhbHVlLnR5cGUgKyAnficgKyBidWZmZXJUb1N0cmluZyh0aGlzLnJlc3VsdCk7XG5cblx0ICAgICAgICAgICAgICAgIGNhbGxiYWNrKFNFUklBTElaRURfTUFSS0VSICsgVFlQRV9CTE9CICsgc3RyKTtcblx0ICAgICAgICAgICAgfTtcblxuXHQgICAgICAgICAgICBmaWxlUmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKHZhbHVlKTtcblx0ICAgICAgICB9IGVsc2Uge1xuXHQgICAgICAgICAgICB0cnkge1xuXHQgICAgICAgICAgICAgICAgY2FsbGJhY2soSlNPTi5zdHJpbmdpZnkodmFsdWUpKTtcblx0ICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuXHQgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIkNvdWxkbid0IGNvbnZlcnQgdmFsdWUgaW50byBhIEpTT04gc3RyaW5nOiBcIiwgdmFsdWUpO1xuXG5cdCAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCBlKTtcblx0ICAgICAgICAgICAgfVxuXHQgICAgICAgIH1cblx0ICAgIH1cblxuXHQgICAgLy8gRGVzZXJpYWxpemUgZGF0YSB3ZSd2ZSBpbnNlcnRlZCBpbnRvIGEgdmFsdWUgY29sdW1uL2ZpZWxkLiBXZSBwbGFjZVxuXHQgICAgLy8gc3BlY2lhbCBtYXJrZXJzIGludG8gb3VyIHN0cmluZ3MgdG8gbWFyayB0aGVtIGFzIGVuY29kZWQ7IHRoaXMgaXNuJ3Rcblx0ICAgIC8vIGFzIG5pY2UgYXMgYSBtZXRhIGZpZWxkLCBidXQgaXQncyB0aGUgb25seSBzYW5lIHRoaW5nIHdlIGNhbiBkbyB3aGlsc3Rcblx0ICAgIC8vIGtlZXBpbmcgbG9jYWxTdG9yYWdlIHN1cHBvcnQgaW50YWN0LlxuXHQgICAgLy9cblx0ICAgIC8vIE9mdGVudGltZXMgdGhpcyB3aWxsIGp1c3QgZGVzZXJpYWxpemUgSlNPTiBjb250ZW50LCBidXQgaWYgd2UgaGF2ZSBhXG5cdCAgICAvLyBzcGVjaWFsIG1hcmtlciAoU0VSSUFMSVpFRF9NQVJLRVIsIGRlZmluZWQgYWJvdmUpLCB3ZSB3aWxsIGV4dHJhY3Rcblx0ICAgIC8vIHNvbWUga2luZCBvZiBhcnJheWJ1ZmZlci9iaW5hcnkgZGF0YS90eXBlZCBhcnJheSBvdXQgb2YgdGhlIHN0cmluZy5cblx0ICAgIGZ1bmN0aW9uIGRlc2VyaWFsaXplKHZhbHVlKSB7XG5cdCAgICAgICAgLy8gSWYgd2UgaGF2ZW4ndCBtYXJrZWQgdGhpcyBzdHJpbmcgYXMgYmVpbmcgc3BlY2lhbGx5IHNlcmlhbGl6ZWQgKGkuZS5cblx0ICAgICAgICAvLyBzb21ldGhpbmcgb3RoZXIgdGhhbiBzZXJpYWxpemVkIEpTT04pLCB3ZSBjYW4ganVzdCByZXR1cm4gaXQgYW5kIGJlXG5cdCAgICAgICAgLy8gZG9uZSB3aXRoIGl0LlxuXHQgICAgICAgIGlmICh2YWx1ZS5zdWJzdHJpbmcoMCwgU0VSSUFMSVpFRF9NQVJLRVJfTEVOR1RIKSAhPT0gU0VSSUFMSVpFRF9NQVJLRVIpIHtcblx0ICAgICAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UodmFsdWUpO1xuXHQgICAgICAgIH1cblxuXHQgICAgICAgIC8vIFRoZSBmb2xsb3dpbmcgY29kZSBkZWFscyB3aXRoIGRlc2VyaWFsaXppbmcgc29tZSBraW5kIG9mIEJsb2Igb3Jcblx0ICAgICAgICAvLyBUeXBlZEFycmF5LiBGaXJzdCB3ZSBzZXBhcmF0ZSBvdXQgdGhlIHR5cGUgb2YgZGF0YSB3ZSdyZSBkZWFsaW5nXG5cdCAgICAgICAgLy8gd2l0aCBmcm9tIHRoZSBkYXRhIGl0c2VsZi5cblx0ICAgICAgICB2YXIgc2VyaWFsaXplZFN0cmluZyA9IHZhbHVlLnN1YnN0cmluZyhUWVBFX1NFUklBTElaRURfTUFSS0VSX0xFTkdUSCk7XG5cdCAgICAgICAgdmFyIHR5cGUgPSB2YWx1ZS5zdWJzdHJpbmcoU0VSSUFMSVpFRF9NQVJLRVJfTEVOR1RILCBUWVBFX1NFUklBTElaRURfTUFSS0VSX0xFTkdUSCk7XG5cblx0ICAgICAgICB2YXIgYmxvYlR5cGU7XG5cdCAgICAgICAgLy8gQmFja3dhcmRzLWNvbXBhdGlibGUgYmxvYiB0eXBlIHNlcmlhbGl6YXRpb24gc3RyYXRlZ3kuXG5cdCAgICAgICAgLy8gREJzIGNyZWF0ZWQgd2l0aCBvbGRlciB2ZXJzaW9ucyBvZiBsb2NhbEZvcmFnZSB3aWxsIHNpbXBseSBub3QgaGF2ZSB0aGUgYmxvYiB0eXBlLlxuXHQgICAgICAgIGlmICh0eXBlID09PSBUWVBFX0JMT0IgJiYgQkxPQl9UWVBFX1BSRUZJWF9SRUdFWC50ZXN0KHNlcmlhbGl6ZWRTdHJpbmcpKSB7XG5cdCAgICAgICAgICAgIHZhciBtYXRjaGVyID0gc2VyaWFsaXplZFN0cmluZy5tYXRjaChCTE9CX1RZUEVfUFJFRklYX1JFR0VYKTtcblx0ICAgICAgICAgICAgYmxvYlR5cGUgPSBtYXRjaGVyWzFdO1xuXHQgICAgICAgICAgICBzZXJpYWxpemVkU3RyaW5nID0gc2VyaWFsaXplZFN0cmluZy5zdWJzdHJpbmcobWF0Y2hlclswXS5sZW5ndGgpO1xuXHQgICAgICAgIH1cblx0ICAgICAgICB2YXIgYnVmZmVyID0gc3RyaW5nVG9CdWZmZXIoc2VyaWFsaXplZFN0cmluZyk7XG5cblx0ICAgICAgICAvLyBSZXR1cm4gdGhlIHJpZ2h0IHR5cGUgYmFzZWQgb24gdGhlIGNvZGUvdHlwZSBzZXQgZHVyaW5nXG5cdCAgICAgICAgLy8gc2VyaWFsaXphdGlvbi5cblx0ICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcblx0ICAgICAgICAgICAgY2FzZSBUWVBFX0FSUkFZQlVGRkVSOlxuXHQgICAgICAgICAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcblx0ICAgICAgICAgICAgY2FzZSBUWVBFX0JMT0I6XG5cdCAgICAgICAgICAgICAgICByZXR1cm4gX2NyZWF0ZUJsb2IoW2J1ZmZlcl0sIHsgdHlwZTogYmxvYlR5cGUgfSk7XG5cdCAgICAgICAgICAgIGNhc2UgVFlQRV9JTlQ4QVJSQVk6XG5cdCAgICAgICAgICAgICAgICByZXR1cm4gbmV3IEludDhBcnJheShidWZmZXIpO1xuXHQgICAgICAgICAgICBjYXNlIFRZUEVfVUlOVDhBUlJBWTpcblx0ICAgICAgICAgICAgICAgIHJldHVybiBuZXcgVWludDhBcnJheShidWZmZXIpO1xuXHQgICAgICAgICAgICBjYXNlIFRZUEVfVUlOVDhDTEFNUEVEQVJSQVk6XG5cdCAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFVpbnQ4Q2xhbXBlZEFycmF5KGJ1ZmZlcik7XG5cdCAgICAgICAgICAgIGNhc2UgVFlQRV9JTlQxNkFSUkFZOlxuXHQgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBJbnQxNkFycmF5KGJ1ZmZlcik7XG5cdCAgICAgICAgICAgIGNhc2UgVFlQRV9VSU5UMTZBUlJBWTpcblx0ICAgICAgICAgICAgICAgIHJldHVybiBuZXcgVWludDE2QXJyYXkoYnVmZmVyKTtcblx0ICAgICAgICAgICAgY2FzZSBUWVBFX0lOVDMyQVJSQVk6XG5cdCAgICAgICAgICAgICAgICByZXR1cm4gbmV3IEludDMyQXJyYXkoYnVmZmVyKTtcblx0ICAgICAgICAgICAgY2FzZSBUWVBFX1VJTlQzMkFSUkFZOlxuXHQgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBVaW50MzJBcnJheShidWZmZXIpO1xuXHQgICAgICAgICAgICBjYXNlIFRZUEVfRkxPQVQzMkFSUkFZOlxuXHQgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBGbG9hdDMyQXJyYXkoYnVmZmVyKTtcblx0ICAgICAgICAgICAgY2FzZSBUWVBFX0ZMT0FUNjRBUlJBWTpcblx0ICAgICAgICAgICAgICAgIHJldHVybiBuZXcgRmxvYXQ2NEFycmF5KGJ1ZmZlcik7XG5cdCAgICAgICAgICAgIGRlZmF1bHQ6XG5cdCAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua293biB0eXBlOiAnICsgdHlwZSk7XG5cdCAgICAgICAgfVxuXHQgICAgfVxuXG5cdCAgICBmdW5jdGlvbiBzdHJpbmdUb0J1ZmZlcihzZXJpYWxpemVkU3RyaW5nKSB7XG5cdCAgICAgICAgLy8gRmlsbCB0aGUgc3RyaW5nIGludG8gYSBBcnJheUJ1ZmZlci5cblx0ICAgICAgICB2YXIgYnVmZmVyTGVuZ3RoID0gc2VyaWFsaXplZFN0cmluZy5sZW5ndGggKiAwLjc1O1xuXHQgICAgICAgIHZhciBsZW4gPSBzZXJpYWxpemVkU3RyaW5nLmxlbmd0aDtcblx0ICAgICAgICB2YXIgaTtcblx0ICAgICAgICB2YXIgcCA9IDA7XG5cdCAgICAgICAgdmFyIGVuY29kZWQxLCBlbmNvZGVkMiwgZW5jb2RlZDMsIGVuY29kZWQ0O1xuXG5cdCAgICAgICAgaWYgKHNlcmlhbGl6ZWRTdHJpbmdbc2VyaWFsaXplZFN0cmluZy5sZW5ndGggLSAxXSA9PT0gJz0nKSB7XG5cdCAgICAgICAgICAgIGJ1ZmZlckxlbmd0aC0tO1xuXHQgICAgICAgICAgICBpZiAoc2VyaWFsaXplZFN0cmluZ1tzZXJpYWxpemVkU3RyaW5nLmxlbmd0aCAtIDJdID09PSAnPScpIHtcblx0ICAgICAgICAgICAgICAgIGJ1ZmZlckxlbmd0aC0tO1xuXHQgICAgICAgICAgICB9XG5cdCAgICAgICAgfVxuXG5cdCAgICAgICAgdmFyIGJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcihidWZmZXJMZW5ndGgpO1xuXHQgICAgICAgIHZhciBieXRlcyA9IG5ldyBVaW50OEFycmF5KGJ1ZmZlcik7XG5cblx0ICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpICs9IDQpIHtcblx0ICAgICAgICAgICAgZW5jb2RlZDEgPSBCQVNFX0NIQVJTLmluZGV4T2Yoc2VyaWFsaXplZFN0cmluZ1tpXSk7XG5cdCAgICAgICAgICAgIGVuY29kZWQyID0gQkFTRV9DSEFSUy5pbmRleE9mKHNlcmlhbGl6ZWRTdHJpbmdbaSArIDFdKTtcblx0ICAgICAgICAgICAgZW5jb2RlZDMgPSBCQVNFX0NIQVJTLmluZGV4T2Yoc2VyaWFsaXplZFN0cmluZ1tpICsgMl0pO1xuXHQgICAgICAgICAgICBlbmNvZGVkNCA9IEJBU0VfQ0hBUlMuaW5kZXhPZihzZXJpYWxpemVkU3RyaW5nW2kgKyAzXSk7XG5cblx0ICAgICAgICAgICAgLypqc2xpbnQgYml0d2lzZTogdHJ1ZSAqL1xuXHQgICAgICAgICAgICBieXRlc1twKytdID0gZW5jb2RlZDEgPDwgMiB8IGVuY29kZWQyID4+IDQ7XG5cdCAgICAgICAgICAgIGJ5dGVzW3ArK10gPSAoZW5jb2RlZDIgJiAxNSkgPDwgNCB8IGVuY29kZWQzID4+IDI7XG5cdCAgICAgICAgICAgIGJ5dGVzW3ArK10gPSAoZW5jb2RlZDMgJiAzKSA8PCA2IHwgZW5jb2RlZDQgJiA2Mztcblx0ICAgICAgICB9XG5cdCAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcblx0ICAgIH1cblxuXHQgICAgLy8gQ29udmVydHMgYSBidWZmZXIgdG8gYSBzdHJpbmcgdG8gc3RvcmUsIHNlcmlhbGl6ZWQsIGluIHRoZSBiYWNrZW5kXG5cdCAgICAvLyBzdG9yYWdlIGxpYnJhcnkuXG5cdCAgICBmdW5jdGlvbiBidWZmZXJUb1N0cmluZyhidWZmZXIpIHtcblx0ICAgICAgICAvLyBiYXNlNjQtYXJyYXlidWZmZXJcblx0ICAgICAgICB2YXIgYnl0ZXMgPSBuZXcgVWludDhBcnJheShidWZmZXIpO1xuXHQgICAgICAgIHZhciBiYXNlNjRTdHJpbmcgPSAnJztcblx0ICAgICAgICB2YXIgaTtcblxuXHQgICAgICAgIGZvciAoaSA9IDA7IGkgPCBieXRlcy5sZW5ndGg7IGkgKz0gMykge1xuXHQgICAgICAgICAgICAvKmpzbGludCBiaXR3aXNlOiB0cnVlICovXG5cdCAgICAgICAgICAgIGJhc2U2NFN0cmluZyArPSBCQVNFX0NIQVJTW2J5dGVzW2ldID4+IDJdO1xuXHQgICAgICAgICAgICBiYXNlNjRTdHJpbmcgKz0gQkFTRV9DSEFSU1soYnl0ZXNbaV0gJiAzKSA8PCA0IHwgYnl0ZXNbaSArIDFdID4+IDRdO1xuXHQgICAgICAgICAgICBiYXNlNjRTdHJpbmcgKz0gQkFTRV9DSEFSU1soYnl0ZXNbaSArIDFdICYgMTUpIDw8IDIgfCBieXRlc1tpICsgMl0gPj4gNl07XG5cdCAgICAgICAgICAgIGJhc2U2NFN0cmluZyArPSBCQVNFX0NIQVJTW2J5dGVzW2kgKyAyXSAmIDYzXTtcblx0ICAgICAgICB9XG5cblx0ICAgICAgICBpZiAoYnl0ZXMubGVuZ3RoICUgMyA9PT0gMikge1xuXHQgICAgICAgICAgICBiYXNlNjRTdHJpbmcgPSBiYXNlNjRTdHJpbmcuc3Vic3RyaW5nKDAsIGJhc2U2NFN0cmluZy5sZW5ndGggLSAxKSArICc9Jztcblx0ICAgICAgICB9IGVsc2UgaWYgKGJ5dGVzLmxlbmd0aCAlIDMgPT09IDEpIHtcblx0ICAgICAgICAgICAgYmFzZTY0U3RyaW5nID0gYmFzZTY0U3RyaW5nLnN1YnN0cmluZygwLCBiYXNlNjRTdHJpbmcubGVuZ3RoIC0gMikgKyAnPT0nO1xuXHQgICAgICAgIH1cblxuXHQgICAgICAgIHJldHVybiBiYXNlNjRTdHJpbmc7XG5cdCAgICB9XG5cblx0ICAgIHZhciBsb2NhbGZvcmFnZVNlcmlhbGl6ZXIgPSB7XG5cdCAgICAgICAgc2VyaWFsaXplOiBzZXJpYWxpemUsXG5cdCAgICAgICAgZGVzZXJpYWxpemU6IGRlc2VyaWFsaXplLFxuXHQgICAgICAgIHN0cmluZ1RvQnVmZmVyOiBzdHJpbmdUb0J1ZmZlcixcblx0ICAgICAgICBidWZmZXJUb1N0cmluZzogYnVmZmVyVG9TdHJpbmdcblx0ICAgIH07XG5cblx0ICAgIGV4cG9ydHNbJ2RlZmF1bHQnXSA9IGxvY2FsZm9yYWdlU2VyaWFsaXplcjtcblx0fSkuY2FsbCh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHNlbGYpO1xuXHRtb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbJ2RlZmF1bHQnXTtcblxuLyoqKi8gfSxcbi8qIDQgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdC8qXG5cdCAqIEluY2x1ZGVzIGNvZGUgZnJvbTpcblx0ICpcblx0ICogYmFzZTY0LWFycmF5YnVmZmVyXG5cdCAqIGh0dHBzOi8vZ2l0aHViLmNvbS9uaWtsYXN2aC9iYXNlNjQtYXJyYXlidWZmZXJcblx0ICpcblx0ICogQ29weXJpZ2h0IChjKSAyMDEyIE5pa2xhcyB2b24gSGVydHplblxuXHQgKiBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG5cdCAqL1xuXHQndXNlIHN0cmljdCc7XG5cblx0ZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblx0KGZ1bmN0aW9uICgpIHtcblx0ICAgICd1c2Ugc3RyaWN0JztcblxuXHQgICAgdmFyIGdsb2JhbE9iamVjdCA9IHRoaXM7XG5cdCAgICB2YXIgb3BlbkRhdGFiYXNlID0gdGhpcy5vcGVuRGF0YWJhc2U7XG5cblx0ICAgIC8vIElmIFdlYlNRTCBtZXRob2RzIGFyZW4ndCBhdmFpbGFibGUsIHdlIGNhbiBzdG9wIG5vdy5cblx0ICAgIGlmICghb3BlbkRhdGFiYXNlKSB7XG5cdCAgICAgICAgcmV0dXJuO1xuXHQgICAgfVxuXG5cdCAgICAvLyBPcGVuIHRoZSBXZWJTUUwgZGF0YWJhc2UgKGF1dG9tYXRpY2FsbHkgY3JlYXRlcyBvbmUgaWYgb25lIGRpZG4ndFxuXHQgICAgLy8gcHJldmlvdXNseSBleGlzdCksIHVzaW5nIGFueSBvcHRpb25zIHNldCBpbiB0aGUgY29uZmlnLlxuXHQgICAgZnVuY3Rpb24gX2luaXRTdG9yYWdlKG9wdGlvbnMpIHtcblx0ICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cdCAgICAgICAgdmFyIGRiSW5mbyA9IHtcblx0ICAgICAgICAgICAgZGI6IG51bGxcblx0ICAgICAgICB9O1xuXG5cdCAgICAgICAgaWYgKG9wdGlvbnMpIHtcblx0ICAgICAgICAgICAgZm9yICh2YXIgaSBpbiBvcHRpb25zKSB7XG5cdCAgICAgICAgICAgICAgICBkYkluZm9baV0gPSB0eXBlb2Ygb3B0aW9uc1tpXSAhPT0gJ3N0cmluZycgPyBvcHRpb25zW2ldLnRvU3RyaW5nKCkgOiBvcHRpb25zW2ldO1xuXHQgICAgICAgICAgICB9XG5cdCAgICAgICAgfVxuXG5cdCAgICAgICAgdmFyIGRiSW5mb1Byb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdCAgICAgICAgICAgIC8vIE9wZW4gdGhlIGRhdGFiYXNlOyB0aGUgb3BlbkRhdGFiYXNlIEFQSSB3aWxsIGF1dG9tYXRpY2FsbHlcblx0ICAgICAgICAgICAgLy8gY3JlYXRlIGl0IGZvciB1cyBpZiBpdCBkb2Vzbid0IGV4aXN0LlxuXHQgICAgICAgICAgICB0cnkge1xuXHQgICAgICAgICAgICAgICAgZGJJbmZvLmRiID0gb3BlbkRhdGFiYXNlKGRiSW5mby5uYW1lLCBTdHJpbmcoZGJJbmZvLnZlcnNpb24pLCBkYkluZm8uZGVzY3JpcHRpb24sIGRiSW5mby5zaXplKTtcblx0ICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuXHQgICAgICAgICAgICAgICAgcmV0dXJuIHNlbGYuc2V0RHJpdmVyKHNlbGYuTE9DQUxTVE9SQUdFKS50aGVuKGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2VsZi5faW5pdFN0b3JhZ2Uob3B0aW9ucyk7XG5cdCAgICAgICAgICAgICAgICB9KS50aGVuKHJlc29sdmUpWydjYXRjaCddKHJlamVjdCk7XG5cdCAgICAgICAgICAgIH1cblxuXHQgICAgICAgICAgICAvLyBDcmVhdGUgb3VyIGtleS92YWx1ZSB0YWJsZSBpZiBpdCBkb2Vzbid0IGV4aXN0LlxuXHQgICAgICAgICAgICBkYkluZm8uZGIudHJhbnNhY3Rpb24oZnVuY3Rpb24gKHQpIHtcblx0ICAgICAgICAgICAgICAgIHQuZXhlY3V0ZVNxbCgnQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgJyArIGRiSW5mby5zdG9yZU5hbWUgKyAnIChpZCBJTlRFR0VSIFBSSU1BUlkgS0VZLCBrZXkgdW5pcXVlLCB2YWx1ZSknLCBbXSwgZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICAgICAgICAgIHNlbGYuX2RiSW5mbyA9IGRiSW5mbztcblx0ICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG5cdCAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAodCwgZXJyb3IpIHtcblx0ICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuXHQgICAgICAgICAgICAgICAgfSk7XG5cdCAgICAgICAgICAgIH0pO1xuXHQgICAgICAgIH0pO1xuXG5cdCAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblx0ICAgICAgICAgICAgcmVzb2x2ZShfX3dlYnBhY2tfcmVxdWlyZV9fKDMpKTtcblx0ICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChsaWIpIHtcblx0ICAgICAgICAgICAgZGJJbmZvLnNlcmlhbGl6ZXIgPSBsaWI7XG5cdCAgICAgICAgICAgIHJldHVybiBkYkluZm9Qcm9taXNlO1xuXHQgICAgICAgIH0pO1xuXHQgICAgfVxuXG5cdCAgICBmdW5jdGlvbiBnZXRJdGVtKGtleSwgY2FsbGJhY2spIHtcblx0ICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cblx0ICAgICAgICAvLyBDYXN0IHRoZSBrZXkgdG8gYSBzdHJpbmcsIGFzIHRoYXQncyBhbGwgd2UgY2FuIHNldCBhcyBhIGtleS5cblx0ICAgICAgICBpZiAodHlwZW9mIGtleSAhPT0gJ3N0cmluZycpIHtcblx0ICAgICAgICAgICAgZ2xvYmFsT2JqZWN0LmNvbnNvbGUud2FybihrZXkgKyAnIHVzZWQgYXMgYSBrZXksIGJ1dCBpdCBpcyBub3QgYSBzdHJpbmcuJyk7XG5cdCAgICAgICAgICAgIGtleSA9IFN0cmluZyhrZXkpO1xuXHQgICAgICAgIH1cblxuXHQgICAgICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXHQgICAgICAgICAgICBzZWxmLnJlYWR5KCkudGhlbihmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgICAgICAgICB2YXIgZGJJbmZvID0gc2VsZi5fZGJJbmZvO1xuXHQgICAgICAgICAgICAgICAgZGJJbmZvLmRiLnRyYW5zYWN0aW9uKGZ1bmN0aW9uICh0KSB7XG5cdCAgICAgICAgICAgICAgICAgICAgdC5leGVjdXRlU3FsKCdTRUxFQ1QgKiBGUk9NICcgKyBkYkluZm8uc3RvcmVOYW1lICsgJyBXSEVSRSBrZXkgPSA/IExJTUlUIDEnLCBba2V5XSwgZnVuY3Rpb24gKHQsIHJlc3VsdHMpIHtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IHJlc3VsdHMucm93cy5sZW5ndGggPyByZXN1bHRzLnJvd3MuaXRlbSgwKS52YWx1ZSA6IG51bGw7XG5cblx0ICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgdG8gc2VlIGlmIHRoaXMgaXMgc2VyaWFsaXplZCBjb250ZW50IHdlIG5lZWQgdG9cblx0ICAgICAgICAgICAgICAgICAgICAgICAgLy8gdW5wYWNrLlxuXHQgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0KSB7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBkYkluZm8uc2VyaWFsaXplci5kZXNlcmlhbGl6ZShyZXN1bHQpO1xuXHQgICAgICAgICAgICAgICAgICAgICAgICB9XG5cblx0ICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuXHQgICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uICh0LCBlcnJvcikge1xuXG5cdCAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG5cdCAgICAgICAgICAgICAgICAgICAgfSk7XG5cdCAgICAgICAgICAgICAgICB9KTtcblx0ICAgICAgICAgICAgfSlbJ2NhdGNoJ10ocmVqZWN0KTtcblx0ICAgICAgICB9KTtcblxuXHQgICAgICAgIGV4ZWN1dGVDYWxsYmFjayhwcm9taXNlLCBjYWxsYmFjayk7XG5cdCAgICAgICAgcmV0dXJuIHByb21pc2U7XG5cdCAgICB9XG5cblx0ICAgIGZ1bmN0aW9uIGl0ZXJhdGUoaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG5cdCAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG5cdCAgICAgICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdCAgICAgICAgICAgIHNlbGYucmVhZHkoKS50aGVuKGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgICAgIHZhciBkYkluZm8gPSBzZWxmLl9kYkluZm87XG5cblx0ICAgICAgICAgICAgICAgIGRiSW5mby5kYi50cmFuc2FjdGlvbihmdW5jdGlvbiAodCkge1xuXHQgICAgICAgICAgICAgICAgICAgIHQuZXhlY3V0ZVNxbCgnU0VMRUNUICogRlJPTSAnICsgZGJJbmZvLnN0b3JlTmFtZSwgW10sIGZ1bmN0aW9uICh0LCByZXN1bHRzKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgIHZhciByb3dzID0gcmVzdWx0cy5yb3dzO1xuXHQgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbGVuZ3RoID0gcm93cy5sZW5ndGg7XG5cblx0ICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGl0ZW0gPSByb3dzLml0ZW0oaSk7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gaXRlbS52YWx1ZTtcblxuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgdG8gc2VlIGlmIHRoaXMgaXMgc2VyaWFsaXplZCBjb250ZW50XG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB3ZSBuZWVkIHRvIHVucGFjay5cblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQpIHtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBkYkluZm8uc2VyaWFsaXplci5kZXNlcmlhbGl6ZShyZXN1bHQpO1xuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBpdGVyYXRvcihyZXN1bHQsIGl0ZW0ua2V5LCBpICsgMSk7XG5cblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHZvaWQoMCkgcHJldmVudHMgcHJvYmxlbXMgd2l0aCByZWRlZmluaXRpb25cblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9mIGB1bmRlZmluZWRgLlxuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdCAhPT0gdm9pZCAwKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblx0ICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG5cdCAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcblx0ICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAodCwgZXJyb3IpIHtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcblx0ICAgICAgICAgICAgICAgICAgICB9KTtcblx0ICAgICAgICAgICAgICAgIH0pO1xuXHQgICAgICAgICAgICB9KVsnY2F0Y2gnXShyZWplY3QpO1xuXHQgICAgICAgIH0pO1xuXG5cdCAgICAgICAgZXhlY3V0ZUNhbGxiYWNrKHByb21pc2UsIGNhbGxiYWNrKTtcblx0ICAgICAgICByZXR1cm4gcHJvbWlzZTtcblx0ICAgIH1cblxuXHQgICAgZnVuY3Rpb24gc2V0SXRlbShrZXksIHZhbHVlLCBjYWxsYmFjaykge1xuXHQgICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuXHQgICAgICAgIC8vIENhc3QgdGhlIGtleSB0byBhIHN0cmluZywgYXMgdGhhdCdzIGFsbCB3ZSBjYW4gc2V0IGFzIGEga2V5LlxuXHQgICAgICAgIGlmICh0eXBlb2Yga2V5ICE9PSAnc3RyaW5nJykge1xuXHQgICAgICAgICAgICBnbG9iYWxPYmplY3QuY29uc29sZS53YXJuKGtleSArICcgdXNlZCBhcyBhIGtleSwgYnV0IGl0IGlzIG5vdCBhIHN0cmluZy4nKTtcblx0ICAgICAgICAgICAga2V5ID0gU3RyaW5nKGtleSk7XG5cdCAgICAgICAgfVxuXG5cdCAgICAgICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdCAgICAgICAgICAgIHNlbGYucmVhZHkoKS50aGVuKGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgICAgIC8vIFRoZSBsb2NhbFN0b3JhZ2UgQVBJIGRvZXNuJ3QgcmV0dXJuIHVuZGVmaW5lZCB2YWx1ZXMgaW4gYW5cblx0ICAgICAgICAgICAgICAgIC8vIFwiZXhwZWN0ZWRcIiB3YXksIHNvIHVuZGVmaW5lZCBpcyBhbHdheXMgY2FzdCB0byBudWxsIGluIGFsbFxuXHQgICAgICAgICAgICAgICAgLy8gZHJpdmVycy4gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vbW96aWxsYS9sb2NhbEZvcmFnZS9wdWxsLzQyXG5cdCAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuXHQgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gbnVsbDtcblx0ICAgICAgICAgICAgICAgIH1cblxuXHQgICAgICAgICAgICAgICAgLy8gU2F2ZSB0aGUgb3JpZ2luYWwgdmFsdWUgdG8gcGFzcyB0byB0aGUgY2FsbGJhY2suXG5cdCAgICAgICAgICAgICAgICB2YXIgb3JpZ2luYWxWYWx1ZSA9IHZhbHVlO1xuXG5cdCAgICAgICAgICAgICAgICB2YXIgZGJJbmZvID0gc2VsZi5fZGJJbmZvO1xuXHQgICAgICAgICAgICAgICAgZGJJbmZvLnNlcmlhbGl6ZXIuc2VyaWFsaXplKHZhbHVlLCBmdW5jdGlvbiAodmFsdWUsIGVycm9yKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG5cdCAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgZGJJbmZvLmRiLnRyYW5zYWN0aW9uKGZ1bmN0aW9uICh0KSB7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmV4ZWN1dGVTcWwoJ0lOU0VSVCBPUiBSRVBMQUNFIElOVE8gJyArIGRiSW5mby5zdG9yZU5hbWUgKyAnIChrZXksIHZhbHVlKSBWQUxVRVMgKD8sID8pJywgW2tleSwgdmFsdWVdLCBmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShvcmlnaW5hbFZhbHVlKTtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uICh0LCBlcnJvcikge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHNxbEVycm9yKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGUgdHJhbnNhY3Rpb24gZmFpbGVkOyBjaGVja1xuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdG8gc2VlIGlmIGl0J3MgYSBxdW90YSBlcnJvci5cblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzcWxFcnJvci5jb2RlID09PSBzcWxFcnJvci5RVU9UQV9FUlIpIHtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXZSByZWplY3QgdGhlIGNhbGxiYWNrIG91dHJpZ2h0IGZvciBub3csIGJ1dFxuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGl0J3Mgd29ydGggdHJ5aW5nIHRvIHJlLXJ1biB0aGUgdHJhbnNhY3Rpb24uXG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRXZlbiBpZiB0aGUgdXNlciBhY2NlcHRzIHRoZSBwcm9tcHQgdG8gdXNlXG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbW9yZSBzdG9yYWdlIG9uIFNhZmFyaSwgdGhpcyBlcnJvciB3aWxsXG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYmUgY2FsbGVkLlxuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vXG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVE9ETzogVHJ5IHRvIHJlLXJ1biB0aGUgdHJhbnNhY3Rpb24uXG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHNxbEVycm9yKTtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblx0ICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cdCAgICAgICAgICAgICAgICAgICAgfVxuXHQgICAgICAgICAgICAgICAgfSk7XG5cdCAgICAgICAgICAgIH0pWydjYXRjaCddKHJlamVjdCk7XG5cdCAgICAgICAgfSk7XG5cblx0ICAgICAgICBleGVjdXRlQ2FsbGJhY2socHJvbWlzZSwgY2FsbGJhY2spO1xuXHQgICAgICAgIHJldHVybiBwcm9taXNlO1xuXHQgICAgfVxuXG5cdCAgICBmdW5jdGlvbiByZW1vdmVJdGVtKGtleSwgY2FsbGJhY2spIHtcblx0ICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cblx0ICAgICAgICAvLyBDYXN0IHRoZSBrZXkgdG8gYSBzdHJpbmcsIGFzIHRoYXQncyBhbGwgd2UgY2FuIHNldCBhcyBhIGtleS5cblx0ICAgICAgICBpZiAodHlwZW9mIGtleSAhPT0gJ3N0cmluZycpIHtcblx0ICAgICAgICAgICAgZ2xvYmFsT2JqZWN0LmNvbnNvbGUud2FybihrZXkgKyAnIHVzZWQgYXMgYSBrZXksIGJ1dCBpdCBpcyBub3QgYSBzdHJpbmcuJyk7XG5cdCAgICAgICAgICAgIGtleSA9IFN0cmluZyhrZXkpO1xuXHQgICAgICAgIH1cblxuXHQgICAgICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXHQgICAgICAgICAgICBzZWxmLnJlYWR5KCkudGhlbihmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgICAgICAgICB2YXIgZGJJbmZvID0gc2VsZi5fZGJJbmZvO1xuXHQgICAgICAgICAgICAgICAgZGJJbmZvLmRiLnRyYW5zYWN0aW9uKGZ1bmN0aW9uICh0KSB7XG5cdCAgICAgICAgICAgICAgICAgICAgdC5leGVjdXRlU3FsKCdERUxFVEUgRlJPTSAnICsgZGJJbmZvLnN0b3JlTmFtZSArICcgV0hFUkUga2V5ID0gPycsIFtrZXldLCBmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcblx0ICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAodCwgZXJyb3IpIHtcblxuXHQgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuXHQgICAgICAgICAgICAgICAgICAgIH0pO1xuXHQgICAgICAgICAgICAgICAgfSk7XG5cdCAgICAgICAgICAgIH0pWydjYXRjaCddKHJlamVjdCk7XG5cdCAgICAgICAgfSk7XG5cblx0ICAgICAgICBleGVjdXRlQ2FsbGJhY2socHJvbWlzZSwgY2FsbGJhY2spO1xuXHQgICAgICAgIHJldHVybiBwcm9taXNlO1xuXHQgICAgfVxuXG5cdCAgICAvLyBEZWxldGVzIGV2ZXJ5IGl0ZW0gaW4gdGhlIHRhYmxlLlxuXHQgICAgLy8gVE9ETzogRmluZCBvdXQgaWYgdGhpcyByZXNldHMgdGhlIEFVVE9fSU5DUkVNRU5UIG51bWJlci5cblx0ICAgIGZ1bmN0aW9uIGNsZWFyKGNhbGxiYWNrKSB7XG5cdCAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG5cdCAgICAgICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdCAgICAgICAgICAgIHNlbGYucmVhZHkoKS50aGVuKGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgICAgIHZhciBkYkluZm8gPSBzZWxmLl9kYkluZm87XG5cdCAgICAgICAgICAgICAgICBkYkluZm8uZGIudHJhbnNhY3Rpb24oZnVuY3Rpb24gKHQpIHtcblx0ICAgICAgICAgICAgICAgICAgICB0LmV4ZWN1dGVTcWwoJ0RFTEVURSBGUk9NICcgKyBkYkluZm8uc3RvcmVOYW1lLCBbXSwgZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG5cdCAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHQsIGVycm9yKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG5cdCAgICAgICAgICAgICAgICAgICAgfSk7XG5cdCAgICAgICAgICAgICAgICB9KTtcblx0ICAgICAgICAgICAgfSlbJ2NhdGNoJ10ocmVqZWN0KTtcblx0ICAgICAgICB9KTtcblxuXHQgICAgICAgIGV4ZWN1dGVDYWxsYmFjayhwcm9taXNlLCBjYWxsYmFjayk7XG5cdCAgICAgICAgcmV0dXJuIHByb21pc2U7XG5cdCAgICB9XG5cblx0ICAgIC8vIERvZXMgYSBzaW1wbGUgYENPVU5UKGtleSlgIHRvIGdldCB0aGUgbnVtYmVyIG9mIGl0ZW1zIHN0b3JlZCBpblxuXHQgICAgLy8gbG9jYWxGb3JhZ2UuXG5cdCAgICBmdW5jdGlvbiBsZW5ndGgoY2FsbGJhY2spIHtcblx0ICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cblx0ICAgICAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblx0ICAgICAgICAgICAgc2VsZi5yZWFkeSgpLnRoZW4oZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICAgICAgdmFyIGRiSW5mbyA9IHNlbGYuX2RiSW5mbztcblx0ICAgICAgICAgICAgICAgIGRiSW5mby5kYi50cmFuc2FjdGlvbihmdW5jdGlvbiAodCkge1xuXHQgICAgICAgICAgICAgICAgICAgIC8vIEFoaGgsIFNRTCBtYWtlcyB0aGlzIG9uZSBzb29vb29vIGVhc3kuXG5cdCAgICAgICAgICAgICAgICAgICAgdC5leGVjdXRlU3FsKCdTRUxFQ1QgQ09VTlQoa2V5KSBhcyBjIEZST00gJyArIGRiSW5mby5zdG9yZU5hbWUsIFtdLCBmdW5jdGlvbiAodCwgcmVzdWx0cykge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gcmVzdWx0cy5yb3dzLml0ZW0oMCkuYztcblxuXHQgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG5cdCAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHQsIGVycm9yKSB7XG5cblx0ICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcblx0ICAgICAgICAgICAgICAgICAgICB9KTtcblx0ICAgICAgICAgICAgICAgIH0pO1xuXHQgICAgICAgICAgICB9KVsnY2F0Y2gnXShyZWplY3QpO1xuXHQgICAgICAgIH0pO1xuXG5cdCAgICAgICAgZXhlY3V0ZUNhbGxiYWNrKHByb21pc2UsIGNhbGxiYWNrKTtcblx0ICAgICAgICByZXR1cm4gcHJvbWlzZTtcblx0ICAgIH1cblxuXHQgICAgLy8gUmV0dXJuIHRoZSBrZXkgbG9jYXRlZCBhdCBrZXkgaW5kZXggWDsgZXNzZW50aWFsbHkgZ2V0cyB0aGUga2V5IGZyb20gYVxuXHQgICAgLy8gYFdIRVJFIGlkID0gP2AuIFRoaXMgaXMgdGhlIG1vc3QgZWZmaWNpZW50IHdheSBJIGNhbiB0aGluayB0byBpbXBsZW1lbnRcblx0ICAgIC8vIHRoaXMgcmFyZWx5LXVzZWQgKGluIG15IGV4cGVyaWVuY2UpIHBhcnQgb2YgdGhlIEFQSSwgYnV0IGl0IGNhbiBzZWVtXG5cdCAgICAvLyBpbmNvbnNpc3RlbnQsIGJlY2F1c2Ugd2UgZG8gYElOU0VSVCBPUiBSRVBMQUNFIElOVE9gIG9uIGBzZXRJdGVtKClgLCBzb1xuXHQgICAgLy8gdGhlIElEIG9mIGVhY2gga2V5IHdpbGwgY2hhbmdlIGV2ZXJ5IHRpbWUgaXQncyB1cGRhdGVkLiBQZXJoYXBzIGEgc3RvcmVkXG5cdCAgICAvLyBwcm9jZWR1cmUgZm9yIHRoZSBgc2V0SXRlbSgpYCBTUUwgd291bGQgc29sdmUgdGhpcyBwcm9ibGVtP1xuXHQgICAgLy8gVE9ETzogRG9uJ3QgY2hhbmdlIElEIG9uIGBzZXRJdGVtKClgLlxuXHQgICAgZnVuY3Rpb24ga2V5KG4sIGNhbGxiYWNrKSB7XG5cdCAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG5cdCAgICAgICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdCAgICAgICAgICAgIHNlbGYucmVhZHkoKS50aGVuKGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgICAgIHZhciBkYkluZm8gPSBzZWxmLl9kYkluZm87XG5cdCAgICAgICAgICAgICAgICBkYkluZm8uZGIudHJhbnNhY3Rpb24oZnVuY3Rpb24gKHQpIHtcblx0ICAgICAgICAgICAgICAgICAgICB0LmV4ZWN1dGVTcWwoJ1NFTEVDVCBrZXkgRlJPTSAnICsgZGJJbmZvLnN0b3JlTmFtZSArICcgV0hFUkUgaWQgPSA/IExJTUlUIDEnLCBbbiArIDFdLCBmdW5jdGlvbiAodCwgcmVzdWx0cykge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gcmVzdWx0cy5yb3dzLmxlbmd0aCA/IHJlc3VsdHMucm93cy5pdGVtKDApLmtleSA6IG51bGw7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcblx0ICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAodCwgZXJyb3IpIHtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcblx0ICAgICAgICAgICAgICAgICAgICB9KTtcblx0ICAgICAgICAgICAgICAgIH0pO1xuXHQgICAgICAgICAgICB9KVsnY2F0Y2gnXShyZWplY3QpO1xuXHQgICAgICAgIH0pO1xuXG5cdCAgICAgICAgZXhlY3V0ZUNhbGxiYWNrKHByb21pc2UsIGNhbGxiYWNrKTtcblx0ICAgICAgICByZXR1cm4gcHJvbWlzZTtcblx0ICAgIH1cblxuXHQgICAgZnVuY3Rpb24ga2V5cyhjYWxsYmFjaykge1xuXHQgICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuXHQgICAgICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXHQgICAgICAgICAgICBzZWxmLnJlYWR5KCkudGhlbihmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgICAgICAgICB2YXIgZGJJbmZvID0gc2VsZi5fZGJJbmZvO1xuXHQgICAgICAgICAgICAgICAgZGJJbmZvLmRiLnRyYW5zYWN0aW9uKGZ1bmN0aW9uICh0KSB7XG5cdCAgICAgICAgICAgICAgICAgICAgdC5leGVjdXRlU3FsKCdTRUxFQ1Qga2V5IEZST00gJyArIGRiSW5mby5zdG9yZU5hbWUsIFtdLCBmdW5jdGlvbiAodCwgcmVzdWx0cykge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICB2YXIga2V5cyA9IFtdO1xuXG5cdCAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVzdWx0cy5yb3dzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXlzLnB1c2gocmVzdWx0cy5yb3dzLml0ZW0oaSkua2V5KTtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG5cdCAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoa2V5cyk7XG5cdCAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHQsIGVycm9yKSB7XG5cblx0ICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcblx0ICAgICAgICAgICAgICAgICAgICB9KTtcblx0ICAgICAgICAgICAgICAgIH0pO1xuXHQgICAgICAgICAgICB9KVsnY2F0Y2gnXShyZWplY3QpO1xuXHQgICAgICAgIH0pO1xuXG5cdCAgICAgICAgZXhlY3V0ZUNhbGxiYWNrKHByb21pc2UsIGNhbGxiYWNrKTtcblx0ICAgICAgICByZXR1cm4gcHJvbWlzZTtcblx0ICAgIH1cblxuXHQgICAgZnVuY3Rpb24gZXhlY3V0ZUNhbGxiYWNrKHByb21pc2UsIGNhbGxiYWNrKSB7XG5cdCAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG5cdCAgICAgICAgICAgIHByb21pc2UudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG5cdCAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCByZXN1bHQpO1xuXHQgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyb3IpIHtcblx0ICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yKTtcblx0ICAgICAgICAgICAgfSk7XG5cdCAgICAgICAgfVxuXHQgICAgfVxuXG5cdCAgICB2YXIgd2ViU1FMU3RvcmFnZSA9IHtcblx0ICAgICAgICBfZHJpdmVyOiAnd2ViU1FMU3RvcmFnZScsXG5cdCAgICAgICAgX2luaXRTdG9yYWdlOiBfaW5pdFN0b3JhZ2UsXG5cdCAgICAgICAgaXRlcmF0ZTogaXRlcmF0ZSxcblx0ICAgICAgICBnZXRJdGVtOiBnZXRJdGVtLFxuXHQgICAgICAgIHNldEl0ZW06IHNldEl0ZW0sXG5cdCAgICAgICAgcmVtb3ZlSXRlbTogcmVtb3ZlSXRlbSxcblx0ICAgICAgICBjbGVhcjogY2xlYXIsXG5cdCAgICAgICAgbGVuZ3RoOiBsZW5ndGgsXG5cdCAgICAgICAga2V5OiBrZXksXG5cdCAgICAgICAga2V5czoga2V5c1xuXHQgICAgfTtcblxuXHQgICAgZXhwb3J0c1snZGVmYXVsdCddID0gd2ViU1FMU3RvcmFnZTtcblx0fSkuY2FsbCh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHNlbGYpO1xuXHRtb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbJ2RlZmF1bHQnXTtcblxuLyoqKi8gfVxuLyoqKioqKi8gXSlcbn0pO1xuOyIsIi8qXG4gKiBub3RpZS5qcyAtIEEgY2xlYW4gYW5kIHNpbXBsZSBub3RpZmljYXRpb24gcGx1Z2luIChhbGVydC9ncm93bCBzdHlsZSkgZm9yIGphdmFzY3JpcHQsIHdpdGggbm8gZGVwZW5kZW5jaWVzLlxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBKYXJlZCBSZWljaFxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZTpcbiAqIGh0dHA6Ly93d3cub3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvbWl0LWxpY2Vuc2UucGhwXG4gKlxuICogUHJvamVjdCBob21lOlxuICogaHR0cHM6Ly9qYXJlZHJlaWNoLmNvbS9wcm9qZWN0cy9ub3RpZS5qc1xuICpcbiAqIFZlcnNpb246ICAyLjEuMFxuICpcbiovXG5cbnZhciBub3RpZSA9IGZ1bmN0aW9uKCl7XG5cbiAgICAvLyBTRVRUSU5HU1xuICAgIC8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG4gICAgLy8gR2VuZXJhbFxuICAgIHZhciBzaGFkb3cgPSBmYWxzZTtcbiAgICB2YXIgZm9udF9zaXplX3NtYWxsID0gJzE4cHgnO1xuICAgIHZhciBmb250X3NpemVfYmlnID0gJzE4cHgnO1xuICAgIHZhciBmb250X2NoYW5nZV9zY3JlZW5fd2lkdGggPSA2MDA7XG4gICAgdmFyIGFuaW1hdGlvbl9kZWxheSA9IDAuMztcbiAgICB2YXIgYmFja2dyb3VuZF9jbGlja19kaXNtaXNzID0gdHJ1ZTtcblxuICAgIC8vIG5vdGllLmFsZXJ0IGNvbG9yc1xuICAgIHZhciBhbGVydF9jb2xvcl9zdWNjZXNzX2JhY2tncm91bmQgPSAnIzU3QkY1Nyc7XG4gICAgdmFyIGFsZXJ0X2NvbG9yX3dhcm5pbmdfYmFja2dyb3VuZCA9ICcjRTNCNzcxJztcbiAgICB2YXIgYWxlcnRfY29sb3JfZXJyb3JfYmFja2dyb3VuZCA9ICcjRjQ0MzM2JztcbiAgICB2YXIgYWxlcnRfY29sb3JfaW5mb19iYWNrZ3JvdW5kID0gJyM0RDgyRDYnO1xuICAgIHZhciBhbGVydF9jb2xvcl90ZXh0ID0gJyNGRkYnO1xuXG4gICAgLy8gbm90aWUuY29uZmlybSBjb2xvcnNcbiAgICB2YXIgY29uZmlybV9hbmRfaW5wdXRfY29sb3JfYmFja2dyb3VuZCA9ICcjNEQ4MkQ2JztcbiAgICB2YXIgY29uZmlybV9hbmRfaW5wdXRfY29sb3JfeWVzX2JhY2tncm91bmQgPSAnIzU3QkY1Nyc7XG4gICAgdmFyIGNvbmZpcm1fYW5kX2lucHV0X2NvbG9yX25vX2JhY2tncm91bmQgPSAnI0UxNzE1Qic7XG4gICAgdmFyIGNvbmZpcm1fYW5kX2lucHV0X2NvbG9yX3RleHQgPSAnI0ZGRic7XG4gICAgdmFyIGNvbmZpcm1fYW5kX2lucHV0X2NvbG9yX3llc190ZXh0ID0gJyNGRkYnO1xuICAgIHZhciBjb25maXJtX2FuZF9pbnB1dF9jb2xvcl9ub190ZXh0ID0gJyNGRkYnO1xuXG4gICAgLy8gSUQncyBmb3IgdXNlIHdpdGhpbiB5b3VyIG93biAuY3NzIGZpbGUgKE9QVElPTkFMKVxuICAgIC8vIChCZSBzdXJlIHRvIHVzZSAhaW1wb3J0YW50IHRvIG92ZXJyaWRlIHRoZSBqYXZhc2NyaXB0KVxuICAgIC8vIEV4YW1wbGU6ICNub3RpZS1hbGVydC1pbm5lciB7IHBhZGRpbmc6IDMwcHggIWltcG9ydGFudDsgfVxuICAgIHZhciBhbGVydF9vdXRlcl9pZCA9ICdub3RpZS1hbGVydC1vdXRlcic7XG4gICAgdmFyIGFsZXJ0X2lubmVyX2lkID0gJ25vdGllLWFsZXJ0LWlubmVyJztcbiAgICB2YXIgYWxlcnRfdGV4dF9pZCA9ICdub3RpZS1hbGVydC10ZXh0JztcbiAgICB2YXIgY29uZmlybV9vdXRlcl9pZCA9ICdub3RpZS1jb25maXJtLW91dGVyJztcbiAgICB2YXIgY29uZmlybV9pbm5lcl9pZCA9ICdub3RpZS1jb25maXJtLWlubmVyJztcbiAgICB2YXIgY29uZmlybV9iYWNrZ3JvdW5kX2lkID0gJ25vdGllLWNvbmZpcm0tYmFja2dyb3VuZCc7XG4gICAgdmFyIGNvbmZpcm1feWVzX2lkID0gJ25vdGllLWNvbmZpcm0teWVzJztcbiAgICB2YXIgY29uZmlybV9ub19pZCA9ICdub3RpZS1jb25maXJtLW5vJztcbiAgICB2YXIgY29uZmlybV90ZXh0X2lkID0gJ25vdGllLWNvbmZpcm0tdGV4dCc7XG4gICAgdmFyIGNvbmZpcm1feWVzX3RleHRfaWQgPSAnbm90aWUtY29uZmlybS15ZXMtdGV4dCc7XG4gICAgdmFyIGNvbmZpcm1fbm9fdGV4dF9pZCA9ICdub3RpZS1jb25maXJtLW5vLXRleHQnO1xuICAgIHZhciBpbnB1dF9vdXRlcl9pZCA9ICdub3RpZS1pbnB1dC1vdXRlcic7XG4gICAgdmFyIGlucHV0X2lubmVyX2lkID0gJ25vdGllLWlucHV0LWlubmVyJztcbiAgICB2YXIgaW5wdXRfYmFja2dyb3VuZF9pZCA9ICdub3RpZS1pbnB1dC1iYWNrZ3JvdW5kJztcbiAgICB2YXIgaW5wdXRfZGl2X2lkID0gJ25vdGllLWlucHV0LWRpdic7XG4gICAgdmFyIGlucHV0X2ZpZWxkX2lkID0gJ25vdGllLWlucHV0LWZpZWxkJztcbiAgICB2YXIgaW5wdXRfeWVzX2lkID0gJ25vdGllLWlucHV0LXllcyc7XG4gICAgdmFyIGlucHV0X25vX2lkID0gJ25vdGllLWlucHV0LW5vJztcbiAgICB2YXIgaW5wdXRfdGV4dF9pZCA9ICdub3RpZS1pbnB1dC10ZXh0JztcbiAgICB2YXIgaW5wdXRfeWVzX3RleHRfaWQgPSAnbm90aWUtaW5wdXQteWVzLXRleHQnO1xuICAgIHZhciBpbnB1dF9ub190ZXh0X2lkID0gJ25vdGllLWlucHV0LW5vLXRleHQnO1xuXG4gICAgLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cblxuXG5cblxuICAgIC8vIEhFTFBFUlNcbiAgICAvLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuICAgIC8vIEZ1bmN0aW9uIGZvciByZXNpemUgbGlzdGVuZXJzIGZvciBmb250LXNpemVcbiAgICB2YXIgcmVzaXplTGlzdGVuZXIgPSBmdW5jdGlvbiByZXNpemVMaXN0ZW5lcihlbGUpIHtcbiAgICAgICAgaWYgKHdpbmRvdy5pbm5lcldpZHRoIDw9IGZvbnRfY2hhbmdlX3NjcmVlbl93aWR0aCkgeyBlbGUuc3R5bGUuZm9udFNpemUgPSBmb250X3NpemVfc21hbGw7IH1cbiAgICAgICAgZWxzZSB7IGVsZS5zdHlsZS5mb250U2l6ZSA9IGZvbnRfc2l6ZV9iaWc7IH1cbiAgICB9O1xuXG5cbiAgICAvLyBEZWJvdW5jZSBmdW5jdGlvbiAoY3JlZGl0IHRvIFVuZGVyc2NvcmUuanMpXG4gICAgdmFyIGRlYm91bmNlX3RpbWUgPSA1MDA7XG4gICAgdmFyIGRlYm91bmNlID0gZnVuY3Rpb24gZGVib3VuY2UoZnVuYywgd2FpdCwgaW1tZWRpYXRlKSB7XG4gICAgICAgIHZhciB0aW1lb3V0O1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgY29udGV4dCA9IHRoaXMsIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICAgICAgICB2YXIgbGF0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICBpZiAoIWltbWVkaWF0ZSkgZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB2YXIgY2FsbE5vdyA9IGltbWVkaWF0ZSAmJiAhdGltZW91dDtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCB3YWl0KTtcbiAgICAgICAgICAgIGlmIChjYWxsTm93KSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICB9O1xuICAgIH1cblxuXG4gICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIGVudGVyIGFuZCBlc2NhcGUga2V5c1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgdmFyIGVudGVyX2NsaWNrZWQgPSAoZXZlbnQud2hpY2ggPT0gMTMgfHwgZXZlbnQua2V5Q29kZSA9PSAxMyk7XG4gICAgICAgIHZhciBlc2NhcGVfY2xpY2tlZCA9IChldmVudC53aGljaCA9PSAyNyB8fCBldmVudC5rZXlDb2RlID09IDI3KTtcbiAgICAgICAgaWYgKGFsZXJ0X2lzX3Nob3dpbmcpIHtcbiAgICAgICAgICAgIGlmIChlbnRlcl9jbGlja2VkIHx8IGVzY2FwZV9jbGlja2VkKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGFsZXJ0X3RpbWVvdXRfMSk7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGFsZXJ0X3RpbWVvdXRfMik7XG4gICAgICAgICAgICAgICAgYWxlcnRfaGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGNvbmZpcm1faXNfc2hvd2luZykge1xuICAgICAgICAgICAgaWYgKGVudGVyX2NsaWNrZWQpIHtcbiAgICAgICAgICAgICAgICBjb25maXJtX3llcy5jbGljaygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoZXNjYXBlX2NsaWNrZWQpIHtcbiAgICAgICAgICAgICAgICBjb25maXJtX25vLmNsaWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaW5wdXRfaXNfc2hvd2luZykge1xuICAgICAgICAgICAgaWYgKGVudGVyX2NsaWNrZWQpIHtcbiAgICAgICAgICAgICAgICBpbnB1dF95ZXMuY2xpY2soKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGVzY2FwZV9jbGlja2VkKSB7XG4gICAgICAgICAgICAgICAgaW5wdXRfbm8uY2xpY2soKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG5cbiAgICAvLyBhZGRFdmVudExpc3RlbmVyIHBvbHlmaWxsLCBmaXhlcyBhIHN0eWxlLmhlaWdodCBpc3N1ZSBmb3IgSUU4XG4gICAgaWYgKHR5cGVvZiBFbGVtZW50LnByb3RvdHlwZS5hZGRFdmVudExpc3RlbmVyID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICBFbGVtZW50LnByb3RvdHlwZS5hZGRFdmVudExpc3RlbmVyID0gV2luZG93LnByb3RvdHlwZS5hZGRFdmVudExpc3RlbmVyID0gZnVuY3Rpb24gKGUsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBlID0gJ29uJyArIGU7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hdHRhY2hFdmVudChlLCBjYWxsYmFjayk7XG4gICAgICAgIH07XG4gICAgfVxuXG5cbiAgICAvLyBTY3JvbGwgZGlzYWJsZSBhbmQgZW5hYmxlIGZvciBub3RpZS5jb25maXJtIGFuZCBub3RpZS5pbnB1dFxuICAgIHZhciBvcmlnaW5hbF9ib2R5X2hlaWdodCwgb3JpZ2luYWxfYm9keV9vdmVyZmxvdztcbiAgICBmdW5jdGlvbiBzY3JvbGxfZGlzYWJsZSgpIHtcbiAgICAgICAgb3JpZ2luYWxfYm9keV9oZWlnaHQgPSBkb2N1bWVudC5ib2R5LnN0eWxlLmhlaWdodDtcbiAgICAgICAgb3JpZ2luYWxfYm9keV9vdmVyZmxvdyA9IGRvY3VtZW50LmJvZHkuc3R5bGUub3ZlcmZsb3c7XG4gICAgICAgIGRvY3VtZW50LmJvZHkuc3R5bGUuaGVpZ2h0ID0gJzEwMCUnO1xuICAgICAgICBkb2N1bWVudC5ib2R5LnN0eWxlLm92ZXJmbG93ID0gJ2hpZGRlbic7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHNjcm9sbF9lbmFibGUoKSB7XG4gICAgICAgIGRvY3VtZW50LmJvZHkuc3R5bGUuaGVpZ2h0ID0gb3JpZ2luYWxfYm9keV9oZWlnaHQ7XG4gICAgICAgIGRvY3VtZW50LmJvZHkuc3R5bGUub3ZlcmZsb3cgPSBvcmlnaW5hbF9ib2R5X292ZXJmbG93O1xuICAgIH1cbiAgICAvLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuXG5cbiAgICAvLyBOT1RJRS5BTEVSVFxuICAgIC8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG4gICAgLy8gbm90aWUgZWxlbWVudHMgYW5kIHN0eWxpbmdcbiAgICB2YXIgYWxlcnRfb3V0ZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBhbGVydF9vdXRlci5pZCA9IGFsZXJ0X291dGVyX2lkO1xuICAgIGFsZXJ0X291dGVyLnN0eWxlLnBvc2l0aW9uID0gJ2ZpeGVkJztcbiAgICBhbGVydF9vdXRlci5zdHlsZS50b3AgPSAnMCc7XG4gICAgYWxlcnRfb3V0ZXIuc3R5bGUubGVmdCA9ICcwJztcbiAgICBhbGVydF9vdXRlci5zdHlsZS56SW5kZXggPSAnOTk5OTk5OTk5JztcbiAgICBhbGVydF9vdXRlci5zdHlsZS5oZWlnaHQgPSAnYXV0byc7XG4gICAgYWxlcnRfb3V0ZXIuc3R5bGUud2lkdGggPSAnMTAwJSc7XG4gICAgYWxlcnRfb3V0ZXIuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICBhbGVydF9vdXRlci5zdHlsZS50ZXh0QWxpZ24gPSAnY2VudGVyJztcbiAgICBhbGVydF9vdXRlci5zdHlsZS5jdXJzb3IgPSAnZGVmYXVsdCc7XG4gICAgYWxlcnRfb3V0ZXIuc3R5bGUuTW96VHJhbnNpdGlvbiA9ICcnO1xuICAgIGFsZXJ0X291dGVyLnN0eWxlLldlYmtpdFRyYW5zaXRpb24gPSAnJztcbiAgICBhbGVydF9vdXRlci5zdHlsZS50cmFuc2l0aW9uID0gJyc7XG4gICAgYWxlcnRfb3V0ZXIuc3R5bGUuY3Vyc29yID0gJ3BvaW50ZXInO1xuXG4gICAgLy8gSGlkZSBhbGVydCBvbiBjbGlja1xuICAgIGFsZXJ0X291dGVyLm9uY2xpY2sgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KGFsZXJ0X3RpbWVvdXRfMSk7XG4gICAgICAgIGNsZWFyVGltZW91dChhbGVydF90aW1lb3V0XzIpO1xuICAgICAgICBhbGVydF9oaWRlKCk7XG4gICAgfTtcblxuICAgIHZhciBhbGVydF9pbm5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGFsZXJ0X2lubmVyLmlkID0gYWxlcnRfaW5uZXJfaWQ7XG4gICAgYWxlcnRfaW5uZXIuc3R5bGUucGFkZGluZyA9ICcyMHB4JztcbiAgICBhbGVydF9pbm5lci5zdHlsZS5kaXNwbGF5ID0gJ3RhYmxlLWNlbGwnO1xuICAgIGFsZXJ0X2lubmVyLnN0eWxlLnZlcnRpY2FsQWxpZ24gPSAnbWlkZGxlJztcbiAgICBhbGVydF9vdXRlci5hcHBlbmRDaGlsZChhbGVydF9pbm5lcik7XG5cbiAgICAvLyBJbml0aWFsaXplIG5vdGllIHRleHRcbiAgICB2YXIgYWxlcnRfdGV4dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICBhbGVydF90ZXh0LmlkID0gYWxlcnRfdGV4dF9pZDtcbiAgICBhbGVydF90ZXh0LnN0eWxlLmNvbG9yID0gYWxlcnRfY29sb3JfdGV4dDtcbiAgICBpZiAod2luZG93LmlubmVyV2lkdGggPD0gZm9udF9jaGFuZ2Vfc2NyZWVuX3dpZHRoKSB7IGFsZXJ0X3RleHQuc3R5bGUuZm9udFNpemUgPSBmb250X3NpemVfc21hbGw7IH1cbiAgICBlbHNlIHsgYWxlcnRfdGV4dC5zdHlsZS5mb250U2l6ZSA9IGZvbnRfc2l6ZV9iaWc7IH1cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgZGVib3VuY2UocmVzaXplTGlzdGVuZXIuYmluZChudWxsLCBhbGVydF90ZXh0KSwgZGVib3VuY2VfdGltZSksIHRydWUpO1xuICAgIGFsZXJ0X2lubmVyLmFwcGVuZENoaWxkKGFsZXJ0X3RleHQpO1xuXG4gICAgLy8gQXR0YWNoIG5vdGllIHRvIHRoZSBib2R5IGVsZW1lbnRcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGFsZXJ0X291dGVyKTtcblxuICAgIC8vIERlY2xhcmUgdmFyaWFibGVzXG4gICAgdmFyIGhlaWdodCA9IDA7XG4gICAgdmFyIGFsZXJ0X2lzX3Nob3dpbmcgPSBmYWxzZTtcbiAgICB2YXIgYWxlcnRfdGltZW91dF8xO1xuICAgIHZhciBhbGVydF90aW1lb3V0XzI7XG4gICAgdmFyIHdhc19jbGlja2VkX2NvdW50ZXIgPSAwO1xuXG4gICAgZnVuY3Rpb24gYWxlcnQodHlwZSwgbWVzc2FnZSwgc2Vjb25kcykge1xuXG4gICAgICAgIC8vIEJsdXIgYWN0aXZlIGVsZW1lbnQgZm9yIHVzZSBvZiBlbnRlciBrZXksIGZvY3VzIGlucHV0XG4gICAgICAgIGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQuYmx1cigpO1xuXG4gICAgICAgIHdhc19jbGlja2VkX2NvdW50ZXIrKztcblxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgd2FzX2NsaWNrZWRfY291bnRlci0tO1xuICAgICAgICB9LCAoYW5pbWF0aW9uX2RlbGF5ICogMTAwMCArIDEwKSk7XG5cbiAgICAgICAgaWYgKHdhc19jbGlja2VkX2NvdW50ZXIgPT0gMSkge1xuXG4gICAgICAgICAgICBpZiAoYWxlcnRfaXNfc2hvd2luZykge1xuXG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGFsZXJ0X3RpbWVvdXRfMSk7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGFsZXJ0X3RpbWVvdXRfMik7XG5cbiAgICAgICAgICAgICAgICBhbGVydF9oaWRlKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBhbGVydF9zaG93KHR5cGUsIG1lc3NhZ2UsIHNlY29uZHMpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBhbGVydF9zaG93KHR5cGUsIG1lc3NhZ2UsIHNlY29uZHMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFsZXJ0X3Nob3codHlwZSwgbWVzc2FnZSwgc2Vjb25kcykge1xuXG4gICAgICAgIGFsZXJ0X2lzX3Nob3dpbmcgPSB0cnVlO1xuXG4gICAgICAgIHZhciBkdXJhdGlvbiA9IDA7XG4gICAgICAgIGlmICh0eXBlb2Ygc2Vjb25kcyA9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdmFyIGR1cmF0aW9uID0gMzAwMDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChzZWNvbmRzIDwgMSkge1xuICAgICAgICAgICAgZHVyYXRpb24gPSAxMDAwO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZHVyYXRpb24gPSBzZWNvbmRzICogMTAwMDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBub3RpZSB0eXBlIChiYWNrZ3JvdW5kIGNvbG9yKVxuICAgICAgICBzd2l0Y2godHlwZSkge1xuICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgIGFsZXJ0X291dGVyLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IGFsZXJ0X2NvbG9yX3N1Y2Nlc3NfYmFja2dyb3VuZDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgICAgICBhbGVydF9vdXRlci5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBhbGVydF9jb2xvcl93YXJuaW5nX2JhY2tncm91bmQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgICAgICAgYWxlcnRfb3V0ZXIuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gYWxlcnRfY29sb3JfZXJyb3JfYmFja2dyb3VuZDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNDpcbiAgICAgICAgICAgICAgICBhbGVydF9vdXRlci5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBhbGVydF9jb2xvcl9pbmZvX2JhY2tncm91bmQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgbm90aWUgdGV4dFxuICAgICAgICBhbGVydF90ZXh0LmlubmVySFRNTCA9IG1lc3NhZ2U7XG5cbiAgICAgICAgLy8gR2V0IG5vdGllJ3MgaGVpZ2h0XG4gICAgICAgIGFsZXJ0X291dGVyLnN0eWxlLnRvcCA9ICctMTAwMDBweCc7XG4gICAgICAgIGFsZXJ0X291dGVyLnN0eWxlLmRpc3BsYXkgPSAndGFibGUnO1xuICAgICAgICBhbGVydF9vdXRlci5zdHlsZS50b3AgPSAnLScgKyBhbGVydF9vdXRlci5vZmZzZXRIZWlnaHQgLSA1ICsgJ3B4JztcblxuICAgICAgICBhbGVydF90aW1lb3V0XzEgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICBpZiAoc2hhZG93KSB7IGFsZXJ0X291dGVyLnN0eWxlLmJveFNoYWRvdyA9ICcwcHggMHB4IDEwcHggMHB4IHJnYmEoMCwwLDAsMC41KSc7IH1cbiAgICAgICAgICAgIGFsZXJ0X291dGVyLnN0eWxlLk1velRyYW5zaXRpb24gPSAnYWxsICcgKyBhbmltYXRpb25fZGVsYXkgKyAncyBlYXNlJztcbiAgICAgICAgICAgIGFsZXJ0X291dGVyLnN0eWxlLldlYmtpdFRyYW5zaXRpb24gPSAnYWxsICcgKyBhbmltYXRpb25fZGVsYXkgKyAncyBlYXNlJztcbiAgICAgICAgICAgIGFsZXJ0X291dGVyLnN0eWxlLnRyYW5zaXRpb24gPSAnYWxsICcgKyBhbmltYXRpb25fZGVsYXkgKyAncyBlYXNlJztcblxuICAgICAgICAgICAgYWxlcnRfb3V0ZXIuc3R5bGUudG9wID0gMDtcblxuICAgICAgICAgICAgYWxlcnRfdGltZW91dF8yID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgICAgIGFsZXJ0X2hpZGUoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE5vdGhpbmdcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgfSwgZHVyYXRpb24pO1xuXG4gICAgICAgIH0sIDIwKTtcblxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFsZXJ0X2hpZGUoY2FsbGJhY2spIHtcblxuICAgICAgICBhbGVydF9vdXRlci5zdHlsZS50b3AgPSAnLScgKyBhbGVydF9vdXRlci5vZmZzZXRIZWlnaHQgLSA1ICsgJ3B4JztcblxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICBpZiAoc2hhZG93KSB7IGFsZXJ0X291dGVyLnN0eWxlLmJveFNoYWRvdyA9ICcnOyB9XG4gICAgICAgICAgICBhbGVydF9vdXRlci5zdHlsZS5Nb3pUcmFuc2l0aW9uID0gJyc7XG4gICAgICAgICAgICBhbGVydF9vdXRlci5zdHlsZS5XZWJraXRUcmFuc2l0aW9uID0gJyc7XG4gICAgICAgICAgICBhbGVydF9vdXRlci5zdHlsZS50cmFuc2l0aW9uID0gJyc7XG5cbiAgICAgICAgICAgIGFsZXJ0X291dGVyLnN0eWxlLnRvcCA9ICctMTAwMDBweCc7XG5cbiAgICAgICAgICAgIGFsZXJ0X2lzX3Nob3dpbmcgPSBmYWxzZTtcblxuICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSB7IGNhbGxiYWNrKCk7IH1cblxuICAgICAgICB9LCAoYW5pbWF0aW9uX2RlbGF5ICogMTAwMCArIDEwKSk7XG5cbiAgICB9XG5cblxuXG4gICAgLy8gTk9USUUuQ09ORklSTVxuICAgIC8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG4gICAgLy8gY29uZmlybSBlbGVtZW50cyBhbmQgc3R5bGluZ1xuICAgIHZhciBjb25maXJtX291dGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgY29uZmlybV9vdXRlci5pZCA9IGNvbmZpcm1fb3V0ZXJfaWQ7XG4gICAgY29uZmlybV9vdXRlci5zdHlsZS5wb3NpdGlvbiA9ICdmaXhlZCc7XG4gICAgY29uZmlybV9vdXRlci5zdHlsZS50b3AgPSAnMCc7XG4gICAgY29uZmlybV9vdXRlci5zdHlsZS5sZWZ0ID0gJzAnO1xuICAgIGNvbmZpcm1fb3V0ZXIuc3R5bGUuekluZGV4ID0gJzk5OTk5OTk5OCc7XG4gICAgY29uZmlybV9vdXRlci5zdHlsZS5oZWlnaHQgPSAnYXV0byc7XG4gICAgY29uZmlybV9vdXRlci5zdHlsZS53aWR0aCA9ICcxMDAlJztcbiAgICBjb25maXJtX291dGVyLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgY29uZmlybV9vdXRlci5zdHlsZS50ZXh0QWxpZ24gPSAnY2VudGVyJztcbiAgICBjb25maXJtX291dGVyLnN0eWxlLk1velRyYW5zaXRpb24gPSAnJztcbiAgICBjb25maXJtX291dGVyLnN0eWxlLldlYmtpdFRyYW5zaXRpb24gPSAnJztcbiAgICBjb25maXJtX291dGVyLnN0eWxlLnRyYW5zaXRpb24gPSAnJztcblxuICAgIHZhciBjb25maXJtX2JhY2tncm91bmQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBjb25maXJtX2JhY2tncm91bmQuaWQgPSBjb25maXJtX2JhY2tncm91bmRfaWQ7XG4gICAgY29uZmlybV9iYWNrZ3JvdW5kLnN0eWxlLnBvc2l0aW9uID0gJ2ZpeGVkJztcbiAgICBjb25maXJtX2JhY2tncm91bmQuc3R5bGUudG9wID0gJzAnO1xuICAgIGNvbmZpcm1fYmFja2dyb3VuZC5zdHlsZS5sZWZ0ID0gJzAnO1xuICAgIGNvbmZpcm1fYmFja2dyb3VuZC5zdHlsZS56SW5kZXggPSAnOTk5OTk5OTk3JztcbiAgICBjb25maXJtX2JhY2tncm91bmQuc3R5bGUuaGVpZ2h0ID0gJzEwMCUnO1xuICAgIGNvbmZpcm1fYmFja2dyb3VuZC5zdHlsZS53aWR0aCA9ICcxMDAlJztcbiAgICBjb25maXJtX2JhY2tncm91bmQuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICBjb25maXJtX2JhY2tncm91bmQuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJ3doaXRlJztcbiAgICBjb25maXJtX2JhY2tncm91bmQuc3R5bGUuTW96VHJhbnNpdGlvbiA9ICdhbGwgJyArIGFuaW1hdGlvbl9kZWxheSArICdzIGVhc2UnO1xuICAgIGNvbmZpcm1fYmFja2dyb3VuZC5zdHlsZS5XZWJraXRUcmFuc2l0aW9uID0gJ2FsbCAnICsgYW5pbWF0aW9uX2RlbGF5ICsgJ3MgZWFzZSc7XG4gICAgY29uZmlybV9iYWNrZ3JvdW5kLnN0eWxlLnRyYW5zaXRpb24gPSAnYWxsICcgKyBhbmltYXRpb25fZGVsYXkgKyAncyBlYXNlJztcbiAgICBjb25maXJtX2JhY2tncm91bmQuc3R5bGUub3BhY2l0eSA9ICcwJztcblxuICAgIC8vIEhpZGUgbm90aWUuY29uZmlybSBvbiBiYWNrZ3JvdW5kIGNsaWNrXG4gICAgY29uZmlybV9iYWNrZ3JvdW5kLm9uY2xpY2sgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKGJhY2tncm91bmRfY2xpY2tfZGlzbWlzcykge1xuICAgICAgICAgICAgY29uZmlybV9oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGNvbmZpcm1faW5uZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBjb25maXJtX2lubmVyLmlkID0gY29uZmlybV9pbm5lcl9pZDtcbiAgICBjb25maXJtX2lubmVyLnN0eWxlLmJveFNpemluZyA9ICdib3JkZXItYm94JztcbiAgICBjb25maXJtX2lubmVyLnN0eWxlLndpZHRoID0gJzEwMCUnO1xuICAgIGNvbmZpcm1faW5uZXIuc3R5bGUucGFkZGluZyA9ICcyMHB4JztcbiAgICBjb25maXJtX2lubmVyLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xuICAgIGNvbmZpcm1faW5uZXIuc3R5bGUuY3Vyc29yID0gJ2RlZmF1bHQnO1xuICAgIGNvbmZpcm1faW5uZXIuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gY29uZmlybV9hbmRfaW5wdXRfY29sb3JfYmFja2dyb3VuZDtcbiAgICBjb25maXJtX291dGVyLmFwcGVuZENoaWxkKGNvbmZpcm1faW5uZXIpO1xuXG4gICAgdmFyIGNvbmZpcm1feWVzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgY29uZmlybV95ZXMuaWQgPSBjb25maXJtX3llc19pZDtcbiAgICBjb25maXJtX3llcy5zdHlsZS5jc3NGbG9hdCA9ICdsZWZ0JztcbiAgICBjb25maXJtX3llcy5zdHlsZS5oZWlnaHQgPSAnNTBweCc7XG4gICAgY29uZmlybV95ZXMuc3R5bGUubGluZUhlaWdodCA9ICc1MHB4JztcbiAgICBjb25maXJtX3llcy5zdHlsZS53aWR0aCA9ICc1MCUnO1xuICAgIGNvbmZpcm1feWVzLnN0eWxlLmN1cnNvciA9ICdwb2ludGVyJztcbiAgICBjb25maXJtX3llcy5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBjb25maXJtX2FuZF9pbnB1dF9jb2xvcl95ZXNfYmFja2dyb3VuZDtcbiAgICBjb25maXJtX291dGVyLmFwcGVuZENoaWxkKGNvbmZpcm1feWVzKTtcblxuICAgIHZhciBjb25maXJtX25vID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgY29uZmlybV9uby5pZCA9IGNvbmZpcm1fbm9faWQ7XG4gICAgY29uZmlybV9uby5zdHlsZS5jc3NGbG9hdCA9ICdyaWdodCc7XG4gICAgY29uZmlybV9uby5zdHlsZS5oZWlnaHQgPSAnNTBweCc7XG4gICAgY29uZmlybV9uby5zdHlsZS5saW5lSGVpZ2h0ID0gJzUwcHgnO1xuICAgIGNvbmZpcm1fbm8uc3R5bGUud2lkdGggPSAnNTAlJztcbiAgICBjb25maXJtX25vLnN0eWxlLmN1cnNvciA9ICdwb2ludGVyJztcbiAgICBjb25maXJtX25vLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IGNvbmZpcm1fYW5kX2lucHV0X2NvbG9yX25vX2JhY2tncm91bmQ7XG4gICAgY29uZmlybV9uby5vbmNsaWNrID0gZnVuY3Rpb24oKSB7IGNvbmZpcm1faGlkZSgpOyB9XG4gICAgY29uZmlybV9vdXRlci5hcHBlbmRDaGlsZChjb25maXJtX25vKTtcblxuICAgIC8vIEluaXRpYWxpemUgY29uZmlybSB0ZXh0XG4gICAgdmFyIGNvbmZpcm1fdGV4dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICBjb25maXJtX3RleHQuaWQgPSBjb25maXJtX3RleHRfaWQ7XG4gICAgY29uZmlybV90ZXh0LnN0eWxlLmNvbG9yID0gY29uZmlybV9hbmRfaW5wdXRfY29sb3JfdGV4dDtcbiAgICBpZiAod2luZG93LmlubmVyV2lkdGggPD0gZm9udF9jaGFuZ2Vfc2NyZWVuX3dpZHRoKSB7IGNvbmZpcm1fdGV4dC5zdHlsZS5mb250U2l6ZSA9IGZvbnRfc2l6ZV9zbWFsbDsgfVxuICAgIGVsc2UgeyBjb25maXJtX3RleHQuc3R5bGUuZm9udFNpemUgPSBmb250X3NpemVfYmlnOyB9XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIGRlYm91bmNlKHJlc2l6ZUxpc3RlbmVyLmJpbmQobnVsbCwgY29uZmlybV90ZXh0KSwgZGVib3VuY2VfdGltZSksIHRydWUpO1xuICAgIGNvbmZpcm1faW5uZXIuYXBwZW5kQ2hpbGQoY29uZmlybV90ZXh0KTtcblxuICAgIHZhciBjb25maXJtX3llc190ZXh0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgIGNvbmZpcm1feWVzX3RleHQuaWQgPSBjb25maXJtX3llc190ZXh0X2lkO1xuICAgIGNvbmZpcm1feWVzX3RleHQuc3R5bGUuY29sb3IgPSBjb25maXJtX2FuZF9pbnB1dF9jb2xvcl95ZXNfdGV4dDtcbiAgICBpZiAod2luZG93LmlubmVyV2lkdGggPD0gZm9udF9jaGFuZ2Vfc2NyZWVuX3dpZHRoKSB7IGNvbmZpcm1feWVzX3RleHQuc3R5bGUuZm9udFNpemUgPSBmb250X3NpemVfc21hbGw7IH1cbiAgICBlbHNlIHsgY29uZmlybV95ZXNfdGV4dC5zdHlsZS5mb250U2l6ZSA9IGZvbnRfc2l6ZV9iaWc7IH1cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgZGVib3VuY2UocmVzaXplTGlzdGVuZXIuYmluZChudWxsLCBjb25maXJtX3llc190ZXh0KSwgZGVib3VuY2VfdGltZSksIHRydWUpO1xuICAgIGNvbmZpcm1feWVzLmFwcGVuZENoaWxkKGNvbmZpcm1feWVzX3RleHQpO1xuXG4gICAgdmFyIGNvbmZpcm1fbm9fdGV4dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICBjb25maXJtX25vX3RleHQuaWQgPSBjb25maXJtX25vX3RleHRfaWQ7XG4gICAgY29uZmlybV9ub190ZXh0LnN0eWxlLmNvbG9yID0gY29uZmlybV9hbmRfaW5wdXRfY29sb3Jfbm9fdGV4dDtcbiAgICBpZiAod2luZG93LmlubmVyV2lkdGggPD0gZm9udF9jaGFuZ2Vfc2NyZWVuX3dpZHRoKSB7IGNvbmZpcm1fbm9fdGV4dC5zdHlsZS5mb250U2l6ZSA9IGZvbnRfc2l6ZV9zbWFsbDsgfVxuICAgIGVsc2UgeyBjb25maXJtX25vX3RleHQuc3R5bGUuZm9udFNpemUgPSBmb250X3NpemVfYmlnOyB9XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIGRlYm91bmNlKHJlc2l6ZUxpc3RlbmVyLmJpbmQobnVsbCwgY29uZmlybV9ub190ZXh0KSwgZGVib3VuY2VfdGltZSksIHRydWUpO1xuICAgIGNvbmZpcm1fbm8uYXBwZW5kQ2hpbGQoY29uZmlybV9ub190ZXh0KTtcblxuICAgIC8vIEF0dGFjaCBjb25maXJtIGVsZW1lbnRzIHRvIHRoZSBib2R5IGVsZW1lbnRcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGNvbmZpcm1fb3V0ZXIpO1xuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoY29uZmlybV9iYWNrZ3JvdW5kKTtcblxuICAgIC8vIERlY2xhcmUgdmFyaWFibGVzXG4gICAgdmFyIGNvbmZpcm1faGVpZ2h0ID0gMDtcbiAgICB2YXIgY29uZmlybV9pc19zaG93aW5nID0gZmFsc2U7XG5cbiAgICBmdW5jdGlvbiBjb25maXJtKHRpdGxlLCB5ZXNfdGV4dCwgbm9fdGV4dCwgeWVzX2NhbGxiYWNrKSB7XG5cbiAgICAgICAgLy8gQmx1ciBhY3RpdmUgZWxlbWVudCBmb3IgdXNlIG9mIGVudGVyIGtleVxuICAgICAgICBkb2N1bWVudC5hY3RpdmVFbGVtZW50LmJsdXIoKTtcblxuICAgICAgICBpZiAoYWxlcnRfaXNfc2hvd2luZykge1xuICAgICAgICAgICAgLy8gSGlkZSBub3RpZS5hbGVydFxuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGFsZXJ0X3RpbWVvdXRfMSk7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoYWxlcnRfdGltZW91dF8yKTtcbiAgICAgICAgICAgIGFsZXJ0X2hpZGUoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgY29uZmlybV9zaG93KHRpdGxlLCB5ZXNfdGV4dCwgbm9fdGV4dCwgeWVzX2NhbGxiYWNrKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY29uZmlybV9zaG93KHRpdGxlLCB5ZXNfdGV4dCwgbm9fdGV4dCwgeWVzX2NhbGxiYWNrKTtcbiAgICAgICAgfVxuXG5cbiAgICB9XG4gICAgZnVuY3Rpb24gY29uZmlybV9zaG93KHRpdGxlLCB5ZXNfdGV4dCwgbm9fdGV4dCwgeWVzX2NhbGxiYWNrKSB7XG5cbiAgICAgICAgc2Nyb2xsX2Rpc2FibGUoKTtcblxuICAgICAgICAvLyBZZXMgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgICAgY29uZmlybV95ZXMub25jbGljayA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uZmlybV9oaWRlKCk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHllc19jYWxsYmFjaygpO1xuICAgICAgICAgICAgfSwgKGFuaW1hdGlvbl9kZWxheSAqIDEwMDAgKyAxMCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gY29uZmlybV9zaG93X2lubmVyKCkge1xuXG4gICAgICAgICAgICAvLyBTZXQgY29uZmlybSB0ZXh0XG4gICAgICAgICAgICBjb25maXJtX3RleHQuaW5uZXJIVE1MID0gdGl0bGU7XG4gICAgICAgICAgICBjb25maXJtX3llc190ZXh0LmlubmVySFRNTCA9IHllc190ZXh0O1xuICAgICAgICAgICAgY29uZmlybV9ub190ZXh0LmlubmVySFRNTCA9IG5vX3RleHQ7XG5cbiAgICAgICAgICAgIC8vIEdldCBjb25maXJtJ3MgaGVpZ2h0XG4gICAgICAgICAgICBjb25maXJtX291dGVyLnN0eWxlLnRvcCA9ICctMTAwMDBweCc7XG4gICAgICAgICAgICBjb25maXJtX291dGVyLnN0eWxlLmRpc3BsYXkgPSAndGFibGUnO1xuICAgICAgICAgICAgY29uZmlybV9vdXRlci5zdHlsZS50b3AgPSAnLScgKyBjb25maXJtX291dGVyLm9mZnNldEhlaWdodCAtIDUgKyAncHgnO1xuICAgICAgICAgICAgY29uZmlybV9iYWNrZ3JvdW5kLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xuXG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICAgICAgaWYgKHNoYWRvdykgeyBjb25maXJtX291dGVyLnN0eWxlLmJveFNoYWRvdyA9ICcwcHggMHB4IDEwcHggMHB4IHJnYmEoMCwwLDAsMC41KSc7IH1cbiAgICAgICAgICAgICAgICBjb25maXJtX291dGVyLnN0eWxlLk1velRyYW5zaXRpb24gPSAnYWxsICcgKyBhbmltYXRpb25fZGVsYXkgKyAncyBlYXNlJztcbiAgICAgICAgICAgICAgICBjb25maXJtX291dGVyLnN0eWxlLldlYmtpdFRyYW5zaXRpb24gPSAnYWxsICcgKyBhbmltYXRpb25fZGVsYXkgKyAncyBlYXNlJztcbiAgICAgICAgICAgICAgICBjb25maXJtX291dGVyLnN0eWxlLnRyYW5zaXRpb24gPSAnYWxsICcgKyBhbmltYXRpb25fZGVsYXkgKyAncyBlYXNlJztcblxuICAgICAgICAgICAgICAgIGNvbmZpcm1fb3V0ZXIuc3R5bGUudG9wID0gMDtcbiAgICAgICAgICAgICAgICBjb25maXJtX2JhY2tncm91bmQuc3R5bGUub3BhY2l0eSA9ICcwLjc1JztcblxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpcm1faXNfc2hvd2luZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSwgKGFuaW1hdGlvbl9kZWxheSAqIDEwMDAgKyAxMCkpO1xuXG4gICAgICAgICAgICB9LCAyMCk7XG5cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25maXJtX2lzX3Nob3dpbmcpIHtcbiAgICAgICAgICAgIGNvbmZpcm1faGlkZSgpO1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBjb25maXJtX3Nob3dfaW5uZXIoKTtcbiAgICAgICAgICAgIH0sIChhbmltYXRpb25fZGVsYXkgKiAxMDAwICsgMTApKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNvbmZpcm1fc2hvd19pbm5lcigpO1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb25maXJtX2hpZGUoKSB7XG5cbiAgICAgICAgY29uZmlybV9vdXRlci5zdHlsZS50b3AgPSAnLScgKyBjb25maXJtX291dGVyLm9mZnNldEhlaWdodCAtIDUgKyAncHgnO1xuICAgICAgICBjb25maXJtX2JhY2tncm91bmQuc3R5bGUub3BhY2l0eSA9ICcwJztcblxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICBpZiAoc2hhZG93KSB7IGNvbmZpcm1fb3V0ZXIuc3R5bGUuYm94U2hhZG93ID0gJyc7IH1cbiAgICAgICAgICAgIGNvbmZpcm1fb3V0ZXIuc3R5bGUuTW96VHJhbnNpdGlvbiA9ICcnO1xuICAgICAgICAgICAgY29uZmlybV9vdXRlci5zdHlsZS5XZWJraXRUcmFuc2l0aW9uID0gJyc7XG4gICAgICAgICAgICBjb25maXJtX291dGVyLnN0eWxlLnRyYW5zaXRpb24gPSAnJztcbiAgICAgICAgICAgIGNvbmZpcm1fYmFja2dyb3VuZC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuXG4gICAgICAgICAgICBjb25maXJtX291dGVyLnN0eWxlLnRvcCA9ICctMTAwMDBweCc7XG5cbiAgICAgICAgICAgIHNjcm9sbF9lbmFibGUoKTtcblxuICAgICAgICAgICAgY29uZmlybV9pc19zaG93aW5nID0gZmFsc2U7XG5cbiAgICAgICAgfSwgKGFuaW1hdGlvbl9kZWxheSAqIDEwMDAgKyAxMCkpO1xuXG4gICAgfVxuXG5cblxuXG4gICAgLy8gTk9USUUuSU5QVVRcbiAgICAvLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuICAgIC8vIGlucHV0IGVsZW1lbnRzIGFuZCBzdHlsaW5nXG4gICAgdmFyIGlucHV0X291dGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgaW5wdXRfb3V0ZXIuaWQgPSBpbnB1dF9vdXRlcl9pZDtcbiAgICBpbnB1dF9vdXRlci5zdHlsZS5wb3NpdGlvbiA9ICdmaXhlZCc7XG4gICAgaW5wdXRfb3V0ZXIuc3R5bGUudG9wID0gJzAnO1xuICAgIGlucHV0X291dGVyLnN0eWxlLmxlZnQgPSAnMCc7XG4gICAgaW5wdXRfb3V0ZXIuc3R5bGUuekluZGV4ID0gJzk5OTk5OTk5OCc7XG4gICAgaW5wdXRfb3V0ZXIuc3R5bGUuaGVpZ2h0ID0gJ2F1dG8nO1xuICAgIGlucHV0X291dGVyLnN0eWxlLndpZHRoID0gJzEwMCUnO1xuICAgIGlucHV0X291dGVyLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgaW5wdXRfb3V0ZXIuc3R5bGUudGV4dEFsaWduID0gJ2NlbnRlcic7XG4gICAgaW5wdXRfb3V0ZXIuc3R5bGUuTW96VHJhbnNpdGlvbiA9ICcnO1xuICAgIGlucHV0X291dGVyLnN0eWxlLldlYmtpdFRyYW5zaXRpb24gPSAnJztcbiAgICBpbnB1dF9vdXRlci5zdHlsZS50cmFuc2l0aW9uID0gJyc7XG5cbiAgICB2YXIgaW5wdXRfYmFja2dyb3VuZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGlucHV0X2JhY2tncm91bmQuaWQgPSBpbnB1dF9iYWNrZ3JvdW5kX2lkO1xuICAgIGlucHV0X2JhY2tncm91bmQuc3R5bGUucG9zaXRpb24gPSAnZml4ZWQnO1xuICAgIGlucHV0X2JhY2tncm91bmQuc3R5bGUudG9wID0gJzAnO1xuICAgIGlucHV0X2JhY2tncm91bmQuc3R5bGUubGVmdCA9ICcwJztcbiAgICBpbnB1dF9iYWNrZ3JvdW5kLnN0eWxlLnpJbmRleCA9ICc5OTk5OTk5OTcnO1xuICAgIGlucHV0X2JhY2tncm91bmQuc3R5bGUuaGVpZ2h0ID0gJzEwMCUnO1xuICAgIGlucHV0X2JhY2tncm91bmQuc3R5bGUud2lkdGggPSAnMTAwJSc7XG4gICAgaW5wdXRfYmFja2dyb3VuZC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgIGlucHV0X2JhY2tncm91bmQuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJ3doaXRlJztcbiAgICBpbnB1dF9iYWNrZ3JvdW5kLnN0eWxlLk1velRyYW5zaXRpb24gPSAnYWxsICcgKyBhbmltYXRpb25fZGVsYXkgKyAncyBlYXNlJztcbiAgICBpbnB1dF9iYWNrZ3JvdW5kLnN0eWxlLldlYmtpdFRyYW5zaXRpb24gPSAnYWxsICcgKyBhbmltYXRpb25fZGVsYXkgKyAncyBlYXNlJztcbiAgICBpbnB1dF9iYWNrZ3JvdW5kLnN0eWxlLnRyYW5zaXRpb24gPSAnYWxsICcgKyBhbmltYXRpb25fZGVsYXkgKyAncyBlYXNlJztcbiAgICBpbnB1dF9iYWNrZ3JvdW5kLnN0eWxlLm9wYWNpdHkgPSAnMCc7XG5cbiAgICAvLyBIaWRlIG5vdGllLmlucHV0IG9uIGJhY2tncm91bmQgY2xpY2tcbiAgICBpbnB1dF9iYWNrZ3JvdW5kLm9uY2xpY2sgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKGJhY2tncm91bmRfY2xpY2tfZGlzbWlzcykge1xuICAgICAgICAgICAgaW5wdXRfaGlkZSgpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBpbnB1dF9pbm5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGlucHV0X2lubmVyLmlkID0gaW5wdXRfaW5uZXJfaWQ7XG4gICAgaW5wdXRfaW5uZXIuc3R5bGUuYm94U2l6aW5nID0gJ2JvcmRlci1ib3gnO1xuICAgIGlucHV0X2lubmVyLnN0eWxlLndpZHRoID0gJzEwMCUnO1xuICAgIGlucHV0X2lubmVyLnN0eWxlLnBhZGRpbmcgPSAnMjBweCc7XG4gICAgaW5wdXRfaW5uZXIuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG4gICAgaW5wdXRfaW5uZXIuc3R5bGUuY3Vyc29yID0gJ2RlZmF1bHQnO1xuICAgIGlucHV0X2lubmVyLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IGNvbmZpcm1fYW5kX2lucHV0X2NvbG9yX2JhY2tncm91bmQ7XG4gICAgaW5wdXRfb3V0ZXIuYXBwZW5kQ2hpbGQoaW5wdXRfaW5uZXIpO1xuXG4gICAgdmFyIGlucHV0X2RpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGlucHV0X2Rpdi5pZCA9IGlucHV0X2Rpdl9pZDtcbiAgICBpbnB1dF9kaXYuc3R5bGUuYm94U2l6aW5nID0gJ2JvcmRlci1ib3gnO1xuICAgIGlucHV0X2Rpdi5zdHlsZS5oZWlnaHQgPSAnNTVweCc7XG4gICAgaW5wdXRfZGl2LnN0eWxlLndpZHRoID0gJzEwMCUnO1xuICAgIGlucHV0X2Rpdi5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcbiAgICBpbnB1dF9kaXYuc3R5bGUuY3Vyc29yID0gJ2RlZmF1bHQnO1xuICAgIGlucHV0X2Rpdi5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAnI0ZGRic7XG4gICAgaW5wdXRfb3V0ZXIuYXBwZW5kQ2hpbGQoaW5wdXRfZGl2KTtcblxuICAgIHZhciBpbnB1dF9maWVsZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gICAgaW5wdXRfZmllbGQuaWQgPSBpbnB1dF9maWVsZF9pZDtcbiAgICBpbnB1dF9maWVsZC5zZXRBdHRyaWJ1dGUoJ2F1dG9jb21wbGV0ZScsICdvZmYnKTtcbiAgICBpbnB1dF9maWVsZC5zZXRBdHRyaWJ1dGUoJ2F1dG9jb3JyZWN0JywgJ29mZicpO1xuICAgIGlucHV0X2ZpZWxkLnNldEF0dHJpYnV0ZSgnYXV0b2NhcGl0YWxpemUnLCAnb2ZmJyk7XG4gICAgaW5wdXRfZmllbGQuc2V0QXR0cmlidXRlKCdzcGVsbGNoZWNrJywgJ2ZhbHNlJyk7XG4gICAgaW5wdXRfZmllbGQuc3R5bGUuYm94U2l6aW5nID0gJ2JvcmRlci1ib3gnO1xuICAgIGlucHV0X2ZpZWxkLnN0eWxlLmhlaWdodCA9ICc1NXB4JztcbiAgICBpbnB1dF9maWVsZC5zdHlsZS53aWR0aCA9ICcxMDAlJztcbiAgICBpbnB1dF9maWVsZC5zdHlsZS50ZXh0QWxpZ24gPSAnY2VudGVyJztcbiAgICBpbnB1dF9maWVsZC5zdHlsZS50ZXh0SW5kZW50ID0gJzEwcHgnO1xuICAgIGlucHV0X2ZpZWxkLnN0eWxlLnBhZGRpbmdSaWdodCA9ICcxMHB4JztcbiAgICBpbnB1dF9maWVsZC5zdHlsZS5vdXRsaW5lID0gJzAnO1xuICAgIGlucHV0X2ZpZWxkLnN0eWxlLmJvcmRlciA9ICcwJztcbiAgICBpbnB1dF9maWVsZC5zdHlsZS5mb250RmFtaWx5ID0gJ2luaGVyaXQnO1xuICAgIGlucHV0X2ZpZWxkLnN0eWxlLmZvbnRTaXplID0gZm9udF9zaXplX2JpZztcbiAgICBpZiAod2luZG93LmlubmVyV2lkdGggPD0gZm9udF9jaGFuZ2Vfc2NyZWVuX3dpZHRoKSB7IGlucHV0X2ZpZWxkLnN0eWxlLmZvbnRTaXplID0gZm9udF9zaXplX3NtYWxsOyB9XG4gICAgZWxzZSB7IGlucHV0X2ZpZWxkLnN0eWxlLmZvbnRTaXplID0gZm9udF9zaXplX2JpZzsgfVxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCBkZWJvdW5jZShyZXNpemVMaXN0ZW5lci5iaW5kKG51bGwsIGlucHV0X2ZpZWxkKSwgZGVib3VuY2VfdGltZSksIHRydWUpO1xuICAgIGlucHV0X2Rpdi5hcHBlbmRDaGlsZChpbnB1dF9maWVsZCk7XG5cbiAgICB2YXIgaW5wdXRfeWVzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgaW5wdXRfeWVzLmlkID0gaW5wdXRfeWVzX2lkO1xuICAgIGlucHV0X3llcy5zdHlsZS5jc3NGbG9hdCA9ICdsZWZ0JztcbiAgICBpbnB1dF95ZXMuc3R5bGUuaGVpZ2h0ID0gJzUwcHgnO1xuICAgIGlucHV0X3llcy5zdHlsZS5saW5lSGVpZ2h0ID0gJzUwcHgnO1xuICAgIGlucHV0X3llcy5zdHlsZS53aWR0aCA9ICc1MCUnO1xuICAgIGlucHV0X3llcy5zdHlsZS5jdXJzb3IgPSAncG9pbnRlcic7XG4gICAgaW5wdXRfeWVzLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IGNvbmZpcm1fYW5kX2lucHV0X2NvbG9yX3llc19iYWNrZ3JvdW5kO1xuICAgIGlucHV0X291dGVyLmFwcGVuZENoaWxkKGlucHV0X3llcyk7XG5cbiAgICB2YXIgaW5wdXRfbm8gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBpbnB1dF9uby5pZCA9IGlucHV0X25vX2lkO1xuICAgIGlucHV0X25vLnN0eWxlLmNzc0Zsb2F0ID0gJ3JpZ2h0JztcbiAgICBpbnB1dF9uby5zdHlsZS5oZWlnaHQgPSAnNTBweCc7XG4gICAgaW5wdXRfbm8uc3R5bGUubGluZUhlaWdodCA9ICc1MHB4JztcbiAgICBpbnB1dF9uby5zdHlsZS53aWR0aCA9ICc1MCUnO1xuICAgIGlucHV0X25vLnN0eWxlLmN1cnNvciA9ICdwb2ludGVyJztcbiAgICBpbnB1dF9uby5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBjb25maXJtX2FuZF9pbnB1dF9jb2xvcl9ub19iYWNrZ3JvdW5kO1xuICAgIGlucHV0X25vLm9uY2xpY2sgPSBmdW5jdGlvbigpIHsgaW5wdXRfaGlkZSgpOyB9XG4gICAgaW5wdXRfb3V0ZXIuYXBwZW5kQ2hpbGQoaW5wdXRfbm8pO1xuXG4gICAgLy8gSW5pdGlhbGl6ZSBpbnB1dCB0ZXh0XG4gICAgdmFyIGlucHV0X3RleHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgaW5wdXRfdGV4dC5pZCA9IGlucHV0X3RleHRfaWQ7XG4gICAgaW5wdXRfdGV4dC5zdHlsZS5jb2xvciA9IGNvbmZpcm1fYW5kX2lucHV0X2NvbG9yX3RleHQ7XG4gICAgaWYgKHdpbmRvdy5pbm5lcldpZHRoIDw9IGZvbnRfY2hhbmdlX3NjcmVlbl93aWR0aCkgeyBpbnB1dF90ZXh0LnN0eWxlLmZvbnRTaXplID0gZm9udF9zaXplX3NtYWxsOyB9XG4gICAgZWxzZSB7IGlucHV0X3RleHQuc3R5bGUuZm9udFNpemUgPSBmb250X3NpemVfYmlnOyB9XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIGRlYm91bmNlKHJlc2l6ZUxpc3RlbmVyLmJpbmQobnVsbCwgaW5wdXRfdGV4dCksIGRlYm91bmNlX3RpbWUpLCB0cnVlKTtcbiAgICBpbnB1dF9pbm5lci5hcHBlbmRDaGlsZChpbnB1dF90ZXh0KTtcblxuICAgIHZhciBpbnB1dF95ZXNfdGV4dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICBpbnB1dF95ZXNfdGV4dC5pZCA9IGlucHV0X3llc190ZXh0X2lkO1xuICAgIGlucHV0X3llc190ZXh0LnN0eWxlLmNvbG9yID0gY29uZmlybV9hbmRfaW5wdXRfY29sb3JfeWVzX3RleHQ7XG4gICAgaWYgKHdpbmRvdy5pbm5lcldpZHRoIDw9IGZvbnRfY2hhbmdlX3NjcmVlbl93aWR0aCkgeyBpbnB1dF95ZXNfdGV4dC5zdHlsZS5mb250U2l6ZSA9IGZvbnRfc2l6ZV9zbWFsbDsgfVxuICAgIGVsc2UgeyBpbnB1dF95ZXNfdGV4dC5zdHlsZS5mb250U2l6ZSA9IGZvbnRfc2l6ZV9iaWc7IH1cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgZGVib3VuY2UocmVzaXplTGlzdGVuZXIuYmluZChudWxsLCBpbnB1dF95ZXNfdGV4dCksIGRlYm91bmNlX3RpbWUpLCB0cnVlKTtcbiAgICBpbnB1dF95ZXMuYXBwZW5kQ2hpbGQoaW5wdXRfeWVzX3RleHQpO1xuXG4gICAgdmFyIGlucHV0X25vX3RleHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgaW5wdXRfbm9fdGV4dC5pZCA9IGlucHV0X25vX3RleHRfaWQ7XG4gICAgaW5wdXRfbm9fdGV4dC5zdHlsZS5jb2xvciA9IGNvbmZpcm1fYW5kX2lucHV0X2NvbG9yX25vX3RleHQ7XG4gICAgaWYgKHdpbmRvdy5pbm5lcldpZHRoIDw9IGZvbnRfY2hhbmdlX3NjcmVlbl93aWR0aCkgeyBpbnB1dF9ub190ZXh0LnN0eWxlLmZvbnRTaXplID0gZm9udF9zaXplX3NtYWxsOyB9XG4gICAgZWxzZSB7IGlucHV0X25vX3RleHQuc3R5bGUuZm9udFNpemUgPSBmb250X3NpemVfYmlnOyB9XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIGRlYm91bmNlKHJlc2l6ZUxpc3RlbmVyLmJpbmQobnVsbCwgaW5wdXRfbm9fdGV4dCksIGRlYm91bmNlX3RpbWUpLCB0cnVlKTtcbiAgICBpbnB1dF9uby5hcHBlbmRDaGlsZChpbnB1dF9ub190ZXh0KTtcblxuICAgIC8vIEF0dGFjaCBpbnB1dCBlbGVtZW50cyB0byB0aGUgYm9keSBlbGVtZW50XG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChpbnB1dF9vdXRlcik7XG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChpbnB1dF9iYWNrZ3JvdW5kKTtcblxuICAgIC8vIERlY2xhcmUgdmFyaWFibGVzXG4gICAgdmFyIGlucHV0X2hlaWdodCA9IDA7XG4gICAgdmFyIGlucHV0X2lzX3Nob3dpbmcgPSBmYWxzZTtcblxuICAgIGZ1bmN0aW9uIGlucHV0KHRpdGxlLCBzdWJtaXRfdGV4dCwgY2FuY2VsX3RleHQsIHR5cGUsIHBsYWNlaG9sZGVyLCBzdWJtaXRfY2FsbGJhY2ssIHByZWZpbGxlZF92YWx1ZV9vcHRpb25hbCkge1xuXG4gICAgICAgIC8vIEJsdXIgYWN0aXZlIGVsZW1lbnQgZm9yIHVzZSBvZiBlbnRlciBrZXksIGZvY3VzIGlucHV0XG4gICAgICAgIGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQuYmx1cigpO1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBpbnB1dF9maWVsZC5mb2N1cygpOyB9LCAoYW5pbWF0aW9uX2RlbGF5ICogMTAwMCkpO1xuXG4gICAgICAgIGlucHV0X2ZpZWxkLnNldEF0dHJpYnV0ZSgndHlwZScsIHR5cGUpO1xuICAgICAgICBpbnB1dF9maWVsZC5zZXRBdHRyaWJ1dGUoJ3BsYWNlaG9sZGVyJywgcGxhY2Vob2xkZXIpO1xuICAgICAgICBpbnB1dF9maWVsZC52YWx1ZSA9ICcnO1xuICAgICAgICBpZiAodHlwZW9mIHByZWZpbGxlZF92YWx1ZV9vcHRpb25hbCAhPT0gJ3VuZGVmaW5lZCcgJiYgcHJlZmlsbGVkX3ZhbHVlX29wdGlvbmFsLmxlbmd0aCA+IDApIHsgaW5wdXRfZmllbGQudmFsdWUgPSBwcmVmaWxsZWRfdmFsdWVfb3B0aW9uYWwgfVxuXG4gICAgICAgIGlmIChhbGVydF9pc19zaG93aW5nKSB7XG4gICAgICAgICAgICAvLyBIaWRlIG5vdGllLmFsZXJ0XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoYWxlcnRfdGltZW91dF8xKTtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChhbGVydF90aW1lb3V0XzIpO1xuICAgICAgICAgICAgYWxlcnRfaGlkZShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpbnB1dF9zaG93KHRpdGxlLCBzdWJtaXRfdGV4dCwgY2FuY2VsX3RleHQsIHN1Ym1pdF9jYWxsYmFjayk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGlucHV0X3Nob3codGl0bGUsIHN1Ym1pdF90ZXh0LCBjYW5jZWxfdGV4dCwgc3VibWl0X2NhbGxiYWNrKTtcbiAgICAgICAgfVxuXG4gICAgfVxuICAgIGZ1bmN0aW9uIGlucHV0X3Nob3codGl0bGUsIHN1Ym1pdF90ZXh0LCBjYW5jZWxfdGV4dCwgc3VibWl0X2NhbGxiYWNrKSB7XG5cbiAgICAgICAgc2Nyb2xsX2Rpc2FibGUoKTtcblxuICAgICAgICAvLyBZZXMgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgICAgaW5wdXRfeWVzLm9uY2xpY2sgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlucHV0X2hpZGUoKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgc3VibWl0X2NhbGxiYWNrKGlucHV0X2ZpZWxkLnZhbHVlKTtcbiAgICAgICAgICAgIH0sIChhbmltYXRpb25fZGVsYXkgKiAxMDAwICsgMTApKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGlucHV0X3Nob3dfaW5uZXIoKSB7XG5cbiAgICAgICAgICAgIC8vIFNldCBpbnB1dCB0ZXh0XG4gICAgICAgICAgICBpbnB1dF90ZXh0LmlubmVySFRNTCA9IHRpdGxlO1xuICAgICAgICAgICAgaW5wdXRfeWVzX3RleHQuaW5uZXJIVE1MID0gc3VibWl0X3RleHQ7XG4gICAgICAgICAgICBpbnB1dF9ub190ZXh0LmlubmVySFRNTCA9IGNhbmNlbF90ZXh0O1xuXG4gICAgICAgICAgICAvLyBHZXQgaW5wdXQncyBoZWlnaHRcbiAgICAgICAgICAgIGlucHV0X291dGVyLnN0eWxlLnRvcCA9ICctMTAwMDBweCc7XG4gICAgICAgICAgICBpbnB1dF9vdXRlci5zdHlsZS5kaXNwbGF5ID0gJ3RhYmxlJztcbiAgICAgICAgICAgIGlucHV0X291dGVyLnN0eWxlLnRvcCA9ICctJyArIGlucHV0X291dGVyLm9mZnNldEhlaWdodCAtIDUgKyAncHgnO1xuICAgICAgICAgICAgaW5wdXRfYmFja2dyb3VuZC5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcblxuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgICAgIGlmIChzaGFkb3cpIHsgaW5wdXRfb3V0ZXIuc3R5bGUuYm94U2hhZG93ID0gJzBweCAwcHggMTBweCAwcHggcmdiYSgwLDAsMCwwLjUpJzsgfVxuICAgICAgICAgICAgICAgIGlucHV0X291dGVyLnN0eWxlLk1velRyYW5zaXRpb24gPSAnYWxsICcgKyBhbmltYXRpb25fZGVsYXkgKyAncyBlYXNlJztcbiAgICAgICAgICAgICAgICBpbnB1dF9vdXRlci5zdHlsZS5XZWJraXRUcmFuc2l0aW9uID0gJ2FsbCAnICsgYW5pbWF0aW9uX2RlbGF5ICsgJ3MgZWFzZSc7XG4gICAgICAgICAgICAgICAgaW5wdXRfb3V0ZXIuc3R5bGUudHJhbnNpdGlvbiA9ICdhbGwgJyArIGFuaW1hdGlvbl9kZWxheSArICdzIGVhc2UnO1xuXG4gICAgICAgICAgICAgICAgaW5wdXRfb3V0ZXIuc3R5bGUudG9wID0gMDtcbiAgICAgICAgICAgICAgICBpbnB1dF9iYWNrZ3JvdW5kLnN0eWxlLm9wYWNpdHkgPSAnMC43NSc7XG5cbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBpbnB1dF9pc19zaG93aW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9LCAoYW5pbWF0aW9uX2RlbGF5ICogMTAwMCArIDEwKSk7XG5cbiAgICAgICAgICAgIH0sIDIwKTtcblxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlucHV0X2lzX3Nob3dpbmcpIHtcbiAgICAgICAgICAgIGlucHV0X2hpZGUoKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgaW5wdXRfc2hvd19pbm5lcigpO1xuICAgICAgICAgICAgfSwgKGFuaW1hdGlvbl9kZWxheSAqIDEwMDAgKyAxMCkpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaW5wdXRfc2hvd19pbm5lcigpO1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnB1dF9oaWRlKCkge1xuXG4gICAgICAgIGlucHV0X291dGVyLnN0eWxlLnRvcCA9ICctJyArIGlucHV0X291dGVyLm9mZnNldEhlaWdodCAtIDUgKyAncHgnO1xuICAgICAgICBpbnB1dF9iYWNrZ3JvdW5kLnN0eWxlLm9wYWNpdHkgPSAnMCc7XG5cbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgaWYgKHNoYWRvdykgeyBpbnB1dF9vdXRlci5zdHlsZS5ib3hTaGFkb3cgPSAnJzsgfVxuICAgICAgICAgICAgaW5wdXRfb3V0ZXIuc3R5bGUuTW96VHJhbnNpdGlvbiA9ICcnO1xuICAgICAgICAgICAgaW5wdXRfb3V0ZXIuc3R5bGUuV2Via2l0VHJhbnNpdGlvbiA9ICcnO1xuICAgICAgICAgICAgaW5wdXRfb3V0ZXIuc3R5bGUudHJhbnNpdGlvbiA9ICcnO1xuICAgICAgICAgICAgaW5wdXRfYmFja2dyb3VuZC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuXG4gICAgICAgICAgICBpbnB1dF9vdXRlci5zdHlsZS50b3AgPSAnLTEwMDAwcHgnO1xuXG4gICAgICAgICAgICBzY3JvbGxfZW5hYmxlKCk7XG5cbiAgICAgICAgICAgIGlucHV0X2lzX3Nob3dpbmcgPSBmYWxzZTtcblxuICAgICAgICB9LCAoYW5pbWF0aW9uX2RlbGF5ICogMTAwMCArIDEwKSk7XG5cbiAgICB9XG5cblxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgYWxlcnQ6IGFsZXJ0LFxuICAgICAgICBjb25maXJtOiBjb25maXJtLFxuICAgICAgICBpbnB1dDogaW5wdXRcbiAgICB9O1xuXG59KCk7XG5cbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IG5vdGllO1xufVxuIiwiLypcbkNvcHlyaWdodCAoYykgMjAxMCwyMDExLDIwMTIsMjAxMywyMDE0IE1vcmdhbiBSb2RlcmljayBodHRwOi8vcm9kZXJpY2suZGtcbkxpY2Vuc2U6IE1JVCAtIGh0dHA6Ly9tcmducmRyY2subWl0LWxpY2Vuc2Uub3JnXG5cbmh0dHBzOi8vZ2l0aHViLmNvbS9tcm9kZXJpY2svUHViU3ViSlNcbiovXG4oZnVuY3Rpb24gKHJvb3QsIGZhY3Rvcnkpe1xuXHQndXNlIHN0cmljdCc7XG5cbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKXtcbiAgICAgICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgICAgICBkZWZpbmUoWydleHBvcnRzJ10sIGZhY3RvcnkpO1xuXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpe1xuICAgICAgICAvLyBDb21tb25KU1xuICAgICAgICBmYWN0b3J5KGV4cG9ydHMpO1xuXG4gICAgfVxuXG4gICAgLy8gQnJvd3NlciBnbG9iYWxzXG4gICAgdmFyIFB1YlN1YiA9IHt9O1xuICAgIHJvb3QuUHViU3ViID0gUHViU3ViO1xuICAgIGZhY3RvcnkoUHViU3ViKTtcbiAgICBcbn0oKCB0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0JyAmJiB3aW5kb3cgKSB8fCB0aGlzLCBmdW5jdGlvbiAoUHViU3ViKXtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBtZXNzYWdlcyA9IHt9LFxuXHRcdGxhc3RVaWQgPSAtMTtcblxuXHRmdW5jdGlvbiBoYXNLZXlzKG9iail7XG5cdFx0dmFyIGtleTtcblxuXHRcdGZvciAoa2V5IGluIG9iail7XG5cdFx0XHRpZiAoIG9iai5oYXNPd25Qcm9wZXJ0eShrZXkpICl7XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHQvKipcblx0ICpcdFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHRocm93cyB0aGUgcGFzc2VkIGV4Y2VwdGlvbiwgZm9yIHVzZSBhcyBhcmd1bWVudCBmb3Igc2V0VGltZW91dFxuXHQgKlx0QHBhcmFtIHsgT2JqZWN0IH0gZXggQW4gRXJyb3Igb2JqZWN0XG5cdCAqL1xuXHRmdW5jdGlvbiB0aHJvd0V4Y2VwdGlvbiggZXggKXtcblx0XHRyZXR1cm4gZnVuY3Rpb24gcmVUaHJvd0V4Y2VwdGlvbigpe1xuXHRcdFx0dGhyb3cgZXg7XG5cdFx0fTtcblx0fVxuXG5cdGZ1bmN0aW9uIGNhbGxTdWJzY3JpYmVyV2l0aERlbGF5ZWRFeGNlcHRpb25zKCBzdWJzY3JpYmVyLCBtZXNzYWdlLCBkYXRhICl7XG5cdFx0dHJ5IHtcblx0XHRcdHN1YnNjcmliZXIoIG1lc3NhZ2UsIGRhdGEgKTtcblx0XHR9IGNhdGNoKCBleCApe1xuXHRcdFx0c2V0VGltZW91dCggdGhyb3dFeGNlcHRpb24oIGV4ICksIDApO1xuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIGNhbGxTdWJzY3JpYmVyV2l0aEltbWVkaWF0ZUV4Y2VwdGlvbnMoIHN1YnNjcmliZXIsIG1lc3NhZ2UsIGRhdGEgKXtcblx0XHRzdWJzY3JpYmVyKCBtZXNzYWdlLCBkYXRhICk7XG5cdH1cblxuXHRmdW5jdGlvbiBkZWxpdmVyTWVzc2FnZSggb3JpZ2luYWxNZXNzYWdlLCBtYXRjaGVkTWVzc2FnZSwgZGF0YSwgaW1tZWRpYXRlRXhjZXB0aW9ucyApe1xuXHRcdHZhciBzdWJzY3JpYmVycyA9IG1lc3NhZ2VzW21hdGNoZWRNZXNzYWdlXSxcblx0XHRcdGNhbGxTdWJzY3JpYmVyID0gaW1tZWRpYXRlRXhjZXB0aW9ucyA/IGNhbGxTdWJzY3JpYmVyV2l0aEltbWVkaWF0ZUV4Y2VwdGlvbnMgOiBjYWxsU3Vic2NyaWJlcldpdGhEZWxheWVkRXhjZXB0aW9ucyxcblx0XHRcdHM7XG5cblx0XHRpZiAoICFtZXNzYWdlcy5oYXNPd25Qcm9wZXJ0eSggbWF0Y2hlZE1lc3NhZ2UgKSApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRmb3IgKHMgaW4gc3Vic2NyaWJlcnMpe1xuXHRcdFx0aWYgKCBzdWJzY3JpYmVycy5oYXNPd25Qcm9wZXJ0eShzKSl7XG5cdFx0XHRcdGNhbGxTdWJzY3JpYmVyKCBzdWJzY3JpYmVyc1tzXSwgb3JpZ2luYWxNZXNzYWdlLCBkYXRhICk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gY3JlYXRlRGVsaXZlcnlGdW5jdGlvbiggbWVzc2FnZSwgZGF0YSwgaW1tZWRpYXRlRXhjZXB0aW9ucyApe1xuXHRcdHJldHVybiBmdW5jdGlvbiBkZWxpdmVyTmFtZXNwYWNlZCgpe1xuXHRcdFx0dmFyIHRvcGljID0gU3RyaW5nKCBtZXNzYWdlICksXG5cdFx0XHRcdHBvc2l0aW9uID0gdG9waWMubGFzdEluZGV4T2YoICcuJyApO1xuXG5cdFx0XHQvLyBkZWxpdmVyIHRoZSBtZXNzYWdlIGFzIGl0IGlzIG5vd1xuXHRcdFx0ZGVsaXZlck1lc3NhZ2UobWVzc2FnZSwgbWVzc2FnZSwgZGF0YSwgaW1tZWRpYXRlRXhjZXB0aW9ucyk7XG5cblx0XHRcdC8vIHRyaW0gdGhlIGhpZXJhcmNoeSBhbmQgZGVsaXZlciBtZXNzYWdlIHRvIGVhY2ggbGV2ZWxcblx0XHRcdHdoaWxlKCBwb3NpdGlvbiAhPT0gLTEgKXtcblx0XHRcdFx0dG9waWMgPSB0b3BpYy5zdWJzdHIoIDAsIHBvc2l0aW9uICk7XG5cdFx0XHRcdHBvc2l0aW9uID0gdG9waWMubGFzdEluZGV4T2YoJy4nKTtcblx0XHRcdFx0ZGVsaXZlck1lc3NhZ2UoIG1lc3NhZ2UsIHRvcGljLCBkYXRhLCBpbW1lZGlhdGVFeGNlcHRpb25zICk7XG5cdFx0XHR9XG5cdFx0fTtcblx0fVxuXG5cdGZ1bmN0aW9uIG1lc3NhZ2VIYXNTdWJzY3JpYmVycyggbWVzc2FnZSApe1xuXHRcdHZhciB0b3BpYyA9IFN0cmluZyggbWVzc2FnZSApLFxuXHRcdFx0Zm91bmQgPSBCb29sZWFuKG1lc3NhZ2VzLmhhc093blByb3BlcnR5KCB0b3BpYyApICYmIGhhc0tleXMobWVzc2FnZXNbdG9waWNdKSksXG5cdFx0XHRwb3NpdGlvbiA9IHRvcGljLmxhc3RJbmRleE9mKCAnLicgKTtcblxuXHRcdHdoaWxlICggIWZvdW5kICYmIHBvc2l0aW9uICE9PSAtMSApe1xuXHRcdFx0dG9waWMgPSB0b3BpYy5zdWJzdHIoIDAsIHBvc2l0aW9uICk7XG5cdFx0XHRwb3NpdGlvbiA9IHRvcGljLmxhc3RJbmRleE9mKCAnLicgKTtcblx0XHRcdGZvdW5kID0gQm9vbGVhbihtZXNzYWdlcy5oYXNPd25Qcm9wZXJ0eSggdG9waWMgKSAmJiBoYXNLZXlzKG1lc3NhZ2VzW3RvcGljXSkpO1xuXHRcdH1cblxuXHRcdHJldHVybiBmb3VuZDtcblx0fVxuXG5cdGZ1bmN0aW9uIHB1Ymxpc2goIG1lc3NhZ2UsIGRhdGEsIHN5bmMsIGltbWVkaWF0ZUV4Y2VwdGlvbnMgKXtcblx0XHR2YXIgZGVsaXZlciA9IGNyZWF0ZURlbGl2ZXJ5RnVuY3Rpb24oIG1lc3NhZ2UsIGRhdGEsIGltbWVkaWF0ZUV4Y2VwdGlvbnMgKSxcblx0XHRcdGhhc1N1YnNjcmliZXJzID0gbWVzc2FnZUhhc1N1YnNjcmliZXJzKCBtZXNzYWdlICk7XG5cblx0XHRpZiAoICFoYXNTdWJzY3JpYmVycyApe1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGlmICggc3luYyA9PT0gdHJ1ZSApe1xuXHRcdFx0ZGVsaXZlcigpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRzZXRUaW1lb3V0KCBkZWxpdmVyLCAwICk7XG5cdFx0fVxuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0LyoqXG5cdCAqXHRQdWJTdWIucHVibGlzaCggbWVzc2FnZVssIGRhdGFdICkgLT4gQm9vbGVhblxuXHQgKlx0LSBtZXNzYWdlIChTdHJpbmcpOiBUaGUgbWVzc2FnZSB0byBwdWJsaXNoXG5cdCAqXHQtIGRhdGE6IFRoZSBkYXRhIHRvIHBhc3MgdG8gc3Vic2NyaWJlcnNcblx0ICpcdFB1Ymxpc2hlcyB0aGUgdGhlIG1lc3NhZ2UsIHBhc3NpbmcgdGhlIGRhdGEgdG8gaXQncyBzdWJzY3JpYmVyc1xuXHQqKi9cblx0UHViU3ViLnB1Ymxpc2ggPSBmdW5jdGlvbiggbWVzc2FnZSwgZGF0YSApe1xuXHRcdHJldHVybiBwdWJsaXNoKCBtZXNzYWdlLCBkYXRhLCBmYWxzZSwgUHViU3ViLmltbWVkaWF0ZUV4Y2VwdGlvbnMgKTtcblx0fTtcblxuXHQvKipcblx0ICpcdFB1YlN1Yi5wdWJsaXNoU3luYyggbWVzc2FnZVssIGRhdGFdICkgLT4gQm9vbGVhblxuXHQgKlx0LSBtZXNzYWdlIChTdHJpbmcpOiBUaGUgbWVzc2FnZSB0byBwdWJsaXNoXG5cdCAqXHQtIGRhdGE6IFRoZSBkYXRhIHRvIHBhc3MgdG8gc3Vic2NyaWJlcnNcblx0ICpcdFB1Ymxpc2hlcyB0aGUgdGhlIG1lc3NhZ2Ugc3luY2hyb25vdXNseSwgcGFzc2luZyB0aGUgZGF0YSB0byBpdCdzIHN1YnNjcmliZXJzXG5cdCoqL1xuXHRQdWJTdWIucHVibGlzaFN5bmMgPSBmdW5jdGlvbiggbWVzc2FnZSwgZGF0YSApe1xuXHRcdHJldHVybiBwdWJsaXNoKCBtZXNzYWdlLCBkYXRhLCB0cnVlLCBQdWJTdWIuaW1tZWRpYXRlRXhjZXB0aW9ucyApO1xuXHR9O1xuXG5cdC8qKlxuXHQgKlx0UHViU3ViLnN1YnNjcmliZSggbWVzc2FnZSwgZnVuYyApIC0+IFN0cmluZ1xuXHQgKlx0LSBtZXNzYWdlIChTdHJpbmcpOiBUaGUgbWVzc2FnZSB0byBzdWJzY3JpYmUgdG9cblx0ICpcdC0gZnVuYyAoRnVuY3Rpb24pOiBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIGEgbmV3IG1lc3NhZ2UgaXMgcHVibGlzaGVkXG5cdCAqXHRTdWJzY3JpYmVzIHRoZSBwYXNzZWQgZnVuY3Rpb24gdG8gdGhlIHBhc3NlZCBtZXNzYWdlLiBFdmVyeSByZXR1cm5lZCB0b2tlbiBpcyB1bmlxdWUgYW5kIHNob3VsZCBiZSBzdG9yZWQgaWZcblx0ICpcdHlvdSBuZWVkIHRvIHVuc3Vic2NyaWJlXG5cdCoqL1xuXHRQdWJTdWIuc3Vic2NyaWJlID0gZnVuY3Rpb24oIG1lc3NhZ2UsIGZ1bmMgKXtcblx0XHRpZiAoIHR5cGVvZiBmdW5jICE9PSAnZnVuY3Rpb24nKXtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHQvLyBtZXNzYWdlIGlzIG5vdCByZWdpc3RlcmVkIHlldFxuXHRcdGlmICggIW1lc3NhZ2VzLmhhc093blByb3BlcnR5KCBtZXNzYWdlICkgKXtcblx0XHRcdG1lc3NhZ2VzW21lc3NhZ2VdID0ge307XG5cdFx0fVxuXG5cdFx0Ly8gZm9yY2luZyB0b2tlbiBhcyBTdHJpbmcsIHRvIGFsbG93IGZvciBmdXR1cmUgZXhwYW5zaW9ucyB3aXRob3V0IGJyZWFraW5nIHVzYWdlXG5cdFx0Ly8gYW5kIGFsbG93IGZvciBlYXN5IHVzZSBhcyBrZXkgbmFtZXMgZm9yIHRoZSAnbWVzc2FnZXMnIG9iamVjdFxuXHRcdHZhciB0b2tlbiA9ICd1aWRfJyArIFN0cmluZygrK2xhc3RVaWQpO1xuXHRcdG1lc3NhZ2VzW21lc3NhZ2VdW3Rva2VuXSA9IGZ1bmM7XG5cblx0XHQvLyByZXR1cm4gdG9rZW4gZm9yIHVuc3Vic2NyaWJpbmdcblx0XHRyZXR1cm4gdG9rZW47XG5cdH07XG5cblx0LyogUHVibGljOiBDbGVhcnMgYWxsIHN1YnNjcmlwdGlvbnNcblx0ICovXG5cdFB1YlN1Yi5jbGVhckFsbFN1YnNjcmlwdGlvbnMgPSBmdW5jdGlvbiBjbGVhckFsbFN1YnNjcmlwdGlvbnMoKXtcblx0XHRtZXNzYWdlcyA9IHt9O1xuXHR9O1xuXG5cdC8qUHVibGljOiBDbGVhciBzdWJzY3JpcHRpb25zIGJ5IHRoZSB0b3BpY1xuXHQqL1xuXHRQdWJTdWIuY2xlYXJTdWJzY3JpcHRpb25zID0gZnVuY3Rpb24gY2xlYXJTdWJzY3JpcHRpb25zKHRvcGljKXtcblx0XHR2YXIgbTsgXG5cdFx0Zm9yIChtIGluIG1lc3NhZ2VzKXtcblx0XHRcdGlmIChtZXNzYWdlcy5oYXNPd25Qcm9wZXJ0eShtKSAmJiBtLmluZGV4T2YodG9waWMpID09PSAwKXtcblx0XHRcdFx0ZGVsZXRlIG1lc3NhZ2VzW21dO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcblxuXHQvKiBQdWJsaWM6IHJlbW92ZXMgc3Vic2NyaXB0aW9ucy5cblx0ICogV2hlbiBwYXNzZWQgYSB0b2tlbiwgcmVtb3ZlcyBhIHNwZWNpZmljIHN1YnNjcmlwdGlvbi5cblx0ICogV2hlbiBwYXNzZWQgYSBmdW5jdGlvbiwgcmVtb3ZlcyBhbGwgc3Vic2NyaXB0aW9ucyBmb3IgdGhhdCBmdW5jdGlvblxuXHQgKiBXaGVuIHBhc3NlZCBhIHRvcGljLCByZW1vdmVzIGFsbCBzdWJzY3JpcHRpb25zIGZvciB0aGF0IHRvcGljIChoaWVyYXJjaHkpXG5cdCAqXG5cdCAqIHZhbHVlIC0gQSB0b2tlbiwgZnVuY3Rpb24gb3IgdG9waWMgdG8gdW5zdWJzY3JpYmUuXG5cdCAqXG5cdCAqIEV4YW1wbGVzXG5cdCAqXG5cdCAqXHRcdC8vIEV4YW1wbGUgMSAtIHVuc3Vic2NyaWJpbmcgd2l0aCBhIHRva2VuXG5cdCAqXHRcdHZhciB0b2tlbiA9IFB1YlN1Yi5zdWJzY3JpYmUoJ215dG9waWMnLCBteUZ1bmMpO1xuXHQgKlx0XHRQdWJTdWIudW5zdWJzY3JpYmUodG9rZW4pO1xuXHQgKlxuXHQgKlx0XHQvLyBFeGFtcGxlIDIgLSB1bnN1YnNjcmliaW5nIHdpdGggYSBmdW5jdGlvblxuXHQgKlx0XHRQdWJTdWIudW5zdWJzY3JpYmUobXlGdW5jKTtcblx0ICpcblx0ICpcdFx0Ly8gRXhhbXBsZSAzIC0gdW5zdWJzY3JpYmluZyBhIHRvcGljXG5cdCAqXHRcdFB1YlN1Yi51bnN1YnNjcmliZSgnbXl0b3BpYycpO1xuXHQgKi9cblx0UHViU3ViLnVuc3Vic2NyaWJlID0gZnVuY3Rpb24odmFsdWUpe1xuXHRcdHZhciBpc1RvcGljICAgID0gdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyAmJiBtZXNzYWdlcy5oYXNPd25Qcm9wZXJ0eSh2YWx1ZSksXG5cdFx0XHRpc1Rva2VuICAgID0gIWlzVG9waWMgJiYgdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyxcblx0XHRcdGlzRnVuY3Rpb24gPSB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbicsXG5cdFx0XHRyZXN1bHQgPSBmYWxzZSxcblx0XHRcdG0sIG1lc3NhZ2UsIHQ7XG5cblx0XHRpZiAoaXNUb3BpYyl7XG5cdFx0XHRkZWxldGUgbWVzc2FnZXNbdmFsdWVdO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGZvciAoIG0gaW4gbWVzc2FnZXMgKXtcblx0XHRcdGlmICggbWVzc2FnZXMuaGFzT3duUHJvcGVydHkoIG0gKSApe1xuXHRcdFx0XHRtZXNzYWdlID0gbWVzc2FnZXNbbV07XG5cblx0XHRcdFx0aWYgKCBpc1Rva2VuICYmIG1lc3NhZ2VbdmFsdWVdICl7XG5cdFx0XHRcdFx0ZGVsZXRlIG1lc3NhZ2VbdmFsdWVdO1xuXHRcdFx0XHRcdHJlc3VsdCA9IHZhbHVlO1xuXHRcdFx0XHRcdC8vIHRva2VucyBhcmUgdW5pcXVlLCBzbyB3ZSBjYW4ganVzdCBzdG9wIGhlcmVcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChpc0Z1bmN0aW9uKSB7XG5cdFx0XHRcdFx0Zm9yICggdCBpbiBtZXNzYWdlICl7XG5cdFx0XHRcdFx0XHRpZiAobWVzc2FnZS5oYXNPd25Qcm9wZXJ0eSh0KSAmJiBtZXNzYWdlW3RdID09PSB2YWx1ZSl7XG5cdFx0XHRcdFx0XHRcdGRlbGV0ZSBtZXNzYWdlW3RdO1xuXHRcdFx0XHRcdFx0XHRyZXN1bHQgPSB0cnVlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH07XG59KSk7XG4iXX0=
