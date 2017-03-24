var rewire = require('rewire');

var gt = rewire('../index.js');

describe("The getRequestForPage function", function () {
  it("should return a request bound to the input url", function () {
    var testUrl = "https://www.google.com/";
    
    var testFunction = gt.__get__("getRequestForPage");
    var boundFunction = testFunction(testUrl);
    var result = boundFunction();

    expect({url: result.uri.href}).toEqual({url: jasmine.stringMatching(
      testUrl.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&") + "\/?"
    )});
  });
});
