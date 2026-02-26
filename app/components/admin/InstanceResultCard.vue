<template>
  <div>
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
              <UIcon name="i-lucide-server" class="w-4 h-4" /> 對接端點 (Host)
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
                  @click="$emit('copy', result.hostUrl)"
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
                  @click="$emit('copy', result.clientUrl)"
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
      <h3 class="mt-2 text-sm font-semibold text-neutral-900 dark:text-white">
        無啟用中的連線實體
      </h3>
      <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        點擊上方按鈕立即配置一組新的獨立 WebSocket 資源。
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { InstanceResult } from "~/composables/useAdminUsers";

defineProps<{
  result: InstanceResult | null;
  loading: boolean;
  errorMsg: string;
}>();

defineEmits<{
  (e: "copy", text: string): void;
}>();
</script>
