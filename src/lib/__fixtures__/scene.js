// Minimal authored-DOM fixture. A-Frame lifecycle integration also needs browser QA.
export function createDocument() {
  class SceneNode {
    constructor(tag, type = 1, text = null) {
      this.nodeType = type;
      this.tagName = tag?.toUpperCase();
      this.nodeValue = text;
      this.childNodes = [];
      this.parentNode = null;
      this.components = {};
      this.dataset = {};
      this.values = new Map();
      this.listeners = new Map();
      this.isEntity =
        tag === 'a-entity' || tag === 'a-scene' || tag === 'a-box';
      this.hasLoaded = true;
    }

    get attributes() {
      return [...this.values].map(([name, value]) => ({ name, value }));
    }

    get children() {
      return this.childNodes.filter((node) => node.nodeType === 1);
    }

    get id() {
      return this.values.get('id') || '';
    }

    set id(value) {
      this.setAttribute('id', value);
    }

    get src() {
      return this.values.get('src') || '';
    }

    set src(value) {
      this.setAttribute('src', value);
    }

    get crossOrigin() {
      return this.values.get('crossorigin') || '';
    }

    set crossOrigin(value) {
      this.setAttribute('crossorigin', value);
    }

    get parentElement() {
      return this.parentNode;
    }

    get firstChild() {
      return this.childNodes[0] || null;
    }

    get nextSibling() {
      return (
        this.parentNode?.childNodes[
          this.parentNode.childNodes.indexOf(this) + 1
        ] || null
      );
    }

    get isConnected() {
      return this.connectedRoot || !!this.parentNode?.isConnected;
    }

    contains(node) {
      return (
        node === this || this.childNodes.some((child) => child.contains(node))
      );
    }

    hasAttribute(name) {
      return this.values.has(name);
    }

    getAttribute(name) {
      return this.components[name]?.attrValue ?? this.values.get(name) ?? null;
    }

    getDOMAttribute(name) {
      return this.getAttribute(name);
    }

    setAttribute(name, value, propertyValue) {
      const schema = global.AFRAME?.components?.[name.split('__')[0]]?.schema;
      if (schema) {
        const single = global.AFRAME.schema.isSingleProperty(schema);
        let authored = value;
        if (!single && typeof value === 'string') {
          authored = {};
          value
            .split(';')
            .filter((pair) => pair.trim())
            .forEach((pair) => {
              const separator = pair.indexOf(':');
              authored[pair.slice(0, separator).trim()] = pair
                .slice(separator + 1)
                .trim();
            });
        }
        if (propertyValue !== undefined) {
          authored = {
            ...this.components[name]?.attrValue,
            [value]: propertyValue
          };
        }
        this.components[name] = { schema, attrValue: authored };
      }
      this.values.set(name, typeof value === 'object' ? '' : String(value));
    }

    removeAttribute(name, property) {
      if (property !== undefined) {
        this.components[name].attrValue[property] = undefined;
        return;
      }
      delete this.components[name];
      this.values.delete(name);
    }

    appendChild(node) {
      return this.insertBefore(node, null);
    }

    insertBefore(node, anchor) {
      if (node === anchor) return node;
      node.parentNode?.removeChild(node);
      const index = anchor
        ? this.childNodes.indexOf(anchor)
        : this.childNodes.length;
      if (index < 0) throw new Error('Invalid anchor');
      this.childNodes.splice(index, 0, node);
      node.parentNode = this;
      return node;
    }

    removeChild(node) {
      this.childNodes.splice(this.childNodes.indexOf(node), 1);
      node.parentNode = null;
      return node;
    }

    remove() {
      this.parentNode?.removeChild(this);
    }

    addEventListener(name, callback) {
      if (!this.listeners.has(name)) this.listeners.set(name, new Set());
      this.listeners.get(name).add(callback);
    }

    removeEventListener(name, callback) {
      this.listeners.get(name)?.delete(callback);
    }

    emit(name) {
      [...(this.listeners.get(name) || [])].forEach((callback) =>
        callback({ target: this })
      );
    }

    querySelector(tag) {
      for (const child of this.children) {
        if (child.tagName.toLowerCase() === tag) return child;
        const descendant = child.querySelector(tag);
        if (descendant) return descendant;
      }
      return null;
    }
  }

  return {
    createElement: (tag) => new SceneNode(tag),
    createTextNode: (text) => new SceneNode(null, 3, text),
    createComment: (text) => new SceneNode(null, 8, text)
  };
}

export function createAFrame() {
  const scalar = { type: 'string', stringify: (value) => String(value) };
  return {
    components: {
      visible: { schema: scalar },
      material: { schema: { color: scalar, opacity: scalar, src: scalar } },
      behavior: { schema: { target: scalar, value: scalar } },
      position: {
        schema: {
          type: 'vec3',
          stringify: (value) =>
            typeof value === 'string'
              ? value
              : `${value.x} ${value.y} ${value.z}`
        }
      }
    },
    schema: { isSingleProperty: (schema) => typeof schema.type === 'string' },
    utils: {
      styleParser: {
        stringify: (data) =>
          Object.keys(data)
            .map((key) => `${key}: ${data[key]}`)
            .join('; ')
      }
    }
  };
}
