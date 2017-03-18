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
  request(url, function(error, response, body) {
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
  docs = pageBodiesAndLinks.map((bodyAndLink) => tm.utils.expandContractions(bodyAndLink.pageHtml));
  corpus.addDocs(docs);
  corpus.trim().toLower().clean().removeInterpunctuation().removeNewlines().removeWords(tm.STOPWORDS.EN);
  terms = tm.Terms(corpus);
  tm.weightTfIdf(terms.dtm);
  terms.fill_zeros();
  matrix = terms.dtm;

  original_site = matrix[matrix.length - 1];
  max_similarity = 0.0;
  max_similarity_index = 0;
  for (j = 0; j<matrix.length -1; j++) {
    similarity = cossim(original_site, matrix[j]);
    if (similarity > max_similarity) {
      max_similarity = similarity;
      max_similarity_index = j;
    }  
  }

  callback(null, pageBodiesAndLinks[max_similarity_index].url, max_similarity);
}

//pipeline execution
function findSourceReporting(url, similarityThreshold, maxPathDistance, callback) {
  async.waterfall([
      getRequestForPage(url),
      extractLinks,
      filterDomain,
      getPageBodies,
      getMostSimilarLink
  ], function(err, mostSimilarLink, similarity) {
    if (similarity > similarityThreshold && maxPathDistance > 0) {
      findSourceReporting(mostSimilarLink, similarityThreshold, maxPathDistance - 1, callback)
    } else if (similarity < similarityThreshold) {
      callback(url);
    } else {
      callback(mostSimilarLink);
    }
  });
}

findSourceReporting('http://www.breitbart.com/big-government/2017/03/16/donald-trump-budget-spends-big-on-military-and-the-wall-cuts-foreign-aid-epa-and-public-broadcasting/', 0.1, 1, function(link) {console.log(link);});

