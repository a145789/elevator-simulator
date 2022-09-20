import {
  batch,
  Component,
  createMemo,
  createSignal,
  Index,
  onMount,
} from "solid-js"
import GetInButton from "./components/GetInButton"
import LedNumber from "./components/LedNumber"
import {
  ArrivedStatus,
  Caller,
  Direction,
  DOOR_ACTION_TIME,
  Elevator,
  ElevatorStatus,
  ELEVATOR_THROUGH_FLOOR_TIME,
  ELEVATOR_WAITING_TIME,
  LightColor,
  LIGHT_COLOR,
  MAX_ELEVATOR_NUM,
  MAX_FLOOR_NUM,
  MAX_LOAD_LIMIT,
  random,
} from "./constants"

let flag = 0
const queue: Caller[] = []

type Number = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

function transformFloorNumber(number: number, digits: 1 | 2) {
  const str = String(number)
  if (digits === 1) {
    return Number(str.length === 2 ? str[1] : str) as Number
  } else {
    return str.length === 2 ? (Number(str[0]) as Number) : null
  }
}

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
  const [mainView, setMainView] = createSignal<Caller | null>(null)

  const getVacantElevators = () =>
    elevators().filter(({ direction }) => direction === Direction.stop)

  let buildingElm: HTMLDivElement | undefined
  onMount(() => {
    // 刚进入时 scrollTop 有几率不会到达最底部
    setTimeout(() => {
      buildingElm!.scrollTop = buildingElm!.scrollHeight
      randomCalling()
    })
  })

  function quickSetElevators({ floorList, queue, ...rest }: Elevator) {
    return (e: Elevator[]) => {
      const index = e.findIndex((item) => item.id === rest.id)
      e.splice(index, 1, {
        ...rest,
        floorList: [...floorList],
        queue: [...queue],
      })
      return [...e]
    }
  }

  function updatePureBuildingTranslateX(
    elevator: Elevator,
    translateX: [number, number]
  ) {
    const { id, currentFloor } = elevator
    const index = MAX_FLOOR_NUM - currentFloor
    const theBuilding = building()
    const item = { ...theBuilding[index] }
    const eIdx = item.elevators.findIndex((item) => item.id === id)
    item.elevators[eIdx].translateX = translateX
    item.elevators[eIdx] = { ...item.elevators[eIdx] }
    theBuilding[index] = item

    return [...theBuilding]
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

  // 每次召唤电梯生成一个实例
  class Scheduling {
    private elevator: Elevator
    /** 当前电梯是否到达乘客所在楼层 */
    private arrived: ArrivedStatus
    private openFlag = false
    constructor(
      { floorList, queue, ...rest }: Elevator,
      arrived: ArrivedStatus
    ) {
      this.elevator = { ...rest, floorList: [...floorList], queue: [...queue] }
      this.arrived = arrived
    }

    private callerAction = (action: "getIn" | "getOut", caller: Caller) => {
      if (!this.openFlag) {
        return
      }

      if (action === "getIn") {
        // 限载8人，超过等下一辆
        if (this.elevator.queue.length < MAX_LOAD_LIMIT) {
          this.elevator.queue.push(caller)
        }
      } else {
        const index = this.elevator.queue.findIndex(
          (item) => item.flag === caller.flag
        )
        if (index !== -1) {
          this.elevator.queue.splice(index, 1)
        }
      }
    }

    private openDoor() {
      this.openFlag = true
      const tempQueue = queue.filter(
        (item) => item.currentFloor === this.elevator.currentFloor
      )
      tempQueue.push(
        ...this.elevator.queue.filter(
          (item) => item.targetFloor === this.elevator.currentFloor
        )
      )
      // 乘客进出电梯
      for (const caller of tempQueue) {
        caller.openAction(
          this.elevator.id,
          this.elevator.currentFloor,
          this.callerAction
        )
      }
      // 延时更新
      setTimeout(() => {
        setBuilding(updatePureBuildingTranslateX(this.elevator, [-91, 91]))
      })

      setTimeout(() => {
        this.closeDoor()
      }, ELEVATOR_WAITING_TIME + DOOR_ACTION_TIME)
    }

    private closeDoor() {
      setBuilding(updatePureBuildingTranslateX(this.elevator, [0, 0]))
      setTimeout(() => {
        // 门彻底关闭，不再允许乘客上下电梯
        this.openFlag = false
        for (const caller of this.elevator.queue) {
          if (
            caller.targetFloor &&
            !this.elevator.floorList.includes(caller.targetFloor)
          ) {
            this.elevator.floorList.push(caller.targetFloor)
          }
        }

        // 如果没有超过限载，也没有选择上电梯，丢弃当前行为
        if (this.elevator.queue.length < MAX_LOAD_LIMIT) {
          for (let i = 0; i < queue.length; i++) {
            const caller = queue[i]
            if (
              caller.direction === this.elevator.direction &&
              caller.currentFloor === this.elevator.currentFloor
            ) {
              queue.splice(i, 1)
              i--
            }
          }
        }

        const index = this.elevator.floorList.indexOf(
          this.elevator.currentFloor
        )
        if (index !== -1) {
          this.elevator.floorList.splice(index, 1)
        }
        this.toNextFloor()
      }, DOOR_ACTION_TIME)
    }

    private toNextFloor() {
      // 如果电梯跑完 floorList 的所有楼层，电梯恢复为等待状态，实例生命周期走完
      if (!this.elevator.floorList.length) {
        this.elevator.direction = Direction.stop
        this.elevator.elevatorStatus = ElevatorStatus.pending
        setElevators(quickSetElevators(this.elevator))
        return
      }

      // TODO: wait
      for (const caller of this.elevator.queue) {
        caller.beforeRunning?.(this.elevator.currentFloor)
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
          const isPoleFloor =
            this.elevator.direction === Direction.up
              ? Math.max.apply(null, this.elevator.floorList) <
                this.elevator.currentFloor
              : Math.min.apply(null, this.elevator.floorList) >
                this.elevator.currentFloor
          if (isPoleFloor) {
            this.elevator.direction =
              this.elevator.direction === Direction.up
                ? Direction.down
                : Direction.up
          }
          this.elevator.currentFloor =
            this.elevator.direction === Direction.up
              ? this.elevator.currentFloor + 1
              : this.elevator.currentFloor - 1
          break

        default:
          break
      }

      this.elevator.elevatorStatus = ElevatorStatus.running

      setTimeout(() => {
        setElevators(quickSetElevators(this.elevator))
        for (const caller of this.elevator.queue) {
          caller.afterRunning?.(this.elevator.currentFloor)
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

        // elevatorStatus 为 waiting 电梯开门
        if (this.elevator.elevatorStatus === ElevatorStatus.waiting) {
          batch(() => {
            // 设置当前楼层为 waiting 状态 展示绿灯
            setElevators(quickSetElevators(this.elevator))
            this.openDoor()
          })
          return
        } else {
          this.elevator.elevatorStatus === ElevatorStatus.running
        }
      }

      this.toNextFloor()
    }
  }

  function callNearestVacantElevator() {
    const SchedulingList: Scheduling[] = []
    // TODO: 此处有问题，会重复召唤电梯
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
      for (let i = 0, len = random(2, 1); i < len; i++) {
        const currentFloor = random(24, 1)
        const direction = random(9) < 5 ? Direction.down : Direction.up
        const callerFlag = flag++
        queue.push({
          flag: callerFlag,
          currentFloor,
          direction,
          elevatorId: null,
          targetFloor: null,
          elevatorOpenDoorAction: [],
          openAction(elevatorId, elevatorCurrentFloor, callerAction) {
            if (!this.targetFloor) {
              this.targetFloor = random(
                this.direction === Direction.up ? MAX_FLOOR_NUM : 1,
                this.currentFloor
              )
              queue.splice(
                queue.findIndex((item) => item.flag === this.flag),
                1
              )
              this.elevatorId = elevatorId
              callerAction("getIn", this)
            }
            if (this.targetFloor === elevatorCurrentFloor) {
              // 到达指定楼层下电梯
              callerAction("getOut", this)
            }
          },
        })
      }

      callNearestVacantElevator()
      randomCalling()
    }, random(5000, 3000))
  }

  function personCalling(direction: Direction.up | Direction.down) {
    if (mainView()) {
      // 已经召唤过电梯，可更改方向
      if (mainView()!.direction !== direction) {
        setMainView((mainView) => {
          mainView!.direction = direction
          return { ...mainView! }
        })
      }
      return
    }
    const mV: Caller = {
      flag: flag++,
      currentFloor: personCurrentFloor(),
      direction,
      targetFloor: null,
      elevatorId: null,
      elevatorOpenDoorAction: [],
      openAction(elevatorId, elevatorCurrentFloor, callerAction) {
        setMainView((mainView) => {
          mainView!.elevatorOpenDoorAction.push({
            elevatorId,
            elevatorCurrentFloor,
            callerAction,
          })
          return { ...mainView! }
        })
      },
      beforeRunning(currentFloor) {},
      afterRunning(currentFloor) {
        setPersonCurrentFloor(currentFloor)
      },
    }

    setMainView(mV)
    queue.push(mV)
    callNearestVacantElevator()
  }
  function getInElevator(elevatorId: number) {
    const theMainView = mainView()
    if (!theMainView || theMainView.elevatorId !== null) {
      return
    }
    const action = theMainView.elevatorOpenDoorAction.find(
      (item) => item.elevatorId === elevatorId
    )!
    theMainView.elevatorId = elevatorId
    action.callerAction("getIn", theMainView)
    theMainView.elevatorOpenDoorAction = []
    setMainView({ ...theMainView })
  }
  function getOutElevator() {
    const theMainView = mainView()
    if (!theMainView || theMainView.elevatorId === null) {
      return
    }
    const action = theMainView.elevatorOpenDoorAction[0]
    action.callerAction("getOut", theMainView)
    setMainView(null)
  }

  return (
    <div class="w-full h-full flex justify-center items-center py-20px box-border">
      <div class="flex items-center h-full">
        <div
          class="border-y-1px border-[#c0c0c0] h-full overflow-y-hidden"
          ref={buildingElm}
        >
          <Index each={building()}>
            {(item, index) => {
              const floor = item()
              return (
                <div
                  class="flex h-300px items-center border-[#c0c0c0]"
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
                      const isShowGetInBtn = createMemo(() =>
                        Boolean(
                          item().level === personCurrentFloor() &&
                            elevator().currentFloor === personCurrentFloor() &&
                            mainView() &&
                            mainView()!.elevatorId === null &&
                            elevator().queue.length < MAX_LOAD_LIMIT
                        )
                      )

                      return (
                        <div class="w-220px p-20px box-border flex flex-col items-center">
                          <div class="border border-[#b0b7c5] h-40px w-full flex justify-around items-center">
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
                            <div>
                              <LedNumber
                                number={transformFloorNumber(
                                  elevator().currentFloor,
                                  2
                                )}
                              />
                              <LedNumber
                                number={transformFloorNumber(
                                  elevator().currentFloor,
                                  1
                                )}
                              />
                            </div>
                            <div class="w-24px h-24px border text-center">
                              {elevator().direction === Direction.up
                                ? "up"
                                : "down"}
                            </div>
                            <div class="w-24px h-24px border text-center">
                              {`${elevator().queue.length}人`}
                            </div>
                          </div>

                          <div class="border border-[#b0b7c5] w-full h-190px flex justify-center relative">
                            {isShowGetInBtn() && (
                              <GetInButton
                                isClose={buildingElevator().translateX[0] === 0}
                                emitGetInElevator={() =>
                                  getInElevator(elevator().id)
                                }
                              />
                            )}
                            <Index each={buildingElevator().translateX}>
                              {(translateX) => {
                                return (
                                  <div
                                    class="w-1px h-full bg-#b0b7c5 transition-transform ease"
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
            {mainView() && mainView()!.elevatorId !== null && (
              <button onClick={() => getOutElevator()}>出门</button>
            )}
          </div>
          <div></div>
        </div>
      </div>
    </div>
  )
}

export default App
