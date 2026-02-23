<template>
  <ClientOnly>
    <UContainer class="py-12 max-w-2xl">
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <UIcon
              name="i-heroicons-shield-check"
              class="w-8 h-8 text-primary"
            />
            <h2 class="text-2xl font-bold leading-tight">
              多租戶 WebSocket 註冊中心
            </h2>
          </div>
        </template>

        <div class="space-y-6">
          <p class="text-gray-600 dark:text-gray-300">
            在此處建立專屬的連線身份。為了物理隔離不同的通訊數據，每個身份會對應一個獨立的
            Durable Object 房間。
          </p>

          <UButton
            size="lg"
            block
            icon="i-heroicons-plus-circle"
            color="primary"
            :loading="loading"
            @click="generateUser"
          >
            {{ loading ? "分配資源中..." : "建立新使用者" }}
          </UButton>

          <UAlert
            v-if="errorMsg"
            icon="i-heroicons-exclamation-triangle"
            color="error"
            variant="soft"
            title="錯誤"
            :description="errorMsg"
          />

          <div
            v-if="result"
            class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800"
          >
            <UFormField label="User ID (房間 ID)">
              <UInput
                :model-value="result.userId"
                readonly
                icon="i-heroicons-identification"
              />
            </UFormField>
            <UFormField label="安全 Token (金鑰)">
              <UInput
                :model-value="result.token"
                readonly
                type="password"
                icon="i-heroicons-key"
              />
            </UFormField>

            <div class="mt-6 flex flex-col gap-3">
              <UButton
                color="neutral"
                variant="solid"
                icon="i-heroicons-clipboard-document"
                @click="copyText(result.hostUrl)"
              >
                複製 Host (Docker端) 對接網址
              </UButton>

              <UButton
                color="neutral"
                variant="solid"
                icon="i-heroicons-clipboard-document-check"
                @click="copyText(result.clientUrl)"
              >
                複製 Client (雲端) 對接網址
              </UButton>
            </div>
          </div>
        </div>
      </UCard>
    </UContainer>
  </ClientOnly>
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
      errorMsg.value = `API 回應錯誤 (${res.status}): ${details}`;
      return;
    }
    result.value = await res.json();
    toast.add({
      title: "建立成功",
      description: "已分配獨立的 WebSocket 房間。",
      color: "success",
    });
  } catch (err: any) {
    errorMsg.value = err.message || "無法連接伺服器";
  } finally {
    loading.value = false;
  }
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.add({
      title: "已複製到剪貼簿",
      icon: "i-heroicons-check-circle",
      color: "success",
    });
  } catch (e) {
    toast.add({ title: "複製失敗", color: "error" });
  }
}
</script>
