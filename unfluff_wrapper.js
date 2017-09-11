var unfluff = require('@knod/unfluff');
var util = require('util');

function unfluff_wrapper(html, overriden_elements) {
  unfluffed = unfluff_wrapper.super_.apply(this, [html]);
  overriden_keys = Object.keys(overriden_elements);
  overriden_keys.forEach(function (currentKey) {
    //TODO: make sure overriden keys exist
    unfluffed[currentKey] = overriden_elements[currentKey];
  });
  return unfluffed
}

unfluff_wrapper.super_ = unfluff;

unfluff_wrapper.prototype = Object.create(unfluff.prototype, {
  constructor: {
    value: unfluff_wrapper,
    enumerable: false
  }
});

module.exports = unfluff_wrapper;