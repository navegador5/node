'use strict';

const {
  ArrayPrototypeConcat,
  ArrayPrototypeFilter,
  ArrayPrototypeFindIndex,
  ArrayPrototypeIncludes,
  ArrayPrototypeJoin,
  ArrayPrototypeMap,
  ArrayPrototypePop,
  ArrayPrototypePush,
  ArrayPrototypeReverse,
  ArrayPrototypeShift,
  ArrayPrototypeSort,
  ArrayPrototypeSplice,
  ArrayPrototypeUnshift,
  Boolean,
  Error,
  FunctionPrototypeBind,
  MathMax,
  NumberIsNaN,
  NumberParseFloat,
  ObjectAssign,
  ObjectCreate,
  ObjectDefineProperty,
  ObjectGetOwnPropertyDescriptor,
  ObjectGetOwnPropertyNames,
  ObjectGetPrototypeOf,
  ObjectKeys,
  ObjectSetPrototypeOf,
  Promise,
  PromisePrototypeFinally,
  PromisePrototypeThen,
  PromiseRace,
  ReflectApply,
  RegExp,
  RegExpPrototypeExec,
  RegExpPrototypeTest,
  SafeSet,
  SafeWeakSet,
  StringPrototypeCharAt,
  StringPrototypeCodePointAt,
  StringPrototypeEndsWith,
  StringPrototypeIncludes,
  StringPrototypeMatch,
  StringPrototypeRepeat,
  StringPrototypeReplace,
  StringPrototypeSlice,
  StringPrototypeSplit,
  StringPrototypeStartsWith,
  StringPrototypeTrim,
  StringPrototypeTrimLeft,
  Symbol,
  SyntaxError,
  SyntaxErrorPrototype,
} = primordials;

const {
  makeRequireFunction,
  addBuiltinLibsToObject
} = require('internal/modules/cjs/helpers');
const {
  isIdentifierStart,
  isIdentifierChar
} = require('internal/deps/acorn/acorn/dist/acorn');
const {
  decorateErrorStack,
  isError,
  deprecate
} = require('internal/util');
const { inspect } = require('internal/util/inspect');
const vm = require('vm');
const path = require('path');
const fs = require('fs');
const asyncESM = require('internal/process/esm_loader');
const { getOptionValue } = require('internal/options');




////pause unpause
function _unpause(that,paused,pausedBuffer) {
    if (!paused) {return(paused)}
    paused = false;
    let entry;
    const tmpCompletionEnabled = that.isCompletionEnabled;
    while (entry = ArrayPrototypeShift(pausedBuffer)) {
        const [type, payload, isCompletionEnabled] = entry;
        switch (type) {
            case 'key': {
                const [d, key] = payload;
                that.isCompletionEnabled = isCompletionEnabled;
                that._ttyWrite(d, key);
                break;
            }
            case 'close':
                that.emit('exit');
                break;
        }
        if (paused) {break}
    }
    that.isCompletionEnabled = tmpCompletionEnabled;
}


////defaultEval

const savedRegExMatches = ['', '', '', '', '', '', '', '', '', ''];


