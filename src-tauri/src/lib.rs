#![deny(unsafe_code)]

pub mod boss_key;
pub mod click_sensor;
pub mod event_channel;
pub mod verifications;

use std::sync::Mutex;
use std::sync::mpsc;
use tauri::{Emitter, Manager};
use tauri::tray::TrayIconBuilder;
use boss_key::BossKeyState;
use click_sensor::{ClickSensor, PetCommand};
use event_channel::EventChannel;
use tauri_plugin_global_shortcut::GlobalShortcutExt;

/// 前端键盘事件发送到此命令，经过有界通道（容量 128）处理
#[tauri::command]
fn send_key_event(state: tauri::State<'_, EventChannel>, key: String) -> bool {
    state.try_send(key)
}

#[tauri::command]
fn exit_app(app: tauri::AppHandle) {
    app.exit(0);
}

/// 记录点击事件，触发 ClickSensor 判决
#[tauri::command]
fn record_click(sensor: tauri::State<'_, Mutex<ClickSensor>>) {
    let mut sensor = sensor.lock().unwrap();
    sensor.record_click();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    std::panic::set_hook(Box::new(|panic_info| {
        let msg = panic_info
            .payload()
            .downcast_ref::<&str>()
            .map(|s| s.to_string())
            .or_else(|| panic_info.payload().downcast_ref::<String>().cloned())
            .unwrap_or_else(|| "Unknown panic".to_string());
        let location = panic_info
            .location()
            .map(|l| l.to_string())
            .unwrap_or_else(|| "unknown".to_string());
        log::error!("[桌面显眼包] PANIC: {} at {}", msg, location);
    }));

    // 键盘事件通道（容量 128）
    let (channel, rx) = EventChannel::new(128);
    std::thread::spawn(move || {
        for key in rx {
            log::info!("事件通道消费: key={}", key);
        }
    });

    // PetCommand 通道（第二阶段速度感应）
    let (pet_tx, pet_rx) = mpsc::sync_channel::<PetCommand>(128);

    tauri::Builder::default()
        .manage(channel)
        .manage(BossKeyState::new())
        .manage(Mutex::new(ClickSensor::new(pet_tx)))
        .invoke_handler(tauri::generate_handler![
            send_key_event,
            exit_app,
            record_click,
        ])
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
            }
        }))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        let state = app.state::<BossKeyState>();
                        let visible = state.toggle();
                        if let Some(window) = app.get_webview_window("main") {
                            if visible {
                                let _ = window.show();
                            } else {
                                let _ = window.hide();
                            }
                            let _ = window.emit("boss-key-event", visible);
                        }
                    }
                })
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            app.handle().plugin(
                tauri_plugin_log::Builder::new()
                    .level(log::LevelFilter::Debug)
                    .build(),
            )?;

            // PetCommand 消费线程：阻塞读取通道，向前端 emit
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                for cmd in pet_rx {
                    log::debug!("PetCommand 消费: {:?}", cmd);
                    if let Err(e) = app_handle.emit("pet-command", &cmd) {
                        log::error!("PetCommand emit 失败: {}", e);
                    }
                }
            });

            app.global_shortcut().register("Ctrl+Shift+H")?;
            TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("桌面显眼包")
                .show_menu_on_left_click(true)
                .build(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
