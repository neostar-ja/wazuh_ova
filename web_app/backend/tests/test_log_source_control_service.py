import os
import re
import sys
import unittest

sys.path.insert(0, os.path.abspath("/opt/code/wazuh_ova/web_app/backend"))

from app.services.log_source_control_service import (
    LOG_SOURCES,
    _suppress_all_levels,
)

RULES_DIR = "/opt/code/wazuh_ova/rules"


class SuppressAllLevelsTests(unittest.TestCase):
    def test_replaces_every_level_with_zero(self):
        xml = (
            '<rule id="101001" level="12">\n'
            '  <description>foo</description>\n'
            '</rule>\n'
            '<rule id="101050" level="3">\n'
            '  <if_sid>101001</if_sid>\n'
            '</rule>\n'
        )
        suppressed = _suppress_all_levels(xml)
        self.assertNotIn('level="12"', suppressed)
        self.assertNotIn('level="3"', suppressed)
        self.assertEqual(suppressed.count('level="0"'), 2)

    def test_preserves_structure_and_unrelated_attributes(self):
        xml = '<rule id="101052" level="4" frequency="20" timeframe="60">\n  <if_sid>101050</if_sid>\n</rule>\n'
        suppressed = _suppress_all_levels(xml)
        self.assertIn('id="101052"', suppressed)
        self.assertIn('frequency="20"', suppressed)
        self.assertIn('timeframe="60"', suppressed)
        self.assertIn('<if_sid>101050</if_sid>', suppressed)
        self.assertEqual(suppressed.count("\n"), xml.count("\n"))

    def test_idempotent(self):
        xml = '<rule id="100400" level="0">\n  <description>x</description>\n</rule>\n'
        once = _suppress_all_levels(xml)
        twice = _suppress_all_levels(once)
        self.assertEqual(once, twice)

    def test_already_zero_level_unaffected(self):
        xml = '<rule id="110000" level="0">\n  <if_group>fortigate</if_group>\n</rule>\n'
        self.assertEqual(_suppress_all_levels(xml), xml)


class RegistryAgainstRealRuleFilesTests(unittest.TestCase):
    """Apply the transform to the real custom rule files checked into the repo
    and confirm it fully neutralizes alert levels without mangling the file."""

    def test_registry_rule_files_exist(self):
        for source in LOG_SOURCES:
            for filename in source["rules_files"]:
                path = os.path.join(RULES_DIR, filename)
                self.assertTrue(os.path.isfile(path), f"missing rule file: {path}")

    def test_suppression_zeroes_every_rule_level(self):
        for source in LOG_SOURCES:
            for filename in source["rules_files"]:
                path = os.path.join(RULES_DIR, filename)
                with open(path, encoding="utf-8") as f:
                    original = f.read()

                suppressed = _suppress_all_levels(original)

                # Every level="N" must now be level="0"
                self.assertFalse(
                    re.search(r'level="[1-9]\d*"', suppressed),
                    f"non-zero level remained in {filename}",
                )
                # Re-applying is a no-op
                self.assertEqual(suppressed, _suppress_all_levels(suppressed))
                # Line count is unchanged (structure preserved)
                self.assertEqual(suppressed.count("\n"), original.count("\n"), filename)
                # Number of rule tags is unchanged
                self.assertEqual(
                    len(re.findall(r"<rule\b", suppressed)),
                    len(re.findall(r"<rule\b", original)),
                    filename,
                )


if __name__ == "__main__":
    unittest.main()
