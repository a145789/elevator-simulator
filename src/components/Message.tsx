import { Component, createEffect, createMemo } from "solid-js"

const Message: Component<{
  msg: string
  visible: boolean
  onClose: () => void
}> = (props) => {
  const top = createMemo(() => (props.visible ? "18px" : "-30px"))

  let timer: number | null = null
  createEffect(() => {
    clearTimeout(timer!)
    if (props.visible) {
      timer = setTimeout(() => {
        props.onClose()
      }, 2500)
    }
  })

  return (
    <div
      class="py-6px px-8px border leading-16px fixed left-50% translate-x-[-50%] transition-all duration-750ms"
      style={{
        top: top(),
      }}
    >
      {props.msg}
    </div>
  )
}

export default Message
