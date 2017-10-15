var cheerio = require('cheerio');
var unfluff_wrapper = require('./unfluff_wrapper.js');

function getLinks(html) {
  link_urls = [];
  var $ = cheerio.load(html);
  link_objs = $('p > a');
  Object.values(link_objs).forEach(function (currentValue) {
    if (typeof currentValue === 'object' && 'attribs' in currentValue) {
      link_url = currentValue['attribs']['href'];
      text_children = currentValue['children'].filter((child) => {
        return child['type'] === 'text';
      });
      link_urls.push({ "href": link_url, "text": (text_children.length > 0 ? text_children[0]['data'] : "") });
    }
  });

  return link_urls;
}

function post_unfluff(html, overriden_elements) {
  unfluffed = post_unfluff.super_.apply(this, [html,
    {
      links: getLinks(html)
    }
  ]);
  return unfluffed
}

post_unfluff.super_ = unfluff_wrapper;

post_unfluff.prototype = Object.create(unfluff_wrapper.prototype, {
  constructor: {
    value: post_unfluff,
    enumerable: false
   }
});

module.exports = post_unfluff;