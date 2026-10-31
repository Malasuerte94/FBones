"""Run: python3 scripts/test-windows-delivery.py"""
import tempfile
import unittest
from pathlib import Path
from windows_delivery import publish_binary


class DeliveryTests(unittest.TestCase):
    def test_updates_choose_a_new_image_and_keep_the_running_build_intact(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source, output = root / 'source.exe', root / 'delivery'
            source.write_bytes(b'own build A')
            first, digest = publish_binary(source, output)
            with (output / first).open('rb') as running:
                self.assertEqual(publish_binary(source, output), (first, digest))
                source.write_bytes(b'own build B')
                second, _ = publish_binary(source, output)
                self.assertNotEqual(first, second)
                self.assertEqual(running.read(), b'own build A')
                self.assertEqual((output / first).read_bytes(), b'own build A')
                self.assertEqual((output / second).read_bytes(), b'own build B')

    def test_a_modified_immutable_image_is_never_silently_replaced(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source, output = root / 'source.exe', root / 'delivery'
            source.write_bytes(b'own build')
            first, _ = publish_binary(source, output)
            (output / first).write_bytes(b'changed externally')
            with self.assertRaises(ValueError):
                publish_binary(source, output)
            self.assertEqual((output / first).read_bytes(), b'changed externally')


if __name__ == '__main__':
    unittest.main()
