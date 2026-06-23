import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../../services/api'

export function useAttackMapData(timeRange: string) {
  return useQuery({
    queryKey: ['attack-map', timeRange],
    queryFn: () => dashboardApi.attackMap(timeRange).then(r => r.data),
    refetchInterval: 30000,
    staleTime: 15000,
  })
}

export default useAttackMapData
