import os
import sys
import unittest

sys.path.insert(0, os.path.abspath("/opt/code/wazuh_ova/web_app/backend"))

from app.services.compliance_service import (
    map_compliance_entries,
    normalize_agent,
    normalize_result_status,
    normalize_sca_check,
    normalize_sca_policy_summary,
    normalize_vulnerability,
)


class ComplianceServiceNormalizationTests(unittest.TestCase):
    def test_normalize_result_status(self):
        self.assertEqual(normalize_result_status("passed"), "passed")
        self.assertEqual(normalize_result_status("failed"), "failed")
        self.assertEqual(normalize_result_status("not applicable"), "not_applicable")
        self.assertEqual(normalize_result_status(None), "unknown")

    def test_map_compliance_entries(self):
        mapped = map_compliance_entries(
            [
                {"key": "pci_dss_v3.2.1", "value": "2.2, 10.1"},
                {"key": "nist_sp_800-53", "value": "CM-2, CM-6"},
                {"key": "iso_27001-2013", "value": "A.14.2.5"},
            ]
        )
        self.assertEqual(mapped["pci_dss"], ["2.2", "10.1"])
        self.assertEqual(mapped["nist"], ["CM-2", "CM-6"])
        self.assertEqual(mapped["iso27001"], ["A.14.2.5"])

    def test_normalize_agent(self):
        normalized = normalize_agent(
            {
                "id": "001",
                "name": "agent-1",
                "ip": "10.0.0.1",
                "status": "active",
                "manager": "default",
                "os": {"name": "Ubuntu", "version": "22.04"},
                "version": "Wazuh v4.14.5",
                "lastKeepAlive": "2026-05-21T10:00:00+00:00",
            }
        )
        self.assertEqual(normalized["agentId"], "001")
        self.assertEqual(normalized["group"], "default")
        self.assertEqual(normalized["os"], "Ubuntu")
        self.assertEqual(normalized["status"], "active")

    def test_normalize_sca_check(self):
        agent = normalize_agent({"id": "001", "name": "agent-1", "manager": "default", "status": "active", "os": {"name": "Ubuntu"}})
        policy = normalize_sca_policy_summary(
            {
                "policy_id": "cis_ubuntu",
                "name": "CIS Ubuntu",
                "pass": 100,
                "fail": 5,
                "invalid": 0,
                "score": 95,
                "total_checks": 105,
                "end_scan": "2026-05-21T10:00:00+00:00",
            },
            agent,
        )
        check = normalize_sca_check(
            {
                "id": 12345,
                "title": "Ensure example setting is configured.",
                "description": "description",
                "result": "failed",
                "compliance": [{"key": "pci_dss_v3.2.1", "value": "2.2"}],
                "rules": [{"type": "command", "rule": "c:test"}],
                "command": "test -f /tmp/example",
                "remediation": "fix it",
                "rationale": "important",
            },
            agent,
            policy,
        )
        self.assertEqual(check["status"], "failed")
        self.assertIn("pci_dss", check["frameworks"])
        self.assertEqual(check["compliance"]["pci_dss"], ["2.2"])
        self.assertEqual(check["evidence"]["agentId"], "001")

    def test_normalize_vulnerability(self):
        agent_lookup = {"001": {"agentId": "001", "name": "agent-1", "os": "Ubuntu"}}
        vulnerability = normalize_vulnerability(
            {
                "cve": "CVE-2026-0001",
                "severity": "High",
                "name": "openssl",
                "version": "1.0",
                "fix_version": "1.1",
                "reference": ["https://example.com/cve"],
                "agent": {"id": "001", "name": "agent-1"},
            },
            agent_lookup,
        )
        self.assertEqual(vulnerability["cve"], "CVE-2026-0001")
        self.assertEqual(vulnerability["severity"], "high")
        self.assertEqual(vulnerability["agentName"], "agent-1")
        self.assertEqual(vulnerability["references"], ["https://example.com/cve"])


if __name__ == "__main__":
    unittest.main()
