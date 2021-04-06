RadixTree JS
============

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

Idiomatic implementation of the Radix trie data structure that is
fully compatible with `Map` and comes with built-in converter
to regular expression. E.g.:

```js
new RadixTree(["zbxad", "zcrad", "zbad", "zad", "ad", "z"]).toString()
```

Produces a neat:

```
z((cr)?ad|bx?ad)?|ad
```

The keys can only be strings though.
