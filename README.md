# Cloudflare WebSocket Multi-Tenant Relay (Nuxt 4 Full-Stack)

本專案將原本單體的 Cloudflare Worker WebSocket 轉發器重構為一個基於 **Nuxt 4** + **Nitro** 的全端應用。
架構整合了 Nuxt UI 提供友善的後台管理介面，並在後端使用 Cloudflare Durable Objects 以及 KV 來維持高可用且安全的多租戶 WebSocket 連線。

## 系統架構特色

1. **Nuxt 4 (Vue 3 + UI)**: 提供 `/admin` 路由（由 Cloudflare Zero Trust 在外部保護），用於一鍵產生使用者名稱與 Token。
2. **Nitro API (`/api/users`)**: 負責生成 UUID、Token 並將憑證儲存於 Cloudflare KV (`RELAY_AUTH_STORE`)。
3. **Cloudflare Durable Objects**: 每個 User ID 分配一個專屬的獨立房間 (`RelayHub`)，實作 Host 與多 Client 間的廣播中繼。
4. **Nitro 路由截斷 (`worker.ts`)**: WebSocket 的 `/connect/:userId` 連線由入口檔 `worker.ts` 直接攔截並原生派發給 Durable Objects，避免經過 Nitro 封裝引發 Fetch 錯誤，確保最佳效能。

## 開發與測試教學

### 1. 安裝套件

我們建議使用 npm 進行安裝：

```bash
npm install
```

### 2. 編譯專案

由於 Cloudflare Durable Objects 必須經過編譯才能被正確載入，請先執行打包指令：

```bash
npm run build
```

（Nuxt Nitro `cloudflare-module` preset 將會產生 `.output/server/index.mjs` 等供 `worker.ts` 服用）

### 3. 本機啟動與模擬（Wrangler Dev）

啟動本地端 Wrangler 模擬環境以涵蓋 KV 與 Durable Objects 支援：

```bash
npx wrangler dev
```

此時伺服器通常會跑在 `http://127.0.0.1:8787` (依您的主機環境而定，也可能是 8788 等)。

### 4. 執行本地自動化測試

另開一個終端機，執行以下腳本驗證 WebSocket 隔離機制。此腳本會自動建立兩個 User ID 並在背地建立對應房間互相廣播：

```bash
node test.js
```

（若您啟動的 Wrangler 不在 8787 port，請修改 `test.js` 中的 `baseUrl`）

## 佈署至 Cloudflare (Workers)

本專案使用 `wrangler.toml` 進行環境設定，無需再手動設定 `wrangler.jsonc`。
佈署只需要三個簡單的步驟：

### 1. 準備工作與授權

確保您的終端機已登入並授權存取您的 Cloudflare 帳戶：

```bash
npx wrangler login
```

如果您尚未建立專屬的 KV Namespace (用於存放 Token)，請先建立一個新的：

```bash
npx wrangler kv:namespace create RELAY_AUTH_STORE
```

執行後，請將終端機回報的 `id = "..."` 填入 `wrangler.toml` 中的 `[[kv_namespaces]]` 區塊取代舊有的 id。

### 2. 編譯大包 (Build)

將 Nuxt Vue 前端與 Server API 合併壓製成可發佈的 Worker 腳本 (`.output` 目錄)：

```bash
npm run build
```

### 3. 發佈上線 (Deploy)

執行推播指令：

```bash
npx wrangler deploy
```

執行完畢後，Wrangler 會自動為您註冊 `RelayHub` (Durable Object) 並分配一個類似 `https://websocket-relay.<user>.workers.dev` 的線上網址。
開啟該網址下的 `/admin`，即可開始建立並管理您的專屬通訊房間！

### 4. 設定 Cloudflare Zero Trust 保護 (重要)

為了避免任何人都能隨意拜訪您的 `/admin` 介面亂開房間，我們強烈建議將此路徑加入 Cloudflare Zero Trust (Access) 保護：

1. 登入 Cloudflare Dashboard，進入您的帳戶。
2. 點擊側邊欄的 **Zero Trust** -> 左側選單選擇 **Access** -> **Applications**。
3. 點擊 **"Add an application"**，選擇 **Self-hosted**。
4. **Application Configuration**:
   - Application name: `WebSocket Admin`
   - Session Duration: 依需求設定 (例如 24 hours)
   - Application domain: 填入您剛才發佈的 Worker 網域 (例如 `websocket-relay.<your-domain>.workers.dev`)。
   - **Path**: 請務必填入 `admin`。
5. **Add policies**:
   - 建立一個 Policy (例如 `Allow Admins`)
   - Action 選擇 `Allow`。
   - 在 **Include** 規則中，選擇 `Emails` 並填寫您與其他管理員的 Email 信箱 (或者使用 `Email endings` 讓特定公司網域通過)。
6. 儲存並套用。
7. **(非常重要) 保護 API 端點**:
   - 由於前端網頁會呼叫 `/api/users`，如果只保護 `/admin`，有心人士仍可直接戳 API。
   - 請在建立好 `admin` 應用程式後，再次點擊 **"Add an application"**，用**一模一樣的設定方式**，將 **Path** 填入 `api` 並綁定相同的 Policy。
   - 這樣一來，無論是介面還是背後的 `/api/*` 都會完美的被阻擋在同一個 Zero Trust 登入牆後。

設定完成後，當任何人試圖存取 `https://<您的網址>/admin` 或 API 時，都會被要求登入並驗證 OTP。

## 連接文件

- **[Host 端連接指南](./HOST.md)** — 控制台 / 伺服器端如何連線、接收 Client 訊息、廣播與定向發送
- **[Client 端連接指南](./CLIENT.md)** — 終端裝置 / 應用程式端如何連線、發送與接收訊息

## 注意事項

- 本專案沒有實體資料庫，權限管控依靠 **Cloudflare KV** 作 Token 驗證。
- Cloudflare Pages 亦支援 Durable Objects，但為達最高相容性與保留原生 WebSocket 的存取彈性，我們以 Custom Module Worker (`worker.ts`) 模式進行匯出。
