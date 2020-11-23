# Dexter Interactive

## Overview

[Dexter](https://rundexter.com) is a powerful chatbot authoring platform that lets you [write and deploy](http://docs.rundexter.com/quick-start/) your own conversational interfaces using [SMS](http://docs.rundexter.com/platforms/sms/), [Facebook](http://docs.rundexter.com/platforms/facebook/), your [website](http://docs.rundexter.com/platforms/web/), and more.

While most platforms have deep restrictions on how a bot can and should behave, those deployed on your website should allow for a much broader range of creative integrations. This library is here to help you bring those creative bots to life. It acts as an alternative loader for the Dexter [web widget](http://docs.rundexter.com/platforms/web/) that makes it easy for your website deeply interact with your bot. This is a [UMD](https://github.com/umdjs/umd) library, so it can be used in any number of front-end setups.

## Examples
### [Example 1 - Minimalistic emoji](http://dexter-interactive.rundexter.com/01-minimal/index.html)
It's simple to let your page react to your bot's conversation. Here's a very literal example - when the bot reports that the user is happy, the page looks happy. When your user is sad, it's sad back.

First, let's look at what [the bot](https://github.com/rundexter/dexter-interactive/tree/master/examples/01-minimal/bot) is doing:
```
+ [*] (good|great|excellent) [*]
- ^metadata({"vibe":"good"}) Glad to hear it!

+ [*] (ok|decent|meh) [*]
- ^metadata({"vibe": "neutral"}) Well, hopefully tomorrow is a little brighter.

+ [*] (awful|bad|terrible) [*]
- ^metadata({"vibe": "bad"}) Ugh, sorry to hear that.
```

All we're doing is capturing a few mood words and responding appropriately inside the bot. More importantly, we're adding some metadata to the message that explicitly identifies the vibe we caught. This metadata doesn't actually appear to the user, but your interactive script on your page will be able to see and act on it. Here's [the script](https://github.com/rundexter/dexter-interactive/blob/master/examples/01-minimal/index.js):

```javascript
function setEmoji(chr) {
  document.getElementById('current-emoji').innerHTML = chr;
}
window.onload = () => {
  // We'll use the createInterativeBot helper to wire up the whole bot at once
  dexterInteractive.createInteractiveBot({
    // We don't care what the user says for this example, just what the bot says.
    handleOutgoing: false
    // Let's see all the logs in the console.  Turn this off in production.
    , logger: true
    // Translate each incoming vibe to an emoji
    , handler: [
      {metaPath: '0.vibe',   meta: 'good',    onMatch: () => setEmoji('😀')}
      , {metaPath: '0.vibe', meta: 'neutral', onMatch: () => setEmoji('😐')}
      , {metaPath: '0.vibe', meta: 'bad',     onMatch: () => setEmoji('😔')}
    ]
    // This is the usual config from the webhook
    , dexterSettings: {
      botId: '0b755674-95a4-4d1f-a8f6-d361920e5d5b'
      , botTitle: 'Example 01 - Minimal'
      , baseUrl: 'https://bots.rundexter.com'
      , url: 'https://rundexter.com/webwidget-beta'
    }
  });
};
```

The real work is done in the "handlers" collection, where we translate vibes we recognize into an emoji we want to display. We pull the vibe out of the metadata we shipped along with the response via "0.vibe". The 0 means we only care about the first `^metadata()` (there can be more than 1 if desired), and "vibe" is the property we want to check. Once we have the vibe, we check its value via explicit matching, so nothing happens if we don't see "good", "bad", or "neutral", or if the response doesn't include "vibe" metadata.

### [Example 2 - Browsing assistance](http://dexter-interactive.rundexter.com/02-browsing/index.html)
We can take interaction a step further and actually control our website from the bot. Let's say you've got a huge database of something...products, software, or maybe encyclopedia articles. Your bot can be another discovery and conversion tool in your arsenal, letting you turn natural language requests into hand-curated results. Example 2 is a simple skeleton of how such an interaction could work.

[The bot](https://github.com/rundexter/dexter-interactive/tree/master/examples/02-browsing/bot) side of things is pretty simple - we prompt the user to choose a topic and a subtopic, then pass the choices along to the bot via metadata:

```
// Kick off the process
+ go
- What broad category are you interested in? ^buttons("People",  "History", "Geography", "Arts", "Philosophy", "Everyday life", "Society", "Health", "Science", "Technology", "Mathematics")

+ people
- <set level1=People> ^metadata({"level1": "People"}) ^buttons("Leaders", "Religious", "Philosophers", "Writers", "Musicians", "Scientists", "Mathematicians", "Artists", "Filmmakers", "Businesspeople")

+ leaders
- ^metadata({"level1": "<get level1>", "level2": "<sentence>"}) Great, let's see what we have for you.
```

This strategy simply prompts the user to choose a primary and secondary category, then passes the selections along to the page. Other, more interesting strategies could be easily swapped in here - things like search, mood quizzes, recommendation funnels, limited time discount prompts, and more. Ultimately, all [your page](https://github.com/rundexter/dexter-interactive/blob/master/examples/02-browsing/index.js) cares about is that it gets a directive on which subcategory to show:

```javascript

function showLevel2(level1, level2) {
  const matched1 = data[level1]
    , matched2 = matched1 ? matched1[level2] : null
  ;
  if (matched2) {
    showArticles(matched2);
  } 
}
function showArticles(articles) {
  // ...
  articles.forEach((article) => {
    const el = document.createElement('div');
    el.innerHTML = `
      <div>
        <h3><a href="${article.url}" title="Read about ${article.title} on Wikipedia">${article.title}</a></h3>
        <figure>
          <img src="${article.image}" title="${article.title}">
          <figcaption>${article.summary}</figcaption>
        </figure>
      </div>
    `;
    articleContainer.append(el);
  });
}
window.onload = () => {
{
  dexterInteractive.createInteractiveBot({
    handleOutgoing: false
	, handler: [
	  {metaPath: '0.level2', meta: /.+/, onMatch: (type, text, metadata) => {
        showLevel2(metadata[0].level1, metadata[0].level2);
	  }}
	]
    // ...
  });
};
```

This snippet roughly shows how the interface works - when we get a `level2` signal in a bot response, we find the matching articles and render them to the screen. The `showArticles` method could easily be replaced with whatever routing strategy your application may use, be it a traditional `window.location` assignment or via deep integration with your favorite [single-page application](https://en.wikipedia.org/wiki/Single-page_application) tooling.

### [Example 3 - Interactive Documentation](https://dexter-interactive.rundexter.com/03-explainer/index.html)
If you're building a webapp, you generally need to consider what the learning curve for your users is going to be. The more tools you can provide that help users learn the ropes, the better. Your chatbot can become one of these tools with a little help from interactivity.

[The bot](https://github.com/rundexter/dexter-interactive/blob/example-03/examples/03-explainer/bot/default.topic) is straightforward - we capture words that describe either an element on the page or something contextual to the content.

```
// Capture a question about a tag
+ [*] (title|titles|heading|headings|header|headers|lede|h1|h2) [*]
- ^metadata({"tag": "title"}) Titles on a page are generally large, prominent text. Under the hood they're usually part of some kind of "<raw><h?></raw>" tag, like <raw><h1>My story</h1></raw>

+ [*] (park|ball|fetch) [*]
- ^metadata({"tab": "01-park"}) The park is the best place, no questions asked. Squirrels are an added bonus.
```

Content-related requests are treated much like we do in example 2, where content appropriate matching the metadata's "tab" value is presented and a little extra information is offered inside the bot. When someone asks about a part of the page, however, we tab into the wonderful [Tippy](https://atomiks.github.io/tippyjs/) library to point the user at the element in question, allowing the description being shown in the bot to have some real context in the actual web page being discussd.

```javascript
const tags = {
  title: tippy('.hero-body h1.title', {
    , content: 'This is a title'
    , trigger: 'manual'
  })
  // ...
};
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
 * Show a specific tag/tip
 *
 * @param {string} tag - The name of the tag to show
 */
function showTip(tag) {
  tags[tag].forEach((tip) => {
    if (isVisible(tip.reference)) {
      tip.show();
      setTimeout(() => tip.hide(), 3000);
    }
  });
}
dexterInteractive.createInteractiveBot({
  // ...
  handler: [
    {metaPath: '0.tag', meta: /.+/, onMatch: (type, text, metadata) => {
      showTip(metadata[0].tag);
    }}
    , {metaPath: '0.tab', meta: /.+/, onMatch: (type, text, metadata) => {
      showTab(metadata[0].tab);
    }}
  ]
  // ...
});

```

If you want to take your explainer to the next level, libraries like [intro.js](https://introjs.com/) or [pageguide](http://tracelytics.github.io/pageguide/) could make for an even more compelling tutorial. You could also use your bot to pre-fill forms, help a user dive deeper into error messages, and more.

## Getting started

### Loading the library
Dexter Interactive is a [UMD](https://github.com/umdjs/umd) library, so there are a variety of ways you can include it in your project. You can include it directly on your page via a script tag:
```html
<script type="text/javascript" src=""></script>
```
Add it to your Webpack or ES6 project via import:
```sh
npm install dexter-interactive
```
```javascript
import {createInteractiveBot} from 'dexter-interactive';
```
or use an [AMD/CommonJS](https://requirejs.org/docs/whyamd.html) require:
```sh
npm install dexter-interactive
```
```javascript
var DexterInteractive = require('node-modules/dexter-interactive/dist/dexter-interactive')
  , createInteractiveBot = DexterInteractive.createInteractiveBot
;
```

### Initializing the bot
Once you have a handle on the createInteractiveBot function, call it:
```javascript
dexterInteractive.createInteractiveBot({
  // Set up your interactions
  handler: []
  // Initialize your bot
  , dexterSettings: {
    botId: '2bdd49db-4f52-466b-910a-7ab7c735ffdf'
    , botTitle: 'Example 02 - Browsing'
    , baseUrl: 'https://bots.rundexter.com'
    , url: 'https://rundexter.com/webwidget-beta'
  }
});
```
`createInteractiveBot` does 2 things:
1. Initializes the Dexter web widget (note that this loads and downloads a separate script)
2. Sets up a series of `handler`s to help you filter and route incoming messages and metadata
Note that all of the [configuration settings](http://docs.rundexter.com/platforms/web/) available in the widget are available in your dexterSettings.

### Creating handlers
You can have as few or as many handlers in your `handler` collection as you'd like. Only one handler can be triggered per message, and the first handler to match the message wins. Handlers get evaluated in the order they're written.

There are three ways to trigger a handler: by message text, by message metadata, or by a custom function. Each of these triggers can be tested using several mechanisms:

### Text-based handlers
Text-based handlers simply test the raw text of the message to see if it should be acted on. The text is not modified in any way.

**Test by exact match**
```javascript
handler: [
  {text: 'hello', onMatch: () => console.log('Hi!')}
]
```

**Test by RegExp**
```javascript
handler: [
  {text: /register/, onMatch: () => alert('Glad to have you!')}
]
```

**Test by function**
```javascript
handler: [
  {text: (msg) => ['hi', 'hello'].indexOf(msg) >= 0, onMatch: () => console.log('Hi!')}
]
```

### Metadata-based handlers
Bots can pass explicit metadata along with a response by using the `^metadata({"foo": "bar"})` shortcode. Your handler can test for specific metadata by first using a `metaPath` to target a specific value via a [path declaration](https://lodash.com/docs/4.17.15#toPath), then testing that value in `meta`. The test even runs if no data is found in the path *unless* a RegExp is used, in which case any non-string value will automatically fail.

**Test by exact match**
```javascript
handler: [
  {metaPath: '0.user.subscribed', meta: 1, onMatch: () => console.log('User is subscribed')}
]
```

**Test by RegExp**
```javascript
handler: [
  {metaPath: '0.user.email', meta: /@aol\.com/, onMatch: () => console.log('Really?!??')}
]
```

**Test by function**
```javascript
handler: [
  {metaPath: '0.user.status', meta: (val) => ['paid', 'comped'].indexOf(val) >= 0, onMatch: () => console.log('User is up-to-date on payments')}
]
```

### Function-based handler
Function handlers are different in that they replace the *entire* handler array - you can't mix and match a function-based handler with other handler types.

```javascript
handler: (type, text, metadata, payload) => {
  if (type === PAYLOAD_TYPE_BOT) {
    switch(_.get(metadata, '0.name')) {
	  // ...
	}
  } else {
    console.log('User said', text);
  }
}
```

## API
### createInteractiveConfig(cfg)
```javascript
// All possible settings shown with all default values
createInteractiveConfig({
  // If true, messages sent by the bot will be fed to your handler, otherwise they will be ignored.
  handleBotEvents: true
  // If true, messages sent by your user will be fed to your handler, otherwise they will be ignored.
  , handleUserEvents: true
  // If true, messages sent while the chat widget is closed will be fed to your handler, including any historical messages sent when the widget is initialized.
  , handleWhenClosed: false
  // Routes logs that can help with debugging. There are 3 possible values:
  // true: routes to the correct console.* function (i.e. errors to console.error, warnings to console.warn, etc.)
  // function (level, msg, [metadata]) {}: level is one of the LOG_LEVEL constants, msg is the plain text of the log, metadata is an optional object containing additional details
  // false: disables library logging completely
  , logger: false
  // REQUIRED: Any event handlers used to control interactivity
  , handlers: []
  // These are the values that are used to configure your widget
  , dexterSettings: {
      // REQUIRED: The ID of the bot to load (you can get it from the URL in the editor or from your existing embed HTML)
      botId: '' // Example: AABBCC123123
	  // REQUIRED: How you want the bot's title to appear in the widget
	  , botTitle: '' // Example: My Best Botty
	  // REQUIRED: Leave this as is.
	  , baseURL: 'https://bots.rundexter.com'
	  // REQUIRED: Leave this as is.
	  , url: 'https://rundexter.com/webwidget-beta'
	  // Selector string for a custom launcher button for the widget
      , customLauncher: null // Example: '#link'
      // A boolean indicating whether to hide the default launcher button
      , hideDefaultLauncher: false
      // A custom icon on the top left of the message panel
      , logoIcon: null // Example: 'https://example.com/logo.png' 
      // A custom icon for the default launcher button that opens the widget
      , openIcon: null // Example: 'https://example.com/button-open.png' 
      // A custom icon for the default launcher button that closes the widget
      , closeIcon: null // Example: 'https://example.com/button-close.png' 
      // Event called when the widget is loaded - can be used to bind the API outside this library
      , onLoad: function (api) { }
      // Event called when the widget is opened
      , onOpen: function (api) { }
      // Event called when the widget is closed
      , onClose: function (api) { }
  }
})
```

For a minimal config to copy/paste:

```javascript
createInteractiveConfig({
  handlers: []
  , dexterSettings: {
      botId: '' // Example: AABBCC123123
	  , botTitle: '' // Example: My Best Botty
	  , baseURL: 'https://bots.rundexter.com'
	  , url: 'https://rundexter.com/webwidget-beta'
  }
})
```

### Constants

Logger constants - passed to `cfg.logger` functions as `type`

| Constant | Description |
| :-- | :-- |
| **LOG_LEVEL_DEBUG** | A low-priority debug log for development - shows the results of all handler decisions |
| **LOG_LEVEL_INFO** | Useful information for day-to-day monitoring - shows the final handler decision |
| **LOG_LEVEL_WARN** | Non-breaking errors such as configuration issues |
| **LOG_LEVEL_ERROR** | Critical errors |

Message payload types - passed to `cfg.handler` functions as `type`

| Constant | Description |
| :-- | :-- |
| **PAYLOAD_TYPE_BOT** | A response sent from the bot |
| **PAYLOAD_TYPE_USER** | A request sent by the user |


## Development
### Working with examples
All our examples are created with vanilla tooling to make it easy for anyone to sit down and play with them. Getting started is simple:

```sh
npm install
npm run examples
```

That's it! Calling npm run examples will build the library and start up a webserver at http://localhost:5000 to show the examples. You can use our bots freely, or use the code in each examples' `/bots` directory to create your own. Just copy each file into its respective topic, deploy the widget, and replace the `botId` in the example's `dexterSettings` object, and away you go!

A few quick notes:
* While we designed the library to have very broad browser compatability, the examples may require a more modern browser such as Firefox, Chrome, or Edge to view.
* The data in example 2 can be rebuilt if needed or desired - see its `/bin` folder for details.

### Editing the code
We've got a few commands baked into the library to help you with development:
* `npm run watch` and link to `dist/dexter-interactive.js` to work in real time. This won't auto-reload your page on save, but it will update the script.
* `npm run build:production` generates a build
* `npm run analyze:production` will help find candidates for optimizations

### Contributing
We'd love to have you contribute! Here's some rough guidelines:
1. All changes must pass the built-in lint.
2. Any new functionality should have a basic unit test or two
3. Make sure you include your reasons for submitting the PR in its description 

Looking for some ideas on what to contribute?
* More or better tests are good
* More examples are good
* Shrinking library without sacrificing compatibility would be amazing
* Alternate matching strategies will be considered with a solid rationale
