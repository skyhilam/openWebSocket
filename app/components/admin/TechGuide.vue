<template>
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-10">
    <div
      class="bg-white dark:bg-neutral-900 shadow-sm ring-1 ring-neutral-200 dark:ring-neutral-800 sm:rounded-lg overflow-hidden"
    >
      <button
        class="w-full px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
        @click="expanded = !expanded"
      >
        <div
          class="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white"
        >
          <UIcon name="i-lucide-book-open" class="w-4 h-4" />
          技術說明
        </div>
        <UIcon
          :name="expanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="w-4 h-4 text-neutral-400 transition-transform"
        />
      </button>

      <div
        v-show="expanded"
        class="border-t border-neutral-200 dark:border-neutral-800"
      >
        <!-- 快速上手 -->
        <div
          class="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800"
        >
          <h4
            class="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2 mb-3"
          >
            <UIcon name="i-lucide-rocket" class="w-4 h-4 text-primary" />
            快速上手
          </h4>
          <ol
            class="text-sm text-neutral-600 dark:text-neutral-400 space-y-1.5 list-decimal list-inside"
          >
            <li>
              點擊<strong>「建立新實體」</strong>取得房間 ID、Token 及端點 URL。
            </li>
            <li>
              將 <strong>Host URL</strong> 用於你的伺服器/控制台（僅限 1
              個連線）。
            </li>
            <li>
              將 <strong>Client URL</strong> 分發給終端裝置（可多個同時連線）。
            </li>
            <li>所有訊息透過中繼站即時轉發；Host 可廣播或定向發送。</li>
          </ol>
        </div>

        <!-- Host 協議 -->
        <div
          class="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800"
        >
          <h4
            class="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2 mb-3"
          >
            <UIcon name="i-lucide-server" class="w-4 h-4 text-blue-500" />
            Host 訊息協議
          </h4>
          <div class="text-sm text-neutral-600 dark:text-neutral-400 space-y-2">
            <p class="font-medium text-neutral-700 dark:text-neutral-300">
              Host 收到（JSON）：
            </p>
            <div class="overflow-x-auto">
              <table class="w-full text-xs border-collapse">
                <thead>
                  <tr class="bg-neutral-50 dark:bg-neutral-800">
                    <th class="text-left px-3 py-1.5 font-medium">type</th>
                    <th class="text-left px-3 py-1.5 font-medium">時機</th>
                    <th class="text-left px-3 py-1.5 font-medium">欄位</th>
                  </tr>
                </thead>
                <tbody
                  class="divide-y divide-neutral-100 dark:divide-neutral-800"
                >
                  <tr>
                    <td class="px-3 py-1.5">
                      <code
                        class="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 rounded"
                        >history</code
                      >
                    </td>
                    <td class="px-3 py-1.5">連線回放</td>
                    <td class="px-3 py-1.5">
                      <code class="text-xs">messages[]</code>
                    </td>
                  </tr>
                  <tr>
                    <td class="px-3 py-1.5">
                      <code
                        class="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 rounded"
                        >client_join</code
                      >
                    </td>
                    <td class="px-3 py-1.5">Client 上線</td>
                    <td class="px-3 py-1.5">
                      <code class="text-xs">clientId</code>
                    </td>
                  </tr>
                  <tr>
                    <td class="px-3 py-1.5">
                      <code
                        class="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 rounded"
                        >client_leave</code
                      >
                    </td>
                    <td class="px-3 py-1.5">Client 離線</td>
                    <td class="px-3 py-1.5">
                      <code class="text-xs">clientId</code>
                    </td>
                  </tr>
                  <tr>
                    <td class="px-3 py-1.5">
                      <code
                        class="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 rounded"
                        >client_message</code
                      >
                    </td>
                    <td class="px-3 py-1.5">Client 訊息</td>
                    <td class="px-3 py-1.5">
                      <code class="text-xs">clientId</code>,
                      <code class="text-xs">data</code>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="font-medium text-neutral-700 dark:text-neutral-300 mt-3">
              Host 發送：
            </p>
            <ul class="list-disc list-inside space-y-1">
              <li>
                <strong>定向：</strong>
                <code
                  class="text-xs bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded"
                >
                  { "type": "send_to_client", "clientId": "xxx", "data": "..." }
                </code>
              </li>
              <li>
                <strong>廣播：</strong>直接發送純文字，所有 Client 都會收到。
              </li>
            </ul>
          </div>
        </div>

        <!-- Client 協議 -->
        <div
          class="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800"
        >
          <h4
            class="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2 mb-3"
          >
            <UIcon
              name="i-lucide-monitor-smartphone"
              class="w-4 h-4 text-green-500"
            />
            Client 訊息協議
          </h4>
          <ul
            class="text-sm text-neutral-600 dark:text-neutral-400 list-disc list-inside space-y-1.5"
          >
            <li>
              <strong>發送：</strong>直接
              <code
                class="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 rounded"
                >ws.send('文字')</code
              >，伺服器自動轉發給 Host。
            </li>
            <li>
              <strong>接收：</strong>Host 發來的是純文字，直接讀
              <code
                class="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 rounded"
                >event.data</code
              >。
            </li>
            <li>
              可在 URL 加
              <code
                class="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 rounded"
                >&amp;clientId=my-device</code
              >
              自訂裝置 ID。
            </li>
          </ul>
        </div>

        <!-- 程式碼範例 -->
        <div
          class="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800"
        >
          <h4
            class="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2 mb-3"
          >
            <UIcon name="i-lucide-code" class="w-4 h-4 text-violet-500" />
            程式碼範例
          </h4>
          <div class="space-y-3">
            <div>
              <p
                class="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1"
              >
                Host 端
              </p>
              <pre
                class="text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-md px-3 py-2 overflow-x-auto"
              ><code>const ws = new WebSocket('wss://域名/connect/ID?role=host&amp;token=TOKEN');

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === 'client_message') {
    console.log(msg.clientId, msg.data);
    // 回覆該 Client
    ws.send(JSON.stringify({
      type: 'send_to_client',
      clientId: msg.clientId,
      data: 'Echo: ' + msg.data
    }));
  }
};</code></pre>
            </div>
            <div>
              <p
                class="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1"
              >
                Client 端
              </p>
              <pre
                class="text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-md px-3 py-2 overflow-x-auto"
              ><code>const ws = new WebSocket('wss://域名/connect/ID?role=client&amp;token=TOKEN');

ws.onopen = () => ws.send('Hello');
ws.onmessage = (e) => console.log('收到:', e.data);</code></pre>
            </div>
          </div>
        </div>

        <!-- 注意事項 -->
        <div class="px-6 py-4">
          <h4
            class="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2 mb-3"
          >
            <UIcon
              name="i-lucide-alert-triangle"
              class="w-4 h-4 text-amber-500"
            />
            注意事項
          </h4>
          <ul
            class="text-sm text-neutral-600 dark:text-neutral-400 list-disc list-inside space-y-1.5"
          >
            <li>
              每個房間<strong>只允許 1 個 Host</strong>，新連線會踢掉舊的。
            </li>
            <li>
              Client 數量<strong>無上限</strong>，Client 之間無法直接溝通。
            </li>
            <li>
              歷史訊息保留 <strong>24 小時</strong>，上限
              <strong>200 條</strong>。
            </li>
            <li>
              本地開發用
              <code
                class="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 rounded"
                >ws://</code
              >，部署後自動升級
              <code
                class="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 rounded"
                >wss://</code
              >。
            </li>
            <li>
              Token 同時用於 Host 和 Client，差別只在
              <code
                class="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 rounded"
                >role</code
              >
              參數。
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const expanded = ref(false);
</script>
