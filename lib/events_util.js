'use strict';

const {
  ArrayPrototypePush,
  Boolean,
  Error,
  ErrorCaptureStackTrace,
  MathMin,
  NumberIsNaN,
  ObjectCreate,
  ObjectDefineProperty,
  ObjectDefineProperties,
  ObjectGetPrototypeOf,
  ObjectSetPrototypeOf,
  Promise,
  PromiseReject,
  PromiseResolve,
  ReflectApply,
  ReflectOwnKeys,
  String,
  Symbol,
  SymbolFor,
  SymbolAsyncIterator
} = primordials;

const kRejection = SymbolFor('nodejs.rejection');

const {
  hideStackFrames,
  kEnhanceStackBeforeInspector,
  codes
} = require('internal/errors');
const {
  ERR_INVALID_ARG_TYPE,
  ERR_OUT_OF_RANGE,
  ERR_UNHANDLED_ERROR
} = codes;

const {
  inspect
} = require('internal/util/inspect');

const {
  validateAbortSignal
} = require('internal/validators');

const kCapture = Symbol('kCapture');
const kErrorMonitor = Symbol('events.errorMonitor');
const kMaxEventTargetListeners = Symbol('events.maxEventTargetListeners');
const kMaxEventTargetListenersWarned =  Symbol('events.maxEventTargetListenersWarned');
const AsyncIteratorPrototype = ObjectGetPrototypeOf(ObjectGetPrototypeOf(async function* () {}).prototype);


let DOMException;
const lazyDOMException = hideStackFrames((message, name) => {
  if (DOMException === undefined)
    DOMException = internalBinding('messaging').DOMException;
  return new DOMException(message, name);
});

let spliceOne;
// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
let defaultMaxListeners = 10;
let isEventTarget;


function checkListener(listener) {
  if (typeof listener !== 'function') {
    throw new ERR_INVALID_ARG_TYPE('listener', 'Function', listener);
  }
}

function _getMaxListeners(that,cls) {
  if (that._maxListeners === undefined)
    return cls.defaultMaxListeners;
  return that._maxListeners;
}



function identicalSequenceRange(a, b) {
  //> identicalSequenceRange('@@@abcde',`b\nc\nabcde\n`)
  //[ 5, 3 ]
  //@@@abcde  abcde length:5
  //   |
  //   3  

  // Returns the length and line number of the first sequence of `a` that fully
  // appears in `b` with a length of at least 4.
  for (let i = 0; i < a.length - 3; i++) {
    // Find the first entry of b that matches the current entry of a.
    const pos = b.indexOf(a[i]);
    if (pos !== -1) {
      const rest = b.length - pos;
      if (rest > 3) {
        let len = 1;
        const maxLen = MathMin(a.length - i, rest);
        // Count the number of consecutive entries.
        while (maxLen > len && a[i + len] === b[pos + len]) {
          len++;
        }
        if (len > 3) {
          return [len, i];
        }
      }
    }
  }
  return [0, 0];
}


function arrayClone(arr) {
  // At least since V8 8.3, this implementation is faster than the previous
  // which always used a simple for-loop
  switch (arr.length) {
    case 2: return [arr[0], arr[1]];
    case 3: return [arr[0], arr[1], arr[2]];
    case 4: return [arr[0], arr[1], arr[2], arr[3]];
    case 5: return [arr[0], arr[1], arr[2], arr[3], arr[4]];
    case 6: return [arr[0], arr[1], arr[2], arr[3], arr[4], arr[5]];
  }
  return arr.slice();
}

function defineCaptureRejections(cls) {
    ObjectDefineProperty(cls, 'captureRejections', {
      get() {return cls.prototype[kCapture];},
      set(value) {
        if (typeof value !== 'boolean') {
          throw new ERR_INVALID_ARG_TYPE(
              'cls.captureRejections',
              'boolean', 
              value
           );
        }
        cls.prototype[kCapture] = value;
      },
      enumerable: true
    });
}

