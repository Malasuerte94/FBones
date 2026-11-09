"""Fixed own Linux descendant/wait capability; never runs an editor or updater."""
import ctypes
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time

SOURCE = Path(__file__).resolve()
SOURCE_SHA = hashlib.sha256(SOURCE.read_bytes()).hexdigest()


def require(value, message):
    if not value:
        raise ValueError(message)


def identity(pid):
    base = Path('/proc') / str(pid)
    raw = (base / 'stat').read_text()
    fields = raw[raw.rfind(')') + 2:].split()
    return dict(pid=pid, ppid=int(fields[1]), startTicks=fields[19],
                executablePath=os.readlink(base / 'exe'),
                executableSha256=hashlib.sha256((base / 'exe').read_bytes()).hexdigest(),
                sourceSha256=SOURCE_SHA)


def stable(row):
    return {k: v for k, v in row.items() if k != 'ppid'}


def write(root, name, value):
    data = (json.dumps(value, indent=2) + '\n').encode()
    require(len(data) < 16384, 'Own receipt exceeds16KiB')
    path = root / name
    with path.open('xb') as output:
        output.write(data)
        output.flush()
        os.fsync(output.fileno())


def read_when(root, name, seconds=10):
    end = time.monotonic() + seconds
    while time.monotonic() < end:
        try:
            data = (root / name).read_bytes()
            require(len(data) < 16384, 'Own receipt exceeds16KiB')
            return json.loads(data)
        except (FileNotFoundError, json.JSONDecodeError):
            time.sleep(.02)
    raise TimeoutError('Own finite receipt deadline: ' + name)


def child(root, role):
    controller = read_when(root, 'controller-created.json')
    require(controller['sourceSha256'] == SOURCE_SHA, 'Own source changed')
    if role == 'old':
        me = identity(os.getpid())
        require(me['ppid'] == controller['pid'], 'Old creator changed')
        write(root, 'old-created.json', me)
        new = subprocess.Popen([sys.executable, '-I', str(SOURCE), 'new', str(root)],
                               stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                               stderr=subprocess.DEVNULL, close_fds=True)
        observed = read_when(root, 'new-before.json')
        require(observed['pid'] == new.pid and observed['ppid'] == me['pid'], 'New creator mismatch')
        require(stable(identity(new.pid)) == stable(observed), 'New identity changed')
        write(root, 'old-ready.json', dict(old=me, createdNew=observed))
        ack = read_when(root, 'controller-before-ack.json')
        require(ack['old'] == me and ack['new'] == observed, 'Controller chain differs')
        write(root, 'old-exit-intent.json', dict(exitCode=0, childStillRunning=new.poll() is None))
        return 0
    old = read_when(root, 'old-created.json')
    me = identity(os.getpid())
    require(me['ppid'] == old['pid'], 'New child has no bound old parent')
    require(me['executableSha256'] == controller['executableSha256'], 'Fixture interpreter changed')
    write(root, 'new-before.json', me)
    end = time.monotonic() + 10
    while time.monotonic() < end:
        current = identity(os.getpid())
        require(stable(current) == stable(me), 'New identity changed during adoption')
        if current['ppid'] == controller['pid']:
            write(root, 'new-adopted.json', current)
            ack = read_when(root, 'controller-adopted-ack.json')
            require(ack == current, 'Controller adoption differs')
            write(root, 'new-exit-intent.json', dict(exitCode=0, identity=current))
            return 0
        require(current['ppid'] == old['pid'], 'Unknown adopter; no fallback')
        time.sleep(.02)
    raise TimeoutError('Own child did not reach the declared adopter')


