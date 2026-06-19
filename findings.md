# Findings & Decisions — 桌面显眼包

## Requirements
提取自项目计划书 V8.0 FINAL：

- 透明窗口，始终置顶，可拖动（P0）
- 敲键盘/点鼠标触发跳舞动画（P0）
- 随机弹出校园梗吐槽弹幕（P0）
- 点击 vs 拖动判定：150ms 阈值 + 5px 距离（P0）
- 弹幕调度器：5 秒冷却 + 全局队列 ≤ 3 条（P0）
- 老板键：Ctrl+Shift+H 全局隐藏（P1）
- 窗口穿透：双击切换，原子锁 + 异步（P1）
- 坐标持久化：500ms 防抖保存（P1）
- 动画暂停：窗口隐藏时硬终止 Canvas 渲染（P1）
- 事件通道：有界通道 128 缓冲（P1）
- 崩溃兜底：全局异常捕获 + 日志（P1）
- 打赏通道：爱发电 / Buy Me a Coffee（P2）

## Research Findings
从项目计划书提取的技术要点：

### 架构约束
- **Rust 代码禁止 unsafe** — CI clippy 自动拦截
- 所有 `unwrap()` 替换为 `?` 或 `with_context`
- 窗口穿透必须使用原子状态锁 + 异步派发
- 坐标保存必须使用防抖（500ms）
- 键鼠事件必须通过有界通道（128）传递
- 窗口隐藏时同步发送事件强制停止 Canvas 渲染
- 必须集成 `tauri-plugin-log`，记录所有错误

### 第 0 周验证标准
1. **原子切换 Demo**：模拟 100 次并发 `toggle_ignore` 调用 → 最终状态与原子标志一致
2. **防抖 Hooks**：`useDebounceFn` 封装坐标保存 → 500ms 内多次拖动仅 1 次写入
3. **通道压测**：模拟 500 次/秒按键洪流 → CPU 占用 < 5%

### 内测红线
- 日均主动点击宠物交互次数 < 5 次 → 立即停更，代码开源，转毕业设计

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Tauri v2 | 安装包小（< 10MB），内存低，跨平台（Win/Mac/Linux） |
| Vue 3 + TypeScript | AI 生成准确率高，组合式 API 适合防抖等逻辑封装 |
| Canvas 2D | 像素风格无需外部 SDK，性能好 |
| `AtomicBool` | 原子操作保证穿透状态无竞态 |
| `mpsc::bounded(128)` | 有界通道防止事件循环淹没 |
| `useDebounceFn`（vueuse）| 成熟防抖方案，减少磁盘 I/O |
| `tauri-plugin-store` | 官方存储插件，JSON 文件持久化 |
| `tauri-plugin-log` + `anyhow` | 结构化日志 + 错误传播 |

## Issues Encountered
（待填充）

## Resources
- Tauri v2 官方文档: https://v2.tauri.app/
- Vue 3 组合式 API: https://vuejs.org/guide/composition-api
- VueUse useDebounceFn: https://vueuse.org/shared/useDebounceFn/
- Canvas 2D API: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D
- 爱发电: https://afdian.com/
- Buy Me a Coffee: https://buymeacoffee.com/

## Visual/Browser Findings
提取自「桌面宠物项目计划书.docx」V8.0 FINAL：

### 核心设计理念
- **产品定位**：「你的桌面嘴替」— 一个会随着键盘敲击跳舞、弹出校园梗吐槽、一键隐藏的像素宠物
- **核心用户**：20 岁左右在校大学生，在宿舍/图书馆使用电脑
- **核心洞察**：用户不需要「功能」，需要「社交货币」；本地化梗文化是唯一护城河
- **项目代号**：桌面显眼包
- **最终评分**：9.2/10（架构优秀，微观陷阱已全部补全）

### 弹幕文案示例（20 条）
- 学习吐槽：「高数作业写完了吗就来摸鱼？」「这破论文谁爱写谁写」「复习？不存在的」
- 老师/导员：「别看了，辅导员在窗外」「老师说这节课点名」
- 宿舍生活：「周三下午查寝记得叠被子」「你室友都在卷，就你在看猫」
- 日常真实：「你又在刷抖音」
- 自嘲：「DDL 是第一生产力」

### 团队配置
- 产品/运营（1人）：弹幕采集、内测、推广
- Rust/Tauri 开发（1人）：后端、原子锁、通道、日志
- 前端/Vue 开发（1人）：UI、Canvas、防抖保存
- 美术（1人）：像素猫形象设计

### 预算
- 总计 ≈ ¥0（零成本启动）
