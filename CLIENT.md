# Client 端連接指南

本文件為 **Client 角色**（終端裝置 / 應用程式端）撰寫，說明如何連接 WebSocket 房間、向 Host 發送訊息、以及接收 Host 的指令。

---

## 1. 取得連線資訊

Client 連線需要由管理員（或 Host 方）提供以下資訊：

| 欄位                  | 說明                            | 範例                                                           |
| --------------------- | ------------------------------- | -------------------------------------------------------------- |
| **對接端點 (Client)** | Client 角色的完整 WebSocket URL | `wss://example.com/connect/a1b2c3d4?role=client&token=8f3a...` |

管理員可在 `/admin` 介面建立實體後，將 **Client URL** 直接提供給你。

---

## 2. 建立 WebSocket 連線

### 基本連線

```javascript
const ws = new WebSocket(
  "wss://your-domain.com/connect/YOUR_USER_ID?role=client&token=YOUR_TOKEN",
);

ws.addEventListener("open", () => {
  console.log("Client 已連線");
});

ws.addEventListener("close", (e) => {
  console.log("連線關閉", e.code, e.reason);
});
```

### 自訂 Client ID

預設情況下，伺服器會為每個 Client 自動配發一組短 UUID（8 字元）作為 `clientId`。  
如需指定自訂 ID，可在 URL 加上 `clientId` 參數：

```
wss://your-domain.com/connect/USER_ID?role=client&token=TOKEN&clientId=my-device-01
```

> ⚠️ 自訂 `clientId` 應確保唯一性，否則會覆蓋同 ID 的現有連線。

### 鑑權機制

- Token 透過 **Query String** 帶入（`?token=...`），或以 **Authorization Header** 傳送（`Bearer <token>`）。
- 伺服器會從 KV 中驗證 `userId` + `token` 是否吻合。
- **Host 和 Client 使用同一組 Token**，差別只在於 `role` 參數。

---

## 3. 訊息協議

Client 端的協議非常簡潔：

### 3.1 發送訊息（Client → Host）

直接發送**純文字**即可，伺服器會自動包裝後轉發給 Host：

```javascript
ws.send("Hello from client!");
ws.send(JSON.stringify({ action: "ping", payload: 123 }));
```

> 💡 你可以發送任意格式（純文字或 JSON 字串），Host 端會原樣收到。

### 3.2 接收訊息（Host → Client）

Host 發送給你的訊息同樣是**純文字**，直接讀取即可：

```javascript
ws.addEventListener("message", (event) => {
  console.log("收到 Host 訊息:", event.data);

  // 如果 Host 傳的是 JSON，可自行解析
  try {
    const data = JSON.parse(event.data);
    console.log("解析後:", data);
  } catch {
    // 純文字訊息
    console.log("純文字:", event.data);
  }
});
```

### 3.3 協議對照表

| 方向                  | 格式   | 說明                                                                                        |
| --------------------- | ------ | ------------------------------------------------------------------------------------------- |
| Client → Host         | 純文字 | 直接 `ws.send()`，伺服器自動包裝為 `{ type: "client_message", clientId, data }` 轉發給 Host |
| Host → Client（定向） | 純文字 | Host 透過 `send_to_client` 指定你的 `clientId`，你只收到 `data` 部分                        |
| Host → Client（廣播） | 純文字 | Host 廣播的原始文字，所有 Client 都會收到                                                   |

---

## 4. 完整 Client 範例

```javascript
const ws = new WebSocket(
  "wss://your-domain.com/connect/YOUR_USER_ID?role=client&token=YOUR_TOKEN",
);

ws.addEventListener("open", () => {
  console.log("🟢 Client 已連線");

  // 連線後發送一條訊息
  ws.send("Client 已就緒");
});

ws.addEventListener("message", (event) => {
  console.log("📩 收到:", event.data);

  // 根據收到的指令做不同處理
  try {
    const cmd = JSON.parse(event.data);
    switch (cmd.action) {
      case "execute":
        console.log("執行任務:", cmd.payload);
        ws.send(JSON.stringify({ status: "done", task: cmd.payload }));
        break;
      default:
        console.log("未知指令:", cmd);
    }
  } catch {
    // 純文字訊息
    console.log("文字訊息:", event.data);
  }
});

ws.addEventListener("close", (e) => {
  console.log("🔴 連線關閉:", e.code, e.reason);
});

ws.addEventListener("error", (e) => {
  console.error("⚠️ 連線錯誤:", e);
});
```

---

## 5. 斷線重連

生產環境中建議實作自動重連機制：

```javascript
function createConnection() {
  const ws = new WebSocket(
    "wss://your-domain.com/connect/ID?role=client&token=TOKEN",
  );

  ws.addEventListener("open", () => console.log("已連線"));

  ws.addEventListener("message", (event) => {
    // 處理訊息...
  });

  ws.addEventListener("close", () => {
    console.log("斷線，3 秒後重連...");
    setTimeout(createConnection, 3000);
  });

  return ws;
}

createConnection();
```

---

## 6. 注意事項

- **Client 無數量限制**：同一房間可以有多個 Client 同時連線。
- **Client 不會收到其他 Client 的訊息**：Client 之間無法直接溝通，所有訊息必須經由 Host 中繼。
- **上線/離線通知**：Client 的加入和離開會自動通知 Host（`client_join` / `client_leave`），Client 端無需手動處理。
- **本地開發**：在 `npm run dev` 模式下 protocol 為 `ws://`，部署後自動升級為 `wss://`。
