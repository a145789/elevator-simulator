import {
  Component,
  createMemo,
  createSignal,
  Index,
  JSX,
  onMount,
} from "solid-js"

const MAX_FLOOR_NUM = 24 as const

const MAX_ELEVATOR_NUM = 4 as const

const ELEVATOR_THROUGH_FLOOR_TIME = 1500

const ELEVATOR_WAITING_TIME = 4000 as const

const DOOR_ACTION_TIME = 2500 as const

const enum ElevatorStatus {
  /** 电梯正在运行中 */
  running,
  /** 电梯停止等待召唤 */
  pending,
  /** 开门等待进入 */
  waiting,
}

const enum Direction {
  up,
  down,
  stop,
}

const enum ArrivedStatus {
  no,
  /** 电梯到达用户所在楼层 */
  ok,
}

const enum LightColor {
  red = "#F76965",
  yellow = "#ff9626",
  green = "#27c346",
}
const LIGHT_COLOR = [
  LightColor.red,
  LightColor.yellow,
  LightColor.green,
] as const

const random = (max: number, min = 0) => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
const deepClone = <T extends object | any[]>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj))
}
type Caller = {
  flag: number
  currentFloor: number
  targetFloor: null | number
  direction: Direction.up | Direction.down
  isMainView: boolean
  action: (e: Elevator, c: Caller) => void
}
type Elevator = {
  id: number
  currentFloor: number
  elevatorStatus: ElevatorStatus
  direction: Direction
  /** 电梯所要走的楼层 */
  floorList: number[]
  /** 电梯搭载的乘客 */
  queue: Caller[]
}

let flag = 0
const queue: Caller[] = []

const genElevator = (): Elevator[] =>
  Array.from({ length: MAX_ELEVATOR_NUM }).map((_, index) => ({
    id: index,
    currentFloor: random(24, 1),
    elevatorStatus: ElevatorStatus.pending,
    direction: Direction.stop,
    floorList: [],
    queue: [],
  }))
const genBuilding = () =>
  Array.from({ length: MAX_FLOOR_NUM }).map((_, index) => ({
    level: MAX_FLOOR_NUM - index,
    elevators: Array.from({ length: MAX_ELEVATOR_NUM }).map((_, eIdx) => ({
      id: eIdx,
      translateX: [0, 0] as [number, number],
    })),
  }))

