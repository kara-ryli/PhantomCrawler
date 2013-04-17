/*global phantom,require,console*/
/*

PhantomCrawler

Search the Web for errors.

Copyright (c) 2013 Ryan Cannon
License: MIT <http://opensource.org/licenses/mit-license>

*/
var system = require("system"),
  URI = require("./lib/URIjs"),
  version = "0.1",
  proccessArgs = require("./lib/args.js").processArgs,
  defaultArgs = {
    agent: "PhantomCrawler/" + version,
    "--limit": 10
  },
  options = proccessArgs(system.args, defaultArgs),
  verbose = options["--verbose"],
  url = options["--url"],
  agent = options['--user-agent'],
  domains = options['--domains'],
  limit = options["--limit"],
  aDomains = domains && domains.split(","),
  lDomains = aDomains && aDomains.length,
  browser = require('webpage').create(),
  errorCount = 0,
  errorURLs = {},
  loaded = 0,
  queue = [],
  cache = {};
console.log("--PhantomCrawler v" + version + "--");

function log(message) {
  if (verbose) {
    console.log(message);
  }
}

function done(message) {
  var i, errMessage;
  console.log(message);
  console.log("Crawled " + loaded + " urls, found " + errorCount + " errors.");
  if (errorCount) {
    for (i in errorURLs) {
      if (errorURLs.hasOwnProperty(i)) {
        errMessage = "  " + errorURLs[i].code + ": " + i;
        if (errorURLs[i].referrer !== i) {
          errMessage += "\n    " + errorURLs[i].referrer;
        }
        console.log(errMessage);
      }
    }
  }
  phantom.exit();
}

function isAllowedDomain(url) {
  var domain, i = 0;
  if (domains) {
    domain = url.host();
    for (i; i < lDomains; i += 1) {
      if (domain === aDomains[i]) {
        return true;
      }
    }
    return false;
  }
  return true;
}

function enqueue(rawURL) {
  var uri = URI(rawURL).fragment(""),
    url = uri.toString(),
    isCached = cache.hasOwnProperty(url),
    disallowed = !isAllowedDomain(uri);
  if (isCached) {
    log("Already checking: " + url);
  } else if (disallowed) {
    log("Disallowed: " + url);
  } else {
    cache[url] = true;
    queue.push(url);
  }
}

function error(url, code, referrer) {
  if (!errorURLs.hasOwnProperty(url)) {
    log("Error (" + code + "): " + url);
    errorURLs[url] = { code: code, referrer: referrer };
    errorCount += 1;
  }
}

function lookForLinks() {
  var urls = {};
  function findLinks(win) {
    var links, i = 0, url;
    // get all the links in this frame this page
    try {
      links = win.document.querySelectorAll("a");
      i = links.length;
      do {
        i -= 1;
        url = links[i].href;
        urls[url] = true;
      } while (i);
    } catch (securityError) {}
  }
  findLinks(window);
  return urls;
}

function load(url) {
  console.log("Crawling: " + url);
  loaded += 1;
  browser.open(url);
}


function loop() {
  if (0 === queue.length) {
    done("Crawl complete.");
  } else if (limit === loaded) {
    done("Crawl limit reached. Use --limit=n to override.");
  } else {
    load(queue.shift());
  }
}

if (options["--help"]) {
  ([
    "Search the Web for errors.",
    "",
    "Syntax:",
    "",
    "  $ phantomjs crawl.js --flag --arg=<value>",
    "",
    "Flags:",
    " --help        - Show this dialog",
    " --verbose     - Show more information about what loads",
    "",
    "Arguments:",
    " --url         - URL to begin crawling from",
    " --domains     - Restrict the crawl to these comma-separated domains",
    " --user-agent  - Use this User-Agent string",
    " --limit       - Limit the crawl to this many pages",
    "",
    "Happy webbing!"
  ]).forEach(function (line) {
    console.log(line);
  });
  phantom.exit(1);
}
if (!url) {
  console.log("Usage: phantomjs phantom/crawl.js --url=<url> use the --help flag for more information");
  phantom.exit(1);
}
if (agent) {
  browser.settings.userAgent = agent;
}
browser.onResourceReceived = function (response) {
  var url = response.url,
    status = response.status;
  if (status >= 400) {
    error(url, status, browser.url);
  } else if ("end" === response.stage) {
    // log("Successfully loaded: " + url);
    if ("text/html" === response.contentType) {
      enqueue(url);
    }
  }
};
browser.onError = function (msg) {
  if (verbose) {
    console.error("Script error: " + msg);
    console.error("on " + browser.url);
  }
};
// these seem to be false positives
// browser.onResourceError = function (resourceError) {
//   var url = resourceError.url,
//     code = resourceError.errorCode;
//   console.error("Error (" + code + "): " + resourceError.errorString + "\n  " + url);
//   error(url, code);
// };
browser.onLoadFinished = function (status) {
  var links, i;
  log("Load finished (" + status + "): " + browser.url);
  if ("success" === status) {
    links = browser.evaluate(lookForLinks);
    log("Found " + Object.keys(links).length + " links");
    for (i in links) {
      if (links.hasOwnProperty(i)) {
        enqueue(i);
      }
    }
  }
  loop();
};
enqueue(url);
loop();
