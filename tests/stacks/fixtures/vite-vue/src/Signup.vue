<script setup>
import { ref } from 'vue';

const name = ref('');
</script>

<template>
  <section id="signup" class="signup">
    <h2>Get reminders</h2>
    <label for="name">Your first name</label>
    <input id="name" v-model="name" autocomplete="off" />
    <p id="hello" class="hello">Hello, {{ name || 'friend' }}!</p>
  </section>
</template>
