Node.previousSiblingRead only
Returns a Node representing the previous node in the tree, or null if there isn't such node.

Node.parentElementRead only
Returns an Element that is the parent of this node. If the node has no parent, or if that parent is not an Element, this property returns null.

Node.parentNodeRead only
Returns a Node that is the parent of this node. If there is no such node, like if this node is the top of the tree or if doesn't participate in a tree, this property returns null.

Node.nextSiblingRead only
Returns a Node representing the next node in the tree, or null if there isn't such node.

Node.lastChildRead only
Returns a Node representing the last direct child node of the node, or null if the node has no child.

Node.childNodesRead only
Returns a live NodeList containing all the children of this node (including elements, text and comments). NodeList being live means that if the children of the Node change, the NodeList object is automatically updated.
Node.firstChildRead only

Node.firstChildRead only
Returns a Node representing the first direct child node of the node, or null if the node has no child.

Node.isConnectedRead only
A boolean indicating whether or not the Node is connected (directly or indirectly) to the context object, e.g. the Document object in the case of the normal DOM, or the ShadowRoot in the case of a shadow DOM.


https://developer.mozilla.org/en-US/docs/Web/API/NodeList



Node.contains()
Returns a Boolean value indicating whether or not a node is a descendant of the calling node.
Node.getBoxQuads()
Returns a list of the node's CSS boxes relative to another node.
Node.getRootNode()
Returns the context object's root which optionally includes the shadow root if it is available.
Node.hasChildNodes()
Returns a Boolean indicating whether or not the element has any child nodes.
Node.insertBefore()
Inserts a Node before the reference node as a child of a specified parent node.
Node.isDefaultNamespace()
Accepts a namespace URI as an argument and returns a Boolean with a value of true if the namespace is the default namespace on the given node or false if not.
Node.isEqualNode()
Returns a Boolean which indicates whether or not two nodes are of the same type and all their defining data points match.
Node.isSameNode()
Returns a Boolean value indicating whether or not the two nodes are the same (that is, they reference the same object).
Node.lookupPrefix()
Returns a DOMString containing the prefix for a given namespace URI, if present, and null if not. When multiple prefixes are possible, the result is implementation-dependent.
Node.lookupNamespaceURI()
Accepts a prefix and returns the namespace URI associated with it on the given node if found (and null if not). Supplying null for the prefix will return the default namespace.
Node.normalize()
Clean up all the text nodes under this element (merge adjacent, remove empty).
Node.removeChild()
Removes a child node from the current element, which must be a child of the current node.
Node.replaceChild()
Replaces one child Node of the current one with the second one given in parameter.
Obsolete methods
Node.getUserData()
Allows a user to get some DOMUserData from the node.
Node.hasAttributes()
Returns a Boolean indicating if the element has any attributes, or not.
Node.isSupported()
Returns a Boolean flag containing the result of a test whether the DOM implementation implements a specific feature and this feature is supported by the specific node.
Node.setUserData()
Allows a user to attach, or remove, DOMUserData to the node.
