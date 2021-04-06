/* ================================= $ J $ =====================================
// RadixTree Node.js demonstration program.
// -------------------------------------------------------------------------- */

import {Core} from "../core-js/core.mjs";

Core.infect();

import {RadixTree} from "./radix-tree.mjs";

const tree = new RadixTree([...process.argv.slice(2)]);
console.log (tree.toString());

/* ===------------------------------ =^.^= -------------------------------=== */