function defineDefaultMaxListeners(cls,defaultMaxListeners) {
    ObjectDefineProperty(cls, 'defaultMaxListeners', {
      enumerable: true,
      get: function() {return defaultMaxListeners;},
      set: function(arg) {
        if (typeof arg !== 'number' || arg < 0 || NumberIsNaN(arg)) {
          throw new ERR_OUT_OF_RANGE('defaultMaxListeners',
                                     'a non-negative number',
                                     arg);
        }
        defaultMaxListeners = arg;
      }
    });
}

function defineMaxEventTargetListeners(cls) {
    ObjectDefineProperties(cls, {
      kMaxEventTargetListeners: {
        value: kMaxEventTargetListeners,
        enumerable: false,
        configurable: false,
        writable: false,
      },
      kMaxEventTargetListenersWarned: {
        value: kMaxEventTargetListenersWarned,
        enumerable: false,
        configurable: false,
        writable: false,
      }
    });
}


function defineProperty(cls) {
    // Backwards-compat with node 0.10.x
    cls.EventEmitter = cls;
    cls.usingDomains = false;
    cls.captureRejectionSymbol = kRejection;
    cls.errorMonitor = kErrorMonitor;
    defineCaptureRejections(cls);
    defineDefaultMaxListeners(cls,defaultMaxListeners);
    defineMaxEventTargetListeners(cls);
}




function definePrototypeProperty(cls) {
    // The default for captureRejections is false
    ObjectDefineProperty(cls.prototype, kCapture, {
      value: false,
      writable: true,
      enumerable: false
    });
    cls.prototype._events = undefined;
    cls.prototype._eventsCount = 0;
    cls.prototype._maxListeners = undefined;
}

function setMaxListeners(n = defaultMaxListeners, ...eventTargets) {
    if (typeof n !== 'number' || n < 0 || NumberIsNaN(n))
      throw new ERR_OUT_OF_RANGE('n', 'a non-negative number', n);
    if (eventTargets.length === 0) {
      defaultMaxListeners = n;
    } else {
      if (isEventTarget === undefined)
        isEventTarget = require('internal/event_target').isEventTarget;
      // Performance for forEach is now comparable with regular for-loop
      eventTargets.forEach((target) => {
        if (isEventTarget(target)) {
          target[kMaxEventTargetListeners] = n;
          target[kMaxEventTargetListenersWarned] = false;
        } else if (typeof target.setMaxListeners === 'function') {
          target.setMaxListeners(n);
        } else {
          throw new ERR_INVALID_ARG_TYPE(
            'eventTargets',
            ['EventEmitter', 'EventTarget'],
            target);
        }
      });
    }
}

function construct(cls,that,opts) {
    if (that._events === undefined ||
        that._events === ObjectGetPrototypeOf(that)._events) {
      that._events = ObjectCreate(null);
      that._eventsCount = 0;
    }
    that._maxListeners = that._maxListeners || undefined;
    if (opts && opts.captureRejections) {
      if (typeof opts.captureRejections !== 'boolean') {
        throw new ERR_INVALID_ARG_TYPE('options.captureRejections',
                                       'boolean', opts.captureRejections);
      }
      that[kCapture] = Boolean(opts.captureRejections);
    } else {
      // Assigning the kCapture property directly saves an expensive
      // prototype lookup in a very sensitive hot path.
      that[kCapture] = cls.prototype[kCapture];
    }
};

function emitUnhandledRejectionOrErr(ee, err, type, args) {
  if (typeof ee[kRejection] === 'function') {
    ee[kRejection](err, type, ...args);
  } else {
    // We have to disable the capture rejections mechanism, otherwise
    // we might end up in an infinite loop.
    const prev = ee[kCapture];
    // If the error handler throws, it is not catcheable and it
    // will end up in 'uncaughtException'. We restore the previous
    // value of kCapture in case the uncaughtException is present
    // and the exception is handled.
    try {
      ee[kCapture] = false;
      ee.emit('error', err);
    } finally {
      ee[kCapture] = prev;
    }
  }
}


