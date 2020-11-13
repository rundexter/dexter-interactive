import {
  DexterInteractiveEvents
  , createInteractiveBot
  , LOG_LEVEL_DEBUG
  , PAYLOAD_TYPE_BOT
  , PAYLOAD_TYPE_USER
} from '../../src/index';

describe('DexterInteractiveEvents', () => {
  describe('#constructor()', () => {
    test('fails without a config object', () => {
      const msg = /missing a config/;
      expect(() => new DexterInteractiveEvents()).toThrowError(msg);
      expect(() => new DexterInteractiveEvents(null)).toThrowError(msg);
      expect(() => new DexterInteractiveEvents(undefined)).toThrowError(msg);
      expect(() => new DexterInteractiveEvents('foo')).toThrowError(msg);
      expect(() => new DexterInteractiveEvents(1)).toThrowError(msg);
    });
    test('fails without a valid handler', () => {
      const msg = /requires a handler/;
      expect(() => new DexterInteractiveEvents({})).toThrowError(msg);
      expect(() => new DexterInteractiveEvents({handler: null})).toThrowError(msg);
      expect(() => new DexterInteractiveEvents({handler: undefined})).toThrowError(msg);
      expect(() => new DexterInteractiveEvents({handler: 'foo'})).toThrowError(msg);
      expect(() => new DexterInteractiveEvents({handler: 1})).toThrowError(msg);
    });
  });

  describe('#emitLog()', () => {
    test('routes to the default logger when cfg.logger is true', () => {
      const interactive = new DexterInteractiveEvents({handler: [], logger: true});
      interactive.emitLogDefault = jest.fn();
      interactive.emitLog(LOG_LEVEL_DEBUG, 'foo');
      expect(interactive.emitLogDefault).toHaveBeenCalled();
    });
    test('routes to a configured handler', () => {
      const logger = jest.fn()
        , interactive = new DexterInteractiveEvents({handler: [], logger})
      ;
      interactive.emitLog(LOG_LEVEL_DEBUG, 'foo');
      expect(logger).toHaveBeenCalled();
    });
    test('does not route when cfg.logger is false', () => {
      const interactive = new DexterInteractiveEvents({handler: [], logger: false});
      interactive.emitLogDefault = jest.fn();
      interactive.emitLog(LOG_LEVEL_DEBUG, 'foo');
      expect(interactive.emitLogDefault).not.toHaveBeenCalled();
    });
  });

  describe('#handleEvent()', () => {
    test('skips events when closed if so configured', () => {
      const handler = jest.fn()
        , interactive = new DexterInteractiveEvents({handler, handleWhenClosed: false, handleBotEvents: true})
      ;
      interactive.embedIsOpen = false;
      interactive.handleEvent({type: PAYLOAD_TYPE_BOT});
      expect(handler).not.toHaveBeenCalled();
    });
    test('routes events when closed if so configured', () => {
      const handler = jest.fn()
        , interactive = new DexterInteractiveEvents({handler, handleWhenClosed: true, handleBotEvents: true})
      ;
      interactive.embedIsOpen = false;
      interactive.handleEvent({type: PAYLOAD_TYPE_BOT});
      expect(handler).toHaveBeenCalled();
    });
    test('skips bot events if so configured', () => {
      const handler = jest.fn()
        , interactive = new DexterInteractiveEvents({handler, handleBotEvents: false})
      ;
      interactive.handleEvent({type: PAYLOAD_TYPE_BOT});
      expect(handler).not.toHaveBeenCalled();
    });
    test('routes bot events if so configured', () => {
      const handler = jest.fn()
        , interactive = new DexterInteractiveEvents({handler, handleWhenClosed: true, handleBotEvents: true})
      ;
      interactive.handleEvent({type: PAYLOAD_TYPE_BOT});
      expect(handler).toHaveBeenCalled();
    });
    test('skips user events if so configured', () => {
      const handler = jest.fn()
        , interactive = new DexterInteractiveEvents({handler, handleWhenClosed: true, handleUserEvents: false})
      ;
      interactive.handleEvent({type: PAYLOAD_TYPE_USER});
      expect(handler).not.toHaveBeenCalled();
    });
    test('routes user events if so configured', () => {
      const handler = jest.fn()
        , interactive = new DexterInteractiveEvents({handler, handleWhenClosed: true, handleUserEvents: true})
      ;
      interactive.handleEvent({type: PAYLOAD_TYPE_USER});
      expect(handler).toHaveBeenCalled();
    });
    test('routes events to function handlers if so configured', () => {
      const functionHandler = jest.fn()
        , interactive = new DexterInteractiveEvents({handler: () => {}, handleWhenClosed: true})
      ;
      interactive.handleEventWithFunction = functionHandler;
      interactive.handleEvent({type: PAYLOAD_TYPE_BOT});
      expect(functionHandler).toHaveBeenCalled();
    });
    test('routes events to rules handlers if so configured', () => {
      const functionHandler = jest.fn()
        , interactive = new DexterInteractiveEvents({handler: [], handleWhenClosed: true})
      ;
      interactive.handleEventWithRules = functionHandler;
      interactive.handleEvent({type: PAYLOAD_TYPE_BOT});
      expect(functionHandler).toHaveBeenCalled();
    });
  });

  describe('#handleEventWithFunction()', () => {
    test('extracts relevant data from an event and passes it to the user function', () => {
      const handler = jest.fn()
        , interactive = new DexterInteractiveEvents({handler, handleWhenClosed: true})
        , payload = {
          type: PAYLOAD_TYPE_BOT
          , text: 'Hello world'
          , attachments: {
            metadata: [{metadata: {foo: 'bar'}}]
          }
        }
      ;
      interactive.handleEventWithFunction(payload);
      expect(handler).toHaveBeenCalledWith(PAYLOAD_TYPE_BOT, 'Hello world', [{foo: 'bar'}], payload);
    });
  });

  describe('#handleEventWithRules()', () => {
    let handler, payload;
    /**
     * Collapse the metadata like we do in the library.
     *
     * @param {Object} payload - Payload to collapse
     * @return {Array} Array of actual metadata
     */
    function getReportedMetadata(payload) {
      return payload.attachments.metadata.map((metadata) => metadata.metadata);
    }
    beforeEach(() => {
      // Set up all the data we need up front and remove it as necessary from individual tests.
      handler = [
        {text: /foo/i, onMatch: jest.fn()}
        , {text: 'bar', onMatch: jest.fn()}
        , {text: (message) => message.indexOf('complicated') >= 0, onMatch: jest.fn()}
        , {metaPath: '0.a.0', meta: 'a', onMatch: jest.fn()}
        , {metaPath: '1.b.1', meta: 'b', onMatch: jest.fn()}
        , {metaPath: '2.c', meta: (value) => value && value.indexOf('complicated') >= 0, onMatch: jest.fn()}
        , {metaPath: '3.d', meta: /a{3,}/, onMatch: jest.fn()}
      ];
      payload = {
        type: PAYLOAD_TYPE_BOT
        , text: 'Hello baz'
        , attachments: {
          metadata: [
            {metadata: {a: ['x']}}
            , {metadata: {b: ['x', 'b']}}
            , {metadata: {c: 'Something complicated'}}
            , {metadata: {d: 'Aaaaaaah!'}}
          ]
        }
      };
    });
    test('matches plain text in a message', () => {
      const interactive = new DexterInteractiveEvents({handler, handleWhenClosed: true});
      payload.text = 'Hello bar';
      interactive.handleEventWithRules(payload);
      expect(handler[1].onMatch).toHaveBeenCalledWith(
          PAYLOAD_TYPE_BOT, 'Hello bar', getReportedMetadata(payload), payload);
    });
    test('matches message text against a regexp', () => {
      const interactive = new DexterInteractiveEvents({handler, handleWhenClosed: true});
      payload.text = 'Hello Foo';
      interactive.handleEventWithRules(payload);
      expect(handler[0].onMatch).toHaveBeenCalledWith(
          PAYLOAD_TYPE_BOT, 'Hello Foo', getReportedMetadata(payload), payload);
    });
    test('matches message text against a function', () => {
      const interactive = new DexterInteractiveEvents({handler, handleWhenClosed: true});
      payload.text = 'Something complicated';
      interactive.handleEventWithRules(payload);
      expect(handler[2].onMatch).toHaveBeenCalledWith(
          PAYLOAD_TYPE_BOT, 'Something complicated', getReportedMetadata(payload), payload);
    });
    test('matches a metadata value', () => {
      const interactive = new DexterInteractiveEvents({handler, handleWhenClosed: true});
      interactive.handleEventWithRules(payload);
      expect(handler[4].onMatch).toHaveBeenCalledWith(
          PAYLOAD_TYPE_BOT, 'Hello baz', getReportedMetadata(payload), payload);
    });
    test('matches a metadata value against a function', () => {
      const interactive = new DexterInteractiveEvents({handler, handleWhenClosed: true});
      payload.attachments.metadata[1] = {};
      interactive.handleEventWithRules(payload);
      expect(handler[5].onMatch).toHaveBeenCalledWith(
          PAYLOAD_TYPE_BOT, 'Hello baz', getReportedMetadata(payload), payload);
    });
    test('matches a metadata value against a regexp', () => {
      const interactive = new DexterInteractiveEvents({handler, handleWhenClosed: true});
      payload.attachments.metadata[1] = {};
      payload.attachments.metadata[2] = {};
      interactive.handleEventWithRules(payload);
      expect(handler[6].onMatch).toHaveBeenCalledWith(
          PAYLOAD_TYPE_BOT, 'Hello baz', getReportedMetadata(payload), payload);
    });
    test('exits safely without a match', () => {
      const interactive = new DexterInteractiveEvents({handler, handleWhenClosed: true});
      payload.attachments = {};
      interactive.handleEventWithRules(payload);
      handler.forEach((rule) => {
        expect(rule.onMatch).not.toHaveBeenCalled();
      });
    });
  });
});

