module.exports = function flattenToNested(flatObj) {
  const nestedObj = {};

  for (const flatKey in flatObj) {
    const keys = flatKey.split('.');
    let current = nestedObj;

    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (i === keys.length - 1) {
        current[k] = flatObj[flatKey];
      } else {
        if (!current[k]) current[k] = {};
        current = current[k];
      }
    }
  }

  return nestedObj;
};
