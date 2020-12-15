#include "uvqueue.h"  
#include "env-inl.h"  
#include "util-inl.h"  
#include "node_internals.h"  
#include "node_errors.h"

#include <stdio.h>
#include <stdlib.h>
#include <stddef.h>

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
    using v8::Boolean;
    using v8::Isolate;
    using v8::NewStringType;
    using v8::Name;
    using v8::BigInt;
    using v8::Integer;

    namespace uvqueue {
        ////wrap
        Local<FunctionTemplate>  Wrap::setup_cls(
            Environment* env,
            void (*New) (const FunctionCallbackInfo<Value>& args),
            int ifcount
        ) {
            //constructor
            //Isolate * isolate = env->isolate();
            Local<FunctionTemplate> t = env->NewFunctionTemplate(New);
            t->InstanceTemplate()->SetInternalFieldCount(ifcount);
            return(t);
        }
        //   
        void Wrap::add_cls(
            Local<Object> target,
            Environment* env,
            Local<FunctionTemplate> t,
            const char  *clsname
        ){
            Isolate * isolate = env->isolate();
            Local<String> str = String::NewFromUtf8(isolate,clsname, NewStringType::kNormal).ToLocalChecked();
            t->SetClassName(str);
            target->Set(
                env->context(),
                str,
                t->GetFunction(env->context()).ToLocalChecked()
            ).Check();
        }
        void * Wrap::get_q(Local<Object> handle) {
            assert(!handle.IsEmpty());
            assert(handle->InternalFieldCount() > 0);
            void* ptr = handle->GetAlignedPointerFromInternalField(
                InternalFields::kQueue
            );
            return(ptr);
        }
        void Wrap::Initialize(
            Local<Object> target,
            Local<Value> unused,
            Local<Context> context,
            void* priv
        ) {
            Queue::Initialize(target,unused,context,priv);
            Node::Initialize(target,unused,context,priv);
        }
        ////queue
        void Queue::MakeQueueCls(
            Environment* env,
            Local<Object> target
        ) {
            Local<FunctionTemplate> qt = Wrap::setup_cls(env,New,10);
            env->SetProtoMethod(qt, "showQptr", ShowQptr);
            env->SetProtoMethod(qt, "isEmpty", IsEmpty);
            env->SetProtoMethod(qt, "getHead", GetHead);
            env->SetProtoMethod(qt, "getTail", GetTail);
            env->SetProtoMethod(qt, "getWithIndex", GetWithIndex);
            env->SetProtoMethod(qt, "insertHead", InsertHead);
            env->SetProtoMethod(qt, "insertTail", InsertTail);
            env->SetProtoMethod(qt, "indexOf", IndexOf);
            env->SetProtoMethod(qt, "getLength", GetLength);
            Wrap::add_cls(target,env,qt,"Queue");
        }
        Queue::Queue(Environment* env, Local<Object> obj) {
            obj->SetAlignedPointerInInternalField(Wrap::InternalFields::kThis,nullptr);
            obj->SetAlignedPointerInInternalField(Wrap::InternalFields::kThis,this);
            QUEUE_INIT(&(Queue::q));
            obj->SetAlignedPointerInInternalField(Wrap::InternalFields::kQueue,nullptr);
            obj->SetAlignedPointerInInternalField(Wrap::InternalFields::kQueue,&(Queue::q));
        }
        void Queue::New(const FunctionCallbackInfo<Value>& args) {
            CHECK(args.IsConstructCall());
            Environment* env = Environment::GetCurrent(args);
            new Queue(env, args.Holder());
        }
        void Queue::Initialize(
            Local<Object> target,
            Local<Value> unused,
            Local<Context> context,
            void* priv
        ) {
            Environment* env = Environment::GetCurrent(context);
            //Isolate* isolate = env->isolate();
            Queue::MakeQueueCls(env,target);
        }
        //
        void Queue::IsEmpty(const FunctionCallbackInfo<Value>& args) {
            Local<Object> self = args.Holder();
            void* qptr = Wrap::get_q(self);
            void *(*queue)[2] = static_cast<QUEUE*>(qptr);
            bool ret = QUEUE_EMPTY(queue);
            Environment* env = Environment::GetCurrent(args);
            Isolate* isolate = env->isolate();
            Local<Boolean> bl = Boolean::New(isolate, ret);
            args.GetReturnValue().Set(bl);    
        }
       
        void Queue::GetHead(const FunctionCallbackInfo<Value>& args) {
            Local<Object> self = args.Holder();
            void* qptr = Wrap::get_q(self);
            void *(*queue)[2] = static_cast<QUEUE*>(qptr);
            if(!QUEUE_EMPTY(queue)) {
                void *(*ret)[2] = QUEUE_HEAD(queue);
                printf("Get queue ptr.... %p\n", queue);
                printf("Get queue[0] ptr.... %p\n", (*(*(&queue)))[0]);
                printf("Get queue[1] ptr.... %p\n", (*(*(&queue)))[1]);
                printf("head %p",ret);
            } else {
                printf("empty!");
            }
        }


        void Queue::GetTail(const FunctionCallbackInfo<Value>& args) {
            Local<Object> self = args.Holder();
            void* qptr = Wrap::get_q(self);
            void *(*queue)[2] = static_cast<QUEUE*>(qptr);
            if(!QUEUE_EMPTY(queue)) {
                void *(*ret)[2] = QUEUE_PREV(queue);
                printf("Get queue ptr.... %p\n", queue);
                printf("Get queue[0] ptr.... %p\n", (*(*(&queue)))[0]);
                printf("Get queue[1] ptr.... %p\n", (*(*(&queue)))[1]);
                printf("tail %p",ret);
            } else {
                printf("empty!");
            }
        }

        void Queue::InsertHead(const FunctionCallbackInfo<Value>& args) {
            ////
            Local<Object> self = args.Holder();
            void* qptr = Wrap::get_q(self);
            void *(*queue)[2] = static_cast<QUEUE*>(qptr);
            ////
            Local<Object> nd = args[0].As<Object>();
            qptr = Wrap::get_q(nd);
            void *(*ndq)[2] = static_cast<QUEUE*>(qptr);
            ////
            QUEUE_INSERT_HEAD(queue,ndq);
        }


        void Queue::InsertTail(const FunctionCallbackInfo<Value>& args) {
            ////
            Local<Object> self = args.Holder();
            void* qptr = Wrap::get_q(self);
            void *(*queue)[2] = static_cast<QUEUE*>(qptr);
            ////
            Local<Object> nd = args[0].As<Object>();
            qptr = Wrap::get_q(nd);
            void *(*ndq)[2] = static_cast<QUEUE*>(qptr);
            ////
            QUEUE_INSERT_TAIL(queue,ndq);
        }


        void Queue::IndexOf(const FunctionCallbackInfo<Value>& args) {
            ////
            Local<Object> self = args.Holder();
            void* qptr = Wrap::get_q(self);
            void *(*queue)[2] = static_cast<QUEUE*>(qptr);
            ////
            Local<Object> nd = args[0].As<Object>();
            qptr = Wrap::get_q(nd);
            void *(*ndq)[2] = static_cast<QUEUE*>(qptr);
            ////
            int64_t c = -1;
            if(!QUEUE_EMPTY(queue)) {
                c = 0;
                QUEUE * tmpq;
                QUEUE_FOREACH(tmpq,queue) {
                    if(tmpq == ndq) {
                        break;  
                    }
                    c = c + 1;
                }
            } else {
            }
            Environment* env = Environment::GetCurrent(args);
            Isolate* isolate = env->isolate();
            Local<Integer> index = Integer::New(isolate,c);
            args.GetReturnValue().Set(index);
        }
        

        void Queue::GetLength(const FunctionCallbackInfo<Value>& args) {
            Local<Object> self = args.Holder();
            void* qptr = Wrap::get_q(self);
            void *(*queue)[2] = static_cast<QUEUE*>(qptr);
            uint64_t length =0; 
            if(!QUEUE_EMPTY(queue)) {
                QUEUE * tmpq;
                QUEUE_FOREACH(tmpq,queue) {
                    length = length + 1;
                }
            } else {
            }
            Environment* env = Environment::GetCurrent(args);
            Isolate* isolate = env->isolate();
            Local<BigInt> lngth = BigInt::NewFromUnsigned(isolate,length);
            args.GetReturnValue().Set(lngth);
        }


        void Queue::GetWithIndex(const FunctionCallbackInfo<Value>& args) {
            Environment* env = Environment::GetCurrent(args);
            uint64_t index = static_cast<uint64_t>(args[0]->IntegerValue(env->context()).ToChecked());
            Local<Object> self = args.Holder();
            void* qptr = Wrap::get_q(self);
            void *(*queue)[2] = static_cast<QUEUE*>(qptr);
            uint64_t c =0;
            if(!QUEUE_EMPTY(queue)) {
                QUEUE * tmpq;
                QUEUE_FOREACH(tmpq,queue) {
                    if(index == c){
                        printf("q %p",tmpq);
                        return;    
                    }
                    c = c + 1;
                }
            } else {
            }
            printf("index not in range!!");
            //args.GetReturnValue().Set(lngth);
        }
        
        


        void Queue::ShowQptr(const FunctionCallbackInfo<Value>& args) {
            ////
            Local<Object> self = args.Holder();
            void* qptr = Wrap::get_q(self);
            printf("queue ptr.... %p\n", qptr);
        }
        
        ////node
        void Node::MakeNodeCls(
            Environment* env,
            Local<Object> target
        ) {
            Local<FunctionTemplate> nt = Wrap::setup_cls(env,Node::New,10);
            env->SetProtoMethod(nt, "getNext", GetNext);
            env->SetProtoMethod(nt, "getPrev", GetPrev);
            env->SetProtoMethod(nt, "removeFromQueue", RemoveFromQueue);
            env->SetProtoMethod(nt, "showNptr", ShowNptr);
            Wrap::add_cls(target,env,nt,"Node");
        }
        Node::Node(Environment* env, Local<Object> obj) {
            obj->SetAlignedPointerInInternalField(Wrap::InternalFields::kThis,nullptr);
            obj->SetAlignedPointerInInternalField(Wrap::InternalFields::kThis,this);
            QUEUE_INIT(&(Node::q));
            obj->SetAlignedPointerInInternalField(Wrap::InternalFields::kQueue,nullptr);
            obj->SetAlignedPointerInInternalField(Wrap::InternalFields::kQueue,&(Node::q));
        }
        void Node::New(const FunctionCallbackInfo<Value>& args) {
            CHECK(args.IsConstructCall());
            Environment* env = Environment::GetCurrent(args);
            new Node(env, args.Holder());
        }
        void Node::Initialize(
            Local<Object> target,
            Local<Value> unused,
            Local<Context> context,
            void* priv
        ) {
            Environment* env = Environment::GetCurrent(context);
            //Isolate* isolate = env->isolate();
            Node::MakeNodeCls(env,target);
        }
        void Node::GetNext(const FunctionCallbackInfo<Value>& args) {
            Local<Object> self = args.Holder();
            void* qptr = Wrap::get_q(self);
            void *(*q)[2] = static_cast<QUEUE*>(qptr);
            if(!QUEUE_EMPTY(q)) {
                void *(*ret)[2] = QUEUE_NEXT(q);
                printf("next %p",ret);
            } else {
                printf("lonely!");
            }
        }

        void Node::GetPrev(const FunctionCallbackInfo<Value>& args) {
            Local<Object> self = args.Holder();
            void* qptr = Wrap::get_q(self);
            void *(*q)[2] = static_cast<QUEUE*>(qptr);
            if(!QUEUE_EMPTY(q)) {
                void *(*ret)[2] = QUEUE_PREV(q);
                printf("prev %p",ret);
            } else {
                printf("lonely!");
            }
        }

        void Node::RemoveFromQueue(const FunctionCallbackInfo<Value>& args) {
            Local<Object> self = args.Holder();
            void* qptr = Wrap::get_q(self);
            void *(*q)[2] = static_cast<QUEUE*>(qptr);
            if(!QUEUE_EMPTY(q)) {
                QUEUE_REMOVE(q);
            } else {
                printf("already lonely!");
            }
            QUEUE_INIT(q);
        }

       
        void Node::ShowNptr(const FunctionCallbackInfo<Value>& args) {
            ////
            Local<Object> self = args.Holder();
            void* qptr = Wrap::get_q(self);
            printf("node ptr.... %p\n", qptr);
        }
    }

}

NODE_MODULE_CONTEXT_AWARE_INTERNAL(uvqueue, node::uvqueue::Wrap::Initialize)  


/*
 *TODO 
#define QUEUE_DATA(ptr, type, field)

#define QUEUE_ADD(h, n)
返回新Queue


#define QUEUE_SPLIT(h, q, n)
返回新Queue
 */
