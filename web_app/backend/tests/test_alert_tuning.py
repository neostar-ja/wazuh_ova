import os
import sys
import unittest
from types import SimpleNamespace

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
sys.path.insert(0, os.path.abspath("/opt/code/wazuh_ova/web_app/backend"))

from app.services.alert_tuning_service import _apply_alert_tuning, _compose_alert_id
from app.services.alert_tuning_history_service import record_tuning_history, serialize_history_entry
from app.services.wazuh_rule_tuning_service import _extract_rule_block, _tune_rule_block, build_wazuh_tuning_rules_xml


class AlertTuningTests(unittest.TestCase):
    def test_rule_tuning_changes_all_alerts_with_matching_rule_id(self):
        alerts = [
            {"@timestamp": "2026-06-17T00:46:32Z", "rule": {"id": "100500", "level": 15}, "agent": {"id": "001"}},
            {"@timestamp": "2026-06-17T00:47:32Z", "rule": {"id": "100500", "level": 15}, "agent": {"id": "001"}},
            {"@timestamp": "2026-06-17T00:48:32Z", "rule": {"id": "100501", "level": 15}, "agent": {"id": "001"}},
        ]
        tunings = [SimpleNamespace(rule_id="100500", original_level=15, tuned_level=12, reason="Allowed traffic is noisy")]

        _apply_alert_tuning(alerts, tunings, [])

        self.assertEqual(alerts[0]["rule"]["level"], 12)
        self.assertEqual(alerts[1]["rule"]["level"], 12)
        self.assertEqual(alerts[2]["rule"]["level"], 15)
        self.assertEqual(alerts[0]["soc_tuning"]["scope"], "rule")
        self.assertEqual(alerts[0]["soc_tuning"]["original_level"], 15)

    def test_single_alert_override_wins_over_rule_tuning(self):
        alert = {"@timestamp": "2026-06-17T00:46:32Z", "rule": {"id": "100500", "level": 15}, "agent": {"id": "001"}}
        alert_id = _compose_alert_id(alert)
        tunings = [SimpleNamespace(rule_id="100500", original_level=15, tuned_level=12, reason="Rule default")]
        overrides = [SimpleNamespace(alert_id=alert_id, original_level=15, tuned_level=7, reason="Single alert only")]

        _apply_alert_tuning([alert], tunings, overrides)

        self.assertEqual(alert["rule"]["level"], 7)
        self.assertEqual(alert["soc_tuning"]["scope"], "single")
        self.assertEqual(alert["soc_tuning"]["reason"], "Single alert only")

    def test_build_wazuh_tuning_rules_copies_rule_and_changes_only_level(self):
        source_xml = """<group name="soc_blocklist,threat_intel">
  <rule id="100500" level="15">
    <if_group>network</if_group>
    <list field="srcip" lookup="match_key">etc/lists/soc-custom-ioc-ip</list>
    <description>Malicious IP allowed</description>
  </rule>
  <rule id="100501" level="15"><description>Other</description></rule>
</group>"""

        block = _extract_rule_block(source_xml, "100500")
        tuned = _tune_rule_block(block, 12)
        generated = build_wazuh_tuning_rules_xml([
            {
                "rule_id": "100500",
                "original_level": 15,
                "tuned_level": 12,
                "reason": "Confirmed lower severity",
                "source_file": "soc_cdb_rules.xml",
                "rule_block": tuned,
            }
        ])

        self.assertIn('<rule id="100500" level="12" overwrite="yes">', generated)
        self.assertIn("<if_group>network</if_group>", generated)
        self.assertIn("<list field=\"srcip\" lookup=\"match_key\">etc/lists/soc-custom-ioc-ip</list>", generated)
        self.assertNotIn('id="100501"', generated)

    def test_record_tuning_history_persists_deploy_snapshot(self):
        class FakeDb:
            def add(self, entry):
                entry.id = 1

            def commit(self):
                pass

            def refresh(self, entry):
                pass

        entry = record_tuning_history(
            FakeDb(),
            actor="admin",
            action="deploy_wazuh",
            scope="rule",
            rule_id="100500",
            original_level=15,
            tuned_level=12,
            reason="Confirmed lower severity",
            deploy_snapshot={"filename": "soc_center_tuning_rules.xml", "rules": [{"rule_id": "100500"}]},
        )
        data = serialize_history_entry(entry)

        self.assertEqual(data["actor"], "admin")
        self.assertEqual(data["action"], "deploy_wazuh")
        self.assertEqual(data["scope"], "rule")
        self.assertEqual(data["rule_id"], "100500")
        self.assertEqual(data["deploy_snapshot"]["filename"], "soc_center_tuning_rules.xml")
        self.assertEqual(data["deploy_snapshot"]["rules"][0]["rule_id"], "100500")


if __name__ == "__main__":
    unittest.main()
