let dexter = null
  , interactive = null
;

window.onload = () => {
  const dogNav = document.getElementById('dog-nav')
    , dogLinks = Array.from(dogNav.getElementsByTagName('li'))
    , cards = Array.from(document.getElementsByClassName('card'))
  ;
  // Set up our nav behavior
  dogLinks.forEach((item) => {
    item.addEventListener('click', (e) => {
      const clickedItem = e.target.parentNode
        , targetId = String(e.target.href).replace(/.*?#(.*)$/, '$1')
      ;
      console.log(clickedItem, targetId);
      // Switch our active links
      dogLinks.forEach((undoItem) => undoItem.classList.remove('is-active'));
      clickedItem.classList.add('is-active');
      // Switch our visible card
      cards.forEach((card) => card.hidden = true);
      document.getElementById(targetId).hidden = false;
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
    ]
    // This is the usual config from the webhook
    , dexterSettings: {
      botId: 'e778ec9d-d93c-4994-a7c9-3471e770c9f7'
      , botTitle: 'Example 03 - Explainer'
      , baseUrl: 'https://bots.rundexter.com'
      , url: 'https://rundexter.com/webwidget-beta'
      , onLoad: (api) => {
        dexter = api;
        if (interactive.isEmbedFullscreen()) {
          dexter.replyTo('invalid-screen-size');
        } else {
          dexter.replyTo('hi');
        }
      }
    }
  });
};
