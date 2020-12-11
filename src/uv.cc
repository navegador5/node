// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

#include "uv.h"
#include "env-inl.h"
#include "node.h"
#include "node_process.h"

#include <limits.h>
#include <stdio.h>
#include <stdlib.h>




namespace node {

namespace per_process {
    struct UVError {
        int value;
        const char* name;
        const char* message;
    };
    // We only expand the macro once here to reduce the amount of code
    // generated.
    static const struct UVError uv_errors_map[] = {
        #define V(name, message) {UV_##name, #name, message},
        UV_ERRNO_MAP(V)
        #undef V
    };
    //
    struct UVLoopOptions {
        int value;
        const char* name;
        const char* message;
    };
    static const struct UVLoopOptions uv_loop_options_map[] = {
        {0,"LOOP_BLOCK_SIGNAL","default"},
        {1,"METRICS_IDLE_TIME","metrics idle time enum"},
    };
    //
    struct UVRunModes {
        int value;
        const char* name;
        const char* message;
    };
    //same struct as UVError
    static const struct UVRunModes uv_run_modes_map[] = {
        {0,"RUN_DEFAULT","default"},
        {1,"RUN_ONCE","once mode blocking"},
        {2,"RUN_NOWAIT","non blocking"}
    };
    

}  // namespace per_process

namespace {

using v8::Array;
using v8::Context;
using v8::DontDelete;
using v8::FunctionCallbackInfo;
using v8::Integer;
using v8::Isolate;
using v8::Local;
using v8::Map;
using v8::Object;
using v8::PropertyAttribute;
using v8::ReadOnly;
using v8::String;
using v8::Value;
using v8::NewStringType;
using v8::Number;
using v8::Exception;
using v8::BigInt;
using v8::Boolean;




void ErrName(const FunctionCallbackInfo<Value>& args) {
  Environment* env = Environment::GetCurrent(args);
  if (env->options()->pending_deprecation && env->EmitErrNameWarning()) {
    if (ProcessEmitDeprecationWarning(
        env,
        "Directly calling process.binding('uv').errname(<val>) is being"
        " deprecated. "
        "Please make sure to use util.getSystemErrorName() instead.",
        "DEP0119").IsNothing())
    return;
  }
  int err;
  if (!args[0]->Int32Value(env->context()).To(&err)) return;
  CHECK_LT(err, 0);
  const char* name = uv_err_name(err);
  args.GetReturnValue().Set(OneByteString(env->isolate(), name));
}

void GetErrMap(const FunctionCallbackInfo<Value>& args) {
  Environment* env = Environment::GetCurrent(args);
  Isolate* isolate = env->isolate();
  Local<Context> context = env->context();

  Local<Map> err_map = Map::New(isolate);

  size_t errors_len = arraysize(per_process::uv_errors_map);
  for (size_t i = 0; i < errors_len; ++i) {
    const auto& error = per_process::uv_errors_map[i];
    Local<Value> arr[] = {OneByteString(isolate, error.name),
                          OneByteString(isolate, error.message)};
    if (err_map
            ->Set(context,
                  Integer::New(isolate, error.value),
                  Array::New(isolate, arr, arraysize(arr)))
            .IsEmpty()) {
      return;
    }
  }

  args.GetReturnValue().Set(err_map);
}



uint32_t kLoopCount =0;
uint32_t kMaxLoopRound = 1000;
//uv_loop_t *loop = uv_default_loop();
uv_loop_t * loop; 
uv_run_mode mode;

void loop_counter(uv_idle_t* handle) {
   kLoopCount++;
   if(kLoopCount == kMaxLoopRound) {
       uv_stop(loop);
       kLoopCount =0;
       uv_idle_stop(handle);
   }
   if(mode != UV_RUN_DEFAULT) {
       uv_idle_stop(handle);
   }
}



void RunUVLoop(const FunctionCallbackInfo<Value>& args) {
    Environment* env = Environment::GetCurrent(args);
    Isolate* isolate = Isolate::GetCurrent();
    int result;
    if (args.Length () == 0) {
        mode = UV_RUN_ONCE;
    } else {
        if(args[0]->IsNumber()) {
            if(args[0]->Int32Value(env->context()).ToChecked() == 0) {
                mode = UV_RUN_DEFAULT;
            } else if(args[0]->Int32Value(env->context()).ToChecked() == 2) {
                mode = UV_RUN_NOWAIT;
            } else {
                mode = UV_RUN_ONCE;
            }
        } else {
            isolate->ThrowException(
                    Exception::TypeError(
                        String::NewFromUtf8(
                            isolate, 
                            "Argument must be a 0,1,2", 
                            NewStringType::kInternalized
                        ).ToLocalChecked ()
                    )
            );
            return;            
        }
    }
    ////
    loop = (uv_loop_t * )malloc(sizeof(uv_loop_t));
    uv_loop_init(loop);
    ////
    uv_idle_t idler;
    uv_idle_init(loop, &idler);
    uv_idle_start(&idler,loop_counter);
    ////
    result = uv_run(loop, mode);
    ////
    args.GetReturnValue ().Set(Number::New(isolate, result));
}

static void CloseLoop(const FunctionCallbackInfo<Value>& args) {
    uv_loop_close(loop);
    free(loop);
}

static void GetLoopCount(const FunctionCallbackInfo<Value>& args) {
    args.GetReturnValue().Set(kLoopCount);
}

static void GetMaxLoopRound(const FunctionCallbackInfo<Value>& args) {
    args.GetReturnValue().Set(kMaxLoopRound);
}

static void SetMaxLoopRound(const FunctionCallbackInfo<Value>& args) {
    Environment* env = Environment::GetCurrent(args);
    kMaxLoopRound = args[0]->Int32Value(env->context()).ToChecked();
    args.GetReturnValue().Set(kMaxLoopRound);
}



void GetMainLoop(const FunctionCallbackInfo<Value>& args) {
    //
    Isolate* isolate = args.GetIsolate();
    //Local<Context> context = isolate->GetCurrentContext();
    uv_loop_t* loop = node::GetCurrentEventLoop(isolate);
    //void * data
    unsigned int active_handles = loop->active_handles;
    Local<BigInt> ah = BigInt::NewFromUnsigned(isolate, active_handles);
    //void * handle_queue[2]
    //union active_reqs
    //
    //uint64_t timer_counter = loop->timer_counter;
    //Local<BigInt> tc = BigInt::NewFromUnsigned(isolate, timer_counter);
    //
    //uint64_t time = loop->time;
    //Local<BigInt> tm = BigInt::NewFromUnsigned(isolate, time);
    //
    /*
    Local<Value> signal_pipefd[2] = {
        Integer::New(isolate,loop->signal_pipefd[0]),
        Integer::New(isolate,loop->signal_pipefd[1])
    };
    Local<Array> sp = Array::New(isolate,signal_pipefd,2);
    */
    args.GetReturnValue().Set(ah);
}


void GetMainLoopCount(const FunctionCallbackInfo<Value>& args) {
    Environment* env = Environment::GetCurrent(args);
    Isolate* isolate = args.GetIsolate();
    Local<BigInt> curr_loop_count = BigInt::NewFromUnsigned(
            isolate, env->GetLoopCount());
    args.GetReturnValue().Set(curr_loop_count);
}


void IsMainLoopTimerActive(const FunctionCallbackInfo<Value>& args) {
    Environment* env = Environment::GetCurrent(args);
    Isolate* isolate = args.GetIsolate();
    Local<Boolean> bl = Boolean::New(isolate, env->IsTimerActive());
    args.GetReturnValue().Set(bl);
}

void IsMainLoopIdleActive(const FunctionCallbackInfo<Value>& args) {
    Environment* env = Environment::GetCurrent(args);
    Isolate* isolate = args.GetIsolate();
    Local<Boolean> bl = Boolean::New(isolate, env->IsIdleActive());
    args.GetReturnValue().Set(bl);
}

void IsMainLoopPrepareActive(const FunctionCallbackInfo<Value>& args) {
    Environment* env = Environment::GetCurrent(args);
    Isolate* isolate = args.GetIsolate();
    Local<Boolean> bl = Boolean::New(isolate, env->IsPrepareActive());
    args.GetReturnValue().Set(bl);
}

void IsMainLoopCheckActive(const FunctionCallbackInfo<Value>& args) {
    Environment* env = Environment::GetCurrent(args);
    Isolate* isolate = args.GetIsolate();
    Local<Boolean> bl = Boolean::New(isolate, env->IsCheckActive());
    args.GetReturnValue().Set(bl);
}


void Initialize(Local<Object> target,
                Local<Value> unused,
                Local<Context> context,
                void* priv
) {
  Environment* env = Environment::GetCurrent(context);
  Isolate* isolate = env->isolate();
  target->Set(env->context(),
              FIXED_ONE_BYTE_STRING(isolate, "errname"),
              env->NewFunctionTemplate(ErrName)
                  ->GetFunction(env->context())
                  .ToLocalChecked()).Check();

  // TODO(joyeecheung): This should be deprecated in user land in favor of
  // `util.getSystemErrorName(err)`.
  PropertyAttribute attributes =
      static_cast<PropertyAttribute>(ReadOnly | DontDelete);
  size_t errors_len = arraysize(per_process::uv_errors_map);
  const std::string prefix = "UV_";
  for (size_t i = 0; i < errors_len; ++i) {
    const auto& error = per_process::uv_errors_map[i];
    const std::string prefixed_name = prefix + error.name;
    Local<String> name = OneByteString(isolate, prefixed_name.c_str());
    Local<Integer> value = Integer::New(isolate, error.value);
    target->DefineOwnProperty(context, name, value, attributes).Check();
  }
  //
  size_t loop_options_len = arraysize(per_process::uv_loop_options_map);
  for (size_t i = 0; i < loop_options_len; ++i) {
    const auto& mode = per_process::uv_loop_options_map[i];
    const std::string prefixed_name = prefix + mode.name;
    Local<String> name = OneByteString(isolate, prefixed_name.c_str());
    Local<Integer> value = Integer::New(isolate, mode.value);
    target->DefineOwnProperty(context, name, value, attributes).Check();
  }
  //
  size_t run_modes_len = arraysize(per_process::uv_run_modes_map);
  for (size_t i = 0; i < run_modes_len; ++i) {
    const auto& mode = per_process::uv_run_modes_map[i];
    const std::string prefixed_name = prefix + mode.name;
    Local<String> name = OneByteString(isolate, prefixed_name.c_str());
    Local<Integer> value = Integer::New(isolate, mode.value);
    target->DefineOwnProperty(context, name, value, attributes).Check();
  }
  //
  env->SetMethod(target, "getErrorMap", GetErrMap);
  //
  env->SetMethod(target, "runUVLoop", RunUVLoop);
  env->SetMethod(target, "closeLoop", CloseLoop);
  env->SetMethod(target, "getLoopCount", GetLoopCount);
  env->SetMethod(target, "setMaxLoopRound", SetMaxLoopRound);
  env->SetMethod(target, "getMaxLoopRound", GetMaxLoopRound);
  //
  env->SetMethod(target, "getMainLoop", GetMainLoop);
  env->SetMethod(target,"getMainLoopCount",GetMainLoopCount);
  env->SetMethod(target,"isMainLoopTimerActive",IsMainLoopTimerActive);
  env->SetMethod(target,"isMainLoopIdleActive",IsMainLoopIdleActive);
  env->SetMethod(target,"isMainLoopPrepareActive",IsMainLoopPrepareActive);
  env->SetMethod(target,"isMainLoopCheckActive",IsMainLoopCheckActive);

}

}  // anonymous namespace
}  // namespace node

NODE_MODULE_CONTEXT_AWARE_INTERNAL(uv, node::Initialize)
