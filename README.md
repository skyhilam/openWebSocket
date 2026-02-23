# 多用戶通訊站與管理系統 (Workers WebSocket + KV + Zero Trust)

這是一個基於 **Cloudflare Workers**、**Durable Objects** 以及 **Workers KV** 建立的多租戶 WebSocket 中轉站。
透過此系統，管理員能夠透過網頁後台產生專屬的 User ID 與 Token 派發給不同的使用者（家庭），而每一個使用者的連線都會在獨立的 Durable Object 實體中處理，確保**多租戶之間的連線與廣播完全隔離**。

---

## 🔒 系統安全架構 (Zero Trust 整合)

為了確保對外開放的 `/admin` 後台介面不會被濫用，本系統**強制依賴 Cloudflare Zero Trust (Access) 作為入口防護**，程式碼本身不實作登入畫面。

### 如何設定 Zero Trust 防護：

1. 請先確保你的 Cloudflare 帳號下有一個 Custom Domain (自訂網域)。
2. 將部署好的此 Worker 綁定到該網域下 (例如：`wss.yourdomain.com`)。
3. 前往 Cloudflare Dashboard -> **Zero Trust** -> **Access** -> **Applications**。
4. 新增一個 Application，保護網域 `wss.yourdomain.com/admin*` (或整個子網域，但放行 `/connect*` 給 WebSocket 連線)。
5. 設定 Policies：選擇 `Include -> Emails` 並填寫你的管理員 Email。
6. 設定完成後，只有通過收信驗證的你，才能看見 `/admin` 介面。

---

## 🚀 部署至 Cloudflare

### 前置需求

1. **Cloudflare 付費方案**: 此服務使用了 **Durable Objects**。
2. 建立 **Workers KV Namespace** (用於儲存使用者憑證)：
   ```bash
   npx wrangler kv:namespace create "RELAY_AUTH_STORE"
   ```
   _請將終端機輸出的 `id` 複製並覆蓋 `wrangler.jsonc` 中 `kv_namespaces` 下的 id 設定。_

### 開始部署

1. 安裝本地相依套件：
   ```bash
   npm install
   ```
2. 部署到 Cloudflare：
   ```bash
   npm run deploy
   ```

---

## 👥 使用者管理 (產生 ID 與 Token)

系統提供一個內建簡易網頁版管理介面。確保你已配置好上方提到的 Zero Trust 後，使用瀏覽器造訪：

- **`https://<your-worker-domain>/admin`**

點擊「**建立新使用者**」按鈕，系統會回傳一組 JSON 包含生成的 `userId`、長度32的安全 `token`，以及給 Docker 與雲端系統對接的完整網址。

---

## 🔌 對接方式 (API 規範)

不論是家中 Docker(`role=host`) 還是雲端系統(`role=client`)，都需要透過 WebSocket `ws://` 或 `wss://` 連接給該用戶專屬的中轉站 `userId`。

### 1. 家中 Docker (Host 端)

負責接收所有 Client 傳來的指令，並可將結果廣播回所有 Client。**請注意，同時間該 `userId` 房間內只有最後一個連上的 Host 才會被保留。**

- **連線網址**:
  ```text
  wss://<your-worker-domain>/connect/<userId>?role=host&token=<TOKEN>
  ```
  _(也支援在 HTTP Upgrade Request 加入 `Authorization: Bearer <TOKEN>`)_。

### 2. 雲端系統 (Client 端)

負責發送指令給 Host，並接收 Host 執行後的結果。允許多個 Client 同時連線到同一個 `userId` 房間。

- **連線網址**:
  ```text
  wss://<your-worker-domain>/connect/<userId>?role=client&token=<TOKEN>
  ```

### 💬 通訊邏輯

- **從 Client 發送**: `Client` 發送的任何訊息，DO 會將其 **轉發 (Forward)** 給所在房間的 `Host`。
- **從 Host 發送**: `Host` 發送的任何訊息，DO 會將其 **廣播 (Broadcast)** 給該房間內所有連線中的 `Client`。

---

## 🧪 本地測試教學

本專案內建了一個用來模擬兩個用戶（Room A 與 Room B）同步對打的腳本 `test.js`，以驗證多租戶隔離機制。

1. **啟動本機模擬環境 (Miniflare)**
   開啟一個終端機，執行以下指令以啟動 Worker 定義了 KV 與 DO 的本地測試環境：

   ```bash
   npm run dev
   ```

2. **執行測試腳本**
   開啟 **第二個終端機視窗**，然後執行內建的測試腳本：

   ```bash
   node test.js
   ```

3. **預期輸出結果**
   腳本會先打 API 註冊 User A 與 User B 寫入本機 KV，再建立各自的 Host 與 Client socket。你會看到 Room A 僅會收到 Room A 的訊息，Room B 也是獨立運作：
   ```text
    === 正在註冊 User A ===
    User A: 123...
    === 正在註冊 User B ===
    User B: 456...
    === 開始 WebSocket 多租戶隔離測試 ===
    [Room A] Host connected
    [Room B] Host connected ...
    ...
    [Room A] Client received: Hello from Host A to Room A!
    [Room B] Client received: Hello from Host B to Room B!
    === 測試成功：所有房間的訊息皆正確隔離與送達！ ===
   ```
