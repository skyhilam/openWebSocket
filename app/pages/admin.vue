<template>
  <div>
    <ClientOnly>
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <!-- Page Header -->
        <div class="md:flex md:items-center md:justify-between mb-8">
          <div class="min-w-0 flex-1">
            <h2
              class="text-2xl font-bold leading-7 text-neutral-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight"
            >
              WebSocket 實體管理
            </h2>
            <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              在此配置與管理隔離的 WebSocket 連線房間。所有連線將直接在
              Cloudflare 邊緣節點處理。
            </p>
          </div>
          <div class="mt-4 flex md:ml-4 md:mt-0">
            <UButton
              :loading="loading"
              @click="generateUser"
              icon="i-lucide-plus"
              color="neutral"
              variant="solid"
            >
              建立新實體
            </UButton>
          </div>
        </div>

        <!-- Error Alert -->
        <div v-if="errorMsg" class="mb-6">
          <UAlert
            icon="i-lucide-alert-circle"
            color="error"
            variant="subtle"
            title="建立失敗"
            :description="errorMsg"
          />
        </div>

        <!-- Result Section -->
        <div
          v-if="result"
          class="bg-white dark:bg-neutral-900 shadow-sm ring-1 ring-neutral-200 dark:ring-neutral-800 sm:rounded-lg overflow-hidden"
        >
          <div
            class="px-4 py-5 sm:px-6 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center"
          >
            <h3
              class="text-base font-semibold leading-6 text-neutral-900 dark:text-white"
            >
              實體配置資訊
            </h3>
            <span
              class="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:ring-green-500/20"
              >配置成功</span
            >
          </div>
          <div
            class="border-t border-neutral-200 dark:border-neutral-800 px-4 py-5 sm:p-0"
          >
            <dl
              class="sm:divide-y sm:divide-neutral-200 dark:sm:divide-neutral-800"
            >
              <div class="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt
                  class="text-sm font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-2"
                >
                  <UIcon name="i-lucide-fingerprint" class="w-4 h-4" /> 房間 ID
                </dt>
                <dd
                  class="mt-1 text-sm text-neutral-900 dark:text-white sm:col-span-2 sm:mt-0 font-mono"
                >
                  {{ result.userId }}
                </dd>
              </div>

              <div class="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt
                  class="text-sm font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-2"
                >
                  <UIcon name="i-lucide-key" class="w-4 h-4" /> 存取金鑰
                </dt>
                <dd
                  class="mt-1 text-sm text-neutral-900 dark:text-white sm:col-span-2 sm:mt-0 font-mono"
                >
                  {{ result.token }}
                </dd>
              </div>

              <div class="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt
                  class="text-sm font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-2"
                >
                  <UIcon name="i-lucide-server" class="w-4 h-4" /> 對接端點
                  (Host)
                </dt>
                <dd
                  class="mt-1 text-sm text-neutral-900 dark:text-white sm:col-span-2 sm:mt-0"
                >
                  <div class="flex rounded-md shadow-sm">
                    <input
                      readonly
                      :value="result.hostUrl"
                      class="block w-full min-w-0 flex-1 rounded-none rounded-l-md border-0 py-1.5 px-3 text-neutral-900 ring-1 ring-inset ring-neutral-300 placeholder:text-neutral-400 focus:ring-2 focus:ring-inset focus:ring-neutral-600 sm:text-sm sm:leading-6 dark:bg-neutral-800 dark:text-white dark:ring-neutral-700 bg-neutral-50 font-mono"
                    />
                    <button
                      @click="copyText(result.hostUrl)"
                      type="button"
                      class="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-md px-3 py-2 text-sm font-semibold text-neutral-900 ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-white dark:ring-neutral-700 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                    >
                      <UIcon
                        name="i-lucide-copy"
                        class="-ml-0.5 h-4 w-4 text-neutral-400"
                      />
                      複製
                    </button>
                  </div>
                </dd>
              </div>

              <div class="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt
                  class="text-sm font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-2"
                >
                  <UIcon name="i-lucide-monitor-smartphone" class="w-4 h-4" />
                  對接端點 (Client)
                </dt>
                <dd
                  class="mt-1 text-sm text-neutral-900 dark:text-white sm:col-span-2 sm:mt-0"
                >
                  <div class="flex rounded-md shadow-sm">
                    <input
                      readonly
                      :value="result.clientUrl"
                      class="block w-full min-w-0 flex-1 rounded-none rounded-l-md border-0 py-1.5 px-3 text-neutral-900 ring-1 ring-inset ring-neutral-300 placeholder:text-neutral-400 focus:ring-2 focus:ring-inset focus:ring-neutral-600 sm:text-sm sm:leading-6 dark:bg-neutral-800 dark:text-white dark:ring-neutral-700 bg-neutral-50 font-mono"
                    />
                    <button
                      @click="copyText(result.clientUrl)"
                      type="button"
                      class="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-md px-3 py-2 text-sm font-semibold text-neutral-900 ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-white dark:ring-neutral-700 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                    >
                      <UIcon
                        name="i-lucide-copy"
                        class="-ml-0.5 h-4 w-4 text-neutral-400"
                      />
                      複製
                    </button>
                  </div>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="!loading && !errorMsg"
          class="text-center bg-white dark:bg-neutral-900 shadow-sm ring-1 ring-neutral-200 dark:ring-neutral-800 sm:rounded-lg px-6 py-14 mt-6"
        >
          <UIcon
            name="i-lucide-server"
            class="mx-auto h-12 w-12 text-neutral-300 dark:text-neutral-600"
          />
          <h3
            class="mt-2 text-sm font-semibold text-neutral-900 dark:text-white"
          >
            無啟用中的連線實體
          </h3>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            點擊上方按鈕立即配置一組新的獨立 WebSocket 資源。
          </p>
        </div>
      </div>

      <!-- Users List Section -->
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-10">
        <div class="sm:flex sm:items-center">
          <div class="sm:flex-auto">
            <h1
              class="text-base font-semibold leading-6 text-neutral-900 dark:text-white"
            >
              已配置實體列表
            </h1>
            <p class="mt-2 text-sm text-neutral-700 dark:text-neutral-400">
              顯示 Cloudflare KV 中所有活躍的 WebSocket 房間。共計
              <span class="font-bold">{{ usersData?.totalActive || 0 }}</span>
              個。
            </p>
          </div>
          <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            <UButton
              icon="i-lucide-refresh-cw"
              color="neutral"
              variant="soft"
              size="sm"
              @click="fetchUsers"
              :loading="loadingUsers"
            >
              重新整理
            </UButton>
          </div>
        </div>

        <div
          class="mt-6 bg-white dark:bg-neutral-900 shadow-sm ring-1 ring-neutral-200 dark:ring-neutral-800 sm:rounded-lg overflow-x-auto"
        >
          <UTable
            :loading="loadingUsers"
            :data="usersData?.users || []"
            :columns="columns"
            class="min-w-full"
            :ui="{
              th: 'bg-neutral-50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white font-semibold',
            }"
          >
            <template #id-cell="{ row }">
              <span class="font-mono text-xs">{{
                (row.original as any).id
              }}</span>
            </template>
            <template #token-cell="{ row }">
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs text-neutral-500"
                  >{{
                    String((row.original as any).token || "unknown").substring(
                      0,
                      8,
                    )
                  }}...</span
                >
                <UButton
                  icon="i-lucide-copy"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  @click="copyText((row.original as any).token)"
                  title="複製完整 Token"
                />
              </div>
            </template>
            <template #createdAt-cell="{ row }">
              <span class="text-xs">{{
                (row.original as any).createdAt !== "unknown"
                  ? new Date((row.original as any).createdAt).toLocaleString()
                  : "未知"
              }}</span>
            </template>
            <template #actions-cell="{ row }">
              <div class="flex items-center justify-end gap-1">
                <UButton
                  :icon="
                    activeConsoleId === (row.original as any).id
                      ? 'i-lucide-terminal'
                      : 'i-lucide-terminal'
                  "
                  :color="
                    activeConsoleId === (row.original as any).id
                      ? 'primary'
                      : 'neutral'
                  "
                  variant="ghost"
                  size="xs"
                  @click="
                    toggleConsole(
                      (row.original as any).id,
                      (row.original as any).token,
                    )
                  "
                  title="控制台"
                >
                  控制台
                </UButton>
                <UButton
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  size="xs"
                  @click="deleteUser((row.original as any).id)"
                  :loading="deletingId === (row.original as any).id"
                />
              </div>
            </template>
            <template #empty>
              <div class="flex flex-col items-center justify-center py-12">
                <UIcon
                  name="i-lucide-inbox"
                  class="w-12 h-12 text-neutral-300 dark:text-neutral-600 mb-4"
                />
                <p class="text-sm text-neutral-500 dark:text-neutral-400">
                  目前沒有任何實體資料
                </p>
              </div>
            </template>
          </UTable>
        </div>

        <!-- 活躍控制台面板 -->
        <div
          v-if="activeConsoleId"
          class="mt-4 bg-white dark:bg-neutral-900 shadow-sm ring-1 ring-neutral-200 dark:ring-neutral-800 sm:rounded-lg overflow-hidden"
        >
          <div
            class="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between"
          >
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-terminal" class="w-4 h-4" />
              <span
                class="text-sm font-semibold text-neutral-900 dark:text-white"
              >
                控制台
              </span>
              <span class="font-mono text-xs text-neutral-500">
                {{ activeConsoleId }}
              </span>
            </div>
            <UButton
              icon="i-lucide-x"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="closeConsole"
            />
          </div>
          <RoomConsole
            :connected="consoleConnected"
            :connecting="consoleConnecting"
            :messages="consoleMessages"
            :online-clients="consoleOnlineClients"
            @connect="consoleConnect(activeConsoleId!, activeConsoleToken!)"
            @disconnect="consoleDisconnect()"
            @clear="consoleClearMessages()"
            @send="handleConsoleSend"
          />
        </div>
      </div>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRoomConsole } from "~/composables/useRoomConsole";

