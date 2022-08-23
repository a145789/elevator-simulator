import { Divider } from "@hope-ui/solid"
import { Component, For } from "solid-js"
import { createStore } from "solid-js/store"

const genFloor = () =>
  Array.from({ length: 24 }).map((_, index) => ({ level: 24 - index }))

const App: Component = () => {
  const [floors, setFloors] = createStore([
    {
      floorId: 1,
      currentFloor: 1,
      floor: genFloor(),
    },
    {
      floorId: 2,
      currentFloor: 1,
      floor: genFloor(),
    },
    {
      floorId: 3,
      currentFloor: 1,
      floor: genFloor(),
    },
    {
      floorId: 4,
      currentFloor: 1,
      floor: genFloor(),
    },
  ] as const)
  return (
    <div class="w-full h-full hidden flex justify-center">
      <div>
        <div>Hello World!</div>
        <div></div>
        <div class="flex">
          <For each={floors}>
            {({ floor, currentFloor }) => (
              <>
                <div>{currentFloor}</div>
                <div class="border-2px border-gray-400">
                  <For each={floor}>
                    {({ level }) => (
                      <>
                        <div class="h-360px px-24px w-">
                          <div>{level}</div>
                          <div>上箭头</div>
                          <div>下箭头</div>
                        </div>
                      </>
                    )}
                  </For>
                </div>
              </>
            )}
          </For>
        </div>
      </div>
    </div>
  )
}

export default App
