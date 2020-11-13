let dexter = null
  , interactive = null
;
/**
 * Update the main document element with a single emoji
 *
 * @param {string} chr - Emoji to set
 */
function setEmoji(chr) {
  document.getElementById('current-emoji').innerHTML = chr;
}

window.onload = () => {
  // We'll use the createInterativeBot helper to wire up the whole bot at once
  interactive = dexterInteractive.createInteractiveBot({
    // We don't care what the user says for this example, just what the bot says.
    handleOutgoing: false
    // Let's see all the logs in the console.  Turn this off in production.
    , logger: true
    // Translate each incoming vibe to an emoji
    , handler: [
      {metaPath: '0.vibe',   meta: 'good',    onMatch: () => setEmoji('😀')}
      , {metaPath: '0.vibe', meta: 'neutral', onMatch: () => setEmoji('😐')}
      , {metaPath: '0.vibe', meta: 'bad',     onMatch: () => setEmoji('😔')}
      , {metaPath: '0.vibe', meta: /.+/,      onMatch: () => setEmoji('😕')}
    ]
    // This is the usual config from the webhook
    , dexterSettings: {
      botId: '0b755674-95a4-4d1f-a8f6-d361920e5d5b'
      , botTitle: 'Example 01 - Minimal'
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
