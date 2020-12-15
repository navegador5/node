#ifndef SRC_UVQUEUE_H_
#define SRC_UVQUEUE_H_
#include "v8.h"
#include <cassert>
#include "../deps/uv/src/queue.h"

namespace node {
    class Environment;
    namespace uvqueue {
        class Wrap {
            public:
                enum InternalFields {
                    kThis,
                    kQueue
                };
                static v8::Local<v8::FunctionTemplate>  setup_cls(
                    Environment* env,
                    void (*New) (const v8::FunctionCallbackInfo<v8::Value>& args),
                    int ifcount
                );
                static void add_cls(
                    v8::Local<v8::Object> target,
                    Environment* env,
                    v8::Local<v8::FunctionTemplate> t,
                    const char  *clsname
                );
                static void * get_q(v8::Local<v8::Object> handle);
                static void Initialize(
                    v8::Local<v8::Object> target,
                    v8::Local<v8::Value> unused,
                    v8::Local<v8::Context> context,
                    void* priv
                );

        };
        class Queue {
            public:
                QUEUE q;
                static void Initialize(
                    v8::Local<v8::Object> target,
                    v8::Local<v8::Value> unused,
                    v8::Local<v8::Context> context,
                    void* priv
                );
                static void MakeQueueCls(
                    Environment* env,
                    v8::Local<v8::Object> target
                );
            protected:
                Queue(Environment* env, v8::Local<v8::Object> obj);
                static void New(const v8::FunctionCallbackInfo<v8::Value>& args);
                static void IsEmpty(const v8::FunctionCallbackInfo<v8::Value>& args);
                static void GetHead(const v8::FunctionCallbackInfo<v8::Value>& args);
                static void GetTail(const v8::FunctionCallbackInfo<v8::Value>& args);
                static void GetWithIndex(const v8::FunctionCallbackInfo<v8::Value>& args);
                static void InsertHead(const v8::FunctionCallbackInfo<v8::Value>& args);
                static void InsertTail(const v8::FunctionCallbackInfo<v8::Value>& args);
                static void IndexOf(const v8::FunctionCallbackInfo<v8::Value>& args);
                static void GetLength(const v8::FunctionCallbackInfo<v8::Value>& args);
                static void ShowQptr(const v8::FunctionCallbackInfo<v8::Value>& args);
        };
        class Node {
            public:
                QUEUE q;
                static void Initialize(
                    v8::Local<v8::Object> target,
                    v8::Local<v8::Value> unused,
                    v8::Local<v8::Context> context,
                    void* priv
                );
                static void MakeNodeCls(
                    Environment* env,
                    v8::Local<v8::Object> target
                );
            protected:
                Node(Environment* env, v8::Local<v8::Object> obj);
                static void New(const v8::FunctionCallbackInfo<v8::Value>& args);
                static void GetNext(const v8::FunctionCallbackInfo<v8::Value>& args);
                static void GetPrev(const v8::FunctionCallbackInfo<v8::Value>& args);
                static void RemoveFromQueue(const v8::FunctionCallbackInfo<v8::Value>& args);
                static void ShowNptr(const v8::FunctionCallbackInfo<v8::Value>& args);
        };
    }
}

#endif
