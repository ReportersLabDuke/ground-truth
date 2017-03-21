var async = require('async');
var request = require('request');
var unfluff = require('unfluff');
var tm = require('text-miner');
var urlParser = require('url');

//request helpers
function getRequestForPage(url) {
  return request.bind(null, url);  
}

function requestWithBodyTextAndUrlCallback(url, callback) {
  request({uri: url, maxRedirects: 3}, function(error, response, body) {
    if (error) {
      callback(error);
    } else {
      callback(null, {pageHtml: unfluff(body).text, url: response.request.uri.href})
    }
  });
}

//other helpers
function cossim(x, y) {
  var mag_x = 0;
  var mag_y = 0;
  var dot_product = 0;

  if (x.length != y.length) {
    throw "x and y are not of the same length";
  }

  for (i=0; i<x.length; i++) {
    if (!isNaN(x[i]) && !isNaN(y[i])) {
      mag_x += x[i] * x[i];
      mag_y += y[i] * y[i];
      dot_product += x[i] * y[i];
    } else {
      throw "invalid array values";
    }
  }
  
  return dot_product / (Math.sqrt(mag_x) * Math.sqrt(mag_y));
}

//pipeline functions
function extractLinks(response, body, callback) {
  data = unfluff(body);
  callback(null, data.links, response.request.uri.href);
}

function filterDomain(links, originalUrl, callback) {
  originalUrlObject = urlParser.parse(originalUrl);
  outgoingLinks = links.filter(function(value) {
    newUrlObject = urlParser.parse(value.href);
    return originalUrlObject.hostname != newUrlObject.hostname;
  });

  callback(null, outgoingLinks, originalUrl); 
}

function getPageBodies(links, originalUrl, callback) {
  urls = links.map((linkObj) => linkObj.href);
  urls.push(originalUrl);
  async.map(urls, requestWithBodyTextAndUrlCallback, function(error, results) {
    callback(null, results);
  });
}

function getMostSimilarLink(pageBodiesAndLinks, callback) {
  corpus = tm.Corpus([]);
  pageBodiesAndLinks = pageBodiesAndLinks.filter(val => val);

  if (pageBodiesAndLinks.length > 0) {
    docs = pageBodiesAndLinks.map((bodyAndLink) => tm.utils.expandContractions(bodyAndLink.pageHtml));
    corpus.addDocs(docs);
    corpus.trim().toLower().clean().removeInterpunctuation().removeNewlines().removeInvalidCharacters().removeWords(tm.STOPWORDS.EN).stem("Lancaster");
    corpus.map((doc) => doc.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " "));
    terms = tm.Terms(corpus);
    //tm.weightTfIdf(terms.dtm);
    terms.fill_zeros();
    matrix = terms.dtm;
    
    original_site = matrix[matrix.length - 1].map(Math.abs);
    max_similarity = 0.0;
    max_similarity_index = 0;
    for (j = 0; j<matrix.length -1; j++) {
      currentDocRow = matrix[j].map(Math.abs);
      similarity = cossim(original_site, currentDocRow);
      if (similarity > max_similarity) {
        max_similarity = similarity;
        max_similarity_index = j;
      }  
    }
    
    callback(null, pageBodiesAndLinks[max_similarity_index].url, max_similarity);
  } else {
    callback(null, '', 0.0);
  }
}

//pipeline execution
function findSource(url, similarityThreshold, maxPathDistance, callback) {
  async.waterfall([
      getRequestForPage(url),
      extractLinks,
      filterDomain,
      getPageBodies,
      getMostSimilarLink
  ], function(err, mostSimilarLink, similarity) {
    console.log(mostSimilarLink);
    console.log(similarity);
    console.log("\n");
    debugger;
    if (similarity > similarityThreshold && maxPathDistance > 0) {
      findSource(mostSimilarLink, similarityThreshold, maxPathDistance - 1, callback)
    } else if (similarity < similarityThreshold) {
      callback(url);
    } else {
      callback(mostSimilarLink);
    }
  });
}

module.exports = {
  findSourceReporting: findSource,  
};
