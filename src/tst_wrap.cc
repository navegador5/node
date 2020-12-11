#include "tst_wrap.h"  
#include "env-inl.h"  
#include "util-inl.h"  
#include "node_internals.h"  

namespace node {
    using v8::Context;  
    using v8::Function;  
    using v8::FunctionCallbackInfo;  
    using v8::FunctionTemplate;  
    using v8::Local;  
    using v8::MaybeLocal;
    using v8::Object;  
    using v8::String;  
    using v8::Value; 
    
    void Tst::Initialize(
        Local<Object> target,
        Local<Value> unused,
        Local<Context> context,
        void* priv
    ) {
        Environment* env = Environment::GetCurrent(context);
        Local<FunctionTemplate> t = env->NewFunctionTemplate(Console);
        Local<String> str = FIXED_ONE_BYTE_STRING(env->isolate(), "console");  
        t->SetClassName(str);
        target->Set(
            env->context(),
            str,
            t->GetFunction(env->context()).ToLocalChecked()
        ).Check();
    }
    
    void Tst::Console(
        const FunctionCallbackInfo<Value>& args
    ) {
        v8::Isolate* isolate = args.GetIsolate();
        v8::Local<String> str = String::NewFromUtf8(isolate, "hello world").ToLocalChecked();
        args.GetReturnValue().Set(str);
    }
}

NODE_MODULE_CONTEXT_AWARE_INTERNAL(tst_wrap, node::Tst::Initialize)  

