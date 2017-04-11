import map from 'lodash.map';
import SQLiteResult from './SQLiteResult';
import zipObject from 'lodash.zipObject';

function massageError(err) {
  return typeof err === 'string' ? new Error(err) : err;
}

function SQLiteDatabase(name) {
  this._name = name;
}

function dearrayifyRow(res) {
  // use a compressed array format to send minimal data between
  // native and web layers
  var rawError = res[0];
  if (rawError) {
    return new SQLiteResult(massageError(res[0]));
  }
  var insertId = res[1];
  if (insertId === null) {
    insertId = void 0; // per the spec, should be undefined
  }
  var rowsAffected = res[2];
  var columns = res[3];
  var rows = res[4];
  var zippedRows = [];
  for (var i = 0, len = rows.length; i < len; i++) {
    zippedRows.push(zipObject(columns, rows[i]));
  }

  // v8 likes predictable objects
  return new SQLiteResult(null, insertId, rowsAffected, zippedRows);
}

// send less data over the wire, use an array
function arrayifyQuery(query) {
  return [query.sql, (query.args || [])];
}

SQLiteDatabase.prototype.exec = function exec(queries, readOnly, callback) {

  function onSuccess(rawResults) {
    if (typeof rawResults === 'string') {
      rawResults = JSON.parse(rawResults);
    }
    var results = map(rawResults, dearrayifyRow);
    callback(null, results);
  }

  function onError(err) {
    callback(massageError(err));
  }

  callNative([
      this._name,
      map(queries, arrayifyQuery),
      readOnly
    ])
    .then(onSuccess)
    .catch(onError);
};

// generates a unique id, not obligator a UUID
function generateUUID() {
  var d = new Date().getTime();
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
  return uuid;
};

function callNative(command) {
  var promise = new Promise(function(resolve, reject) {
    // we generate a unique id to reference the promise later
    // from native function
    var promiseId = generateUUID();
    // save reference to promise in the global variable
    promises[promiseId] = {
      resolve, reject
    };

    try {
      // call native function
      window.webkit.messageHandlers.WebSQL.postMessage({
        promiseId: promiseId,
        command: command
      });
    } catch (exception) {
      console.log(exception);
    }

  });
  return promise;

  // object for storing references to our promise-objects
  var promises = {}

  // this funciton is called by native methods
  // @param promiseId - id of the promise stored in global variable promises
  window.__resolvePromise = function(promiseId, data, error) {
    if (error) {
      promises[promiseId].reject(data);

    } else {
      promises[promiseId].resolve(data);
    }
    // remove reference to stored promise
    delete promises[promiseId];
  }

}

export default SQLiteDatabase;
