#include "node.h"
#include "nv8-util.h"  
#include "env-inl.h"  
#include "util-inl.h"  
#include "node_internals.h"  
#include "node_errors.h"

#include <stdio.h>
#include <stdlib.h>
#include <stddef.h>


namespace node {
    namespace nv8_util {
        ////
        Local<Boolean> bl_to_local_bl(
            Isolate*isolate,
            bool bl
        ) {
           EscapableHandleScope handle_scope(isolate);
           Local<Boolean> ret = Boolean::New(isolate,bl);
           return(handle_scope.Escape(ret));
        }
        ////
        Local<Integer> int_to_local_int(
            Isolate*isolate,
            int i
        ) {
           EscapableHandleScope handle_scope(isolate);
           Local<Integer> ret = Integer::New(isolate,i);
           return(handle_scope.Escape(ret));
        }
        ////
        Local <String> str_to_local_str(
            Isolate*isolate,
            const char * str
        ) {
            EscapableHandleScope handle_scope(isolate);
            Local<String> ret = String::NewFromUtf8(isolate,str, NewStringType::kNormal).ToLocalChecked();
            return(handle_scope.Escape(ret));
        }
        ////
        template <class T>
        v8i::Address * get_internal_address_with_local_object(
            Local<T>& object
        ) {
            T* object_ptr = *object;
            v8i::Address* p = reinterpret_cast<v8i::Address*>(object_ptr);
            return(p);
        }
        ////
        template <class T>
        Persistent<T> * get_persistent_refp_from_internal(
            Local<T>& object,
            int index
        ) {
            void * p = object->GetAlignedPointerFromInternalField(index);
            Persistent<T> * pp = static_cast<Persistent<T>*>(p);
            return(pp);
        }
        ////
        template <class T>
        void save_persisent_refp_to_internal_with_self(
            Isolate * isolate,
            Persistent<T>& handle_,
            Local<T>& object,
            int index
        ) {
            handle_.Reset(isolate,object);
            void * p = static_cast<void*>(&handle_);
            object->SetAlignedPointerInInternalField(
                InternalFields::kPersistentRef,
                p
            );
        }
        ////
        template <class T>
        static void save_persisent_refp_to_internal_with_another(
            Isolate * isolate,
            Local <T>& self,
            Local <T>& another,
            int index
        ) {
            //先获取
            Persistent<Object> * pp =
                get_persistent_refp_from_internal<T>(
                    self,index
                );
            //persistent handle 切换到传入的nd
            (*pp).Reset(isolate,another);
        }
        ////
        template <class T>
        Local<T> get_local_from_internal_refp(
            Isolate * isolate,
            Local<T>& object,
            int index
        ) {
            EscapableHandleScope handle_scope(isolate);
            Persistent<Object> * pp =
                get_persistent_refp_from_internal<T>(
                    object,index
                );
            Local<T> ret = creat_new_local_handle_with_persistent_ref<T>(
                isolate,*pp
            );
            return(handle_scope.Escape(ret));
        }
        ////
        template <class T>
        Local<T> creat_new_local_handle(
            Isolate * isolate,
            Local<T>&  that 
        ) {
            EscapableHandleScope handle_scope(isolate);
            Local<T> object = Local<T>::New(isolate,that);
            return(handle_scope.Escape(object));
        }
        ////
        ////
        template <class T>
        Local<T> creat_new_local_handle_with_persistent_ref(
            Isolate* isolate,
            Persistent<T>& handle_
        ) {
            EscapableHandleScope handle_scope(isolate);
            Local<T> handle = Local<T>::New(isolate,handle_);
            return(handle_scope.Escape(handle));
        }
        ////
        template <class T>
        Local<T> reset_persistent_ref_with_local_handle(
            Isolate* isolate,
            Persistent<T>& handle_,
            Local<T>& obj
        ) {
            EscapableHandleScope handle_scope(isolate);
            handle_.Reset(isolate,obj);
            return(handle_scope.Escape(obj));
        }
        ////
        template <class T>
        void emptify_persistent_ref(
            Persistent<T>& handle_
        ) {
            handle_.Reset();
        }        
        ////
        template <class T>
        bool is_persistent_ref_empty(
            Persistent<T>& handle_
        ) {
            return(handle_.IsEmpty());
        }
        ////
        template <class T>
        bool is_persistent_ref_weak(
            Persistent<T>& handle_
        ) {
            return(handle_.IsWeak());
        }
        ////
        template <class T>
        void unweakify_persistent_ref(
            Persistent<T>& handle_
        ) {
            handle_.ClearWeak();
        }
        ////
        template <class T,class W>
        T * get_cppobj_from_internal(
            Local<Object>& obj,
            int index
        ) {
            void* ptr = obj->GetAlignedPointerFromInternalField(index);
            W* wrap = static_cast<W*>(ptr);
            return(static_cast<T*>(wrap));
        }
        ////
        template <class T,class W>
        void weakify_persistent_ref(
            Persistent<T>& handle_,
            W * parameter,         //这里要求是一个c++对象指针
            void(*  callback) (const WeakCallbackInfo<W> &),
            int weak_callback_type
        ) {
            handle_.SetWeak(
                parameter,
                callback,
                static_cast<WeakCallbackType>(weak_callback_type)
            );
        }
        ////
        template <class T,class W>
        void weakify_persistent_ref_with_local(
            Local<Object>& obj,
            int refp_index,
            int cppobj_index,
            void(*  callback) (const WeakCallbackInfo<W> &),
            int weak_callback_type
        ) {
            Persistent<Object> * pp =
                get_persistent_refp_from_internal<T>(
                    obj,refp_index
                );
            W * parameter = get_cppobj_from_internal<W,W>(
                obj,cppobj_index
            );
            printf("internal-cppobj :%p\n",parameter);
            weakify_persistent_ref(
                *pp,parameter,
                callback,weak_callback_type
            );
        }       
        ////
        template<class W>
        void weak_callback(const WeakCallbackInfo<W>& data) {
            W* wrap = data.GetParameter();
            printf("paameter :%p\n",wrap);
            printf("WeakCallback triggered!!");
        } 
        ////
        template <typename T>
        void make_constants_in_mod(
            Environment* env,
            Local<Object> mod_target,
            const char * name,
            std::map <
                const char * ,
                T //模块中每个单独的方法
            > kv_map,
            int typ
        ) {
            Local <Object> constants = Object::New(env->isolate());
            typename std::map <
                const char * ,
                T 
            >::iterator iter;
            for(
                iter=kv_map.begin();
                iter!=kv_map.end();
                iter++
            ) {
                if(typ == kType::kIntType) {
                    constants->Set(
                        env->context(),
                        str_to_local_str(env->isolate(),iter->first),
                        int_to_local_int(env->isolate(),iter->second)
                    ).Check();
                } else if(typ == kType::kConstStrType) {
                    /*
                    constants->Set(
                        env->context(),
                        str_to_local_str(env->isolate(),iter->first),
                        str_to_local_str(env->isolate(),iter->second)
                    ).Check();
                    */
                } else {
                }
            }
            mod_target->Set(
                env->context(),
                str_to_local_str(env->isolate(),name),
                constants
            ).Check();
        }
        ////
        void make_funcs_in_mod(
            Environment* env,
            Local<Object> mod_target,
            std::map <
                const char * ,
                FunctionCallback //模块中每个单独的方法
            > mod_func_map
        ) {
            std::map <
                const char * ,
                FunctionCallback
            >::iterator iter;
            for(
                iter=mod_func_map.begin();
                iter!=mod_func_map.end();
                iter++
            ) {
                env->SetMethod(mod_target,iter->first,iter->second);
            }
        }
        ////创建cls_ft,并设置ot 的ifcount
        Local<FunctionTemplate>  setup_cls(
            Environment* env,
            FunctionCallback construct_new, // constructor
            int ifcount
        ) {
            Isolate * isolate = env->isolate();
            EscapableHandleScope handle_scope(isolate);
            Local<FunctionTemplate> ft = FunctionTemplate::New(isolate,construct_new);
            Local<ObjectTemplate> ot = ft->InstanceTemplate();
            ot->SetInternalFieldCount(ifcount);
            return(handle_scope.Escape(ft));
        }
        ////给ft添加 proto methods 到 PrototypeTemplate
        Local<FunctionTemplate> add_proto_methods_to_cls(
            Environment* env,
            Local<FunctionTemplate> cls_ft, //class ft
            std::map <
                const char * ,
                FunctionCallback //proto_method 每个单独的方法
            > proto_method_map
        ) {
            Isolate * isolate = env->isolate();
            EscapableHandleScope handle_scope(isolate);
            std::map <
                const char * ,
                FunctionCallback
            >::iterator iter;
            for(
                iter=proto_method_map.begin();
                iter!=proto_method_map.end();
                iter++
            ) {
                //SetProtoMethod 会以每个proto_method为
                //FunctionCallback ,创建新的 proto_method_ft
                //并把proto_method 添加到 proto_method_ft->PrototypeTemplate
                env->SetProtoMethod(cls_ft,iter->first,iter->second);
            }
            return(handle_scope.Escape(cls_ft));
        }
        //创建一个cls
        Local<FunctionTemplate> creat_cls(
            Environment* env,
            const char  *clsname,
            FunctionCallback construct_new,
            std::map <
                const char * ,
                FunctionCallback //proto_method 每个单独的方法
            > proto_method_map,
            int ifcount
        ) {
             Isolate * isolate = env->isolate();
             EscapableHandleScope handle_scope(isolate);
             Local<FunctionTemplate> cls_ft = setup_cls(env,construct_new,ifcount);
             cls_ft = add_proto_methods_to_cls(env,cls_ft,proto_method_map); 
             Local<String> name = str_to_local_str(isolate,clsname);
             cls_ft->SetClassName(name);
             return(handle_scope.Escape(cls_ft));
        } 
        //把cls加到模块上   
        void add_cls_to_mod(
            Environment* env,
            Local<Object> mod_target,
            Local<FunctionTemplate> cls_ft,
            const char  *clsname //needed 因为ft 没有接口去获取ClassName
        ){
            Isolate * isolate = env->isolate();
            Local<String> name = str_to_local_str(isolate,clsname);
            mod_target->Set(
                env->context(),
                name,
                cls_ft->GetFunction(env->context()).ToLocalChecked()
            ).Check();
        }
        //在模块中添加一个cls
        void make_cls_in_mod(
            Environment* env,
            Local<Object> mod_target,
            const char * clsname,
            FunctionCallback construct_new,
            std::map <
                const char * ,     //proto_method_name
                FunctionCallback   //proto_method,
            > proto_method_map,
            int ifcount
        ){
            Local<FunctionTemplate> cls_ft = creat_cls(
                env,clsname,construct_new,
                proto_method_map,ifcount
            ) ;
            add_cls_to_mod(env,mod_target,cls_ft,clsname);
        }
        //// 直接从 cls_ft 创建一个实例
        Local<Object> creat_instance_from_ft(
            //Isolate*isolate,
            //Local<Context>  context,
            Environment * env,
            Local<FunctionTemplate>& cls_ft
        ) {
            Isolate * isolate = env->isolate();
            Local<Context>  context = env->context();
            EscapableHandleScope handle_scope(isolate);
            Local<ObjectTemplate> ot = cls_ft->InstanceTemplate();
            Local<Object> obj = (ot->NewInstance(context)).ToLocalChecked();
            return(handle_scope.Escape(obj));
        }
        ////
        template <class T> 
        Local<T> get_with_key_from_object(
            Isolate * isolate,
            Local<Object> object,
            Local<Context> context,
            Local<Value> k     
        ) {
            EscapableHandleScope handle_scope(isolate);
            MaybeLocal<T> ret;
            if(k->IsUint32()) {
                uint32_t index = k.As<Uint32>()->Value();
                ret = object->Get(context,index);
            } else {
                ret = object->Get(context,k);
            }
            Local<T> rslt = ret.ToLocalChecked();
            return(handle_scope.Escape(rslt));
        }
        ////暴露给JS的函数
        void get_with_key(
            const FunctionCallbackInfo<Value>& args
        ) {
            Isolate * isolate = args.GetIsolate();
            Local <Object> self = args.This();
            Environment* env = Environment::GetCurrent(args);
            Local<Context> context = env->context();
            if(args.Length()==1) {
                args.GetReturnValue().Set(
                    get_with_key_from_object<Value>(
                        isolate,self,context,args[0]
                    )
                );
            } else if(args.Length()==2) {
                args.GetReturnValue().Set(
                    get_with_key_from_object<Value>(
                        isolate,args[0].As<Object>(),context,args[1]
                    )
                );
            } else {
                args.GetReturnValue().SetUndefined();
            }
        }
        ////
        ////
        void get_property_names(
            const FunctionCallbackInfo<Value>& args
        ) {
            Environment* env = Environment::GetCurrent(args);
            Local<Context> context = env->context();
            ////检查参数
            CHECK(args[0]->IsObject());
            CHECK(args[1]->IsUint32());  ////KeyCollectionMode
            CHECK(args[2]->IsUint32());  ////PropertyFilter
            CHECK(args[3]->IsUint32());  ////IndexFilter
            CHECK(args[4]->IsUint32());  ////KeyConversionMode
            ////
            KeyCollectionMode colm = static_cast<KeyCollectionMode>(args[1].As<Uint32>()->Value());
            PropertyFilter pfltr = static_cast<PropertyFilter>(args[2].As<Uint32>()->Value());
            IndexFilter    ifltr = static_cast<IndexFilter>(args[3].As<Uint32>()->Value());
            KeyConversionMode conm = static_cast<KeyConversionMode>(args[4].As<Uint32>()->Value());
            Local<Object> object = args[0].As<Object>();
            Local<Array> properties;
            if (
                !object->GetPropertyNames(
                    context, 
                    colm,
                    pfltr,
                    ifltr,
                    conm
                ).ToLocal(&properties)
            ) {
              return;
            }
            args.GetReturnValue().Set(properties);
        }
        ////
        void get_internal_field_count(
            const FunctionCallbackInfo<Value>& args    
        ) {
            CHECK(args[0]->IsObject());
            Local<Object> nd = Local<Object>::Cast(args[0]);
            int count = nd->InternalFieldCount();
            Isolate * isolate = args.GetIsolate();
            Local<Integer> ret = int_to_local_int(isolate,count);
            args.GetReturnValue().Set(ret);
        }
        void get_args_this_internal_field_count(
            const FunctionCallbackInfo<Value>& args
        ) {
            int count = args.This()->InternalFieldCount();
            Isolate * isolate = args.GetIsolate();
            Local<Integer> ret = int_to_local_int(isolate,count);
            args.GetReturnValue().Set(ret);
        }
        void get_this(
            const FunctionCallbackInfo<Value>& args
        ) {
            args.GetReturnValue().Set(args.This());
        }
        void get_holder(
            const FunctionCallbackInfo<Value>& args
        ) {
            args.GetReturnValue().Set(args.Holder());
        }
        void clear(
            const FunctionCallbackInfo<Value>& args
        ) {
            Local<Object> nd = Local<Object>::Cast(args[0]);
            nd.Clear();
        }
        void clear_this(
            const FunctionCallbackInfo<Value>& args
        ) {
            Local<Object> self = args.This();
            self.Clear();
        }
        void clear_holder(
            const FunctionCallbackInfo<Value>& args
        ) {
            Local<Object> self = args.Holder();
            self.Clear();
        }
        ////
        void is_empty(
            const FunctionCallbackInfo<Value>& args
        ) {
            Isolate * isolate = args.GetIsolate();
            Local<Object> nd = Local<Object>::Cast(args[0]);
            bool bl = nd.IsEmpty();
            Local<Boolean> ret = bl_to_local_bl(isolate,bl);
            args.GetReturnValue().Set(ret);
        }
        void is_this_empty(
            const FunctionCallbackInfo<Value>& args
        ) {
            Isolate * isolate = args.GetIsolate();
            Local<Object> self = args.This();
            bool bl = self.IsEmpty();
            Local<Boolean> ret = bl_to_local_bl(isolate,bl);
            args.GetReturnValue().Set(ret);
        }
        void is_holder_empty(
            const FunctionCallbackInfo<Value>& args
        ) {
            Isolate * isolate = args.GetIsolate();
            Local<Object> self = args.Holder();
            bool bl = self.IsEmpty();
            Local<Boolean> ret = bl_to_local_bl(isolate,bl);
            args.GetReturnValue().Set(ret);
        }
        ////
        void get_data(
            const FunctionCallbackInfo<Value>& args
        ) {
            Local<Value> val = args.Data();
            args.GetReturnValue().Set(val);
        }
        void get_new_target(
            const FunctionCallbackInfo<Value>& args
        ) {
            Local<Value> val = args.NewTarget();
            args.GetReturnValue().Set(val);
        }
        void get_length(
            const FunctionCallbackInfo<Value>& args
        ) {
            int lngth = args.Length();
            Isolate * isolate = args.GetIsolate();
            Local<Integer> ret = int_to_local_int(isolate,lngth);
            args.GetReturnValue().Set(ret);
        }
        ////
        void show_internal_address(
            const FunctionCallbackInfo<Value>& args
        ) {
            //args[i] v8::Value
            CHECK(args[0]->IsObject());
            Local<Object> nd = Local<Object>::Cast(args[0]);
            //Local<Object>::Cast(args[0]);
            //args[0].As<Object>();
            //args[0]->ToObject(context);
            //上面三个等效
            v8i::Address *p = get_internal_address_with_local_object(nd);
            printf("cast():\n");
            printf("local<object>          : %p\n",nd);
            printf("ptr-of-internal-addr   : %p\n",p);
            printf("internal-addr          : %p\n",*p); 
            ////
        }
        ////
        void get_local_with_dflt_persisent_ref(
            const FunctionCallbackInfo<Value>& args
        ) {
            Isolate * isolate = args.GetIsolate();
            Local<Object> obj = 
                creat_new_local_handle_with_persistent_ref<Object>(
                    isolate,dflt_persistent_handle_
                );
            args.GetReturnValue().Set(obj);
        } 
        ////
        void emptify_dflt_persisent_ref(
            const FunctionCallbackInfo<Value>& args
        ) {
            emptify_persistent_ref(dflt_persistent_handle_);
            Isolate * isolate = args.GetIsolate();
            Local<Object> obj = 
                creat_new_local_handle_with_persistent_ref<Object>(
                    isolate,dflt_persistent_handle_
                );
            args.GetReturnValue().Set(obj);            
        }
        ////
        void is_dflt_persisent_ref_empty(
            const FunctionCallbackInfo<Value>& args
        ) {
            Isolate * isolate = args.GetIsolate();
            bool bl = is_persistent_ref_empty<Object>(dflt_persistent_handle_);
            Local<Boolean> ret = bl_to_local_bl(isolate,bl);
            args.GetReturnValue().Set(ret);
        }
        ////
        void is_dflt_persisent_ref_weak(
            const FunctionCallbackInfo<Value>& args
        ) {
            Isolate * isolate = args.GetIsolate();
            bool bl = is_persistent_ref_weak<Object>(dflt_persistent_handle_);
            Local<Boolean> ret = bl_to_local_bl(isolate,bl);
            args.GetReturnValue().Set(ret);
        }
        ////
        void unweakify_dflt_persisent_ref(
            const FunctionCallbackInfo<Value>& args
        ) {
            unweakify_persistent_ref<Object>(dflt_persistent_handle_);
        }
        ////
        void weakify_obj(
            const FunctionCallbackInfo<Value>& args
        ) {
            Isolate * isolate = args.GetIsolate();
            //从JS传入一个参数
            Local<Object> nd = Local<Object>::Cast(args[0]);
            weakify_persistent_ref_with_local<Object,PersistentWrap>(
                nd,
                static_cast<int>(InternalFields::kPersistentRef),
                static_cast<int>(InternalFields::kCppObj),
                weak_callback<PersistentWrap>,
                static_cast<int>(WeakCallbackType::kParameter)
            );
        }
        ////
        void persistentify_with_dflt_ref(
             const FunctionCallbackInfo<Value>& args
        ){
             Isolate * isolate = args.GetIsolate();
             //从JS传入一个参数
             Local<Object> nd = Local<Object>::Cast(args[0]);
             //init persistent with local
             Local<Object> nnd = reset_persistent_ref_with_local_handle(
                 isolate,
                 dflt_persistent_handle_,
                 nd
             );
             ////persistent->local 
             Local<Object> obj = 
                 creat_new_local_handle_with_persistent_ref<Object>(
                     isolate,
                     dflt_persistent_handle_
                 );
             ////返回
             args.GetReturnValue().Set(obj);
        }
        ////
        void get_obj_from_internal_persistant_ref(
            const FunctionCallbackInfo<Value>& args
        ){
            Isolate * isolate = args.GetIsolate();
            //从JS传入一个参数
            Local<Object> nd = Local<Object>::Cast(args[0]);
            //获取对象的persistent ref
            Local<Object> obj = get_local_from_internal_refp(
                isolate,nd,InternalFields::kPersistentRef
            );
            args.GetReturnValue().Set(obj);
        }
        ////
        void request_gc(const FunctionCallbackInfo<Value>& args){
            Isolate * isolate = args.GetIsolate();
            isolate->LowMemoryNotification();
        }
        ////PersistentWrap
        PersistentWrap::PersistentWrap(Isolate*isolate,Local<Object>& self) {
            self->SetAlignedPointerInInternalField(
                InternalFields::kCppObj, this
            );
        }
        void PersistentWrap::New(const FunctionCallbackInfo<Value>& args) {
            Local<Object> self = args.This();
            Isolate * isolate = args.GetIsolate();
            PersistentWrap *wrap = new PersistentWrap(isolate,self);
        }
        void PersistentWrap::SaveSelfObjToPersistentRef(const FunctionCallbackInfo<Value>& args) {
            Local<Object> self = args.This();
            Isolate * isolate = args.GetIsolate();
            save_persisent_refp_to_internal_with_self<Object>(
                isolate,dflt_persistent_handle_,
                self,InternalFields::kPersistentRef
            );            
        }
        
