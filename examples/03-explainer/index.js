let interactive = null;

/**
 * Set up standard tip behavior
 *
 * @param {string} selector - CSS selector for the target elements
 * @param {string} content - Tooltip text
 * @param {string} placement - Where the tooltip should be placed (if not auto-start)
 * @return {Array<Tippy>} Generated tippy instances
 */
function bindTip(selector, content, placement) {
  return tippy(selector, {
    animation: 'fade'
    , content
    , placement: placement ? placement : 'auto-start'
    , trigger: 'manual'
  });
}

/**
 * Show a specific tab/card
 *
 * @param {string} id - Which HTML id to show
 */
function showTab(id) {
  const cards = Array.from(document.getElementsByClassName('card'));
  cards.forEach((card) => card.hidden = true);
  document.getElementById(id).hidden = false;
}

/**
 * Check to see if the given element is visible
 * C/O https://davidwalsh.name/offsetheight-visibility
 *
 * @param {HtmlElement} element - Element to check
 * @return {bool} True if the element is visible
 */
function isVisible(element) {
  return element.offsetHeight !== 0;
}

window.onload = () => {
  const dogNav = document.getElementById('dog-nav')
    , dogLinks = Array.from(dogNav.getElementsByTagName('li'))
    , tags = {
      title: bindTip('.hero-body h1.title', 'This is a title')
      , subtitle: bindTip('.hero-body h2.subtitle', 'This is a subtitle')
      , tabBar: bindTip('.hero-body .tabs', 'This is the nav bar')
      , cards: bindTip('.hero-body .card', 'This is a card')
      , images: bindTip('.card img', 'This is a picture of a dog')
      , cardTitles: bindTip('.card .title', 'This is a card title')
      , cardText: bindTip('.card .content', 'This is the card text')
    }
    , showTip = (tag) => {
      tags[tag].forEach((tip) => {
        if (isVisible(tip.reference)) {
          tip.show();
          setTimeout(() => tip.hide(), 3000);
        }
      });
    }
  ;

  // Set up our nav behavior
  dogLinks.forEach((item) => {
    item.addEventListener('click', (e) => {
      const clickedItem = e.target.parentNode
        , targetId = String(e.target.href).replace(/.*?#(.*)$/, '$1')
      ;
      // Switch our active links
      dogLinks.forEach((undoItem) => undoItem.classList.remove('is-active'));
      clickedItem.classList.add('is-active');
      // Switch our visible card
      showTab(targetId);
      e.stopPropagation();
    });
  });

  // We'll use the createInterativeBot helper to wire up the whole bot at once
  interactive = dexterInteractive.createInteractiveBot({
    // We don't care what the user says for this example, just what the bot says.
    handleOutgoing: false
    // Let's see all the logs in the console.  Turn this off in production.
    , logger: true
    // Translate each incoming vibe to an emoji
    , handler: [
      {metaPath: '0.tag', meta: /.+/, onMatch: (type, text, metadata) => {
        showTip(metadata[0].tag);
      }}
      , {metaPath: '0.tab', meta: /.+/, onMatch: (type, text, metadata) => {
        showTab(metadata[0].tab);
      }}
    ]
    // This is the usual config from the webhook
    , dexterSettings: {
      botId: 'e778ec9d-d93c-4994-a7c9-3471e770c9f7'
      , botTitle: 'Example 03 - Explainer'
      , baseUrl: 'https://bots.rundexter.com'
      , url: 'https://rundexter.com/webwidget-beta'
      , onLoad: (api) => {
        if (interactive.isEmbedFullscreen()) {
          api.replyTo('invalid-screen-size');
        } else {
          api.replyTo('hi');
        }
      }
    }
  });
};
