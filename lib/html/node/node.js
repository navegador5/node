//static
const NODE_TYPE = require("html/node/node_type");
const DOCUMENT_POSITION = require("html/node/document_position");

///
const ndcls = require("html/tree/ndcls");

const ALL_PROPERTIES = [
    "baseURI",
    "childNodes",
    "firstChild",
    "isConnected",
    "lastChild",
    "nextSibling",
    "nodeName",
    "nodeType",
    "nodeValue", //writable
    "ownerDocument",
    "parentNode",
    "parentElement",
    "previousSibling",
    "textContent", //writable
    "localName",
    "namespaceURI",
    "prefix",
]

const READONLY_PROPERTIES = [
    "baseURI",
    "childNodes",
    "firstChild",
    "isConnected",
    "lastChild",
    "nextSibling",
    "nodeName",
    "nodeType",
    "ownerDocument",
    "parentNode",
    "parentElement",
    "previousSibling",
    "localName",
    "namespaceURI",
    "prefix",
]


const CONSTRUCT_PROPERTIES = [
    "baseURI",
    "nodeName",
    "nodeType",
    "nodeValue", //writable
    "ownerDocument",
    "textContent", //writable
    "localName",
    "namespaceURI",
    "prefix",
]

const GTST_PROPERTIES = [
    "childNodes",
    "firstChild",
    "isConnected",
    "lastChild",
    "nextSibling",
    "parentNode",
    "parentElement",
    "previousSibling",
]

const WRITABLE_PROPERTIES = [
    "nodeValue", //writable
    "textContent", //writable
]


function setStaticProperties(cls) {
    for(let k in NODE_TYPE) {
        cls[k] = NODE_TYPE[k]
    }
    for(let k in DOCUMENT_POSITION) {
        cls[k] = DOCUMENT_POSITION[k]
    }
}


function construct(that,d) {
    for(let k of Object.keys(d)) {
        that[k] = d[k]
    }
}

function defineReadOnly(that,ks) {
    for(let k of ks) {
        Object.defineProperty(that,k,{writable:false})
    }
}


function defineWritable(that,ks) {
    for(let k of ks) {
        Object.defineProperty(that,k,{writable:true})
    }
}

function _compareDocumentPosition(nd0,nd1) {
    if(nd0._tree !== nd1._tree) {
        return(1)
    } else if(nd0.$is_follwing_of(nd1)) {
        return(2)
    } else if(nd0.$is_preceding_of(nd1)) {
        return(4)
    } else if(nd0.$is_descendant_of(nd1)) {
        return(8)
    } else if(nd0.$is_ancestor_of(nd1)) {
        return(16)
    } else {
        return(32)
    }
}



class Node extends ndcls.Node {
    constructor(d) {
        super();
        construct(this,d);
        defineReadOnly(this,READONLY_PROPERTIES);
        defineWritable(this,WRITABLE_PROPERTIES);
    }
    ////get set
    ////
    appendChild(childNode) {
        let child = this.$append_child(childNode);
        return(child);
    }
    cloneNode(deep) {
        if(deep) {
            let nd = this.$clone();
            return(nd);
        } else {
            let nd = this.$clone();
            nd.$rm_all_children();
            return(nd);
        }
    }
    compareDocumentPosition(otherNode) {
       return(_compareDocumentPosition(this,otherNode))
    }
    contains() {
    }
    getBoxQuads() {
    }
    getRootNode() {
    }
    hasChildNodes() {
    }
    insertBefore() {
    }
    isDefaultNamespace() {
    }
    isEqualNode() {
    }
    isSameNode() {
    }
    lookupPrefix() {
    }
    lookupNamespaceURI() {
    }
    normalize() {
    }
    removeChild() {
    }
    replaceChild() {
    }
    getUserData() {
    }
    hasAttributes() {
    }
    isSupported() {
    }
    setUserData() {
    }
}


setStaticProperties(Node);


module.exports = Node;

