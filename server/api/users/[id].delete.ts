import { getMockKv } from '../../utils/getMockKv';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "找不到使用者實體 ID" });
  }

  const cloudflare = event.context.cloudflare;
  let kvStore = cloudflare?.env?.RELAY_AUTH_STORE;

  if (!kvStore) {
    if (process.dev) {
      console.warn('[DEV] Cloudflare KV (RELAY_AUTH_STORE) 未綁定！Mock 模式下進行記憶體刪除。');
      kvStore = getMockKv();
    } else {
      throw createError({ statusCode: 500, statusMessage: "KV Store binding (RELAY_AUTH_STORE) is missing in production" });
    }
  }

  try {
    const key = `user:${id}`;
    console.log(`[DELETE API] Request to delete key: "${key}"`);
    await kvStore.delete(key);
    console.log(`[DELETE API] Successfully awaited kvStore.delete("${key}")`);
    return { success: true };
  } catch (error) {
    throw createError({ statusCode: 500, statusMessage: "刪除失敗：無法從 KV 刪除金鑰", cause: error });
  }
});
