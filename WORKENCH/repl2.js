/* A REPL library that you can include in your own code to get a runtime
 * interface to your program.
 *
 *   const repl = require("repl");
 *   // start repl on stdin
 *   repl.start("prompt> ");
 *
 *   // listen for unix socket connections and start repl on them
 *   net.createServer(function(socket) {
 *     repl.start("node via Unix socket> ", socket);
 *   }).listen("/tmp/node-repl-sock");
 *
 *   // listen for TCP socket connections and start repl on them
 *   net.createServer(function(socket) {
 *     repl.start("node via TCP socket> ", socket);
 *   }).listen(5001);
 *
 *   // expose foo to repl context
 *   repl.start("node > ").context.foo = "stdin is fun";
 */

'use strict';

const {
  Error,
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
  PromiseRace,
  RegExp,
  Set,
  StringPrototypeCharAt,
  StringPrototypeIncludes,
  StringPrototypeMatch,
  Symbol,
} = primordials;

const {
  makeRequireFunction,
  addBuiltinLibsToObject
} = require('internal/modules/cjs/helpers');
const {
  decorateErrorStack,
  isError,
  deprecate
} = require('internal/util');
const { inspect } = require('internal/util/inspect');
const vm = require('vm');
const path = require('path');
const fs = require('fs');
const { Interface } = require('readline');
const { Console } = require('console');
const CJSModule = require('internal/modules/cjs/loader').Module;
let _builtinLibs = [...CJSModule.builtinModules]
  .filter((e) => !e.startsWith('_') && !e.includes('/'));
const domain = require('domain');
let debug = require('internal/util/debuglog').debuglog('repl', (fn) => {
  debug = fn;
});
const {
  codes: {
    ERR_CANNOT_WATCH_SIGINT,
    ERR_INVALID_ARG_TYPE,
    ERR_SCRIPT_EXECUTION_INTERRUPTED,
  },
  overrideStackTrace,
} = require('internal/errors');
const { sendInspectorCommand } = require('internal/util/inspector');
const { getOptionValue } = require('internal/options');
const experimentalREPLAwait = getOptionValue('--experimental-repl-await');

const {
  REPL_MODE_SLOPPY,
  REPL_MODE_STRICT,
  isRecoverableError,
  kStandaloneREPL,
  setupPreview,
  setupReverseSearch,
} = require('internal/repl/utils');

const {
  startSigintWatchdog,
  stopSigintWatchdog
} = internalBinding('contextify');

const history = require('internal/repl/history');

// Lazy-loaded.
//let processTopLevelAwait;
let processTopLevelAwait = true;
const globalBuiltins =new Set(vm.runInNewContext('Object.getOwnPropertyNames(globalThis)'));
const parentModule = module;




const {
    getREPLResourceName,
    kBufferedCommandSymbol,
    set_module_filename,
    get_dflt_writer,
    kContextId,
    creat_options,
    set_stream,
    set_terminal,
    set_use_colors,
    set_preview,
    defineInputStream,
    defineOutputStream,
    defineBuiltinLibs,
    set_property,
    checkBreakEvalOnSigint,
    checkStandaloneREPLandAddNewListener,
    unpause,
    addCommonWords,
    creatRecoverable,
    _turnOnEditorMode,
    _turnOffEditorMode,
    defineCommand,
    defineBreakCommand,
    defineClearCommand,
    defineExitCommand,
    defineHelpCommand,
    defineSaveCommand,
    defineEditorCommand,
    defineLoadCommand,
    defineDefaultCommands,
    completeOnEditorMode,
    _memory,
    isIdentifier,
    setOnClose,
    resetContext,
    displayPrompt,
    _setPrompt,
    complete,
    createContext,
    _close,
} = require("repl_util");


set_module_filename(module);
const writer = get_dflt_writer();
const Recoverable = creatRecoverable()


