<template>
  <UApp>
    <div
      class="min-h-screen bg-neutral-50 dark:bg-neutral-950 font-sans text-neutral-900 dark:text-neutral-50"
    >
      <header
        class="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800"
      >
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="flex h-14 justify-between items-center">
            <div class="flex items-center gap-2">
              <UIcon
                name="i-lucide-network"
                class="w-5 h-5 text-neutral-700 dark:text-neutral-300"
              />
              <span class="font-medium text-sm tracking-wide"
                >OpenWebSocket Admin</span
              >
            </div>
            <UButton
              icon="i-lucide-github"
              color="neutral"
              variant="ghost"
              to="https://github.com/skyhilam/openWebSocket"
              target="_blank"
            />
          </div>
        </div>
      </header>

      <main>
        <NuxtPage />
      </main>
    </div>
  </UApp>
</template>
