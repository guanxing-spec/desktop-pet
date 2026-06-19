# Progress Log — 桌面显眼包

## Session: 2026-06-18（项目启动）

### Phase 1: 第 0 周技术验证
- **Status:** ✅ complete
- **Started:** 2026-06-18
- **Completed:** 2026-06-18
- 读取并分析了「桌面宠物项目计划书.docx」V8.0 FINAL（25216 字节）
- 创建了以下规划文件至 `小桌宠/` 目录，与工作区其他项目隔离：
  - task_plan.md（分 7 个阶段的完整实施计划）
  - findings.md（技术决策、架构约束、资源清单）
  - progress.md（本文件，进度日志）
- 项目文件夹结构：`e:/VS_code_project/小桌宠/`
- 项目核心理解：
  - Tauri v2 + Vue 3 + TypeScript 技术栈
  - 3 项第 0 周验证是硬性门禁（原子锁、防抖、通道）
  - 启动顺序严格不可逆
- **第 0 周验证三项全部通过：**
  - ✅ **验证 1（原子锁）**：7 项 Rust 子测试全部通过，含 100 次并发 toggle、奇偶性验证、混合并发串行
  - ✅ **验证 2（防抖 Hooks）**：3 项 TypeScript 子测试全部通过，含 500ms 防抖间隔验证
  - ✅ **验证 3（有界通道）**：4 项 Rust 子测试全部通过，含 1000 事件洪流压测、满时丢弃行为、背压感知
- 技术决策：
  - 验证代码独立为 `e:/VS_code_project/desktop-pet-verify/` crate（中文路径导致 linker 问题）
  - Tauri 项目使用 MSVC 工具链构建（需安装 dlltool 或 VS Build Tools）
  - 前端测试使用 vitest + jsdom + @vueuse/core
- Files created/modified:
  - task_plan.md（created）
  - findings.md（created）
  - progress.md（created）
  - `desktop-pet/` — Tauri v2 + Vue3 + TS 项目骨架（created）
  - `desktop-pet/src/composables/useDebouncedSave.ts`（created）
  - `desktop-pet/src/__tests__/useDebouncedSave.test.ts（created）
  - `desktop-pet/src-tauri/src/verifications/` — Rust 验证模块（created）
  - `desktop-pet-verify/` — 独立验证 crate（created）

### Phase 2: 环境搭建 + 弹幕采集（第 1 周）
- **Status:** ✅ complete
- **Started:** 2026-06-18
- **Completed:** 2026-06-18
- 完成内容：
  - ✅ 项目初始化（Tauri v2 + Vue 3 + TypeScript + Vite）
  - ✅ `tauri-plugin-log` + `tauri-plugin-store` 集成
  - ✅ CI 配置（`.github/workflows/ci.yml`）：clippy 强制 `deny(unsafe_code)` + Rust 测试 + Vitest 测试 + TypeScript 检查
  - ✅ Rust 代码已添加 `#![deny(unsafe_code)]` — clippy 零问题通过
  - ✅ 弹幕文案库（`src/barrage/barrage.ts`）：22 条校园梗，5 个分类，带随机抽取函数
  - ✅ 构建环境：MSYS2 + mingw-w64 已配置，`cargo clippy` / `cargo check` 通过
- 路径清理：`小桌宠/`、`desktop-pet-target/`、`desktop-pet-verify/` 已删除，全部合并至 `desktop-pet/`
- Files created/modified:
  - `.github/workflows/ci.yml`（created）
  - `src/barrage/barrage.ts`（created）
  - `src/barrage/index.ts`（created）
  - `.cargo/config.toml`（created）— mingw64 工具链路径
  - `src-tauri/src/lib.rs`（modified）— 添加 `#![deny(unsafe_code)]`
  - `src-tauri/src/verifications/atomic_lock.rs`（modified）— clippy 修复
  - `src-tauri/src/verifications/channel_stress.rs`（modified）— clippy 修复
  - 删除 `小桌宠/`、`desktop-pet-target/`、`desktop-pet-verify/`

