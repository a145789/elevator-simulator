import {
  batch,
  Component,
  createMemo,
  createSignal,
  Index,
  onMount,
} from "solid-js"
import { createMutable, createStore } from "solid-js/store"
import GetInButton from "./components/GetInButton"
import LedNumber from "./components/LedNumber"
import {
  Building,
  Caller,
  CallerStatus,
  Direction,
  DOOR_ACTION_TIME,
  Elevator,
  ElevatorStatus,
  ELEVATOR_THROUGH_FLOOR_TIME,
  ELEVATOR_WAITING_TIME,
  getIsHaveSameDirectionSpareElevator,
  getSameDirectionNotNeedElevator,
  LightColor,
  LIGHT_COLOR,
  MAX_ELEVATOR_NUM,
  MAX_FLOOR_NUM,
  MAX_LOAD_LIMIT,
  MAX_RANDOM_PERSON_NUM,
  random,
  transformFloorNumber,
  WAIT_ASSIGN_FLOOR_TIME,
} from "./constants"

let flag = 0

const genElevator = () =>
  Array.from({ length: MAX_ELEVATOR_NUM }).map<Elevator>((_, index) => ({
    id: index,
    currentLevel: random(24, 1),
    elevatorStatus: ElevatorStatus.pending,
    direction: Direction.stop,
    targetLevelList: [],
    queue: [],
    scheduling: null,
  }))
const genBuilding = () =>
  Array.from({ length: MAX_FLOOR_NUM }).map<Building>((_, index) => ({
    level: MAX_FLOOR_NUM - index,
    direction: [] as Direction[],
    elevators: Array.from({ length: MAX_ELEVATOR_NUM }).map((_, eIdx) => ({
      id: eIdx,
      translateX: [0, 0],
    })),
    queue: [],
  }))

