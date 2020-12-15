'use strict';

const {
  Array,
  FunctionPrototypeBind,
  Object,
} = primordials;

const {
  // For easy access to the nextTick state in the C++ land,
  // and to avoid unnecessary calls into JS land.
  tickInfo,
  // Used to run V8's micro task queue.
  runMicrotasks,
  setTickCallback,
  enqueueMicrotask
} = internalBinding('task_queue');

const {
  setHasRejectionToWarn,
  hasRejectionToWarn,
  listenForRejections,
  processPromiseRejections
} = require('internal/process/promises');

const {
  getDefaultTriggerAsyncId,
  newAsyncId,
  initHooksExist,
  destroyHooksExist,
  emitInit,
  emitBefore,
  emitAfter,
  emitDestroy,
  symbols: { async_id_symbol, trigger_async_id_symbol }
} = require('internal/async_hooks');
const {
  ERR_INVALID_CALLBACK,
  ERR_INVALID_ARG_TYPE
} = require('internal/errors').codes;

const FixedQueue = require('internal/fixed_queue');
const queue = new FixedQueue()
const defaultMicrotaskResourceOpts = { requireManualDestroy: true };
// *Must* match Environment::TickInfo::Fields in src/env.h.
const kHasTickScheduled = 0;

const kTickCount = {counter:-1};
let AsyncResource;
let cuqueues = {}

let manualPromiseThen = false
function setManualPromiseThen(value) {
    manualPromiseThen = value
}

function getManualPromiseThen() {
    return(manualPromiseThen)
}


function hasTickScheduled() {
  return tickInfo[kHasTickScheduled] === 1;
}

function setHasTickScheduled(value) {
  tickInfo[kHasTickScheduled] = value ? 1 : 0;
}


function execTock(tock) {
    const asyncId = tock[async_id_symbol];
    emitBefore(asyncId, tock[trigger_async_id_symbol], tock);
    try {
      const callback = tock.callback;
      if (tock.args === undefined) {
        callback();
      } else {
        const args = tock.args;
        switch (args.length) {
          case 1: callback(args[0]); break;
          case 2: callback(args[0], args[1]); break;
          case 3: callback(args[0], args[1], args[2]); break;
          case 4: callback(args[0], args[1], args[2], args[3]); break;
          default: callback(...args);
        }
      }
    } finally {
      if (destroyHooksExist()){
        emitDestroy(asyncId);
      }
    }
    emitAfter(asyncId);
}


function fastifyArguments($arguments) {
  let args;
  switch ($arguments.length) {
    case 0: break;
    case 1: args = [$arguments[0]]; break;
    case 4: args = [$arguments[0], $arguments[1]]; break;
    case 5: args = [$arguments[0], $arguments[1], $arguments[2]]; break;
    default:
      args = new Array($arguments.length);
      for (let i = 0; i < $arguments.length; i++)
        args[i] = $arguments[i];
  }
  return(args)
}

function creatTickObject(callback,args) {
    const asyncId = newAsyncId();
    const triggerAsyncId = getDefaultTriggerAsyncId();
    const tickObject = {
        [async_id_symbol]: asyncId,
        [trigger_async_id_symbol]: triggerAsyncId,
        callback,
        args
    }
    return(tickObject)
}

function emitInitWithTickObject(tickObject) {
    emitInit(tickObject[async_id_symbol], 'TickObject', tickObject[trigger_async_id_symbol], tickObject);
}



function setupTaskQueue(tag) {
    // Sets the per-isolate promise rejection callback
    listenForRejections();
    // Sets the callback to be run in every tick.
    setTickCallback(processTicksAndRejections);
    let $nextTick;
    let q;
    if(tag === undefined) {
       q = queue;
       $nextTick = nextTick; 
    } else {
       cuqueues[tag] = new FixedQueue()
       q = cuqueues[tag]
       $nextTick = (calback,...args)=> {cuNextTick(calback,tag,...args);};
    }
    return {
        nextTick:$nextTick,
        runNextTicks,
        q,
    };    
}


function shiftTock() {
    let tock;
    tock = queue.shift();
    if(tock){
        return(tock)
    } else {
        let ks = Object.keys(cuqueues);
        for(let i=0;i<ks.length;i++) {
            tock = cuqueues[ks[i]].shift();
            if(tock){return(tock)}
        }
    }
    return(tock)
}

