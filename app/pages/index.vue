<template>
  <div class="flex items-center justify-center min-h-screen">
    <UCard class="max-w-md w-full text-center">
      <template #header>
        <UIcon
          name="i-heroicons-cube-transparent"
          class="w-12 h-12 text-primary mx-auto mb-4"
        />
        <h1 class="text-2xl font-bold">Relay 伺服器運作中</h1>
      </template>

      <p class="text-gray-500 my-4">這是 WebSocket 多租戶中繼站的根目錄。</p>

      <template #footer>
        <UButton to="/admin" block color="neutral" variant="soft">
          前往管理介面
        </UButton>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts"></script>
