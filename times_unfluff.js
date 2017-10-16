var cheerio = require('cheerio');
var unfluff_wrapper = require('./unfluff_wrapper.js');

function getLinks(html) {
  link_urls = [];
  var $ = cheerio.load(html);
  link_objs = $('p.story-body-text > a');
  Object.values(link_objs).forEach(function (currentValue) {
    if (typeof currentValue === 'object' && 'attribs' in currentValue) {
      link_url = currentValue['attribs']['href'];
      text_children = currentValue['children'].filter((child) => {
        return child['type'] === 'text';
      });
      //index.js are expecting link object in this format
      link_urls.push({ "href": link_url, "text": (text_children.length > 0 ? text_children[0]['data'] : "") });
    }
  });

  return link_urls;
}

function getText(html) {
  var $ = cheerio.load(html);
  var textTags = $('.story-body-text')
  return textTags.text()
}

function times_unfluff(html, overriden_elements) {
  unfluffed = times_unfluff.super_.apply(this, [html,
    {
      links: getLinks(html),
      text: getText(html)
    }
  ]);
  return unfluffed
}

times_unfluff.super_ = unfluff_wrapper;

times_unfluff.prototype = Object.create(unfluff_wrapper.prototype, {
  constructor: {
    value: times_unfluff,
    enumerable: false
  }
});

module.exports = times_unfluff;