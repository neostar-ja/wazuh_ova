#!/usr/bin/env python3
import json
import os
import runpy
import sys
import tempfile
import types
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
from unittest.mock import patch


REPO_ROOT = Path(__file__).resolve().parents[2]
RULES_FILE = REPO_ROOT / "rules" / "local_rules.xml"
GENERIC_TELEGRAM_SCRIPTS = [
    REPO_ROOT / "integrations" / "master" / "custom-telegram.py",
    REPO_ROOT / "integrations" / "worker" / "custom-telegram.py",
]


class FakeRequestsModule:
    def __init__(self) -> None:
        self.calls = []

    def post(self, *args, **kwargs):
        self.calls.append((args, kwargs))
        return types.SimpleNamespace(status_code=200, text="ok")


def run_script(script_path: Path, level: int) -> FakeRequestsModule:
    fake_requests = FakeRequestsModule()
    payload = {
        "rule": {
            "id": "100300",
            "level": level,
            "description": "CDB Blocklist: Source IP 45.148.10.67 matches malicious-ip list",
            "groups": ["cdb_intel", "cdb_malicious_ip", "attacks"],
        },
        "agent": {"name": "wazuh-worker"},
        "data": {"srcip": "45.148.10.67"},
    }

    with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".json", delete=False) as handle:
        json.dump(payload, handle)
        alert_file = handle.name

    argv = [str(script_path), alert_file, "123456", "https://example.invalid/bot/sendMessage"]
    try:
        with patch.object(sys, "argv", argv):
            with patch.dict(sys.modules, {"requests": fake_requests}):
                try:
                    runpy.run_path(str(script_path), run_name="__main__")
                except SystemExit as exc:
                    if exc.code not in (0, None):
                        raise
    finally:
        os.unlink(alert_file)

    return fake_requests


class TelegramThresholdTests(unittest.TestCase):
    def test_cdb_source_ip_rule_is_level_10(self) -> None:
        root = ET.parse(RULES_FILE).getroot()
        rule = root.find(".//rule[@id='100300']")
        self.assertIsNotNone(rule)
        self.assertEqual(rule.attrib.get("level"), "10")

    def test_level_10_alert_is_suppressed_by_generic_telegram_scripts(self) -> None:
        for script_path in GENERIC_TELEGRAM_SCRIPTS:
            with self.subTest(script=str(script_path)):
                fake_requests = run_script(script_path, 10)
                self.assertEqual(fake_requests.calls, [])

    def test_level_12_alert_is_sent_by_generic_telegram_scripts(self) -> None:
        for script_path in GENERIC_TELEGRAM_SCRIPTS:
            with self.subTest(script=str(script_path)):
                fake_requests = run_script(script_path, 12)
                self.assertEqual(len(fake_requests.calls), 1)


if __name__ == "__main__":
    unittest.main()
