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
  ReflectApply,
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
} = require('internal/util');
const { inspect } = require('internal/util/inspect');
const vm = require('vm');
const path = require('path');
const fs = require('fs');
const { Interface } = require('readline');
const {
  commonPrefix
} = require('internal/readline/utils');
const { Console } = require('console');
const CJSModule = require('internal/modules/cjs/loader').Module;
let _builtinLibs = ArrayPrototypeFilter(
  CJSModule.builtinModules,
  (e) => !StringPrototypeStartsWith(e, '_') && !StringPrototypeIncludes(e, '/')
);

const {
  codes: {
    ERR_INVALID_ARG_TYPE,
  },
  overrideStackTrace,
} = require('internal/errors');
const { sendInspectorCommand } = require('internal/util/inspector');

let debug = require('internal/util/debuglog').debuglog('repl', (fn) => {
  debug = fn;
});


const {
  REPL_MODE_SLOPPY,
  REPL_MODE_STRICT,
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

const history = require('internal/repl/history');
let nextREPLResourceNumber = 1;
// This prevents v8 code cache from getting confused and using a different
// cache from a resource of the same name
function getREPLResourceName() {
  return `REPL${nextREPLResourceNumber++}`;
}


const globalBuiltins =
  new SafeSet(vm.runInNewContext('Object.getOwnPropertyNames(globalThis)'));

const parentModule = module;

const kBufferedCommandSymbol = Symbol('bufferedCommand');


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

// This is the default "writer" value, if none is passed in the REPL options,
// and it can be overridden by custom print functions, such as `probe` or
// `eyes.js`.
const writer = (obj) => inspect(obj, writer.options);
writer.options = { ...inspect.defaultOptions, showProxy: true };

const {
    kContextId,
    kStandaloneREPL,
    ////
    creat_options,
    set_stream,
    set_terminal,
    set_use_colors,
    set_preview,
    defineInputStream,
    defineOutputStream,
    set_property,
    checkBreakEvalOnSigint,
    checkStandaloneREPLandAddNewListener,
    _unpause,
    try_and_wrap_cmd,
    wrapExperimentalREPLAwait,
    Recoverable,
    creatScriptForCode,
    finishExecution,
    _runScriptInContext,
    _resetTerminalModeToPrevious,
    _sendErrorToDomain,
    ////
    defineBuiltinLibs
    ////
} = require("repl_util");


function REPLServer(prompt,
                    stream,
                    eval_,
                    useGlobal,
                    ignoreUndefined,
                    replMode) {
    ////
    if (!(this instanceof REPLServer)) {
      return new REPLServer(prompt,
                          stream,
                          eval_,
                          useGlobal,
                          ignoreUndefined,
                          replMode);
    }
    ////
    let arr = creat_options(prompt,stream,eval_,useGlobal,ignoreUndefined,replMode);
    let options = arr[0];
    [options,prompt,stream,eval_,useGlobal,ignoreUndefined,replMode] = arr;
    stream = set_stream(options,stream);
    set_terminal(options);    
    set_use_colors(options);
    const preview = set_preview(options,eval_);
    defineInputStream(this);
    defineOutputStream(this);
    set_property(this,options,useGlobal,ignoreUndefined,replMode,module);
    checkBreakEvalOnSigint(this,eval_);
    checkStandaloneREPLandAddNewListener(this,options,module);
    ////
    eval_ = eval_ || defaultEval;
    const self = this;
    const pausedBuffer = [];
    let paused = false;
    function pause() {paused = true;}
    function unpause() {
        paused = _unpause(this,paused,pausedBuffer);
    }




  function defaultEval(code, context, file, cb) {
      let result, script;
      let err = null;
      let wrappedCmd = false;
      let awaitPromise = false;
      const input = code;
      ////
      [code,wrappedCmd] = try_and_wrap_cmd(code,wrappedCmd);
      [
          code,
          wrappedCmd,
          awaitPromise
      ] = wrapExperimentalREPLAwait(code,wrappedCmd,awaitPromise);
      ////
      if (code === '\n') {return cb(null)}
      ////
      [script,awaitPromise,err] = creatScriptForCode(
          self,module,code,input,
          file,wrappedCmd,err,
          awaitPromise,script,debug
      );
      ////
      finishExecution(err, result,cb);
      ////
      if (!err) {
          try {
              try {
                  result = _runScriptInContext(self,script,context);
              } finally {
                  _resetTerminalModeToPrevious(self);
              }
          } catch (e) {
              err = _sendErrorToDomain(e,debug);
              if(process.domain){return;}
          }
          ////
          if (awaitPromise && !err) {
          }
      }
      if (!awaitPromise || err) {finishExecution(err, result,cb);}
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
          } else if (self.replMode === module.exports.REPL_MODE_STRICT) {
            e.stack = StringPrototypeReplace(
              e.stack,
              /(\s+at\s+REPL\d+:)(\d+)/,
              (_, pre, line) => pre + (line - 1)
            );
          }
        }
        errStack = self.writer(e);

        // Remove one line error braces to keep the old style in place.
        if (errStack[errStack.length - 1] === ']') {
          errStack = StringPrototypeSlice(errStack, 1, -1);
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
      self.output.write(errStack);
      self.clearBufferedCommand();
      self.lines.level = [];
      self.displayPrompt();
    }
  });

  self.clearBufferedCommand();

  function completer(text, cb) {
    ReflectApply(complete, self,
                 [text, self.editorMode ? self.completeOnEditorMode(cb) : cb]);
  }

  ReflectApply(Interface, this, [{
    input: options.input,
    output: options.output,
    completer: options.completer || completer,
    terminal: options.terminal,
    historySize: options.historySize,
    prompt
  }]);

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
      ReflectApply(cmd.action, this, [rest]);
      return true;
    }
    return false;
  }

  self.on('close', function emitExit() {
    if (paused) {
      ArrayPrototypePush(pausedBuffer, ['close']);
      return;
    }
    self.emit('exit');
  });

  let sawSIGINT = false;
  let sawCtrlD = false;
  const prioritizedSigintQueue = new SafeSet();
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
      const matches = self._sawKeyPress ?
        StringPrototypeMatch(cmd, /^\s+/) : null;
      if (matches) {
        const prefix = matches[0];
        self.write(prefix);
        self.line = prefix;
        self.cursor = prefix.length;
      }
      ReflectApply(_memory, self, [cmd]);
      return;
    }

    // Check REPL keywords and empty lines against a trimmed line input.
    const trimmedCmd = StringPrototypeTrim(cmd);

    // Check to see if a REPL keyword was used. If it returns true,
    // display next prompt and return.
    if (trimmedCmd) {
      if (StringPrototypeCharAt(trimmedCmd, 0) === '.' &&
          StringPrototypeCharAt(trimmedCmd, 1) !== '.' &&
          NumberIsNaN(NumberParseFloat(trimmedCmd))) {
        const matches = StringPrototypeMatch(trimmedCmd, /^\.([^\s]+)\s*(.*)$/);
        const keyword = matches && matches[1];
        const rest = matches && matches[2];
        if (ReflectApply(_parseREPLKeyword, self, [keyword, rest]) === true) {
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
      ReflectApply(_memory, self, [cmd]);

      if (e && !self[kBufferedCommandSymbol] &&
          StringPrototypeStartsWith(StringPrototypeTrim(cmd), 'npm ')) {
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
  const ttyWrite = FunctionPrototypeBind(self._ttyWrite, self);
  self._ttyWrite = (d, key) => {
    key = key || {};
    if (paused && !(self.breakEvalOnSigint && key.ctrl && key.name === 'c')) {
      ArrayPrototypePush(pausedBuffer,
                         ['key', [d, key], self.isCompletionEnabled]);
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

// Prompt is a string to print on each line for the prompt,
// source is a stream to use for I/O, defaulting to stdin/stdout.
function start(prompt, source, eval_, useGlobal, ignoreUndefined, replMode) {
  return new REPLServer(
    prompt, source, eval_, useGlobal, ignoreUndefined, replMode);
}

REPLServer.prototype.setupHistory = function setupHistory(historyFile, cb) {
  history(this, historyFile, cb);
};

REPLServer.prototype.clearBufferedCommand = function clearBufferedCommand() {
  this[kBufferedCommandSymbol] = '';
};

REPLServer.prototype.close = function close() {
  if (this.terminal && this._flushing && !this._closingOnFlush) {
    this._closingOnFlush = true;
    this.once('flushHistory', () =>
      ReflectApply(Interface.prototype.close, this, [])
    );

    return;
  }
  process.nextTick(() =>
    ReflectApply(Interface.prototype.close, this, [])
  );
};

REPLServer.prototype.createContext = function() {
  let context;
  if (this.useGlobal) {
    context = global;
  } else {
    sendInspectorCommand((session) => {
      session.post('Runtime.enable');
      session.once('Runtime.executionContextCreated', ({ params }) => {
        this[kContextId] = params.context.id;
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
    const _console = new Console(this.output);
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
};

REPLServer.prototype.resetContext = function() {
  this.context = this.createContext();
  this.underscoreAssigned = false;
  this.underscoreErrAssigned = false;
  // TODO(BridgeAR): Deprecate the lines.
  this.lines = [];
  this.lines.level = [];

  ObjectDefineProperty(this.context, '_', {
    configurable: true,
    get: () => this.last,
    set: (value) => {
      this.last = value;
      if (!this.underscoreAssigned) {
        this.underscoreAssigned = true;
        this.output.write('Expression assignment to _ now disabled.\n');
      }
    }
  });

  ObjectDefineProperty(this.context, '_error', {
    configurable: true,
    get: () => this.lastError,
    set: (value) => {
      this.lastError = value;
      if (!this.underscoreErrAssigned) {
        this.underscoreErrAssigned = true;
        this.output.write(
          'Expression assignment to _error now disabled.\n');
      }
    }
  });

  // Allow REPL extensions to extend the new context
  this.emit('reset', this.context);
};

REPLServer.prototype.displayPrompt = function(preserveCursor) {
  let prompt = this._initialPrompt;
  if (this[kBufferedCommandSymbol].length) {
    prompt = '...';
    const len = this.lines.level.length ? this.lines.level.length - 1 : 0;
    const levelInd = StringPrototypeRepeat('..', len);
    prompt += levelInd + ' ';
  }

  // Do not overwrite `_initialPrompt` here
  ReflectApply(Interface.prototype.setPrompt, this, [prompt]);
  this.prompt(preserveCursor);
};

// When invoked as an API method, overwrite _initialPrompt
REPLServer.prototype.setPrompt = function setPrompt(prompt) {
  this._initialPrompt = prompt;
  ReflectApply(Interface.prototype.setPrompt, this, [prompt]);
};

const requireRE = /\brequire\s*\(\s*['"`](([\w@./-]+\/)?(?:[\w@./-]*))(?![^'"`])$/;
const fsAutoCompleteRE = /fs(?:\.promises)?\.\s*[a-z][a-zA-Z]+\(\s*["'](.*)/;
const simpleExpressionRE =
    /(?:[a-zA-Z_$](?:\w|\$)*\??\.)*[a-zA-Z_$](?:\w|\$)*\??\.?$/;

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
  return ArrayPrototypeFilter(getOwnNonIndexProperties(obj, filter),
                              isIdentifier);
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

REPLServer.prototype.complete = function() {
  ReflectApply(this.completer, this, arguments);
};

function gracefulReaddir(...args) {
  try {
    return fs.readdirSync(...args);
  } catch {}
}

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

// Provide a list of completions for the given leading text. This is
// given to the readline interface for handling tab completion.
//
// Example:
//  complete('let foo = util.')
//    -> [['util.print', 'util.debug', 'util.log', 'util.inspect'],
//        'util.' ]
//
// Warning: This eval's code like "foo.bar.baz", so it will run property
// getter code.
function complete(line, callback) {
  // List of completion lists, one for each inheritance "level"
  let completionGroups = [];
  let completeOn, group;

  // Ignore right whitespace. It could change the outcome.
  line = StringPrototypeTrimLeft(line);

  // REPL commands (e.g. ".break").
  let filter = '';
  if (RegExpPrototypeTest(/^\s*\.(\w*)$/, line)) {
    ArrayPrototypePush(completionGroups, ObjectKeys(this.commands));
    completeOn = StringPrototypeMatch(line, /^\s*\.(\w*)$/)[1];
    if (completeOn.length) {
      filter = completeOn;
    }
  } else if (RegExpPrototypeTest(requireRE, line)) {
    // require('...<Tab>')
    const extensions = ObjectKeys(this.context.require.extensions);
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

    for (let dir of paths) {
      dir = path.resolve(dir, subdir);
      const dirents = gracefulReaddir(dir, { withFileTypes: true }) || [];
      for (const dirent of dirents) {
        if (RegExpPrototypeTest(versionedFileNamesRe, dirent.name) ||
            dirent.name === '.npm') {
          // Exclude versioned names that 'npm' installs.
          continue;
        }
        const extension = path.extname(dirent.name);
        const base = StringPrototypeSlice(dirent.name, 0, -extension.length);
        if (!dirent.isDirectory()) {
          if (StringPrototypeIncludes(extensions, extension) &&
              (!subdir || base !== 'index')) {
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
    if (group.length) {
      ArrayPrototypePush(completionGroups, group);
    }

    if (!subdir) {
      ArrayPrototypePush(completionGroups, _builtinLibs);
    }
  } else if (RegExpPrototypeTest(fsAutoCompleteRE, line)) {
    [completionGroups, completeOn] = completeFSFunctions(line);
  // Handle variable member lookup.
  // We support simple chained expressions like the following (no function
  // calls, etc.). That is for simplicity and also because we *eval* that
  // leading expression so for safety (see WARNING above) don't want to
  // eval function calls.
  //
  //   foo.bar<|>     # completions for 'foo' with filter 'bar'
  //   spam.eggs.<|>  # completions for 'spam.eggs' with filter ''
  //   foo<|>         # all scope vars with filter 'foo'
  //   foo.<|>        # completions for 'foo' with filter ''
  } else if (line.length === 0 ||
             RegExpPrototypeTest(/\w|\.|\$/, line[line.length - 1])) {
    const [match] = RegExpPrototypeExec(simpleExpressionRE, line) || [''];
    if (line.length !== 0 && !match) {
      completionGroupsLoaded();
      return;
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

    // Resolve expr and get its completions.
    if (!expr) {
      // Get global vars synchronously
      ArrayPrototypePush(completionGroups,
                         getGlobalLexicalScopeNames(this[kContextId]));
      let contextProto = this.context;
      while (contextProto = ObjectGetPrototypeOf(contextProto)) {
        ArrayPrototypePush(completionGroups,
                           filteredOwnPropertyNames(contextProto));
      }
      const contextOwnNames = filteredOwnPropertyNames(this.context);
      if (!this.useGlobal) {
        // When the context is not `global`, builtins are not own
        // properties of it.
        ArrayPrototypePush(contextOwnNames, ...globalBuiltins);
      }
      ArrayPrototypePush(completionGroups, contextOwnNames);
      if (filter !== '') addCommonWords(completionGroups);
      completionGroupsLoaded();
      return;
    }

    let chaining = '.';
    if (StringPrototypeEndsWith(expr, '?')) {
      expr = StringPrototypeSlice(expr, 0, -1);
      chaining = '?.';
    }

    const memberGroups = [];
    const evalExpr = `try { ${expr} } catch {}`;
    this.eval(evalExpr, this.context, getREPLResourceName(), (e, obj) => {
      try {
        let p;
        if ((typeof obj === 'object' && obj !== null) ||
            typeof obj === 'function') {
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
        // Maybe a Proxy object without `getOwnPropertyNames` trap.
        // We simply ignore it here, as we don't want to break the
        // autocompletion. Fixes the bug
        // https://github.com/nodejs/node/issues/2119
      }

      if (memberGroups.length) {
        expr += chaining;
        for (const group of memberGroups) {
          ArrayPrototypePush(completionGroups,
                             ArrayPrototypeMap(group,
                                               (member) => `${expr}${member}`));
        }
        if (filter) {
          filter = `${expr}${filter}`;
        }
      }

      completionGroupsLoaded();
    });
    return;
  }

  return completionGroupsLoaded();

  // Will be called when all completionGroups are in place
  // Useful for async autocompletion
  function completionGroupsLoaded() {
    // Filter, sort (within each group), uniq and merge the completion groups.
    if (completionGroups.length && filter) {
      const newCompletionGroups = [];
      for (const group of completionGroups) {
        const filteredGroup = ArrayPrototypeFilter(
          group,
          (str) => StringPrototypeStartsWith(str, filter)
        );
        if (filteredGroup.length) {
          ArrayPrototypePush(newCompletionGroups, filteredGroup);
        }
      }
      completionGroups = newCompletionGroups;
    }

    const completions = [];
    // Unique completions across all groups.
    const uniqueSet = new SafeSet(['']);
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

    // Remove obsolete group entry, if present.
    if (completions[0] === '') {
      ArrayPrototypeShift(completions);
    }

    callback(null, [completions, completeOn]);
  }
}

REPLServer.prototype.completeOnEditorMode = (callback) => (err, results) => {
  if (err) return callback(err);

  const [completions, completeOn = ''] = results;
  let result = ArrayPrototypeFilter(completions, Boolean);

  if (completeOn && result.length !== 0) {
    result = [commonPrefix(result)];
  }

  callback(null, [result, completeOn]);
};

REPLServer.prototype.defineCommand = function(keyword, cmd) {
  if (typeof cmd === 'function') {
    cmd = { action: cmd };
  } else if (typeof cmd.action !== 'function') {
    throw new ERR_INVALID_ARG_TYPE('cmd.action', 'Function', cmd.action);
  }
  this.commands[keyword] = cmd;
};

// TODO(BridgeAR): This should be replaced with acorn to build an AST. The
// language became more complex and using a simple approach like this is not
// sufficient anymore.
function _memory(cmd) {
  const self = this;
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



module.exports = {
  start,
  writer,
  REPLServer,
  REPL_MODE_SLOPPY,
  REPL_MODE_STRICT,
  Recoverable
};

defineBuiltinLibs(module);



