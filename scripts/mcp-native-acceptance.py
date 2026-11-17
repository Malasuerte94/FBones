#!/usr/bin/env python3
"""Dedicated source-build GTK/W3C/MCP acceptance. Never attaches to user apps.

Run under an own xvfb-run + dbus-run-session. This script starts and retains a
new launcher/app chain and scopes all GUI input to its one W3C session/window.
Raw connection credentials remain in the ignored private run directory only.
"""
import argparse
import base64
import ctypes
import hashlib
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import sys
import time
import urllib.request
import urllib.error

SOURCE = Path(__file__).resolve()
REPOSITORY = SOURCE.parent.parent


def require(value, message):
    if not value:
        raise ValueError(message)


def write(path, value):
    with path.open('x') as output:
        json.dump(value, output, indent=2)
        output.write('\n')


def identity(pid):
    proc = Path('/proc') / str(pid)
    stat = (proc / 'stat').read_text()
    fields = stat[stat.rfind(')') + 2:].split()
    return {'pid': pid, 'parentPid': int(fields[1]), 'startTicks': fields[19],
            'executable': os.readlink(proc / 'exe'),
            'sha256': hashlib.sha256((proc / 'exe').read_bytes()).hexdigest()}


def launch(root):
    config = json.loads((root / 'launch-input.json').read_text())
    binary = Path(config['binary'])
    require(hashlib.sha256(binary.read_bytes()).hexdigest() == config['sha256'],
            'Own source executable changed before launch')
    log = (root / 'native.log').open('xb')
    child = subprocess.Popen([str(binary), *sys.argv[3:]], stdin=subprocess.DEVNULL,
                             stdout=log, stderr=subprocess.STDOUT, close_fds=True)
    observed = identity(child.pid)
    require(observed['sha256'] == config['sha256'] and observed['parentPid'] == os.getpid(),
            'Retained child image/parent mismatch')
    write(root / 'native-bound.json', {'wrapper': identity(os.getpid()), 'app': observed})
    code = child.wait()
    write(root / 'native-terminal.json', {'app': observed, 'exitCode': code,
                                         'normalExit': code == 0})
    return code if code >= 0 else 128 - code


def descendants(parent):
    queue, found = [parent], []
    while queue and len(found) < 256:
        pid = queue.pop()
        try:
            values = [int(item) for item in (Path('/proc') / str(pid) / 'task' / str(pid) / 'children').read_text().split()]
        except FileNotFoundError:
            continue
        found.extend(values)
        queue.extend(values)
    return found


def own_window(pid):
    tree = subprocess.check_output(['xwininfo', '-root', '-tree'], text=True)
    windows = []
    for handle in re.findall(r'^\s*(0x[0-9a-f]+)\s+', tree, re.M):
        prop = subprocess.run(['xprop', '-id', handle, '_NET_WM_PID'], capture_output=True, text=True)
        if not re.search(r'=\s*' + str(pid) + r'\s*$', prop.stdout):
            continue
        info = subprocess.check_output(['xwininfo', '-id', handle], text=True)
        if 'Map State: IsViewable' in info:
            windows.append(handle)
    require(len(windows) <= 1, 'Ambiguous native own-window identity')
    return windows[0] if windows else None


