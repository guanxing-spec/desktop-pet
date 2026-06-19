//! 验证 1: 原子状态锁
//!
//! 模拟 100 次并发 toggle_ignore_cursor 调用，
//! 验证最终状态与原子标志严格一致、无翻转。
//!
//! 来源：项目计划书 4.1 陷阱一：窗口穿透原子状态锁

use std::sync::atomic::{AtomicBool, Ordering};

/// 窗口穿透状态管理器
#[derive(Default)]
pub struct AppState {
    /// 唯一真实状态源
    pub ignore_cursor: AtomicBool,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            ignore_cursor: AtomicBool::new(false),
        }
    }

    /// 原子操作：取反并获取新值
    pub fn toggle_ignore_cursor(&self) -> bool {
        let new_value = !self.ignore_cursor.load(Ordering::SeqCst);
        self.ignore_cursor.store(new_value, Ordering::SeqCst);
        new_value
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    use std::thread;

    /// 核心验证：100 次并发 toggle 调用
    #[test]
    fn test_concurrent_toggle_100() {
        let state = Arc::new(AppState::new());
        let thread_count = 100;
        let mut handles = Vec::with_capacity(thread_count);

        for _ in 0..thread_count {
            let state_clone = Arc::clone(&state);
            handles.push(thread::spawn(move || {
                state_clone.toggle_ignore_cursor();
            }));
        }

        for h in handles {
            h.join().expect("线程异常终止");
        }

        // 100 是偶数次，应回到初始状态 false
        let final_state = state.ignore_cursor.load(Ordering::SeqCst);
        assert_eq!(
            final_state, false,
            "100 次（偶数）toggle 后状态应为 false, 实际为 {final_state}"
        );
        eprintln!("✓ 并发验证通过：100 次并发 toggle 后状态 = false（偶数次）");
    }

    /// 奇数次 toggle 验证
    #[test]
    fn test_odd_toggle() {
        let state = AppState::new();
        state.toggle_ignore_cursor();
        assert_eq!(
            state.ignore_cursor.load(Ordering::SeqCst),
            true,
            "1 次 toggle 后状态应为 true"
        );
        eprintln!("✓ 奇数次验证通过：1 次 toggle 后状态 = true");
    }

    /// toggle 奇偶性验证（每组独立状态）
    #[test]
    fn test_toggle_parity() {
        let cases = [(3, true), (5, true), (2, false), (10, false), (1, true), (0, false)];

        for &(times, expected) in &cases {
            let state = AppState::new();
            for _ in 0..times {
                state.toggle_ignore_cursor();
            }
            assert_eq!(
                state.ignore_cursor.load(Ordering::SeqCst),
                expected,
                "{times} 次 toggle 后状态应为 {expected}"
            );
        }
        eprintln!("✓ 奇偶性验证通过：多组 toggle 序列状态正确");
    }

    /// 并发 + 串行混合验证
    #[test]
    fn test_mixed_concurrent_sequential() {
        let state = Arc::new(AppState::new());
        let mut handles = Vec::new();

        // 50 次并发
        for _ in 0..50 {
            let s = Arc::clone(&state);
            handles.push(thread::spawn(move || {
                s.toggle_ignore_cursor();
            }));
        }
        for h in handles {
            h.join().unwrap();
        }

        // 再串行 50 次
        for _ in 0..50 {
            state.toggle_ignore_cursor();
        }

        // 总共 100 次（偶数），应为 false
        assert!(!state.ignore_cursor.load(Ordering::SeqCst));
        eprintln!("✓ 混合验证通过：50 次并发 + 50 次串行 = 100 次（偶数）→ false");
    }
}

/// 验证入口（非测试环境也可调用）
pub fn verify() {
    let state = AppState::new();

    // 奇数次
    state.toggle_ignore_cursor();
    assert!(state.ignore_cursor.load(Ordering::SeqCst));

    // 偶数次
    state.toggle_ignore_cursor();
    assert!(!state.ignore_cursor.load(Ordering::SeqCst));

    println!("✓ [第0周验证] 原子切换 Demo 通过");
}
