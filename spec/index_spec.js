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

describe("The requestWithBodyTextAndUrlCallback function", function () {
  var testFunction = gt.__get__("requestWithBodyTextAndUrlCallback");
  var testUrl = "http://csb.stanford.edu/class/public/pages/sykes_webdesign/05_simple.html";
  var libs = {};
  var cb = null;
  
  beforeAll(function (done) {
    libs['request'] = gt.__get__("request");
    
    spyOn(libs.request, 'get').and.callThrough();
    gt.__set__("unfluff", jasmine.createSpy().and.callFake(function (page) {
      return {
        text: "unfluff stand-in text"
      };
    }));

    cb = jasmine.createSpy('callback');
    testFunction(testUrl, cb);

    setTimeout(function() {
      done();
    }, 1000);
  });

  it("should have called request with the right parameters", function (){
    expect(libs.request.get).toHaveBeenCalledWith({
      uri: testUrl,
      maxRedirects: 3,
      jar: true,
      headers: {"User-Agent": "Chrome/26.0.1410."}
    }, jasmine.any(Function));
  });

  it("should have called unfluff", function () {  
    expect(gt.__get__("unfluff")).toHaveBeenCalled();
  });

  it("should have called the callback correctly", function () {
    expect(cb).toHaveBeenCalledWith(null, jasmine.objectContaining({
      pageHtml: "unfluff stand-in text",
      url: testUrl
    }));
  }); 
});

describe("The cossim function", function() {
  var testFunction = gt.__get__("cossim");

  it("should return a similarity of 1 for vectors that are the same", function () { 
    var vec1 = [1, 1, 1];
    var vec2 = [1, 1, 1];
    var result1 = testFunction(vec1, vec2);

    expect(result1).toBeCloseTo(1.00, 2);

    var vec3 = [1, 5, 6, 7, 9];
    var vec4 = [1, 5, 6, 7, 9];
    var result2 = testFunction(vec3, vec4);

    expect(result2).toBeCloseTo(1.00, 2);
  });

  it("should return a similarity of 0 for orthogonal vectors", function () {
    var vec1 = [0, 0, 1];
    var vec2 = [1, 0, 0];
    var result1 = testFunction(vec1, vec2);

    expect(result1).toBeCloseTo(0.00, 2);

    var vec3 = [1, 0 ,0, 1];
    var vec4 = [0, 1, 0, 0];
    var result2 = testFunction(vec3, vec4);

    expect(result2).toBeCloseTo(0.00, 2);
  });

  it("should return a similarity of -1 for opposite vectors", function () {
    var vec1 = [-1, -3, -1, -5, -2, -9];
    var vec2 = [1, 3, 1, 5, 2, 9];
    var result1 = testFunction(vec1, vec2);

    expect(result1).toBeCloseTo(-1.00, 2);    
  });

  it("should return correct similarities for test vectors", function () {
    var vec1 = [9, 4, 2, 49, 19, 1, 4, 12];
    var vec2 = [4, 3, 40, 10, 4, 1, 4, 2];
    var result1 = testFunction(vec1, vec2);
    
    expect(result1).toBeCloseTo(0.3184, 3);

    var vec3 = [2, -1, 4, -10, 5];
    var vec4 = [-1, 3, 2, -3, 4];
    var result2 = testFunction(vec3, vec4);

    expect(result2).toBeCloseTo(0.7024, 3); 
  });
});

describe("The filterDomain function", function () {
  it("should filter links from the specified domain", function () {
      var testFunction = gt.__get__("filterDomain");
      var testUrl = "http://www.google.com";
      var filterUrls = [
        {href: "http://www.google.com/search"},
        {href: "http://www.bing.com/search"},
        {href: "https://www.google.com"},
      ];
        
      var cb = jasmine.createSpy("callback");
      
      testFunction(filterUrls, testUrl, cb);
      expect(cb).toHaveBeenCalledWith(null, [{href: "http://www.bing.com/search"}], testUrl);
  }); 
});
