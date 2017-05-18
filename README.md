# ground-truth

A node library to identify the sources of news articles on the web. The library takes in a URL and returns the URL of the most similar source behind that URL. 

## Installation instructions

```
npm install ground-truth

```

## Usage instructions

ground-truth exports a single function, findSourceReporting. That function takes in a URL to find the source of, a similarity threshold, a maximum number of hops, and a callback. The callback takes in a results object and a path object. The results object contains a source URL and a similarity score. The path object contains a list of URLs which lead from the inputted URL to the source URL.

```javascript
var gt = require('ground-truth');

gt.findSourceReporting('http://www.dukechronicle.com/article/2017/01/report-duke-head-coach-mike-krzyzewski-disciplines-team-following-loss-to-n-c-state', 0.5, 15, function(results, path) {console.log("RESULT: " + JSON.stringify(results) + " " + "PATH: " + JSON.stringify(path))});
```

## How this works
ground-truth goes through all the links on a page and checks how similar the content on the linked page is to the content on the original page. It then picks the highest similarity linked page (if the similarity is above the inputted threshold) and repeats the process until the max number of hops is exhausted or a page is reached that does not have any linked pages above the similarity threshold. This page is returned as the result.

Similarity is computed by vectorizing the text on a page using a count-vector and then comparing count-vectors

## License and copyright

Copyright Duke Reporters' Lab

ground-truth is made available under the MIT licence


