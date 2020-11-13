import get from 'lodash/get';
import isObject from 'lodash/isObject';
import isFunction from 'lodash/isFunction';
import isString from 'lodash/isString';
/**
 * Configurable properties of a DexterInteractiveEvents instance
 * @typedef DexterInteractiveEventsConfig
 * @property {bool} [handleBotEvents=true] If true, outgoing user messages that meet other criteria will be handled
 * @property {bool} [handleUserEvents=true] If true, incoming bot messages that meet other criteria will be handled
 * @property {bool} [handleWhenClosed=false] If true, messages that take place when the bot is closed will be handled
 * @property {Function|boolean} [logger=false] A function that receives logging messages from this utility:
 *                              fn(LOG_LEVEL, msg, metadata={}) or a bool (true=console.*, false=no logging)
 * @property {Object} [dexterSettings={}] Settings used to initialize the bot
 * @property {Function|Array<DexterInteractiveEventMatcher>} handler Mechanism for handling matched events, either
 *                                                           a custom function that handles every incoming event, or
 *                                                           an array of DexterInteractiveEventMatcher rules and
 *                                                           functions that selectively handle specific events.
 */

/**
 * Rules for matching incoming events to specific handlers.
 * Note that you can test message text (message),  metadata values, (metaPath & meta), or both.
 * @typedef DexterInteractiveEventMatcher
 * @property {string} [type] (Optional) One off the PAYLOAD_TYPE constants to match
 * @property {string|RegExp|Function} [text] (Optional) A check to see if this handler should be used based on
 *                                    message text.  Can be either a string (tested via message.indexOf(handler.text))
 *                                    or regex (tested via handler.text.test(message))
 *                                    or function (tested via handler.text(message) === true
 * @property (string} [metaPath] (Optional) A key to look for in the metadata (see https://lodash.com/docs/4.17.15#get)
 * @property {RegExp|Function|mixed} [meta] (Optional) A check to see if this handler should be used based on
 *                                    metadata value extracted via metaPath.  Can be either
 *                                    a regex (tested via handler.meta.test(value))
 *                                    or function (tested via handler.meta(value) === true
 *                                    or something else  (tested via value === test)
 * @property {Function} onMatch Called when test results in true.
 */

export const
  /**
   * High-value non-failure information
   */
  LOG_LEVEL_INFO = 'info'
  /**
   * Low-value non-failure information
   */
  , LOG_LEVEL_DEBUG = 'debug'
  /**
   * Minor concerns: missing/malformatted configs, unknown events, etc.
   */
  , LOG_LEVEL_WARN = 'warn'
  /**
   * Critical failures that disrupt normal behavior
   */
  , LOG_LEVEL_ERROR = 'error'
  /**
   * Matches when the payload is for an incoming bot message
   */
  , PAYLOAD_TYPE_BOT = 'BOT'
  /**
   * Matches when the payload is for an outgoing user message
   */
  , PAYLOAD_TYPE_USER = 'USER'
;


/**
 * Structure responses to incoming and outgoing Dexter messages
 */
export class DexterInteractiveEvents {
  /**
   * Initialize an event handler
   *
   * @param {DexterInteractiveEventsConfig} cfg - How we want this handler to behave
   */
  constructor(cfg) {
    // Do some critical config validation
    if (!isObject(cfg)) {
      throw new Error('DexterInteractiveEvents is missing a config object');
    }
    if (!(isFunction(cfg.handler) || cfg.handler instanceof Array)) {
      throw new Error('DexterInteractiveEvents config requires a handler function or a list of rules');
    }
    // We're at least functional now, so capture the config so we can use the logger next.
    this.cfg = Object.assign({}, {
      handleBotEvents: true
      , handleUserEvents: true
      , handleWhenClosed: false
      , logger: false
      , dexterSettings: {}
      , handler: []
    }, cfg);
    // Do some basic handler validation to help users identify problems ASAP
    if (cfg.handler instanceof Array) {
      cfg.handler.map((handler, index) => {
        // Make sure we have at least one test type
        if (!handler.text && !handler.meta) {
          this.emitWarn('Missing a test in handler', {index, handler});
        }
        // If we have a message handler, make sure we understand the type
        if (handler.text && !handler.text instanceof String
          && !handler.text instanceof RegExp
          && !isFunction(handler.text)
        ) {
          this.emitWarn('Invalid message test in handler', {index, handler});
        }
        // If we have a metadata handler, make sure we also have a path
        if (handler.meta && !handler.metaPath) {
          this.emitWarn('Missing metaPath for meta test in handler', {index, handler});
        }
        // Note that we don't care about meta type since anything that's not a RegExp or a Function
        // will just trigger an equality test.

        // Finally, make sure our match function is callable
        if (!isFunction(handler.onMatch)) {
          this.emitWarn('Invalid onMatch method in handler', {index, handler});
        }
      });
    }
    // Set up some internal state trackers
    this.embedIsOpen = false;
    this.emitDebug('DexterInteractiveEvents initialized', cfg);
  }

