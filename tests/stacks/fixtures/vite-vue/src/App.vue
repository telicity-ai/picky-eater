<script setup>
import Crews from './Crews.vue';
import Hero from './Hero.vue';
import Signup from './Signup.vue';
</script>

<template>
  <div class="page">
    <header class="top">
      <strong class="brand">Trailhead</strong>
      <span id="stack" class="stack">vite-vue</span>
    </header>
    <main>
      <Hero />
      <Crews />
      <Signup />
    </main>
  </div>
</template>