        void PersistentWrap::SaveAnotherObjToPersistentRef(const FunctionCallbackInfo<Value>& args) {
            Local<Object> self = args.This();
            Isolate * isolate = args.GetIsolate();
            //从JS传入一个参数
            Local<Object> another = Local<Object>::Cast(args[0]);
            save_persisent_refp_to_internal_with_another<Object>(
                isolate,self,
                another,InternalFields::kPersistentRef
            );             
        }

        ////
        void Initialize(
            Local<Object> mod_target,
            Local<Value> unused,
            Local<Context> context,
            void* priv
        ) {
            Environment* env = Environment::GetCurrent(context);
            make_constants_in_mod(env,mod_target,"KeyCollectionMode",KeyCollectionMode_MAP,kType::kIntType);
            make_constants_in_mod(env,mod_target,"PropertyFilter",PropertyFilter_MAP,kType::kIntType);
            make_constants_in_mod(env,mod_target,"IndexFilter",IndexFilter_MAP,kType::kIntType);
            make_constants_in_mod(env,mod_target,"KeyConversionMode",KeyConversionMode_MAP,kType::kIntType);
            make_constants_in_mod(env,mod_target,"WeakCallbackType",WeakCallbackType_MAP,kType::kIntType);
            ////
            make_funcs_in_mod(env,mod_target,MOD_FUNC_MAP);
            ////
            make_cls_in_mod(
                env,mod_target,
                "PersistentWrap",PersistentWrap::New,
                PERSISTENT_PROTO_METHOD_MAP,20
            );
        }

    }

}

NODE_MODULE_CONTEXT_AWARE_INTERNAL(nv8_util, node::nv8_util::Initialize)  