function addCatch(that, promise, type, args) {
  if (!that[kCapture]) {
    return;
  }
  // Handle Promises/A+ spec, then could be a getter
  // that throws on second use.
  try {
    const then = promise.then;
    if (typeof then === 'function') {
      then.call(promise, undefined, function(err) {
        // The callback is called with nextTick to avoid a follow-up
        // rejection from this promise.
        process.nextTick(emitUnhandledRejectionOrErr, that, err, type, args);
      });
    }
  } catch (err) {
    that.emit('error', err);
  }
}

function enhanceStackTrace(that,err, own) {
  let ctorInfo = '';
  try {
    const { name } = that.constructor;
    if (name !== 'EventEmitter')
      ctorInfo = ` on ${name} instance`;
  } catch {}
  const sep = `\nEmitted 'error' event${ctorInfo} at:\n`;
  const errStack = err.stack.split('\n').slice(1);
  const ownStack = own.stack.split('\n').slice(1);
  const [ len, off ] = identicalSequenceRange(ownStack, errStack);
  if (len > 0) {
    ownStack.splice(off + 1, len - 2,'    [... lines matching original stack trace ...]');
  }
  return err.stack + sep + ownStack.join('\n');
}


function checkDoError(that,type,args) {
    let rtrn = undefined;
    let doError = (type === 'error');
    const events = that._events;
    if (events !== undefined) {
      if (doError && events[kErrorMonitor] !== undefined){
        that.emit(kErrorMonitor, ...args);
      }
      doError = (doError && events.error === undefined);
    } else if (!doError) {
       rtrn = false
    }
    return({
        doError,
        rtrn,
    })
}

function handleDoError(cls,args) {
    let er;
    if (args.length > 0) {er = args[0];}
    if (er instanceof Error) {
      try {
        const capture = {};
        ErrorCaptureStackTrace(capture, cls.prototype.emit);
        ObjectDefineProperty(er, kEnhanceStackBeforeInspector, {
          value: enhanceStackTrace(this, er, capture),
          configurable: true
        });
      } catch {}
      // Note: The comments on the `throw` lines are intentional, they show
      // up in Node's output if this results in an unhandled exception.
      throw er; // Unhandled 'error' event
    }
    let stringifiedEr;
    const { inspect } = require('internal/util/inspect');
    try {
      stringifiedEr = inspect(er);
    } catch {
      stringifiedEr = er;
    }
    // At least give some kind of context to the user
    const err = new ERR_UNHANDLED_ERROR(stringifiedEr);
    err.context = er;
    throw err; // Unhandled 'error' event
}



function applyListeners(that,type,args) {
  const events = that._events;
  const handler = events[type];
  if (handler === undefined) {return false;}
  if (typeof handler === 'function') {
    const result = ReflectApply(handler, that, args);
    if (result !== undefined && result !== null) {
      addCatch(that, result, type, args);
    }
  } else {
    const len = handler.length;
    const listeners = arrayClone(handler);
    for (let i = 0; i < len; ++i) {
      const result = ReflectApply(listeners[i], that, args);
      // This code is duplicated because extracting it away
      // would make it non-inlineable.
      if (result !== undefined && result !== null) {
        addCatch(this, result, type, args);
      }
    }
  }
}

function _emit(cls,that,type, ...args) {
    let {doError,rtrn} = checkDoError(that,type,args);
    if(rtrn!== undefined) {return(rtrn)} else {}
    if (doError) { handleDoError(cls,args)}
    applyListeners(that,type,args);
    return(true)
}

function setMaxListenersMethod(that,n) {
    //Set to zero for unlimited.
    if (typeof n !== 'number' || n < 0 || NumberIsNaN(n)) {
        throw new ERR_OUT_OF_RANGE('n', 'a non-negative number', n);
    }
    that._maxListeners = n
    return(that)
}

function checkForListenerLeak(target,existing,cls) {
    // Check for listener leak
    let m = _getMaxListeners(target,cls);
    if (m > 0 && existing.length > m && !existing.warned) {
      existing.warned = true;
      // No error code for this since it is a Warning
      // eslint-disable-next-line no-restricted-syntax
      const w = new Error('Possible EventEmitter memory leak detected. ' +
                          `${existing.length} ${String(type)} listeners ` +
                          `added to ${inspect(target, { depth: -1 })}. Use ` +
                          'emitter.setMaxListeners() to increase limit');
      w.name = 'MaxListenersExceededWarning';
      w.emitter = target;
      w.type = type;
      w.count = existing.length;
      process.emitWarning(w);
    }
}


