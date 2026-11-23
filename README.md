# Real Gas Escape Room v4 — 独立站点

基于 v4 源码包（提交 b14ff0a）搭建的可独立部署版本：Next.js + Node 内置 SQLite，
保留两关流程、粒子动画、浅色莫兰迪视觉与 Comic Sans MS 大字号。

## 运行

```sh
npm install
npm run build
npm start        # 生产模式，端口 3200
npm run dev      # 开发模式
```

需要 Node.js 22.13+。

## 配置（.env）

| 变量 | 当前值 | 说明 |
|---|---|---|
| `CLASS_CODE` | `GASLAB4` | 服务器内部班级码（学生无需输入，登录页自动获取） |
| `TEACHER_PIN` | `TEACHV4` | 教师端数据墙解锁码 |

修改 `.env` 后重启服务即可生效。身份页会自动显示当前班级码提示。

## 数据库

- 独立 SQLite 文件：`data/real-gas-v4.sqlite`（首次启动自动建表，与 v3 站点数据完全隔离）。
- 表结构与原 Cloudflare D1 迁移一致：`submissions`、`class_control`。
- 部署到其他服务器时把 `data/` 目录随项目迁移即可；也可用 `DATA_DIR` 环境变量指定数据目录。

## 功能

- **Level 1 · Find the ideal zone**：CO₂ 温度/压强滑块、实时 Z 值与偏差、
  提交到班级数据墙（Peng–Robinson 计算）、证据集解锁（2 近理想 + 1 显著偏离）。
- **Level 2 · Model Repair Station**：温度探究（4 步）+ 密度探究（3 步）、
  Canvas 粒子动画（吸引力箭头 / 有限分子体积放大粒子）、理想/模型压强读数、
  答题框与逐级提示。答案同时保存在当前标签页（sessionStorage）并自动同步到数据库，
  教师端实时显示（各小组的 Temperature / Density 探究三题答案）。
- **学生登录**：无需密码/班级码；选择 Group 1–12 并填写自己的姓名，提交记录按 Group + 姓名展示。
- **教师端**：教师 PIN 登录，分两个 Tab——
  - `Level 1 · Data wall`：指标卡、温度-压强散点图、小组统计、明细表、暂停采集、冻结显示、全屏投影；
  - `Level 2 · Model repair`：教师版探究界面演示（滑块、粒子动画、压强读数、步骤，不写入学生数据）+ 学生三题答案卡片。
  - 两个 Tab 共用 **Group 筛选**，2 秒自动刷新。

## 验证记录

- 构建通过；API 全流程测试（班级码校验 / 参数校验 / 提交 / 教师读取 / Team 过滤 /
  暂停 423 / 删除权限）全部通过。
- 真实浏览器（Chrome DevTools Protocol）走完整学生流程：
  3 次提交 → 证据集完成 → 解锁 Level 2 → 温度探究答题 → 密度探究读数 →
  教师墙显示提交数据，均正常。
