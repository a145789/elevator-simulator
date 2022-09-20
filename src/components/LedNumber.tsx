import { Component, createEffect, createSignal, on } from "solid-js"

const MAIN_COLOR = "#ff2936" as const
const SECONDARY_COLOR = "rgba(121,8,34,0.4)" as const

const obj = {
  0: [0, 1, 2, 4, 5, 6],
  1: [2, 5],
  2: [0, 2, 3, 4, 6],
  3: [0, 2, 3, 5, 6],
  4: [1, 2, 3, 5],
  5: [0, 1, 3, 5, 6],
  6: [0, 1, 3, 4, 5, 6],
  7: [0, 2, 5],
  8: [0, 1, 2, 3, 4, 5, 6],
  9: [0, 1, 2, 3, 5, 6],
} as const

const tempArr = Array.from({ length: 7 }).map(() => SECONDARY_COLOR)

const LedNumber: Component<{
  number: keyof typeof obj | null
}> = (props) => {
  const [color, setColor] =
    createSignal<(typeof MAIN_COLOR | typeof SECONDARY_COLOR)[]>(tempArr)

  createEffect(
    on(
      () => props.number,
      (value) => {
        const c = color().map<typeof MAIN_COLOR | typeof SECONDARY_COLOR>(
          () => SECONDARY_COLOR
        )
        if (value === null) {
          setColor(c)
          return
        }
        obj[value].forEach((item) => {
          c[item] = MAIN_COLOR
        })
        setColor(c)
      }
    )
  )

  return (
    <svg width="26px" height="26px" class="bg-#333">
      <g transform="scale(0.27,0.27)">
        <g transform="translate(-35, -44.635)">
          <path
            fill={color()[0]}
            d="m64.19 52.885-5.0842-4.8349 12.826-0.04387c7.0546-0.02413 18.649-0.02413 25.765 0l12.939 0.04387-5.0842 4.8349-5.0842 4.8349h-15.597-15.597l-5.0842-4.8349z"
          />
          <path
            fill={color()[1]}
            d="m60.61 89.825-2.354-2.2487 0.04353-19.268 0.04353-19.268 5.0061 4.7831 5.0061 4.7831v14.17 14.17l-2.6956 2.5637-2.6956 2.5637-2.354-2.2487z"
          />
          <path
            fill={color()[2]}
            d="m104.07 89.487-2.6963-2.5871 0.006-14.14 0.006-14.14 3.4657-3.306c1.9062-1.8183 4.1781-4.0026 5.0489-4.854l1.5831-1.548-0.00007 19.336-0.00006 19.336-2.3587 2.2448-2.3587 2.2448-2.6963-2.5871z"
          />
          <path
            fill={color()[3]}
            d="m66.596 95.5-2.701-2.6093 2.6708-2.5244 2.6708-2.5244h15.635 15.635l2.6708 2.5244 2.6708 2.5244-2.701 2.6093-2.701 2.6093h-15.574-15.574l-2.701-2.6093z"
          />
          <path
            fill={color()[4]}
            d="m58.258 117.79v-19.484l2.3473-2.2274 2.3473-2.2274 0.7761 0.70341c0.42686 0.38688 1.6425 1.5371 2.7015 2.5561l1.9254 1.8527-0.0043 13.905-0.0043 13.905-3.2745 3.423c-1.801 1.8826-4.0711 4.2455-5.0446 5.2508l-1.7701 1.8278v-19.484z"
          />
          <path
            fill={color()[5]}
            d="m106.4 132-5.0016-5.2212-0.005-13.905-0.005-13.905 1.9254-1.8527c1.059-1.019 2.2753-2.1698 2.7028-2.5573l0.77744-0.70464 2.3544 2.2568 2.3544 2.2568-0.0511 19.426-0.0511 19.426-5.0015-5.2212z"
          />
          <path
            fill={color()[6]}
            d="m60.597 136.72c0.643-0.69964 2.7094-2.8882 4.592-4.8636l3.423-3.5915h16.259 16.259l3.423 3.5915c1.8826 1.9753 3.949 4.1639 4.592 4.8636l1.1691 1.2721h-25.443-25.443l1.1691-1.2721z"
          />
        </g>
      </g>
    </svg>
  )
}

export default LedNumber
