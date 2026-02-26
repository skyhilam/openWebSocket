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

        <AdminInstanceResultCard
          :result="result"
          :loading="loading"
          :error-msg="errorMsg"
          @copy="copyText"
        />
      </div>

      <AdminUserListSection
        :users="usersData?.users || []"
        :total-active="usersData?.totalActive || 0"
        :loading-users="loadingUsers"
        :columns="columns"
        :deleting-id="deletingId"
        :active-console-id="activeConsoleId"
        :active-role-token="activeConsoleToken"
        :console-connected="consoleConnected"
        :console-connecting="consoleConnecting"
        :console-messages="consoleMessages"
        :console-online-clients="consoleOnlineClients"
        @refresh="fetchUsers"
        @delete="deleteUser"
        @copy="copyText"
        @toggle-console="toggleConsole"
        @close-console="closeConsole"
        @console-connect="consoleConnect"
        @console-disconnect="consoleDisconnect"
        @console-clear="consoleClearMessages"
        @console-send="handleConsoleSend"
      />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useAdminUsers } from "~/composables/useAdminUsers";
import { useRoomConsole } from "~/composables/useRoomConsole";

useSeoMeta({
  title: "WebSocket 實體管理 | OpenWebSocket",
});

const {
  loading,
  result,
  errorMsg,
  loadingUsers,
  deletingId,
  usersData,
  columns,
  generateUser,
  fetchUsers,
  deleteUser,
  copyText,
} = useAdminUsers();

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

onMounted(() => {
  fetchUsers();
});
</script>