def close_owned_window(handle):
    # WM_DELETE_WINDOW to one revalidated XID, never keyboard/global focus/kill.
    class Data(ctypes.Union):
        _fields_ = [('b', ctypes.c_char * 20), ('s', ctypes.c_short * 10), ('l', ctypes.c_long * 5)]
    class Client(ctypes.Structure):
        _fields_ = [('type', ctypes.c_int), ('serial', ctypes.c_ulong), ('send', ctypes.c_int),
                    ('display', ctypes.c_void_p), ('window', ctypes.c_ulong),
                    ('message', ctypes.c_ulong), ('format', ctypes.c_int), ('data', Data)]
    class Event(ctypes.Union):
        _fields_ = [('client', Client), ('pad', ctypes.c_long * 24)]
    x = ctypes.CDLL('libX11.so.6')
    x.XOpenDisplay.argtypes = [ctypes.c_char_p]
    x.XOpenDisplay.restype = ctypes.c_void_p
    x.XInternAtom.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_int]
    x.XInternAtom.restype = ctypes.c_ulong
    x.XSendEvent.argtypes = [ctypes.c_void_p, ctypes.c_ulong, ctypes.c_int, ctypes.c_long, ctypes.POINTER(Event)]
    x.XFlush.argtypes = [ctypes.c_void_p]
    x.XCloseDisplay.argtypes = [ctypes.c_void_p]
    display = x.XOpenDisplay(None)
    require(display, 'Private X display unavailable')
    try:
        event = Event()
        event.client.type = 33
        event.client.display = display
        event.client.window = int(handle, 16)
        event.client.message = x.XInternAtom(display, b'WM_PROTOCOLS', 0)
        event.client.format = 32
        event.client.data.l[0] = x.XInternAtom(display, b'WM_DELETE_WINDOW', 0)
        require(x.XSendEvent(display, int(handle, 16), 0, 0, ctypes.byref(event)) != 0,
                'Exact own-window normal-close send failed')
        x.XFlush(display)
    finally:
        x.XCloseDisplay(display)


