<template>
  <div>
    <ClientOnly>
      <UContainer class="py-12 max-w-3xl">
        <div class="space-y-8">
          <!-- Header Area -->
          <div class="text-center space-y-4">
            <UIcon
              name="i-lucide-server-cog"
              class="w-16 h-16 text-primary mx-auto"
            />
            <h1
              class="text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white"
            >
              多租戶 WebSocket 註冊中心
            </h1>
            <p
              class="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto"
            >
              建立您的專屬連線身份。為了確保物理隔離與通訊安全，每個身份將透過
              Nitro 分配至 Cloudflare 邊緣網路中獨立的房間。
            </p>
          </div>

          <!-- Main Actions Card -->
          <UCard
            class="shadow-xl ring-1 ring-neutral-200 dark:ring-neutral-800"
          >
            <div class="flex flex-col items-center justify-center py-4 sm:py-8">
              <UButton
                size="xl"
                :loading="loading"
                @click="generateUser"
                icon="i-lucide-zap"
                color="primary"
                class="w-full sm:w-auto font-semibold text-lg px-8 shadow-lg transition-transform active:scale-95"
              >
                {{ loading ? "正在分配邊緣運算資源..." : "建立新使用者實體" }}
              </UButton>
              <p class="mt-4 text-sm text-neutral-500">
                點擊後將透過 API 向 Cloudflare KV 寫入憑證並建立分配房間。
              </p>
            </div>

            <!-- Error State -->
            <Transition
              enter-active-class="transition duration-500 ease-out"
              enter-from-class="transform scale-95 opacity-0 translate-y-4"
              enter-to-class="transform scale-100 opacity-100 translate-y-0"
              leave-active-class="transition duration-300 ease-in"
              leave-from-class="transform scale-100 opacity-100"
              leave-to-class="transform scale-95 opacity-0"
            >
              <div v-if="errorMsg" class="mt-6">
                <UAlert
                  icon="i-lucide-alert-triangle"
                  color="error"
                  variant="soft"
                  title="建立失敗"
                  :description="errorMsg"
                />
              </div>
            </Transition>

            <!-- Success State & Details -->
            <Transition
              enter-active-class="transition duration-700 ease-out"
              enter-from-class="transform opacity-0 translate-y-8"
              enter-to-class="transform opacity-100 translate-y-0"
              leave-active-class="transition duration-300 ease-in"
              leave-from-class="transform opacity-100"
              leave-to-class="transform opacity-0"
            >
              <div
                v-if="result"
                class="mt-8 space-y-6 pt-8 border-t border-neutral-200 dark:border-neutral-800"
              >
                <div class="flex items-center gap-3 mb-6">
                  <span
                    class="flex items-center justify-center w-8 h-8 rounded-full bg-success/10 text-success"
                  >
                    <UIcon name="i-lucide-check" class="w-5 h-5" />
                  </span>
                  <h3
                    class="text-xl font-semibold text-neutral-900 dark:text-white"
                  >
                    資源配置成功
                  </h3>
                </div>

                <!-- Credentials Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <UFormField label="房間 ID (User ID)">
                    <UInput
                      :model-value="result.userId"
                      readonly
                      icon="i-lucide-fingerprint"
                      class="font-mono text-sm"
                      :ui="{
                        base: 'bg-neutral-50 dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700',
                      }"
                    />
                  </UFormField>
                  <UFormField label="對稱式金鑰 (Token)">
                    <UInput
                      :model-value="result.token"
                      readonly
                      type="password"
                      icon="i-lucide-key-round"
                      class="font-mono text-sm"
                      :ui="{
                        base: 'bg-neutral-50 dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700',
                      }"
                    />
                  </UFormField>
                </div>

                <!-- Endpoint Connections -->
                <div
                  class="space-y-4 mt-8 bg-neutral-50 dark:bg-neutral-900/50 p-6 rounded-xl border border-neutral-200 dark:border-neutral-800"
                >
                  <h4
                    class="font-medium text-sm text-neutral-700 dark:text-neutral-300 mb-2 flex items-center gap-2"
                  >
                    <UIcon name="i-lucide-link" class="w-4 h-4" /> 對接端點配置
                  </h4>

                  <div class="space-y-4">
                    <UFormField label="Host (主機端 / Docker 端)">
                      <div class="flex gap-2">
                        <UInput
                          :model-value="result.hostUrl"
                          readonly
                          icon="i-lucide-server"
                          class="font-mono text-xs flex-1"
                        />
                        <UButton
                          color="neutral"
                          variant="soft"
                          icon="i-lucide-copy"
                          class="shrink-0"
                          @click="copyText(result.hostUrl)"
                        >
                          複製
                        </UButton>
                      </div>
                    </UFormField>

                    <UFormField label="Client (客戶端 / 雲端)">
                      <div class="flex gap-2">
                        <UInput
                          :model-value="result.clientUrl"
                          readonly
                          icon="i-lucide-monitor-smartphone"
                          class="font-mono text-xs flex-1"
                        />
                        <UButton
                          color="neutral"
                          variant="soft"
                          icon="i-lucide-copy"
                          class="shrink-0"
                          @click="copyText(result.clientUrl)"
                        >
                          複製
                        </UButton>
                      </div>
                    </UFormField>
                  </div>
                </div>
              </div>
            </Transition>
          </UCard>
        </div>
      </UContainer>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

useSeoMeta({
  title: "WebSocket 管理介面 - 註冊中心",
});

const loading = ref(false);
const result = ref<{
  userId: string;
  token: string;
  hostUrl: string;
  clientUrl: string;
} | null>(null);
const errorMsg = ref("");
const toast = useToast();

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
      title: "建立成功",
      description: "已分配獨立的 WebSocket 房間與鑑權金鑰。",
      color: "success",
      icon: "i-lucide-check-circle",
    });
  } catch (err: any) {
    errorMsg.value =
      err.message || "無法連接伺服器，請確認網路環境或 Wrangler 狀態。";
  } finally {
    loading.value = false;
  }
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.add({
      title: "已複製到剪貼簿",
      icon: "i-lucide-clipboard-check",
      color: "success",
    });
  } catch (e) {
    toast.add({
      title: "複製失敗，您的瀏覽器可能阻擋了此操作",
      color: "error",
      icon: "i-lucide-alert-circle",
    });
  }
}
</script>
