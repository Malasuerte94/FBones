//! Optional authenticated loopback MCP transport over the visible editor Session.
//! No test host, alternate model, shell execution or remote binding.
use crate::project::{self, AppError, Session};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    io::{Read, Write},
    net::{TcpListener, TcpStream},
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    time::{Duration, Instant},
};
use tauri::{Emitter, Manager};

const MAX_BODY: usize = 8 * 1024 * 1024;
#[derive(Clone, Default, Serialize)]
pub struct Status {
    enabled: bool,
    url: String,
    token: String,
}
struct Server {
    status: Status,
    stop: Arc<AtomicBool>,
    execution: Arc<Mutex<()>>,
    worker: std::thread::JoinHandle<()>,
}
#[derive(Default)]
pub struct McpState {
    server: Mutex<Option<Server>>,
    ready: AtomicBool,
}
fn invalid(message: impl Into<String>) -> AppError {
    AppError::new("McpInvalidArguments", message)
}
// Credentials are local application settings, never project data or autostart.
#[derive(Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
struct ConnectionConfig {
    version: u8,
    port: u16,
    token: String,
}
impl ConnectionConfig {
    fn status(&self, enabled: bool) -> Status {
        Status {
            enabled,
            url: format!("http://127.0.0.1:{}/mcp", self.port),
            token: self.token.clone(),
        }
    }
}
fn config_error(message: &str) -> AppError {
    AppError::new("McpConfiguration", message)
}
fn config_path(app: &tauri::AppHandle) -> Result<PathBuf, AppError> {
    app.path()
        .app_config_dir()
        .map(|path| path.join("mcp-connection.json"))
        .map_err(|_| config_error("The application settings directory is unavailable."))
}
fn read_configuration(path: &Path) -> Result<Option<ConnectionConfig>, AppError> {
    let metadata = match std::fs::symlink_metadata(path) {
        Ok(value) => value,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(_) => return Err(config_error("Cannot read the saved MCP configuration.")),
    };
    if !metadata.is_file() || metadata.file_type().is_symlink() || metadata.len() > 4096 {
        return Err(config_error(
            "The saved MCP configuration is invalid. Reset it while stopped.",
        ));
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if metadata.permissions().mode() & 0o077 != 0 {
            return Err(config_error(
                "MCP credentials must be owner-only. Reset the configuration while stopped.",
            ));
        }
    }
    let file = std::fs::File::open(path)
        .map_err(|_| config_error("Cannot open the saved MCP configuration."))?;
    let mut bytes = Vec::new();
    file.take(4097)
        .read_to_end(&mut bytes)
        .map_err(|_| config_error("Cannot read the saved MCP configuration."))?;
    if bytes.len() > 4096 {
        return Err(config_error(
            "The saved MCP configuration exceeds its size limit.",
        ));
    }
    let config: ConnectionConfig = serde_json::from_slice(&bytes).map_err(|_| {
        config_error("The saved MCP configuration is corrupt. Reset it while stopped.")
    })?;
    if config.version != 1
        || config.port == 0
        || config.token.len() != 64
        || !config
            .token
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
    {
        return Err(config_error(
            "The saved MCP configuration is invalid. Reset it while stopped.",
        ));
    }
    Ok(Some(config))
}
fn write_configuration(
    path: &Path,
    config: &ConnectionConfig,
    replace: bool,
) -> Result<(), AppError> {
    let parent = path
        .parent()
        .ok_or_else(|| config_error("Invalid MCP settings location."))?;
    std::fs::create_dir_all(parent)
        .map_err(|_| config_error("Cannot create the application settings directory."))?;
    let mut temporary = tempfile::NamedTempFile::new_in(parent)
        .map_err(|_| config_error("Cannot stage MCP settings."))?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        temporary
            .as_file()
            .set_permissions(std::fs::Permissions::from_mode(0o600))
            .map_err(|_| config_error("Cannot secure MCP credentials."))?;
    }
    serde_json::to_writer(&mut temporary, config)
        .map_err(|_| config_error("Cannot encode MCP settings."))?;
    temporary
        .as_file()
        .sync_all()
        .map_err(|_| config_error("Cannot flush MCP settings."))?;
    if replace { temporary.persist(path) } else { temporary.persist_noclobber(path) }.map_err(|_|config_error("Cannot install MCP settings atomically; another instance may have configured this profile."))?;
    Ok(())
}
fn new_configuration(port: u16) -> Result<ConnectionConfig, AppError> {
    let mut entropy = [0u8; 32];
    getrandom::fill(&mut entropy).map_err(|_| config_error("Token entropy is unavailable."))?;
    Ok(ConnectionConfig {
        version: 1,
        port,
        token: entropy.iter().map(|byte| format!("{byte:02x}")).collect(),
    })
}
fn bind_configuration(path: &Path) -> Result<(TcpListener, ConnectionConfig), AppError> {
    if let Some(config) = read_configuration(path)? {
        let listener=TcpListener::bind((std::net::Ipv4Addr::LOCALHOST,config.port)).map_err(|_|AppError::new("McpPortUnavailable","The saved MCP port is unavailable. Stop the other FBones instance or reset the configuration while stopped, then update the client configuration."))?;
        return Ok((listener, config));
    }
    let listener = TcpListener::bind((std::net::Ipv4Addr::LOCALHOST, 0))
        .map_err(|_| config_error("Cannot bind a local MCP listener."))?;
    let config = new_configuration(listener.local_addr()?.port())?;
    write_configuration(path, &config, false)?;
    Ok((listener, config))
}
fn reset_configuration(path: &Path) -> Result<ConnectionConfig, AppError> {
    let listener = TcpListener::bind((std::net::Ipv4Addr::LOCALHOST, 0))
        .map_err(|_| config_error("Cannot reserve a replacement local MCP port."))?;
    let config = new_configuration(listener.local_addr()?.port())?;
    write_configuration(path, &config, true)?;
    Ok(config)
}
#[tauri::command]
pub fn mcp_status(
    app: tauri::AppHandle,
    state: tauri::State<'_, McpState>,
) -> Result<Status, AppError> {
    let server = state
        .server
        .lock()
        .map_err(|_| invalid("MCP lock failed"))?;
    if let Some(server) = server.as_ref() {
        return Ok(server.status.clone());
    }
    Ok(read_configuration(&config_path(&app)?)?
        .map(|config| config.status(false))
        .unwrap_or_default())
}
#[tauri::command]
pub fn mcp_reset(
    app: tauri::AppHandle,
    state: tauri::State<'_, McpState>,
) -> Result<Status, AppError> {
    let server = state
        .server
        .lock()
        .map_err(|_| invalid("MCP lock failed"))?;
    if server.is_some() {
        return Err(config_error("Stop MCP before resetting its configuration."));
    }
    Ok(reset_configuration(&config_path(&app)?)?.status(false))
}
#[tauri::command]
pub fn mcp_set_ready(state: tauri::State<'_, McpState>, ready: bool) {
    state.ready.store(ready, Ordering::SeqCst);
}
#[tauri::command]
pub fn mcp_stop(
    app: tauri::AppHandle,
    state: tauri::State<'_, McpState>,
) -> Result<Status, AppError> {
    state.ready.store(false, Ordering::SeqCst);
    crate::mcp_capture::cancel(&app);
    let mut last_status = None;
    if let Some(server) = state
        .server
        .lock()
        .map_err(|_| invalid("MCP lock failed"))?
        .take()
    {
        last_status = Some(Status {
            enabled: false,
            ..server.status.clone()
        });
        server.stop.store(true, Ordering::SeqCst);
        {
            let _finished = server
                .execution
                .lock()
                .map_err(|_| invalid("MCP execution lock failed"))?;
        }
        server
            .worker
            .join()
            .map_err(|_| invalid("MCP listener did not stop normally"))?;
    }
    if let Some(status) = last_status {
        return Ok(status);
    }
    Ok(read_configuration(&config_path(&app)?)?
        .map(|config| config.status(false))
        .unwrap_or_default())
}
#[tauri::command]
pub fn mcp_start(
    app: tauri::AppHandle,
    state: tauri::State<'_, McpState>,
) -> Result<Status, AppError> {
    let mut slot = state
        .server
        .lock()
        .map_err(|_| invalid("MCP lock failed"))?;
    if let Some(server) = slot.as_ref() {
        return Ok(server.status.clone());
    }
    let (listener, config) = bind_configuration(&config_path(&app)?)?;
    listener.set_nonblocking(true)?;
    let status = config.status(true);
    let stop = Arc::new(AtomicBool::new(false));
    let worker_stop = stop.clone();
    let execution = Arc::new(Mutex::new(()));
    let worker_execution = execution.clone();
    let token = status.token.clone();
    let worker = std::thread::Builder::new()
        .name("fbones-mcp".into())
        .spawn(move || {
            while !worker_stop.load(Ordering::SeqCst) {
                match listener.accept() {
                    Ok((mut stream, _)) => {
                        let _ = serve(&mut stream, &token, &worker_stop, |request| {
                            let changed = request["method"] == "tools/call"
                                && !is_read_only(
                                    request["params"]["name"].as_str().unwrap_or_default(),
                                )
                                && request["params"]["name"] != "fbones_evaluate_project";
                            let reply = {
                                let _guard = worker_execution.lock().ok()?;
                                if worker_stop.load(Ordering::SeqCst) {
                                    return Some(rpc_error(
                                        request["id"].clone(),
                                        -32603,
                                        "MCP server stopped",
                                    ));
                                }
                                rpc(&app, request)
                            };
                            if changed
                                && reply
                                    .as_ref()
                                    .is_some_and(|r| r["result"]["isError"] == false)
                            {
                                if let Ok(summary) = app.state::<Session>().summary() {
                                    let handle = app.clone();
                                    let _ = app.run_on_main_thread(move || {
                                        crate::update_menu(&handle, summary.as_ref());
                                        let _ = handle.emit("mcp-project-changed", &summary);
                                    });
                                }
                            }
                            reply
                        });
                    }
                    Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                        std::thread::sleep(Duration::from_millis(20))
                    }
                    Err(_) => break,
                }
            }
        })?;
    *slot = Some(Server {
        status: status.clone(),
        stop,
        execution,
        worker,
    });
    Ok(status)
}
impl Drop for McpState {
    fn drop(&mut self) {
        if let Ok(Some(server)) = self.server.get_mut() {
            server.stop.store(true, Ordering::SeqCst);
        }
    }
}
fn response(stream: &mut TcpStream, code: &str, body: Option<Value>) -> std::io::Result<()> {
    let bytes = body.map(|b| b.to_string()).unwrap_or_default();
    write!(stream, "HTTP/1.1 {code}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\nAllow: POST\r\nCache-Control: no-store\r\n\r\n{}", bytes.len(), bytes)
}
/// A normal HTTP client must observe the rejection, not a TCP reset caused by
/// dropping a socket with its declared request body still unread. Never parse
/// or dispatch rejected bodies, and never drain beyond our normal input budget.
fn reject_bounded_request(
    stream: &mut TcpStream,
    code: &str,
    length: Option<usize>,
    stop: &AtomicBool,
    started: Instant,
) -> Result<(), AppError> {
    if let Some(mut remaining) = length.filter(|length| *length <= MAX_BODY) {
        let mut discard = [0u8; 8192];
        while remaining > 0 {
            if stop.load(Ordering::SeqCst) {
                return Ok(());
            }
            if started.elapsed() > Duration::from_secs(10) {
                return Err(invalid("HTTP body deadline exceeded"));
            }
            let chunk = remaining.min(discard.len());
            let count = stream.read(&mut discard[..chunk])?;
            if count == 0 {
                return Err(invalid("Incomplete rejected HTTP body"));
            }
            remaining -= count;
        }
    }
    response(stream, code, None)?;
    Ok(())
}
fn serve(
    stream: &mut TcpStream,
    token: &str,
    stop: &AtomicBool,
    mut handle: impl FnMut(Value) -> Option<Value>,
) -> Result<(), AppError> {
    stream.set_read_timeout(Some(Duration::from_secs(3)))?;
    stream.set_write_timeout(Some(Duration::from_secs(5)))?;
    let started = Instant::now();
    let mut header = Vec::new();
    let mut byte = [0u8];
    while !header.ends_with(b"\r\n\r\n") {
        if stop.load(Ordering::SeqCst) {
            return Ok(());
        }
        if started.elapsed() > Duration::from_secs(5) {
            return Err(invalid("HTTP header deadline exceeded"));
        }
        if header.len() >= 16 * 1024 {
            response(stream, "431 Request Header Fields Too Large", None)?;
            return Ok(());
        }
        if stream.read(&mut byte)? == 0 {
            return Ok(());
        }
        header.push(byte[0]);
    }
    let Ok(header) = std::str::from_utf8(&header) else {
        response(stream, "400 Bad Request", None)?;
        return Ok(());
    };
    let mut lines = header.split("\r\n");
    let first = lines.next().unwrap_or_default();
    let mut authorization = None;
    let mut length = None;
    let mut origin = false;
    let mut host = false;
    let mut transfer = false;
    let mut protocol = None;
    for line in lines.filter(|s| !s.is_empty()) {
        let Some((key, val)) = line.split_once(':') else {
            response(stream, "400 Bad Request", None)?;
            return Ok(());
        };
        match key.to_ascii_lowercase().as_str() {
            "authorization" => {
                if authorization.is_some() {
                    response(stream, "400 Bad Request", None)?;
                    return Ok(());
                }
                authorization = Some(val.trim());
            }
            "content-length" => {
                if length.is_some() {
                    response(stream, "400 Bad Request", None)?;
                    return Ok(());
                }
                let Ok(parsed) = val.trim().parse::<usize>() else {
                    response(stream, "400 Bad Request", None)?;
                    return Ok(());
                };
                length = Some(parsed);
            }
            "origin" => origin = true,
            "mcp-protocol-version" => protocol = Some(val.trim()),
            "host" => host = val.trim() == format!("127.0.0.1:{}", stream.local_addr()?.port()),
            "transfer-encoding" => transfer = true,
            _ => {}
        }
    }
    if origin || !host {
        reject_bounded_request(
            stream,
            "403 Forbidden",
            length.filter(|_| !transfer),
            stop,
            started,
        )?;
        return Ok(());
    }
    if authorization != Some(format!("Bearer {token}").as_str()) || stop.load(Ordering::SeqCst) {
        reject_bounded_request(
            stream,
            "401 Unauthorized",
            length.filter(|_| !transfer),
            stop,
            started,
        )?;
        return Ok(());
    }
    if first == "GET /mcp HTTP/1.1" || first == "DELETE /mcp HTTP/1.1" {
        reject_bounded_request(
            stream,
            "405 Method Not Allowed",
            length.filter(|_| !transfer),
            stop,
            started,
        )?;
        return Ok(());
    }
    if first != "POST /mcp HTTP/1.1" || transfer || length.is_none() {
        reject_bounded_request(
            stream,
            "400 Bad Request",
            length.filter(|_| !transfer),
            stop,
            started,
        )?;
        return Ok(());
    }
    if protocol.is_some_and(|v| !["2025-03-26", "2025-06-18"].contains(&v)) {
        reject_bounded_request(
            stream,
            "400 Bad Request",
            length.filter(|_| !transfer),
            stop,
            started,
        )?;
        return Ok(());
    }
    let length = length.unwrap();
    if length > MAX_BODY {
        response(stream, "413 Content Too Large", None)?;
        return Ok(());
    }
    let mut body = vec![0; length];
    let mut read = 0;
    while read < length {
        if stop.load(Ordering::SeqCst) {
            return Ok(());
        }
        if started.elapsed() > Duration::from_secs(10) {
            return Err(invalid("HTTP body deadline exceeded"));
        }
        let count = stream.read(&mut body[read..])?;
        if count == 0 {
            return Err(invalid("Incomplete HTTP body"));
        }
        read += count;
    }
    if stop.load(Ordering::SeqCst) {
        response(stream, "401 Unauthorized", None)?;
        return Ok(());
    }
    let request: Value = match serde_json::from_slice(&body) {
        Ok(v) => v,
        Err(_) => {
            response(
                stream,
                "200 OK",
                Some(rpc_error(Value::Null, -32700, "Invalid JSON")),
            )?;
            return Ok(());
        }
    };
    let reply = handle(request);
    response(
        stream,
        if reply.is_some() {
            "200 OK"
        } else {
            "202 Accepted"
        },
        reply,
    )?;
    Ok(())
}
fn is_read_only(name: &str) -> bool {
    matches!(
        name,
        "fbones_get_project"
            | "fbones_capture_viewport"
            | "fbones_get_image_data"
            | "fbones_get_audio_data"
            | "fbones_preview_prune_weights"
            | "fbones_preview_trace"
            | "fbones_preview_trace_attachment"
    )
}
fn rpc_error(id: Value, code: i32, message: &str) -> Value {
    json!({"jsonrpc":"2.0","id":id,"error":{"code":code,"message":message}})
}
fn rpc(app: &tauri::AppHandle, req: Value) -> Option<Value> {
    rpc_with(
        req,
        app.state::<McpState>().ready.load(Ordering::SeqCst),
        |name, args| {
            if name == "fbones_capture_viewport" {
                crate::mcp_capture::capture(app, args)
            } else {
                dispatch(&app.state::<Session>(), name, args)
            }
        },
    )
}
fn rpc_with(
    req: Value,
    ready: bool,
    mut invoke: impl FnMut(&str, Value) -> Result<Value, AppError>,
) -> Option<Value> {
    let id = req.get("id").cloned();
    if req.get("jsonrpc") != Some(&json!("2.0"))
        || !req.get("method").is_some_and(Value::is_string)
        || id
            .as_ref()
            .is_some_and(|v| !(v.is_string() || v.is_number() || v.is_null()))
    {
        return Some(rpc_error(
            id.unwrap_or(Value::Null),
            -32600,
            "Invalid Request",
        ));
    }
    let method = req["method"].as_str().unwrap();
    let id = id?;
    let params = req.get("params").cloned().unwrap_or_else(|| json!({}));
    let result = match method {
        "initialize" => Ok(
            json!({"protocolVersion": params["protocolVersion"].as_str().filter(|v| matches!(*v,"2025-03-26"|"2025-06-18")).unwrap_or("2025-06-18"),"capabilities":{"tools":{"listChanged":false},"resources":{"subscribe":false,"listChanged":false},"prompts":{"listChanged":false}},"serverInfo":{"name":"FBones","version":env!("CARGO_PKG_VERSION")},"instructions":"Read fbones://guide, then get project revision and stable IDs before authoring. Edits operate the live editor; preserve native conflicts and inspection-only restrictions."}),
        ),
        "ping" => Ok(json!({})),
        "tools/list" => Ok(json!({"tools":catalog()})),
        "tools/call" => {
            let name = params["name"].as_str().unwrap_or_default();
            let args = params
                .get("arguments")
                .cloned()
                .unwrap_or_else(|| json!({}));
            let read_only = is_read_only(name);
            let outcome = if (!read_only || name == "fbones_capture_viewport") && !ready {
                Err(AppError::new(
                    "EditorBusy",
                    "Finish or cancel pending editor fields/gestures before AI authoring.",
                ))
            } else {
                invoke(name, args)
            };
            Ok(match outcome {
                Ok(data) => tool_result(name, data),
                Err(e) => {
                    json!({"content":[{"type":"text","text":format!("{}: {}",e.code,e.message)}],"structuredContent":{"error":{"code":e.code,"message":e.message}},"isError":true})
                }
            })
        }
        "resources/list" => Ok(
            json!({"resources":[{"uri":"fbones://guide","name":"FBones AI guide","mimeType":"text/markdown"},{"uri":"fbones://edit-schema","name":"All native edit schemas","mimeType":"application/json"},{"uri":"fbones://project","name":"Current live project","mimeType":"application/json"}]}),
        ),
        "resources/templates/list" => Ok(json!({"resourceTemplates":[]})),
        "resources/read" => {
            let uri = params["uri"].as_str().unwrap_or_default();
            let text = match uri {
                "fbones://guide" => Ok(include_str!("../../docs/MCP.md").to_string()),
                "fbones://edit-schema" => Ok(include_str!("mcp_edits.json").to_string()),
                "fbones://project" => {
                    invoke("fbones_get_project", json!({})).map(|v| v.to_string())
                }
                _ => Err(invalid("Unknown resource URI")),
            };
            text.map(|text|json!({"contents":[{"uri":uri,"mimeType":if uri=="fbones://guide" {"text/markdown"} else {"application/json"},"text":text}]}))
        }
        "prompts/list" => Ok(
            json!({"prompts":[{"name":"rig-image","description":"Import PNG, trace a mesh, bind and animate with native guards"}]}),
        ),
        "prompts/get" if params["name"] == "rig-image" => Ok(
            json!({"description":"Native image rigging workflow","messages":[{"role":"user","content":{"type":"text","text":"Read fbones://guide and get_project. Import the requested PNG on an existing bone. Preview then apply attachment tracing at the same revision/pose epoch. Inspect mesh and bind to intended stable bone IDs. Use Auto Weights and inspect deformation at an evaluated pose. Author animation keys using supported channels. Save a .fbones copy and reopen to verify resources and authoring. Stop on stale revision/pose or inspection-only errors; never silently discard unsaved edits."}}]}),
        ),
        _ => return Some(rpc_error(id, -32601, "Method not found")),
    };
    Some(match result {
        Ok(result) => json!({"jsonrpc":"2.0","id":id,"result":result}),
        Err(e) => rpc_error(id, -32602, &format!("{}: {}", e.code, e.message)),
    })
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Args {
    #[serde(default)]
    expected_revision: Option<u64>,
    #[serde(default)]
    pose_epoch: Option<u64>,
    #[serde(default)]
    document_id: u64,
    #[serde(default)]
    discard_changes: bool,
    #[serde(default)]
    save_as: bool,
    #[serde(default)]
    path: Option<PathBuf>,
    #[serde(default)]
    name: String,
    #[serde(default)]
    bone: u64,
    #[serde(default)]
    slot: u64,
    #[serde(default)]
    id: u64,
    #[serde(default)]
    key: String,
    #[serde(default)]
    keys: Vec<String>,
    #[serde(default)]
    x: f32,
    #[serde(default)]
    y: f32,
    #[serde(default)]
    edit: Option<crate::rig::RigEdit>,
    #[serde(default)]
    request: Option<crate::evaluation::EvaluationRequest>,
    #[serde(default)]
    options: crate::trace::TraceOptions,
}
impl Args {
    fn revision(&self) -> Result<u64, AppError> {
        self.expected_revision
            .ok_or_else(|| invalid("expectedRevision is required"))
    }
    fn path(&self) -> Result<PathBuf, AppError> {
        let path = self
            .path
            .clone()
            .ok_or_else(|| invalid("path is required"))?;
        if !path.is_absolute() {
            return Err(invalid("Use an absolute native file path"));
        }
        Ok(path)
    }
}
fn value<T: Serialize>(result: Result<T, AppError>) -> Result<Value, AppError> {
    serde_json::to_value(result?).map_err(|e| invalid(e.to_string()))
}
fn dispatch(session: &Session, name: &str, raw: Value) -> Result<Value, AppError> {
    validate_args(name, &raw)?;
    if name == "fbones_preview_prune_weights" {
        let a: crate::PrunePreviewArgs =
            serde_json::from_value(raw).map_err(|e| invalid(e.to_string()))?;
        return value(session.preview_prune_weights(a.expected_revision, a.request, a.pose_epoch));
    }
    let a: Args = serde_json::from_value(raw).map_err(|e| invalid(e.to_string()))?;
    match name {
        "fbones_get_project" => {
            let (project, revision) = session.summary_with_revision()?;
            Ok(json!({"project":project,"revision":revision}))
        }
        "fbones_create_project" => value(session.replace_checked(
            project::new_document(a.name.clone())?,
            a.discard_changes,
            a.revision()?,
        )),
        "fbones_open_project" => value(session.replace_checked(
            project::open_document(a.path()?)?,
            a.discard_changes,
            a.revision()?,
        )),
        "fbones_close_project" => value(session.close_checked(a.discard_changes, a.revision()?)),
        "fbones_save_project" => {
            let snapshot = session.prepare_save_checked(a.save_as, a.revision()?)?;
            let path = if a.save_as || a.path.is_some() {
                a.path()?
            } else {
                snapshot
                    .current_path
                    .clone()
                    .ok_or_else(|| invalid("path required for first save"))?
            };
            value(session.save_snapshot(snapshot, path))
        }
        "fbones_export_runtime" => value(
            session
                .write_runtime_export(session.prepare_runtime_export(a.revision()?)?, &a.path()?),
        ),
        "fbones_edit" => {
            let revision = a.revision()?;
            let edit = a.edit.ok_or_else(|| invalid("edit required"))?;
            value(if let Some(epoch) = a.pose_epoch {
                session.edit_in_pose(revision, epoch, edit)
            } else {
                session.edit(revision, edit)
            })
        }
        "fbones_evaluate_project" => {
            let revision = a.revision()?;
            value(session.evaluate(
                revision,
                a.request.ok_or_else(|| invalid("request required"))?,
            ))
        }
        "fbones_import_image" => value(session.import_image(a.revision()?, a.bone, &a.path()?)),
        "fbones_import_psd" => value(session.import_psd(a.revision()?, a.bone, &a.path()?)),
        "fbones_choose_images_folder" => {
            value(session.select_images_folder(a.revision()?, &a.path()?))
        }
        "fbones_choose_audio_folder" => {
            value(session.select_audio_folder(a.revision()?, &a.path()?))
        }
        "fbones_refresh_images_folder" => value(session.refresh_images_folder(a.revision()?)),
        "fbones_place_image" => value(session.place_image(a.revision()?, &a.key, a.bone, a.x, a.y)),
        "fbones_place_images" => value(session.place_images_in_pose(
            a.revision()?,
            &a.keys,
            a.bone,
            a.x,
            a.y,
            a.pose_epoch,
        )),
        "fbones_place_attachments" => {
            value(session.place_attachments(a.revision()?, &a.keys, a.slot))
        }
        "fbones_get_image_data" => value(session.image_data(a.document_id, &a.name)),
        "fbones_get_audio_data" => value(session.audio_data(a.document_id, &a.key)),
        "fbones_preview_trace" => value(session.preview_trace(a.revision()?, a.id, a.options)),
        "fbones_apply_trace" => value(session.apply_trace(a.revision()?, a.id, a.options)),
        "fbones_preview_trace_attachment" => value(session.preview_trace_attachment_in_pose(
            a.revision()?,
            a.id,
            a.options,
            a.pose_epoch,
        )),
        "fbones_apply_trace_attachment" => value(session.apply_trace_attachment_in_pose(
            a.revision()?,
            a.id,
            a.options,
            a.pose_epoch,
        )),
        _ => Err(invalid("Unknown MCP tool")),
    }
}

fn catalog() -> &'static Value {
    static VALUE: std::sync::OnceLock<Value> = std::sync::OnceLock::new();
    VALUE.get_or_init(|| {
        serde_json::from_str(include_str!("mcp_catalog.json")).expect("generated MCP catalog")
    })
}
fn validate_args(name: &str, args: &Value) -> Result<(), AppError> {
    let tool = catalog()
        .as_array()
        .and_then(|tools| tools.iter().find(|tool| tool["name"] == name))
        .ok_or_else(|| invalid("Unknown MCP tool"))?;
    let schema = &tool["inputSchema"];
    validate_schema(args, schema, schema, 0).map_err(|why| invalid(format!("{name}: {why}")))
}
/// The small JSON Schema vocabulary emitted by our checked source generator.
/// Native semantic validation still owns geometry, revisions and resource limits.
fn validate_schema(
    value: &Value,
    schema: &Value,
    root: &Value,
    depth: usize,
) -> Result<(), String> {
    if depth > 96 {
        return Err("Input nesting exceeds limit".into());
    }
    if let Some(reference) = schema["$ref"].as_str() {
        let target = root
            .pointer(
                reference
                    .strip_prefix('#')
                    .ok_or("Only local schema references supported")?,
            )
            .ok_or("Missing schema reference")?;
        return validate_schema(value, target, root, depth + 1);
    }
    for choice in ["oneOf", "anyOf"] {
        if let Some(options) = schema[choice].as_array() {
            let valid = options
                .iter()
                .filter(|option| validate_schema(value, option, root, depth + 1).is_ok())
                .count();
            if valid == 0 || choice == "oneOf" && valid != 1 {
                return Err(format!("Input does not match {choice} schema"));
            }
        }
    }
    if let Some(expected) = schema.get("const") {
        if value != expected {
            return Err("Unexpected constant value".into());
        }
    }
    if let Some(options) = schema["enum"].as_array() {
        if !options.contains(value) {
            return Err("Unknown enum value".into());
        }
    }
    if let Some(kind) = schema["type"].as_str() {
        let valid = match kind {
            "object" => value.is_object(),
            "array" => value.is_array(),
            "string" => value.is_string(),
            "number" => value.is_number(),
            "integer" => value.is_u64() || value.is_i64(),
            "boolean" => value.is_boolean(),
            "null" => value.is_null(),
            _ => false,
        };
        if !valid {
            return Err(format!("Expected {kind}"));
        }
    }
    if let Some(number) = value.as_f64() {
        if schema["minimum"].as_f64().is_some_and(|min| number < min)
            || schema["maximum"].as_f64().is_some_and(|max| number > max)
        {
            return Err("Number outside declared range".into());
        }
    }
    if let Some(object) = value.as_object() {
        if let Some(properties) = schema["properties"].as_object() {
            for (key, property) in properties {
                if let Some(expected) = property.get("const") {
                    if object.get(key) != Some(expected) {
                        return Err(format!("Unexpected discriminator {key}"));
                    }
                }
            }
        }
        if let Some(required) = schema["required"].as_array() {
            for key in required {
                if !object.contains_key(key.as_str().ok_or("Invalid required field")?) {
                    return Err(format!("Missing required field {key}"));
                }
            }
        }
        let props = schema["properties"].as_object();
        for (key, field) in object {
            if let Some(property) = props.and_then(|p| p.get(key)) {
                validate_schema(field, property, root, depth + 1)
                    .map_err(|e| format!("{key}: {e}"))?;
            } else if schema["additionalProperties"] == false {
                return Err(format!("Unknown field {key}"));
            }
        }
    }
    if let Some(array) = value.as_array() {
        if schema["minItems"]
            .as_u64()
            .is_some_and(|min| array.len() < (min as usize))
            || schema["maxItems"]
                .as_u64()
                .is_some_and(|max| array.len() > (max as usize))
        {
            return Err("Wrong array length".into());
        }
        if let Some(items) = schema.get("items") {
            for item in array {
                validate_schema(item, items, root, depth + 1)?;
            }
        }
    }
    Ok(())
}

