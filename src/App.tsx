import { Component, createMemo, createSignal, Index, onMount } from "solid-js"

const MAX_FLOOR_NUM = 24 as const

const MAX_ELEVATOR_NUM = 4 as const

const ELEVATOR_THROUGH_FLOOR_TIME = 1500

const ELEVATOR_WAITING_TIME = 4 as const

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

const random = (max: number, min = 0) => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
type Queue = {
  flag: number
  currentFloor: number
  targetFloor: null | number
  direction: Direction.up | Direction.down
}
type Elevator = {
  id: number
  currentFloor: number
  elevatorStatus: ElevatorStatus.pending | ElevatorStatus.waiting
  direction: Direction
  queue: Queue[]
}

let flag = 0
const queue: Queue[] = []

const genElevator = (): Elevator[] =>
  Array.from({ length: MAX_ELEVATOR_NUM }).map((_, index) => ({
    id: index,
    currentFloor: random(24, 1),
    elevatorStatus: ElevatorStatus.pending,
    direction: Direction.stop,
    queue: [],
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

  const hasVacantElevators = createMemo(() =>
    elevators().some(({ direction }) => direction === Direction.stop)
  )

  let buildingElm: HTMLDivElement | undefined
  onMount(() => {
    buildingElm!.scrollTop = buildingElm!.scrollHeight
    randomCalling()
  })

  // const visibleFloor = createMemo(() => {
  //   const gap = MAX_FLOOR_NUM - personCurrentFloor() - 2
  //   const index =
  //     gap < 0 ? 0 : gap + 4 > MAX_FLOOR_NUM ? MAX_FLOOR_NUM - 4 : gap

  //   return building.slice(index, index + 4)
  // })

  class Scheduling {
    elevator: Elevator
    constructor(elevator: Elevator) {
      this.elevator = { ...elevator }
    }

    run() {
      const nextFloor = this.elevator.currentFloor + 1
      const elevatorQueue = this.elevator.queue.filter(
        (c) => c.currentFloor === nextFloor || c.targetFloor === nextFloor
      )
      const tempLength = elevatorQueue.length

      for (let i = 0; i < queue.length; i++) {
        if (
          this.elevator.direction === queue[i].direction &&
          nextFloor === queue[i].currentFloor
        ) {
          elevatorQueue.push(queue.splice(i, 1)[0])
          i--
        }
      }
      if (elevatorQueue.length) {
        this.elevator.queue.sort((a, b) =>
          this.elevator.direction === Direction.up
            ? (a.targetFloor || a.currentFloor) -
              (b.targetFloor || b.currentFloor)
            : (b.targetFloor || b.currentFloor) -
              (a.targetFloor || a.currentFloor)
        )
        for (let i = 0; i < elevatorQueue.length; i++) {
          const c = elevatorQueue[i]
          if (c.targetFloor === null) {
            elevatorQueue[i].targetFloor = random(
              c.direction === Direction.up ? MAX_FLOOR_NUM : 1,
              c.currentFloor
            )
          } else {
            elevatorQueue.splice(0, 1)
            i--
          }
        }
        this.elevator.queue.splice(0, tempLength, ...elevatorQueue)
        this.elevator.elevatorStatus = ElevatorStatus.waiting
      } else {
        this.elevator.elevatorStatus = ElevatorStatus.pending
      }

      this.elevator.currentFloor = nextFloor

      const theElevators = elevators()
      const index = theElevators.findIndex(
        (item) => item.id === this.elevator.id
      )
      theElevators.splice(index, 1, { ...this.elevator })
      setTimeout(() => {
        setElevators([...theElevators])

        if (this.elevator.queue.length) {
          // this.run()
        }
      }, ELEVATOR_THROUGH_FLOOR_TIME)
    }
  }

  function callNearestVacantElevator() {
    const [caller] = queue.splice(0, 1)

    const theElevators = elevators()
    const elevator = theElevators.reduce((p, c) =>
      c.direction !== Direction.stop ||
      (p.direction === Direction.stop &&
        Math.abs(p.currentFloor - caller.currentFloor) <
          Math.abs(c.currentFloor - caller.currentFloor))
        ? p
        : c
    )
    elevator.direction = caller.direction
    elevator.queue.push(caller)
    const scheduling = new Scheduling(elevator)
    scheduling.run()
  }
  let randomCallingTimer: number
  function randomCalling() {
    clearTimeout(randomCallingTimer)
    randomCallingTimer = setTimeout(() => {
      for (let i = 0, len = random(5, 1); i < len; i++) {
        const currentFloor = random(24, 1)
        const direction = random(9) < 5 ? Direction.down : Direction.up
        queue.push({ flag: flag++, currentFloor, direction, targetFloor: null })
      }

      if (hasVacantElevators()) {
        callNearestVacantElevator()
      }
    }, random(3000, 500))
  }

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
                      const elevator = createMemo(
                        () => elevators().find((e) => e.id === id)!
                      )
                      return (
                        <div class="w-220px p-20px box-border flex flex-col items-center">
                          <div class="border h-40px w-full flex justify-around items-center">
                            <Index each={LightColor}>
                              {(color) => {
                                const c = color()
                                const notShow = createMemo(() => {
                                  let notShow = true
                                  const { currentFloor, elevatorStatus } =
                                    elevator()

                                  switch (c) {
                                    case ElevatorStatus.running:
                                      notShow = currentFloor === floor.level
                                      break
                                    case ElevatorStatus.pending:
                                      notShow =
                                        currentFloor !== floor.level ||
                                        elevatorStatus ===
                                          ElevatorStatus.waiting
                                      break
                                    case ElevatorStatus.waiting:
                                      notShow =
                                        currentFloor !== floor.level ||
                                        elevatorStatus ===
                                          ElevatorStatus.pending
                                      break

                                    default:
                                      break
                                  }
                                  return notShow
                                })

                                return (
                                  <div
                                    class="w-30px h-30px rounded-full"
                                    classList={{ "opacity-10": notShow() }}
                                    style={{ background: c }}
                                  />
                                )
                              }}
                            </Index>
                          </div>

                          <div class="w-24px h-24px m-4px border text-center">
                            {elevator().currentFloor}
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