  /**
   * Emit a log message to our configured handler (either a function or this.emitLogDefault).
   *
   * @param {string} level - One of the LOG_LEVEL_* levels
   * @param {string} msg - Text summary of the event
   * @param {Objet} [metadata] - Computer-friendly metadata for the event
   */
  emitLog(level, msg, metadata={}) {
    if (this.cfg.logger === true) this.emitLogDefault(level, msg, metadata);
    else if (this.cfg.logger !== false) this.cfg.logger(level, msg, metadata);
  }

  /**
   * Emit a log event via console command.
   *
   * @param {string} level - One of the LOG_LEVEL_* levels
   * @param {string} msg - Text summary of the event
   * @param {Objet} [metadata] - Computer-friendly metadata for the event
   */
  emitLogDefault(level, msg, metadata={}) {
    switch (level) {
      case LOG_LEVEL_DEBUG:
        console.log(msg, metadata);
        break;
      case LOG_LEVEL_INFO:
        console.info(msg, metadata);
        break;
      case LOG_LEVEL_WARN:
        console.warn(msg, metadata);
        break;
      case LOG_LEVEL_ERROR:
        console.error(msg, metadata);
        break;
      default:
        console.error('Unknown event level "' + level + '"', msg, metadata);
    }
  }

  /**
   * Emit a debug log event.
   *
   * @param {string} msg - Text summary of the event
   * @param {Objet} [metadata] - Computer-friendly metadata for the event
   */
  emitDebug(msg, metadata={}) {
    this.emitLog(LOG_LEVEL_DEBUG, msg, metadata);
  }

  /**
   * Emit an info log event.
   *
   * @param {string} msg - Text summary of the event
   * @param {Objet} [metadata] - Computer-friendly metadata for the event
   */
  emitInfo(msg, metadata={}) {
    this.emitLog(LOG_LEVEL_INFO, msg, metadata);
  }

  /**
   * Emit a warn log event.
   *
   * @param {string} msg - Text summary of the event
   * @param {Objet} [metadata] - Computer-friendly metadata for the event
   */
  emitWarn(msg, metadata={}) {
    this.emitLog(LOG_LEVEL_WARN, msg, metadata);
  }
  /**
   * Emit an error log event.
   *
   * @param {string} msg - Text summary of the event
   * @param {Objet} [metadata] - Computer-friendly metadata for the event
   */
  emitError(msg, metadata={}) {
    this.emitLog(LOG_LEVEL_ERROR, msg, metadata);
  }

  /**
   * Our event handler proxy - routes the event to this.cfg.handler appropriately.
   *
   * @param {Object} payload - The full Dexter embed event payload
   */
  handleEvent(payload) {
    const type = this.extractPayloadType(payload);
    // Make sure we want to handle this event
    if (!this.embedIsOpen && !this.cfg.handleWhenClosed) {
      this.emitDebug('Ignoring event, embed closed', payload);
      return;
    }
    if (type === PAYLOAD_TYPE_USER && !this.cfg.handleUserEvents) {
      this.emitDebug('Ignoring outgoing user message event', payload);
      return;
    }
    if (type === PAYLOAD_TYPE_BOT && !this.cfg.handleBotEvents) {
      this.emitDebug('Ignoring incoming bot message event', payload);
      return;
    }
    // If we do, send it to the correct handler
    if (isFunction(this.cfg.handler)) {
      this.handleEventWithFunction(payload);
    } else if (this.cfg.handler instanceof Array) {
      this.handleEventWithRules(payload);
    } else {
      this.emitWarn('Invalid event handler configured, not responding', {handler: this.handler});
    }
  }

