<script setup lang="ts">
import logo from '@/assets/images/logo.png'
</script>

<template>
  <div class="flex h-full">
    <div
      class="flex flex-col justify-between border-r border-[#DADADA] bg-[#EDEDED] px-2 py-4 dark:border-[#292929] dark:bg-[#121212]"
    >
      <div class="flex flex-col items-center gap-4 text-xl">
        <img :src="logo" alt="logo" class="h-[44px] w-[44px]" />

        <RouterLink
          to="/"
          :class="{ 'text-[#3498db]': $route.path === '/' }"
          class="icon-btn i-carbon-home"
        ></RouterLink>

        <RouterLink
          to="/chat"
          :class="{ 'text-[#3498db]': $route.path === '/chat' }"
          class="icon-btn i-carbon-chat"
        ></RouterLink>
      </div>

      <div class="flex flex-col items-center gap-4 text-xl">
        <a
          class="i-carbon-logo-github icon-btn"
          href="https://github.com/tlyboy/apichat"
          target="_blank"
          rel="noopener noreferrer"
        ></a>

        <DarkToggle />

        <RouterLink
          to="/settings"
          :class="{ 'text-[#3498db]': $route.path === '/settings' }"
          class="icon-btn i-carbon-settings"
        ></RouterLink>
      </div>
    </div>

    <div class="flex-1 overflow-hidden">
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </div>
  </div>
</template>