def acceptance(args):
    root = args.output.resolve()
    require(root.is_relative_to(REPOSITORY / '.local'), 'Private project-local output required')
    require(not root.exists(), 'Fresh output directory required')
    require(os.environ.get('DISPLAY') and os.environ['DISPLAY'] not in [':0', ':0.0'],
            'Dedicated private X display required; never use the user display')
    root.mkdir(parents=True, mode=0o700)
    report = {'passed': False, 'stages': [], 'originalOperations': 0,
              'protectedWindowOperations': 0, 'credentialsPublished': False}
    driver = None
    app = None
    session = None
    endpoint = None
    def stage(name):
        report['stages'].append(name)
        (root / 'progress.json').write_text(json.dumps(report, indent=2) + '\n')
    def rpc(method, path, payload=None):
        request = urllib.request.Request(endpoint + path, method=method,
                    data=None if payload is None else json.dumps(payload).encode(),
                    headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(request, timeout=40) as response:
            body = json.load(response)
        value = body.get('value')
        require(not isinstance(value, dict) or 'error' not in value,
                'W3C scoped request failed: ' + str(value)[:400])
        return value
    def script(code):
        return rpc('POST', '/session/' + session + '/execute/sync', {'script': code, 'args': []})
    def wait(operation, seconds=25):
        deadline = time.monotonic() + seconds
        last = ''
        while time.monotonic() < deadline:
            try:
                value = operation()
                if value:
                    return value
            except (OSError, ValueError, json.JSONDecodeError) as error:
                last = type(error).__name__
            time.sleep(.15)
        raise TimeoutError('Own native observation deadline; last=' + last)
    def assert_identity():
        require(app and identity(app['pid']) == app, 'Own native PID/start/image identity changed')
        require(own_window(app['pid']) == report['window'], 'Own native visible window changed')
    def click(selector):
        assert_identity()
        element = rpc('POST', '/session/' + session + '/element',
                      {'using': 'css selector', 'value': selector})
        eid = element['element-6066-11e4-a52e-4f735466cecf']
        rpc('POST', '/session/' + session + '/element/' + eid + '/click', {})
    def screenshot(name):
        assert_identity()
        data = base64.b64decode(rpc('GET', '/session/' + session + '/screenshot'), validate=True)
        require(len(data) <= 8 * 1024 * 1024 and data.startswith(bytes.fromhex('89504e470d0a1a0a')),
                'Native screenshot size/format refused')
        (root / name).write_bytes(data)
        return {'file': name, 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)}
    def native_status():
        return rpc('POST', '/session/' + session + '/execute/async', {'script':
                   "const done=arguments[arguments.length-1];window.__TAURI__.core.invoke('mcp_status').then(done,()=>done(null));", 'args': []})
    def displayed_config():
        return json.loads(script("return document.querySelector('[data-testid=mcp-config]').value"))
    def initialize_connection(connection, token=None):
        # Independent continuity probe against the actual listener. Credentials
        # are never returned in the report, stdout, exception messages or images.
        request = urllib.request.Request(connection['url'], method='POST',
                  headers={'Content-Type': 'application/json',
                           'Accept': 'application/json, text/event-stream',
                           'MCP-Protocol-Version': '2025-06-18',
                           'Authorization': 'Bearer ' + (token or connection['token'])},
                  data=json.dumps({'jsonrpc': '2.0', 'id': 1, 'method': 'initialize',
                       'params': {'protocolVersion': '2025-06-18', 'capabilities': {},
                                  'clientInfo': {'name': 'native-continuity-probe', 'version': '1'}}}).encode())
        with urllib.request.urlopen(request, timeout=15) as response:
            body = json.load(response)
        require(body.get('id') == 1 and isinstance(body.get('result'), dict) and
                body['result'].get('protocolVersion') == '2025-06-18',
                'Stored connection MCP initialization failed')
    try:
        # Read the current protected-user notices before any process operation.
        # They remain historical identity notices, never reusable launch authority.
        ledgers = sorted((REPOSITORY / '.local').glob('*user-process*.json'))
        normal_notice = REPOSITORY / '.local/mcp-2026-11-17/normal-launch.json'
        if normal_notice.exists():
            ledgers.append(normal_notice)
        report['protectedLedgersRead'] = []
        for ledger in ledgers:
            raw = ledger.read_bytes()
            json.loads(raw)
            report['protectedLedgersRead'].append({'name': ledger.name,
                     'sha256': hashlib.sha256(raw).hexdigest()})
        binary = args.binary.resolve()
        require(binary.is_file(), 'Source binary unavailable')
        source_sha = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
        binary_sha = hashlib.sha256(binary.read_bytes()).hexdigest()
        write(root / 'launch-input.json', {'binary': str(binary), 'sha256': binary_sha})
        wrapper = root / 'launch.py'
        wrapper.write_text('#!/usr/bin/python3\nimport os,sys\nos.execv(sys.executable,' +
                           repr([sys.executable, str(SOURCE), '--launch', str(root)]) + '+sys.argv[1:])\n')
        wrapper.chmod(0o755)
        env = os.environ.copy()
        env.pop('WAYLAND_DISPLAY', None)
        env.update(GDK_BACKEND='x11', TAURI_WEBVIEW_AUTOMATION='true', LIBGL_ALWAYS_SOFTWARE='1')
        for key, name in [('XDG_DATA_HOME', 'data'), ('XDG_CONFIG_HOME', 'config'),
                          ('XDG_CACHE_HOME', 'cache'), ('XDG_RUNTIME_DIR', 'runtime'), ('TMPDIR', 'tmp')]:
            folder = root / name
            folder.mkdir(mode=0o700)
            env[key] = str(folder)
        with socket.socket() as probe:
            probe.bind(('127.0.0.1', 0))
            port = probe.getsockname()[1]
        endpoint = 'http://127.0.0.1:' + str(port)
        stage('start-own-native-provider')
        log = (root / 'driver.log').open('xb')
        driver = subprocess.Popen([str(args.driver.resolve()), '--host=127.0.0.1', '--port=' + str(port)],
                                  stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT,
                                  env=env, close_fds=True)
        report['driver'] = identity(driver.pid)
        wait(lambda: rpc('GET', '/status').get('ready'))
        session = rpc('POST', '/session', {'capabilities': {'alwaysMatch': {'browserName': 'wry',
                      'webkitgtk:browserOptions': {'binary': str(wrapper), 'args': []}}}})['sessionId']
        stage('bind-own-native-app-window')
        bound = wait(lambda: json.loads((root / 'native-bound.json').read_text())
                     if (root / 'native-bound.json').exists() else None)
        app = bound['app']
        require(app['sha256'] == binary_sha and app['parentPid'] == bound['wrapper']['pid'] and
                bound['wrapper']['pid'] in descendants(driver.pid), 'Own launcher/native chain mismatch')
        require(identity(app['pid']) == app, 'Live native identity differs')
        report.update(app=app, sourceSha256=source_sha, display=env['DISPLAY'],
                      window=wait(lambda: own_window(app['pid'])))
        wait(lambda: script("const c=document.querySelector('[data-testid=viewport] canvas');return c&&c.width>0&&document.querySelector('[data-testid=mcp-toggle]')&&!document.body.innerText.includes('Opening workspace…')&&!document.body.innerText.includes('The viewport could not start.');"))
        stage('actual-mcp-controls-start')
        click('[data-testid=mcp-toggle]')
        wait(lambda: script("return !!document.querySelector('[data-testid=mcp-start]')"))
        click('[data-testid=mcp-start]')
        wait(lambda: script("return document.querySelector('main').inert&&!!document.querySelector('[data-testid=mcp-config]')"))
        copied = script("return document.querySelector('[data-testid=mcp-config]').value")
        write(root / 'displayed-client-config.json', json.loads(copied))
        stage('actual-native-copy-click')
        click('[data-testid=mcp-copy]')
        report['nativeCopyClickObserved'] = True
        copy_result = wait(lambda: script("const button=document.querySelector('[data-testid=mcp-copy]'),error=document.querySelector('[data-testid=mcp-error]');return button?.innerText.trim()==='Copied'||error?.innerText.trim()?{copied:button?.innerText.trim()==='Copied',errorVisible:!!error?.innerText.trim()}:null;"))
        report['nativeCopyReportedCopied'] = copy_result['copied']
        require(copy_result['copied'], 'Actual native Copy failed to report Copied; clipboard capability is unproven')
        stage('independent-own-display-clipboard-read')
        # GTK requests the selection only on our private X display. No keyboard,
        # focus, clipboard write/mock or access to the user's display is involved.
        # The child stdout contains credentials and is compared in memory only;
        # never forward it to logs/report/stdout or include it in an exception.
        require(env['DISPLAY'] == report['display'] and env['DISPLAY'] not in [':0', ':0.0'] and
                env['GDK_BACKEND'] == 'x11', 'Clipboard reader requires our private X display')
        clipboard_reader = """import gi,sys
gi.require_version('Gtk','3.0')
from gi.repository import Gtk,Gdk
ok,_=Gtk.init_check([])
if not ok: sys.exit(2)
text=Gtk.Clipboard.get(Gdk.SELECTION_CLIPBOARD).wait_for_text()
if text is None: sys.exit(3)
sys.stdout.write(text)
"""
        clipboard = subprocess.run(['/usr/bin/python3', '-c', clipboard_reader], env=env,
                                   stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                                   stderr=subprocess.PIPE, timeout=10, close_fds=True, text=True)
        require(clipboard.returncode == 0, 'Independent own-display GTK clipboard read failed')
        try:
            clipboard_config = json.loads(clipboard.stdout)
        except (ValueError, TypeError):
            raise ValueError('Independent own-display clipboard did not contain configuration JSON') from None
        require(clipboard_config == json.loads(copied),
                'Actual native clipboard differs from displayed client configuration')
        report['nativeClipboardMatchesDisplayedConfiguration'] = True
        report['clipboardProvider'] = 'GTK3 X11 selection read on dedicated own display'
        # Read native status from this actual app bridge; never replace it with a
        # fixture. Separate from the preceding W3C Start gesture/config display.
        status = native_status()
        require(status and status.get('enabled') and status.get('url') and status.get('token'),
                'Actual native running connection absent')
        connection = root / 'connection.json'
        write(connection, {'url': status['url'], 'token': status['token']})
        connection.chmod(0o600)
        # Close the settings panel before retained screenshot: no credential UI.
        click('[role=dialog] button:last-child')
        wait(lambda: script("return !document.querySelector('[data-testid=mcp-config]')&&!!document.querySelector('[data-testid=mcp-active-banner]')"))
        stage('independent-real-mcp-client')
        client_output = root / 'client'
        client_output.mkdir(mode=0o700)
        client_command = ['node', str(args.client.resolve()), '--connection', str(connection),
                          '--output', str(client_output), '--sdk-root', str(args.sdk_root.resolve())]
        with (root / 'client.log').open('xb') as client_log:
            result = subprocess.run(client_command, stdin=subprocess.DEVNULL, stdout=client_log,
                                    stderr=subprocess.STDOUT, timeout=150, close_fds=True)
        require(result.returncode == 0, 'Independent client failed; inspect private client.log')
        assert_identity()
        stage('rendered-client-result')
        observed = wait(lambda: script("const c=document.querySelector('[data-testid=viewport] canvas');return document.body.innerText.includes('MCP acceptance rig')&&c&&c.width>0?{text:document.body.innerText,canvas:{width:c.width,height:c.height},inert:document.querySelector('main').inert,stopOutsideInert:document.querySelector('[data-testid=mcp-active-banner] button:last-child')?.closest('[inert]')===null}:null"))
        require(observed['inert'] and observed['stopOutsideInert'], 'AI lock/accessible Stop absent')
        write(root / 'rendered-project.json', observed)
        report['screenshot'] = screenshot('native-client-result.png')
        stage('actual-stop-stable-config')
        click('[data-testid=mcp-active-banner] button:last-child')
        wait(lambda: script("return !document.querySelector('main').inert&&!document.querySelector('[data-testid=mcp-active-banner]')"))
        click('[data-testid=mcp-toggle]')
        wait(lambda: script("return !!document.querySelector('[data-testid=mcp-config]')&&!document.querySelector('[data-testid=mcp-start]')?.disabled"))
        require(displayed_config() == json.loads(copied), 'Displayed configuration changed across Stop')
        stopped = native_status()
        require(stopped and not stopped['enabled'] and stopped['url'] == status['url'] and
                stopped['token'] == status['token'], 'Stored native connection changed across Stop')
        stage('actual-restart-same-client-config')
        click('[data-testid=mcp-start]')
        wait(lambda: script("return document.querySelector('main').inert&&!!document.querySelector('[data-testid=mcp-stop]')&&!document.querySelector('[data-testid=mcp-stop]').disabled"))
        require(displayed_config() == json.loads(copied), 'Displayed configuration changed across Start')
        restarted = native_status()
        require(restarted and restarted['enabled'] and restarted['url'] == status['url'] and
                restarted['token'] == status['token'], 'Stored native connection changed across Start')
        initialize_connection(status)
        report['sameConfigurationAcrossStopStart'] = True
        report['originalCopiedConnectionReinitializes'] = True
        # The modal Stop and Close are separate scoped W3C controls; neither
        # operates any user window or sends a global Escape/key gesture.
        click('[data-testid=mcp-stop]')
        wait(lambda: script("return !document.querySelector('main').inert&&!!document.querySelector('[data-testid=mcp-reset]')&&!document.querySelector('[data-testid=mcp-reset]').disabled"))
        stage('actual-explicit-stopped-reset')
        click('[data-testid=mcp-reset]')
        wait(lambda: script("return !!document.querySelector('[data-testid=mcp-start]')&&!document.querySelector('[data-testid=mcp-start]').disabled"))
        reset_status = native_status()
        require(reset_status and not reset_status['enabled'] and reset_status['token'] != status['token'] and
                displayed_config() != json.loads(copied), 'Explicit stopped Reset did not replace credentials')
        click('[data-testid=mcp-start]')
        wait(lambda: script("return document.querySelector('main').inert&&!!document.querySelector('[data-testid=mcp-stop]')&&!document.querySelector('[data-testid=mcp-stop]').disabled"))
        reset_running = native_status()
        require(reset_running and reset_running['enabled'] and reset_running['url'] == reset_status['url'] and
                reset_running['token'] == reset_status['token'], 'Reset connection failed to start unchanged')
        report['explicitStoppedResetChangesConfiguration'] = True
        stage('reset-new-connection-initialize')
        initialize_connection(reset_running)
        report['resetConnectionInitializes'] = True
        stage('old-token-rejection-at-new-endpoint')
        try:
            # Test old token at the NEW endpoint. The old port can be closed,
            # which would prove revocation less directly than an actual401.
            initialize_connection(reset_running, token=status['token'])
        except urllib.error.HTTPError as error:
            require(error.code == 401, 'Old credential was not rejected with401 after Reset')
        else:
            raise ValueError('Old credential remained accepted after Reset')
        report['oldTokenAtResetListenerRejected401'] = True
        click('[data-testid=mcp-stop]')
        wait(lambda: script("return !document.querySelector('main').inert&&!!document.querySelector('[data-testid=mcp-start]')&&!document.querySelector('[data-testid=mcp-start]').disabled"))
        click('[role=dialog] button:last-child')
        wait(lambda: script("return !document.querySelector('[role=dialog]')&&!document.querySelector('main').inert"))
        stage('actual-normal-close')
        assert_identity()
        close_owned_window(report['window'])
        terminal = wait(lambda: json.loads((root / 'native-terminal.json').read_text())
                        if (root / 'native-terminal.json').exists() else None)
        require(terminal['app'] == app and terminal['normalExit'] and terminal['exitCode'] == 0,
                'Retained native normal exit0 absent')
        report.update(passed=True, terminal=terminal, scope='Dedicated Linux source GTK/W3C + independent MCP client and actual own-display clipboard copy/read; no Windows/macOS clipboard claim')
        stage('passed')
    except Exception as error:
        report['error'] = type(error).__name__ + ': ' + str(error)[:500]
    finally:
        if not report['passed'] and app and session and driver and driver.poll() is None:
            report['failureCleanup'] = {'attempted': False, 'normalExit': False,
                                        'originalFailurePreserved': True}
            try:
                assert_identity()
                report['failureCleanup']['attempted'] = True
                stage('failure-cleanup-exact-own-session')
                controls = script("return {modalStop:!!document.querySelector('[data-testid=mcp-stop]'),bannerStop:!!document.querySelector('[data-testid=mcp-active-banner] button:last-child'),settings:!!document.querySelector('[data-testid=mcp-status]'),unexpectedModal:!!document.querySelector('[role=dialog]')&&!document.querySelector('[data-testid=mcp-status]')};")
                require(not controls['unexpectedModal'], 'Failure cleanup refuses unexpected modal')
                if controls['modalStop']:
                    wait(lambda: script("return !document.querySelector('[data-testid=mcp-stop]').disabled"))
                    click('[data-testid=mcp-stop]')
                elif controls['bannerStop']:
                    click('[data-testid=mcp-active-banner] button:last-child')
                wait(lambda: script("return !document.querySelector('main').inert"))
                if controls['settings']:
                    click('[role=dialog] button:last-child')
                    wait(lambda: script("return !document.querySelector('[data-testid=mcp-status]')"))
                cleanup_status = native_status()
                require(cleanup_status and not cleanup_status['enabled'],
                        'Failure cleanup cannot establish stopped MCP through own UI')
                document = rpc('POST', '/session/' + session + '/execute/async', {'script':
                           "const done=arguments[arguments.length-1];window.__TAURI__.core.invoke('get_project').then(p=>done({known:true,dirty:!!p?.dirty}),()=>done({known:false}));", 'args': []})
                require(document and document.get('known') and not document.get('dirty'),
                        'Failure cleanup refuses dirty/unknown document; no discard')
                assert_identity()
                close_owned_window(report['window'])
                cleanup_terminal = wait(lambda: json.loads((root / 'native-terminal.json').read_text())
                                        if (root / 'native-terminal.json').exists() else None)
                require(cleanup_terminal['app'] == app and cleanup_terminal['normalExit'] and
                        cleanup_terminal['exitCode'] == 0, 'Failure cleanup normal exit0 unproven')
                report['failureCleanup'].update(normalExit=True, terminal=cleanup_terminal)
            except Exception as cleanup_error:
                report['failureCleanup']['error'] = type(cleanup_error).__name__ + ': ' + str(cleanup_error)[:300]
        # Only stop our controller after retained native terminal; never force a
        # failed/open editor or an unknown/changed process to manufacture success.
        if driver and driver.poll() is None and (root / 'native-terminal.json').exists():
            if identity(driver.pid) == report.get('driver'):
                driver.terminate()
                try:
                    report['driverExitCode'] = driver.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    report['driverTerminalUnobserved'] = True
                    report['passed'] = False
        write(root / 'result.json', report)
    print(json.dumps({'passed': report['passed'], 'stages': report['stages'],
                      'output': str(root), 'error': report.get('error')}))
    return 0 if report['passed'] else 2


if __name__ == '__main__':
    if len(sys.argv) >= 3 and sys.argv[1] == '--launch':
        sys.exit(launch(Path(sys.argv[2]).resolve()))
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--driver', type=Path, required=True)
    parser.add_argument('--binary', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--client', type=Path, default=SOURCE.with_name('mcp-client-acceptance.mjs'))
    parser.add_argument('--sdk-root', type=Path, required=True)
    sys.exit(acceptance(parser.parse_args()))
