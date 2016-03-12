export function assoc(obj, keyToAssociate, valueToAssociate) {
  var newObject = {};
  Object.keys(obj).forEach(function(key) {
    newObject[key] = obj[key];
  });
  newObject[keyToAssociate] = valueToAssociate;
  return newObject;
}

export function assocAll(obj, keysToAssociate, valuesToAssociate) {
  var newObject = {};
  Object.keys(obj).forEach(function(key) {
    newObject[key] = obj[key];
  });
  keysToAssociate.forEach(function(key, index) {
    newObject[key] = valuesToAssociate[index];
  });
  return newObject;
}

export function dissoc(obj, keyToDissociate) {
  var newObject = {};
  // Since we're using objects like hashes, rather than classes, we will do a vanilla keys iteration.
  Object.keys(obj).forEach(function(key) {
    if (key !== keyToDissociate) {
      newObject[key] = obj[key];
    }
  });
  return newObject;
}

// keysToDissociate should be a Set.
export function dissocAll(obj, keysToDissociate) {
  var newObject = {};
  Object.keys(obj).forEach(function(key) {
    if (!keysToDissociate.has(key)) {
      newObject[key] = obj[key];
    }
  });
  return newObject;
}

export function merge(obj1, obj2) {
  var newObj = {};
  Object.keys(obj1).forEach(function(key) {
    newObj[key] = obj1[key];
  });
  Object.keys(obj2).forEach(function(key) {
    newObj[key] = obj2[key];
  });
  return newObj;
}
