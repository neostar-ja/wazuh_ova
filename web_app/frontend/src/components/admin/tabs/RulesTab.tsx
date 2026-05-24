import { XmlFileEditor } from '../components/XmlFileEditor'
import { adminApi } from '../../../services/api'
import { parseRulesFromXml } from '../shared'

export function RulesTab() {
  return (
    <XmlFileEditor
      title="Rules"
      listFn={adminApi.listRules}
      getFn={adminApi.getRule}
      saveFn={adminApi.saveRule}
      parseItemsFn={parseRulesFromXml}
      itemLabel="Rules"
    />
  )
}
