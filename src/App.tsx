import {
  Component,
  createSignal,
  Index,
  onMount,
} from "solid-js"

const MAX_FLOOR_NUM = 24 as const

const MAX_ELEVATOR_NUM = 4 as const

const ELEVATOR_WAITING_TIME = 5 as const

const DOOR_ACTION_TIME = 1.5 as const

const enum ElevatorStatus {
  running = "#F76965",
  pending = "#ff9626",
  waiting = "#27c346",
}

const enum Direction {
  up,
  down,
  stop,
}

const LightColor = [
  ElevatorStatus.running,
  ElevatorStatus.pending,
  ElevatorStatus.waiting,
] as const

const genElevator = (): {
  id: number
  currentFloor: number
  elevatorStatus: ElevatorStatus.pending | ElevatorStatus.waiting
  direction: Direction
}[] =>
  Array.from({ length: MAX_ELEVATOR_NUM }).map((_, index) => ({
    id: index,
    currentFloor: 1,
    elevatorStatus: ElevatorStatus.pending,
    direction: Direction.stop,
  }))
const genBuilding = () =>
  Array.from({ length: MAX_FLOOR_NUM }).map((_, index) => ({
    level: MAX_FLOOR_NUM - index,
    elevators: Array.from({ length: MAX_ELEVATOR_NUM }).map((_, eIdx) => ({
      id: eIdx,
      direction: Direction.stop,
    })),
  }))

const App: Component = () => {
  const [elevators, setElevators] = createSignal(genElevator())
  const [building, setBuilding] = createSignal(genBuilding())
  const [personCurrentFloor, setPersonCurrentFloor] = createSignal(1)
  let buildingElm: HTMLDivElement | undefined
  onMount(() => {
    buildingElm!.scrollTop = buildingElm!.scrollHeight
  })

  // const visibleFloor = createMemo(() => {
  //   const gap = MAX_FLOOR_NUM - personCurrentFloor() - 2
  //   const index =
  //     gap < 0 ? 0 : gap + 4 > MAX_FLOOR_NUM ? MAX_FLOOR_NUM - 4 : gap

  //   return building.slice(index, index + 4)
  // })

  function scheduling(){

  }
  setElevators((e) =>
    e.map((item) => ({
      ...item,
      currentFloor: Math.floor(Math.random() * 24) + 1,
    }))
  )
  return (
    <div class="w-full h-full flex justify-center items-center py-20px box-border">
      <div class="flex items-center h-full">
        <div class="border-y-1px h-full overflow-y-hidden" ref={buildingElm}>
          <Index each={building()}>
            {(item, index) => {
              const floor = item()
              return (
                <div
                  class="flex h-300px items-center"
                  classList={{
                    "border-b-1px": index + 1 !== building().length,
                  }}
                >
                  <div class="w-24px">{floor.level}</div>

                  <Index each={floor.elevators}>
                    {(buildingElevator) => {
                      const { id } = buildingElevator()
                      const { currentFloor, elevatorStatus } = elevators().find(
                        (e) => e.id === id
                      )!
                      return (
                        <div class="w-220px p-20px box-border flex flex-col items-center">
                          <div class="border h-40px w-full flex justify-around items-center">
                            <Index each={LightColor}>
                              {(color) => {
                                const c = color()
                                let notShow = true

                                switch (c) {
                                  case ElevatorStatus.running:
                                    notShow = currentFloor === floor.level
                                    break
                                  case ElevatorStatus.pending:
                                    notShow =
                                      currentFloor !== floor.level ||
                                      elevatorStatus === ElevatorStatus.waiting
                                    break
                                  case ElevatorStatus.waiting:
                                    notShow =
                                      currentFloor !== floor.level ||
                                      elevatorStatus === ElevatorStatus.pending
                                    break

                                  default:
                                    break
                                }

                                return (
                                  <div
                                    class="w-30px h-30px rounded-full"
                                    classList={{ "opacity-10": notShow }}
                                    style={{ background: c }}
                                  />
                                )
                              }}
                            </Index>
                          </div>

                          <div class="w-24px h-24px m-4px border text-center">
                            {currentFloor}
                          </div>

                          <div class="border w-full h-190px relative">
                            <Index each={Array.from({ length: 2 })}>
                              {(_, index) => {
                                const style =
                                  index === 0
                                    ? { left: "89px" }
                                    : { right: "89px" }
                                return (
                                  <div
                                    class="w-1px h-full bg-#000 absolute top-0"
                                    style={style}
                                  />
                                )
                              }}
                            </Index>
                          </div>
                        </div>
                      )
                    }}
                  </Index>
                </div>
              )
            }}
          </Index>
        </div>

        <div class="ml-42px">
          <h2>Operation Panel</h2>
          <ul>
            <li>current floor: {personCurrentFloor()}</li>
            <li>
              <button onClick={() => setPersonCurrentFloor((c) => c + 1)}>
                up
              </button>
              <button onClick={() => setPersonCurrentFloor((c) => c - 1)}>
                down
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default App
