<script setup>
import { ref } from 'vue';

const CREWS = [
  ['Ridge Runners', 'Saturday · 4 places'],
  ['Creek Keepers', 'Saturday · 2 places'],
  ['Switchback Six', 'Sunday · 5 places'],
  ['Cedar Hollow', 'Sunday · 1 place'],
  ['Summit Stewards', 'Next week · 6 places'],
];
const shown = ref(3);
const note = ref(true);
</script>

<template>
  <section id="crews" class="crews">
    <h2>Crews near you</h2>
    <ul :class="shown > 3 ? 'crew-list all' : 'crew-list'">
      <li v-for="[name, when] in CREWS.slice(0, shown)" :key="name" class="crew">
        <b>{{ name }}</b>
        <span>{{ when }}</span>
      </li>
    </ul>
    <p v-if="note" id="note" class="note">Two crews still need people this week.</p>
    <p id="count" class="count">Showing {{ shown }} crews</p>
    <div class="row">
      <button id="more" class="btn ghost" type="button" @click="shown = 5">Show more</button>
      <button id="toggle" class="btn ghost" type="button" @click="note = !note">{{ note ? 'Hide the note' : 'Show the note' }}</button>
    </div>
  </section>
</template>
