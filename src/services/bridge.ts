// Tauri injects this API from the same Rust release as the native executable.
// Keep native integration here so the editor remains previewable in a browser.
interface NativeWindow {
  setTitle(title: string): Promise<void>;
  destroy(): Promise<void>;
  onCloseRequested(handler: (event: { preventDefault(): void }) => void): Promise<() => void>;
}
interface NativeBridge {
  core: { invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> };
  event: { listen<T>(name: string, handler: (event: { payload: T }) => void): Promise<() => void> };
  window: { getCurrentWindow(): NativeWindow };
}
function bridge(): NativeBridge | undefined {
  return (globalThis as typeof globalThis & { __TAURI__?: NativeBridge }).__TAURI__;
}
export const desktop = bridge() !== undefined;
function requiredBridge(): NativeBridge {
  const api = bridge();
  if (!api) throw new Error('This operation requires the desktop application.');
  return api;
}
export function invokeNative<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  return requiredBridge().core.invoke<T>(command, args);
}
export function onEditorCommand(handler: (id: string) => void): Promise<() => void> {
  return requiredBridge().event.listen<string>('editor-command', (event) => handler(event.payload));
}
export function nativeWindow(): NativeWindow { return requiredBridge().window.getCurrentWindow(); }
