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

const priority_queue = require("internal/priority_queue");
const async_hooks = require('internal/async_hooks');
const fixed_queue = require('internal/fixed_queue');
const l2timers = require('internal/timers')

const per_thread = require("internal/process/per_thread");
const promises = require("internal/process/promises");
const signal = require("internal/process/signal");
const esm_loader = require("internal/process/esm_loader");
const execution = require("internal/process/execution");
const process_task_queues = require("internal/process/task_queues");


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


module.exports = { 
    l0:{
        internalBinding,
        primordials,
    },
    l1:{
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
    },
    l2:{
        async_hooks,
        priority_queue,
        fixed_queue,
        l2timers
    },
    l3: {
        per_thread,
        promises,
        signal,
        esm_loader,
        execution,
        process_task_queues,
    },
    custom: {
        creat_manual_promise
    }
};