const App: Component = () => {
  const elevators = createMutable<Elevator<Scheduling>[]>(genElevator())
  const [building, setBuilding] = createStore(genBuilding())
  const [personCurrentLevel, setPersonCurrentLevel] = createSignal(1)
  const [mainView, setMainView] = createStore<Caller>({
    flag: flag++,
    currentLevel: personCurrentLevel(),
    callerStatus: CallerStatus.outside,
    whenOpenDoorCallerActionList: [],
    onOpen(elevatorId, callerAction) {
      if (
        mainView.whenOpenDoorCallerActionList.some(
          (item) => item.elevatorId === elevatorId
        )
      ) {
        return
      }
      setMainView("whenOpenDoorCallerActionList", (list) => [
        ...list,
        {
          elevatorId,
          cb: callerAction,
        },
      ])
    },
  })

  let buildingElm: HTMLDivElement | undefined
  onMount(() => {
    // 刚进入时 scrollTop scrollHeight 有几率不是最长的
    setTimeout(() => {
      buildingElm!.scrollTop = buildingElm!.scrollHeight
      setBuilding(
        building.findIndex((item) => item.level === personCurrentLevel()),
        "queue",
        (queue) => [...queue, mainView]
      )

      elevators.forEach((item) => {
        item.scheduling = new Scheduling(item)
      })

      randomCalling()
    })
  })

  function updatePureBuildingTranslateX(
    elevator: Elevator,
    translateX: [number, number]
  ) {
    const { id, currentLevel } = elevator

    setBuilding(
      MAX_FLOOR_NUM - currentLevel,
      "elevators",
      (item) => item.id === id,
      "translateX",
      translateX
    )
  }
  function updateBuildingDirection(
    level: number,
    direction: Direction,
    type: "add" | "del"
  ) {
    const index = MAX_FLOOR_NUM - level
    if (
      (!building[index].direction.includes(direction) && type === "add") ||
      (building[index].direction.includes(direction) && type === "del")
    ) {
      setBuilding(index, "direction", (floorDirection) => {
        if (type === "add") {
          floorDirection.push(direction)
        } else {
          floorDirection.splice(floorDirection.indexOf(direction), 1)
        }
        return [...floorDirection]
      })
    }
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

  /**
   * 电梯运行时的实例
   */
  class Scheduling {
    private elevator: Elevator<Scheduling>
    constructor(elevator: Elevator) {
      this.elevator = elevator
    }

    /** 当前电梯是否到达乘客所在楼层 */
    private openFlag = false
    private callerGetInAction(caller: Caller) {
      if (!this.openFlag) {
        return
      }

      // 限载8人，超过等下一辆
      if (this.elevator.queue.length < MAX_LOAD_LIMIT) {
        this.elevator.queue.push(caller)
        caller.onOpen(this.elevator.id, this.callerGetOutAction.bind(this))
      } else {
        // TODO: Message 提示 装不下
      }

      // 每次进出都要延长电梯开门
      this.openDoor()
    }
    private callerGetOutAction(caller: Caller) {
      if (!this.openFlag) {
        return
      }
      this.elevator.queue.splice(
        this.elevator.queue.findIndex((item) => item.flag === caller.flag),
        1
      )

      caller.onOpen(this.elevator.id, this.callerGetInAction.bind(this))

      // 每次进出都要延长电梯开门
      this.openDoor()
    }

    private openDoorTimer: number | null = null
    public openDoor() {
      // 正在开门中不执行
      if (this.openDoorTimer !== null) {
        return
      }
      // 如果在关门中取消关门
      if (this.closeDoorTimer !== null) {
        clearTimeout(this.closeDoorTimer)
        this.closeDoorTimer = null
      }
      this.openFlag = true

      // 延时更新
      setTimeout(() => {
        updatePureBuildingTranslateX(this.elevator, [-91, 91])
      })

      this.openDoorTimer = setTimeout(() => {
        this.openDoorTimer = null
        this.closeDoor()
      }, ELEVATOR_WAITING_TIME + DOOR_ACTION_TIME)
    }

    private closeDoorTimer: number | null = null
    public closeDoor() {
      if (this.closeDoorTimer !== null) {
        return
      }
      if (this.openDoorTimer !== null) {
        clearTimeout(this.openDoorTimer)
        this.openDoorTimer = null
      }
      updatePureBuildingTranslateX(this.elevator, [0, 0])
      this.closeDoorTimer = setTimeout(() => {
        this.closeDoorTimer = null
        // 门彻底关闭，不再允许乘客上下电梯
        this.openFlag = false

        // 如果是搭载了乘客，延时一段时间，等待按去往楼层的按钮
        setTimeout(() => {
          this.toNextFloor()
        }, WAIT_ASSIGN_FLOOR_TIME)
      }, DOOR_ACTION_TIME)
    }

    private toNextFloor() {
      batch(() => {
        // 如果电梯跑完此方向所有目标楼层，此方向也没有需要要电梯或已有去往此方向的电梯
        if (
          !this.elevator.targetLevelList.some((level) =>
            this.elevator.direction === Direction.up
              ? level > this.elevator.currentLevel
              : level < this.elevator.currentLevel
          ) &&
          (getIsHaveSameDirectionSpareElevator(
            elevators,
            this.elevator.direction,
            this.elevator.currentLevel
          ) ||
            getSameDirectionNotNeedElevator(
              building,
              this.elevator.direction,
              this.elevator.currentLevel
            ))
        ) {
          // 处理电梯内部相反方向的乘客
          if (this.elevator.targetLevelList.length) {
            this.elevator.direction =
              this.elevator.direction === Direction.up
                ? Direction.down
                : Direction.up
          } else {
            // 恢复为等待状态
            this.elevator.direction = Direction.stop
            this.elevator.elevatorStatus = ElevatorStatus.pending
            // TODO: 开启一个查询，查找是否还有需要电梯的楼层
            return
          }
        }

        this.elevator.elevatorStatus = ElevatorStatus.running

        setTimeout(() => {
          batch(() => {
            this.elevator.currentLevel =
              this.elevator.direction === Direction.up
                ? this.elevator.currentLevel + 1
                : this.elevator.currentLevel - 1

            this.run()
          })
          isRunScrollAnimation = false
        }, ELEVATOR_THROUGH_FLOOR_TIME)
      })
    }

    public run() {
      batch(() => {
        const currentBuildIndex = building.findIndex(
          (item) => item.level === this.elevator.currentLevel
        )
        const { direction: buildingDirection, queue: buildingQueue } =
          building[currentBuildIndex]

        // 符合电梯的目标楼层
        if (
          this.elevator.targetLevelList.includes(this.elevator.currentLevel)
        ) {
          this.elevator.elevatorStatus = ElevatorStatus.open

          this.elevator.targetLevelList.splice(
            this.elevator.targetLevelList.indexOf(this.elevator.currentLevel),
            1
          )

          // 通知所有在电梯内的乘客是否需要出电梯
          for (const caller of [...this.elevator.queue]) {
            caller.onOpen(this.elevator.id, this.callerGetOutAction.bind(this))
          }
        }

        // 搭乘同方向的乘客
        if (buildingDirection.includes(this.elevator.direction)) {
          this.elevator.elevatorStatus = ElevatorStatus.open

          setBuilding(currentBuildIndex, "direction", (d) => {
            d.splice(d.indexOf(this.elevator.direction), 1)
            return [...d]
          })

          console.log(buildingQueue.length)
          // 通知此楼乘客是否上电梯
          for (const caller of [...buildingQueue]) {
            caller.onOpen(this.elevator.id, this.callerGetInAction.bind(this))
          }
        }

        // 此楼层想要去往的方向与电梯方向不同
        // 但电梯内无乘客，此方向也无需要使用电梯的乘客或者有其他电梯驶向此方向
        if (
          buildingDirection.length &&
          !this.elevator.targetLevelList.length &&
          (getIsHaveSameDirectionSpareElevator(
            elevators,
            this.elevator.direction,
            this.elevator.currentLevel
          ) ||
            getSameDirectionNotNeedElevator(
              building,
              this.elevator.direction,
              this.elevator.currentLevel
            ))
        ) {
          this.elevator.elevatorStatus = ElevatorStatus.open
          this.elevator.direction = buildingDirection[0]
          setBuilding(currentBuildIndex, "direction", () => [])
          console.log(buildingQueue.length)
          // 通知此楼乘客是否上电梯
          for (const caller of [...buildingQueue]) {
            caller.onOpen(this.elevator.id, this.callerGetInAction.bind(this))
          }
        }

        // elevatorStatus 为 open 电梯开门
        if (this.elevator.elevatorStatus === ElevatorStatus.open) {
          this.openDoor()
          return
        }

        this.elevator.elevatorStatus = ElevatorStatus.running
        this.toNextFloor()
      })
    }
  }

  function callNearestVacantElevator(level: number, direction: Direction) {
    batch(() => {
      updateBuildingDirection(level, direction, "add")

      if (getIsHaveSameDirectionSpareElevator(elevators, direction, level)) {
        return
      }

      // 没有空闲的电梯
      const vacantElevators = elevators.filter(
        ({ direction }) => direction === Direction.stop
      )
      if (!vacantElevators.length) {
        return
      }

      // 找到最近的空置电梯
      const elevator = vacantElevators.reduce((p, c) =>
        c.elevatorStatus !== ElevatorStatus.pending ||
        (p.elevatorStatus === ElevatorStatus.pending &&
          Math.abs(p.currentLevel - level) < Math.abs(c.currentLevel - level))
          ? p
          : c
      )

      if (elevator.currentLevel === level) {
        elevator.direction = direction
        elevator.elevatorStatus = ElevatorStatus.open
      } else {
        elevator.direction =
          elevator.currentLevel > level ? Direction.down : Direction.up
        elevator.elevatorStatus = ElevatorStatus.running
      }

      elevator.scheduling!.run()
    })
  }

  let randomCallingTimer: number
  function randomCalling() {
    clearTimeout(randomCallingTimer)
    randomCallingTimer = setTimeout(() => {
      batch(() => {
        const personNum = building.reduce((p, c) => p + c.queue.length, 0)
        if (personNum === MAX_RANDOM_PERSON_NUM) {
          return
        }
        for (
          let i = 0, len = random(MAX_RANDOM_PERSON_NUM - personNum, 1);
          i < len;
          i++
        ) {
          const direction = random(1) < 1 ? Direction.down : Direction.up

          let randomCaller: Caller | null = {
            flag: flag++,
            currentLevel: random(24, 1),
            callerStatus: CallerStatus.outside,
            whenOpenDoorCallerActionList: [],
            onOpen(_elevatorId, callerAction) {
              batch(() => {
                if (randomCaller!.callerStatus === CallerStatus.outside) {
                  setBuilding(
                    building.findIndex(
                      ({ level }) => level === randomCaller!.currentLevel
                    ),
                    "queue",
                    (queue) => {
                      queue.splice(
                        queue.findIndex((item) => item.flag === flag),
                        1
                      )
                      return [...queue]
                    }
                  )
                  randomCaller!.callerStatus = CallerStatus.inside
                  callerAction(randomCaller!)
                } else {
                  randomCaller!.callerStatus = CallerStatus.outside
                  callerAction(randomCaller!)
                  if (random(1) > 0) {
                    setBuilding(
                      building.findIndex(
                        ({ level }) => level === randomCaller!.currentLevel
                      ),
                      "queue",
                      (queue) => [...queue, randomCaller!]
                    )
                    // 设定一个定时器随机几秒后再上下楼
                    setTimeout(() => {
                      const direction =
                        random(1) < 1 ? Direction.down : Direction.up

                      callNearestVacantElevator(
                        randomCaller!.currentLevel,
                        direction
                      )
                    }, random(6000))
                  } else {
                    randomCaller = null
                  }
                }
              })
            },
          }

          setBuilding(
            building.findIndex(
              (item) => item.level === randomCaller!.currentLevel
            ),
            "queue",
            (queue) => [...queue, randomCaller!]
          )

          callNearestVacantElevator(randomCaller!.currentLevel, direction)
        }
      })

      randomCalling()
    }, random(5000, 3000))
  }

  function personCalling(direction: Direction.up | Direction.down) {
    if (mainView.callerStatus === CallerStatus.inside) {
      return
    }

    callNearestVacantElevator(mainView.currentLevel, direction)
  }
  function getInElevator(elevatorId: number) {
    batch(() => {
      setBuilding(
        building.findIndex(({ level }) => level === mainView.currentLevel),
        "queue",
        (queue) => {
          queue.splice(
            queue.findIndex((item) => item.flag === mainView.flag),
            1
          )
          return [...queue]
        }
      )

      const { cb } = mainView.whenOpenDoorCallerActionList.find(
        (item) => item.elevatorId === elevatorId
      )!
      setMainView("whenOpenDoorCallerActionList", [])
      setMainView("callerStatus", CallerStatus.inside)

      cb(mainView)
    })
  }
  function getOutElevator() {
    batch(() => {
      const { cb } = mainView.whenOpenDoorCallerActionList[0]
      setMainView("whenOpenDoorCallerActionList", [])
      setMainView("callerStatus", CallerStatus.outside)

      cb(mainView)

      setBuilding(
        building.findIndex(({ level }) => level === mainView.currentLevel),
        "queue",
        (queue) => [...queue, mainView]
      )
    })
  }

  return (
    <div class="w-full h-full flex justify-center items-center py-20px box-border">
      <div class="flex items-center h-full">
        <div
          class="border-y-1px border-[#c0c0c0] h-full overflow-y-hidden"
          ref={buildingElm}
        >
          <Index each={building}>
            {(item, index) => {
              const floor = item()
              return (
                <div
                  class="flex h-300px items-center border-[#c0c0c0]"
                  classList={{
                    "border-b-1px": index + 1 !== building.length,
                  }}
                >
                  <div>
                    <div class="w-24px">{floor.level}</div>
                    <div>人数：{item().queue.length}</div>
                  </div>

                  <Index each={item().elevators}>
                    {(buildingElevator) => {
                      const { id } = buildingElevator()
                      const elevator = createMemo(
                        () => elevators.find((e) => e.id === id)!
                      )
                      const isOpenDoor = createMemo(() =>
                        Boolean(
                          (mainView.callerStatus === CallerStatus.outside &&
                            item().level === personCurrentLevel() &&
                            elevator().currentLevel === personCurrentLevel()) ||
                            (mainView.callerStatus === CallerStatus.inside &&
                              elevator().queue.some(
                                (item) => item.flag === mainView.flag
                              ))
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
                                  const { currentLevel, elevatorStatus } =
                                    elevator()

                                  switch (c) {
                                    case LightColor.red:
                                      // 电梯不在此楼层的展示红灯
                                      show = currentLevel !== floor.level
                                      break
                                    case LightColor.yellow:
                                      // 电梯在此楼层并且为等待状态展示黄灯
                                      show =
                                        currentLevel === floor.level &&
                                        (elevatorStatus ===
                                          ElevatorStatus.running ||
                                          elevatorStatus ===
                                            ElevatorStatus.pending)
                                      break
                                    case LightColor.green:
                                      show =
                                        currentLevel === floor.level &&
                                        elevatorStatus === ElevatorStatus.open
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
                                  elevator().currentLevel,
                                  2
                                )}
                              />
                              <LedNumber
                                number={transformFloorNumber(
                                  elevator().currentLevel,
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
                              {`${elevator().queue.length}`}
                            </div>
                          </div>

                          <div class="border border-[#b0b7c5] w-full h-190px flex justify-center relative">
                            {isOpenDoor() && (
                              <GetInButton
                                callerStatus={mainView.callerStatus}
                                isClose={buildingElevator().translateX[0] === 0}
                                emitGetInElevator={() =>
                                  mainView.callerStatus === CallerStatus.inside
                                    ? getOutElevator()
                                    : getInElevator(elevator().id)
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
            <li>current floor: {personCurrentLevel()}</li>
            <li>
              <button onClick={() => personCalling(Direction.up)}>up</button>
              <button onClick={() => personCalling(Direction.down)}>
                down
              </button>
            </li>
          </ul>
          <ul class="flex">{/* <Index each={}></Index> */}</ul>
          <div></div>
        </div>
      </div>
    </div>
  )
}

export default App
