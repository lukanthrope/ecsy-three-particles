import resolve from "@rollup/plugin-node-resolve"
import html from "@open-wc/rollup-plugin-html"
import image from "@rollup/plugin-image"

export default {
  input: "examples/test-task.html",
  output: { dir: "dist/examples" },
  plugins: [html(), resolve(), image()],
  watch: {
    chokidar: {
      useFsEvents: false
    }
  }
}