const App: Component = () => {
  const [elevators, setElevators] = createSignal(genElevator())
  const [building, setBuilding] = createSignal(genBuilding())
  const [personCurrentFloor, setPersonCurrentFloor] = createSignal(1)

  const getVacantElevators = () =>
    elevators().filter(({ direction }) => direction === Direction.stop)

  let buildingElm: HTMLDivElement | undefined
  onMount(() => {
    buildingElm!.scrollTop = buildingElm!.scrollHeight
    randomCalling()
  })

  const mainViewElevator = createMemo(() => {
    const elevator = elevators().find((e) => e.queue.find((q) => q.isMainView))
    elevator ? elevator : []
  })

  function quickSetElevators(elevator: Elevator) {
    return (e: Elevator[]) => {
      const index = e.findIndex((item) => item.id === elevator.id)
      e.splice(index, 1, deepClone(elevator))
      return [...e]
    }
  }

  function updatePureBuildingTranslateX(
    elevator: Elevator,
    translateX: [number, number]
  ) {
    const { id, currentFloor } = elevator
    const index = MAX_FLOOR_NUM - currentFloor
    const theBuilding = deepClone(building())
    theBuilding[index].elevators[
      theBuilding[index].elevators.findIndex((item) => item.id === id)
    ].translateX = translateX

    return theBuilding
  }

  let isRunScrollAnimation = true
  function moveScroll(direction: Direction) {
    isRunScrollAnimation = true
    if (!buildingElm) {
      return
    }
    if (
      (direction === Direction.up && buildingElm.scrollTop === 0) ||
      (direction === Direction.down &&
        buildingElm.scrollTop === buildingElm.scrollHeight)
    ) {
      return
    }
    function cb() {
      if (!isRunScrollAnimation) {
        return
      }
      buildingElm!.scrollTop = buildingElm!.scrollTop - 10
      requestAnimationFrame(cb)
    }
    requestAnimationFrame(cb)
  }

  class Scheduling {
    elevator: Elevator
    /** 当前电梯是否到达乘客所在楼层 */
    arrived: ArrivedStatus
    constructor(elevator: Elevator, arrived: ArrivedStatus) {
      this.elevator = deepClone(elevator)
      this.arrived = arrived
    }

    private openDoor() {
      setBuilding(updatePureBuildingTranslateX(this.elevator, [-91, 91]))

      setTimeout(() => {
        this.closeDoor()
      }, ELEVATOR_WAITING_TIME + DOOR_ACTION_TIME)
    }

    private closeDoor() {
      setBuilding(updatePureBuildingTranslateX(this.elevator, [0, 0]))
      setTimeout(() => {
        this.toNextFloor()
      }, DOOR_ACTION_TIME)
    }

    private toNextFloor() {
      // 如果电梯跑完 floorList 的所有楼层，电梯恢复为等待状态
      if (!this.elevator.floorList.length) {
        this.elevator.direction = Direction.stop
        this.elevator.elevatorStatus = ElevatorStatus.pending
        setElevators(quickSetElevators(this.elevator))
        return
      }

      switch (this.arrived) {
        case ArrivedStatus.no:
          // 电梯前往用户所在楼层
          const locationFloor = this.elevator.floorList[0]
          this.elevator.currentFloor =
            this.elevator.currentFloor < locationFloor
              ? this.elevator.currentFloor + 1
              : this.elevator.currentFloor - 1
          if (this.elevator.currentFloor === locationFloor) {
            this.arrived = ArrivedStatus.ok
          }
          break
        case ArrivedStatus.ok:
          this.elevator.currentFloor =
            this.elevator.direction === Direction.up
              ? this.elevator.currentFloor + 1
              : this.elevator.currentFloor - 1
          break

        default:
          break
      }

      this.elevator.elevatorStatus = ElevatorStatus.running
      if (this.elevator.queue.find((item) => item.isMainView)?.targetFloor) {
        // moveScroll(this.elevator.direction)
      }
      setTimeout(() => {
        setElevators(quickSetElevators(this.elevator))
        if (this.elevator.queue.find((item) => item.isMainView)?.targetFloor) {
          setPersonCurrentFloor((p) =>
            this.elevator.direction === Direction.up ? p + 1 : p - 1
          )
        }

        this.run()
        isRunScrollAnimation = false
      }, ELEVATOR_THROUGH_FLOOR_TIME)
    }

    public run() {
      // 电梯到达指定楼层后，搭载乘客、去往指定楼层、开关电梯门的相关操作
      if (this.arrived === ArrivedStatus.ok) {
        // 如果当前已经接好乘客去往指定楼层，路上可以带上同样方向的其他楼层的乘客
        for (let i = 0; i < queue.length; i++) {
          if (
            this.elevator.direction === queue[i].direction &&
            this.elevator.currentFloor === queue[i].currentFloor
          ) {
            this.elevator.elevatorStatus = ElevatorStatus.waiting
            break
          }
        }

        const index = this.elevator.floorList.indexOf(
          this.elevator.currentFloor
        )
        if (index !== -1) {
          this.elevator.elevatorStatus = ElevatorStatus.waiting
        }

        // elevatorStatus 为 waiting 意味着电梯开门，乘客进出电梯
        if (this.elevator.elevatorStatus === ElevatorStatus.waiting) {
          const tempQueue = queue.filter(
            (item) => item.currentFloor === this.elevator.currentFloor
          )
          tempQueue.push(...this.elevator.queue)
          for (const caller of tempQueue) {
            caller.action(this.elevator, caller)
          }
        }

        if (index !== -1) {
          this.elevator.floorList.splice(index, 1)
        }

        if (this.elevator.elevatorStatus !== ElevatorStatus.waiting) {
          this.elevator.elevatorStatus === ElevatorStatus.running
        } else {
          setElevators(quickSetElevators(this.elevator))
          this.openDoor()
          return
        }
      }

      this.toNextFloor()
    }
  }

  function callNearestVacantElevator() {
    const SchedulingList: Scheduling[] = []
    for (let i = 0; i < queue.length; i++) {
      const vacantElevators = getVacantElevators()
      if (!vacantElevators.length) {
        break
      }
      const caller = queue[i]
      // 找到最近的空置电梯
      const elevator = vacantElevators.reduce((p, c) =>
        c.elevatorStatus !== ElevatorStatus.pending ||
        (p.elevatorStatus === ElevatorStatus.pending &&
          Math.abs(p.currentFloor - caller.currentFloor) <
            Math.abs(c.currentFloor - caller.currentFloor))
          ? p
          : c
      )

      elevator.direction = caller.direction
      if (!elevator.floorList.includes(caller.currentFloor)) {
        elevator.floorList.push(caller.currentFloor)
      }
      setElevators(quickSetElevators(elevator))

      SchedulingList.push(
        new Scheduling(
          elevator,
          elevator.currentFloor === caller.currentFloor
            ? ArrivedStatus.ok
            : ArrivedStatus.no
        )
      )
    }

    for (const scheduling of SchedulingList) {
      scheduling.run()
    }
  }
  let randomCallingTimer: number
  function randomCalling() {
    clearTimeout(randomCallingTimer)
    randomCallingTimer = setTimeout(() => {
      for (let i = 0, len = random(5, 1); i < len; i++) {
        const currentFloor = random(24, 1)
        const direction = random(9) < 5 ? Direction.down : Direction.up
        const callerFlag = flag++
        queue.push({
          flag: callerFlag,
          currentFloor,
          direction,
          targetFloor: null,
          isMainView: false,
          action(elevator, caller) {
            if (!caller.targetFloor) {
              caller.targetFloor = random(
                elevator.direction === Direction.up ? MAX_FLOOR_NUM : 1,
                elevator.currentFloor
              )
              queue.splice(
                queue.findIndex((item) => item.flag === caller.flag),
                1
              )
              elevator.queue.push(caller)
            }
            if (!elevator.floorList.includes(caller.targetFloor)) {
              elevator.floorList.push(caller.targetFloor)
            }
            if (caller.targetFloor === elevator.currentFloor) {
              // 到达指定楼层的乘客下电梯
              elevator.queue.splice(
                elevator.queue.findIndex((item) => item.flag === caller.flag),
                1
              )
              elevator
            }
          },
        })
      }

      callNearestVacantElevator()
      randomCalling()
    }, random(3000, 500))
  }

  function personCalling(direction: Direction.up | Direction.down) {
    queue.push({
      flag: flag++,
      currentFloor: personCurrentFloor(),
      direction,
      targetFloor: null,
      isMainView: true,
      action(elevator, caller) {},
    })
    callNearestVacantElevator()
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

                  <Index each={item().elevators}>
                    {(buildingElevator) => {
                      const { id } = buildingElevator()
                      const elevator = createMemo(
                        () => elevators().find((e) => e.id === id)!
                      )
                      const handleButtonStyle = createMemo<JSX.CSSProperties>(
                        () => {
                          return buildingElevator().translateX[0] === 0
                            ? {
                                transition: "width",
                                width: 0,
                                "transition-delay": `${DOOR_ACTION_TIME / 2}ms`,
                                "transition-duration": `${
                                  DOOR_ACTION_TIME / 2
                                }ms`,
                              }
                            : {
                                width: "52px",
                              }
                        }
                      )
                      return (
                        <div class="w-220px p-20px box-border flex flex-col items-center">
                          <div class="border h-40px w-full flex justify-around items-center">
                            <Index each={LIGHT_COLOR}>
                              {(color) => {
                                const c = color()
                                const show = createMemo(() => {
                                  let show = true
                                  const { currentFloor, elevatorStatus } =
                                    elevator()

                                  switch (c) {
                                    case LightColor.red:
                                      // 电梯不在此楼层的展示红灯
                                      show = currentFloor !== floor.level
                                      break
                                    case LightColor.yellow:
                                      // 电梯在此楼层并且为等待状态展示黄灯
                                      show =
                                        currentFloor === floor.level &&
                                        (elevatorStatus ===
                                          ElevatorStatus.running ||
                                          elevatorStatus ===
                                            ElevatorStatus.pending)
                                      break
                                    case LightColor.green:
                                      show =
                                        currentFloor === floor.level &&
                                        elevatorStatus ===
                                          ElevatorStatus.waiting
                                      break

                                    default:
                                      break
                                  }
                                  return show
                                })

                                return (
                                  <div
                                    class="w-30px h-30px rounded-full"
                                    classList={{ "opacity-10": !show() }}
                                    style={{ background: c }}
                                  />
                                )
                              }}
                            </Index>
                          </div>

                          <div class="w-full my-4px flex justify-around">
                            <div class="w-24px h-24px border text-center">
                              {elevator().currentFloor}
                            </div>
                            <div class="w-24px h-24px border text-center">
                              {elevator().direction === Direction.up
                                ? "up"
                                : "down"}
                            </div>
                          </div>

                          <div class="border w-full h-190px flex justify-center relative">
                            <div
                              class="box-border py-4px text-center border top-2/4 left-2/4 -translate-y-2/4 -translate-x-2/4 absolute overflow-hidden"
                              style={handleButtonStyle()}
                            >
                              进入
                            </div>
                            <Index each={buildingElevator().translateX}>
                              {(translateX) => {
                                return (
                                  <div
                                    class="w-1px h-full bg-#000 transition-transform ease"
                                    style={{
                                      "transition-duration": `${DOOR_ACTION_TIME}ms`,
                                      transform: `translateX(${translateX()}px)`,
                                    }}
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
              <button onClick={() => personCalling(Direction.up)}>up</button>
              <button onClick={() => personCalling(Direction.down)}>
                down
              </button>
            </li>
          </ul>
          <ul class="flex">{/* <Index each={}></Index> */}</ul>
          <div>
            <button>出门</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
