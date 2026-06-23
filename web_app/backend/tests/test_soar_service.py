import os
import sys
import unittest
from unittest.mock import AsyncMock, patch

sys.path.insert(0, os.path.abspath("/opt/code/wazuh_ova/web_app/backend"))

from app.services import soar_svc


class SoarServiceCaseStateTests(unittest.IsolatedAsyncioTestCase):
    async def test_get_iris_alerts_builds_server_side_filter_query(self):
        with patch.object(soar_svc, "_iris_get", new=AsyncMock(return_value={"status": "success"})) as mock_get:
            await soar_svc.get_iris_alerts(
                page=3,
                per_page=25,
                status_id=2,
                severity_id=4,
                q="45.148.10.67",
            )

        mock_get.assert_awaited_once_with(
            "/alerts/filter?page=3&per_page=25&alert_status_id=2&alert_severity_id=4&alert_title=45.148.10.67"
        )

    async def test_get_iris_case_uses_manage_cases_detail_path(self):
        with patch.object(soar_svc, "_iris_get", new=AsyncMock(return_value={"status": "success"})) as mock_get:
            await soar_svc.get_iris_case(42)

        mock_get.assert_awaited_once_with("/manage/cases/42")

    async def test_update_iris_case_uses_manage_cases_update_path(self):
        with patch.object(soar_svc, "_iris_post", new=AsyncMock(return_value={"status": "success"})) as mock_post:
            await soar_svc.update_iris_case(42, {"state_id": 4})

        mock_post.assert_awaited_once_with("/manage/cases/update/42", {"state_id": 4})

    async def test_close_iris_case_uses_v2_close_endpoint(self):
        with patch.object(soar_svc, "_iris_post", new=AsyncMock(return_value={"status": "success"})) as mock_post:
            await soar_svc.close_iris_case(42)

        mock_post.assert_awaited_once_with("/manage/cases/close/42", {})

    async def test_reopen_iris_case_uses_v2_reopen_endpoint(self):
        with patch.object(soar_svc, "_iris_post", new=AsyncMock(return_value={"status": "success"})) as mock_post:
            await soar_svc.reopen_iris_case(42)

        mock_post.assert_awaited_once_with("/manage/cases/reopen/42", {})

    async def test_set_iris_case_state_updates_state_id(self):
        with (
            patch.object(
                soar_svc,
                "get_iris_case_states",
                new=AsyncMock(return_value={"data": [{"state_id": 9, "state_name": "Closed"}]}),
            ),
            patch.object(
                soar_svc,
                "get_iris_case",
                new=AsyncMock(
                    side_effect=[
                        {"data": {"state_id": 3, "state_name": "Open", "close_date": None}},
                        {"data": {"state_id": 4, "state_name": "Containment", "close_date": None}},
                    ]
                ),
            ),
            patch.object(soar_svc, "update_iris_case", new=AsyncMock(return_value={"status": "success"})) as mock_update,
            patch.object(soar_svc, "reopen_iris_case", new=AsyncMock(return_value={"status": "success"})) as mock_reopen,
            patch.object(soar_svc, "close_iris_case", new=AsyncMock(return_value={"status": "success"})) as mock_close,
        ):
            result = await soar_svc.set_iris_case_state(4, 4)

        mock_update.assert_awaited_once_with(4, {"state_id": 4})
        mock_reopen.assert_not_awaited()
        mock_close.assert_not_awaited()
        self.assertEqual(result["state_id"], 4)
        self.assertEqual(result["case"]["state_name"], "Containment")

    async def test_set_iris_case_state_reopens_closed_case_before_update(self):
        with (
            patch.object(
                soar_svc,
                "get_iris_case_states",
                new=AsyncMock(return_value={"data": [{"state_id": 9, "state_name": "Closed"}]}),
            ),
            patch.object(
                soar_svc,
                "get_iris_case",
                new=AsyncMock(
                    side_effect=[
                        {"data": {"state_id": 9, "state_name": "Closed", "close_date": "2026-06-16T10:00:00"}},
                        {"data": {"state_id": 2, "state_name": "In progress", "close_date": None}},
                    ]
                ),
            ),
            patch.object(soar_svc, "reopen_iris_case", new=AsyncMock(return_value={"status": "success"})) as mock_reopen,
            patch.object(soar_svc, "update_iris_case", new=AsyncMock(return_value={"status": "success"})) as mock_update,
        ):
            result = await soar_svc.set_iris_case_state(4, 2)

        mock_reopen.assert_awaited_once_with(4)
        mock_update.assert_awaited_once_with(4, {"state_id": 2})
        self.assertEqual(result["case"]["state_name"], "In progress")

    async def test_set_iris_case_state_closes_via_close_endpoint(self):
        with (
            patch.object(
                soar_svc,
                "get_iris_case_states",
                new=AsyncMock(return_value={"data": [{"state_id": 9, "state_name": "Closed"}]}),
            ),
            patch.object(
                soar_svc,
                "get_iris_case",
                new=AsyncMock(
                    side_effect=[
                        {"data": {"state_id": 3, "state_name": "Open", "close_date": None}},
                        {"data": {"state_id": 9, "state_name": "Closed", "close_date": "2026-06-16T11:00:00"}},
                    ]
                ),
            ),
            patch.object(soar_svc, "close_iris_case", new=AsyncMock(return_value={"status": "success"})) as mock_close,
            patch.object(soar_svc, "update_iris_case", new=AsyncMock(return_value={"status": "success"})) as mock_update,
        ):
            result = await soar_svc.set_iris_case_state(4, 9)

        mock_close.assert_awaited_once_with(4)
        mock_update.assert_not_awaited()
        self.assertEqual(result["state_id"], 9)
        self.assertEqual(result["case"]["state_name"], "Closed")