def controller(root):
    require(not root.exists(), 'Fresh own output directory required')
    root.mkdir(parents=True)
    report = dict(passed=False, scope='OWN_DESCENDANT_TERMINAL_ONLY', originalOperations=0,
                  productLaunches=0, guiOperations=0, signalsSent=0, forcedCleanup=False,
                  processLocalFlagOnly=True, kernel=os.uname().release)
    old = None
    try:
        header = Path('/usr/include/linux/prctl.h').read_text()
        for name, number in [('PR_SET_CHILD_SUBREAPER', 36), ('PR_GET_CHILD_SUBREAPER', 37)]:
            require(re.search(r'^#define\s+' + name + r'\s+' + str(number) + r'\s*$', header, re.M),
                    'Installed official header differs: ' + name)
        report['kernelHeaderSha256'] = hashlib.sha256(header.encode()).hexdigest()
        libc = ctypes.CDLL(None, use_errno=True)
        libc.prctl.restype = ctypes.c_int
        flag = ctypes.c_int(-1)
        zero = ctypes.c_ulong(0)
        require(libc.prctl(37, ctypes.byref(flag), zero, zero, zero) == 0 and flag.value == 0,
                'New own controller must start with subreaper disabled')
        require(libc.prctl(36, ctypes.c_ulong(1), zero, zero, zero) == 0, 'Own process-local SET failed')
        require(libc.prctl(37, ctypes.byref(flag), zero, zero, zero) == 0 and flag.value == 1,
                'Own process-local GET did not confirm enabled')
        me = identity(os.getpid())
        write(root, 'controller-created.json', me)
        old = subprocess.Popen([sys.executable, '-I', str(SOURCE), 'old', str(root)],
                               stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                               stderr=subprocess.DEVNULL, close_fds=True)
        chain = read_when(root, 'old-ready.json')
        require(chain['old']['pid'] == old.pid and chain['old']['ppid'] == me['pid'], 'Old chain mismatch')
        require(identity(old.pid) == chain['old'], 'Retained old identity changed')
        new = chain['createdNew']
        require(identity(new['pid']) == new and new['ppid'] == old.pid, 'Live pre-adoption chain mismatch')
        require(new['sourceSha256'] == SOURCE_SHA and new['executableSha256'] == me['executableSha256'],
                'Own new interpreter/source changed')
        write(root, 'controller-before-ack.json', dict(old=chain['old'], new=new))
        old_code = old.wait(timeout=12)
        report['oldExitCode'] = old_code
        require(old_code == 0, 'Own old parent did not exit0')
        adopted = read_when(root, 'new-adopted.json')
        require(stable(adopted) == stable(new) and adopted['ppid'] == me['pid'], 'Adopted identity mismatch')
        require(identity(new['pid']) == adopted, 'Actual adopted /proc identity differs')
        write(root, 'controller-adopted-ack.json', adopted)
        end = time.monotonic() + 12
        waited, status = 0, 0
        while time.monotonic() < end:
            waited, status = os.waitpid(new['pid'], os.WNOHANG)
            if waited:
                break
            time.sleep(.02)
        report.update(waitedPid=waited, rawWaitStatus=status, expectedNewPid=new['pid'],
                      normalNewExit=waited == new['pid'] and os.WIFEXITED(status),
                      newExitCode=os.WEXITSTATUS(status) if waited == new['pid'] and os.WIFEXITED(status) else None,
                      before=new, adopted=adopted)
        require(waited == new['pid'] and os.WIFEXITED(status) and os.WEXITSTATUS(status) == 0,
                'Exact adopted waitpid normal exit0 is unproven')
        require(read_when(root, 'old-exit-intent.json')['childStillRunning'], 'Old did not precede new exit')
        require(read_when(root, 'new-exit-intent.json')['identity'] == adopted, 'New terminal intent mismatch')
        require(not (Path('/proc') / str(me['pid']) / 'task' / str(me['pid']) / 'children').read_text().strip(),
                'Unexpected remaining own descendant; preserve')
        report['passed'] = True
    except Exception as error:
        report['error'] = type(error).__name__ + ': ' + str(error)
        # Fixed children have their own voluntary deadlines; never signal or kill.
        if old is not None:
            try:
                report['failureOldExitCode'] = old.wait(timeout=15)
            except subprocess.TimeoutExpired:
                report['retainedOldPid'] = old.pid
    finally:
        write(root, 'result.json', report)
    print(json.dumps(dict(passed=report['passed'], scope=report['scope'], result='result.json')))
    return 0 if report['passed'] else 2


def main():
    require(sys.platform == 'linux', 'Linux kernel prerequisite only')
    require(os.environ.get('GITHUB_ACTIONS') == 'true' and
            os.environ.get('RUNNER_ENVIRONMENT') == 'github-hosted', 'Dedicated hosted runner only')
    require(len(sys.argv) == 3 and sys.argv[1] in ['controller', 'old', 'new'], 'Fixed role/output arguments only')
    root = Path(sys.argv[2]).resolve()
    require(root.is_relative_to(Path(os.environ['RUNNER_TEMP']).resolve()) and
            root != Path(os.environ['RUNNER_TEMP']).resolve(), 'Private runner subdirectory required')
    return controller(root) if sys.argv[1] == 'controller' else child(root, sys.argv[1])


if __name__ == '__main__':
    raise SystemExit(main())