function REPLServer(prompt,
                    stream,
                    eval_,
                    useGlobal,
                    ignoreUndefined,
                    replMode) {
  if (!(this instanceof REPLServer)) {
    return new REPLServer(prompt,
                          stream,
                          eval_,
                          useGlobal,
                          ignoreUndefined,
                          replMode);
  }

  let d = creat_options(prompt,stream,eval_,useGlobal,ignoreUndefined,replMode);
  ////
  let options = d.options;
  prompt = d.prompt;
  eval_ = d.eval_;
  stream = set_stream(options);
  useGlobal =d.useGlobal;
  ignoreUndefined = d.ignoreUndefined;
  replMode = d.replMode;
  ////
  set_terminal(options);
  set_use_colors(options);
  const preview = set_preview(options,eval_);
  //// 
  defineInputStream(this);
  defineOutputStream(this);
  set_property(this,options,domain,useGlobal,ignoreUndefined,replMode,module);
  checkBreakEvalOnSigint(this,eval_);
  checkStandaloneREPLandAddNewListener(this,options,module);

  const savedRegExMatches = ['', '', '', '', '', '', '', '', '', ''];
  const sep = '\u0000\u0000\u0000';
  const regExMatcher = new RegExp(`^${sep}(.*)${sep}(.*)${sep}(.*)${sep}(.*)` +
                                  `${sep}(.*)${sep}(.*)${sep}(.*)${sep}(.*)` +
                                  `${sep}(.*)$`);

  eval_ = eval_ || defaultEval;

  const self = this;

  // Pause taking in new input, and store the keys in a buffer.
  const pausedBuffer = [];
  let paused = false;
  function pause() { paused = true;}


  function defaultEval(code, context, file, cb) {
    const asyncESM = require('internal/process/esm_loader');
    let result, script, wrappedErr;
    let err = null;
    let wrappedCmd = false;
    let awaitPromise = false;
    const input = code;
    // It's confusing for `{ a : 1 }` to be interpreted as a block
    // statement rather than an object literal.  So, we first try
    // to wrap it in parentheses, so that it will be interpreted as
    // an expression.  Note that if the above condition changes,
    // lib/internal/repl/utils.js needs to be changed to match.
    if (/^\s*{/.test(code) && !/;\s*$/.test(code)) {
      code = `(${code.trim()})\n`;
      wrappedCmd = true;
    }
    
    //
    

    if (experimentalREPLAwait && code.includes('await')) {
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

    // First, create the Script object to check the syntax
    if (code === '\n')
      return cb(null);

    let parentURL;
    try {
      const { pathToFileURL } = require('url');
      // Adding `/repl` prevents dynamic imports from loading relative
      // to the parent of `process.cwd()`.
      parentURL = pathToFileURL(path.join(process.cwd(), 'repl')).href;
    } catch {
    }


    while (true) {
      try {
        if (self.replMode === module.exports.REPL_MODE_STRICT &&
            !/^\s*$/.test(code)) {
          // "void 0" keeps the repl from returning "use strict" as the result
          // value for statements and declarations that don't return a value.
          code = `'use strict'; void 0;\n${code}`;
        }
        script = vm.createScript(code, {
          filename: file,
          displayErrors: true,
          importModuleDynamically: async (specifier) => {
            return asyncESM.ESMLoader.import(specifier, parentURL);
          }
        });
      } catch (e) {
        debug('parse error %j', code, e);
        if (wrappedCmd) {
          // Unwrap and try again
          wrappedCmd = false;
          awaitPromise = false;
          code = input;
          wrappedErr = e;
          continue;
        }
        // Preserve original error for wrapped command
        const error = wrappedErr || e;
        if (isRecoverableError(error, code))
          err = new Recoverable(error);
        else
          err = error;
      }
      break;
    }

    // This will set the values from `savedRegExMatches` to corresponding
    // predefined RegExp properties `RegExp.$1`, `RegExp.$2` ... `RegExp.$9`
    regExMatcher.test(savedRegExMatches.join(sep));

    let finished = false;
    function finishExecution(err, result) {
      if (finished) return;
      finished = true;

      // After executing the current expression, store the values of RegExp
      // predefined properties back in `savedRegExMatches`
      for (let idx = 1; idx < savedRegExMatches.length; idx += 1) {
        savedRegExMatches[idx] = RegExp[`$${idx}`];
      }

      cb(err, result);
    }

    if (!err) {
      // Unset raw mode during evaluation so that Ctrl+C raises a signal.
      let previouslyInRawMode;
      if (self.breakEvalOnSigint) {
        // Start the SIGINT watchdog before entering raw mode so that a very
        // quick Ctrl+C doesn't lead to aborting the process completely.
        if (!startSigintWatchdog())
          throw new ERR_CANNOT_WATCH_SIGINT();
        previouslyInRawMode = self._setRawMode(false);
      }

      try {
        try {
          const scriptOptions = {
            displayErrors: false,
            breakOnSigint: self.breakEvalOnSigint
          };

          if (self.useGlobal) {
            result = script.runInThisContext(scriptOptions);
          } else {
            result = script.runInContext(context, scriptOptions);
          }
        } finally {
          if (self.breakEvalOnSigint) {
            // Reset terminal mode to its previous value.
            self._setRawMode(previouslyInRawMode);

            // Returns true if there were pending SIGINTs *after* the script
            // has terminated without being interrupted itself.
            if (stopSigintWatchdog()) {
              self.emit('SIGINT');
            }
          }
        }
      } catch (e) {
        err = e;

        if (process.domain) {
          debug('not recoverable, send to domain');
          process.domain.emit('error', err);
          process.domain.exit();
          return;
        }
      }

      if (awaitPromise && !err) {
        let sigintListener;
        pause();
        let promise = result;
        if (self.breakEvalOnSigint) {
          const interrupt = new Promise((resolve, reject) => {
            sigintListener = () => {
              const tmp = Error.stackTraceLimit;
              Error.stackTraceLimit = 0;
              const err = new ERR_SCRIPT_EXECUTION_INTERRUPTED();
              Error.stackTraceLimit = tmp;
              reject(err);
            };
            prioritizedSigintQueue.add(sigintListener);
          });
          promise = PromiseRace([promise, interrupt]);
        }

        promise.then((result) => {
          finishExecution(null, result);
        }, (err) => {
          if (err && process.domain) {
            debug('not recoverable, send to domain');
            process.domain.emit('error', err);
            process.domain.exit();
            return;
          }
          finishExecution(err);
        }).finally(() => {
          // Remove prioritized SIGINT listener if it was not called.
          prioritizedSigintQueue.delete(sigintListener);
          paused = unpause(this,paused,pausedBuffer);
        });
      }
    }

    if (!awaitPromise || err) {
      finishExecution(err, result);
    }
  }

  self.eval = self._domain.bind(eval_);

  self._domain.on('error', function debugDomainError(e) {
    debug('domain error');
    let errStack = '';

    if (typeof e === 'object' && e !== null) {
      overrideStackTrace.set(e, (error, stackFrames) => {
        let frames;
        if (typeof stackFrames === 'object') {
          // Search from the bottom of the call stack to
          // find the first frame with a null function name
          const idx = stackFrames
            .reverse()
            .findIndex((frame) => frame.getFunctionName() === null);
          // If found, get rid of it and everything below it
          frames = stackFrames.splice(idx + 1);
        } else {
          frames = stackFrames;
        }
        // FIXME(devsnek): this is inconsistent with the checks
        // that the real prepareStackTrace dispatch uses in
        // lib/internal/errors.js.
        if (typeof Error.prepareStackTrace === 'function') {
          return Error.prepareStackTrace(error, frames);
        }
        frames.push(error);
        return frames.reverse().join('\n    at ');
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
            e.stack = e.stack
              .replace(/^REPL\d+:\d+\r?\n/, '')
              .replace(/^\s+at\s.*\n?/gm, '');
            const importErrorStr = 'Cannot use import statement outside a ' +
              'module';
            if (StringPrototypeIncludes(e.message, importErrorStr)) {
              e.message = 'Cannot use import statement inside the Node.js ' +
                'REPL, alternatively use dynamic import';
              e.stack = e.stack.replace(/SyntaxError:.*\n/,
                                        `SyntaxError: ${e.message}\n`);
            }
          } else if (self.replMode === module.exports.REPL_MODE_STRICT) {
            e.stack = e.stack.replace(/(\s+at\s+REPL\d+:)(\d+)/,
                                      (_, pre, line) => pre + (line - 1));
          }
        }
        errStack = self.writer(e);

        // Remove one line error braces to keep the old style in place.
        if (errStack[errStack.length - 1] === ']') {
          errStack = errStack.slice(1, -1);
        }
      }
    }

    if (!self.underscoreErrAssigned) {
      self.lastError = e;
    }

    if (options[kStandaloneREPL] &&
        process.listenerCount('uncaughtException') !== 0) {
      process.nextTick(() => {
        process.emit('uncaughtException', e);
        self.clearBufferedCommand();
        self.lines.level = [];
        self.displayPrompt();
      });
    } else {
      if (errStack === '') {
        errStack = self.writer(e);
      }
      const lines = errStack.split(/(?<=\n)/);
      let matched = false;

      errStack = '';
      for (const line of lines) {
        if (!matched && /^\[?([A-Z][a-z0-9_]*)*Error/.test(line)) {
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
      errStack += errStack.endsWith('\n') ? '' : '\n';
      self.output.write(errStack);
      self.clearBufferedCommand();
      self.lines.level = [];
      self.displayPrompt();
    }
  });

  self.clearBufferedCommand();

  function completer(text, cb) {
      complete.call(
          self,
          module,
          text, 
          self.editorMode ?self.completeOnEditorMode(cb) : cb
      );
  }

  Interface.call(this, {
    input: options.input,
    output: options.output,
    completer: options.completer || completer,
    terminal: options.terminal,
    historySize: options.historySize,
    prompt
  });

  self.resetContext();

  this.commands = ObjectCreate(null);
  defineDefaultCommands(this);

  // Figure out which "writer" function to use
  self.writer = options.writer || module.exports.writer;

  if (self.writer === writer) {
    // Conditionally turn on ANSI coloring.
    writer.options.colors = self.useColors;

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

  function _parseREPLKeyword(keyword, rest) {
    const cmd = this.commands[keyword];
    if (cmd) {
      cmd.action.call(this, rest);
      return true;
    }
    return false;
  }

  setOnClose(this,paused,pausedBuffer);



  let sawSIGINT = false;
  let sawCtrlD = false;
  const prioritizedSigintQueue = new Set();
  self.on('SIGINT', function onSigInt() {
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
      if (sawSIGINT) {
        self.close();
        sawSIGINT = false;
        return;
      }
      self.output.write(
        '(To exit, press Ctrl+C again or Ctrl+D or type .exit)\n'
      );
      sawSIGINT = true;
    } else {
      sawSIGINT = false;
    }

    self.clearBufferedCommand();
    self.lines.level = [];
    self.displayPrompt();
  });

  self.on('line', function onLine(cmd) {
    debug('line %j', cmd);
    cmd = cmd || '';
    sawSIGINT = false;

    if (self.editorMode) {
      self[kBufferedCommandSymbol] += cmd + '\n';

      // code alignment
      const matches = self._sawKeyPress ? cmd.match(/^\s+/) : null;
      if (matches) {
        const prefix = matches[0];
        self.write(prefix);
        self.line = prefix;
        self.cursor = prefix.length;
      }
      _memory.call(self, cmd);
      return;
    }

    // Check REPL keywords and empty lines against a trimmed line input.
    const trimmedCmd = cmd.trim();

    // Check to see if a REPL keyword was used. If it returns true,
    // display next prompt and return.
    if (trimmedCmd) {
      if (StringPrototypeCharAt(trimmedCmd, 0) === '.' &&
          StringPrototypeCharAt(trimmedCmd, 1) !== '.' &&
          NumberIsNaN(NumberParseFloat(trimmedCmd))) {
        const matches = StringPrototypeMatch(trimmedCmd, /^\.([^\s]+)\s*(.*)$/);
        const keyword = matches && matches[1];
        const rest = matches && matches[2];
        if (_parseREPLKeyword.call(self, keyword, rest) === true) {
          return;
        }
        if (!self[kBufferedCommandSymbol]) {
          self.output.write('Invalid REPL keyword\n');
          finish(null);
          return;
        }
      }
    }
    

    const evalCmd = self[kBufferedCommandSymbol] + cmd + '\n';

    debug('eval %j', evalCmd);


    self.eval(evalCmd, self.context, getREPLResourceName(), finish);

    function finish(e, ret) {
      debug('finish', e, ret);
      _memory.call(self, cmd);

      if (e && !self[kBufferedCommandSymbol] && cmd.trim().startsWith('npm ')) {
        self.output.write('npm should be run outside of the ' +
                                'Node.js REPL, in your normal shell.\n' +
                                '(Press Ctrl+D to exit.)\n');
        self.displayPrompt();
        return;
      }

      // If error was SyntaxError and not JSON.parse error
      if (e) {
        if (e instanceof Recoverable && !sawCtrlD) {
          // Start buffering data like that:
          // {
          // ...  x: 1
          // ... }
          self[kBufferedCommandSymbol] += cmd + '\n';
          self.displayPrompt();
          return;
        }
        self._domain.emit('error', e.err || e);
      }

      // Clear buffer if no SyntaxErrors
      self.clearBufferedCommand();
      sawCtrlD = false;

      // If we got any output - print it (if no error)
      if (!e &&
          // When an invalid REPL command is used, error message is printed
          // immediately. We don't have to print anything else. So, only when
          // the second argument to this function is there, print it.
          arguments.length === 2 &&
          (!self.ignoreUndefined || ret !== undefined)) {
        if (!self.underscoreAssigned) {
          self.last = ret;
        }
        self.output.write(self.writer(ret) + '\n');
      }

      // Display prompt again
      self.displayPrompt();
    }
  });

  self.on('SIGCONT', function onSigCont() {
    if (self.editorMode) {
      self.output.write(`${self._initialPrompt}.editor\n`);
      self.output.write(
        '// Entering editor mode (Ctrl+D to finish, Ctrl+C to cancel)\n');
      self.output.write(`${self[kBufferedCommandSymbol]}\n`);
      self.prompt(true);
    } else {
      self.displayPrompt(true);
    }
  });

  const { reverseSearch } = setupReverseSearch(this);

  const {
    clearPreview,
    showPreview
  } = setupPreview(
    this,
    kContextId,
    kBufferedCommandSymbol,
    preview
  );

  // Wrap readline tty to enable editor mode and pausing.
  const ttyWrite = self._ttyWrite.bind(self);
  self._ttyWrite = (d, key) => {
    key = key || {};
    if (paused && !(self.breakEvalOnSigint && key.ctrl && key.name === 'c')) {
      pausedBuffer.push(['key', [d, key], self.isCompletionEnabled]);
      return;
    }
    if (!self.editorMode || !self.terminal) {
      // Before exiting, make sure to clear the line.
      if (key.ctrl && key.name === 'd' &&
          self.cursor === 0 && self.line.length === 0) {
        self.clearLine();
      }
      clearPreview(key);
      if (!reverseSearch(d, key)) {
        ttyWrite(d, key);
        showPreview();
      }
      return;
    }

    // Editor mode
    if (key.ctrl && !key.shift) {
      switch (key.name) {
        // TODO(BridgeAR): There should not be a special mode necessary for full
        // multiline support.
        case 'd': // End editor mode
          _turnOffEditorMode(self);
          sawCtrlD = true;
          ttyWrite(d, { name: 'return' });
          break;
        case 'n': // Override next history item
        case 'p': // Override previous history item
          break;
        default:
          ttyWrite(d, key);
      }
    } else {
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
  };
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
REPLServer.prototype.createContext = function() {
    return(createContext(this,parentModule));
};
REPLServer.prototype.resetContext = function() { resetContext(this) };
REPLServer.prototype.displayPrompt = function(preserveCursor) {
    displayPrompt(this,preserveCursor);
};
REPLServer.prototype.setPrompt = function setPrompt(prompt) {
    _setPrompt(this,prompt);
};
REPLServer.prototype.complete = function() {
  this.completer.apply(this, arguments);
};
REPLServer.prototype.completeOnEditorMode = completeOnEditorMode; 
REPLServer.prototype.defineCommand = function(keyword, cmd) {
    defineCommand(this,keyword, cmd);
};



function start(prompt, source, eval_, useGlobal, ignoreUndefined, replMode) {
    // Prompt is a string to print on each line for the prompt,
    // source is a stream to use for I/O, defaulting to stdin/stdout.
    return new REPLServer(prompt, source, eval_, useGlobal, ignoreUndefined, replMode);
}


module.exports = {
  start,
  writer,
  REPLServer,
  REPL_MODE_SLOPPY,
  REPL_MODE_STRICT,
  Recoverable,
  getREPLResourceName,
};


defineBuiltinLibs(module);
