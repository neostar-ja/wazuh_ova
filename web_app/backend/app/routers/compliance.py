from fastapi import APIRouter, Depends, Query
from ..routers.auth import get_current_user
from ..services import opensearch_service, wazuh_service

router = APIRouter(prefix="/compliance", tags=["compliance"])


@router.get("/summary")
async def summary(time_range: str = Query("7d"), current_user=Depends(get_current_user)):
    results = {}
    for fw in ["pci_dss", "hipaa", "gdpr", "nist", "tsc"]:
        data = await opensearch_service.get_compliance_stats(fw, time_range)
        aggs = data.get("aggregations", {})
        results[fw] = {
            "total": data.get("hits", {}).get("total", {}).get("value", 0),
            "top_requirements": [
                {"req": b["key"], "count": b["doc_count"]}
                for b in aggs.get("by_requirement", {}).get("buckets", [])[:10]
            ],
        }
    return results


@router.get("/sca")
async def sca(agent_id: str = Query("000"), current_user=Depends(get_current_user)):
    try:
        return await wazuh_service.get_sca_results(agent_id)
    except Exception as e:
        return {"error": str(e)}


@router.get("/vulnerabilities")
async def vulnerabilities(agent_id: str = Query("000"), current_user=Depends(get_current_user)):
    try:
        return await wazuh_service.get_vulnerabilities(agent_id)
    except Exception as e:
        return {"error": str(e)}
