import { createStorage } from 'unstorage';
import fsLiteDriver from 'unstorage/drivers/fs-lite';

let mockKvStorage: ReturnType<typeof createStorage> | null = null;

export function getMockKv() {
  if (!mockKvStorage) {
    mockKvStorage = createStorage({
      driver: fsLiteDriver({ base: './.data/mock-kv' })
    });
  }
  
  const storage = mockKvStorage;

  return {
    get: async (key: string) => {
      const val = await storage.getItem(key);
      if (val === null || val === undefined) return null;
      // unstorage autoconverts JSON if valid, but existing code expects string
      return typeof val === 'string' ? val : JSON.stringify(val);
    },
    put: async (key: string, value: string) => { 
      await storage.setItem(key, value); 
    },
    delete: async (key: string) => { 
      await storage.removeItem(key); 
    },
    list: async (options?: { prefix?: string }) => {
      const allKeys = await storage.getKeys();
      const keys = [];
      for (const key of allKeys) {
        // Replace unstorage's internal `:` conversion if any, although unstorage usually keeps `:` in the key returned by getKeys()
        if (!options?.prefix || key.startsWith(options.prefix)) {
          keys.push({ name: key });
        }
      }
      return { keys, list_complete: true, cursor: '' };
    }
  };
}