describe('createInterativeBot', () => {
  test('fails without a config object', () => {
    const msg = /missing a config/;
    expect(() => createInteractiveBot()).toThrowError(msg);
    expect(() => createInteractiveBot(null)).toThrowError(msg);
    expect(() => createInteractiveBot(undefined)).toThrowError(msg);
    expect(() => createInteractiveBot('foo')).toThrowError(msg);
    expect(() => createInteractiveBot(1)).toThrowError(msg);
  });
  test('fails without mandatory dexterSettings', () => {
    expect(() => createInteractiveBot({})).toThrowError(/dexterSettings configuration/);
    expect(() => createInteractiveBot({dexterSettings: {}})).toThrowError(/dexterSettings\.botId/);
  });
  test('events configured in dexterSettings are honored', () => {
    const cfg = {
        dexterSettings: {
          botId: 'abc123'
          , onOpen: jest.fn()
          , onClose: jest.fn()
          , onMessage: jest.fn()
        }
        , handler: []
      }
      , interactive = createInteractiveBot(cfg)
    ;
    expect(window.dexterSettings).toBeDefined();
    expect(window.dexterSettings.onOpen).toBeDefined();
    window.dexterSettings.onOpen();
    expect(cfg.dexterSettings.onOpen).toHaveBeenCalled();
    expect(interactive.embedIsOpen).toBeTruthy();
    window.dexterSettings.onClose();
    expect(cfg.dexterSettings.onClose).toHaveBeenCalled();
    expect(interactive.embedIsOpen).toBeFalsy();
    window.dexterSettings.onMessage({type: PAYLOAD_TYPE_BOT, text: 'Foo'});
    expect(cfg.dexterSettings.onMessage).toHaveBeenCalled();
  });
});
