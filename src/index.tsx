/* @refresh reload */
import { render } from 'solid-js/web'
import 'uno.css'
import '@unocss/reset/eric-meyer.css'
import './index.css'
import App from './App'

render(() => <App />, document.getElementById('root') as HTMLElement)
