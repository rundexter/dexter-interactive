const crypto = require('crypto')
  , fs = require('fs')
  , util = require('util')
  , axios = require('axios')
  , JSDom = require('jsdom')
  , CACHE_PATH = `${__dirname}/cache`
;

/**
 * Quick and dirty string hash
 *
 * @param {string} s - What to hash
 * @return {string} SHA1 hash
 */
function quickHash(s) {
  const shasum = crypto.createHash('sha1');
  shasum.update(s);
  return shasum.digest('hex');
}

/**
 * Make sure we have a cache folder
 *
 */
function initCache() {
  try {
    fs.mkdirSync(CACHE_PATH);
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
  }
}

/**
 * Stash and return the results of a GET request.
 * Side effect: results are stored in ./cache/$url_hash.
 *
 * @param {string} url - What to fetch
 * @param {string} type - Either string or json
 * @return {Promise<string>} Data.
 */
function fetchAndCache(url, type) {
  return axios.get(url)
      .then((res) => {
        const hash = quickHash(url)
          , path = `${CACHE_PATH}/${hash}`
        ;
        fs.writeFileSync(path, type === 'json' ? JSON.stringify(res.data, null, 2) : res.data);
        // Be kind to the API and wait a few seconds
        return new Promise((resolve) => {
          console.info('Sleeping for API, fetched ' + url);
          setTimeout(() => resolve(res.data), 2000);
        });
      })
  ;
}

/**
 * Get data, first from a cache if we have it, then from the web if we don't.
 * We do this so we don't spam the page unnecessarily during development.
 *
 * @param {string} url - Where to get the data
 * @param {string} type - Either string or json
 * @return {Promise<string>} Data
 */
function getContents(url, type) {
  const hash = quickHash(url)
    , path = `${CACHE_PATH}/${hash}`
    , reader = util.promisify(fs.readFile)
  ;
  // console.log('Cached?', fs.existsSync(path), path);
  if (fs.existsSync(path)) {
    return reader(path, {encoding: 'utf8', flag: 'r'})
        .then((res) => type === 'json' ? JSON.parse(res) : res)
    ;
  }
  return fetchAndCache(url, type);
}

/**
 * Shortcut for getting elements by class
 *
 * @param {JSDom.JSDOM} dom - Document model
 * @param {string} className - What to fetch
 * @return {Array} List of elements
 */
function getByClass(dom, className) {
  return dom.window.document.getElementsByClassName(className);
}

initCache();
getContents('https://en.wikipedia.org/wiki/Wikipedia:Vital_articles', 'string')
    .then((res) => {
      const dom = new JSDom.JSDOM(res)
        , containers = getByClass(dom, 'multicol')
        , stripDetails = (s) => s.indexOf('(') > 0
          ? s.replace(/(.*?) \(.*/, '$1').trim()
          : s.trim()
        , tree = {}
      ;
      // Each top-level category is contained in a "table.multicol"
      Array.from(containers).forEach((container) => {
        // Each of these containers is wrapped in a div that is preceded by an h2 with the level1 category
        // This looks like $Category (...)
        // Note that jsDom uses a nonstandard textContent property for innerText
        const level1 = stripDetails(container.parentElement.previousElementSibling.textContent)
          // Under the container are up to 3 column cells
          , subcontainers = container.getElementsByTagName('td')
          , iterables = Array.from(subcontainers).reduce((gathered, curr) => {
            return gathered.concat(Array.from(curr.children));
          }, [])
        ;
        tree[level1] = {};
        let currLevel2 = '';
        iterables.forEach((node) => {
          switch (node.nodeName) {
            case 'H3':
              currLevel2 = stripDetails(node.textContent);
              tree[level1][currLevel2] = [];
              break;
            case 'UL':
              Array.from(node.getElementsByTagName('li')).forEach((item) => {
                const anchor = item.getElementsByTagName('a')[0]
                  , href = anchor.getAttribute('href')
                  , page = href.replace(/\/.*\/(.*)/, '$1')
                ;
                tree[level1][currLevel2].push({page});
              });
              break;
          }
        });
      });
      return tree;
    })
    // .then((tree) => console.log(JSON.stringify(tree, null, 2)))
    .then((tree) => {
      // Make a top-level promise we can extend as we find more pages that need information
      let promise = new Promise((resolve) => resolve());
      // Load up a big ugly chain of promises for each page
      Object.keys(tree).forEach((level1) => {
        Object.keys(tree[level1]).forEach((level2) => {
          tree[level1][level2].forEach((article) => {
            // Here's where we add to the promise chain
            promise = promise
                .then(() => getContents('https://en.wikipedia.org/api/rest_v1/page/summary/' + article.page, 'json'))
                .then((data) => {
                  article.title = data.title;
                  if (data.originalimage) {
                    // The "replace" is to fix a weird escaping issue.  It's the only one, so it's a quick hack,
                    // but there's likely a smarter way to do it.
                    article.image = data.originalimage.source.replace(/%27/g, "'");
                    // Wikimedia's recommended permalink strategy.
                    article.safe_image = [
                      'https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file'
                      , article.image.replace(/.*?\/([^\/]+)$/, '$1')
                    ].join('/');
                  } else {
                    article.image = '';
                    article.safe_image = '';
                  }
                  article.url = data.content_urls.desktop.page;
                  article.summary = data.extract;
                })
            ;
          });
        });
      });
      return promise.then(() => tree);
    })
    .then((complete) => console.log(JSON.stringify(complete, null, 2)))
    .catch((err) => {
      console.log('Whoops', err);
    })
;
