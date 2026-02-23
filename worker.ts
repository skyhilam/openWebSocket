// @ts-ignore
import app from "./.output/server/index.mjs";
export { RelayHub } from "./server/utils/RelayHub.ts";

export default {
  async fetch(request: Request, env: any, ctx: any) {
    const url = new URL(request.url);
    
    // 攔截 WebSocket 連線請求
    if (url.pathname.startsWith('/connect/')) {
      const parts = url.pathname.split('/');
      const userId = parts[2]; // /connect/userId
      const token = url.searchParams.get("token") || request.headers.get("Authorization")?.replace("Bearer ", "");

      if (!token) {
        return new Response("Missing token", { status: 401 });
      }

      // 驗證 KV 內的 Token 是否吻合
      const userRecordStr = await env.RELAY_AUTH_STORE.get(`user:${userId}`);
      if (!userRecordStr) {
        return new Response("User not found", { status: 404 });
      }

      const userRecord = JSON.parse(userRecordStr);
      if (userRecord.token !== token) {
        return new Response("Invalid token", { status: 403 });
      }

      // 通過驗證，將原生 request 派發給 Durable Object
      const id = env.RELAY_HUB.idFromName(userId);
      const stub = env.RELAY_HUB.get(id);
      return stub.fetch(request);
    }

    // 其他一般請求交由 Nuxt (Nitro) 處理
    return app.fetch(request, env, ctx);
  }
};

