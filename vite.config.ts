import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import Unocss from 'unocss/vite'

export default defineConfig({
  plugins: [Unocss(), solidPlugin()],
  server: {
    port: 3000
  },
  build: {
    target: 'esnext'
  }
})
