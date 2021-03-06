var async = require('async');
if (typeof window !== 'undefined') {
  var request = require('browser-request');
} else {
  var request = require('request');
}
var tm = require('text-miner');
var urlParser = require('url');

var standard_unfluff = require('@knod/unfluff');
var times_unfluff = require('./times_unfluff');
var post_unfluff = require('./post_unfluff');
var unfluff = standard_unfluff;

var unfluffers = [
  { "matchPattern": "nytimes\.com", "unfluffer": times_unfluff },
  { "matchPattern": "washingtonpost\.com", "unfluffer": post_unfluff },
  { "matchPattern": "$a", "unfluffer": standard_unfluff }
]

//request helpers
/** Creates a method to call the request function on a given url
  *
  * @param {string} url - the url to create a request function with
  * @return {function} - a request function bound to the input url
  */
function getRequestForPage(url) {
  if (typeof window === 'undefined') {
    var opts = { uri: url, maxRedirects: 3, jar: true, headers: { "User-Agent": "Chrome/26.0.1410." } };
  } else {
    var opts = { uri: url, jar: true };
  }
  return request.get.bind(null, opts);  
}

/** A request function that unfluffs the body of the response
  * 
  * @param {string} url - the url to pass to request
  * @param {function} callback - a callback which is passed an object containing the unfluffed body text and the request url 
  */
function requestWithBodyTextAndUrlCallback(url, callback) {
  if (typeof window === 'undefined') {
    var opts = { uri: url, maxRedirects: 3, jar: true, headers: { "User-Agent": "Chrome/26.0.1410." }, rejectUnauthorized: false};
  } else {
    var opts = { uri: url, jar: true, rejectUnauthorized: false};
  }

  request.get(opts, function (error, response, body) {
    if (error) {
      callback(error);
    } else {
      if (typeof window === 'undefined') {
        var requestUrl = response.request.uri.href;
        var responseContentType = response.headers['content-type'];
      } else {
        var requestUrl = response.responseURL;
        var responseContentType = response.getResponseHeader('content-type');
      }

      // if the page is a pdf, we can't handle it
      if (responseContentType.includes('text/html')) {
        //need to choose unfluffer based on link type
        unfluff = chooseUnfluffer(requestUrl, unfluffers);
        callback(null, { pageHtml: unfluff(body).text, url: requestUrl });
      } else {
        callback(null, { pageHtml: "", url: requestUrl });
      }
    }
  });
}

//other helpers
/** Calculates the cosine similarity between two vectors
  *
  * @param {number[]} x - a vector of numbers
  * @param {number[]} y - a second vector of numbers
  * @return {number} - the cosine similarity between x and y
  */
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

/** Checks if two hostnames have the same second-level domain
 *
 * @param {string} hostnameA - the first url to be compared
 * @param {string} hostnameB - the second url to be compared
 */
function checkSameDomain(hostnameA, hostnameB) {
  var domainsA = hostnameA.split('.').reverse();
  var domainsB = hostnameB.split('.').reverse();

  return (domainsA[0] == domainsB[0] && domainsA[1] == domainsB[1]);
}

//pipeline functions
/** Request callback which gets links from page HTML and passes them to a callback
  *
  * @param {Object} response - the request response object
  * @param {string} body - the request response body
  * @param {function} callback - a callback which is past a list of page links and the request uri 
  */
function extractLinks(response, body, callback) {
  if (typeof window === 'undefined') {
    var requestUrl = response.request.uri.href;
  } else {
    var requestUrl = response.responseURL;
  }

  unfluff = chooseUnfluffer(requestUrl, unfluffers);
  data = unfluff(body);

  callback(null, data.links, requestUrl);
}

/** Removes links from a list that are in the same domain as originalUrl and passes the filtered list to a callback
  *
  * @param {string[]} links - a list of links to be filtered
  * @param {string} originalUrl - a link whose domain should be filtered out of the links list
  * @param {function} callback - a callback which takes a filtered list of links and the reference url
  */
