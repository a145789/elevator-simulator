import { Component, createEffect, createSignal, onMount } from "solid-js"
import { DOOR_ACTION_TIME } from "../constants"

const GetInButton: Component<{
  isClose: boolean
  emitGetInElevator: () => void
}> = (props) => {
  const [transitionClose, setTransitionClose] = createSignal(true)
  onMount(() => {
    setTimeout(() => {
      createEffect(() => {
        setTransitionClose(props.isClose)
      })
    })
  })

  return (
    <div class="top-2/4 left-2/4 -translate-y-2/4 -translate-x-2/4 absolute overflow-hidden">
      <div
        class="h-full w-1/2 bg-#fff absolute z-20 transition-all"
        style={{
          "transition-delay": `${
            transitionClose() ? 0 : DOOR_ACTION_TIME / 4
          }ms`,
          "transition-duration": `${
            transitionClose() ? DOOR_ACTION_TIME / 4 : DOOR_ACTION_TIME
          }ms`,
        }}
        classList={{
          "left-0": transitionClose(),
          "-left-1/2": !transitionClose(),
        }}
      />
      <div
        class="h-full w-1/2 bg-#fff absolute z-20 transition-all"
        classList={{
          "right-0": transitionClose(),
          "-right-1/2": !transitionClose(),
        }}
        style={{
          "transition-delay": `${
            transitionClose() ? 0 : DOOR_ACTION_TIME / 4
          }ms`,
          "transition-duration": `${
            transitionClose() ? DOOR_ACTION_TIME / 4 : DOOR_ACTION_TIME
          }ms`,
        }}
      />
      <div
        class="box-border p-4px text-center border"
        onClick={() => props.emitGetInElevator()}
      >
        进入
      </div>
    </div>
  )
}

export default GetInButton
