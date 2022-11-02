import { Component, createMemo } from "solid-js"
import { USE_COLOR } from "../constants"

type Name = "up" | "down"

const INIT_COLOR = "#333"

const IconSvg: Component<{
  name: Name
  isUse: boolean
  onClick: () => void
}> = (props) => {
  const svg = createMemo(() => {
    switch (props.name) {
      case "up":
        return (
          <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
            <path
              d="M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44Z"
              fill="none"
              stroke={props.isUse ? USE_COLOR : INIT_COLOR}
              stroke-width="4"
              stroke-linejoin="round"
            />
            <path
              d="M24 33.5V15.5"
              stroke={props.isUse ? USE_COLOR : INIT_COLOR}
              stroke-width="4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M33 24.5L24 15.5L15 24.5"
              stroke={props.isUse ? USE_COLOR : INIT_COLOR}
              stroke-width="4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        )

      case "down":
        return (
          <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
            <path
              d="M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44Z"
              fill="none"
              stroke={props.isUse ? USE_COLOR : INIT_COLOR}
              stroke-width="4"
              stroke-linejoin="round"
            />
            <path
              d="M24 15V33"
              stroke={props.isUse ? USE_COLOR : INIT_COLOR}
              stroke-width="4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M33 24L24 33L15 24"
              stroke={props.isUse ? USE_COLOR : INIT_COLOR}
              stroke-width="4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        )

      default:
        return null
    }
  })

  return <div onClick={props.onClick}>{svg()}</div>
}

export default IconSvg