### Phase 3: 透明窗口 + Canvas 渲染（第 2-3 周）
- **Status:** ✅ complete
- **Started:** 2026-06-18
- **Completed:** 2026-06-18
- 完成内容：
  - ✅ Tauri 透明窗口配置：无边框、透明背景、置顶、居中、300×340 窗口
  - ✅ Canvas 2D 像素宠物渲染引擎（`usePetRenderer.ts`）
  - ✅ 豆豆眼贱兮兮像素猫绘制：圆头、三角耳、豆豆眼、歪嘴 smirk、胡须、腮红、身体、爪子、尾巴
  - ✅ 动画循环框架：requestAnimationFrame idle 浮动 + 定时眨眼（每 4 秒）
  - ✅ 窗口拖动功能：Pointer Events + 5px 拖拽阈值 + `getCurrentWindow().startDragging()`
  - ✅ 透明度样式：body 透明、user-select: none、touch-action: none
  - ✅ 清理旧模板文件（HelloWorld.vue）
- 构建验证：
  - ✅ `vue-tsc -b`：零 TypeScript 错误
  - ✅ `vite build`：生产构建通过（23 modules, 78KB JS）
  - ✅ `vitest run`：3/3 测试通过
  - ✅ `cargo clippy -D unsafe-code -D warnings`：零错误
  - ✅ `cargo check`：clean build 通过
- Files created/modified:
  - `src/composables/usePetRenderer.ts`（created）— Canvas 像素猫渲染引擎
  - `src/components/PetCanvas.vue`（created）— Canvas 组件 + 拖拽
  - `src/App.vue`（modified）— 替换为 PetCanvas
  - `src/style.css`（modified）— 透明背景、移除默认样式
  - `src-tauri/tauri.conf.json`（modified）— 透明窗口配置
  - `src/components/HelloWorld.vue`（deleted）
  - `.cargo/config.toml`（modified）— 添加 WINDRES/CC 环境变量
  - `vite.config.ts`（modified）— 修复 vitest 类型导入

### Phase 4: 核心开发 — 键鼠感知 + 弹幕调度器（第 4-6 周）
- **Status:** ✅ complete
- **Started:** 2026-06-18
- **Completed:** 2026-06-18
- 完成内容：
  - ✅ 键盘事件监听：全局 `document.keydown` → 触发跳舞动画
  - ✅ 鼠标点击交互：canvas `pointerdown` → 触发跳舞动画
  - ✅ 跳舞动画：跳跃 + 倾斜 + 缩放弹性动画（500ms 时长，正弦缓动）
  - ✅ 弹幕渲染：Canvas 字体绘制，黑色描边 + 白色填充，从右向左滚动
  - ✅ 弹幕调度器：敲键盘 50% 概率触发 + 5 秒冷却 + 3 条轨道防重叠
  - ✅ 弹幕自动清理：移出屏幕后自动清除
  - ✅ 点击 vs 拖拽判定：5px 阈值分离（保留到 Phase 5 精细调整）
- 构建验证：
  - ✅ `vue-tsc -b`：零 TypeScript 错误
  - ✅ `vite build`：生产构建通过（24 modules, 81KB JS）
  - ✅ `vitest run`：3/3 测试通过
  - ✅ `cargo clippy -D unsafe-code -D warnings`：零错误
- Files created/modified:
  - `src/composables/usePetRenderer.ts`（modified）— 添加跳舞动画 + 弹幕渲染
  - `src/components/PetCanvas.vue`（modified）— 添加键盘事件 + 弹幕调度

