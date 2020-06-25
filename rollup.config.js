import json from "@rollup/plugin-json"
import resolve from "@rollup/plugin-node-resolve"
import alias from "@rollup/plugin-alias"
import * as pkg from "./package.json"
import { execSync } from "child_process"
import { terser } from "rollup-plugin-terser"
import babel from "@rollup/plugin-babel"
import serve from "rollup-plugin-serve"

var deps = {}
Object.keys(pkg.peerDependencies).forEach(dep => {
  deps[dep] = execSync(`npm info ${dep} version`)
    .toString()
    .trim()
})

export default [
  // Module unpkg
  {
    input: ".buildcache/index.js",
    plugins: [
      alias({
        entries: [
          {
            find: "ecsy",
            replacement: `https://unpkg.com/ecsy@${deps["ecsy"]}/build/ecsy.module.js`
          },
          {
            find: "ecsy-three",
            replacement: `https://unpkg.com/ecsy-three@${deps["ecsy-three"]}/build/ecsy-three.module.js`
          },
          {
            find: "three",
            replacement: `https://unpkg.com/three@${deps["three"]}/build/three.module.js`
          }
        ]
      }),
      babel({ babelHelpers: "bundled" })
      // terser()
    ],
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    external: id => {
      return id.startsWith("https://unpkg.com/")
    },
    output: [
      {
        format: "es",
        file: "dist/ecsy-three-particles.module-unpkg.js",
        indent: "\t"
      }
    ]
  },

  // Module unpkg / ecsy-three fix
  {
    input: ".buildcache/index.js",
    plugins: [
      babel({ babelHelpers: "bundled" }),
      //terser(),
      alias({
        entries: [
          {
            find: "ecsy",
            replacement: `https://unpkg.com/ecsy@${deps["ecsy"]}/build/ecsy.module.js`
          },
          {
            find: "ecsy-three",
            replacement: `../vendor/ecsy-three.module-unpkg.js`
          },
          {
            find: "three",
            replacement: `https://unpkg.com/three@${deps["three"]}/build/three.module.js`
          }
        ]
      }),
      serve({
        // Launch in browser (default: false)
        open: true,
        openPage: "/index.html",
        contentBase: ["dist", "examples"]
      })
    ],
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    external: id => {
      return id.startsWith("https://unpkg.com/") || id.includes("vendor/")
    },
    output: [
      {
        format: "es",
        file: "dist/ecsy-three-particles.module-unpkg-ecsy-three-fix.js",
        indent: "\t"
      }
    ]
  },

  // Module
  {
    input: ".buildcache/index.js",
    plugins: [
      json({ exclude: ["node_modules/**", "examples/**"] }),
      // terser(),
      babel({ babelHelpers: "bundled" })
    ],
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    external: id => {
      return id === "ecsy"
    },
    output: [
      {
        format: "es",
        file: "dist/ecsy-three-particles.module.js",
        indent: "\t"
      }
    ]
  },
  // Module with everything included
  {
    input: ".buildcache/index-bundled.js",
    plugins: [
      json({ exclude: ["node_modules/**", "examples/**"] }),
      resolve(),
      babel({ babelHelpers: "bundled" })
      // terser(),
    ],
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    external: id => {
      return id.startsWith("https://unpkg.com/")
    },
    output: [
      {
        format: "es",
        file: "dist/ecsy-three-particles.module.all.js",
        indent: "\t"
      }
    ]
  }
]
