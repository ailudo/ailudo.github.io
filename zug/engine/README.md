# Stockfish engine for Zug's "Play a bot"

`stockfish-19-lite-single.js` and `stockfish-19-lite-single.wasm` are the
lite, single-threaded WebAssembly build of [Stockfish 19](https://stockfishchess.org/),
packaged as [Stockfish.js](https://github.com/nmrugg/stockfish.js) by Nathan Rugg
(npm package `stockfish@19.0.1`, unmodified).

Stockfish is free software under the GNU General Public License v3; the full
licence text is in `COPYING.txt`. Source code:

- Stockfish: https://github.com/official-stockfish/Stockfish
- Stockfish.js (WebAssembly build): https://github.com/nmrugg/stockfish.js

Zug talks to the engine from a Web Worker over the standard UCI protocol and
does not modify the engine.
