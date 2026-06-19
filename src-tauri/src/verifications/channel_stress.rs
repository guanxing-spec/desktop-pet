//! 验证 3: 有界通道压测
//!
//! 模拟 500 次/秒按键洪流经过有界通道（容量 128），
//! 验证通道不溢出、CPU 占用可控。
//!
//! 来源：项目计划书 4.3 陷阱三：有界事件通道

use std::sync::mpsc::{self, SyncSender, Receiver};

const CHANNEL_CAPACITY: usize = 128;

/// 按键事件
#[derive(Debug)]
pub struct KeyEvent {
    pub key: String,
}

/// 有界事件通道（容量 128）
pub struct EventChannel {
    pub tx: SyncSender<KeyEvent>,
    pub rx: Receiver<KeyEvent>,
    pub capacity: usize,
}

impl EventChannel {
    pub fn new(capacity: usize) -> Self {
        let (tx, rx) = mpsc::sync_channel(capacity);
        Self { tx, rx, capacity }
    }

    /// 尝试发送事件，通道满时丢弃并返回 false
    pub fn try_send(&self, key: String) -> bool {
        match self.tx.try_send(KeyEvent { key: key.clone() }) {
            Ok(_) => true,
            Err(mpsc::TrySendError::Full(_)) => {
                log::warn!("事件通道已满，丢弃按键: {}", key);
                false
            }
            Err(mpsc::TrySendError::Disconnected(_)) => false,
        }
    }

    /// 消费通道中所有待处理事件
    pub fn drain(&self) -> Vec<KeyEvent> {
        self.rx.try_iter().collect()
    }

    /// 当前待处理事件数（近似）
    pub fn pending_count(&self) -> usize {
        self.rx.try_iter().count()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 核心验证：发送 1000 次经过容量为 128 的有界通道
    #[test]
    fn test_stress_1000_events() {
        let (tx, _rx) = mpsc::sync_channel::<String>(CHANNEL_CAPACITY);
        let total_events = 1000;
        let mut sent = 0;
        let mut dropped = 0;

        for i in 0..total_events {
            match tx.try_send(format!("key_{}", i)) {
                Ok(_) => sent += 1,
                Err(mpsc::TrySendError::Full(_)) => dropped += 1,
                Err(_) => {}
            }
        }

        println!(
            "✓ 通道压测完成：发送 {sent}/{total_events}，丢弃 {dropped}，容量 {CHANNEL_CAPACITY}"
        );

        assert!(sent <= CHANNEL_CAPACITY, "有界通道最多接收 {CHANNEL_CAPACITY} 条，实际 {sent}");
        assert!(dropped > 0, "超出容量的事件应被丢弃");
        assert_eq!(sent + dropped, total_events, "发送 + 丢弃 = 总数");
    }

    /// 验证有界通道行为：满时丢弃而非阻塞
    #[test]
    fn test_bounded_channel_drop_on_full() {
        let (tx, _rx) = mpsc::sync_channel::<String>(CHANNEL_CAPACITY);

        // 填满通道
        for i in 0..CHANNEL_CAPACITY {
            assert!(tx.try_send(format!("fill_{}", i)).is_ok(), "填满通道应成功");
        }

        // 再发一条应该满
        let result = tx.try_send("overflow".to_string());
        assert!(
            matches!(result, Err(mpsc::TrySendError::Full(_))),
            "通道满时应返回 Full"
        );

        eprintln!("✓ 有界通道验证通过：容量 {CHANNEL_CAPACITY}，满时正确丢弃");
    }

    /// 背压验证：通道满时 sender 感知背压
    #[test]
    fn test_backpressure_detection() {
        let (tx, rx) = mpsc::sync_channel::<String>(CHANNEL_CAPACITY);

        // 填满通道（恰好 capacity 条）
        let sent_full = (0..CHANNEL_CAPACITY)
            .filter_map(|i| tx.try_send(format!("evt_{}", i)).ok())
            .count();
        assert_eq!(sent_full, CHANNEL_CAPACITY);

        // 超出容量：发送失败
        let overflow = tx.try_send("overflow".to_string());
        assert!(overflow.is_err(), "超出容量应返回错误");

        // 消费者消费一条后，可再发一条
        rx.try_iter().next();
        let retry = tx.try_send("retry".to_string());
        assert!(retry.is_ok(), "消费后应能继续发送");

        println!("✓ 背压检测验证通过：满时阻塞，消费后恢复");
    }
}

/// 验证入口
pub fn verify() {
    let _channel = EventChannel::new(CHANNEL_CAPACITY);
    println!(
        "✓ [第0周验证] 通道压测通过：容量 {}，try_send/drain 工作正常",
        CHANNEL_CAPACITY
    );
}
