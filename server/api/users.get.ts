import { getMockKv } from '../utils/getMockKv';

export default defineEventHandler(async (event) => {
  const cloudflare = event.context.cloudflare;
  let kvStore = cloudflare?.env?.RELAY_AUTH_STORE;

  if (!kvStore) {
    if (process.dev) {
      console.warn('[DEV] Cloudflare KV (RELAY_AUTH_STORE) 未綁定！回傳記憶體 Mock 列表。');
      kvStore = getMockKv();
    } else {
      throw createError({ statusCode: 500, statusMessage: "KV Store binding (RELAY_AUTH_STORE) is missing in production" });
    }
  }

  try {
    // 撈取 KV 中所有 user: 開頭的鍵值
    const result = await kvStore.list({ prefix: 'user:' });
    const keys = result.keys;

    // 若數量不大，直接解析出內容 (附帶建立時間等)
    // 注意：Cloudflare KV list 最多回傳 1000 筆，如需分頁可加上 cursor 處理
    const users = await Promise.all(
      keys.map(async (keyObj: any) => {
        const id = keyObj.name.replace('user:', '');
        const valStr = await kvStore.get(keyObj.name);
        
        let data: any = { token: 'unknown', createdAt: 'unknown' };
        if (valStr) {
          try {
            const parsed = JSON.parse(valStr);
            data = { ...data, ...parsed }; // 保留預設值，避免無該屬性
          } catch (e) {
            // parsing error fallback
          }
        }

        return {
          id,
          token: data.token,
          createdAt: data.createdAt,
        };
      })
    );

    // 依建立時間排序 (越新的越前面)
    users.sort((a, b) => {
      if (a.createdAt === 'unknown') return 1;
      if (b.createdAt === 'unknown') return -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return {
      totalActive: users.length,
      users
    };
  } catch (error) {
    throw createError({ statusCode: 500, statusMessage: "無法從 KV 讀取列表", cause: error });
  }
});
