# Host 端連接指南

本文件為 **Host 角色**（伺服器端 / 控制台端）撰寫，說明如何連接 WebSocket 房間、接收 Client 訊息、以及向 Client 發送指令。

---

## 1. 取得連線憑證

前往 `/admin` 管理介面，點擊「建立新實體」。系統會回傳以下資訊：

| 欄位                  | 說明                            | 範例                                                           |
| --------------------- | ------------------------------- | -------------------------------------------------------------- |
| **房間 ID**           | 該 WebSocket 房間的唯一識別碼   | `a1b2c3d4-e5f6-...`                                            |
| **存取金鑰 (Token)**  | 用於驗證連線身份的密鑰          | `8f3a2b1c4d5e6f...`                                            |
| **對接端點 (Host)**   | Host 角色的完整 WebSocket URL   | `wss://example.com/connect/a1b2c3d4?role=host&token=8f3a...`   |
| **對接端點 (Client)** | Client 角色的完整 WebSocket URL | `wss://example.com/connect/a1b2c3d4?role=client&token=8f3a...` |

你也可以透過 API 自動取得：

```bash
curl -X POST https://your-domain.com/api/users
```

回傳 JSON：

```json
{
  "userId": "a1b2c3d4-e5f6-...",
  "token": "8f3a2b1c4d5e6f...",
  "hostUrl": "wss://your-domain.com/connect/a1b2c3d4?role=host&token=8f3a...",
  "clientUrl": "wss://your-domain.com/connect/a1b2c3d4?role=client&token=8f3a..."
}
```

---

## 2. 建立 WebSocket 連線

使用管理介面提供的 **Host URL** 直接連線即可：

```javascript
const ws = new WebSocket(
  "wss://your-domain.com/connect/YOUR_USER_ID?role=host&token=YOUR_TOKEN",
);

ws.addEventListener("open", () => {
  console.log("Host 已連線");
});

ws.addEventListener("close", (e) => {
  console.log("連線關閉", e.code, e.reason);
});
```

### 鑑權機制

- Token 透過 **Query String** 帶入（`?token=...`），或以 **Authorization Header** 傳送（`Bearer <token>`）。
- 伺服器會從 KV 中驗證 `userId` + `token` 是否吻合，**不通過則回傳 401/403/404**。
- 每個房間同一時間**只允許一個 Host**，新的 Host 連線會踢掉舊的。

---

## 3. 訊息協議 (JSON Envelope)

所有 Host 與伺服器之間的通訊皆使用 **JSON 格式**。

### 3.1 Host 會收到的訊息

| `type`           | 觸發時機         | 結構                                                            |
| ---------------- | ---------------- | --------------------------------------------------------------- |
| `history`        | 連線時一次性回放 | `{ type: "history", messages: StoredMessage[] }`                |
| `client_join`    | Client 上線      | `{ type: "client_join", clientId: "abc123" }`                   |
| `client_leave`   | Client 離線      | `{ type: "client_leave", clientId: "abc123" }`                  |
| `client_message` | Client 送來訊息  | `{ type: "client_message", clientId: "abc123", data: "hello" }` |

`StoredMessage` 結構：

```typescript
interface StoredMessage {
  ts: string; // ISO 8601 時間戳
  clientId: string; // 發送方 Client ID
  direction: "in" | "out" | "system";
  content: string;
}
```

### 3.2 Host 可發送的訊息

**定向發送**（對特定 Client）：

```javascript
ws.send(
  JSON.stringify({
    type: "send_to_client",
    clientId: "abc123",
    data: "你的指令內容",
  }),
);
```

**廣播**（發送給所有 Client）：

```javascript
ws.send("這段內容會廣播給所有 Client");
```

> ⚠️ 廣播模式下只需發送純文字即可，**不需要 JSON 包裝**。

---

## 4. 完整 Host 範例

```javascript
const ws = new WebSocket(
  "wss://your-domain.com/connect/YOUR_USER_ID?role=host&token=YOUR_TOKEN",
);

const onlineClients = new Set();

ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);

  switch (msg.type) {
    case "history":
      console.log(`收到 ${msg.messages.length} 條歷史訊息`);
      msg.messages.forEach((m) =>
        console.log(`  [${m.ts}] ${m.clientId}: ${m.content}`),
      );
      break;

    case "client_join":
      onlineClients.add(msg.clientId);
      console.log(
        `✅ Client 上線: ${msg.clientId} (在線: ${onlineClients.size})`,
      );
      break;

    case "client_leave":
      onlineClients.delete(msg.clientId);
      console.log(
        `❌ Client 離線: ${msg.clientId} (在線: ${onlineClients.size})`,
      );
      break;

    case "client_message":
      console.log(`📩 [${msg.clientId}]: ${msg.data}`);
      // 回覆該 Client
      ws.send(
        JSON.stringify({
          type: "send_to_client",
          clientId: msg.clientId,
          data: `Echo: ${msg.data}`,
        }),
      );
      break;
  }
});

ws.addEventListener("open", () => {
  console.log("🟢 Host 已連線");
  // 5 秒後向所有 Client 廣播
  setTimeout(() => ws.send("全場廣播測試"), 5000);
});
```

---

## 5. 歷史訊息

- Host 連線時，伺服器會**自動回放**該房間最近 24 小時內的歷史訊息（上限 200 條）。
- 歷史訊息以 `{ type: "history", messages: [...] }` 一次性發送。
- 過期訊息（超過 24 小時）會自動清理。

---

## 6. 注意事項

- **一個房間只允許一個 Host**：新的 Host 連線會使舊的 Host 收到 `close` 事件（code `1000`，reason `New host connected`）。
- **Client 無數量限制**：每個 Client 會獲得一個短 UUID（`clientId`），可用於定向發送。
- **Token 安全性**：Token 具有完整的讀寫存取權限，請妥善保管，不要暴露在前端。
- **本地開發**：在 `npm run dev` 模式下 protocol 為 `ws://`，部署後自動升級為 `wss://`。
