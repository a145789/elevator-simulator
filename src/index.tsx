/* @refresh reload */
import { render } from 'solid-js/web'
import 'uno.css'
import { HopeProvider } from '@hope-ui/solid'
import '@unocss/reset/eric-meyer.css'
import App from './App'

render(
  () => (
    <HopeProvider>
      <App />
    </HopeProvider>
  ),
  document.getElementById('root') as HTMLElement
)
