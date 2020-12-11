#ifndef SRC_TST_H_  
#define SRC_TST_H_
#include "v8.h"

namespace node {
    class Environment; 
    class Tst {
        public:
            static void Initialize(
                v8::Local<v8::Object> target,
                v8::Local<v8::Value> unused,
                v8::Local<v8::Context> context,
                void* priv
            );
        private:
            static void Console(
                const v8::FunctionCallbackInfo<v8::Value>& args
            );  
    };
}

#endif

