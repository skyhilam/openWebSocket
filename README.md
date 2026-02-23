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

1. 修改 `wrangler.toml`，確認對應的 `id`（KV Namespace）正確。
2. 編譯後端產物：`npm run build`
3. 執行佈署指令：
   ```bash
   npx wrangler deploy
   ```

## 注意事項

- 本專案沒有實體資料庫，權限管控依靠 **Cloudflare KV** 作 Token 驗證。
- Cloudflare Pages 亦支援 Durable Objects，但為達最高相容性與保留原生 WebSocket 的存取彈性，我們以 Custom Module Worker (`worker.ts`) 模式進行匯出。
