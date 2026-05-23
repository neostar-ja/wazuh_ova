import io

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from ..routers.auth import get_current_user
from ..services import compliance_service

router = APIRouter(prefix="/compliance", tags=["compliance"])


def _build_filters(
    *,
    time_range: str = "7d",
    framework: str = "all",
    severity: str = "all",
    status: str = "all",
    agent_group: str = "all",
    agent_os: str = "all",
    search: str = "",
):
    return compliance_service.normalize_filters(
        time_range=time_range,
        framework=framework,
        severity=severity,
        status=status,
        agent_group=agent_group,
        agent_os=agent_os,
        search=search,
    )


@router.get("/summary")
async def summary(
    time_range: str = Query("7d"),
    framework: str = Query("all"),
    severity: str = Query("all"),
    status: str = Query("all"),
    agent_group: str = Query("all"),
    agent_os: str = Query("all"),
    search: str = Query(""),
    current_user=Depends(get_current_user),
):
    _ = current_user
    filters = _build_filters(
        time_range=time_range,
        framework=framework,
        severity=severity,
        status=status,
        agent_group=agent_group,
        agent_os=agent_os,
        search=search,
    )
    return await compliance_service.build_compliance_summary(filters)


@router.get("/frameworks")
async def frameworks(
    time_range: str = Query("7d"),
    framework: str = Query("all"),
    severity: str = Query("all"),
    status: str = Query("all"),
    agent_group: str = Query("all"),
    agent_os: str = Query("all"),
    search: str = Query(""),
    current_user=Depends(get_current_user),
):
    _ = current_user
    filters = _build_filters(
        time_range=time_range,
        framework=framework,
        severity=severity,
        status=status,
        agent_group=agent_group,
        agent_os=agent_os,
        search=search,
    )
    payload = await compliance_service.build_compliance_summary(filters)
    return {
        "meta": payload.get("meta", {}),
        "items": payload.get("frameworks", []),
        "charts": payload.get("charts", {}),
    }


@router.get("/agents")
async def agents(
    time_range: str = Query("7d"),
    framework: str = Query("all"),
    severity: str = Query("all"),
    status: str = Query("all"),
    agent_group: str = Query("all"),
    agent_os: str = Query("all"),
    search: str = Query(""),
    current_user=Depends(get_current_user),
):
    _ = current_user
    filters = _build_filters(
        time_range=time_range,
        framework=framework,
        severity=severity,
        status=status,
        agent_group=agent_group,
        agent_os=agent_os,
        search=search,
    )
    return await compliance_service.build_agents_dataset(filters)


@router.get("/sca")
async def sca(
    time_range: str = Query("7d"),
    agent_id: str | None = Query(None),
    policy_id: str | None = Query(None),
    framework: str = Query("all"),
    severity: str = Query("all"),
    status: str = Query("all"),
    agent_group: str = Query("all"),
    agent_os: str = Query("all"),
    search: str = Query(""),
    limit: int = Query(250, ge=1, le=1000),
    current_user=Depends(get_current_user),
):
    _ = current_user
    filters = _build_filters(
        time_range=time_range,
        framework=framework,
        severity=severity,
        status=status,
        agent_group=agent_group,
        agent_os=agent_os,
        search=search,
    )
    return await compliance_service.build_sca_dataset(filters, agent_id=agent_id, policy_id=policy_id, limit=limit)


@router.get("/vulnerabilities")
async def vulnerabilities(
    time_range: str = Query("7d"),
    agent_id: str | None = Query(None),
    framework: str = Query("all"),
    severity: str = Query("all"),
    status: str = Query("all"),
    agent_group: str = Query("all"),
    agent_os: str = Query("all"),
    search: str = Query(""),
    limit: int = Query(250, ge=1, le=1000),
    current_user=Depends(get_current_user),
):
    _ = current_user
    filters = _build_filters(
        time_range=time_range,
        framework=framework,
        severity=severity,
        status=status,
        agent_group=agent_group,
        agent_os=agent_os,
        search=search,
    )
    return await compliance_service.build_vulnerabilities_dataset(filters, agent_id=agent_id, limit=limit)


@router.get("/alerts")
async def alerts(
    time_range: str = Query("7d"),
    agent_id: str | None = Query(None),
    framework: str = Query("all"),
    severity: str = Query("all"),
    status: str = Query("all"),
    agent_group: str = Query("all"),
    agent_os: str = Query("all"),
    search: str = Query(""),
    limit: int = Query(200, ge=1, le=500),
    current_user=Depends(get_current_user),
):
    _ = current_user
    filters = _build_filters(
        time_range=time_range,
        framework=framework,
        severity=severity,
        status=status,
        agent_group=agent_group,
        agent_os=agent_os,
        search=search,
    )
    return await compliance_service.build_alerts_dataset(filters, agent_id=agent_id, limit=limit)


@router.get("/evidence")
async def evidence(
    time_range: str = Query("7d"),
    framework: str = Query("all"),
    severity: str = Query("all"),
    status: str = Query("all"),
    agent_group: str = Query("all"),
    agent_os: str = Query("all"),
    search: str = Query(""),
    limit: int = Query(250, ge=1, le=1000),
    current_user=Depends(get_current_user),
):
    _ = current_user
    filters = _build_filters(
        time_range=time_range,
        framework=framework,
        severity=severity,
        status=status,
        agent_group=agent_group,
        agent_os=agent_os,
        search=search,
    )
    return await compliance_service.build_evidence_dataset(filters, limit=limit)


@router.get("/export")
async def export_dataset(
    dataset: str = Query("evidence"),
    format: str = Query("csv"),
    time_range: str = Query("7d"),
    framework: str = Query("all"),
    severity: str = Query("all"),
    status: str = Query("all"),
    agent_group: str = Query("all"),
    agent_os: str = Query("all"),
    search: str = Query(""),
    current_user=Depends(get_current_user),
):
    _ = current_user
    filters = _build_filters(
        time_range=time_range,
        framework=framework,
        severity=severity,
        status=status,
        agent_group=agent_group,
        agent_os=agent_os,
        search=search,
    )

    if dataset == "agents":
        payload = await compliance_service.build_agents_dataset(filters)
        items = payload.get("items", [])
    elif dataset == "sca":
        payload = await compliance_service.build_sca_dataset(filters, limit=1000)
        items = payload.get("checks", [])
    elif dataset == "vulnerabilities":
        payload = await compliance_service.build_vulnerabilities_dataset(filters, limit=1000)
        items = payload.get("items", [])
    elif dataset == "alerts":
        payload = await compliance_service.build_alerts_dataset(filters, limit=500)
        items = payload.get("items", [])
    else:
        payload = await compliance_service.build_evidence_dataset(filters, limit=1000)
        items = payload.get("items", [])

    if format == "json":
        return {"meta": payload.get("meta", {}), "items": items}

    content = compliance_service.dataset_to_csv_bytes(items)
    filename = f"compliance-{dataset}-{filters['timeRange']}.csv"
    return StreamingResponse(
        io.BytesIO(content),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
