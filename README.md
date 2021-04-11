RadixTree JS
============

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

Idiomatic implementation of the Radix trie data structure that can function as a drop-in replacement for `Map` and comes with built-in converter to `RegExp` regular expression. E.g.:

```js
new RadixTree(["zbxad", "zcrad", "zbad", "zad", "ad", "z"]).toString()
```

Produces neat:

```bash
z((cr)?ad|bx?ad)?|ad
```

Unlike `Map`, the keys can only be strings though, but this should come as fairly obvious.
