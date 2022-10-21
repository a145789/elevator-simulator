import { Component, createMemo, createSignal } from "solid-js"
import { CallerStatus, DOOR_ACTION_TIME } from "../constants"

const GetInButton: Component<{
  callerStatus: CallerStatus
  isClose: boolean
  emitGetInElevator: () => void
}> = (props) => {
  const transitionConfigStyle = createMemo(() => {
    return props.isClose
      ? {
          "transition-delay": `${DOOR_ACTION_TIME / 3}ms`,
          "transition-duration": `${DOOR_ACTION_TIME / 2}ms`,
        }
      : {}
  })

  const [isShowBtn, setIsShowBtn] = createSignal(false)
  setTimeout(() => {
    setIsShowBtn(true)
  }, DOOR_ACTION_TIME)

  return (
    <div
      class="top-2/4 left-2/4 -translate-y-2/4 -translate-x-2/4 absolute overflow-hidden"
      style={{
        display: isShowBtn() ? "block" : "none",
      }}
    >
      <div
        class="h-full w-1/2 bg-#fff absolute z-20 transition-all ease"
        style={transitionConfigStyle()}
        classList={{
          "left-0": props.isClose,
          "-left-1/2": !props.isClose,
        }}
      />
      <div
        class="h-full w-1/2 bg-#fff absolute z-20 transition-all ease"
        classList={{
          "right-0": props.isClose,
          "-right-1/2": !props.isClose,
        }}
        style={transitionConfigStyle()}
      />
      <div
        class="box-border p-4px text-center border"
        onClick={() => props.emitGetInElevator()}
      >
        {props.callerStatus === CallerStatus.inside ? "出门" : "进入"}
      </div>
    </div>
  )
}

export default GetInButton