class SoarServiceAlertDetailTests(unittest.IsolatedAsyncioTestCase):
    def test_extract_iris_alert_detail_returns_first_alert(self):
        payload = {"data": {"alerts": [{"alert_id": 99, "alert_title": "Test"}]}}

        self.assertEqual(soar_svc.extract_iris_alert_detail(payload)["alert_id"], 99)

    def test_extract_iris_alert_detail_returns_empty_dict_for_missing_alerts(self):
        self.assertEqual(soar_svc.extract_iris_alert_detail({"data": {"alerts": []}}), {})

    async def test_get_iris_alert_detail_enriches_wazuh_context(self):
        iris_payload = {
            "status": "success",
            "data": {
                "alerts": [{
                    "alert_id": 42,
                    "alert_title": "Matched alert",
                    "alert_source_link": "https://10.251.151.14/app/wazuh",
                    "alert_source_ref": "100300",
                    "alert_source_event_time": "2026-06-17T01:22:49.939000",
                    "iocs": [{"ioc_value": "80.82.77.202"}],
                }]
            },
        }
        matched_event = {
            "@timestamp": "2026-06-17T01:22:50.000Z",
            "rule": {"id": "100300", "level": 10, "description": "Rule match", "groups": ["threat_intel"]},
            "agent": {"name": "wazuh-worker"},
            "data": {"srcip": "80.82.77.202"},
            "full_log": "full log",
        }

        with (
            patch.object(soar_svc, "_iris_get", new=AsyncMock(return_value=iris_payload)),
            patch.object(soar_svc, "search_alert_context_candidates", new=AsyncMock(return_value=[matched_event]), create=True),
        ):
            result = await soar_svc.get_iris_alert_detail(42)

        self.assertEqual(result["data"]["alert"]["alert_id"], 42)
        self.assertEqual(result["data"]["source_context"]["status"], "matched")
        self.assertEqual(result["data"]["source_context"]["match_strategy"], "rule_ioc_time")
        self.assertEqual(result["data"]["wazuh_context"]["summary"]["rule_id"], "100300")
        self.assertEqual(result["data"]["wazuh_context"]["summary"]["agent_name"], "wazuh-worker")

    async def test_get_iris_alert_detail_returns_not_found_when_no_wazuh_match(self):
        iris_payload = {
            "status": "success",
            "data": {
                "alerts": [{
                    "alert_id": 7,
                    "alert_title": "Missing context",
                    "alert_source_link": "https://10.251.151.14/app/wazuh",
                    "alert_source_event_time": "2026-06-17T01:22:49.939000",
                    "iocs": [],
                }]
            },
        }

        with (
            patch.object(soar_svc, "_iris_get", new=AsyncMock(return_value=iris_payload)),
            patch.object(soar_svc, "search_alert_context_candidates", new=AsyncMock(return_value=[]), create=True),
        ):
            result = await soar_svc.get_iris_alert_detail(7)

        self.assertEqual(result["data"]["source_context"]["status"], "not_found")
        self.assertIsNone(result["data"]["wazuh_context"]["primary_event"])

    async def test_get_iris_alert_statuses_uses_manage_alert_status_list(self):
        with patch.object(soar_svc, "_iris_get", new=AsyncMock(return_value={"status": "success"})) as mock_get:
            await soar_svc.get_iris_alert_statuses()

        mock_get.assert_awaited_once_with("/manage/alert-status/list")

    async def test_get_iris_severities_uses_manage_severities_list(self):
        with patch.object(soar_svc, "_iris_get", new=AsyncMock(return_value={"status": "success"})) as mock_get:
            await soar_svc.get_iris_severities()

        mock_get.assert_awaited_once_with("/manage/severities/list")


if __name__ == "__main__":
    unittest.main()
