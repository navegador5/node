#ifndef SRC_NV8_UTIL_H_
#define SRC_NV8_UTIL_H_
#include "v8.h"
#include <cassert>
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


////
using v8::Isolate;
using v8::Context;
using v8::MaybeLocal;
using v8::Local;

using v8::PersistentBase;
    using v8::Persistent;
    using v8::Global;

using v8::WeakCallbackInfo;
using v8::WeakCallbackType;
//using v8::WeakCallbackData;
using v8::WeakCallbackObject;


using v8::HandleScope;
using v8::EscapableHandleScope;

////FunctionCallback
using v8::FunctionCallbackInfo;
using v8::FunctionCallback;

///PropertyNames
using v8::KeyCollectionMode;
using v8::PropertyFilter;
    using v8::ALL_PROPERTIES;
    using v8::ONLY_WRITABLE;
    using v8::ONLY_ENUMERABLE;
    using v8::ONLY_CONFIGURABLE;
    using v8::SKIP_STRINGS;
    using v8::SKIP_SYMBOLS;
using v8::IndexFilter;
using v8::KeyConversionMode;



namespace v8i = v8::internal;

namespace node {
    class Environment;
    namespace nv8_util {
        ////
        enum kType {
            kIntType,
            kConstStrType
        };
        enum InternalFields {
            kCppObj=0,                      //关联的c++ new 的实例
            kPersistentRef=10,              //internal Persistent 
        };
        ////
        Local <Boolean> bl_to_local_bl(Isolate*isolate,bool bl);
        Local <Integer> str_to_local_int(Isolate*isolate,int i);
        Local <String> str_to_local_str(Isolate*isolate,const char * str);
        ////
        template <class T>
        Local<T> get_with_key_from_object(
            Isolate * isolate,
            Local<Object> object,
            Local<Context> context,
            Local<Value> k
        );
        //internal address util
        template <class T>
        static v8i::Address* get_internal_address_with_local_object(
            Local<T>& object
        );
        ////
        template <class T>
        static Local<T> creat_new_local_handle(
             Isolate*isolate,
             Local<T>& that
        );
        ////先用下面的初始化, 再creat
        template <class T>
        static Local<T> creat_new_local_handle_with_persistent_ref(
            Isolate* isolate,
            Persistent<T>& handle_
        );
        ////用reset初始化persistent
        template <class T>
        static Local<T> reset_persistent_ref_with_local_handle(
            Isolate* isolate,
            Persistent<T>& handle_,
            Local<T>& obj
        );
        ////
        template <class T>
        static Persistent<T> * get_persistent_refp_from_internal(
            Local<T>& object,
            int index
        );
        ////
        template <class T>
        static void save_persisent_refp_to_internal_with_self(
            Isolate * isolate,
            Persistent<T>& handle_,
            Local <T>& object,
            int index
        );
        ////
        template <class T>
        static void save_persisent_refp_to_internal_with_another(
            Isolate * isolate,
            Local <T>& self,
            Local <T>& another,
            int index
        );
        ////
        template <class T>
        Local<T> get_local_from_internal_refp(
            Isolate * isolate,
            Local<T>& object,
            int index
        );
        ////清空persistent
        template <class T>
        static void emptify_persistent_ref(
            Persistent<T>& handle_
        );
        ////
        template <class T>
        static bool is_persistent_ref_empty(
            Persistent<T>& handle_
        );
        ////
        template <class T>
        static bool is_persistent_ref_weak(
            Persistent<T>& handle_
        );
        ////
        template <class T>
        static void unweakify_persistent_ref(
            Persistent<T>& handle_
        );
        ////
        template <class T,class W>
        T * get_cppobj_from_internal(
            Local<Object>& obj,
            int index
        );
        ////
        template <class T,class W>
        static void weakify_persistent_ref(
            Persistent<T>& handle_,
            W * parameter,         //这里要求是一个c++对象指针
            void(* 	callback) (const WeakCallbackInfo<W> &), //固定格式的参数
            int weak_callback_type
        );
        ////
        template <class T,class W>
        static void weakify_persistent_ref_with_local(
            Local<Object>& obj,
            int refp_index,
            int cppobj_index,
            void(*  callback) (const WeakCallbackInfo<W> &),
            int weak_callback_type
        );
        ////
        template<class W>
        static void weak_callback(const WeakCallbackInfo<W>& data);
        ////
        template <typename T>
        static void make_constants_in_mod(
            Environment* env,
            Local<Object> mod_target,
            const char * name,
            std::map <
                const char * ,
                T //模块中每个单独的方法
            > kv_map,
            int typ
        );
        //给模块添加函数
        static void make_funcs_in_mod(
            Environment* env,
            Local<Object> mod_target,
            std::map <
                const char * ,
                FunctionCallback //模块中每个单独的方法
            > mod_func_map
        );
        //建立一个 初始状态的cls_ft
        static Local<FunctionTemplate> setup_cls(
            Environment* env,
            FunctionCallback construct_new,
            int ifcount
        );
        //给cls_ft 添加 proto_method
        static Local<FunctionTemplate> add_proto_methods_to_cls(
            Environment* env,
            Local<FunctionTemplate> cls_ft,
            std::map <
                const char *,      // proto_method_name,
                FunctionCallback   //proto_method,
            > proto_method_map
        );
        //创建cls_ft
        static Local<FunctionTemplate> creat_cls(
            Environment* env,
            const char  *clsname,
            FunctionCallback construct_new,
            std::map <
                const char *, 
                FunctionCallback
            > proto_method_map,
            int ifcount
        );
        //把cls 添加到模块上
        static void add_cls_to_mod(
            Environment* env,
            Local<Object> mod_target, 
            Local<FunctionTemplate> cls_ft,
            const char  *clsname
        );
        //creat_cls =>
        //add_cls_to_mod 
        static void make_cls_in_mod(
            Environment* env,
            Local<Object> mod_target,
            const char * clsname,
            FunctionCallback construct_new,
            std::map <
                const char * ,     //proto_method_name
                FunctionCallback   //proto_method,
            > proto_method_map,
            int ifcount
        );
        //directly creat a instance
        static Local<Object> creat_instance_from_ft(
            Environment* env,
            //Isolate * isolate,
            //Local<Context> context,
            Local<FunctionTemplate>& cls_ft
        );  
        //creat instance with internal c++ class
        template<typename T>
        static void init_instance(
            Environment* env,
            Local <Object> & self,
            bool is_queue
        ); 
        //object util
        static void get_with_key(const FunctionCallbackInfo<Value>&);
        static void get_property_names(const FunctionCallbackInfo<Value>&);
        static void show_internal_address(const FunctionCallbackInfo<Value>&);
        static void get_internal_field_count(const FunctionCallbackInfo<Value>&);
        static void get_args_this_internal_field_count(const FunctionCallbackInfo<Value>&);
        static void get_this(const FunctionCallbackInfo<Value>&);
        static void get_holder(const FunctionCallbackInfo<Value>&);
        static void is_empty(const FunctionCallbackInfo<Value>&);
        static void is_this_empty(const FunctionCallbackInfo<Value>&);
        static void is_holder_empty(const FunctionCallbackInfo<Value>&);
        static void clear(const FunctionCallbackInfo<Value>&);
        static void clear_this(const FunctionCallbackInfo<Value>&);
        static void clear_holder(const FunctionCallbackInfo<Value>&);        
        static void get_data(const FunctionCallbackInfo<Value>&);
        static void get_length(const FunctionCallbackInfo<Value>&);
        static void get_new_target(const FunctionCallbackInfo<Value>&);
        static void persistentify_with_dflt_ref(const FunctionCallbackInfo<Value>&);
        static void get_local_with_dflt_persisent_ref(const FunctionCallbackInfo<Value>&);
        static void emptify_dflt_persisent_ref(const FunctionCallbackInfo<Value>&);
        static void is_dflt_persisent_ref_empty(const FunctionCallbackInfo<Value>&);
        static void is_dflt_persisent_ref_weak(const FunctionCallbackInfo<Value>&);
        static void unweakify_dflt_persisent_ref(const FunctionCallbackInfo<Value>&);
        static void weakify_obj(const FunctionCallbackInfo<Value>&);
        static void get_obj_from_internal_persistant_ref(const FunctionCallbackInfo<Value>&);
        static void request_gc(const FunctionCallbackInfo<Value>&);
        ////
        std::map <
            const char * ,   //mod_func_name  expose to js
            FunctionCallback //mod_func       
        > MOD_FUNC_MAP = {
            {"getWithKey", get_with_key},
            {"getPropertyNames",get_property_names},
            {"showInternalAddress",show_internal_address},
            {"getInternalFieldCount",get_internal_field_count},
            {"getArgsThisInternalFieldCount",get_args_this_internal_field_count},
            {"getThis", get_this},
            {"getHolder", get_holder},
            {"isEmpty", is_empty},
            {"isThisEmpty", is_this_empty},
            {"isHolderEmpty", is_holder_empty},
            {"clear", clear},
            {"clearThis", clear_this},
            {"clearHolder", clear_holder},
            {"getData", get_data},
            {"getLength",get_length},
            {"getNewTarget",get_new_target},
            {"persistentifyWithDfltRef",persistentify_with_dflt_ref},
            {"getLocalWithDfltPersistentRef",get_local_with_dflt_persisent_ref},
            {"emptifyDfltPersistentRef",emptify_dflt_persisent_ref},
            {"isDfltPersistentRefEmpty",is_dflt_persisent_ref_empty},
            {"isDfltPersistentRefWeak",is_dflt_persisent_ref_weak},
            {"unweakifyDfltPersistentRef",unweakify_dflt_persisent_ref},
            {"weakifyObj",weakify_obj},
            {"getObjFromInternalPersistentRef",get_obj_from_internal_persistant_ref},
            {"requestGC",request_gc}
        };
        ////
        std::map <
            const char *,
            int
        > KeyCollectionMode_MAP = {
            {"kOwnOnly",static_cast<int>(KeyCollectionMode::kOwnOnly)},
            {"kIncludePrototypes",static_cast<int>(KeyCollectionMode::kIncludePrototypes)}
        };
        ////
        std::map <
            const char *,
            int
        > PropertyFilter_MAP = {
            {"ALL_PROPERTIES",static_cast<int>(ALL_PROPERTIES)},
            {"ONLY_WRITABLE",static_cast<int>(ONLY_WRITABLE)},
            {"ONLY_ENUMERABLE",static_cast<int>(ONLY_ENUMERABLE)},
            {"ONLY_CONFIGURABLE",static_cast<int>(ONLY_CONFIGURABLE)},
            {"SKIP_STRINGS",static_cast<int>(SKIP_STRINGS)},
            {"SKIP_SYMBOLS",static_cast<int>(SKIP_SYMBOLS)}
        };
        ////
        std::map<
            const char *,
            int
        > IndexFilter_MAP = {
            {"kIncludeIndices",static_cast<int>(IndexFilter::kIncludeIndices)},
            {"kSkipIndices",static_cast<int>(IndexFilter::kSkipIndices)}
        };
        ////
        std::map<
            const char *,
            int
        > KeyConversionMode_MAP =  {
            {"kConvertToString",static_cast<int>(KeyConversionMode::kConvertToString)},
            {"kKeepNumbers",static_cast<int>(KeyConversionMode::kKeepNumbers)}
        };
        ////
        std::map<
            const char *,
            int
        > WeakCallbackType_MAP =  {
            {"kParameter",static_cast<int>(WeakCallbackType::kParameter)},
            {"kInternalFields",static_cast<int>(WeakCallbackType::kInternalFields)}
        };
        ////dflt persistent in mod
        Persistent<Object> dflt_persistent_handle_;
        ////
        ////
        class PersistentWrap {
            public:
                PersistentWrap(Isolate*isolate,Local<Object>& self);
                static void New(const FunctionCallbackInfo<Value>& args);
                static void SaveSelfObjToPersistentRef(const FunctionCallbackInfo<Value>& args);
                static void SaveAnotherObjToPersistentRef(const FunctionCallbackInfo<Value>& args);
        };
        std::map <
            const char * ,
            void (*) (const FunctionCallbackInfo<Value>&)
        > PERSISTENT_PROTO_METHOD_MAP = {
            {
                "saveSelfObjToPersistentRef",
                PersistentWrap::SaveSelfObjToPersistentRef
            },
            {
                "saveAnotherObjToPersistentRef",
                PersistentWrap::SaveAnotherObjToPersistentRef
            }
        };
        ////
    }  //namespace uvqueue
}

#endif
