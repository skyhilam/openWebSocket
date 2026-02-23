import { RelayHub, Env } from "./RelayHub";

// 網頁版管理介面 HTML (原生 JS 呼叫 API)
const adminHtml = `
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WebSocket Relay 管理後台</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #f3f4f6; padding: 2rem; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        h1 { font-size: 1.5rem; color: #111827; margin-bottom: 1.5rem; }
        .btn { background: #3b82f6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-size: 1rem; }
        .btn:hover { background: #2563eb; }
        pre { background: #1f2937; color: #10b981; padding: 1rem; border-radius: 4px; overflow-x: auto; font-size: 0.875rem; }
        .status { margin-top: 1rem; color: #4b5563; }
        .tips { margin-top: 2rem; font-size: 0.875rem; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 1rem; }
    </style>
</head>
<body>
    <div class="container">
        <h1>WebSocket Relay 使用者管理</h1>
        <p>點擊下方按鈕註冊一個新的使用者 (會自動產生 User ID 與安全的連線 Token)</p>
        <button class="btn" onclick="createUser()">建立新使用者</button>
        
        <div class="status" id="status"></div>
        <div id="result" style="display:none; margin-top: 1rem;">
            <p><strong>連線資訊：請妥善保存！</strong></p>
            <pre id="output"></pre>
        </div>

        <div class="tips">
            <p><strong>Note:</strong> 目前此介面無防護，請務必在 Cloudflare 儀表板使用 <strong>Zero Trust (Access)</strong> 將此網域保護起來，限制僅有您的 Email 才能存取。</p>
        </div>
    </div>

    <script>
        async function createUser() {
            const btn = document.querySelector('.btn');
            const status = document.getElementById('status');
            const result = document.getElementById('result');
            const output = document.getElementById('output');
            
            btn.disabled = true;
            status.textContent = "建立中...";
            result.style.display = "none";

            try {
                const res = await fetch('/api/users', { method: 'POST' });
                if (!res.ok) throw new Error("伺服器錯誤: " + res.status);
                const data = await res.json();
                
                output.textContent = JSON.stringify(data, null, 2);
                result.style.display = "block";
                status.textContent = "✅ 成功建立！";
            } catch (err) {
                status.textContent = "❌ 建立失敗: " + err.message;
            } finally {
                btn.disabled = false;
            }
        }
    </script>
</body>
</html>
`;

function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export { RelayHub };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // 1. WebSocket 連線請求 (動態多租戶 /connect/:userId)
    const parts = url.pathname.split('/');
    // 檢查 "/connect/:userId" (parts: ["", "connect", "userId"])
    if (parts.length === 3 && parts[1] === "connect" && parts[2]) {
      const userId = parts[2];
      const token = url.searchParams.get("token") || request.headers.get("Authorization")?.replace("Bearer ", "");

      if (!token) {
        return new Response("Missing token", { status: 401 });
      }

      // 驗證 KV 內的 Token 是否吻合
      const userRecordStr = await env.RELAY_AUTH_STORE.get("user:" + userId);
      if (!userRecordStr) {
        return new Response("User not found", { status: 404 });
      }

      const userRecord = JSON.parse(userRecordStr);
      if (userRecord.token !== token) {
        return new Response("Invalid token", { status: 403 });
      }

      // 通過驗證，將請求派發給 userId 對應的專屬 Durable Object 房間
      const id = env.RELAY_HUB.idFromName(userId);
      const stub = env.RELAY_HUB.get(id);
      return stub.fetch(request);
    }

    // 2. Admin 介面 (由外部 Cloudflare Zero Trust 保護)
    if (url.pathname === "/admin") {
      return new Response(adminHtml, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }

    // 3. Admin API - 產生新用戶
    if (url.pathname === "/api/users" && request.method === "POST") {
      const newUserId = crypto.randomUUID();
      const newToken = generateToken();

      const record = {
        token: newToken,
        createdAt: new Date().toISOString()
      };

      await env.RELAY_AUTH_STORE.put("user:" + newUserId, JSON.stringify(record));

      return new Response(JSON.stringify({
        userId: newUserId,
        token: newToken,
        hostUrl: "wss://" + url.host + "/connect/" + newUserId + "?role=host&token=" + newToken,
        clientUrl: "wss://" + url.host + "/connect/" + newUserId + "?role=client&token=" + newToken
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (url.pathname === "/health") {
      return new Response("WebSocket Relay is OK", { status: 200 });
    }

    return new Response("Not Found", { status: 404 });
  }
};