function filterDomain(links, originalUrl, callback) {
  originalUrlObject = urlParser.parse(originalUrl);
  outgoingLinks = links.filter(function (value) {
    newUrlObject = urlParser.parse(value.href);
    if (!originalUrlObject.hostname || !newUrlObject.hostname) {
      return false;
    }
    trimmedOriginalHostname = originalUrlObject.hostname.replace("www.", "");
    trimmedNewHostname = newUrlObject.hostname.replace("www.", "");
    return !checkSameDomain(trimmedOriginalHostname, trimmedNewHostname);
  });
  console.log("originalUrl: " + originalUrl);
  callback(null, outgoingLinks, originalUrl); 
}

/** Maps a list of links and a reference link to a list of unfluffed page body objects
  *
  * @param {string[]} links - a list of links to get page bodies for
  * @param {string} originalUrl - a reference link also to get a page body for
  * @param {function} callback - a callback which takes a list of page body objects each generated by requestWithBodyTextAndUrlCallback
  */
function getPageBodies(links, originalUrl, callback) {
  urls = links.map((linkObj) => linkObj.href);
  urls.push(originalUrl);
  async.map(urls, requestWithBodyTextAndUrlCallback, function (error, results) {
    callback(null, results);
  });
}

/** Takes a list of page bodies and links and identifies the page in the list that is most similar to the last page in the list
  *
  * @param {Object[]} pageBodiesAndLinks - a list of page body and link objects, each generated by requestWithBodyTextAndUrlCallback
  * @param {function} callback - a callback that is passed the most similar url to the last url in the input list as well as the similarity 
  */
function getMostSimilarLink(pageBodiesAndLinks, callback) {
  corpus = tm.Corpus([]);
  similarities = [];
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
      console.log("outgoing link: " + pageBodiesAndLinks[j].url);
      console.log("similarity: " + similarity);
      similarities.push({ url: pageBodiesAndLinks[j].url, score: similarity });
      if (similarity > max_similarity) {
        max_similarity = similarity;
        max_similarity_index = j;
      }  
    }
    
    callback(null, pageBodiesAndLinks[max_similarity_index].url, max_similarity, similarities.sort((a, b) => b.score-a.score));
  } else {
    callback(null, '', 0.0, similarities);
  }
}

/** Matches the input url to a regex and sets the unfluffer accordingly
  *
  * @param {string} url - the url of the page that will be unfluffed
  * @param {Object[]} unfluffers - list of mappings of regex matchers to unfluff objects
  */
function chooseUnfluffer(url, unfluffers) {
  defaultUnfluffer = unfluffers[unfluffers.length - 1].unfluffer;

  for (unflufferMatcher of unfluffers) {
    matches = url.match(unflufferMatcher.matchPattern);
    if (matches !== null) {
      return unflufferMatcher.unfluffer;
    }
  }

  return defaultUnfluffer;
}

//pipeline execution
/** Externally accessible method that attempts to find the "source reporting" behind an input url
  *
  * @param {string} url - the url of the page to trace source reporting for
  * @param {number} similarityThreshold - the similarity score that each page in the source reporting chain must have to the next 
  * @param {number} maxPathDistance - the max number of hops to search across for source reporting
  * @param {function} callback - a callback which is passed an object containing the source reporting behind the input url and a similarity score
  * @param {Object[]} path - an array of result objects from higher calls to this function
  */
function findSource(url, similarityThreshold, maxPathDistance, callback, path = []) {
  async.waterfall([
      getRequestForPage(url),
      extractLinks,
      filterDomain,
      getPageBodies,
      getMostSimilarLink
  ], function(err, mostSimilarLink, similarity, similarities) {
    console.log("most similar link: " + mostSimilarLink);
    console.log("highest similarity: " + similarity);
    console.log("*************************************");
    if (similarity > similarityThreshold && maxPathDistance > 0) {
      path.push(similarities);
      findSource(mostSimilarLink, similarityThreshold, maxPathDistance - 1, callback, path)
    } else if (similarity < similarityThreshold) {
      console.log("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
      callback({source: url, score: similarity}, path);
    } else {
      console.log("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
      callback({source: mostSimilarLink, score: similarity}, path);
    }
  });
}

module.exports = {
  findSourceReporting: findSource,  
};
