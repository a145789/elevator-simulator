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

import { Component, createMemo, createSignal, Index } from "solid-js"
import { createStore } from "solid-js/store"

const MAX_FLOOR_NUM = 24 as const

const MAX_ELEVATOR_NUM = 4 as const

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
  stop,
}

const LightColor = ["#F76965", "#ff9626", "#27c346"] as const

const genBuilding = () =>
  Array.from({ length: MAX_FLOOR_NUM }).map((_, index) => ({
    level: MAX_FLOOR_NUM - index,
    elevators: Array.from({ length: MAX_ELEVATOR_NUM }).map(() => ({
      direction: Direction.stop,
      elevatorStatus: ElevatorStatus.pending,
      elevatorMonitor: 1,
    })),
  }))

const App: Component = () => {
  const [building, setBuilding] = createStore(genBuilding())
  const [currentLevel, setCurrentLevel] = createSignal(1)

  const visibleFloor = createMemo(() => {
    return building.slice(MAX_FLOOR_NUM - currentLevel(), 4)
  })
  return (
    <div class="w-full h-full flex justify-center items-center">
      <div class="flex items-center">
        <div class="border-t-1px">
          <Index each={visibleFloor()}>
            {(item) => {
              const floor = item()
              return (
                <div class="flex border-b-1px h-300px items-center">
                  <div class="">{floor.level}</div>

                  <Index each={floor.elevators}>
                    {(elevator) => {
                      const e = elevator()
                      return (
                        <div class="w-220px p-20px box-border flex flex-col items-center">
                          <div class="border h-40px w-full flex justify-around items-center">
                            <Index each={LightColor}>
                              {(color) => (
                                <div
                                  class="w-30px h-30px rounded-full"
                                  classList={{ "opacity-30": true }}
                                  style={{ background: color() }}
                                />
                              )}
                            </Index>
                          </div>

                          <div class="w-24px h-24px m-4px border text-center">
                            {e.elevatorMonitor}
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
        </div>
      </div>
    </div>
  )
}

export default App