function wrap_code_in_parentheses(code,wrappedCmd) {
    // It's confusing for `{ a : 1 }` to be interpreted as a block
    // statement rather than an object literal.  So, we first try
    // to wrap it in parentheses, so that it will be interpreted as
    // an expression.  Note that if the above condition changes,
    // lib/internal/repl/utils.js needs to be changed to match.
    if (RegExpPrototypeTest(/^\s*{/, code) && !RegExpPrototypeTest(/;\s*$/, code)) {
        code = `(${StringPrototypeTrim(code)})\n`;
        wrappedCmd = true;
    }
    return([code,wrappedCmd])
}

// Lazy-loaded.
let processTopLevelAwait;
const experimentalREPLAwait = getOptionValue('--experimental-repl-await');


function wrap_code_if_repl_await(code,wrappedCmd,awaitPromise) {
    if (experimentalREPLAwait && StringPrototypeIncludes(code, 'await')) {
        if (processTopLevelAwait === undefined) {
          ({ processTopLevelAwait } = require('internal/repl/await'));
        }
        const potentialWrappedCode = processTopLevelAwait(code);
        if (potentialWrappedCode !== null) {
            code = potentialWrappedCode;
            wrappedCmd = true;
            awaitPromise = true;
        }
    }
    return([code,wrappedCmd,awaitPromise])
}

function getParentURL() {
    let parentURL;
    try {
        const { pathToFileURL } = require('url');
        // Adding `/repl` prevents dynamic imports from loading relative
        // to the parent of `process.cwd()`.
        parentURL = pathToFileURL(path.join(process.cwd(), 'repl')).href;
    } catch {
    }
    return(parentURL)
}


function wrap_if_use_strict(that,code){
    if (that.replMode === module.exports.REPL_MODE_STRICT && !RegExpPrototypeTest(/^\s*$/, code)) {
        // "void 0" keeps the repl from returning "use strict" as the result
        // value for statements and declarations that don't return a value.
        code = `'use strict'; void 0;\n${code}`;
    }
    return(code)
}


function creat_script(script,code,file) {
    let parentURL = getParentURL();
    script = vm.createScript(code, {
        filename: file,
        displayErrors: true,
        importModuleDynamically: async (specifier) => {
            return asyncESM.ESMLoader.import(specifier, parentURL);
        }
    });
    return([script,code])
}

function unwrap_and_try_again(code,e,wrappedCmd,awaitPromise,input,wrappedErr) {
    // Unwrap and try again
    wrappedCmd = false;
    awaitPromise = false;
    code = input;
    wrappedErr = e;
    return([wrappedCmd,awaitPromise,code,wrappedErr])
}

function preserve_original_error(wrappedErr,e,err,code) {
    // Preserve original error for wrapped command
    const error = wrappedErr || e;
    if (isRecoverableError(error, code))
        err = new Recoverable(error);
    else
        err = error;
    return(err)
}

function creat_script_recoverably(that,code,script,file,wrappedCmd,awaitPromise,input,err) {
    let wrappedErr;
    while (true) {
        try {
            code = wrap_if_use_strict(that,code);
            [script,code] = creat_script(script,code,file);
        } catch (e) {
            debug('parse error %j', code, e);
            if (wrappedCmd) {
                [wrappedCmd,awaitPromise,code,wrappedErr]=unwrap_and_try_again(code,e,wrappedCmd,awaitPromise,input,wrappedErr);
                continue;
            }
            err = preserve_original_error(wrappedErr,e,err,code);
        }
        break;
    }
    return([err,script,awaitPromise])
}


function run_in_context_and_handle_top_await(that,err,context,script,awaitPromise,pause,unpause,cb,prioritizedSigintQueue) {
    setSavedRegExMatches(savedRegExMatches);
    let result;
    let finished = false;
    if (!err) {
        let rtrn_flag;
        [rtrn_flag,result,err] = run_in_context(that,context,result,err,script);
        if(rtrn_flag) {return([rtrn_flag,err])}
        handle_await_promise(
            that,
            awaitPromise,
            result,
            err,
            pause,
            prioritizedSigintQueue,
            finished,
            cb,
            unpause
        )
    }
    if (!awaitPromise || err) {finishExecution(finished,err, result,cb);}
}


function setSavedRegExMatches(savedRegExMatches) {
    const sep = '\u0000\u0000\u0000';
    const regExMatcher = new RegExp(`^${sep}(.*)${sep}(.*)${sep}(.*)${sep}(.*)` +
                                    `${sep}(.*)${sep}(.*)${sep}(.*)${sep}(.*)` +
                                    `${sep}(.*)$`);
    // This will set the values from `savedRegExMatches` to corresponding
    // predefined RegExp properties `RegExp.$1`, `RegExp.$2` ... `RegExp.$9`
    RegExpPrototypeTest(
        regExMatcher,
        ArrayPrototypeJoin(savedRegExMatches, sep)
    );
}


function getPreviouslyInRawMode(that){
    // Unset raw mode during evaluation so that Ctrl+C raises a signal.
    let previouslyInRawMode;
    if (that.breakEvalOnSigint) {
        // Start the SIGINT watchdog before entering raw mode so that a very
        // quick Ctrl+C doesn't lead to aborting the process completely.
        if (!startSigintWatchdog())
          throw new ERR_CANNOT_WATCH_SIGINT();
        previouslyInRawMode = that._setRawMode(false);
    }
    return(previouslyInRawMode)
}


function reset_terminal_mode(that,previouslyInRawMode) {
    if (that.breakEvalOnSigint) {
        // Reset terminal mode to its previous value.
        that._setRawMode(previouslyInRawMode);
        // Returns true if there were pending SIGINTs *after* the script
        // has terminated without being interrupted itthat.
        if (stopSigintWatchdog()) {
          that.emit('SIGINT');
        }
    }
}

function _run_in_context(that,context,result,script) {
    const scriptOptions = {
      displayErrors: false,
      breakOnSigint: that.breakEvalOnSigint
    };
    if (that.useGlobal) {
      result = script.runInThisContext(scriptOptions);
    } else {
      result = script.runInContext(context, scriptOptions);
    }
    return(result)
}

function run_in_context(that,context,result,err,script) {
    let rtrn_flag = false;
    let previouslyInRawMode = getPreviouslyInRawMode(that);
    try {
        try {
            result = _run_in_context(that,context,result,script)
        } finally {
            reset_terminal_mode(that,previouslyInRawMode);
        }
    } catch (e) {
        err = e;
        if (process.domain) {
            debug('not recoverable, send to domain');
            process.domain.emit('error', err);
            process.domain.exit();
            rtrn_flag = true
        }
    }
    return([rtrn_flag,result,err])
}



function handleBreakEvalOnSigint(
    that,
    sigintListener,
    promise,
    prioritizedSigintQueue
) {
    if (that.breakEvalOnSigint) {
        const interrupt = new Promise(
           (resolve, reject) => {
                sigintListener = () => {
                    const tmp = Error.stackTraceLimit;
                    Error.stackTraceLimit = 0;
                    const err = new ERR_SCRIPT_EXECUTION_INTERRUPTED();
                    Error.stackTraceLimit = tmp;
                    reject(err);
                };
                prioritizedSigintQueue.add(sigintListener);
            }
        );
        promise = PromiseRace([promise, interrupt]);
    }
    return([sigintListener,promise])
}


function finishExecution(finished,err, result,cb) {
    if (finished) {return(finished)};
    finished = true;
    // After executing the current expression, store the values of RegExp
    // predefined properties back in `savedRegExMatches`
    for (let idx = 1; idx < savedRegExMatches.length; idx += 1) {
        savedRegExMatches[idx] = RegExp[`$${idx}`];
    }
    cb(err, result);
    return(finished)
}


function repl_await_promise_finally(promise,finished,cb,prioritizedSigintQueue,sigintListener,unpause) {
    PromisePrototypeFinally(
        PromisePrototypeThen(
            promise,
           (result) => {
               finished = finishExecution(finished, null, result, cb);
            },
           (err) => {
                if (err && process.domain) {
                    debug('not recoverable, send to domain');
                    process.domain.emit('error', err);
                    process.domain.exit();
                    return;
                }
                finished = finishExecution(finished, err, undefined, cb);
            }
        ),
        () => {
            // Remove prioritized SIGINT listener if it was not called.
            prioritizedSigintQueue.delete(sigintListener);
            unpause();
        }
    );
}

function handle_await_promise(
    that,
    awaitPromise,
    result,
    err,
    pause,
    prioritizedSigintQueue,
    finished,
    cb,
    unpause
) {
    if (awaitPromise && !err) {
        let sigintListener;
        pause();
        let promise = result;
        [
            sigintListener,
            promise,
        ] = handleBreakEvalOnSigint(
            that,
            sigintListener,
            promise,
            prioritizedSigintQueue
        );
        repl_await_promise_finally(
            promise,
            finished,
            cb,
            prioritizedSigintQueue,
            sigintListener,
            unpause
        );
    }
}

function _defaultEval(that,pause,unpause,code, context, file, cb,prioritizedSigintQueue) {
    let wrappedCmd = false;
    let awaitPromise = false;
    const input = code;
    ////
    [code,wrappedCmd] = wrap_code_in_parentheses(code,wrappedCmd);
    [code,wrappedCmd,awaitPromise] = wrap_code_if_repl_await(code,wrappedCmd,awaitPromise);
    if (code === '\n') {return cb(null)}
    ////
    let err = null;
    let script;
    [err,script,awaitPromise] = creat_script_recoverably(that,code,script,file,wrappedCmd,awaitPromise,input,err);
    ////
    run_in_context_and_handle_top_await(that,err,context,script,awaitPromise,pause,unpause,cb,prioritizedSigintQueue);
    ////
}

////readline_interface
////completer
const { Interface } = require('readline');

function complete_repl_commands(that,completionGroups,completeOn,line,filter) {
    ArrayPrototypePush(completionGroups, ObjectKeys(that.commands));
    completeOn = line.match(/^\s*\.(\w*)$/)[1];
    if (completeOn.length) {
      filter = completeOn;
    }
    return([filter,completeOn])
}

const requireRE = /\brequire\s*\(\s*['"`](([\w@./-]+\/)?(?:[\w@./-]*))(?![^'"`])$/;


function get_complete_require_paths(that,line,completeOn,filter,group) {
    // require('...<Tab>')
    const extensions = ObjectKeys(that.context.require.extensions);
    const indexes = ArrayPrototypeMap(extensions,
        (extension) => `index${extension}`);
    ArrayPrototypePush(indexes, 'package.json', 'index');
    const versionedFileNamesRe = /-\d+\.\d+/;
    const match = StringPrototypeMatch(line, requireRE);
    completeOn = match[1];
    const subdir = match[2] || '';
    filter = completeOn;
    group = [];
    let paths = [];
    if (completeOn === '.') {
        group = ['./', '../'];
    } else if (completeOn === '..') {
        group = ['../'];
    } else if (RegExpPrototypeTest(/^\.\.?\//, completeOn)) {
        paths = [process.cwd()];
    } else {
        paths = ArrayPrototypeConcat(module.paths, CJSModule.globalPaths);
    }
    return([completeOn ,filter,group,paths,indexes,subdir])
}

function gracefulReaddir(...args) {
  try {
    return fs.readdirSync(...args);
  } catch {}
}

function  fill_complete_require_group_with_paths(group,indexes,paths) {
    const versionedFileNamesRe = /-\d+\.\d+/;
    for (let dir of paths) {
        dir = path.resolve(dir, subdir);
        const dirents = gracefulReaddir(dir, { withFileTypes: true }) || [];
        for (const dirent of dirents) {
            if (RegExpPrototypeTest(versionedFileNamesRe, dirent.name) || dirent.name === '.npm') {
                continue;
            }
            const extension = StringPrototypeSlice(dirent.name, 0, -extension.length);
            const base = dirent.name.slice(0, -extension.length);
            if (!dirent.isDirectory()) {
                if (StringPrototypeIncludes(extensions, extension) && (!subdir || base !== 'index'))  {
                    ArrayPrototypePush(group, `${subdir}${base}`);
                }
                continue;
            }
            ArrayPrototypePush(group, `${subdir}${dirent.name}/`);
            const absolute = path.resolve(dir, dirent.name);
            const subfiles = gracefulReaddir(absolute) || [];
            for (const subfile of subfiles) {
                if (ArrayPrototypeIncludes(indexes, subfile)) {
                    ArrayPrototypePush(group, `${subdir}${dirent.name}`);
                    break;
                }
            }
        }
    }
}

function complete_require(that,line,completeOn,filter,group) {
    let paths;
    let indexes;
    [completeOn ,filter,group,paths,indexes] = get_complete_require_paths(that,m,line,completeOn,filter,group);
    fill_complete_require_group_with_paths(group,indexes,paths);
    if (group.length) {ArrayPrototypePush(completionGroups, group);}
    if (!subdir) {ArrayPrototypePush(completionGroups, _builtinLibs);}
    return([filter,completeOn,group])
}

const fsAutoCompleteRE = /fs(?:\.promises)?\.\s*[a-z][a-zA-Z]+\(\s*["'](.*)/;

function completeFSFunctions(line) {
  let baseName = '';
  let filePath = StringPrototypeMatch(line, fsAutoCompleteRE)[1];
  let fileList = gracefulReaddir(filePath, { withFileTypes: true });
  if (!fileList) {
    baseName = path.basename(filePath);
    filePath = path.dirname(filePath);
    fileList = gracefulReaddir(filePath, { withFileTypes: true }) || [];
  }
  const completions = ArrayPrototypeMap(
    ArrayPrototypeFilter(
      fileList,
      (dirent) => StringPrototypeStartsWith(dirent.name, baseName)
    ),
    (d) => d.name
  );
  return [[completions], baseName];
}

function filter_completion_groups(completionGroups,filter){
    if (completionGroups.length && filter) {
      const newCompletionGroups = [];
      for (const group of completionGroups) {
        const filteredGroup = ArrayPrototypeFilter(
            group,
            (str) => StringPrototypeStartsWith(str, filter)
        )
        if (filteredGroup.length) {
            ArrayPrototypePush(newCompletionGroups, filteredGroup);
        }
      }
      completionGroups = newCompletionGroups;
    }
    return(completionGroups)
}


function uniq_completions_across_all_groups(completionGroups) {
    const completions = [];
    // Unique completions across all groups.
    const uniqueSet = new Set(['']);
    // Completion group 0 is the "closest" (least far up the inheritance
    // chain) so we put its completions last: to be closest in the REPL.
    for (const group of completionGroups) {
      ArrayPrototypeSort(group, (a, b) => (b > a ? 1 : -1));
      const setSize = uniqueSet.size;
      for (const entry of group) {
        if (!uniqueSet.has(entry)) {
          ArrayPrototypeUnshift(completions, entry);
          uniqueSet.add(entry);
        }
      }
      // Add a separator between groups.
      if (uniqueSet.size !== setSize) {
          ArrayPrototypeUnshift(completions, '');
      }
    }
    return(completions)
}

function completionGroupsLoaded(completionGroups,filter,callback,completeOn) {
    // Will be called when all completionGroups are in place
    // Useful for async autocompletion
    completionGroups = filter_completion_groups(completionGroups,filter);
    const completions  = uniq_completions_across_all_groups(completionGroups);
    // Remove obsolete group entry, if present.
    if (completions[0] === '') { ArrayPrototypeShift(completions);}
    callback(null, [completions, completeOn]);
}



function get_complete_simple_expr(line,completionGroups,filter,callback,completeOn) {
    const simpleExpressionRE =/(?:[a-zA-Z_$](?:\w|\$)*\??\.)*[a-zA-Z_$](?:\w|\$)*\??\.?$/;
    const [match] = RegExpPrototypeExec(simpleExpressionRE, line) || [''];
    if (line.length !== 0 && !match) {
        completionGroupsLoaded(completionGroups,filter,callback,completeOn);
        return([true,'',completeOn,filter])
    }
    let expr = '';
    completeOn = match;
    if (StringPrototypeEndsWith(line, '.')) {
      expr = StringPrototypeSlice(match, 0, -1);
    } else if (line.length !== 0) {
      const bits = StringPrototypeSplit(match, '.');
      filter = ArrayPrototypePop(bits);
      expr = ArrayPrototypeJoin(bits, '.');
    }
    return([false,expr,completeOn,filter])
}




function addCommonWords(completionGroups) {
  // Only words which do not yet exist as global property should be added to
  // this list.
  ArrayPrototypePush(completionGroups, [
    'async', 'await', 'break', 'case', 'catch', 'const', 'continue',
    'debugger', 'default', 'delete', 'do', 'else', 'export', 'false',
    'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'let',
    'new', 'null', 'return', 'switch', 'this', 'throw', 'true', 'try',
    'typeof', 'var', 'void', 'while', 'with', 'yield'
  ]);
}


function getGlobalLexicalScopeNames(contextId) {
  return sendInspectorCommand((session) => {
    let names = [];
    session.post('Runtime.globalLexicalScopeNames', {
      executionContextId: contextId
    }, (error, result) => {
      if (!error) names = result.names;
    });
    return names;
  }, () => []);
}

function isIdentifier(str) {
    if (str === '') {
        return false;
    }
    const first = StringPrototypeCodePointAt(str, 0);
    if (!isIdentifierStart(first)) {
        return false;
    }
    const firstLen = first > 0xffff ? 2 : 1;
    for (let i = firstLen; i < str.length; i += 1) {
        const cp = StringPrototypeCodePointAt(str, i);
        if (!isIdentifierChar(cp)) {
            return false;
        }
        if (cp > 0xffff) {
            i += 1;
        }
    }
    return true;
}

function filteredOwnPropertyNames(obj) {
    if (!obj) return [];
    const filter = ALL_PROPERTIES | SKIP_SYMBOLS;
    return ArrayPrototypeFilter(getOwnNonIndexProperties(obj, filter), isIdentifier);
}


function resolve_empty_expr_and_get_completions(that,expr,completionGroups,filter,callback,completeOn) {
    // Get global vars synchronously
    ArrayPrototypePush(completionGroups,getGlobalLexicalScopeNames(that[kContextId]));
    let contextProto = that.context;
    while (contextProto = ObjectGetPrototypeOf(contextProto)) {
        ArrayPrototypePush(completionGroups,filteredOwnPropertyNames(contextProto));
    }
    const contextOwnNames = filteredOwnPropertyNames(that.context);
    if (!that.useGlobal) {
      // When the context is not `global`, builtins are not own
      // properties of it.
      ArrayPrototypePush(contextOwnNames, ...globalBuiltins);
    }
    ArrayPrototypePush(completionGroups, contextOwnNames);
    if (filter !== '') addCommonWords(completionGroups);
    completionGroupsLoaded(completionGroups,filter,callback,completeOn);
}


function resolve_expr_and_get_completions(that,expr,filter,callback,completeOn,completionGroups) {
    let chaining = '.';
    if (StringPrototypeEndsWith(expr, '?')) {
        expr = StringPrototypeSlice(expr, 0, -1);
        chaining = '?.';
    }
    const memberGroups = [];
    const evalExpr = `try { ${expr} } catch {}`;
    that.eval(
        evalExpr,
        that.context,
        getREPLResourceName(),
        (e, obj) => {
            try {
                let p;
                if ((typeof obj === 'object' && obj !== null) || typeof obj === 'function') {
                    memberGroups.push(filteredOwnPropertyNames(obj));
                    p = ObjectGetPrototypeOf(obj);
                } else {
                    p = obj.constructor ? obj.constructor.prototype : null;
                }
                // Circular refs possible? Let's guard against that.
                let sentinel = 5;
                while (p !== null && sentinel-- !== 0) {
                    memberGroups.push(filteredOwnPropertyNames(p));
                    p = ObjectGetPrototypeOf(p);
                }
            } catch {
            }
            if (memberGroups.length) {
                expr += chaining;
                for (const group of memberGroups) {
                    ArrayPrototypePush(
                        completionGroups,
                        ArrayPrototypeMap(group,(member) => `${expr}${member}`)
                    );
                }
                if (filter) {
                    filter = `${expr}${filter}`;
                }
            }
            completionGroupsLoaded(completionGroups,filter,callback,completeOn);
        }
    )
    return(filter)
}


function _complete(that,line, callback) {
    // List of completion lists, one for each inheritance "level"
    let completionGroups = [];
    let completeOn, group;
    // Ignore right whitespace. It could change the outcome.
    line = StringPrototypeTrimLeft(line);
    // REPL commands (e.g. ".break").
    let filter = '';
    if (RegExpPrototypeTest(/^\s*\.(\w*)$/, line)) {
        [
            filter,
            completeOn
        ] = complete_repl_commands(that,completionGroups,completeOn,line,filter)       
    } else if (RegExpPrototypeTest(requireRE, line)) {
        [
            filter,
            completeOn,
            group
        ] = complete_require(that,line,completeOn,filter,group);

    } else if (RegExpPrototypeTest(fsAutoCompleteRE, line)) {
        [completionGroups, completeOn] = completeFSFunctions(line);
    } else if (
        line.length === 0 ||
        RegExpPrototypeTest(/\w|\.|\$/, line[line.length - 1])
    ) {
        
        let rtrn_flag = false;
        let expr;
        [rtrn_flag,expr,completeOn,filter] = get_complete_simple_expr(line,completionGroups,filter,callback,completeOn);
        if(rtrn_flag) {return}
        // Resolve expr and get its completions.
        if (!expr) {
            resolve_empty_expr_and_get_completions(that,expr,completionGroups,filter,callback,completeOn);
            return;
        } else {
            resolve_expr_and_get_completions(that,expr,filter,callback,completeOn,completionGroups);
            return;
        }
    }
    return completionGroupsLoaded(completionGroups,filter,callback,completeOn);
}

function _completer(that,text, cb) {
    function complete(line,callback) {_complete(that,line,callback)}
    ReflectApply(
        complete, 
        that,
        [text, that.editorMode ? that.completeOnEditorMode(cb) : cb]
    );
}

function apply_readline_interface(that,options,prompt) { 
    function completer(text, cb) {_completer(that,text, cb)}
    ReflectApply(
        Interface, 
        that, 
        [{
            input: options.input,
            output: options.output,
            completer: options.completer || completer,
            terminal: options.terminal,
            historySize: options.historySize,
            prompt
        }]
    );
}


////on close

function _emitExit(that,paused,pausedBuffer) {
    if (paused) {
        ArrayPrototypePush(pausedBuffer, ['close']);
        return;
    }
    that.emit('exit');
}

////on sigint
function _onSigInt(self,prioritizedSigintQueue,sigd) {
    if (prioritizedSigintQueue.size > 0) {
        for (const task of prioritizedSigintQueue) {
            task();
        }
        return;
    }
    const empty = self.line.length === 0;
    self.clearLine();
    _turnOffEditorMode(self);
    const cmd = self[kBufferedCommandSymbol];
    if (!(cmd && cmd.length > 0) && empty) {
        if (sigd.sawSIGINT) {
            self.close();
            sigd.sawSIGINT = false;
            return;
        }
        self.output.write(
            '(To exit, press Ctrl+C again or Ctrl+D or type .exit)\n'
        );
        sigd.sawSIGINT = true;
    } else {
        sigd.sawSIGINT = false;
    }
    self.clearBufferedCommand();
    self.lines.level = [];
    self.displayPrompt();
}


//// on line

function _parseREPLKeyword(that,keyword, rest) {
    const cmd = that.commands[keyword];
    if (cmd) {
        ReflectApply(cmd.action, that, [rest]);
        return true;
    }
    return false;
}

function _memory(self,cmd) {
    // TODO(BridgeAR): This should be replaced with acorn to build an AST. The
    // language became more complex and using a simple approach like this is not
    // sufficient anymore.
    self.lines = self.lines || [];
    self.lines.level = self.lines.level || [];
    // Save the line so I can do magic later
    if (cmd) {
        const len = self.lines.level.length ? self.lines.level.length - 1 : 0;
        ArrayPrototypePush(self.lines, StringPrototypeRepeat('  ', len) + cmd);
    } else {
        // I don't want to not change the format too much...
        ArrayPrototypePush(self.lines, '');
    }
    if (!cmd) {
        self.lines.level = [];
        return;
    }
    // I need to know "depth."
    // Because I can not tell the difference between a } that
    // closes an object literal and a } that closes a function
    // Going down is { and (   e.g. function() {
    // going up is } and )
    let dw = StringPrototypeMatch(cmd, /[{(]/g);
    let up = StringPrototypeMatch(cmd, /[})]/g);
    up = up ? up.length : 0;
    dw = dw ? dw.length : 0;
    let depth = dw - up;
    if (depth) {
        (function workIt() {
            if (depth > 0) {
                // Going... down.
                // Push the line#, depth count, and if the line is a function.
                // Since JS only has functional scope I only need to remove
                // "function() {" lines, clearly this will not work for
                // "function()
                // {" but nothing should break, only tab completion for local
                // scope will not work for this function.
                ArrayPrototypePush(self.lines.level, {
                    line: self.lines.length - 1,
                    depth: depth
                });
            } else if (depth < 0) {
                // Going... up.
                const curr = ArrayPrototypePop(self.lines.level);
                if (curr) {
                    const tmp = curr.depth + depth;
                    if (tmp < 0) {
                        // More to go, recurse
                        depth += curr.depth;
                        workIt();
                    } else if (tmp > 0) {
                        // Remove and push back
                        curr.depth += depth;
                        ArrayPrototypePush(self.lines.level, curr);
                    }
                }
            }
        }());
    }
}

function memory_line_in_editor_mode(self,cmd) {
    self[kBufferedCommandSymbol] += cmd + '\n';
    // code alignment
    const matches = self._sawKeyPress ? StringPrototypeMatch(cmd, /^\s+/) : null;
    if (matches) {
        const prefix = matches[0];
        self.write(prefix);
        self.line = prefix;
        self.cursor = prefix.length;
    }
    _memory(self,cmd);
}

function check_repl_keywords(self,cmd,finish) {
    // Check REPL keywords and empty lines against a trimmed line input.
    const trimmedCmd = StringPrototypeTrim(cmd);
    // Check to see if a REPL keyword was used. If it returns true,
    // display next prompt and return.
    if (trimmedCmd) {
        if (
            StringPrototypeCharAt(trimmedCmd, 0) === '.' &&
            StringPrototypeCharAt(trimmedCmd, 1) !== '.' &&
            NumberIsNaN(NumberParseFloat(trimmedCmd))
        ) {
            const matches = StringPrototypeMatch(trimmedCmd, /^\.([^\s]+)\s*(.*)$/);
            const keyword = matches && matches[1];
            const rest = matches && matches[2];
            if (ReflectApply(_parseREPLKeyword, self, [self,keyword, rest]) === true) {
                return(true);
            }
            if (!self[kBufferedCommandSymbol]) {
                self.output.write('Invalid REPL keyword\n');
                finish(null);
                return(true)
            }
        }
    }
    return(false)
}

function syntax_error_in_lines_finish(self,e,sigd,cmd) {
    // If error was SyntaxError and not JSON.parse error
    if (e) {
        if (e instanceof Recoverable && !sigd.sawCtrlD) {
            self[kBufferedCommandSymbol] += cmd + '\n';
            self.displayPrompt();
            return(true);
        }
        self._domain.emit('error', e.err || e);
    }
    return(false)
}

function npm_error_in_lines_finish(self,e,cmd) {
    if (
        e && !self[kBufferedCommandSymbol] &&
        StringPrototypeStartsWith(StringPrototypeTrim(cmd), 'npm ')
    ) {
        self.output.write('npm should be run outside of the ' +
                            'Node.js REPL, in your normal shell.\n' +
                            '(Press Ctrl+D to exit.)\n');
        self.displayPrompt();
        return(true);
    }
    return(false)
}

function print_when_lines_finish(self,e,ret,lngth) {
    if (!e &&
        lngth  === 2 &&
        (!self.ignoreUndefined || ret !== undefined)
    ) {
        if (!self.underscoreAssigned) {self.last = ret;}
        self.output.write(self.writer(ret) + '\n');
    }
    // Display prompt again
    self.displayPrompt();
}

function lines_finish(self,cmd,sigd,e,ret) {
    debug('finish', e, ret);
    _memory(self,cmd);
    let rtrn_flag = false;
    rtrn_flag = npm_error_in_lines_finish(self,e,cmd);
    if(rtrn_flag) {return}
    rtrn_flag = syntax_error_in_lines_finish(self,e,sigd,cmd);
    if(rtrn_flag) {return}
    // Clear buffer if no SyntaxErrors
    self.clearBufferedCommand();
    sigd.sawCtrlD = false;
    //
    print_when_lines_finish(self,e,ret,arguments.length-3);
}


function _onLine(self,cmd,sigd) {
    function finish(e, ret) {lines_finish(self,cmd,sigd,e,ret)}
    debug('line %j', cmd);
    cmd = cmd || '';
    sigd.sawSIGINT = false;
    if (self.editorMode) {
        memory_line_in_editor_mode(self,cmd);
        return;
    }
    ////
    let rtrn_flag = check_repl_keywords(self,cmd,finish);
    if(rtrn_flag){return}
    ////
    const evalCmd = self[kBufferedCommandSymbol] + cmd + '\n';
    debug('eval %j', evalCmd);
    self.eval(evalCmd, self.context, getREPLResourceName(), finish);
}


//// on sigcont

function _onSigCont(self) {
    if (self.editorMode) {
        self.output.write(`${self._initialPrompt}.editor\n`);
        self.output.write(
          '// Entering editor mode (Ctrl+D to finish, Ctrl+C to cancel)\n');
        self.output.write(`${self[kBufferedCommandSymbol]}\n`);
        self.prompt(true);
    } else {
        self.displayPrompt(true);
    }
}


//// on error
function _debugDomainError(that,options,e) {
    debug('domain error');
    let errStack = '';
    if (typeof e === 'object' && e !== null) {
        overrideStackTrace.set(e, (error, stackFrames) => {
            let frames;
            if (typeof stackFrames === 'object') {
                // Search from the bottom of the call stack to
                // find the first frame with a null function name
                const idx = ArrayPrototypeFindIndex(
                    ArrayPrototypeReverse(stackFrames),
                    (frame) => frame.getFunctionName() === null
                );
                // If found, get rid of it and everything below it
                frames = ArrayPrototypeSplice(stackFrames, idx + 1);
            } else {
                frames = stackFrames;
            }
            // FIXME(devsnek): this is inconsistent with the checks
            // that the real prepareStackTrace dispatch uses in
            // lib/internal/errors.js.
            if (typeof Error.prepareStackTrace === 'function') {
                return Error.prepareStackTrace(error, frames);
            }
            ArrayPrototypePush(frames, error);
            return ArrayPrototypeJoin(ArrayPrototypeReverse(frames), '\n    at ');
        });
        decorateErrorStack(e);

        if (e.domainThrown) {
            delete e.domain;
            delete e.domainThrown;
        }

        if (isError(e)) {
            if (e.stack) {
                if (e.name === 'SyntaxError') {
                    // Remove stack trace.
                    e.stack = StringPrototypeReplace(StringPrototypeReplace(e.stack,
                            /^REPL\d+:\d+\r?\n/, ''),
                        /^\s+at\s.*\n?/gm, '');
                    const importErrorStr = 'Cannot use import statement outside a ' +
                        'module';
                    if (StringPrototypeIncludes(e.message, importErrorStr)) {
                        e.message = 'Cannot use import statement inside the Node.js ' +
                            'REPL, alternatively use dynamic import';
                        e.stack = StringPrototypeReplace(e.stack,
                            /SyntaxError:.*\n/,
                            `SyntaxError: ${e.message}\n`);
                    }
                } else if (that.replMode === module.exports.REPL_MODE_STRICT) {
                    e.stack = StringPrototypeReplace(
                        e.stack,
                        /(\s+at\s+REPL\d+:)(\d+)/,
                        (_, pre, line) => pre + (line - 1)
                    );
                }
            }
            errStack = that.writer(e);

            // Remove one line error braces to keep the old style in place.
            if (errStack[errStack.length - 1] === ']') {
                errStack = StringPrototypeSlice(errStack, 1, -1);
            }
        }
    }

    if (!that.underscoreErrAssigned) {
        that.lastError = e;
    }

    if (options[kStandaloneREPL] &&
        process.listenerCount('uncaughtException') !== 0) {
        process.nextTick(() => {
            process.emit('uncaughtException', e);
            that.clearBufferedCommand();
            that.lines.level = [];
            that.displayPrompt();
        });
    } else {
        if (errStack === '') {
            errStack = that.writer(e);
        }
        const lines = StringPrototypeSplit(errStack, /(?<=\n)/);
        let matched = false;

        errStack = '';
        for (const line of lines) {
            if (!matched &&
                RegExpPrototypeTest(/^\[?([A-Z][a-z0-9_]*)*Error/, line)) {
                errStack += writer.options.breakLength >= line.length ?
                    `Uncaught ${line}` :
                    `Uncaught:\n${line}`;
                matched = true;
            } else {
                errStack += line;
            }
        }
        if (!matched) {
            const ln = lines.length === 1 ? ' ' : ':\n';
            errStack = `Uncaught${ln}${errStack}`;
        }
        // Normalize line endings.
        errStack += StringPrototypeEndsWith(errStack, '\n') ? '' : '\n';
        that.output.write(errStack);
        that.clearBufferedCommand();
        that.lines.level = [];
        that.displayPrompt();
    }
}

////wrap readline tty
function tty_write_handle_non_editor_or_non_terminal(
    self,key,d,
    clearPreview,reverseSearch,
    showPreview,
    ttyWrite
) {
    // Before exiting, make sure to clear the line.
    if (
        key.ctrl && key.name === 'd' &&
        self.cursor === 0 &&
        self.line.length === 0
    ) {
       self.clearLine();
    }
    clearPreview(key);
    if (!reverseSearch(d, key)) {
       ttyWrite(d, key);
       showPreview();
    }
}



function tty_write_handle_dnp(self,key,d,sigd,ttyWrite) {
    switch (key.name) {
    case 'd': // End editor mode
         _turnOffEditorMode(self);
         sigd.sawCtrlD = true;
         ttyWrite(d, { name: 'return' });
         break;
     case 'n': // Override next history item
     case 'p': // Override previous history item
         break;
     default:
         ttyWrite(d, key);
    }
}

function tty_wrtie_handle_up_down_tab(self,key,d,ttyWrite) {
    switch (key.name) {
        case 'up':   // Override previous history item
        case 'down': // Override next history item
            break;
        case 'tab':
            // Prevent double tab behavior
            self._previousKey = null;
            ttyWrite(d, key);
            break;
        default:
            ttyWrite(d, key);
    }
}


function _wrap_readline_tty_factory(self,options,paused,pausedBuffer,sigd) {
    const preview = options.terminal && (options.preview !== undefined ? !!options.preview : !options.eval);
    const {
        clearPreview,
        showPreview
    } = setupPreview(
        self,
        kContextId,
        kBufferedCommandSymbol,
        preview
    );
    const { reverseSearch } = setupReverseSearch(self);
    ////
    const ttyWrite = FunctionPrototypeBind(self._ttyWrite, self);
    let f = (d, key) => {
        key = key || {};
        if (
            paused &&
            !(self.breakEvalOnSigint && key.ctrl && key.name === 'c')
        ) {
              ArrayPrototypePush(
                  pausedBuffer,
                  ['key', [d, key], self.isCompletionEnabled]
              );
              return;
        }
        if (!self.editorMode || !self.terminal) {
            tty_write_handle_non_editor_or_non_terminal(self,key,d,clearPreview,reverseSearch,showPreview,ttyWrite);
            return;
        }
        // Editor mode
        if (key.ctrl && !key.shift) {
             tty_write_handle_dnp(self,key,d,sigd,ttyWrite);
        } else {
             tty_wrtie_handle_up_down_tab(self,key,d,ttyWrite);
        }
    };
    return(f)
}


////creatContext
const { Console } = require('console');

function _createContext(that) {
    let context;
    if (that.useGlobal) {
        context = global;
    } else {
        sendInspectorCommand((session) => {
            session.post('Runtime.enable');
            session.once('Runtime.executionContextCreated', ({
                params
            }) => {
                that[kContextId] = params.context.id;
            });
            context = vm.createContext();
            session.post('Runtime.disable');
        }, () => {
            context = vm.createContext();
        });
        for (const name of ObjectGetOwnPropertyNames(global)) {
            // Only set properties that do not already exist as a global builtin.
            if (!globalBuiltins.has(name)) {
                ObjectDefineProperty(context, name,
                    ObjectGetOwnPropertyDescriptor(global, name));
            }
        }
        context.global = context;
        const _console = new Console(that.output);
        ObjectDefineProperty(context, 'console', {
            configurable: true,
            writable: true,
            value: _console
        });
    }
    const replModule = new CJSModule('<repl>');
    replModule.paths = CJSModule._resolveLookupPaths('<repl>', parentModule);
    ObjectDefineProperty(context, 'module', {
        configurable: true,
        writable: true,
        value: replModule
    });
    ObjectDefineProperty(context, 'require', {
        configurable: true,
        writable: true,
        value: makeRequireFunction(replModule)
    });
    addBuiltinLibsToObject(context);
    return context;
}


////resetContext
function _resetContext(that) {
    that.context = that.createContext();
    that.underscoreAssigned = false;
    that.underscoreErrAssigned = false;
    // TODO(BridgeAR): Deprecate the lines.
    that.lines = [];
    that.lines.level = [];
    ObjectDefineProperty(that.context, '_', {
        configurable: true,
        get: () => that.last,
        set: (value) => {
            that.last = value;
            if (!that.underscoreAssigned) {
                that.underscoreAssigned = true;
                that.output.write('Expression assignment to _ now disabled.\n');
            }
        }
    });
    ObjectDefineProperty(that.context, '_error', {
        configurable: true,
        get: () => that.lastError,
        set: (value) => {
            that.lastError = value;
            if (!that.underscoreErrAssigned) {
                that.underscoreErrAssigned = true;
                that.output.write(
                    'Expression assignment to _error now disabled.\n');
            }
        }
    });
    // Allow REPL extensions to extend the new context
    that.emit('reset', that.context);
}


////define commands

function _turnOnEditorMode(repl) {
  repl.editorMode = true;
  ReflectApply(Interface.prototype.setPrompt, repl, ['']);
}

function _turnOffEditorMode(repl) {
  repl.editorMode = false;
  repl.setPrompt(repl._initialPrompt);
}


function defineDefaultCommands(repl) {
    repl.defineCommand('break', {
        help: 'Sometimes you get stuck, this gets you out',
        action: function() {
            this.clearBufferedCommand();
            this.displayPrompt();
        }
    });

    let clearMessage;
    if (repl.useGlobal) {
        clearMessage = 'Alias for .break';
    } else {
        clearMessage = 'Break, and also clear the local context';
    }
    repl.defineCommand('clear', {
        help: clearMessage,
        action: function() {
            this.clearBufferedCommand();
            if (!this.useGlobal) {
                this.output.write('Clearing context...\n');
                this.resetContext();
            }
            this.displayPrompt();
        }
    });

    repl.defineCommand('exit', {
        help: 'Exit the REPL',
        action: function() {
            this.close();
        }
    });

    repl.defineCommand('help', {
        help: 'Print this help message',
        action: function() {
            const names = ArrayPrototypeSort(ObjectKeys(this.commands));
            const longestNameLength = MathMax(
                ...ArrayPrototypeMap(names, (name) => name.length)
            );
            for (let n = 0; n < names.length; n++) {
                const name = names[n];
                const cmd = this.commands[name];
                const spaces =
                    StringPrototypeRepeat(' ', longestNameLength - name.length + 3);
                const line = `.${name}${cmd.help ? spaces + cmd.help : ''}\n`;
                this.output.write(line);
            }
            this.output.write('\nPress Ctrl+C to abort current expression, ' +
                'Ctrl+D to exit the REPL\n');
            this.displayPrompt();
        }
    });

    repl.defineCommand('save', {
        help: 'Save all evaluated commands in this REPL session to a file',
        action: function(file) {
            try {
                fs.writeFileSync(file, ArrayPrototypeJoin(this.lines, '\n'));
                this.output.write(`Session saved to: ${file}\n`);
            } catch {
                this.output.write(`Failed to save: ${file}\n`);
            }
            this.displayPrompt();
        }
    });

    repl.defineCommand('load', {
        help: 'Load JS from a file into the REPL session',
        action: function(file) {
            try {
                const stats = fs.statSync(file);
                if (stats && stats.isFile()) {
                    _turnOnEditorMode(this);
                    const data = fs.readFileSync(file, 'utf8');
                    this.write(data);
                    _turnOffEditorMode(this);
                    this.write('\n');
                } else {
                    this.output.write(
                        `Failed to load: ${file} is not a valid file\n`
                    );
                }
            } catch {
                this.output.write(`Failed to load: ${file}\n`);
            }
            this.displayPrompt();
        }
    });
    if (repl.terminal) {
        repl.defineCommand('editor', {
            help: 'Enter editor mode',
            action() {
                _turnOnEditorMode(this);
                this.output.write(
                    '// Entering editor mode (Ctrl+D to finish, Ctrl+C to cancel)\n');
            }
        });
    }
}


////define_builtin
const CJSModule = require('internal/modules/cjs/loader').Module;
let _builtinLibs = ArrayPrototypeFilter(
  CJSModule.builtinModules,
  (e) => !StringPrototypeStartsWith(e, '_') && !StringPrototypeIncludes(e, '/')
);
const pendingDeprecation = getOptionValue('--pending-deprecation');

function define_builtin(m) {
    ObjectDefineProperty(m.exports, 'builtinms', {
      get: () => _builtinLibs,
      set: (val) => _builtinLibs = val,
      enumerable: true,
      configurable: true
    });
    ObjectDefineProperty(m.exports, '_builtinLibs', {
      get: pendingDeprecation ? deprecate(
        () => _builtinLibs,
        'repl._builtinLibs is deprecated. Check m.builtinms instead',
        'DEP0142'
      ) : () => _builtinLibs,
      set: pendingDeprecation ? deprecate(
        (val) => _builtinLibs = val,
        'repl._builtinLibs is deprecated. Check m.builtinms instead',
        'DEP0142'
      ) : (val) => _builtinLibs = val,
      enumerable: false,
      configurable: true
    });
}

define_builtin(module);

////deprecate

function define_deprecate_input_stream(self){
    ObjectDefineProperty(self, 'inputStream', {
      get: pendingDeprecation ?
        deprecate(() => self.input,
                  'repl.inputStream and repl.outputStream are deprecated. ' +
                    'Use repl.input and repl.output instead',
                  'DEP0141') :
        () => self.input,
      set: pendingDeprecation ?
        deprecate((val) => self.input = val,
                  'repl.inputStream and repl.outputStream are deprecated. ' +
                    'Use repl.input and repl.output instead',
                  'DEP0141') :
        (val) => self.input = val,
      enumerable: false,
      configurable: true
    });
}


function define_deprecate_output_stream(self){
    ObjectDefineProperty(self, 'outputStream', {
      get: pendingDeprecation ?
        deprecate(() => self.output,
                  'repl.inputStream and repl.outputStream are deprecated. ' +
                    'Use repl.input and repl.output instead',
                  'DEP0141') :
        () => self.output,
      set: pendingDeprecation ?
        deprecate((val) => self.output = val,
                  'repl.inputStream and repl.outputStream are deprecated. ' +
                    'Use repl.input and repl.output instead',
                  'DEP0141') :
        (val) => self.output = val,
      enumerable: false,
      configurable: true
    });
}


////command

const { commonPrefix} = require('internal/readline/utils');
function _defineCommand(that,keyword, cmd) {
    if (typeof cmd === 'function') {
        cmd = {
            action: cmd
        };
    } else if (typeof cmd.action !== 'function') {
        throw new ERR_INVALID_ARG_TYPE('cmd.action', 'Function', cmd.action);
    }
    that.commands[keyword] = cmd;
};


function _completeOnEditorMode(callback) {
    return(
        (err, results) => {
            if (err) return callback(err);
            const [completions, completeOn = ''] = results;
            let result = ArrayPrototypeFilter(completions, Boolean);
            if (completeOn && result.length !== 0) {
              result = [commonPrefix(result)];
            }
            callback(null, [result, completeOn]);
        }
    )
}



////methods
function _displayPrompt(that,preserveCursor) {
    let prompt = that._initialPrompt;
    if (that[kBufferedCommandSymbol].length) {
        prompt = '...';
        const len = that.lines.level.length ? that.lines.level.length - 1 : 0;
        const levelInd = StringPrototypeRepeat('..', len);
        prompt += levelInd + ' ';
    }
    // Do not overwrite `_initialPrompt` here
    ReflectApply(Interface.prototype.setPrompt, that, [prompt]);
    that.prompt(preserveCursor);
};

function _close(that) {
    if (that.terminal && that._flushing && !that._closingOnFlush) {
        that._closingOnFlush = true;
        that.once('flushHistory', () =>
            ReflectApply(Interface.prototype.close, that, [])
        );
    
        return;
    }
    process.nextTick(() =>
        ReflectApply(Interface.prototype.close, that, [])
    );
}


////

function set_stream(options,stream) {
    if (!options.input && !options.output) {
        // Legacy API, passing a 'stream'/'socket' option.
        if (!stream) {
            // Use stdin and stdout as the default streams if none were given.
            stream = process;
        }
        // We're given a duplex readable/writable Stream, like a `net.Socket`
        // or a custom object with 2 streams, or the `process` object.
        options.input = stream.stdin || stream;
        options.output = stream.stdout || stream;
    }
    return(stream)
}


function set_term_and_clrs(options) {
    if (options.terminal === undefined) {
        options.terminal = options.output.isTTY;
    }
    options.terminal = !!options.terminal;
    
    if (options.terminal && options.useColors === undefined) {
        // If possible, check if stdout supports colors or not.
        if (options.output.hasColors) {
            options.useColors = options.output.hasColors();
        } else if (process.env.NODE_DISABLE_COLORS === undefined) {
            options.useColors = true;
        }
    }
}


////
const domain = require('domain');

function set_property(self,options,useGlobal,ignoreUndefined,replMode) {
    self.useColors = !!options.useColors;
    self._domain = options.domain || domain.create();
    self.useGlobal = !!useGlobal;
    self.ignoreUndefined = !!ignoreUndefined;
    self.replMode = replMode || module.exports.REPL_MODE_SLOPPY;
    self.underscoreAssigned = false;
    self.last = undefined;
    self.underscoreErrAssigned = false;
    self.lastError = undefined;
    self.breakEvalOnSigint = !!options.breakEvalOnSigint;
    self.editorMode = false;
    self[kContextId] = undefined;
}








let debug = require('internal/util/debuglog').debuglog('repl', (fn) => {
  debug = fn;
});
const {
  codes: {
    ERR_CANNOT_WATCH_SIGINT,
    ERR_INVALID_ARG_TYPE,
    ERR_INVALID_REPL_EVAL_CONFIG,
    ERR_INVALID_REPL_INPUT,
    ERR_SCRIPT_EXECUTION_INTERRUPTED,
  },
  overrideStackTrace,
} = require('internal/errors');
const { sendInspectorCommand } = require('internal/util/inspector');
const {
  REPL_MODE_SLOPPY,
  REPL_MODE_STRICT,
  isRecoverableError,
  kStandaloneREPL,
  setupPreview,
  setupReverseSearch,
} = require('internal/repl/utils');
const {
  getOwnNonIndexProperties,
  propertyFilter: {
    ALL_PROPERTIES,
    SKIP_SYMBOLS
  }
} = internalBinding('util');
const {
  startSigintWatchdog,
  stopSigintWatchdog
} = internalBinding('contextify');

let addedNewListener = false;


const history = require('internal/repl/history');


const globalBuiltins =
  new SafeSet(vm.runInNewContext('Object.getOwnPropertyNames(globalThis)'));

const parentModule = module;

////domainSet
const domainSet = new SafeWeakSet();
function add_new_listener_if_standalone(self,options) { 
    if (options[kStandaloneREPL]) {
        module.exports.repl = self;
    } else if (!addedNewListener) {
        process.prependListener('newListener', (event, listener) => {
            if (event === 'uncaughtException' &&
                process.domain &&
                listener.name !== 'domainUncaughtExceptionClear' &&
                domainSet.has(process.domain)) {
                throw new ERR_INVALID_REPL_INPUT(
                    'Listeners for `uncaughtException` cannot be used in the REPL');
            }
        });
        addedNewListener = true;
    }
}
////



////check sigint
function check_break_eval_on_sigint(self,eval_) {
    if (self.breakEvalOnSigint && eval_) {
      // Allowing this would not reflect user expectations.
      // breakEvalOnSigint affects only the behavior of the default eval().
      throw new ERR_INVALID_REPL_EVAL_CONFIG();
    }
}
////


const kBufferedCommandSymbol = Symbol('bufferedCommand');
const kContextId = Symbol('contextId');


try {
  // Hack for require.resolve("./relative") to work properly.
  module.filename = path.resolve('repl');
} catch {
  // path.resolve('repl') fails when the current working directory has been
  // deleted.  Fall back to the directory name of the (absolute) executable
  // path.  It's not really correct but what are the alternatives?
  const dirname = path.dirname(process.execPath);
  module.filename = path.resolve(dirname, 'repl');
}

// Hack for repl require to work properly with node_modules folders
module.paths = CJSModule._nodeModulePaths(module.filename);





////repl resource

let nextREPLResourceNumber = 1;
function getREPLResourceName() {
    // This prevents v8 code cache from getting confused and using a different
    // cache from a resource of the same name
    return `REPL${nextREPLResourceNumber++}`;
}



////default writer
function creat_dflt_writer() {
    // This is the default "writer" value, if none is passed in the REPL options,
    // and it can be overridden by custom print functions, such as `probe` or
    // `eyes.js`.
    const writer = (obj) => inspect(obj, writer.options);
    writer.options = { ...inspect.defaultOptions, showProxy: true };
    return(writer)
}

const writer = creat_dflt_writer();


function set_writer(that,options) {
    that.writer = options.writer || module.exports.writer;
    if (that.writer === writer) {
        // Conditionally turn on ANSI coloring.
        writer.options.colors = that.useColors;
        if (options[kStandaloneREPL]) {
            ObjectDefineProperty(inspect, 'replDefaults', {
                get() {
                    return writer.options;
                },
                set(options) {
                    if (options === null || typeof options !== 'object') {
                        throw new ERR_INVALID_ARG_TYPE('options', 'Object', options);
                    }
                    return ObjectAssign(writer.options, options);
                },
                enumerable: true,
                configurable: true
            });
        }
    }
}


////Recoverable
function creat_recoverable_cls() {
    function Recoverable(err) {this.err = err;}
    ObjectSetPrototypeOf(Recoverable.prototype, SyntaxErrorPrototype);
    ObjectSetPrototypeOf(Recoverable, SyntaxError);
    return(Recoverable)
}

let  Recoverable = creat_recoverable_cls();

////



function REPLServer(
    prompt,
    stream,
    eval_,
    useGlobal,
    ignoreUndefined,
    replMode
) {
    ////check instance
    if (!(this instanceof REPLServer)) {
        return new REPLServer(
            prompt,
            stream,
            eval_,
            useGlobal,
            ignoreUndefined,
            replMode
        );
    }
    ////format params
    let options;
    if (prompt !== null && typeof prompt === 'object') {
        // An options object was given.
        options = {
            ...prompt
        };
        stream = options.stream || options.socket;
        eval_ = options.eval;
        useGlobal = options.useGlobal;
        ignoreUndefined = options.ignoreUndefined;
        prompt = options.prompt;
        replMode = options.replMode;
    } else {
        options = {};
    }
    ////
    set_stream(options,stream);
    ////
    set_term_and_clrs(options);
    ////deprecate
    define_deprecate_input_stream(this);
    define_deprecate_output_stream(this);
    ////
    set_property(this,options,useGlobal,ignoreUndefined,replMode);
    ////
    check_break_eval_on_sigint(this,eval_);
    ////
    add_new_listener_if_standalone(this,options);
    domainSet.add(this._domain);
    ////
    const self = this;
    //pause unpause
    const pausedBuffer = [];
    let paused = false;
    function pause() {paused = true;}
    function unpause() {paused = _unpause(self,paused,pausedBuffer);}
    ////eval
    eval_ = eval_ || function defaultEval(code, context, file, cb) {
        _defaultEval(self,pause,unpause,code, context, file, cb,prioritizedSigintQueue);
  };    
    self.eval = self._domain.bind(eval_);
    ////domain on error
    self._domain.on('error', function debugDomainError(e) {
        _debugDomainError(self,options,e)
    });
    ////
    self.clearBufferedCommand();
    apply_readline_interface(self,options,prompt);
    ////  
    self.resetContext();
    this.commands = ObjectCreate(null);
    defineDefaultCommands(this);
    ////set writer
    set_writer(self,options);
    ////on close
    self.on('close', function emitExit() {
        _emitExit(self,paused,pausedBuffer)
    });
    ////sigd and prioritizedSigintQueue
    let sigd = {sawSIGINT:false,sawCtrlD:false}
    const prioritizedSigintQueue = new SafeSet();
    ////sigint
    self.on('SIGINT', function onSigInt() {
        _onSigInt(self,prioritizedSigintQueue,sigd);
    });
    ////line
    self.on('line', function onLine(cmd) {
        _onLine(self,cmd,sigd);
    });
    ////sig cont
    self.on('SIGCONT', function onSigCont() {_onSigCont(self)});
    ////tty write bind 
    self._ttyWrite = _wrap_readline_tty_factory(self,options,paused,pausedBuffer,sigd); 
    self.displayPrompt();
}
ObjectSetPrototypeOf(REPLServer.prototype, Interface.prototype);
ObjectSetPrototypeOf(REPLServer, Interface);


REPLServer.prototype.setupHistory = function setupHistory(historyFile, cb) {
  history(this, historyFile, cb);
};

REPLServer.prototype.clearBufferedCommand = function clearBufferedCommand() {
  this[kBufferedCommandSymbol] = '';
};

REPLServer.prototype.close = function close() {_close(this)};

REPLServer.prototype.createContext = function() {return(_createContext(this))};

REPLServer.prototype.resetContext = function() {_resetContext(this)};

REPLServer.prototype.displayPrompt = function(preserveCursor) {
    _displayPrompt(this,preserveCursor);
};

REPLServer.prototype.setPrompt = function setPrompt(prompt) {
    // When invoked as an API method, overwrite _initialPrompt
    this._initialPrompt = prompt;
    ReflectApply(Interface.prototype.setPrompt, this, [prompt]);
};

REPLServer.prototype.complete = function() {
    ReflectApply(this.completer, this, arguments);
};


REPLServer.prototype.completeOnEditorMode = (callback) => {
    return(_completeOnEditorMode(callback));
};

REPLServer.prototype.defineCommand = function(keyword, cmd) {
    _defineCommand(this,keyword, cmd);
};


function start(prompt, source, eval_, useGlobal, ignoreUndefined, replMode) {
    // Prompt is a string to print on each line for the prompt,
    // source is a stream to use for I/O, defaulting to stdin/stdout.
    return new REPLServer(
        prompt, source, eval_, useGlobal, ignoreUndefined, replMode
    );
}


module.exports = {
    ////
    start,
    writer,
    REPLServer,
    REPL_MODE_SLOPPY,
    REPL_MODE_STRICT,
    Recoverable,
    ////let
    processTopLevelAwait,
    addedNewListener, 
    nextREPLResourceNumber,
    ////const
    experimentalREPLAwait,
    commonPrefix,
    domainSet,
    kBufferedCommandSymbol,
    kContextId,
    ////
    ////function
    _unpause,
    wrap_code_in_parentheses,
    wrap_code_if_repl_await,
    getParentURL,
    wrap_if_use_strict,
    creat_script,
    unwrap_and_try_again,
    preserve_original_error,
    creat_script_recoverably,
    run_in_context_and_handle_top_await,
    setSavedRegExMatches,
    getPreviouslyInRawMode,
    reset_terminal_mode,
    _run_in_context,
    run_in_context,
    handleBreakEvalOnSigint,
    finishExecution,
    repl_await_promise_finally,
    handle_await_promise,
    _defaultEval,
    complete_repl_commands,
    get_complete_require_paths,
    gracefulReaddir,
     fill_complete_require_group_with_paths,
    complete_require,
    completeFSFunctions,
    filter_completion_groups,
    uniq_completions_across_all_groups,
    completionGroupsLoaded,
    get_complete_simple_expr,
    addCommonWords,
    getGlobalLexicalScopeNames,
    isIdentifier,
    filteredOwnPropertyNames,
    resolve_empty_expr_and_get_completions,
    resolve_expr_and_get_completions,
    _complete,
    _completer,
    apply_readline_interface,
    _emitExit,
    _onSigInt,
    _parseREPLKeyword,
    _memory,
    memory_line_in_editor_mode,
    check_repl_keywords,
    syntax_error_in_lines_finish,
    npm_error_in_lines_finish,
    print_when_lines_finish,
    lines_finish,
    _onLine,
    _onSigCont,
    _debugDomainError,
    tty_write_handle_non_editor_or_non_terminal,
    tty_write_handle_dnp,
    tty_wrtie_handle_up_down_tab,
    _wrap_readline_tty_factory,
    _createContext,
    _resetContext,
    _turnOnEditorMode,
    _turnOffEditorMode,
    defineDefaultCommands,
    define_builtin,
    define_deprecate_input_stream,
    define_deprecate_output_stream,
    _defineCommand,
    _completeOnEditorMode,
    _displayPrompt,
    _close,
    set_stream,
    set_term_and_clrs,
    set_property,
    add_new_listener_if_standalone,
    check_break_eval_on_sigint,
    getREPLResourceName,
    creat_dflt_writer,
    set_writer,
    creat_recoverable_cls,
};