function avoidRecursion(target,type,listener) {
    let events;
    let existing;
    events = target._events;
    if (events === undefined) {
      events = target._events = ObjectCreate(null);
      target._eventsCount = 0;
    } else {
      // To avoid recursion in the case that type === "newListener"! Before
      // adding it to the listeners, first emit "newListener".
      if (events.newListener !== undefined) {
        target.emit('newListener', type,listener.listener ? listener.listener : listener);
        // Re-assign `events` because a newListener handler could have caused the
        // this._events to be assigned to a new object
        events = target._events;
      }
      existing = events[type];
    }
    return({
        events,
        existing
    })
}

function handleExistingForAddListenerWhenOnlyOne(events,type,listener,target) {
    // Optimize the case of one listener. Don't need the extra array object.
    events[type] = listener;
    ++target._eventsCount;
}


function handleExistingForAddListener(existing,events,listener,type,prepend) {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
        prepend ? [listener, existing] : [existing, listener];
      // If we've already got an array, just append.
    } else if (prepend) {
      existing.unshift(listener);
    } else {
      existing.push(listener);
    }
    return({
        existing,
        events,
    })
}


function _addListener(target, type, listener, prepend,cls) {
  checkListener(listener);
  let {events,existing} = avoidRecursion(target,type,listener);
  if (existing === undefined) {
      handleExistingForAddListenerWhenOnlyOne(events,type,listener,target);
  } else {
      let d = handleExistingForAddListener(existing,events,listener,type,prepend);
      events = d.events;
      existing = d.existing;
      checkForListenerLeak(target,existing,cls);
  }
  return target;
}


function _removeListener(that,type, listener) {
    checkListener(listener);
    const events = that._events;
    if (events === undefined) {return that;}
    const list = events[type];
    if (list === undefined) {return that;}
    if (list === listener || list.listener === listener) {
        if (--that._eventsCount === 0)
          that._events = ObjectCreate(null);
        else {
          delete events[type];
          if (events.removeListener)
            that.emit('removeListener', type, list.listener || listener);
        }
    } else if (typeof list !== 'function') {
        let position = -1;
        for (let i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            position = i;
            break;
          }
        }
        if (position < 0) {return that;}
        if (position === 0) {
            list.shift();
        } else {
            if (spliceOne === undefined) { spliceOne = require('internal/util').spliceOne;} 
            spliceOne(list, position);
        }
        if (list.length === 1) {events[type] = list[0];}
        if (events.removeListener !== undefined) {that.emit('removeListener', type, listener);}
    }
    return that;
}


function _removeAllListeners(that,type) {
    const events = that._events;
    if (events === undefined) {return that;}
    // Not listening for removeListener, no need to emit
    if (events.removeListener === undefined) {
      if (arguments.length === 1) {
        that._events = ObjectCreate(null);
        that._eventsCount = 0;
      } else if (events[type] !== undefined) {
        if (--that._eventsCount === 0)
          that._events = ObjectCreate(null);
        else
          delete events[type];
      }
      return that;
    }
    // Emit removeListener for all listeners on all events
    if (arguments.length === 1) {
      for (const key of ReflectOwnKeys(events)) {
        if (key === 'removeListener') continue;
        that.removeAllListeners(key);
      }
      that.removeAllListeners('removeListener');
      that._events = ObjectCreate(null);
      that._eventsCount = 0;
      return that;
    }
    const listeners = events[type];
    if (typeof listeners === 'function') {
      that.removeListener(type, listeners);
    } else if (listeners !== undefined) {
      // LIFO order
      for (let i = listeners.length - 1; i >= 0; i--) {
        that.removeListener(type, listeners[i]);
      }
    }
    return that;
}



function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    if (arguments.length === 0)
      return this.listener.call(this.target);
    return this.listener.apply(this.target, arguments);
  }
}