### Phase 5: 交互开发 — 穿透 + 防抖保存 + 老板键（第 7-8 周）
- **Status:** ✅ complete
- **Started:** 2026-06-18
- **Completed:** 2026-06-19
- 完成内容：
  - ✅ Rust 后端：`piercing.rs` — `AtomicBool` 原子状态锁，`toggle()` / `is_enabled()`
  - ✅ Rust 后端：`boss_key.rs` — `AtomicBool` 窗口可见性状态，`toggle()` 方法
  - ✅ Rust 后端：`lib.rs` — `toggle_piercing` / `get_piercing_state` / `send_key_event` 命令注册
  - ✅ Rust 后端：`lib.rs` — 老板键 Ctrl+Shift+H 全局快捷键注册 + `show()`/`hide()` 窗口控制
  - ✅ Rust 后端：`lib.rs` — 老板键 `emit("boss-key-event", visible)` 前端事件通知
  - ✅ 窗口穿透模式：双击 Canvas 切换（300ms 双击检测），前端 `setPiercingEnabled()` 同步状态
  - ✅ 穿透视觉提示：半透明红色边框 + "穿透模式" 文字左上角指示
  - ✅ 窗口位置持久化：`useDebouncedSave` 集成 `tauri-plugin-store`，2s 间隔轮询 + 500ms 防抖保存
  - ✅ 启动时恢复窗口位置：`loadPosition()` 从 Store 读取并调用 `setPosition()`
  - ✅ 启动时恢复穿透状态：`invoke('get_piercing_state')` → `setPiercingEnabled()`
  - ✅ 点击 vs 拖动判定：150ms 时间阈值 + 5px 距离阈值双重判定
  - ✅ 双击穿透不触发跳舞（消除双击抖动体验）
  - ✅ 老板键隐藏时 `stop()` 终止 Canvas 渲染循环，显示时 `start()` 恢复
- 构建验证：
  - ✅ `vue-tsc --noEmit`：零 TypeScript 错误
  - ✅ `vite build`：生产构建通过（28 modules, 84KB JS）
  - ✅ `cargo clippy -D warnings`：零警告零错误
  - ✅ `cargo test --lib`：9/9 测试通过
- Files created/modified:
  - `src-tauri/src/piercing.rs`（created）
  - `src-tauri/src/boss_key.rs`（created）
  - `src-tauri/src/event_channel.rs`（created）
  - `src-tauri/src/lib.rs`（modified）— 注册命令 + 插件 + 快捷键
  - `src/composables/usePetRenderer.ts`（modified）— 添加 `_piercingEnabled` + `drawPiercingOverlay()`
  - `src/composables/useDebouncedSave.ts`（modified）— 集成 `tauri-plugin-store` + 真实坐标保存
  - `src/components/PetCanvas.vue`（modified）— 双击、点击阈值、老板键监听、位置轮询

### Phase 6: 稳定性 + 内测（第 8-9 周）
- **Status:** ✅ complete (partial: 内测待执行)
- **Started:** 2026-06-19
- **Completed:** 2026-06-19
- 完成内容：
  - ✅ 全局异常捕获：`app.config.errorHandler` + `console.error` 统一记录
  - ✅ 崩溃兜底：`onErrorCaptured` + 宠物表情错误页面 + 重试按钮
  - ✅ Rust panic hook：`std::panic::set_hook` + `log::error!` 记录崩溃信息
  - ✅ 日志系统：`tauri-plugin-log` 始终启用（release 下 `LevelFilter::Warn`）
  - ✅ 事件通道溢出保护 + `log::warn!` 日志（Phase 1 已完成）
  - ✅ 交互计数器：`useInteractionCounter` 按日记录点击/按键次数
  - ✅ 交互数据持久化：每天独立 key 保存至 `interactions.json`
  - [ ] 邀请 20 人内测（需用户执行）
  - [ ] 监控日均点击 < 5 次停更（需用户评估数据）
- 构建验证：
  - ✅ `vue-tsc --noEmit`：零 TypeScript 错误
  - ✅ `vite build`：生产构建通过（30 modules, 86KB JS）
  - ✅ `cargo clippy -D warnings`：零警告零错误
  - ✅ `cargo test --lib`：9/9 测试通过