fn tool_result(name: &str, data: Value) -> Value {
    if name == "fbones_capture_viewport" {
        if let Some(encoded) = data["dataUrl"]
            .as_str()
            .and_then(|url| url.strip_prefix("data:image/png;base64,"))
        {
            let mut metadata = data.clone();
            if let Some(object) = metadata.as_object_mut() {
                object.remove("dataUrl");
                object.insert("mimeType".into(), json!("image/png"));
            }
            return json!({"content":[{"type":"image","mimeType":"image/png","data":encoded}],"structuredContent":metadata,"isError":false});
        }
    }

    let media = match name {
        "fbones_get_image_data" => Some(("image", "image/png")),
        "fbones_get_audio_data" => Some(("audio", "audio/wav")),
        _ => None,
    };
    if let Some((kind, mime)) = media {
        if let Some(encoded) = data
            .as_str()
            .and_then(|value| value.strip_prefix(&format!("data:{mime};base64,")))
        {
            return json!({"content":[{"type":kind,"mimeType":mime,"data":encoded}],"structuredContent":{"mimeType":mime},"isError":false});
        }
    }
    json!({"content":[{"type":"text","text":data.to_string()}],"structuredContent":{"result":data},"isError":false})
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn real_session_mcp_revision_history_binary_roundtrip() {
        let session = Session::default();
        let empty = dispatch(&session, "fbones_get_project", json!({})).unwrap();
        let created = dispatch(
            &session,
            "fbones_create_project",
            json!({"name":"MCP","expectedRevision":empty["revision"]}),
        )
        .unwrap();
        let revision = created["revision"].as_u64().unwrap();
        let root = created["bones"][0]["id"].as_u64().unwrap();
        let edit = json!({"type":"create","parent":root,"x":0,"y":0,"rotation":0,"length":20});
        assert!(dispatch(
            &session,
            "fbones_edit",
            json!({"expectedRevision":revision-1,"edit":edit})
        )
        .is_err());
        let child = dispatch(
            &session,
            "fbones_edit",
            json!({"expectedRevision":revision,"edit":edit}),
        )
        .unwrap();
        assert_eq!(child["bones"].as_array().unwrap().len(), 2);
        let undone = dispatch(
            &session,
            "fbones_edit",
            json!({"expectedRevision":child["revision"],"edit":{"type":"undo"}}),
        )
        .unwrap();
        assert_eq!(undone["bones"].as_array().unwrap().len(), 1);
        let redone = dispatch(
            &session,
            "fbones_edit",
            json!({"expectedRevision":undone["revision"],"edit":{"type":"redo"}}),
        )
        .unwrap();
        assert_eq!(redone["bones"].as_array().unwrap().len(), 2);
        let physics=dispatch(&session,"fbones_edit",json!({"expectedRevision":redone["revision"],"edit":{"type":"addPhysicsToBones","bones":[redone["bones"][1]["id"]]}})).unwrap();
        assert_eq!(physics["constraints"].as_array().unwrap().len(), 1);
        let evaluated = dispatch(
            &session,
            "fbones_evaluate_project",
            json!({"expectedRevision":physics["revision"],"request":{"mode":"reset","time":0}}),
        )
        .unwrap();
        assert!(evaluated.is_object());
        let after = dispatch(&session, "fbones_get_project", json!({})).unwrap();
        assert_eq!(after["project"]["bones"], physics["bones"]);
        let folder = tempfile::tempdir().unwrap();
        let png_path = folder.path().join("square.png");
        {
            let file = std::fs::File::create(&png_path).unwrap();
            let mut encoder = png::Encoder::new(file, 16, 16);
            encoder.set_color(png::ColorType::Rgba);
            let mut writer = encoder.write_header().unwrap();
            writer
                .write_image_data(&[255, 100, 20, 255].repeat(256))
                .unwrap();
        }
        let imported = dispatch(
            &session,
            "fbones_import_image",
            json!({"expectedRevision":physics["revision"],"path":png_path,"bone":root}),
        )
        .unwrap();
        let attachment = imported["slots"][0]["activeAttachmentId"].clone();
        let frozen = dispatch(
            &session,
            "fbones_evaluate_project",
            json!({"expectedRevision":imported["revision"],"request":{"mode":"none","time":0}}),
        )
        .unwrap();
        let preview=dispatch(&session,"fbones_preview_trace_attachment",json!({"expectedRevision":imported["revision"],"id":attachment,"options":{},"poseEpoch":frozen["poseEpoch"]})).unwrap();
        assert!(preview["geometry"].is_object());
        let traced=dispatch(&session,"fbones_apply_trace_attachment",json!({"expectedRevision":imported["revision"],"id":attachment,"options":{},"poseEpoch":frozen["poseEpoch"]})).unwrap();
        assert!(traced["slots"][0]["mesh"].is_object());
        // A mesh commit invalidates the old geometry pose: reject reuse.
        assert!(dispatch(&session,"fbones_edit",json!({"expectedRevision":traced["revision"],"poseEpoch":frozen["poseEpoch"],"edit":{"type":"bindAttachment","id":attachment,"bones":[root]}})).is_err());
        let freeze = dispatch(
            &session,
            "fbones_evaluate_project",
            json!({"expectedRevision":traced["revision"],"request":{"mode":"none","time":0}}),
        )
        .unwrap();
        let bound=dispatch(&session,"fbones_edit",json!({"expectedRevision":traced["revision"],"poseEpoch":freeze["poseEpoch"],"edit":{"type":"bindAttachment","id":attachment,"bones":[root]}})).unwrap();
        assert_eq!(bound["slots"][0]["mesh"]["weighted"], true);
        let freeze = dispatch(
            &session,
            "fbones_evaluate_project",
            json!({"expectedRevision":bound["revision"],"request":{"mode":"none","time":0}}),
        )
        .unwrap();
        let weighted=dispatch(&session,"fbones_edit",json!({"expectedRevision":bound["revision"],"poseEpoch":freeze["poseEpoch"],"edit":{"type":"autoAttachmentWeights","id":attachment}})).unwrap();
        for vertex in weighted["slots"][0]["mesh"]["vertices"].as_array().unwrap() {
            let sum: f64 = vertex["weights"]
                .as_array()
                .unwrap()
                .iter()
                .map(|weight| weight.as_f64().unwrap())
                .sum();
            assert!((sum - 1.0).abs() < 1e-6);
        }
        let animated=dispatch(&session,"fbones_edit",json!({"expectedRevision":weighted["revision"],"edit":{"type":"createAnimation","name":"AI motion"}})).unwrap();
        let animation = animated["editedAnimation"].clone();
        let keyed=dispatch(&session,"fbones_edit",json!({"expectedRevision":animated["revision"],"edit":{"type":"setAnimationKeys","animation":animation,"keys":[{"bone":root,"channel":"translate","frame":0,"values":[0,0],"curve":"linear"},{"bone":root,"channel":"translate","frame":30,"values":[30,0],"curve":"linear"}]}})).unwrap();
        let replay=dispatch(&session,"fbones_evaluate_project",json!({"expectedRevision":keyed["revision"],"request":{"mode":"replay","time":0.5,"animationId":animation}})).unwrap();
        assert!(replay.is_object());
        let after = dispatch(&session, "fbones_get_project", json!({})).unwrap();
        assert_eq!(after["project"]["bones"], keyed["bones"]);
        let revision = keyed["revision"].as_u64().unwrap();
        let path = folder.path().join("ai.fbones");
        let saved = dispatch(
            &session,
            "fbones_save_project",
            json!({"path":path,"saveAs":true,"expectedRevision":revision}),
        )
        .unwrap();
        let bytes = std::fs::read(&path).unwrap();
        fbones_format::ProjectEnvelope::inspect(bytes.clone()).unwrap();
        dispatch(
            &session,
            "fbones_close_project",
            json!({"expectedRevision":saved["revision"]}),
        )
        .unwrap();
        let empty = dispatch(&session, "fbones_get_project", json!({})).unwrap();
        let reopened = dispatch(
            &session,
            "fbones_open_project",
            json!({"path":path,"expectedRevision":empty["revision"]}),
        )
        .unwrap();
        assert_eq!(reopened["name"], "MCP");
        assert_eq!(reopened["bones"].as_array().unwrap().len(), 2);
        assert_eq!(reopened["constraints"].as_array().unwrap().len(), 1);
        assert_eq!(reopened["slots"][0]["mesh"]["weighted"], true);
        let motion = reopened["animations"]
            .as_array()
            .unwrap()
            .iter()
            .find(|animation| animation["name"] == "AI motion")
            .unwrap();
        assert_eq!(motion["duration"], 30.0);
        assert_eq!(
            std::fs::read(folder.path().join("images/square.png")).unwrap(),
            std::fs::read(png_path).unwrap()
        );
        assert_eq!(std::fs::read(path).unwrap(), bytes);
        assert!(dispatch(&session, "fbones_edit", json!({"edit":{"type":"undo"}})).is_err());
    }
    #[test]
    fn schemas_reject_unknown_nested_fields_and_missing_required_edits() {
        assert!(validate_args(
            "fbones_edit",
            &json!({"expectedRevision":0,"edit":{"type":"undo","unexpected":true}})
        )
        .is_err());
        assert!(validate_args(
            "fbones_edit",
            &json!({"expectedRevision":0,"edit":{"type":"create","parent":1}})
        )
        .is_err());
        assert!(validate_args("fbones_get_project", &json!({"path":"ignored"})).is_err());
        assert!(validate_args(
            "fbones_edit",
            &json!({"expectedRevision":0,"edit":{"type":"undo"}})
        )
        .is_ok());
    }
    #[test]
    fn protocol_initialize_discovery_resources_and_ready_gate() {
        let session = Session::default();
        let call = |method: &str, params: Value, ready: bool| {
            rpc_with(
                json!({"jsonrpc":"2.0","id":1,"method":method,"params":params}),
                ready,
                |name, args| dispatch(&session, name, args),
            )
            .unwrap()
        };
        let init = call("initialize", json!({"protocolVersion":"2025-06-18"}), false);
        assert_eq!(init["result"]["protocolVersion"], "2025-06-18");
        let tools = call("tools/list", json!({}), false);
        assert_eq!(tools["result"]["tools"].as_array().unwrap().len(), 24);
        let preview = call(
            "tools/call",
            json!({"name":"fbones_preview_prune_weights","arguments":{"expectedRevision":0,"request":{"targets":[{"id":1}],"maxInfluences":1,"threshold":0}}}),
            false,
        );
        assert_eq!(
            preview["result"]["structuredContent"]["error"]["code"],
            "NoProject"
        );
        let guide = call("resources/read", json!({"uri":"fbones://guide"}), false);
        assert!(guide["result"]["contents"][0]["text"]
            .as_str()
            .unwrap()
            .contains("FBones"));
        let blocked = call(
            "tools/call",
            json!({"name":"fbones_create_project","arguments":{"name":"blocked","expectedRevision":0}}),
            false,
        );
        assert_eq!(
            blocked["result"]["structuredContent"]["error"]["code"],
            "EditorBusy"
        );
        assert!(session.summary().unwrap().is_none());
        let invalid = call(
            "tools/call",
            json!({"name":"fbones_edit","arguments":{"expectedRevision":0,"edit":{"type":"madeUp"}}}),
            true,
        );
        assert_eq!(invalid["result"]["isError"], true);
    }
    #[test]
    fn configuration_reuses_credentials_and_port_across_sessions_without_autostart() {
        let folder = tempfile::tempdir().unwrap();
        let path = folder.path().join("settings").join("mcp-connection.json");
        assert!(read_configuration(&path).unwrap().is_none());
        let (listener, first) = bind_configuration(&path).unwrap();
        let bytes = std::fs::read(&path).unwrap();
        assert!(
            !read_configuration(&path)
                .unwrap()
                .unwrap()
                .status(false)
                .enabled
        );
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            assert_eq!(
                std::fs::metadata(&path).unwrap().permissions().mode() & 0o777,
                0o600
            );
        }
        drop(listener);
        // No in-memory state is supplied: this is the same path after restart.
        let (listener, again) = bind_configuration(&path).unwrap();
        assert_eq!(first.port, again.port);
        assert!(first.token == again.token);
        assert!(bytes == std::fs::read(&path).unwrap());
        drop(listener);
        let reset = reset_configuration(&path).unwrap();
        assert!(first.token != reset.token);
        let (listener, after_reset) = bind_configuration(&path).unwrap();
        assert!(reset.token == after_reset.token);
        drop(listener);
    }
    #[test]
    fn configuration_corruption_and_occupied_port_do_not_silently_rotate_identity() {
        let folder = tempfile::tempdir().unwrap();
        let path = folder.path().join("mcp-connection.json");
        let (listener, first) = bind_configuration(&path).unwrap();
        let bytes = std::fs::read(&path).unwrap();
        assert_eq!(
            bind_configuration(&path).err().unwrap().code,
            "McpPortUnavailable"
        );
        assert!(bytes == std::fs::read(&path).unwrap());
        drop(listener);
        std::fs::write(&path, b"not JSON").unwrap();
        assert!(read_configuration(&path).is_err());
        assert!(bind_configuration(&path).is_err());
        assert_eq!(std::fs::read(&path).unwrap(), b"not JSON");
        let recovered = reset_configuration(&path).unwrap();
        assert!(first.token != recovered.token);
        assert!(read_configuration(&path).unwrap().is_some());
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o644)).unwrap();
            assert!(read_configuration(&path).is_err());
            reset_configuration(&path).unwrap();
            assert_eq!(
                std::fs::metadata(&path).unwrap().permissions().mode() & 0o777,
                0o600
            );
        }
    }
    #[test]
    fn protocol_media_uses_image_and_audio_blocks_without_duplicate_base64_text() {
        for (name, kind, mime) in [
            ("fbones_get_image_data", "image", "image/png"),
            ("fbones_get_audio_data", "audio", "audio/wav"),
        ] {
            let reply=rpc_with(json!({"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":name,"arguments":{}}}),false,|_,_|Ok(json!(format!("data:{mime};base64,AQID")))).unwrap();
            assert_eq!(reply["result"]["content"][0]["type"], kind);
            assert_eq!(reply["result"]["content"][0]["mimeType"], mime);
            assert_eq!(reply["result"]["content"][0]["data"], "AQID");
            assert!(reply["result"]["content"][0].get("text").is_none());
            assert!(reply["result"]["structuredContent"].get("result").is_none());
        }
    }
    #[test]
    fn actual_loopback_http_authentication_and_native_dispatch() {
        fn request(token: &str, origin: bool) -> (String, usize) {
            let listener = TcpListener::bind("127.0.0.1:0").unwrap();
            let addr = listener.local_addr().unwrap();
            let executions = Arc::new(std::sync::atomic::AtomicUsize::new(0));
            let observed = executions.clone();
            let worker = std::thread::spawn(move || {
                let (mut stream, _) = listener.accept().unwrap();
                let session = Session::default();
                serve(&mut stream, "secret", &AtomicBool::new(false), |req| {
                    observed.fetch_add(1, Ordering::SeqCst);
                    rpc_with(req, true, |name, args| dispatch(&session, name, args))
                })
                .unwrap();
            });
            let mut stream = TcpStream::connect(addr).unwrap();
            let mut body=json!({"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"fbones_create_project","arguments":{"name":"HTTP","expectedRevision":0}}}).to_string();
            // A real body spanning packets makes an unread-body close fail this
            // test rather than tolerating a reset after partial status bytes.
            body.push_str(&" ".repeat(64 * 1024));
            write!(stream,"POST /mcp HTTP/1.1\r\nHost: {addr}\r\nAuthorization: Bearer {token}\r\n{}Content-Length: {}\r\n\r\n{body}",if origin {"Origin: https://evil.example\r\n"} else {""},body.len()).unwrap();
            let mut reply = Vec::new();
            stream
                .read_to_end(&mut reply)
                .expect("HTTP rejection must finish without a TCP reset");
            worker.join().unwrap();
            (
                String::from_utf8(reply).unwrap(),
                executions.load(Ordering::SeqCst),
            )
        }
        let (rejected, executions) = request("wrong", false);
        assert!(rejected.starts_with("HTTP/1.1 401"));
        assert_eq!(executions, 0);
        let (rejected, executions) = request("secret", true);
        assert!(rejected.starts_with("HTTP/1.1 403"));
        assert_eq!(executions, 0);
        let (reply, executions) = request("secret", false);
        assert_eq!(executions, 1);
        assert!(reply.starts_with("HTTP/1.1 200"));
        let data: Value = serde_json::from_str(reply.split_once("\r\n\r\n").unwrap().1).unwrap();
        assert_eq!(
            data["result"]["structuredContent"]["result"]["name"],
            "HTTP"
        );
        assert_eq!(data["result"]["structuredContent"]["result"]["revision"], 1);
    }
}
