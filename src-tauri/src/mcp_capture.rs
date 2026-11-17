//! Bounded request/reply to the actual editor renderer, pinned to native identity.
use crate::project::{AppError, Session};
use base64::Engine;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::{
    atomic::{AtomicU64, Ordering},
    mpsc, Mutex,
};
use tauri::{Emitter, Manager};

type Reply = Result<Value, AppError>;
struct Pending {
    id: u64,
    sender: mpsc::Sender<Reply>,
}
#[derive(Default)]
pub struct CaptureState {
    pending: Mutex<Option<Pending>>,
    sequence: AtomicU64,
}
fn invalid(message: &str) -> AppError {
    AppError::new("ViewportCapture", message)
}
#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Request {
    expected_revision: u64,
    document_id: u64,
}
pub fn cancel(app: &tauri::AppHandle) {
    if let Ok(mut slot) = app.state::<CaptureState>().pending.lock() {
        if let Some(pending) = slot.take() {
            let _ = pending
                .sender
                .send(Err(invalid("MCP capture was cancelled.")));
        }
    }
}
pub fn capture(app: &tauri::AppHandle, args: Value) -> Reply {
    let request: Request = serde_json::from_value(args)
        .map_err(|_| invalid("expectedRevision and documentId are required."))?;
    let check = || -> Result<(), AppError> {
        let (summary, revision) = app.state::<Session>().summary_with_revision()?;
        if revision != request.expected_revision
            || summary.as_ref().map(|s| s.document_id) != Some(request.document_id)
        {
            return Err(AppError::new(
                "ProjectChanged",
                "Reread the project before capturing the viewport.",
            ));
        }
        Ok(())
    };
    check()?;
    let state = app.state::<CaptureState>();
    let id = state.sequence.fetch_add(1, Ordering::SeqCst) + 1;
    let (sender, receiver) = mpsc::channel();
    {
        let mut slot = state
            .pending
            .lock()
            .map_err(|_| invalid("Capture lock failed."))?;
        if slot.is_some() {
            return Err(invalid("Another capture is pending."));
        }
        *slot = Some(Pending { id, sender });
    }
    let emit = app.emit("mcp-capture-viewport", json!({"requestId":id,"expectedRevision":request.expected_revision,"documentId":request.document_id}));
    let result = if emit.is_ok() {
        receiver
            .recv_timeout(std::time::Duration::from_secs(8))
            .unwrap_or_else(|_| Err(invalid("The editor renderer did not complete the capture.")))
    } else {
        Err(invalid("Could not request the editor renderer."))
    };
    if let Ok(mut slot) = state.pending.lock() {
        if slot.as_ref().is_some_and(|p| p.id == id) {
            slot.take();
        }
    }
    let data = result?;
    check()?;
    Ok(data)
}
#[tauri::command]
pub fn mcp_capture_reply(
    state: tauri::State<'_, CaptureState>,
    request_id: u64,
    result: Option<Value>,
    error: Option<String>,
) -> Result<(), AppError> {
    let mut slot = state
        .pending
        .lock()
        .map_err(|_| invalid("Capture lock failed."))?;
    if slot.as_ref().is_none_or(|p| p.id != request_id) {
        return Err(invalid("The capture request has expired."));
    }
    let pending = slot.take().unwrap();
    let reply = if error.is_some() {
        Err(invalid(
            "The viewport could not be captured; finish loading resources and retry.",
        ))
    } else {
        result
            .ok_or_else(|| invalid("Missing capture result."))
            .and_then(validate)
    };
    let _ = pending.sender.send(reply);
    Ok(())
}
fn validate(mut data: Value) -> Reply {
    let raw = data["dataUrl"]
        .as_str()
        .and_then(|s| s.strip_prefix("data:image/png;base64,"))
        .ok_or_else(|| invalid("Expected a PNG capture."))?;
    if raw.len() > 12 * 1024 * 1024 {
        return Err(invalid("Capture exceeds the PNG budget."));
    }
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(raw)
        .map_err(|_| invalid("Invalid capture encoding."))?;
    let image = crate::images::ImageAsset::from_bytes(bytes)?;
    if image.width > 2048 || image.height > 2048 {
        return Err(invalid("Capture dimensions exceed 2048 pixels."));
    }
    data["width"] = json!(image.width);
    data["height"] = json!(image.height);
    Ok(data)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn capture_rejects_forged_or_oversized_image_and_accepts_valid_png() {
        assert!(validate(json!({"dataUrl":"data:image/png;base64,eA=="})).is_err());
        assert!(validate(json!({"dataUrl":"https://example.com/private"})).is_err());
        let mut bytes = Vec::new();
        {
            let mut encoder = png::Encoder::new(&mut bytes, 2, 1);
            encoder.set_color(png::ColorType::Rgba);
            let mut writer = encoder.write_header().unwrap();
            writer
                .write_image_data(&[255, 0, 0, 255, 0, 0, 255, 255])
                .unwrap();
        }
        let url = format!(
            "data:image/png;base64,{}",
            base64::engine::general_purpose::STANDARD.encode(bytes)
        );
        let value = validate(json!({"dataUrl":url})).unwrap();
        assert_eq!(value["width"], 2);
        assert_eq!(value["height"], 1);
    }
}
