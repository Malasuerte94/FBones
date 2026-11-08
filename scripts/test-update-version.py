#!/usr/bin/env python3
"""Updater version publication checks with no network calls."""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
from urllib.error import HTTPError, URLError
from urllib.request import Request

spec = importlib.util.spec_from_file_location('update_version_gate', Path(__file__).with_name('check-update-version.py'))
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


class UpdateVersionTests(unittest.TestCase):
    def test_newer_only_and_plain_installed_versions(self):
        for current, candidate, valid in [('0.9.5', '0.9.6', True), ('0.9.9', '0.10.0', True),
                                         ('0.9.5', '0.9.5', False), ('0.9.6', '0.9.5', False),
                                         ('0.9.5-beta.1', '0.9.6', False), ('0.9.5', '0.9.6-beta.1', False)]:
            with self.subTest(current=current, candidate=candidate), patch.object(gate, 'fetch', return_value={'version': current}):
                if valid:
                    gate.check(candidate)
                else:
                    with self.assertRaises(ValueError):
                        gate.check(candidate)

    def test_only_known_pre_updater_release_can_bootstrap_404(self):
        latest = {'id': 438467646, 'tag_name': 'v0.9.4-beta.6', 'draft': False, 'prerelease': False, 'assets': []}
        missing = HTTPError(gate.ENDPOINT, 404, 'Not found', {}, None)
        with patch.object(gate, 'fetch', side_effect=[missing, latest]):
            gate.check('0.9.5')
        for candidate in ('0.9.3', '0.9.4'):
            with self.subTest(candidate=candidate), patch.object(gate, 'fetch', side_effect=[missing, latest]):
                with self.assertRaises(ValueError):
                    gate.check(candidate)
        for change in ({'id': 1}, {'tag_name': 'v0.9.5-beta.1'}, {'draft': True},
                       {'prerelease': True}, {'assets': [{'name': 'latest.json'}]}):
            with self.subTest(change=change), patch.object(gate, 'fetch', side_effect=[missing, {**latest, **change}]):
                with self.assertRaises(ValueError):
                    gate.check('0.9.6')

    def test_network_and_non_404_http_failures_do_not_look_like_first_release(self):
        for error in [HTTPError(gate.ENDPOINT, 403, 'Forbidden', {}, None),
                      HTTPError(gate.ENDPOINT, 500, 'Unavailable', {}, None), URLError('Offline')]:
            with self.subTest(error=type(error)), patch.object(gate, 'fetch', side_effect=error):
                with self.assertRaises((ValueError, URLError)):
                    gate.check('0.9.5')

    def test_redirects_retain_https_and_drop_credentials_on_another_host(self):
        request = Request(gate.RELEASE_API, headers={'Authorization': 'Bearer own-fixture'})
        redirect = gate.SecureRedirect()
        result = redirect.redirect_request(request, None, 302, 'Found', {}, 'https://example.com/asset')
        self.assertFalse(result.has_header('Authorization'))
        with self.assertRaises(ValueError):
            redirect.redirect_request(request, None, 302, 'Found', {}, 'http://example.com/asset')


if __name__ == '__main__':
    unittest.main()
