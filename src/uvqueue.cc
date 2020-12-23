#include "node.h"
#include "uvqueue.h"  
#include "env-inl.h"  
#include "util-inl.h"  
#include "node_internals.h"  
#include "node_errors.h"


#include <stdio.h>
#include <stdlib.h>
#include <stddef.h>

namespace node {
    using v8::HandleScope;
    using v8::Context;  
    using v8::Function;  
    using v8::FunctionCallbackInfo;  
    using v8::FunctionTemplate; 
    using v8::ObjectTemplate; 
    using v8::Local;  
    using v8::MaybeLocal;
    using v8::EscapableHandleScope;
    using v8::Object;  
    using v8::String;  
    using v8::Value; 
    using v8::Boolean;
    using v8::Isolate;
    using v8::NewStringType;
    using v8::Name;
    using v8::BigInt;
    using v8::Integer;
    using v8::Uint32;
    using v8::External;
 

    namespace uvqueue {
        /*
        template <class T>
        v8::internal::Address* Facutil::get_internal_address_with_persistent_object(Persistent<T> object) {
            T* object_ptr = *object;
            v8::internal::Address* p = static_cast<v8::internal::Address*>(object_ptr);
            return(p);
        }
        */
        template <class T>
        v8::internal::Address* Facutil::get_internal_address_with_local_object(Local<T> object) {
            T* object_ptr = *object;
            v8::internal::Address* p = static_cast<v8::internal::Address*>(object_ptr);
            return(p);
        }
        ////wrap
        Local<FunctionTemplate>  Facutil::setup_cls(
            Environment* env,
            void (*New) (const FunctionCallbackInfo<Value>& args),
            int ifcount
        ) {
            //
            Isolate * isolate = env->isolate();
            //EscapableHandleScope handle_scope(isolate);
            /*
            auto constructor_callback = [](const FunctionCallbackInfo<Value>& args) {
                
                printf("init %p %p\n",args.This(),args.Holder());
                //CHECK(args.IsConstructCall());
                Local <Object> self = args.This();
                printf("init %p \n",self);
                Environment* env = Environment::GetCurrent(args);
                Facutil::init_instance<Queue>(self,env,true);
                args.GetReturnValue().Set(self);
            };
            */
            //constructor
            //EscapableHandleScope handle_scope(isolate);

            Local<FunctionTemplate> t = FunctionTemplate::New(isolate,New);
            //env->NewFunctionTemplate(New);
            Local<ObjectTemplate> ot = t->InstanceTemplate();
            ot->SetInternalFieldCount(ifcount);
            //
            printf("ft %p\n",t);
            printf("ot %p\n",ot);
            //return(handle_scope.Escape(t));
            return(t);
        }
        //   
        void Facutil::add_cls_to_mod(
            Local<Object> target, //uvqueue
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
        void Facutil::make_cls(
            std::map <
                const char * ,
                void (*) (const FunctionCallbackInfo<Value>&)
            > method_map,
            void (*New) (const FunctionCallbackInfo<Value>& args),
            int ifcount,
            const char * clsname,
            Environment* env,
            Local<Object> target  //uvqueue 
        ){
            Local<FunctionTemplate> t = setup_cls(env,New,ifcount);

            //Local<FunctionTemplate> t = setup_cls(env,ifcount);
            printf("make_cls t: %p\n",t);
            
            std::map <
                const char * ,
                void (*) (const FunctionCallbackInfo<Value>&)
            >::iterator iter;
            for(iter=method_map.begin();iter!=method_map.end();iter++) {
                env->SetProtoMethod(t,iter->first,iter->second);
            }
            add_cls_to_mod(target,env,t,clsname);
        }
        ////
        void * Facutil::get_Qptr(Local<Object>& handle) {
            assert(!handle.IsEmpty());
            assert(handle->InternalFieldCount() > 0);
            /*
            Local<External> field = Local<External>::Cast(
                handle->GetInternalField(InternalFields::kQ)
            );
            void* ptr = field->Value(); 
            */
            void *ptr = handle->GetAlignedPointerFromInternalField(
                InternalFields::kQ
            );
            return(ptr);
        }
        template<typename T>
        QUEUE * Facutil::get_qptr(Local<Object>&  handle) {
            void * ptr = Facutil::get_Qptr(handle);
            //从void * 转回 指向 类的指针
            T * inst = static_cast<T *>(ptr);
            Qstru * Qptr = &(inst->Q);
            QUEUE * qptr = &(Qptr->q);
            return(qptr);
        }
        ////
        template<typename T>
        void Facutil::init_instance(
            Local <Object> & self,
            Environment* env,
            bool is_queue
        ) {
            Isolate* isolate = env->isolate();
            T * q = new T(env, self);
            (q->Q).is_queue = is_queue;
            //(q->Q).obj = creat_new_persistant_handle<Object>(isolate,self);
            (q->Q).obj = self;
            printf("%p,%p\n",self,(q->Q).obj);
            //printf("%d\n",((q->Q).obj)->GetIdentityHash());

            //v8::internal::Address* p = Facutil::get_internal_address_with_persistent_object<Object>((q->Q).obj);
            //printf("ia qobj        :  %p\n", *p);


            QUEUE_INIT(&((q->Q).q));
            self->SetAlignedPointerInInternalField(
                Facutil::InternalFields::kQ,
                static_cast<void *>(q)
            );
        }    
        ////queue
        Queue::Queue(Environment* env, Local<Object> obj) {
        }
        void Queue::Init(const FunctionCallbackInfo<Value>& args){
            printf("init %p\n",args.This());
            Environment* env = Environment::GetCurrent(args);
            Isolate* isolate = env->isolate();
            //EscapableHandleScope handle_scope(isolate);
            Local <Object> self = args.This();
            //v8::internal::Address* p = Facutil::get_internal_address_with_persistent_object<Object>(self);
            //printf("ia self        :  %p\n", *p);

            Facutil::init_instance<Queue>(self,env,true);
        }
        void Queue::New(const FunctionCallbackInfo<Value>& args) {
            printf("new %p\n",args.This());
            CHECK(args.IsConstructCall());
        }
        //
        void Queue::IsEmpty(const FunctionCallbackInfo<Value>& args) {
            Local<Object> self = args.This();
            QUEUE * qptr = Facutil::get_qptr<Queue>(self);
            void *(*queue)[2] = qptr;
            bool ret = QUEUE_EMPTY(queue);
            Environment* env = Environment::GetCurrent(args);
            Isolate* isolate = env->isolate();
            Local<Boolean> bl = Boolean::New(isolate, ret);
            args.GetReturnValue().Set(bl); 
            ////   
        }
       
        void Queue::GetHead(const FunctionCallbackInfo<Value>& args) {
            Local<Object> self = args.This();
            printf("get head self %p",self);
            QUEUE * qptr = Facutil::get_qptr<Queue>(self);
            void *(*queue)[2] = qptr;
            if(!QUEUE_EMPTY(queue)) {
                void *(*ret)[2] = QUEUE_HEAD(queue);
                Qstru * Q = QUEUE_DATA(ret,Qstru,q);
                printf("get head ret %p",ret);
                Local <Object> nd = Q->obj;
                args.GetReturnValue().Set(nd);
            } else {
                args.GetReturnValue().SetNull();
            }
        }


        void Queue::GetTail(const FunctionCallbackInfo<Value>& args) {
            Local<Object> self = args.This();
            QUEUE * qptr = Facutil::get_qptr<Queue>(self);
            void *(*queue)[2] = qptr;
            if(!QUEUE_EMPTY(queue)) {
                void *(*ret)[2] = QUEUE_PREV(queue);
                Qstru * Q = QUEUE_DATA(ret,Qstru,q);
                printf("get tail ret %p",ret);
                Local <Object> nd =Q->obj;
                args.GetReturnValue().Set(nd);
            } else {
                args.GetReturnValue().SetNull();
            }
        }

        void Queue::InsertHead(const FunctionCallbackInfo<Value>& args) {
            ////
            Local<Object> self = args.This();
            printf("insert this === queue %d\n",args.Length());
            QUEUE * qptr = Facutil::get_qptr<Queue>(self);
            void *(*queue)[2] = qptr;
            ////
            CHECK(args[0]->IsObject());
            Local<Object> nd = Local<Object>::Cast(args[0]); 
            printf("insert this === nd %p,%p\n",*nd,args.This());

            qptr = Facutil::get_qptr<Queue>(nd);
            void *(*ndq)[2] = qptr;
            ////
            QUEUE_INSERT_HEAD(queue,ndq);
        }


        void Queue::InsertTail(const FunctionCallbackInfo<Value>& args) {
            ////
            Local<Object> self = args.This();
            QUEUE * qptr = Facutil::get_qptr<Queue>(self);
            void *(*queue)[2] = qptr;
            ////
            Local<Object> nd = args[0].As<Object>();
            qptr = Facutil::get_qptr<Queue>(nd);
            void *(*ndq)[2] = qptr;
            ////
            QUEUE_INSERT_TAIL(queue,ndq);
        }


        void Queue::IndexOf(const FunctionCallbackInfo<Value>& args) {
            ////
            Local<Object> self = args.This();
            QUEUE * qptr = Facutil::get_qptr<Queue>(self);
            void *(*queue)[2] = qptr;
            ////
            Local<Object> nd = args[0].As<Object>();
            qptr = Facutil::get_qptr<Queue>(nd);
            void *(*ndq)[2] = qptr;
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
            Local<Object> self = args.This();
            QUEUE * qptr = Facutil::get_qptr<Queue>(self);
            void *(*queue)[2] = qptr;
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
            Local<Integer> lngth = Integer::New(isolate,length);
            args.GetReturnValue().Set(lngth);
        }


        void Queue::GetWithIndex(const FunctionCallbackInfo<Value>& args) {
            Environment* env = Environment::GetCurrent(args);
            uint64_t index = static_cast<uint64_t>(args[0]->IntegerValue(env->context()).ToChecked());
            Local<Object> self = args.This();
            QUEUE * qptr = Facutil::get_qptr<Queue>(self);
            void *(*queue)[2] = qptr;
            uint64_t c =0;
            if(!QUEUE_EMPTY(queue)) {
                QUEUE * tmpq;
                QUEUE_FOREACH(tmpq,queue) {
                    if(index == c){                    
                       Qstru * Q = QUEUE_DATA(tmpq,Qstru,q);
                       printf("Q->obj :: %p %p\n",Q->obj,tmpq);
                       Environment* env = Environment::GetCurrent(args);
                       Isolate* isolate = env->isolate();
                       //Local <Object> nd = Local::New(isolate,Q->obj);
                       Local <Object> nd = Q->obj;
                       args.GetReturnValue().Set(nd);
                       return;
                    }
                    c = c + 1;
                }
            } else {
            }
            printf("index not in range!!");
            args.GetReturnValue().SetNull();
        }
        
        

        void Queue::ShowQptr(const FunctionCallbackInfo<Value>& args) {
            ////
            Local<Object> self = args.This();
            Environment* env = Environment::GetCurrent(args);
            Isolate* isolate = env->isolate();
            Local<Integer> id = Integer::New(isolate,self->GetIdentityHash());
            printf("showqptr self hash %d\n",id);

            QUEUE * qptr = Facutil::get_qptr<Queue>(self);
            void *(*queue)[2] = qptr;
            Qstru * Q = QUEUE_DATA(queue,Qstru,q);
            //Local <Object> nd = Local<Object>::New(isolate,Q->obj);
            Local <Object> nd = Local<Object>::New(isolate,Q->obj);
            //v8::internal::Address* p = Facutil::get_internal_address_with_persistent_object<Object>(Q->obj);
            //printf("ia qobj        :  %p\n", *p);
            //p = Facutil::get_internal_address_with_persistent_object<Object>(self);
            //printf("ia self        :  %p\n", *p);


            bool * is_queue_ptr = &(Q->is_queue);
            printf("queue        :  %p\n", self);
            printf("is-queue-ptr :  %p\n",is_queue_ptr);
            printf("obj-ptr      :  %p\n", &(Q->obj));
            //printf("obj          :  %p\n", obj);
            printf("q-ptr        :  %p\n", qptr);  
            args.GetReturnValue().Set(nd);
        }
        
        ////node
        Node::Node(Environment* env, Local<Object> obj) {
        }
        void  Node::Init(const FunctionCallbackInfo<Value>& args) {
            printf("init %p\n",args.This());
            Environment* env = Environment::GetCurrent(args);
            Isolate* isolate = env->isolate();            
            //EscapableHandleScope handle_scope(isolate);
            Local <Object> self = args.This();
            Facutil::init_instance<Node>(self,env,false);        
        }
        void Node::New(const FunctionCallbackInfo<Value>& args) {
            CHECK(args.IsConstructCall());
            args.GetReturnValue().Set(args.This());
        }
        void Node::GetNext(const FunctionCallbackInfo<Value>& args) {
            Local<Object> self = args.This();
            QUEUE* qptr = Facutil::get_qptr<Node>(self);
            void *(*q)[2] = qptr;
            if(!QUEUE_EMPTY(q)) {
                void *(*ret)[2] = QUEUE_NEXT(q);
                Qstru * Q = QUEUE_DATA(ret,Qstru,q);
                printf("get next ret %p",ret);
                Local <Object> nd =Q->obj;
                args.GetReturnValue().Set(nd);
            } else {
                args.GetReturnValue().SetNull();
            }
        }

        void Node::GetPrev(const FunctionCallbackInfo<Value>& args) {
            Local<Object> self = args.This();
            QUEUE* qptr = Facutil::get_qptr<Node>(self);
            void *(*q)[2] = qptr;
            if(!QUEUE_EMPTY(q)) {
                void *(*ret)[2] = QUEUE_PREV(q);
                Qstru * Q = QUEUE_DATA(ret,Qstru,q);
                printf("get next ret %p",ret);
                Local <Object> nd =Q->obj;
                args.GetReturnValue().Set(nd);
            } else {
               args.GetReturnValue().SetNull();
            }
        }

        void Node::RemoveFromQueue(const FunctionCallbackInfo<Value>& args) {
            Local<Object> self = args.This();
            QUEUE * qptr = Facutil::get_qptr<Node>(self);
            void *(*q)[2] = qptr;
            if(!QUEUE_EMPTY(q)) {
                QUEUE_REMOVE(q);
            } else {
                printf("already lonely!");
            }
            QUEUE_INIT(q);
        }

       
        void Node::ShowNptr(const FunctionCallbackInfo<Value>& args) {
            Local<Object> self = args.This();
            QUEUE* qptr = Facutil::get_qptr<Node>(self);
            void *(*ret)[2] = qptr;
            Qstru * Q = QUEUE_DATA(ret,Qstru,q);
            Local <Object> nd =Q->obj;
            args.GetReturnValue().Set(nd);
        }



        ////////////



        void GetThis(const FunctionCallbackInfo<Value>& args) {
            args.GetReturnValue().Set(args.This());
        }

        void GetHolder(const FunctionCallbackInfo<Value>& args) {
            args.GetReturnValue().Set(args.Holder());
        }


       Person::Person(){} 

       void Person::Pnew(const FunctionCallbackInfo<Value>& args) {
           Isolate* isolate = Isolate::GetCurrent();
           HandleScope scope(isolate);
           Person *p      = new Person();
           //p->Wrap(args.This());
           printf("pnew %p\n",args.This()); 
           args.GetReturnValue().Set(args.This());
       }
       
        
        void Person::Tst(const FunctionCallbackInfo<Value>& args) {
            printf("tst %p\n",args.This());
            args.GetReturnValue().Set(args.This());
        }


        void Person::GetCons(const FunctionCallbackInfo<Value>& args) {
            /*
            Local<Object> self = args.This();
            Environment* env = Environment::GetCurrent(args);
            Local<Value> value;
            String::NewFromUtf8(env->isolate(),"Psrn", NewStringType::kNormal).ToLocal(&value);
            printf("ok");
            printf("%p\n",otmpl);
            //MaybeLocal<Object> maybe = otmpl->NewInstance(env->context());
            //printf("ok");
            //Local<Object> obj = maybe.ToLocalChecked();
            Local<Object> obj = ftmpl->GetFunction(env->context()).ToLocalChecked();
 
            printf("ok");
            */
            Environment* env = Environment::GetCurrent(args);
            Isolate * isolate = env->isolate();
            Local<FunctionTemplate> tpl = FunctionTemplate::New(isolate,Person::Pnew);
            Local<ObjectTemplate> ot = tpl->InstanceTemplate();
            ot->SetInternalFieldCount(1);

            env->SetProtoMethod(tpl,"tst",Person::Tst);

            Local<String> str = String::NewFromUtf8(isolate,"Psrn", NewStringType::kNormal).ToLocalChecked();
            tpl->SetClassName(str);
            
            ftmpl = tpl;

            otmpl = ot;
            printf("ok\n");
            MaybeLocal<Object> maybe = otmpl->NewInstance(env->context());
            Local<Object> obj = maybe.ToLocalChecked();
            printf("obj %p\n",maybe); 
            printf("obj %p\n",obj);
            args.GetReturnValue().Set(obj);
        }
        /*
        void Initialize(
            Local<Object> uvqueue_target,
            Local<Value> unused,
            Local<Context> context,
            void* priv
        ) {
            Environment* env = Environment::GetCurrent(context);
            Isolate* isolate = uvqueue_target->GetIsolate();
            Local<FunctionTemplate> tpl = FunctionTemplate::New(isolate,Person::Pnew);
            Local<ObjectTemplate> ot = tpl->InstanceTemplate();
            ot->SetInternalFieldCount(1);


            Local<String> str = String::NewFromUtf8(isolate,"Psrn", NewStringType::kNormal).ToLocalChecked();
            tpl->SetClassName(str);

            ftmpl = tpl;

            otmpl = ot;
            printf("ok\n");
            MaybeLocal<Object> maybe = otmpl->NewInstance(env->context());
            Local<Object> obj = maybe.ToLocalChecked();

            //
      
            uvqueue_target->Set(
                env->context(),
                str,
                tpl->GetFunction(env->context()).ToLocalChecked()
            ).Check();
            env->SetProtoMethod(tpl,"tst",Person::Tst);
            env->SetMethod(uvqueue_target, "getCons", Person::GetCons);
        }
        */
        
        void Initialize(
            Local<Object> uvqueue_target,
            Local<Value> unused,
            Local<Context> context,
            void* priv
        ) {
            Environment* env = Environment::GetCurrent(context);
            ////make class Queue {}
            Facutil::make_cls(
                queue_proto_method_map,Queue::New,
                10,"Queue",env,uvqueue_target
            );
            ////make class Node {}
            Facutil::make_cls(
                node_proto_method_map,Node::New,
                10,"Node",env,uvqueue_target
            );
            ////
            env->SetMethod(uvqueue_target, "getThis", GetThis);
            env->SetMethod(uvqueue_target, "getHolder", GetHolder);
            ////
        }

    }

}

NODE_MODULE_CONTEXT_AWARE_INTERNAL(uvqueue, node::uvqueue::Initialize)  


/*
 *TODO 
#define QUEUE_DATA(ptr, type, field)

#define QUEUE_ADD(h, n)
返回新Queue


#define QUEUE_SPLIT(h, q, n)
返回新Queue
 */