function isAllQueuesEmpty() {
    let cond = queue.isEmpty()
    if(cond) {
        let ks = Object.keys(cuqueues);
        for(let i=0;i<ks.length;i++) {
            if(cuqueues[ks[i]].isEmpty()){} else {return(false)}
        }
        return(true)
    } else {
        return(false)
    }
}



function processTicksAndRejections() {
  kTickCount.counter = kTickCount.counter + 1
  let tock;
  do {
    while (tock = shiftTock()) {
        execTock(tock);
    }  
    if(!manualPromiseThen) {runMicrotasks();}
  } while (!isAllQueuesEmpty() || processPromiseRejections());
  if(!manualPromiseThen) {setHasTickScheduled(false);}
  // 保证c++ 层也会执行runMicrotasks
  /*
  src/api/callback.cc
    MakeCallback
        InternalMakeCallback
            CallbackScope::CallbackScope
                InternalCallbackScope::Close
                    if (!tick_info->has_tick_scheduled()) {
                        //如果没有tick_schedule 那么强制执行一次 处理 所有microtasks
                        //利用这个逻辑,可以在JS层欺骗C++层
                        //在JS层让 has_tick_scheduled() 永远为true (启动阶段除外)
                        MicrotasksScope::PerformCheckpoint(env_->isolate());
                        perform_stopping_check();
                    }
   */
    setHasRejectionToWarn(false);
}


// Should be in sync with RunNextTicksNative in node_task_queue.cc
function runNextTicks() {
  if (!hasTickScheduled() && !hasRejectionToWarn()) {
      if(!manualPromiseThen) {runMicrotasks();}
  }
  if (!hasTickScheduled() && !hasRejectionToWarn()) {return;}
  processTicksAndRejections();
}

function _nextTick(callback,q,...args) {
  if (typeof callback !== 'function') {throw new ERR_INVALID_CALLBACK(callback);}
  // `nextTick()` will not enqueue any callback when the process is about to
  // exit since the callback would not have a chance to be executed.
  if (process._exiting){return;}
  args = fastifyArguments(args);
  if (q.isEmpty()) {setHasTickScheduled(true);}
  const tickObject = creatTickObject(callback,args); 
  if (initHooksExist()){ emitInitWithTickObject(tickObject)}
  q.push(tickObject);
}

function nextTick(callback,...args) {_nextTick(callback,queue,...args)}
function cuNextTick(callback,tag,...args) {
    _nextTick(callback,cuqueues[tag],...args)
}

function createMicrotaskResource() {
  // Lazy load the async_hooks module
  if (AsyncResource === undefined) {
    AsyncResource = require('async_hooks').AsyncResource;
  }
  return new AsyncResource('Microtask', defaultMicrotaskResourceOpts);
}

function runMicrotask() {
  this.runInAsyncScope(() => {
    const callback = this.callback;
    try {
      callback();
    } finally {
      this.emitDestroy();
    }
  });
}

function queueMicrotask(callback) {
  if (typeof callback !== 'function') {throw new ERR_INVALID_ARG_TYPE('callback', 'function', callback);}
  const asyncResource = createMicrotaskResource();
  asyncResource.callback = callback;
  enqueueMicrotask(FunctionPrototypeBind(runMicrotask, asyncResource));
}

module.exports = {
  //
  //manualPromiseThen, 
  //required 直接在外部 nv_tool.l3.process_task_queues.manualPromiseThen = true
  //无效
  setManualPromiseThen,
  getManualPromiseThen,
  //
  kTickCount,
  //
  kHasTickScheduled,
  defaultMicrotaskResourceOpts,
  AsyncResource,
  queue,
  //
  cuqueues,
  //
  isAllQueuesEmpty,
  shiftTock,
  execTock,
  hasTickScheduled,
  setHasTickScheduled,
  execTock,
  fastifyArguments,
  creatTickObject,
  emitInitWithTickObject,
  runNextTicks,
  nextTick,
  cuNextTick,
  createMicrotaskResource,
  runMicrotask,
  queueMicrotask,
  //
  setupTaskQueue,
};
