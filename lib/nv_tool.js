'use strict';

const v8 = internalBinding("v8");
const task_queue = internalBinding('task_queue'); 
const constants = internalBinding('constants');
const signal_wrap = internalBinding('signal_wrap');
const module_wrap = internalBinding('module_wrap');
const async_wrap = internalBinding('async_wrap');
const util = internalBinding('util');
const report = internalBinding('report');
const config = internalBinding('config');
const process_methods = internalBinding('process_methods')
const native_module = internalBinding('native_module');
const trace_events =  internalBinding('trace_events');
const timers = internalBinding('timers');
const errors = internalBinding('errors');
const buffer = internalBinding('buffer');
const inspector = internalBinding('inspector');
const uv = internalBinding('uv');
const jstream = internalBinding('js_stream')
const credentials = internalBinding('credentials')
const performance = internalBinding('performance')
const contextify = internalBinding('contextify');
const types = internalBinding('types');
const symbols = internalBinding('symbols');
const messaging = internalBinding('messaging');
const options = internalBinding('options');


const l1_stream = require('stream')
const l1_repl = require('repl')
const l1_events_util  = require('events_util')



const priority_queue = require("internal/priority_queue");
const async_hooks = require('internal/async_hooks');
const fixed_queue = require('internal/fixed_queue');
const l2timers = require('internal/timers')
const event_target = require('internal/event_target')



const per_thread = require("internal/process/per_thread");
const promises = require("internal/process/promises");
const signal = require("internal/process/signal");
const esm_loader = require("internal/process/esm_loader");
const execution = require("internal/process/execution");
const process_task_queues = require("internal/process/task_queues");
const repl_await = require('internal/repl/await')
const js_transferable = require('internal/worker/js_transferable');
const iterable_weak_map = require('internal/util/iterable_weak_map');
const comparisons  = require('internal/util/comparisons');
const l3_inspect = require("internal/util/inspect");
const l3_inspector = require("internal/util/inspector");



function creat_manual_promise() {
    let $rs;
    let $rj;
    let p = new Promise(
        (rs,rj)=>{
            $rs = rs 
            $rj = rj
        }
    )
    p.$rs = $rs 
    p.$rj = $rj
    return(p)
}


function creat_tick_obj(callback,args) {
    const asyncId = async_hooks.newAsyncId();
    const triggerAsyncId = async_hooks.getDefaultTriggerAsyncId();
    const tickObject = {
        [symbols.async_id_symbol]: asyncId,
        [symbols.trigger_async_id_symbol]: triggerAsyncId,
        callback,
        args
    };
    return(tickObject)
}

function sync_sleep(ms) {
    let sab = new SharedArrayBuffer(1024); 
    let int32 = new Int32Array(sab); 
    Atomics.wait(int32,0,0,ms)
}


function creat_repl() {
  const input = new app_stream();
  input.write = input.pause = input.resume = () => {};
  input.readable = true;
  const output = new app_stream();
  output.writable = true;
  output.accumulator = [];
  output.write = (data) => output.accumulator.push(data);
  return app_repl.start({
    input,
    output,
    useColors: false,
    terminal: false,
    prompt: ''
  });
}


module.exports = { 
    internal:{
        internalBinding,
        primordials,
    },
    l0:{
        v8,
        task_queue,
        constants,
        signal_wrap,
        module_wrap,
        async_wrap,
        util,
        report,
        config,
        process_methods,
        native_module,
        trace_events,
        timers,
        errors,
        buffer,
        inspector,
        uv,
        credentials,
        jstream,
        performance,
        contextify,
        types,
        symbols,
        messaging,
        options,
    },
    l1:{
        stream:l1_stream,
        repl:l1_repl,
        events_util:l1_events_util,
    },
    l2:{
        async_hooks,
        priority_queue,
        fixed_queue,
        l2timers,
        event_target,
    },
    l3: {
        per_thread,
        promises,
        signal,
        esm_loader,
        execution,
        process_task_queues,
        repl_await,
        js_transferable,
        iterable_weak_map,
        comparisons,
        l3_inspect,
        l3_inspector,
    },
    custom: {
        creat_manual_promise,
        creat_tick_obj,
        creat_repl,
        sync_sleep,
    }
};
