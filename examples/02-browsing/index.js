let dexter = null
  , data = null
  , interactive = null
  , shownArticlesOnce = false;
;
/**
 * Show a teaser for the given top-level category
 *
 * @param {string} level1 - Which top-level category we're working with
 */
function showLevel1(level1) {
  const matched = data[level1];
  let count = 0;
  if (matched) {
    Object.keys(matched).forEach((level2) => {
      count += matched[level2].length;
    });
    showText(`${level1} has ${count} articles - dig deeper!`);
  } else {
    showText(`Hmmm...that doesn\'t seem right.  Are you sure you meant ${level1}`);
  }
}
/**
 * Show a teaser for the given second-level category
 *
 * @param {string} level1 - Which top-level category we're working with
 * @param {string} level2 - Which second-level category we're working with
 */
function showLevel2(level1, level2) {
  const matched1 = data[level1]
    , matched2 = matched1 ? matched1[level2] : null
  ;
  if (matched2) {
    // showText(`${level2} (in ${level1}) has ${matched2.length} articles`);
    showArticles(matched2);
  } else if (matched1) {
    showText(`Weird, I can find ${level1} but not ${level2}`);
  } else {
    showText(`I don't know anything about either ${level1} or ${level2}, sorry.`);
  }
}
/**
 * Show some basic text instead of articles
 *
 * @param {string} text - What to show
 */
function showText(text) {
  const promptContainer = document.getElementById('prompt');
  document.getElementById('articles').hidden = true;
  promptContainer.hidden = false;
  promptContainer.innerHTML = text;
}

/**
 * Show matching articles
 *
 * @param {Array} articles - Articles from our JSON to display
 */
function showArticles(articles) {
  const articleContainer = document.getElementById('articles');
  articleContainer.innerHTML = '';
  articleContainer.hidden = false;
  document.getElementById('prompt').hidden = true;
  articles.forEach((article) => {
    const el = document.createElement('div')
      , img = article.image ? article.image : '/02-browsing/wikipedia-logo-200.png'
    ;
    el.className = 'article column is-3-desktop';
    el.innerHTML = `
      <div>
        <h2 class="subtitle">
          <a href="${article.url}" title="Read about ${article.title} on Wikipedia">${article.title}</a>
        </h2>
        <figure>
          <img src="${img}" title="${article.title}">
          <figcaption>${article.summary}</figcaption>
        </figure>
      </div>
    `;
    articleContainer.append(el);
    $clamp(el.getElementsByTagName('figcaption')[0], {clamp: 'auto'});
  });
  shownArticlesOnce = true;

  // If we're fullscreen, hide the widget so we can see the results
  if (interactive.isEmbedFullscreen()) {
    dexter.close();
  }
}
window.onload = () => {
  fetch('/02-browsing/top-1000.json')
      .then((res) => res.json())
      .then((json) => {
        data = json;
        // We'll use the createInterativeBot helper to wire up the whole bot at once
        interactive = dexterInteractive.createInteractiveBot({
          // We don't care what the user says for this example, just what the bot says.
          handleOutgoing: false
          // Let's see all the logs in the console.  Turn this off in production.
          , logger: true
          , handler: [
            // This handles requests like ^metadata({"level2": "foo"})
            {metaPath: '0.level2', meta: /.+/, onMatch: (type, text, metadata) => {
              showLevel2(metadata[0].level1, metadata[0].level2);
            }}
            // This handles requests like ^metadata({"level1": "foo"})
            , {metaPath: '0.level1', meta: /.+/, onMatch: (type, text, metadata) => showLevel1(metadata[0].level1)}
            // This handles requests like ^metadata({"restart": 1}). We'll ignore it until we actually show articles.
            , {metaPath: '0.restart', meta: 1, onMatch: () => {
              shownArticlesOnce && showText("Let's pick something new!");
            }}
          ]
          // This is the usual config from the webhook
          , dexterSettings: {
            botId: '2bdd49db-4f52-466b-910a-7ab7c735ffdf'
            , botTitle: 'Example 02 - Browsing'
            , baseUrl: 'https://bots.rundexter.com'
            , url: 'https://rundexter.com/webwidget-beta'
            , onLoad: (api) => {
              // Make the API available elsewhere in this script
              dexter = api;
              // Update the page with some basic plain-text instructions
              showText("I've got a lot I could show you - ask the bot for some guidance!");
              // Kick-start the conversation
              dexter.replyTo('hi');
            }
          }
        });
      })
  ;
};
