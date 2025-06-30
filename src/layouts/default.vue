<template>
  <div class="flex h-full flex-col items-center justify-center gap-4">
    <RouterView />

    <div class="flex items-center gap-2 text-xl">
      <a
        class="i-carbon-logo-github icon-btn"
        href="https://github.com/tlyboy/tauri-vue-starter"
        target="_blank"
        rel="noopener noreferrer"
      ></a>

      <DarkToggle />
    </div>
  </div>
</template>
