# 电梯模拟器

## 基础设置
- 每个楼层都有楼层数、显示当前电梯在第几层的显示屏、红黄绿三个状态灯
  - 红 -> 电梯不在此楼，上下通行中 running
  - 黄 -> 电梯在此楼，但是没有开门，等待调度 pending
  - 绿 -> 电梯在此楼开门等待人员进入 waiting
- 每个电梯有上下按钮召唤电梯，电梯响应后到达指定楼层，开门时间为 1.5s
- 开门后会等待 5s，people 可选择进入不进入，5s 后会再花 1.5s 的时间关门
- 关门期间 press 上下按钮会阻断关门
- 电梯启动会有 1.5s 的等待上下楼层的指令时间
- 刚进入时，初始化电梯状态-> 随机在任意楼层，当前可为运行状态或者等待
 
## 调度配置
- 4 部电梯初始化随机在不同楼层
- 开启一个定时器，随机 500-5000s 之间循环，在随机楼层模拟上下楼，将模拟的楼层推到一个队列
- 若当前有空闲的电梯驶向队列中的第一个楼层，若行驶过程中的楼层存在队列中，在队列中消除该楼层
- 行驶结束，查看队列是否为空，不为空继续工作
