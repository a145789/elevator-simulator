/**
 *
 * 守得云开见月明
 * 每个楼层都有楼层数、显示当前电梯在第几层的显示屏、红黄绿三个状态灯
 * 红 -> 电梯不在此楼，上下通行中 running
 * 黄 -> 电梯在此楼，但是没有开门，等待调度 pending
 * 绿 -> 电梯在此楼开门等待人员进入 waiting
 * 每个电梯有上下按钮召唤电梯，电梯响应后到达指定楼层，开门时间为 1.5s
 * 开门后会等待 5s，people 可选择进入不进入，5s 后会再花 1.5s 的时间关门
 * 关门期间 press 上下按钮会阻断关门
 * 电梯启动会有 1.5s 的等待上下楼层的指令时间
 *
 * 刚进入时，初始化电梯状态-> 随机在任意楼层，当前可为运行状态或者等待
 *
 */

import { Component, For } from "solid-js"
import { createStore } from "solid-js/store"

const MAX_FLOOR_NUM = 24 as const

const ELEVATOR_WAITING_TIME = 5 as const

const DOOR_ACTION_TIME = 1.5 as const

const enum ElevatorStatus {
  running,
  pending,
  waiting,
}

const enum Direction {
  up,
  down,
  stop
}

const genElevator = () => ({
  currentFloor:1,
  direction: Direction.stop
})

const genFloor = () =>
  Array.from({ length: MAX_FLOOR_NUM }).map((_, index) => ({
    level: MAX_FLOOR_NUM - index,
    elevatorStatus: ElevatorStatus.pending,
    elevatorInFloorNum: 1
  }))

const App: Component = () => {
  return <div>Hello</div>
}

export default App
