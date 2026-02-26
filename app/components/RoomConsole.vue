<template>
  <div
    class="mt-4 bg-neutral-50 dark:bg-neutral-950 ring-1 ring-neutral-200 dark:ring-neutral-800 rounded-lg overflow-hidden"
  >
    <!-- 控制台頂部工具列 -->
    <div
      class="flex items-center justify-between px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
    >
      <div class="flex items-center gap-2 text-sm">
        <span
          class="inline-block w-2 h-2 rounded-full"
          :class="connected ? 'bg-green-500' : 'bg-neutral-400'"
        />
        <span class="font-medium text-neutral-700 dark:text-neutral-300">
          {{ connected ? "已連線" : "未連線" }}
        </span>
        <span
          v-if="onlineClients.length"
          class="text-neutral-400 dark:text-neutral-500"
        >
          · {{ onlineClients.length }} 個 Client 在線
        </span>
      </div>
      <div class="flex items-center gap-1">
        <UButton
          v-if="!connected"
          icon="i-lucide-plug"
          size="xs"
          color="neutral"
          variant="soft"
          :loading="connecting"
          @click="$emit('connect')"
        >
          連線
        </UButton>
        <UButton
          v-else
          icon="i-lucide-unplug"
          size="xs"
          color="error"
          variant="ghost"
          @click="$emit('disconnect')"
        >
          斷線
        </UButton>
        <UButton
          icon="i-lucide-trash-2"
          size="xs"
          color="neutral"
          variant="ghost"
          @click="$emit('clear')"
          title="清除紀錄"
        />
      </div>
    </div>

    <!-- 訊息紀錄 -->
    <div
      ref="logContainer"
      class="h-64 overflow-y-auto px-4 py-2 font-mono text-xs leading-relaxed space-y-0.5"
    >
      <div v-if="!messages.length" class="text-neutral-400 py-8 text-center">
        尚無訊息紀錄
      </div>
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="group flex items-start gap-2"
        :class="{
          'text-neutral-400 dark:text-neutral-500 italic':
            msg.direction === 'system',
          'text-blue-600 dark:text-blue-400': msg.direction === 'in',
          'text-green-600 dark:text-green-400': msg.direction === 'out',
        }"
      >
        <span class="shrink-0 text-neutral-400 dark:text-neutral-600">
          {{ msg.time }}
        </span>
        <span
          class="shrink-0 font-semibold w-20 truncate"
          :title="msg.clientId"
        >
          <template v-if="msg.direction === 'system'"> [系統] </template>
          <template v-else-if="msg.direction === 'in'">
            ← {{ msg.clientId }}
          </template>
          <template v-else> → {{ msg.clientId }} </template>
        </span>
        <span class="break-all flex-1">{{ msg.content }}</span>
        <button
          class="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-pointer"
          title="複製訊息"
          @click="copyMessage(msg.content)"
        >
          <UIcon name="i-lucide-copy" class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- 發送區域 -->
    <div
      class="flex items-center gap-2 px-4 py-2 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
    >
      <select
        v-model="selectedClient"
        class="rounded-md border-0 py-1.5 px-2 text-xs ring-1 ring-inset ring-neutral-300 dark:ring-neutral-700 dark:bg-neutral-800 dark:text-white focus:ring-2 focus:ring-neutral-600 min-w-[120px]"
        :disabled="!connected"
      >
        <option value="">廣播 (全部)</option>
        <option v-for="cid in onlineClients" :key="cid" :value="cid">
          {{ cid }}
        </option>
      </select>
      <input
        v-model="inputText"
        class="flex-1 rounded-md border-0 py-1.5 px-3 text-sm ring-1 ring-inset ring-neutral-300 dark:ring-neutral-700 dark:bg-neutral-800 dark:text-white placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-600"
        placeholder="輸入訊息..."
        :disabled="!connected"
        @keydown.enter="handleSend"
      />
      <UButton
        icon="i-lucide-send"
        size="xs"
        color="neutral"
        variant="solid"
        :disabled="!connected || !inputText.trim()"
        @click="handleSend"
      >
        發送
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import type { ConsoleMessage } from "~/composables/useRoomConsole";

const props = defineProps<{
  connected: boolean;
  connecting: boolean;
  messages: ConsoleMessage[];
  onlineClients: string[];
}>();

const emit = defineEmits<{
  connect: [];
  disconnect: [];
  clear: [];
  send: [content: string, targetClientId?: string];
}>();

const inputText = ref("");
const selectedClient = ref("");
const logContainer = ref<HTMLElement | null>(null);

function handleSend() {
  const text = inputText.value.trim();
  if (!text) return;

  emit("send", text, selectedClient.value || undefined);
  inputText.value = "";
}

async function copyMessage(content: string) {
  try {
    await navigator.clipboard.writeText(content);
    useToast().add({
      title: "已複製",
      icon: "i-lucide-clipboard-check",
      color: "success",
    });
  } catch {
    useToast().add({
      title: "複製失敗",
      color: "error",
      icon: "i-lucide-alert-circle",
    });
  }
}

// 訊息更新時自動捲到底部
watch(
  () => props.messages.length,
  async () => {
    await nextTick();
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight;
    }
  },
);
</script>
