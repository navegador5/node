'use strict';

const {
  ReflectOwnKeys,
} = primordials;

const {
    defineProperty,
    definePrototypeProperty,
    setMaxListeners,
    construct,
    listenerCount,
    setMaxListenersMethod,
    _getMaxListeners,
    _emit,
    _addListener,
    checkListener,
    _onceWrap,
    _removeListener,
    _removeAllListeners,
    _listeners,
    once,
    on,
    getEventListeners,
} = require("events_util");


function EventEmitter(opts) {construct(EventEmitter,this,opts)}

function factorize() {
    //static property
    defineProperty(EventEmitter);
    //property
    definePrototypeProperty(EventEmitter);
    //static methods
    EventEmitter.setMaxListeners = setMaxListeners;
    EventEmitter.init = construct;
    EventEmitter.listenerCount = function(emitter, type) {
        if (typeof emitter.listenerCount === 'function') {
           return emitter.listenerCount(type);
        }
        return listenerCount.call(emitter, type);
    };
    //methods
    EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
        return(setMaxListenersMethod(this,n))
    }
    EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
        return _getMaxListeners(this,EventEmitter)
    }
    EventEmitter.prototype.emit = function emit(type, ...args) {
        return(_emit(EventEmitter,this,type,...args))
    }
    EventEmitter.prototype.addListener = function addListener(type, listener) {
        return _addListener(this, type, listener, false,EventEmitter);
    };
    EventEmitter.prototype.on = EventEmitter.prototype.addListener;
    EventEmitter.prototype.prependListener = function prependListener(type, listener) {
          return _addListener(this, type, listener, true,EventEmitter);
    };
    EventEmitter.prototype.once = function once(type, listener) {
      checkListener(listener);
      this.on(type, _onceWrap(this, type, listener));
      return this;
    };
    EventEmitter.prototype.prependOnceListener = function prependOnceListener(type, listener) {
        checkListener(listener);
        this.prependListener(type, _onceWrap(this, type, listener));
        return this;
    };
    EventEmitter.prototype.removeListener = function removeListener(type,listener) {
        return(_removeListener(this,type, listener))
    }
    EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
    EventEmitter.prototype.removeAllListeners =function removeAllListeners(type) {
        return(_removeAllListeners(this,type))
    };
    EventEmitter.prototype.listeners = function listeners(type) {
      return _listeners(this, type, true);
    };

    EventEmitter.prototype.rawListeners = function rawListeners(type) {
      return _listeners(this, type, false);
    };
    EventEmitter.prototype.listenerCount = listenerCount;
    EventEmitter.prototype.eventNames = function eventNames() {
        return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
    };
    return(EventEmitter)
}

////
factorize();

module.exports = EventEmitter;
module.exports.once = once;
module.exports.on = on;
module.exports.getEventListeners = getEventListeners;


