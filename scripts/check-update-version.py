#!/usr/bin/env python3
"""Reject a release that installed updater clients would not consider newer."""
import argparse
import json
import os
from pathlib import Path
import re
import tomllib
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
ENDPOINT = 'https://github.com/Malasuerte94/FBones/releases/latest/download/latest.json'
RELEASE_API = 'https://api.github.com/repos/Malasuerte94/FBones/releases/latest'


class SecureRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, newurl):
        if urllib.parse.urlparse(newurl).scheme != 'https':
            raise ValueError('Update version checks must retain HTTPS.')
        redirected = super().redirect_request(request, fp, code, message, headers, newurl)
        if urllib.parse.urlparse(newurl).netloc != urllib.parse.urlparse(request.full_url).netloc:
            redirected.remove_header('Authorization')
        return redirected


def fetch(url):
    headers = {'User-Agent': 'FBones-release-version-gate', 'Accept': 'application/json'}
    if url == RELEASE_API and os.environ.get('GH_TOKEN'):
        headers['Authorization'] = 'Bearer ' + os.environ['GH_TOKEN']
    opener = urllib.request.build_opener(SecureRedirect())
    with opener.open(urllib.request.Request(url, headers=headers), timeout=30) as response:
        data = response.read(1024 * 1024 + 1)
        if len(data) > 1024 * 1024:
            raise ValueError('Update version metadata is unexpectedly large.')
        return json.loads(data)


def semver(value):
    if not isinstance(value, str) or not re.fullmatch(r'(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)', value):
        raise ValueError('Installed application versions must be plain increasing SemVer values.')
    return tuple(int(part) for part in value.split('.'))


def application_version():
    version = json.loads((ROOT / 'package.json').read_text())['version']
    tauri = json.loads((ROOT / 'src-tauri/tauri.conf.json').read_text())['version']
    cargo = tomllib.loads((ROOT / 'Cargo.toml').read_text())['workspace']['package']['version']
    if version != tauri or version != cargo:
        raise ValueError('Application package, Tauri and Cargo versions must match before publication.')
    semver(version)
    return version


def check(next_version):
    next_parts = semver(next_version)
    try:
        current = fetch(ENDPOINT)
    except urllib.error.HTTPError as error:
        if error.code != 404:
            raise ValueError('Cannot verify the current updater version; publication stopped.') from error
        latest = fetch(RELEASE_API)
        # Only the independently observed pre-updater release may bootstrap a
        # missing manifest. A later missing/deleted asset must not reset history.
        if (latest.get('id') != 438467646 or latest.get('tag_name') != 'v0.9.4-beta.6'
                or latest.get('draft') is not False or latest.get('prerelease') is not False
                or any(asset.get('name') == 'latest.json' for asset in latest.get('assets', []))
                or next_parts <= semver('0.9.4')):
            raise ValueError('Missing updater manifest is not the accepted beta6 bootstrap state.')
        print(f'First signed updater publication: application {next_version}.')
        return
    if next_parts <= semver(current.get('version')):
        raise ValueError('Application version must increase beyond the published updater version; changing only a beta tag cannot update installed apps.')
    print(f'Updater application version increases from {current["version"]} to {next_version}.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    args = parser.parse_args()
    try:
        check(application_version())
    except (ValueError, OSError, urllib.error.URLError) as error:
        parser.exit(1, f'{error}\n')
