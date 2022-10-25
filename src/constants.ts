export const MAX_FLOOR_NUM = 24 as const

export const MAX_ELEVATOR_NUM = 4 as const

export const ELEVATOR_THROUGH_FLOOR_TIME = 1500

export const ELEVATOR_WAITING_TIME = 4000 as const

export const DOOR_ACTION_TIME = 2500 as const

export const MAX_LOAD_LIMIT = 8 as const

export const MAX_RANDOM_PERSON_NUM = 12 as const

export const WAIT_ASSIGN_FLOOR_TIME = 750 as const

export const enum ElevatorStatus {
  /** 电梯正在运行中 */
  running,
  /** 电梯停止等待召唤 */
  pending,
  /** 开门等待进入 */
  open,
}

export const enum Direction {
  up,
  down,
  stop,
}

export const enum ArrivedStatus {
  no,
  /** 电梯到达用户所在楼层 */
  ok,
}

export const enum CallerStatus {
  outside,
  inside,
}

export const enum LightColor {
  red = "#F76965",
  yellow = "#ff9626",
  green = "#27c346",
}
export const LIGHT_COLOR = [
  LightColor.red,
  LightColor.yellow,
  LightColor.green,
] as const

type CallerAction = (caller: Caller) => boolean

export interface Caller {
  flag: number
  currentLevel: number
  /** 状态 */
  callerStatus: CallerStatus
  /** 同一楼层可能会有多部电梯开门，使用一个数组保存所有回调 */
  whenOpenDoorCallerActionList: {
    elevatorId: number
    cb: CallerAction
  }[]
  handleTargetLevel: ((level: number) => void) | null
  /** 乘客进入，将会给予乘客操作电梯目标楼层的按钮回调 */
  getHandleTargetLevel: (callerAction: (level: number) => void) => void
  /** 电梯开门会调用此方法 */
  onOpen: (
    elevatorId: number,
    /** 乘客选择进出门的回调 */
    callerAction: CallerAction
  ) => void
  /** 开门期间 */
  onDuringOpen?: (
    elevatorId: number,
    /** 乘客选择进出门的回调 */
    callerAction: CallerAction
  ) => void
  onBeforeRunning?: (elevatorId: number) => void
  onRunning?: (elevator: Elevator) => void
}
export interface Elevator<Scheduling = any> {
  id: number
  currentLevel: number
  elevatorStatus: ElevatorStatus
  /** 乘客在电梯内按下去往楼层数 */
  targetLevelList: number[]
  direction: Direction
  /** 电梯搭载的乘客 */
  queue: Caller[]
  scheduling: Scheduling | null
}

export interface Building {
  level: number
  direction: Direction[]
  elevators: {
    id: number
    translateX: [number, number]
  }[]
  queue: Caller[]
}

type Number = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export function transformFloorNumber(number: number, digits: 1 | 2) {
  const str = String(number)
  if (digits === 1) {
    return Number(str.length === 2 ? str[1] : str) as Number
  } else {
    return str.length === 2 ? (Number(str[0]) as Number) : null
  }
}

/** [max-min] */
export const random = (max: number, min = 0) => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** 是否有同方向在运行，并且搭乘人数没有超过可搭乘最大人数的电梯 */
export function getIsHaveSameDirectionSpareElevator(
  elevators: Elevator[],
  direction: Direction,
  level: number
) {
  return elevators.some((e) => {
    if (e.queue.length >= MAX_LOAD_LIMIT || e.direction !== direction) {
      return false
    }

    switch (e.direction) {
      case Direction.down:
        return e.currentLevel > level
      case Direction.up:
        return e.currentLevel < level
      default:
        return true
    }
  })
}

/** 获取同方向下的是否还有楼层需要电梯 */
export function getSameDirectionNotNeedElevator(
  building: Building[],
  direction: Direction,
  level: number
) {
  let notHaveTask = false
  const index = building.findIndex((item) => item.level === level)
  switch (direction) {
    case Direction.down:
      notHaveTask = !building
        .slice(index + 1, MAX_FLOOR_NUM)
        .some((item) => item.direction.length)
      break
    case Direction.up:
      notHaveTask = !building
        .slice(0, index)
        .some((item) => item.direction.length)
      break
    default:
      break
  }

  return notHaveTask
}