  /**
   * Send the payload to a handler function with important details teased out.
   *
   * @param {Object} payload - Dexter embed payload
   */
  handleEventWithFunction(payload) {
    this.cfg.handler(
        this.extractPayloadType(payload)
        , this.extractPayloadText(payload)
        , this.extractPayloadMetadata(payload)
        , payload
    );
  }

  /**
   * Check a payload against a single matcher.
   *
   * @param {Object} payload - Dexter embed payload
   * @param {DexterInteractiveEventMatcher} matcher - Matcher to test against
   * @param {string} text - Text extracted from the payload
   * @param {Object} metadata - Metadata extracted frfofm the payload
   * @return {bool} True if there's a match
   */
  checkEventAgainstMatcher(payload, matcher, text, metadata) {
    // Optional: if we're matching a particular type, check it first.
    if (matcher.type && matcher.type !== type) {
      this.emitDebug('Skipping matcher due to type mismatch', {payload, matcher});
      return false;
    }
    // If we have a message test, run that first
    if (matcher.text) {
      if (this.checkEventAgainstMessageTest(matcher.text, text)) {
        this.emitDebug('Matcher passed message test', {payload, matcher, test: matcher.message, message: text});
      } else {
        return false;
      }
    }
    // Then, if we have a metadata test and we've passed our message text, run it.
    if (matcher.meta) {
      if (this.checkEventAgainstMetadataTest(matcher.meta, matcher.metaPath, metadata)) {
        this.emitDebug('Matcher passed metadata test',
            {payload, matcher, test: matcher.meta, path: matcher.metaPath, metadata});
      } else {
        return false;
      }
    }
    return true;
  }

  /**
   * See if a message test passes
   *
   * @param {string|RegExp|Function} test - Test to run
   * @param {string} message - Message text to test
   * @return {bool} True if the test passes
   */
  checkEventAgainstMessageTest(test, message) {
    if (test instanceof RegExp) {
      // If we have a RegExp test, see if the string passes
      if (test.test(message)) {
        return true;
      } else {
        this.emitDebug('Skipping matcher due to message RegExp test mismatch'
            , {test, message});
        return false;
      }
    } else if (isString(test)) {
      // If we have a plain message test, see if it exists in the message
      if (message.indexOf(test) >= 0) {
        return true;
      } else {
        this.emitDebug('Skipping matcher due to message text test mismatch'
            , {test, message});
        return false;
      }
    } else if (isFunction(test)) {
      // If we have a function message test, see if it fails
      if (test(message)) {
        return true;
      } else {
        this.emitDebug('Skipping matcher due to message function test mismatch'
            , {test, message});
        return false;
      }
    } else {
      this.emitWarn('Skipping matcher due to unknown test type'
          , {test, message});
      return false;
    }
  }

  /**
   * See if a metadata test passes
   *
   * @param {string|RegExp|Function} test - Test to run
   * @param {string|Array} path - Path to the proper metadata value
   * @param {Array} metadata - Metadata from the event
   * @return {bool} True if the test passes
   */
  checkEventAgainstMetadataTest(test, path, metadata) {
    const value = get(metadata, path);
    if (test instanceof RegExp) {
      // If we have a text RegExp, make sure the value is a string
      if (typeof value !== 'string') {
        this.emitDebug('Skipping matcher due to a non-string value in a RegExp test');
        return false;
      }
      // ...then see if the string passes
      if (test.test(value)) {
        return true;
      } else {
        this.emitDebug('Skipping matcher due to metadata RegExp test mismatch'
            , {test, path, value});
        return false;
      }
    } else if (isFunction(test)) {
      if (test(value)) {
        return true;
      } else {
        // If we have a function message test, see if it fails
        this.emitDebug('Skipping matcher due to metadata function test mismatch'
            , {test, path, value});
        return false;
      }
    } else if (test === value) {
      // If we have anything else, check for equality.
      return true;
    } else {
      this.emitDebug('Skipping matcher due to metadata value test mismatch'
          , {test, path, value});
      return false;
    }
  }