useSeoMeta({
  title: "WebSocket 實體管理 | OpenWebSocket",
});

interface UserRow {
  id: string;
  token: string;
  createdAt: string;
}

const loading = ref(false);
const result = ref<{
  userId: string;
  token: string;
  hostUrl: string;
  clientUrl: string;
} | null>(null);
const errorMsg = ref("");
const toast = useToast();

// Users List State
const loadingUsers = ref(false);
const deletingId = ref<string | null>(null);
const usersData = ref<{ totalActive: number; users: UserRow[] } | null>(null);

// 控制台狀態 — 解構為頂層 ref，避免 template 中巢狀 ref 不自動解包
const activeConsoleId = ref<string | null>(null);
const activeConsoleToken = ref<string | null>(null);
const {
  connected: consoleConnected,
  connecting: consoleConnecting,
  messages: consoleMessages,
  onlineClients: consoleOnlineClients,
  connect: consoleConnect,
  disconnect: consoleDisconnect,
  sendMessage: consoleSendMessage,
  clearMessages: consoleClearMessages,
} = useRoomConsole();

function handleConsoleSend(content: string, targetClientId?: string) {
  consoleSendMessage(content, targetClientId);
}

const columns: any[] = [
  { accessorKey: "id", header: "房間 ID", id: "id" },
  { accessorKey: "token", header: "存取金鑰", id: "token" },
  { accessorKey: "createdAt", header: "建立時間", id: "createdAt" },
  { id: "actions", header: "操作" },
];