function _onceWrap(target, type, listener) {
  const state = { fired: false, wrapFn: undefined, target, type, listener };
  const wrapped = onceWrapper.bind(state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

function unwrapListeners(arr) {
  const ret = arrayClone(arr);
  for (let i = 0; i < ret.length; ++i) {
    const orig = ret[i].listener;
    if (typeof orig === 'function')
      ret[i] = orig;
  }
  return ret;
}



function _listeners(target, type, unwrap) {
  const events = target._events;
  if (events === undefined)
    return [];
  const evlistener = events[type];
  if (evlistener === undefined)
    return [];
  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];
  return unwrap ?
    unwrapListeners(evlistener) : arrayClone(evlistener);
}

function getEventListeners(emitterOrTarget, type) {
  // First check if EventEmitter
  if (typeof emitterOrTarget.listeners === 'function') {
    return emitterOrTarget.listeners(type);
  }
  // Require event target lazily to avoid always loading it
  const { isEventTarget, kEvents } = require('internal/event_target');
  if (isEventTarget(emitterOrTarget)) {
    const root = emitterOrTarget[kEvents].get(type);
    const listeners = [];
    let handler = root?.next;
    while (handler?.listener !== undefined) {
      ArrayPrototypePush(listeners, handler.listener);
      handler = handler.next;
    }
    return listeners;
  }
  throw new ERR_INVALID_ARG_TYPE('emitter',
                                 ['EventEmitter', 'EventTarget'],
                                 emitterOrTarget);
}



function listenerCount(type) {
  const events = this._events;
  if (events !== undefined) {
    const evlistener = events[type];
    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener !== undefined) {
      return evlistener.length;
    }
  }
  return 0;
}

////
async function once(emitter, name, options = {}) {
    const signal = options ? options.signal : undefined;
    validateAbortSignal(signal, 'options.signal');
    if (signal && signal.aborted) {
        throw lazyDOMException('The operation was aborted', 'AbortError');
    }
    let p = new Promise((resolve, reject) => {
        function abortListener() {
          eventTargetAgnosticRemoveListener(emitter, name, resolver);
          eventTargetAgnosticRemoveListener(emitter, 'error', resolver);
          reject(lazyDOMException('The operation was aborted', 'AbortError'));
        }
        ////
        const resolver = (...args) => {
          if (typeof emitter.removeListener === 'function') {
            emitter.removeListener('error', errorListener);
          }
          if (signal != null) {
            eventTargetAgnosticRemoveListener(signal, 'abort', abortListener);
          }
          resolve(args);
        };
        ////
        const errorListener = (err) => {
          emitter.removeListener(name, resolver);
          if (signal != null) {
            eventTargetAgnosticRemoveListener(signal, 'abort', abortListener);
          }
          reject(err);
        };
        ////
        eventTargetAgnosticAddListener(emitter, name, resolver, { once: true });
        if (name !== 'error' && typeof emitter.once === 'function') {
            emitter.once('error', errorListener);
        }
        ////
        if (signal != null) {
            eventTargetAgnosticAddListener(signal, 'abort', abortListener, { once: true })
        }
    })
    return(p)
}

function createIterResult(value, done) {return { value, done };}

function eventTargetAgnosticRemoveListener(emitter, name, listener, flags) {
  if (typeof emitter.removeListener === 'function') {
    emitter.removeListener(name, listener);
  } else if (typeof emitter.removeEventListener === 'function') {
    emitter.removeEventListener(name, listener, flags);
  } else {
    throw new ERR_INVALID_ARG_TYPE('emitter', 'EventEmitter', emitter);
  }
}

function eventTargetAgnosticAddListener(emitter, name, listener, flags) {
  if (typeof emitter.on === 'function') {
    if (flags && flags.once) {
      emitter.once(name, listener);
    } else {
      emitter.on(name, listener);
    }
  } else if (typeof emitter.addEventListener === 'function') {
    // EventTarget does not have `error` event semantics like Node
    // EventEmitters, we do not listen to `error` events here.
    emitter.addEventListener(name, (arg) => { listener(arg); }, flags);
  } else {
    throw new ERR_INVALID_ARG_TYPE('emitter', 'EventEmitter', emitter);
  }
}


