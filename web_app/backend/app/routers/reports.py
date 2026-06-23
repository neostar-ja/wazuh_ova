import io
import csv
from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, List
import pandas as pd

from ..routers.auth import get_current_user
from ..models.database import get_db, CaseTask, CaseActivityLog, ShuffleActionHistory
from ..services import opensearch_service
from ..services import soar_svc
from ..routers.alerts import _resolve_source

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/incident-cases")
async def get_incident_cases_report(
    time_range: str = Query("7d"),
    limit: int = Query(500, le=5000),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Fetch Level 12+ Wazuh Alerts
    alerts = await opensearch_service.get_alerts(
        size=limit,
        level_min=12,
        time_range=time_range
    )
    
    # 2. Fetch IRIS Cases (to check if any cases are associated)
    iris_cases_resp = await soar_svc.get_iris_cases(page=1, per_page=100)
    iris_cases = []
    if isinstance(iris_cases_resp, dict) and "data" in iris_cases_resp:
        iris_cases = iris_cases_resp.get("data", [])
        
    # Map IRIS cases to ease searching (best effort match by title or description containing rule ID / srcip)
    # Also fetch tasks/actions for cases to summarize
    case_summaries = {}
    for c in iris_cases:
        cid = c.get("case_id")
        if not cid: continue
        
        tasks = db.query(CaseTask).filter(CaseTask.iris_case_id == cid).all()
        logs = db.query(CaseActivityLog).filter(CaseActivityLog.iris_case_id == cid).all()
        shuffles = db.query(ShuffleActionHistory).filter(ShuffleActionHistory.iris_case_id == cid).all()
        
        actions = []
        for t in tasks: actions.append(f"Task: {t.title} ({t.status})")
        for l in logs: actions.append(f"Log: {l.action}")
        for s in shuffles: actions.append(f"SOAR: {s.action_type}")
        
        case_summaries[cid] = {
            "case_id": cid,
            "name": c.get("case_name"),
            "description": c.get("case_description", ""),
            "status": c.get("status", {}).get("status_name", "Open"),
            "actions_taken": actions
        }

    report_data = []
    for a in alerts:
        rule = a.get("rule", {})
        rule_id = str(rule.get("id", ""))
        rule_desc = rule.get("description", "")
        data = a.get("data", {})
        srcip = data.get("srcip", "")
        
        # Best effort mapping: check if any case title or description has rule_desc or srcip or rule_id
        linked_case = None
        for cid, csum in case_summaries.items():
            name_desc = (csum["name"] + " " + csum["description"]).lower()
            if (rule_id and rule_id in name_desc) or (srcip and srcip in name_desc) or (rule_desc and rule_desc.lower() in name_desc):
                linked_case = csum
                break
                
        actions_str = ""
        case_info = ""
        if linked_case:
            case_info = f"Case #{linked_case['case_id']}: {linked_case['name']} ({linked_case['status']})"
            if linked_case["actions_taken"]:
                actions_str = " | ".join(linked_case["actions_taken"][:5])
                if len(linked_case["actions_taken"]) > 5:
                    actions_str += " ... (+more)"
            else:
                actions_str = "No actions recorded"
        else:
            case_info = "No Case"
            actions_str = "-"

        report_data.append({
            "timestamp": a.get("@timestamp", ""),
            "level": rule.get("level", ""),
            "rule_id": rule_id,
            "description": rule_desc,
            "source": _resolve_source(a),
            "srcip": srcip,
            "country": a.get("GeoLocation", {}).get("country_name", ""),
            "agent": a.get("agent", {}).get("name", ""),
            "case_info": case_info,
            "actions_taken": actions_str,
            "raw_alert": a
        })
        
    return {"data": report_data, "total": len(report_data)}


@router.get("/incident-cases/export")
async def export_incident_cases_report(
    fmt: str = Query("csv"),
    time_range: str = Query("7d"),
    limit: int = Query(5000, le=10000),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Re-use logic to get report_data
    result = await get_incident_cases_report(time_range=time_range, limit=limit, current_user=current_user, db=db)
    report_data = result["data"]
    
    fields = [
        "timestamp", "level", "rule_id", "description", "source", 
        "srcip", "country", "agent", "case_info", "actions_taken"
    ]
    
    if fmt == "excel":
        buf = io.BytesIO()
        df = pd.DataFrame([{k: v for k, v in row.items() if k in fields} for row in report_data])
        # Reorder columns
        if not df.empty:
            df = df[fields]
        df.to_excel(buf, index=False, engine='openpyxl')
        content = buf.getvalue()
        return StreamingResponse(
            io.BytesIO(content),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="incident-reports-{time_range}.xlsx"'}
        )
    else:
        # CSV
        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        for row in report_data:
            writer.writerow(row)
        content = buf.getvalue().encode("utf-8-sig")
        return StreamingResponse(
            io.BytesIO(content),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="incident-reports-{time_range}.csv"'}
        )