  /**
   * Check the configured rules to find a match for a payload and execute the discovered handler.
   *
   * @param {Object} payload - Dexter embed payload
   */
  handleEventWithRules(payload) {
    const type = this.extractPayloadType(payload)
      , text = this.extractPayloadText(payload) || ''
      , metadata = this.extractPayloadMetadata(payload)
      , firstMatch = this.cfg.handler.find((matcher) => this.checkEventAgainstMatcher(payload, matcher, text, metadata))
    ;
    if (firstMatch) {
      firstMatch.onMatch(type, text, metadata, payload);
    } else {
      this.emitInfo('Failed to find a match', {type, text, metadata, payload});
    }
  }
  /**
   * Pull the payload type (a PAYLOAD_TYPE constant) from the payload.
   *
   * @param {Object} payload - Dexter embed payload
   * @return {string} A PAYLOAD_TYPE constant
   */
  extractPayloadType(payload) {
    return payload.type;
  }

  /**
   * Pull the payload text from the payload.
   *
   * @param {Object} payload - Dexter embed payload
   * @return {string} Message text
   */
  extractPayloadText(payload) {
    return payload.text;
  }

  /**
   * Pull ALL the metadata from the payload.
   *
   * @param {Object} payload - Dexter embed payload
   * @return {Array<Object>} Zero or more metadata objects from ^metadata shortcodes
   */
  extractPayloadMetadata(payload) {
    let found = get(payload, 'attachments.metadata');
    found = found instanceof Array
      ? found.map((o) => o.metadata)
      : []
    ;

    return found;
  }

  /**
   * Internal handler for the embed tool that tracks its open state.
   */
  onEmbedOpen() {
    this.embedIsOpen = true;
  }

  /**
   * Internal handler for the embed tool that tracks its open state.
   */
  onEmbedClose() {
    this.embedIsOpen = false;
  }

  /**
   * Check to see if the embed is fullscreened (usually in phone-sized browser windows)
   *
   * @return {bool} True if the bot is currently fullscreened
   */
  isEmbedFullscreen() {
    // This will eventually be updated with reporting directly from the embed - copy this logic
    // elsewhere at your own risk.
    return window.innerWidth < 600;
  }
}

/**
 * Perform all the necessary wireup for an interactive bot.
 *
 * @param {DexterInteractiveEventsConfig} cfg - Configuration for the interactive bot
 * @return {DexterInteractiveEvents} Configured Dexter interactive bot instance
 */
export function createInteractiveBot(cfg) {
  const botSettings = {};
  let eventHandler = null
    , dexterScriptTag = null
  ;
  // Make sure we have a config object
  if (!isObject(cfg)) {
    throw new Error('createInteractiveBot is missing a config object');
    return;
  }
  // Make sure we have the dexterSettings we need
  if (!isObject(cfg.dexterSettings)) {
    throw new Error('dexterSettings configuration property is required');
  }
  if (!cfg.dexterSettings.botId) {
    throw new Error('Missing dexterSettings.botId in your config');
  }
  // Build a config for the embed script
  Object.assign(botSettings, cfg.dexterSettings);
  eventHandler = new DexterInteractiveEvents(cfg);
  // Honor any existing event handlers as well as our new event system
  botSettings.onOpen = () => {
    eventHandler.onEmbedOpen();
    isFunction(cfg.dexterSettings.onOpen) && cfg.dexterSettings.onOpen();
  };
  botSettings.onClose = () => {
    eventHandler.onEmbedClose();
    isFunction(cfg.dexterSettings.onClose) && cfg.dexterSettings.onClose();
  };
  botSettings.onMessage = (payload) => {
    eventHandler.handleEvent(payload);
    isFunction(cfg.dexterSettings.onMessage) && cfg.dexterSettings.onMessage(payload);
  };
  // Load up and run our bot with our newly bound config
  window.dexterSettings = botSettings;
  dexterScriptTag = document.createElement('script');
  dexterScriptTag.type = 'text/javascript';
  dexterScriptTag.src = dexterSettings.url || 'https://rundexter.com/webwidget';
  document.getElementsByTagName('head')[0].appendChild(dexterScriptTag);
  return eventHandler;
}
