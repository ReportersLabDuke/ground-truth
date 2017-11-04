var gt = require('./index.js');

// An example story that ground-truth will find original reporting for:
gt.findSourceReporting('http://www.dukechronicle.com/article/2017/01/report-duke-head-coach-mike-krzyzewski-disciplines-team-following-loss-to-n-c-state', 0.5, 15, function (results, path) { console.log("RESULT: " + JSON.stringify(results) + " " + "PATH: " + JSON.stringify(path)) });

// Some more interesting examples (uncomment to try):

//gt.findSourceReporting('http://thehill.com/blogs/blog-briefing-room/news/324596-priebus-could-have-violated-wh-policy-by-speaking-to-fbi-report', 0.5, 15, function(link) {console.log("RESULT: " + link)});

//gt.findSourceReporting('https://www.washingtonpost.com/news/sports/wp/2015/03/03/sexual-assault-allegations-against-dukes-rasheed-sulaimon-raise-questions-only-mike-krzyzewski-can-answer/?tid=a_inl&utm_term=.784bf6bbead3', 0.5, 15, function (results, path) { console.log("RESULT: " + JSON.stringify(results) + " " + "PATH: " + JSON.stringify(path)) });

//gt.findSourceReporting('https://www.nytimes.com/2015/03/04/sports/ncaabasketball/duke-reacts-to-report-on-handling-of-sexual-assault-allegations.html', 0.5, 15, function (results, path) { console.log("RESULT: " + JSON.stringify(results) + " " + "PATH: " + JSON.stringify(path)) });

//gt.findSourceReporting('http://www.chronicle.com/article/A-Lawsuit-Unmet-Demands-and/236027', 0.5, 15, function (results, path) { console.log("RESULT: " + JSON.stringify(results) + " " + "PATH: " + JSON.stringify(path)) });

//gt.findSourceReporting('https://www.nytimes.com/2017/11/01/education/edlife/what-college-admissions-wants.html', 0.5, 15, function (results, path) { console.log("RESULT: " + JSON.stringify(results) + " " + "PATH: " + JSON.stringify(path)) });

//gt.findSourceReporting('http://www.slate.com/articles/technology/technology/2017/10/vcs_who_lost_their_jobs_for_alleged_sexual_harassment_are_joking_about_it.html', 0.5, 15, function (results, path) { console.log("RESULT: " + JSON.stringify(results) + " " + "PATH: " + JSON.stringify(path)) });
