export function getMockKv() {
  const g = globalThis as any;
  if (!g.__MOCK_KV__) {
    g.__MOCK_KV__ = new Map<string, string>();
  }
  
  const map = g.__MOCK_KV__ as Map<string, string>;

  return {
    get: async (key: string) => map.get(key) || null,
    put: async (key: string, value: string) => { map.set(key, value); },
    delete: async (key: string) => { map.delete(key); },
    list: async (options?: { prefix?: string }) => {
      const keys = [];
      for (const key of map.keys()) {
        if (!options?.prefix || key.startsWith(options.prefix)) {
          keys.push({ name: key });
        }
      }
      return { keys, list_complete: true, cursor: '' };
    }
  };
}
