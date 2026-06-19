//! 速度感应器 + 动作指令枚举
//!
//! 记录点击时间戳，根据点击间隔判定动作指令。
//! 判决逻辑：
//! - 间隔 < 300ms → CrazyDance（狂舞）
//! - 间隔 300~800ms → ComboBreak（连击）
//! - 间隔 ≥ 800ms → JumpLight（轻跳）
//! - 首次点击 → JumpLight

use serde::{Deserialize, Serialize};
use std::sync::mpsc::SyncSender;

/// 宠物动作指令
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum PetCommand {
    JumpLight,
    ComboBreak,
    CrazyDance,
    Yawn,
    Talk,
}

/// 点击速度感应器
pub struct ClickSensor {
    history: Vec<std::time::Instant>,
    tx: SyncSender<PetCommand>,
    max_history: usize,
}

impl ClickSensor {
    pub fn new(tx: SyncSender<PetCommand>) -> Self {
        Self {
            history: Vec::with_capacity(5),
            tx,
            max_history: 5,
        }
    }

    /// 记录一次点击，根据间隔判决并发送 PetCommand
    pub fn record_click(&mut self) {
        let now = std::time::Instant::now();
        self.history.push(now);
        if self.history.len() > self.max_history {
            self.history.remove(0);
        }

        let cmd = if self.history.len() >= 2 {
            let last = self.history.last().unwrap();
            let prev = self.history[self.history.len() - 2];
            let interval = last.duration_since(prev);

            if interval < std::time::Duration::from_millis(300) {
                PetCommand::CrazyDance
            } else if interval < std::time::Duration::from_millis(800) {
                PetCommand::ComboBreak
            } else {
                PetCommand::JumpLight
            }
        } else {
            PetCommand::JumpLight
        };

        if let Err(e) = self.tx.try_send(cmd) {
            log::warn!("PetCommand 通道满，丢弃指令: {}", e);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::mpsc::sync_channel;
    use std::time::Duration;

    /// 验证速度感应判决逻辑
    #[test]
    fn test_click_interval_judgment() {
        let (tx, rx) = sync_channel::<PetCommand>(128);
        let mut sensor = ClickSensor::new(tx);

        // 首次点击 → JumpLight
        sensor.record_click();
        let cmd = rx.try_recv().unwrap();
        assert!(matches!(cmd, PetCommand::JumpLight));

        // 快速点击（<300ms）→ CrazyDance
        sensor.record_click();
        let cmd = rx.try_recv().unwrap();
        assert!(matches!(cmd, PetCommand::CrazyDance));
    }

    /// 高频点击压测：模拟 1000 次快速点击，验证不崩溃
    #[test]
    fn test_high_frequency_clicks() {
        let (tx, rx) = sync_channel::<PetCommand>(128);
        let mut sensor = ClickSensor::new(tx);
        let mut received = 0;

        // 模拟 1000 次快速点击
        for _ in 0..1000 {
            sensor.record_click();
            // Drain 所有可用消息
            while let Ok(_) = rx.try_recv() {
                received += 1;
            }
        }

        println!("高频压测：1000 次点击产生 {} 条指令", received);
        assert!(received > 0, "应产生至少 1 条指令");
        // 首次点击产生 JumpLight，之后每次点击产生 1 条，
        // 但由于通道满可能丢弃，至少应有部分指令送达
        assert!(received >= 990, "1000 次点击应产生约 999 条指令，实际 {received}");
    }

    /// 验证通道满时降级行为
    #[test]
    fn test_channel_full_degradation() {
        let (tx, rx) = sync_channel::<PetCommand>(4); // 小容量通道
        let mut sensor = ClickSensor::new(tx);

        // 填满通道（5 次点击 → 5 条命令，通道容量只有 4）
        for _ in 0..5 {
            sensor.record_click();
        }

        // 应收到 4 条，1 条丢弃
        let mut count = 0;
        while let Ok(_) = rx.try_recv() {
            count += 1;
        }
        assert_eq!(count, 4, "容量 4 的通道应存 4 条");
    }

    /// 模拟 V10 计划要求的 500 次/秒点击洪流
    #[test]
    fn test_500_per_second_burst() {
        let (tx, rx) = sync_channel::<PetCommand>(128);
        let mut sensor = ClickSensor::new(tx);
        // 模拟 500 次点击（模拟 1 秒 500 次）
        let start = std::time::Instant::now();
        for _ in 0..500 {
            sensor.record_click();
            // Drain 非阻塞
            while let Ok(_) = rx.try_recv() {}
        }
        let elapsed = start.elapsed();

        println!("500 次点击耗时: {:?}, 每次平均: {:?}", elapsed, elapsed / 500);
        // 主要验证不 panic，性能应 < 5ms
        assert!(elapsed < Duration::from_millis(100), "500 次点击应在 100ms 内完成");
    }
}
