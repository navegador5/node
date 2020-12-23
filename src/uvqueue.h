#ifndef SRC_UVQUEUE_H_
#define SRC_UVQUEUE_H_
#include "v8.h"
#include <cassert>
#include "../deps/uv/src/queue.h"
#include <map>
#include <node_object_wrap.h>


////Data
using v8::Data;
    ////Module
    using v8::Module;
    ////UnboundModuleScript
    using v8::UnboundModuleScript;
    ////Signature
    using v8::Signature;
    ////AccessorSignature
    using v8::AccessorSignature;
    ////NativeWeakMap
    //using v8::NativeWeakMap;
    ////Template
    using v8::Template;
        using v8::FunctionTemplate;
        using v8::ObjectTemplate;
    ////Value
    using v8::Value;
        ////Primitive
        using v8::Primitive;
            ///Undefined
            using v8::Undefined;
            ////Null
            using v8::Null;
            ////Boolean
            using v8::Boolean;
                using v8::True;
                using v8::False;
            ////Number
            using v8::Number;
            using v8::Integer;
                using v8::Int32;
                using v8::Uint32;
            using v8::BigInt;
            ////Name
            using v8::Name;
                ////String
                using v8::String;
                using v8::NewStringType;
                ////Symbol
                using v8::Symbol;
        ////Object
        using v8::Object;
            ////RegExp
            using v8::RegExp;
            ////Date
            using v8::Date;
            ////
            using v8::BooleanObject;
            using v8::NumberObject;
            using v8::StringObject;
            using v8::SymbolObject;
            using v8::BigIntObject;
            ////Array
            using v8::Array;
            ////Map
            using v8::Map;
            ////Set
            using v8::Set;
            ////Function
            using v8::Function;
            ////Promise
            using v8::Promise;
            ////Proxy
            using v8::Proxy;
            ////WasmModuleObject
            using v8::WasmModuleObject;
            ////SharedArrayBuffer
            using v8::SharedArrayBuffer;
            ////ArrayBuffer
            using v8::ArrayBuffer;
            ////ArrayBufferView
            using v8::ArrayBufferView;
                ////DataView
                using v8::DataView;
                ////TypedArray
                using v8::TypedArray;
                    using v8::Uint8Array;
                    using v8::Uint8ClampedArray;
                    using v8::Int8Array;
                    using v8::Uint16Array;
                    using v8::Int16Array;
                    using v8::Uint32Array;
                    using v8::Int32Array;
                    using v8::Float32Array;
                    using v8::Float64Array;
                    using v8::BigInt64Array;
                    using v8::BigUint64Array;
        ////External
        using v8::External;
   ////Private
   using v8::Private;



using v8::Local;
using v8::Persistent;
using v8::PersistentBase;
using v8::Isolate;
using v8::EscapableHandleScope;



namespace v8i = v8::internal;


namespace node {
    class Environment;
    namespace uvqueue {
        struct Qstru {
            bool is_queue;
            Local<Object> obj;
            //Persistent<Object>  obj;    // 存储 new_local_handle 副本
            QUEUE q;
        };
        v8::Local<v8::FunctionTemplate> ftmpl;
        v8::Local<v8::ObjectTemplate> otmpl;
        class Person {
            public:
                Person();
                static void Tst(const v8::FunctionCallbackInfo<v8::Value>& args);
                static void Pnew(const v8::FunctionCallbackInfo<v8::Value>& args);
                static void GetCons(const v8::FunctionCallbackInfo<v8::Value>& args);
                static void Initialize(
                    v8::Local<v8::Object> uvqueue_target,
                    v8::Local<v8::Value> unused,
                    v8::Local<v8::Context> context,
                    void* priv
                ); 
        };
        class Facutil {
            public:
                enum InternalFields {
                    kQ=8,
                    kI
                };
                //template <class T>
                //static v8::internal::Address* get_internal_address_with_persistent_object(v8::Persistent<T> object);
                template <class T>
                static v8::internal::Address* get_internal_address_with_local_object(v8::Local<T> object);
                template <class T>
                static Local<T> creat_new_local_handle(
                    Isolate * isolate,
                    Local<T>  that
                ) {
                    //EscapableHandleScope handle_scope(isolate);
                    Local<T> object = Local<T>::New(isolate,that);
                    return(object);
                    //return(handle_scope.Escape(object));
                };
                /* 
                template <class T> 
                static Persistent<T> creat_new_persistant_handle(
                    Isolate * isolate,
                    Local<T>  that
                ) {
                    Persistent<T> pobj = PersistentBase<T>::New(isolate, that);
                    return(pobj);
                };
                */
                static v8::Local<v8::FunctionTemplate>  setup_cls(
                    Environment* env,
                    void (*New) (const v8::FunctionCallbackInfo<v8::Value>& args),
                    int ifcount
                );
                static void add_cls_to_mod(
                    v8::Local<v8::Object> target, //uvqueue
                    Environment* env,
                    v8::Local<v8::FunctionTemplate> t,
                    const char  *clsname
                );
                static void make_cls(
                    std::map <
                        const char * ,
                        void (*) (const v8::FunctionCallbackInfo<v8::Value>&)
                    > method_map,
                    void (*New) (const v8::FunctionCallbackInfo<v8::Value>&),
                    int ifcount,
                    const char * clsname,
                    Environment* env,
                    v8::Local<v8::Object> target  //uvqueue
                );                
                static void * get_Qptr(v8::Local<v8::Object>& handle);
                template<typename T>
                static QUEUE * get_qptr(v8::Local<v8::Object>& handle);
                template<typename T>
                static void init_instance(
                    v8::Local <v8::Object> &self,
                    Environment* env,
                    bool is_queue
                ); 
        };
        class Queue {
            public:
                Qstru Q;  
                Queue(Environment* env, v8::Local<v8::Object> obj);
                static void Init(const v8::FunctionCallbackInfo<v8::Value>& args);
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
                Qstru Q; 
                Node(Environment* env, v8::Local<v8::Object> obj);
                static void Init(const v8::FunctionCallbackInfo<v8::Value>& args);

                static void New(const v8::FunctionCallbackInfo<v8::Value>& args);
                static void GetNext(const v8::FunctionCallbackInfo<v8::Value>& args);
                static void GetPrev(const v8::FunctionCallbackInfo<v8::Value>& args);
                static void RemoveFromQueue(const v8::FunctionCallbackInfo<v8::Value>& args);
                static void ShowNptr(const v8::FunctionCallbackInfo<v8::Value>&);

        };
        ////
        ////
        std::map <
            const char * ,
            void (*) (const v8::FunctionCallbackInfo<v8::Value>&)
        > queue_proto_method_map = {
            {"init",Queue::Init},
            {"showQptr",Queue::ShowQptr},
            {"isEmpty", Queue::IsEmpty},
            {"getHead", Queue::GetHead},
            {"getTail", Queue::GetTail},
            {"getWithIndex", Queue::GetWithIndex},
            {"insertHead", Queue::InsertHead},
            {"insertTail", Queue::InsertTail},
            {"indexOf", Queue::IndexOf},
            {"getLength", Queue::GetLength}
        };
        std::map <
            const char * ,
            void (*) (const v8::FunctionCallbackInfo<v8::Value>&)
        > node_proto_method_map = {
            {"init", Node::Init},
            {"getNext", Node::GetNext},
            {"getPrev", Node::GetPrev},
            {"removeFromQueue", Node::RemoveFromQueue},
            {"showNptr", Node::ShowNptr},
        };
    }
}

#endif
