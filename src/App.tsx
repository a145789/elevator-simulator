import { Component, For } from 'solid-js'
import { createStore } from 'solid-js/store'

const App: Component = () => {
  const [floor, setFloor] = createStore([])
  return (
    <>
      <div>Hello World!</div>
      <For each={floor}>{item => <div>{item}</div>}</For>
    </>
  )
}

export default App
