export const MAX_FLOOR_NUM = 24 as const

export const MAX_ELEVATOR_NUM = 4 as const

export const ELEVATOR_THROUGH_FLOOR_TIME = 1500

export const ELEVATOR_WAITING_TIME = 4000 as const

export const DOOR_ACTION_TIME = 2500 as const

export const MAX_LOAD_LIMIT = 8 as const

export const enum ElevatorStatus {
  /** 电梯正在运行中 */
  running,
  /** 电梯停止等待召唤 */
  pending,
  /** 开门等待进入 */
  waiting,
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

export const random = (max: number, min = 0) => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
export type Caller = {
  flag: number
  currentFloor: number
  targetFloor: null | number
  direction: Direction.up | Direction.down
  /** 所乘坐的电梯 */
  elevatorId: number | null
  elevatorOpenDoorAction: {
    elevatorId: number
    elevatorCurrentFloor: number
    callerAction: (action: "getIn" | "getOut", caller: Caller) => void
  }[]
  /** 电梯开门的时候调用此方法 */
  onOpen: (
    elevatorId: number,
    elevatorCurrentFloor: number,
    callerAction: (action: "getIn" | "getOut", caller: Caller) => void
  ) => void
  onClose?: () => void
  /** 电梯运行前的回调 */
  beforeRunning?: (floor: number) => void
  /** 电梯运行后的回调 */
  afterRunning?: (floor: number) => void
}
export type Elevator<T = any> = {
  id: number
  currentFloor: number
  elevatorStatus: ElevatorStatus
  direction: Direction
  /** 电梯所要走的楼层 */
  floorList: number[]
  /** 电梯搭载的乘客 */
  queue: Caller[]
  scheduling: T | null
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
