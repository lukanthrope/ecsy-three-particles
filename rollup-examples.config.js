import resolve from "@rollup/plugin-node-resolve"
import html from "@open-wc/rollup-plugin-html"

export default {
  input: "examples/firework.html",
  output: { dir: "dist/examples" },
  plugins: [html(), resolve()],
  watch: {
    chokidar: {
      useFsEvents: false
    }
  }
}