function toggleConsole(userId: string, token: string) {
  if (activeConsoleId.value === userId) {
    closeConsole();
    return;
  }
  // 先關閉舊連線
  consoleDisconnect();
  consoleClearMessages();
  activeConsoleId.value = userId;
  activeConsoleToken.value = token;
}

function closeConsole() {
  consoleDisconnect();
  activeConsoleId.value = null;
  activeConsoleToken.value = null;
}

onBeforeUnmount(() => {
  consoleDisconnect();
});

async function generateUser() {
  loading.value = true;
  errorMsg.value = "";
  result.value = null;

  try {
    const res = await fetch("/api/users", { method: "POST" });
    if (!res.ok) {
      const details = await res.text();
      errorMsg.value = `狀態碼 (${res.status}): ${details}`;
      return;
    }
    result.value = await res.json();
    toast.add({
      title: "配置成功",
      description: "實體資源已建立並同步至 Cloudflare KV。",
      color: "success",
      icon: "i-lucide-check-circle",
    });
    // 建立成功後重新整理列表
    fetchUsers();
  } catch (err: any) {
    errorMsg.value =
      err.message || "無法連接伺服器，請確認 Wrangler 環境狀態。";
  } finally {
    loading.value = false;
  }
}

async function fetchUsers() {
  loadingUsers.value = true;
  try {
    // 加上時間戳以避免瀏覽器對 GET request 的無條件快取
    const res = await fetch(`/api/users?t=${Date.now()}`);

    // 如果 Cloudflare Access 擋下請求，通常會回傳 401, 403 或是 HTML (200 OK 登入頁)
    const contentType = res.headers.get("content-type") || "";
    if (!res.ok || contentType.includes("text/html")) {
      console.warn("未授權或遇到 Cloudflare Access 攔截，準備重啟頁面驗證...");
      window.location.reload(); // 強制觸發真實請求給 Cloudflare
      return;
    }

    usersData.value = await res.json();
  } catch (e) {
    console.error("Failed to fetch users", e);
  } finally {
    loadingUsers.value = false;
  }
}

async function deleteUser(id: string) {
  if (!confirm(`確定要刪除房間 ${id} 嗎？這將導致使用該金鑰的連線立即失效。`))
    return;

  deletingId.value = id;
  try {
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await res.text());

    toast.add({
      title: "刪除成功",
      description: `房間 ${id} 已被移除。`,
      color: "success",
      icon: "i-lucide-trash-2",
    });

    // 清空上方卡片檢視如果剛好是該筆
    if (result.value?.userId === id) {
      result.value = null;
    }

    // [Optimistic Update] 立即從畫面上移除，不需要等 fetch 回來，避免畫面卡頓
    if (usersData.value) {
      usersData.value.users = usersData.value.users.filter((u) => u.id !== id);
      usersData.value.totalActive = usersData.value.users.length;
    }

    // 隨後在背景拉取最新狀態確保同步
    await fetchUsers();
  } catch (e: any) {
    toast.add({
      title: "刪除失敗",
      description: e.message,
      color: "error",
      icon: "i-lucide-alert-circle",
    });
  } finally {
    deletingId.value = null;
  }
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.add({
      title: "已複製",
      icon: "i-lucide-clipboard-check",
      color: "success",
    });
  } catch (e) {
    toast.add({
      title: "複製失敗",
      color: "error",
      icon: "i-lucide-alert-circle",
    });
  }
}

onMounted(() => {
  fetchUsers();
});
</script>
