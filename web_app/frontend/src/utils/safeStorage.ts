const memoryStore = new Map<string, string>()

let storageChecked = false
let storageAvailable = false

function resolveStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  if (!storageChecked) {
    try {
      const testKey = '__soc_storage_probe__'
      window.localStorage.setItem(testKey, '1')
      window.localStorage.removeItem(testKey)
      storageAvailable = true
    } catch {
      storageAvailable = false
    }
    storageChecked = true
  }
  return storageAvailable ? window.localStorage : null
}

export const safeStorage = {
  getItem(key: string): string | null {
    const storage = resolveStorage()
    if (storage) {
      try {
        return storage.getItem(key)
      } catch {
        storageAvailable = false
      }
    }
    return memoryStore.get(key) ?? null
  },

  setItem(key: string, value: string): void {
    const storage = resolveStorage()
    if (storage) {
      try {
        storage.setItem(key, value)
        return
      } catch {
        storageAvailable = false
      }
    }
    memoryStore.set(key, value)
  },

  removeItem(key: string): void {
    const storage = resolveStorage()
    if (storage) {
      try {
        storage.removeItem(key)
      } catch {
        storageAvailable = false
      }
    }
    memoryStore.delete(key)
  },

  clear(): void {
    const storage = resolveStorage()
    if (storage) {
      try {
        storage.clear()
      } catch {
        storageAvailable = false
      }
    }
    memoryStore.clear()
  },
}

export default safeStorage
