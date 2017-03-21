var gt = require('./index.js');

gt.findSourceReporting('http://thehill.com/blogs/blog-briefing-room/news/324596-priebus-could-have-violated-wh-policy-by-speaking-to-fbi-report', 0.5, 15, function(link) {console.log("RESULT: " + link)});