- Files created/modified:
  - `src/main.ts`（modified）— 添加全局错误处理器
  - `src/App.vue`（modified）— 添加崩溃兜底 UI + 重试按钮
  - `src/composables/useInteractionCounter.ts`（created）— 交互计数器
  - `src/components/PetCanvas.vue`（modified）— 接入交互计数器
  - `src-tauri/src/lib.rs`（modified）— panic hook + 始终启用日志

### Phase 7: 发布（第 10-12 周）
- **Status:** ✅ complete (partial: 打赏链接需填写真实页面 URL)
- **Started:** 2026-06-19
- **Completed:** 2026-06-19
- 完成内容：
  - ✅ 发布配置：`tauri.conf.json` bundle 配置 + NSIS Windows 安装器设置
  - ✅ 打赏通道：`DonateOverlay.vue` — 爱发电 + Buy Me a Coffee 链接面板
  - ✅ 打赏快捷键：Ctrl+Shift+D 打开/关闭打赏面板
  - ✅ 弹幕投稿：`BarrageInput.vue` — 输入框 + 发送按钮
  - ✅ 投稿快捷键：Ctrl+Shift+B 打开/关闭投稿输入框
  - ✅ 自定义弹幕持久化：`useCustomBarrages` → `custom_barrages.json`
  - ✅ 自定义弹幕与内置弹幕混合随机展示（`getRandomBarrage(customs)`）
  - ✅ 应用标识：`identifier` → `com.desktop-pet.app`
  - [ ] 分发：校园墙 + 宿舍群（需用户执行）
  - [ ] 打赏页 URL：需要替换为真实的爱发电 / Buy Me a Coffee 页面地址
- 构建验证：
  - ✅ `vue-tsc --noEmit`：零 TypeScript 错误
  - ✅ `vite build`：生产构建通过（37 modules, 91KB JS）
  - ✅ `cargo clippy -D warnings`：零警告零错误
  - ✅ `cargo test --lib`：9/9 测试通过
- Files created/modified:
  - `src/components/DonateOverlay.vue`（created）— 打赏面板
  - `src/components/BarrageInput.vue`（created）— 弹幕投稿输入
  - `src/composables/useCustomBarrages.ts`（created）— 自定义弹幕持久化
  - `src/barrage/barrage.ts`（modified）— 新增 `custom` 分类、支持自定义弹幕混合
  - `src/components/PetCanvas.vue`（modified）— 键盘快捷键、覆盖层组件
  - `src-tauri/tauri.conf.json`（modified）— bundle 配置 + NSIS + identifier

## Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| 原子锁：100 次并发 toggle | 100 线程并发调用 | 最终状态 false | false | ✅ |
| 原子锁：奇偶性验证 | 多组 toggle 次数 | 奇 true / 偶 false | 全部匹配 | ✅ |
| 原子锁：混合并发串行 | 50 并发 + 50 串行 | 偶数次 false | false | ✅ |
| 防抖：500ms 内密集调用 | 5 次 10ms 间隔 | 1 次保存 | 1 次 | ✅ |
| 防抖：间隔操作 | 两次 600ms 间隔 | 2 次保存 | 2 次 | ✅ |
| 防抖：首次等待 | 调用后 400ms/500ms | 400ms 未触发, 500ms 触发 | 符合预期 | ✅ |
| 通道：1000 事件洪流 | 1000 条事件 | 最多收 128 条，其余丢弃 | 128/1000 | ✅ |
| 通道：满时丢弃 | 填满后多发 | TrySendError::Full | ✅ | ✅ |
| 通道：背压感知 | 消费后恢复 | 满时 err，消费后 ok | ✅ | ✅ |
| clippy | `-D unsafe-code -D warnings` | 零错误 | 0 errors | ✅ |

## Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-06-18 | dlltool.exe not found | 1 | 安装 MSYS2 + mingw-w64 |
| 2026-06-18 | 中文路径导致 linker/windres 崩溃 | 3 | 代码移出中文路径 -> desktop-pet/ |
| 2026-06-18 | clippy: empty_line_after_doc_comments | 1 | 改为 `//!` inner doc comment |
| 2026-06-18 | clippy: new_without_default | 1 | 添加 `#[derive(Default)]` |
| 2026-06-18 | vue-tsc: canvasRef unused (used in template only) | 1 | `void canvasRef` 抑制 |
| 2026-06-18 | windres/dlltool not found (embed-resource v3 直接调用 PATH) | 3 | 首次 clean build 需 MSYS2 在 PATH，增量 build 无需 |

## 5-Question Reboot Check
| Question | Answer |
|----------|--------|
| Where am I? | Phase 7 complete — 所有 7 个阶段完成 |
| Where am I going? | 分发 + 用户打赏链接配置 + 观察交互数据 |
| What's the goal? | 构建 Tauri v2 桌面像素宠物，12 周内完成开发并发布 |
| What have I learned? | 见 findings.md |
| What have I done? | Phase 1~7 全部完成：验证 → 环境/弹幕 → 透明窗口 → 键鼠动画/弹幕 → 穿透/防抖/老板键 → 稳定性加固 → 发布准备 |

## Session: 2026-06-19（V10 计划分析 + 性能压测）

### 分析 V10.0 FINAL 计划书
- **Status:** ✅ complete
- 读取并分析了「桌面宠物项目计划书（第三版）.docx」V10.0 FINAL
- 对比项目当前状态与 V10 计划的 Day 1~10

### 当前完成度
- V10 Day 1~8：全部完成
- 超出 V10：Boss 键、系统托盘、穿透/移动模式、动漫少女重绘、捐赠面板、弹幕投稿
- **待完成：** Phase A 性能压测 + Phase B 发布构建

### Phase A：V12 计划分析
- **Status:** ✅ complete
- V12.0 计划做了重大架构变更：从 Canvas 程序化绘制 → 9 层 PNG 纸娃娃骨骼系统
- 已完成的 V10 基础设施仍然适用（防御、通道、ClickSensor、闲时等）
- 渲染引擎需要重构为骨骼树 + Pose 关键帧插值
- 任务计划已更新为 V12 对齐版本

## Session: 2026-06-19 — Live2D 集成完成

### Live2D 渲染 + 双 Canvas 架构
- **Status:** ✅ complete
- **Completed:** 2026-06-19
- 架构从 Canvas 2D 单层 → PixiJS WebGL + 2D Canvas 双 Canvas 架构
- 创建 `useLive2DRenderer.ts`：Cubism 4 加载、PixiJS Application、模型缩放居中、动作播放、鼠标追踪
- 重写 `usePetRenderer.ts`：剥离所有宠物绘制代码（~470 行），保留 FSM + 弹幕 + 闲时系统 + 回调桥
- 重写 `PetCanvas.vue`：双 Canvas 模板、`ACTION_TO_MOTION` 映射、回调桥接
- 修复 `setParameterValueById` 类型错误：pixi-live2d-display 类型定义混合模式导致 TS 无法解析，使用类型断言解决
- 模型：Hiyori（Cubism 4, denpaya/Live2Dv4-Web-Demo），9 个 Idle 动作 + 1 个 TapBody 动作
- `npm run build`：vue-tsc + vite 生产构建通过
- `npx tauri dev`：Vite dev server + Rust 编译通过（392/393）
- Files modified:
  - `src/composables/useLive2DRenderer.ts`（created）
  - `src/composables/usePetRenderer.ts`（rewritten — 剥离绘制逻辑）
  - `src/components/PetCanvas.vue`（rewritten — 双 Canvas + Live2D 桥）
  - `public/assets/live2d/Hiyori/`（created — Live2D 模型文件）
