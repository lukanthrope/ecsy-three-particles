import json from "@rollup/plugin-json"
import resolve from "@rollup/plugin-node-resolve"
import html from "@open-wc/rollup-plugin-html"
import babel from "@rollup/plugin-babel"
import typescript from "rollup-plugin-typescript2"
import pkg from "./package.json"

export default [
  {
    input: "src/index.ts",
    external: id => {
      return ([ 'three', 'ecsy', 'ecsy-three', 'ecsy-input' ]).includes(id) || /^three\//.test(id) || /^troika-3d-text\//.test(id) || /^ecsy-three\//.test(id)
    },
    plugins: [
      typescript(),
      // resolve(),
      // json({ exclude: ["node_modules/**", "examples/**"] }),
      // terser(),
      babel({ babelHelpers: "bundled" })
    ],
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    output: [
      {
        file: pkg.module,
        format: "es",
        sourcemap: true
      }
    ]
  },
  // HTML pages
  {
    input: "examples/index.html",
    output: { dir: "dist/examples" },
    plugins: [html(), resolve()]
  },
  {
    input: "examples/index-not-vr.html",
    output: { dir: "dist/examples" },
    plugins: [html(), resolve()]
  }
]
