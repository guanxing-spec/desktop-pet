//! 老板键
//!
//! Ctrl+Shift+H 全局隐藏/显示窗口。
//! 隐藏时同步通知前端停止 Canvas 渲染，显示时恢复。

use std::sync::atomic::{AtomicBool, Ordering};

/// 老板键状态
#[derive(Default)]
pub struct BossKeyState {
    pub window_visible: AtomicBool,
}

impl BossKeyState {
    pub fn new() -> Self {
        Self {
            window_visible: AtomicBool::new(true),
        }
    }

    pub fn toggle(&self) -> bool {
        let new = !self.window_visible.load(Ordering::SeqCst);
        self.window_visible.store(new, Ordering::SeqCst);
        new
    }
}
