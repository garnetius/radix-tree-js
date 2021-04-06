/* ================================= $ J $ =====================================
// <radix-tree.mjs>
//
// Idiomatic implementation of the Radix trie data structure
// that is fully compatible with `Map` and comes with built-in converter
// to regular expression.
//
// The keys can only be strings though.
//
// Copyright garnetius.
// -------------------------------------------------------------------------- */

"use strict"

/* ===--------------------------------------------------------------------------
// Radix tree internal data structure used to distinguish from real values */
class RadixNode extends Map {
constructor() {
  super();
}}

/* ===--------------------------------------------------------------------------
// Radix tree itself: provides `Map`-like interface */
class RadixTree extends Map {
get [Symbol.toStringTag]() {
  return "RadixTree";
}

/* =============================================================================
// Traversal
// -----------------------------------------------------------------------------
// Main generator template */
*$traverse (op, word, node) {
  if (node instanceof RadixNode) {
    for (let key of node.keys()) {
      /* Construct the entry key */
      let wordKey;
      const value = node.get (key);

      if (key === RadixTree.sentinel) wordKey = word;
      else wordKey = word + key;

      if (value instanceof RadixNode) {
        /* This must never happen if the key is a sentinel */
        yield* this.$traverse (op, wordKey, value);
      } else {
        /* Leaf node */
        if (op === RadixTree.traverseKind.key) yield wordKey;
        if (op === RadixTree.traverseKind.value) yield value;
        if (op === RadixTree.traverseKind.pair) yield [wordKey, value];
      }
    }
  } else {
    /* The yielded value depends on the kind of operation */
    if (op === RadixTree.traverseKind.key) yield word;
    if (op === RadixTree.traverseKind.value) yield node;
    if (op === RadixTree.traverseKind.pair) yield [word, node];
  }
}

*keys (prefix="") {
  const start = this.startsWith (prefix);
  if (start === undefined) return;
  const [word, node] = start;
  yield* this.$traverse (RadixTree.traverseKind.key, word, node);
}

*values (prefix="") {
  const start = this.startsWith (prefix);
  if (start === undefined) return;
  const [word, node] = start;
  yield* this.$traverse (RadixTree.traverseKind.value, word, node);
}

/* Key/value pairs */
*entries (prefix="") {
  const start = this.startsWith (prefix);
  if (start === undefined) return;
  const [word, node] = start;
  yield* this.$traverse (RadixTree.traverseKind.pair, word, node);
}

/* Classic `forEach()` traversal with optional prefix
// as a last parameter */
forEach (func, that=this, prefix="") {
  for (let [key, value] of this.entries (prefix)) {
    func.call (that, value, key, this);
  }
}

/* Default iterator (without prefix) */
[Symbol.iterator]() {
  return this.entries();
}

/* =============================================================================
// Mutation
// -----------------------------------------------------------------------------
// Compact the node after deletion of any of its child nodes */
$normalize (key, node, sub) {
  if (sub.size === 1) {
    const [subKey, subValue] = sub.entries().next().value;

    if (subKey === RadixTree.sentinel) {
      /* Only the sentinel is left: replace the upper node key
      // with the sentinel's value */
      node.set (key, subValue);
    } else {
      /* The sentinel is gone: merge the remaining key
      // with the upper key and delete the original key */
      node.set (key + subKey, subValue);
      node.delete (key);
    }
  }
}

/* ===--------------------------------------------------------------------------
// Template for all operations on a tree */
$op (op, node, word, wordIdx, value) {
  const wordLen = word.length;

  for (let key of node.keys()) {
    /* Skip the sentinel */
    if (key === RadixTree.sentinel) {
      continue;
    }

    let keyIdx = 0;
    const currIdx = wordIdx;
    const keyLen = key.length;

    /* JavaScript at this time doesn't have the common string prefix function */
    while (key.charCodeAt(keyIdx) === word.charCodeAt(wordIdx)) {
      ++keyIdx;
      ++wordIdx;

      if (keyIdx === keyLen) {
        /* The key matches */
        const sub = node.get (key);

        if (wordIdx !== wordLen) {
          /* But the word is incomplete */
          if (sub instanceof RadixNode) {
            /* Look up the sub node */
            const ret = this.$op (op, sub, word, wordIdx, value);

            if (op === RadixTree.opKind.delete) {
              this.$normalize (key, node, sub);
            }

            return ret;
          }

          if (op === RadixTree.opKind.set) {
            /* Add the rest of the word */
            const wordName = word.substring (wordIdx);
            const newSub = new RadixNode();

            newSub.set (RadixTree.sentinel, sub);
            newSub.set (wordName, value);
            node.set (key, newSub);

            return true;
          } else if (op === RadixTree.opKind.get
          || op === RadixTree.opKind.startsWith) {
            return undefined;
          } else {
            return false;
          }
        }

        /* Complete match */
        if (op === RadixTree.opKind.set) {
          /* Replace the old value */
          let add;

          if (sub instanceof RadixNode) {
            /* Provide the value via a sentinel key */
            const oldSize = sub.size;
            sub.set (RadixTree.sentinel, value);
            add = oldSize !== sub.size;
          } else {
            const oldSize = node.size;
            node.set (key, value);
            add = oldSize !== node.size;
          }

          return add;
        } else {
          if (sub instanceof RadixNode) {
            /* The value is in a sentinel key */
            if (op === RadixTree.opKind.get) {
              return sub.get (RadixTree.sentinel);
            } else if (op === RadixTree.opKind.startsWith) {
              return [word, sub];
            } else {
              if (op === RadixTree.opKind.delete) {
                return sub.delete (RadixTree.sentinel);
              }

              return sub.has (RadixTree.sentinel);
            }
          }

          /* The sub node itself is a value */
          if (op === RadixTree.opKind.get) {
            return sub;
          } else if (op === RadixTree.opKind.startsWith) {
            return [word, sub];
          } else {
            if (op === RadixTree.opKind.delete) {
              return node.delete (key);
            }

            return true;
          }
        }
      }

      if (wordIdx === wordLen) {
        /* The word is a substring of another word
        // that is present in this tree */
        if (op === RadixTree.opKind.set) {
          /* Break the key */
          const newName = key.substring (0, keyIdx);
          const subName = key.substring (keyIdx);

          const sub = node.get (key);
          const brk = new RadixNode();

          brk.set (RadixTree.sentinel, value);
          brk.set (subName, sub);
          node.set (newName, brk);
          node.delete (key);

          return true;
        } else if (op === RadixTree.opKind.get) {
          return undefined;
        } else if (op === RadixTree.opKind.startsWith) {
          return [word + key.substring (keyIdx), node.get (key)];
        } else {
          return false;
        }
      }
    }

    if (currIdx !== wordIdx) {
      /* Partial match */
      if (op === RadixTree.opKind.set) {
        /* Break the key and add the rest of the word */
        const newName = key.substring (0, keyIdx);
        const subName = key.substring (keyIdx);
        const wordName = word.substring (wordIdx);

        const sub = node.get (key);
        const brk = new RadixNode();

        brk.set (subName, sub);
        brk.set (wordName, value);
        node.set (newName, brk);
        node.delete (key);

        return true;
      } else if (op === RadixTree.opKind.get
      || op === RadixTree.opKind.startsWith) {
        return undefined;
      } else {
        return false;
      }
    }
  }

  /* No match */
  if (op === RadixTree.opKind.set) {
    /* Add the whole word */
    const wordName = word.substring (wordIdx);
    node.set (wordName, value);
    return true;
  } else if (op === RadixTree.opKind.get
  || op === RadixTree.opKind.startsWith) {
    return undefined;
  } else {
    return false;
  }
}

/* Mutation */
set (word, value=null) {
  let add;

  if (word === "") {
    const oldSize = this.root.size;
    this.root.set (RadixTree.sentinel, value);
    add = oldSize !== this.root.size;
  } else {
    add = this.$op (RadixTree.opKind.set, this.root, word, 0, value);
  }

  this.size += add;

  /* Chainable */
  return this;
}

delete (word) {
  let del;

  if (word === "") del = this.root.delete (RadixTree.sentinel);
  else del = this.$op (RadixTree.opKind.delete, this.root, word, 0);

  this.size -= del;

  return del;
}

clear() {
  this.root.clear();
  this.size = 0;
}

/* Fuzzy get */
startsWith (prefix) {
  if (prefix === "") return [prefix, this.root];
  return this.$op (RadixTree.opKind.startsWith, this.root, prefix, 0);
}

get (word) {
  if (word === "") return this.root.get (RadixTree.sentinel);
  return this.$op (RadixTree.opKind.get, this.root, word, 0);
}

has (word) {
  if (word === "") return this.root.has (RadixTree.sentinel);
  return this.$op (RadixTree.opKind.has, this.root, word, 0);
}

/* =============================================================================
// Build the string representation of a tree
// suitable for use in a regular expression
// -------------------------------------------------------------------------- */

$toStringNode (str, node, opt, brace, reverse) {
  const reverseString = (str) => {
    return str.split ('').reverse().join ('');
  }

  let arr = [];
  let hasMaps = false;

  for (let [key, sub] of node) {
    arr.push ([key, sub]);
  }

  /* Compress leaf suffixes */
  let tree = new RadixTree();

  for (let idx = 0; idx !== arr.length; ++idx) {
    let [key, sub] = arr[idx];

    if (key === RadixTree.sentinel) {
      continue;
    }

    if (sub instanceof RadixNode) {
      /* Don't look for common suffix inside branches:
      // it becomes way too complex */
      hasMaps = true;
      continue;
    }

    tree.set (reverseString (key));
  }

  let compact = false;

  for (let [key, sub] of tree.root) {
    if (sub instanceof RadixNode) {
      /* Means this set of leaves
      // can be compressed */
      compact = true;

      /* Remove leaves from array.
      // This simplifies code ahead. */
      for (let len = arr.length; len !== 0; --len) {
        const idx = len - 1;

        if (arr[idx][0] === RadixTree.sentinel) {
          continue;
        }

        if (!(arr[idx][1] instanceof RadixNode)) {
          arr.splice (idx, 1);
        }
      }

      break;
    }
  }

  /* Now we know if this branch must be surrounded with braces */
  const braces = brace && (opt || !compact || tree.root.size
  /*- tree.root.has (RadixTree.sentinel) */!== 1);
  str.value += braces ? '(' : '';

  if (compact) {
    str.value += tree.$toString (true);

    if (hasMaps) {
      str.value += '|';
    }
  }

  /* Output branches */
  for (let idx = 0; idx !== arr.length; ++idx) {
    let [key, sub] = arr[idx];

    if (key === RadixTree.sentinel) {
      continue;
    }

    if (!reverse) {
      str.value += key;
    }

    if (sub instanceof RadixNode) {
      /* See if this whole branch is optional */
      const subOpt = sub.has (RadixTree.sentinel);

      /* Additional logic to avoid spurious braces */
      const one = sub.size - subOpt === 1;
      let subBrace = !one;

      if (one) {
        const keyIter = sub.keys();
        let key = keyIter.next().value;

        if (key === RadixTree.sentinel) {
          key = keyIter.next().value;
        }

        const value = sub.get (key);
        subBrace = key.length !== 1/* || value instanceof RadixNode*/;
      }

      this.$toStringNode (str, sub, subOpt, subBrace, reverse);
    }

    if (reverse) {
      str.value += reverseString (key);
    }

    if (idx < arr.length - opt - 1) {
      str.value += '|';
    }
  }

  /* Close the group if needed */
  str.value += braces ? ')' : '';
  str.value += opt ? '?' : '';
}

$toString (reverse) {
  const str = {value: ""};
  this.$toStringNode (str, this.root, this.root.has (RadixTree.sentinel)
  , false, reverse);
  return str.value;
}

toString() {
  return this.$toString (false);
}

toRegExp (opts) {
  return new RegExp(this.toString(), opts);
}

/* =============================================================================
// Constructors
// -------------------------------------------------------------------------- */

$fromArray (arr) {
  for (let item of arr) {
    this.set (item);
  }
}

$fromMap (map) {
  for (let [key, value] of map) {
    this.set (key, value);
  }
}

constructor (iterable) {
  super();

  /* ES6 class properties are broken crap */
  Object.defineProperties (this, {
    root: {value: new RadixNode()},
    size: {value: 0, writable: true}
  });

  if (iterable !== undefined) {
    /* Populate from existing container */
    if ((Array.isArray (iterable) && !Array.isArray (iterable[0]))
    || iterable instanceof String || typeof iterable === "string") {
      /* Accept strings as well (insert each code point) */
      this.$fromArray (iterable);
    } else if (typeof iterable[Symbol.iterator] === "function") {
      this.$fromMap (iterable);
    } else if (iterable instanceof Object) {
      this.$fromMap (Object.entries (iterable));
    } else {
      throw new TypeError();
    }
  }
}}

/* ===--------------------------------------------------------------------------
// Static properties (immutable) */
Object.defineProperties (RadixTree, {
  /* Special key value to indicate leaf nodes */
  sentinel: {value: null/*Symbol()*/},
  opKind: {value: {
    set: 0,
    get: 1,
    has: 2,
    delete: 3,
    startsWith: 4
  }},
  traverseKind: {value: {
    key: 0,
    value: 1,
    pair: 2
  }}
});

/* ===--------------------------------------------------------------------------
// Exports */
export {
  //RadixNode,
  RadixTree
}

/* ===------------------------------ =^.^= -------------------------------=== */
