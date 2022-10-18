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
  Building,
  Caller,
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
} from "./constants"

let flag = 0

const genElevator = (): Elevator[] =>
  Array.from({ length: MAX_ELEVATOR_NUM }).map((_, index) => ({
    id: index,
    currentLevel: random(24, 1),
    elevatorStatus: ElevatorStatus.pending,
    direction: Direction.stop,
    targetLevelList: [],
    queue: [],
    scheduling: null,
  }))
const genBuilding = (): Building[] =>
  Array.from({ length: MAX_FLOOR_NUM }).map((_, index) => ({
    level: MAX_FLOOR_NUM - index,
    direction: [] as Direction[],
    elevators: Array.from({ length: MAX_ELEVATOR_NUM }).map((_, eIdx) => ({
      id: eIdx,
      translateX: [0, 0],
    })),
    queue: [],
  }))

const App: Component = () => {
  const [elevators, setElevators] = createSignal<Elevator<Scheduling>[]>(
    genElevator()
  )
  const [building, setBuilding] = createSignal<Building[]>(genBuilding())
  const [personcurrentLevel, setPersoncurrentLevel] = createSignal(1)
  const [mainView, setMainView] = createSignal<Caller>({
    flag: flag++,
    currentLevel: 1,
    whenOpenDoorCallerActionList: [],
    onOpen() {},
  })

  let buildingElm: HTMLDivElement | undefined
  onMount(() => {
    // 刚进入时 scrollTop scrollHeight 有几率不是最长的
    setTimeout(() => {
      buildingElm!.scrollTop = buildingElm!.scrollHeight
      setBuilding((b) => {
        b.find((item) => item.level === 1)?.queue.push(mainView())
        return [...b]
      })
      randomCalling()
    })
  })

  function quickSetElevators({
    targetLevelList,
    queue,
    ...rest
  }: Elevator<Scheduling>) {
    return (e: Elevator[]) => {
      const index = e.findIndex((item) => item.id === rest.id)
      e.splice(index, 1, {
        ...rest,
        targetLevelList: [...targetLevelList],
        queue: [...queue],
      })
      return [...e]
    }
  }

  function updatePureBuildingTranslateX(
    elevator: Elevator,
    translateX: [number, number]
  ) {
    const { id, currentLevel } = elevator
    const index = MAX_FLOOR_NUM - currentLevel
    const theBuilding = building()
    const item = { ...theBuilding[index] }
    const eIdx = item.elevators.findIndex((item) => item.id === id)
    item.elevators[eIdx].translateX = translateX
    item.elevators[eIdx] = { ...item.elevators[eIdx] }
    theBuilding[index] = item

    return [...theBuilding]
  }
  function updateBuildingDirection(
    level: number,
    direction: Direction,
    type: "add" | "del"
  ) {
    const index = MAX_FLOOR_NUM - level
    const theBuilding = building()
    if (
      (theBuilding[index].direction.includes(direction) && type === "add") ||
      (!theBuilding[index].direction.includes(direction) && type === "del")
    ) {
      return theBuilding
    } else {
      const floor = theBuilding[index]
      if (type === "add") {
        floor.direction.push(direction)
      } else {
        floor.direction.splice(floor.direction.indexOf(direction), 1)
      }
      theBuilding.splice(index, 1, {
        ...floor,
        direction: [...floor.direction],
      })

      return [...theBuilding]
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
   * 当一部空闲电梯被召唤，生成此实例
   * 当电梯所有的运行任务完成，并且电梯内没有任何乘客时，此实例结束
   */
  class Scheduling {
    private elevator: Elevator<Scheduling>
    constructor({ queue, ...rest }: Elevator) {
      this.elevator = { ...rest, queue: [...queue] }
    }

    /** 当前电梯是否到达乘客所在楼层 */
    private openFlag = false
    private callerAction = (action: "getIn" | "getOut", caller: Caller) => {
      if (!this.openFlag) {
        return
      }

      if (action === "getIn") {
        // 限载8人，超过等下一辆
        if (this.elevator.queue.length < MAX_LOAD_LIMIT) {
          this.elevator.queue.push(caller)
        } else {
          // Message 提示 装不下
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
        setBuilding(updatePureBuildingTranslateX(this.elevator, [-91, 91]))
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
      setBuilding(updatePureBuildingTranslateX(this.elevator, [0, 0]))
      this.closeDoorTimer = setTimeout(() => {
        this.closeDoorTimer = null
        // 门彻底关闭，不再允许乘客上下电梯
        this.openFlag = false

        this.toNextFloor()
      }, DOOR_ACTION_TIME)
    }

    private toNextFloor() {
      // 如果电梯跑完此方向所有目标楼层，此方向也没有需要要电梯或已有去往此方向的电梯
      if (
        !this.elevator.targetLevelList.some((level) =>
          this.elevator.direction === Direction.up
            ? level > this.elevator.currentLevel
            : level < this.elevator.currentLevel
        ) &&
        (getIsHaveSameDirectionSpareElevator(
          elevators(),
          this.elevator.direction,
          this.elevator.currentLevel
        ) ||
          getSameDirectionNotNeedElevator(
            building(),
            this.elevator.direction,
            this.elevator.currentLevel
          ))
      ) {
        // TODO: 处理电梯内部相反方向的乘客
        if (this.elevator.targetLevelList.length) {
          this.elevator.direction =
            this.elevator.direction === Direction.up
              ? Direction.down
              : Direction.up
        } else {
          // 恢复为等待状态，实例生命周期走完
          this.elevator.direction = Direction.stop
          this.elevator.elevatorStatus = ElevatorStatus.pending
          this.elevator.scheduling = null
          setElevators(quickSetElevators(this.elevator))
          return
        }
      }

      this.elevator.currentLevel =
        this.elevator.direction === Direction.up
          ? this.elevator.currentLevel + 1
          : this.elevator.currentLevel - 1

      this.elevator.elevatorStatus = ElevatorStatus.running

      setTimeout(() => {
        setElevators(quickSetElevators(this.elevator))
        // TODO: 等待 0.75s 才开启运行
        this.run()
        isRunScrollAnimation = false
      }, ELEVATOR_THROUGH_FLOOR_TIME)
    }

    public run() {
      if (this.elevator.scheduling === null) {
        this.elevator.scheduling = elevators().find(
          (item) => item.id === this.elevator.id
        )!.scheduling
      }
      const theBuilding = building()
      const { direction: buildingDirection, queue: buildingQueue } =
        theBuilding.find((item) => item.level === this.elevator.currentLevel)!

      // 符合电梯的目标楼层
      if (
        buildingDirection.includes(this.elevator.direction) &&
        this.elevator.targetLevelList.includes(this.elevator.currentLevel)
      ) {
        this.elevator.elevatorStatus = ElevatorStatus.open

        this.elevator.targetLevelList.splice(
          this.elevator.targetLevelList.indexOf(this.elevator.currentLevel),
          1
        )
        buildingDirection.splice(
          buildingDirection.indexOf(this.elevator.direction),
          1
        )

        // TODO: 通知所有在电梯内的乘客是否需要出电梯
        for (const caller of this.elevator.queue) {
          caller.onOpen(this.callerAction)
        }
      }

      // 搭乘同方向的乘客
      if (buildingQueue.length) {
        this.elevator.elevatorStatus = ElevatorStatus.open

        buildingDirection.splice(
          buildingDirection.indexOf(this.elevator.direction),
          1
        )

        //TODO: 通知此楼乘客是否上电梯
        for (const caller of buildingQueue) {
          caller.onOpen(this.callerAction)
        }
      }

      // 此楼层想要去往的方向与电梯方向不同
      // 但电梯内无乘客，此方向也无需要使用电梯的乘客或者有其他电梯驶向此方向
      if (
        buildingDirection.length &&
        !this.elevator.targetLevelList.length &&
        (getIsHaveSameDirectionSpareElevator(
          elevators(),
          this.elevator.direction,
          this.elevator.currentLevel
        ) ||
          getSameDirectionNotNeedElevator(
            theBuilding,
            this.elevator.direction,
            this.elevator.currentLevel
          ))
      ) {
        this.elevator.elevatorStatus = ElevatorStatus.open
        this.elevator.direction = buildingDirection[0]
        buildingDirection.splice(0, 1)
        //TODO: 通知此楼乘客是否上电梯
        for (const caller of buildingQueue) {
          caller.onOpen(this.callerAction)
        }
      }

      // elevatorStatus 为 open 电梯开门
      if (this.elevator.elevatorStatus === ElevatorStatus.open) {
        // 设置当前楼层为 open 状态 展示绿灯
        setElevators(quickSetElevators(this.elevator))
        setBuilding([...theBuilding])

        this.openDoor()
        return
      }

      this.elevator.elevatorStatus === ElevatorStatus.running
      this.toNextFloor()
    }
  }

  function callNearestVacantElevator(level: number, direction: Direction) {
    setBuilding(updateBuildingDirection(level, direction, "add"))

    const theElevators = elevators()
    if (getIsHaveSameDirectionSpareElevator(theElevators, direction, level)) {
      return
    }

    // 没有空闲的电梯
    const vacantElevators = theElevators.filter(
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

    elevator.scheduling = new Scheduling(elevator)
    setElevators(quickSetElevators(elevator))

    elevator.scheduling.run()
  }

  let randomCallingTimer: number
  function randomCalling() {
    clearTimeout(randomCallingTimer)
    randomCallingTimer = setTimeout(() => {
      const theBuilding = building()
      for (
        let i = 0,
          len = random(
            MAX_RANDOM_PERSON_NUM -
              theBuilding.reduce((p, c) => p + c.queue.length, 0),
            1
          );
        i < len;
        i++
      ) {
        const currentLevel = random(24, 1)
        const direction = random(1) < 1 ? Direction.down : Direction.up
        const callerFlag = flag++

        theBuilding
          .find(({ level }) => level === currentLevel)
          ?.queue.push({
            flag: callerFlag,
            currentLevel,
            whenOpenDoorCallerActionList: [],
            onOpen(callerAction) {
              // TODO: some problem
              callerAction("getIn", this)
            },
          })

        setBuilding([...theBuilding])

        callNearestVacantElevator(currentLevel, direction)
      }

      randomCalling()
    }, random(5000, 3000))
  }

  function personCalling(direction: Direction.up | Direction.down) {
    const theMainView = mainView()
    if (theMainView.callerStatus === CallerStatus.inside) {
      return
    }

    callNearestVacantElevator(theMainView.currentLevel, direction)
  }
  function getInElevator(elevatorId: number) {
    const theMainView = mainView()
    if (!theMainView || theMainView.elevatorId !== null) {
      return
    }

    const elevator = elevators().find((item) => item.id === elevatorId)!
    elevator.scheduling?.openDoor()

    const action = theMainView.whenOpenDoorCallerActionList.find(
      (item) => item.elevatorId === elevatorId
    )!
    theMainView.elevatorId = elevatorId
    action.callerAction("getIn", theMainView)
    theMainView.whenOpenDoorCallerActionList = []
    setMainView({ ...theMainView })
  }
  function getOutElevator() {
    const theMainView = mainView()
    if (!theMainView || theMainView.elevatorId === null) {
      return
    }

    const elevator = elevators().find(
      (item) => item.id === theMainView.elevatorId
    )!
    elevator.scheduling?.closeDoor()

    const action = theMainView.whenOpenDoorCallerActionList[0]
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
                          item().level === personcurrentLevel() &&
                            elevator().currentLevel === personcurrentLevel() &&
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
            <li>current floor: {personcurrentLevel()}</li>
            <li>
              <button onClick={() => personCalling(Direction.up)}>up</button>
              <button onClick={() => personCalling(Direction.down)}>
                down
              </button>
            </li>
          </ul>
          <ul class="flex">{/* <Index each={}></Index> */}</ul>
          <div>
            {mainView()?.elevatorId !== null &&
              mainView()?.whenOpenDoorCallerActionList.length && (
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
