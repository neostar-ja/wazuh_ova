import { XmlFileEditor } from '../components/XmlFileEditor'
import { adminApi } from '../../../services/api'
import { parseDecodersFromXml } from '../shared'

export function DecodersTab() {
  return (
    <XmlFileEditor
      title="Decoders"
      listFn={adminApi.listDecoders}
      getFn={adminApi.getDecoder}
      saveFn={adminApi.saveDecoder}
      parseItemsFn={parseDecodersFromXml}
      itemLabel="Decoders"
    />
  )
}
