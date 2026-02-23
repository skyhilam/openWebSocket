export default defineEventHandler(async (event) => {
  // Access KV from nitro context
  const cloudflare = event.context.cloudflare;
  let kvStore = cloudflare?.env?.RELAY_AUTH_STORE;

  if (!kvStore) {
    if (process.dev) {
      // 本地純 Nuxt dev 環境降級 (無 Wrangler 時)
      console.warn('[DEV] Cloudflare KV (RELAY_AUTH_STORE) 未綁定！現已降級為暫時性記憶體寫入，僅供前端開發測試。');
      kvStore = {
        put: async (key: string, value: string) => {
          console.log(`[Mock KV] Saved ${key} => ${value}`);
        }
      };
    } else {
      throw createError({ statusCode: 500, statusMessage: "KV Store binding (RELAY_AUTH_STORE) is missing in production" });
    }
  }

  const newUserId = crypto.randomUUID();
  const newToken = crypto.randomUUID().replace(/-/g, '');

  const record = {
    token: newToken,
    createdAt: new Date().toISOString()
  };

  await kvStore.put(`user:${newUserId}`, JSON.stringify(record));

  const host = getRequestHeader(event, 'host');
  // Usually the proxy adds x-forwarded-proto, else we assume wss in production
  const protocol = process.dev ? 'ws' : 'wss'; 

  return {
    userId: newUserId,
    token: newToken,
    hostUrl: `${protocol}://${host}/connect/${newUserId}?role=host&token=${newToken}`,
    clientUrl: `${protocol}://${host}/connect/${newUserId}?role=client&token=${newToken}`
  };
});