function on(emitter, event, options) {
    const { signal } = { ...options };
    validateAbortSignal(signal, 'options.signal');
    if (signal && signal.aborted) {
      throw lazyDOMException('The operation was aborted', 'AbortError');
    }
    const unconsumedEvents = [];
    const unconsumedPromises = [];
    let error = null;
    let finished = false;
    ////
    function eventHandler(...args) {
      const promise = unconsumedPromises.shift();
      if (promise) {
        promise.resolve(createIterResult(args, false));
      } else {
        unconsumedEvents.push(args);
      }
    }
    function abortListener() {
      errorHandler(lazyDOMException('The operation was aborted', 'AbortError'));
    }
    let iterator;
    function errorHandler(err) {
        finished = true;
        const toError = unconsumedPromises.shift();
        if (toError) {
          toError.reject(err);
        } else {
          // The next time we call next()
          error = err;
        }
        iterator.return();
    }
    ////
    iterator = ObjectSetPrototypeOf({
        next() {
            const value = unconsumedEvents.shift();
            if (value) {
              return PromiseResolve(createIterResult(value, false));
            }
            if (error) {
              const p = PromiseReject(error);
              // Only the first element errors
              error = null;
              return p;
            }
            if (finished) {
              return PromiseResolve(createIterResult(undefined, true));
            }
            return new Promise(function(resolve, reject) {
              unconsumedPromises.push({ resolve, reject });
            });
        },
        return() {
            eventTargetAgnosticRemoveListener(emitter, event, eventHandler);
            eventTargetAgnosticRemoveListener(emitter, 'error', errorHandler);
            if (signal) {
                eventTargetAgnosticRemoveListener(
                  signal,
                  'abort',
                  abortListener,
                  { once: true }
                );
            }
            finished = true;
            for (const promise of unconsumedPromises) {
                  promise.resolve(createIterResult(undefined, true));
            }
            return PromiseResolve(createIterResult(undefined, true));
        },
        throw(err) {
            if (!err || !(err instanceof Error)) {
                throw new ERR_INVALID_ARG_TYPE('EventEmitter.AsyncIterator','Error', err);
                error = err;
                eventTargetAgnosticRemoveListener(emitter, event, eventHandler);
                eventTargetAgnosticRemoveListener(emitter, 'error', errorHandler);
            }
        },
        [SymbolAsyncIterator]() {return this;}
    },AsyncIteratorPrototype);
    ////
    eventTargetAgnosticAddListener(emitter, event, eventHandler);
    if (event !== 'error' && typeof emitter.on === 'function') {
        emitter.on('error', errorHandler);
    }
    if (signal) {
        eventTargetAgnosticAddListener(signal,'abort',abortListener,{ once: true })
    }
    return iterator;
}



module.exports = {
    kRejection,
    kCapture,
    kErrorMonitor,
    kMaxEventTargetListeners,
    kMaxEventTargetListenersWarned,
    AsyncIteratorPrototype,
    lazyDOMException,
    ////
    DOMException,
    spliceOne,
    defaultMaxListeners,
    isEventTarget,
    ////
    checkListener,
    _getMaxListeners,
    identicalSequenceRange,
    arrayClone,
    defineCaptureRejections,
    defineDefaultMaxListeners,
    defineMaxEventTargetListeners,
    defineProperty,
    definePrototypeProperty,
    setMaxListeners,
    construct,
    emitUnhandledRejectionOrErr,
    addCatch,
    enhanceStackTrace,
    checkDoError,
    handleDoError,
    applyListeners,
    _emit,
    setMaxListenersMethod,
    checkForListenerLeak,
    avoidRecursion,
    handleExistingForAddListenerWhenOnlyOne,
    handleExistingForAddListener,
    _addListener,
    _removeListener,
    _removeAllListeners,
    onceWrapper,
    _onceWrap,
    unwrapListeners,
    _listeners,
    getEventListeners,
    listenerCount,
    createIterResult,
    eventTargetAgnosticRemoveListener,
    eventTargetAgnosticAddListener,
    on,
    ////
}



