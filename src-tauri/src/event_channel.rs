//! 有界事件通道（容量 128）
//!
//! 键鼠事件必须通过此通道传递，防止事件循环淹没。
//! 前端所有键盘/鼠标事件都经过 `send_key_event` 命令进入此通道。
//!
//! 来源：项目计划书 4.3 陷阱三 — 有界事件通道

use std::sync::mpsc::{self, SyncSender, TrySendError};
use std::sync::Mutex;

/// 有界事件通道，包装 SyncSender 提供线程安全的 try_send
pub struct EventChannel {
    tx: Mutex<SyncSender<String>>,
}

impl EventChannel {
    /// 创建新通道，返回 (channel, receiver)
    /// receiver 应由消费线程持有
    pub fn new(capacity: usize) -> (Self, mpsc::Receiver<String>) {
        let (tx, rx) = mpsc::sync_channel(capacity);
        (Self { tx: Mutex::new(tx) }, rx)
    }

    /// 尝试发送事件。通道满时丢弃并返回 false
    pub fn try_send(&self, event: String) -> bool {
        match self.tx.lock().unwrap().try_send(event) {
            Ok(_) => true,
            Err(TrySendError::Full(_)) => {
                log::warn!("事件通道已满，丢弃事件");
                false
            }
            Err(TrySendError::Disconnected(_)) => false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_channel_accepts_events() {
        let (ch, rx) = EventChannel::new(128);
        assert!(ch.try_send("test".into()));
        // Drain
        assert!(rx.try_recv().is_ok());
    }

    #[test]
    fn test_channel_drops_when_full() {
        let (ch, _rx) = EventChannel::new(4);
        for i in 0..4 {
            assert!(ch.try_send(format!("fill_{}", i)));
        }
        // 第 5 条应被丢弃
        assert!(!ch.try_send("overflow".into()));
    }
}
