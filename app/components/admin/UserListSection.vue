<template>
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
          <span class="font-bold">{{ totalActive }}</span>
          個。
        </p>
      </div>
      <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="soft"
          size="sm"
          @click="$emit('refresh')"
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
        :data="users"
        :columns="columns"
        class="min-w-full"
        :ui="{
          th: 'bg-neutral-50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white font-semibold',
        }"
      >
        <template #id-cell="{ row }">
          <span class="font-mono text-xs">{{ (row.original as any).id }}</span>
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
              @click="$emit('copy', (row.original as any).token)"
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
                $emit(
                  'toggle-console',
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
              @click="$emit('delete', (row.original as any).id)"
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
          <span class="text-sm font-semibold text-neutral-900 dark:text-white">
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
          @click="$emit('close-console')"
        />
      </div>
      <RoomConsole
        :connected="consoleConnected"
        :connecting="consoleConnecting"
        :messages="consoleMessages"
        :online-clients="consoleOnlineClients"
        @connect="$emit('console-connect', activeConsoleId!, activeRoleToken!)"
        @disconnect="$emit('console-disconnect')"
        @clear="$emit('console-clear')"
        @send="
          (content, targetClientId) =>
            $emit('console-send', content, targetClientId)
        "
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UserRow } from "~/composables/useAdminUsers";

// We need an extra prop to distinguish the role token due to a slight difference in current API versus intended.
// Note: emitting the right token to pass up to useRoomConsole.
const props = defineProps<{
  users: UserRow[];
  totalActive: number;
  loadingUsers: boolean;
  columns: any[];
  deletingId: string | null;
  activeConsoleId: string | null;
  activeRoleToken?: string | null;
  consoleConnected: boolean;
  consoleConnecting: boolean;
  consoleMessages: any[];
  consoleOnlineClients: string[];
}>();

defineEmits<{
  (e: "refresh"): void;
  (e: "delete", id: string): void;
  (e: "copy", text: string): void;
  (e: "toggle-console", id: string, token: string): void;
  (e: "close-console"): void;
  (e: "console-connect", id: string, token: string): void;
  (e: "console-disconnect"): void;
  (e: "console-clear"): void;
  (e: "console-send", content: string, targetClientId?: string): void;
}>();
</script>
