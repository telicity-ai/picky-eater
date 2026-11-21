<script>
  import Crews from './Crews.svelte';
  import Hero from './Hero.svelte';
  import Signup from './Signup.svelte';
</script>

<div class="page">
  <header class="top">
    <strong class="brand">Trailhead</strong>
    <span id="stack" class="stack">vite-svelte</span>
  </header>
  <main>
    <Hero />
    <Crews />
    <Signup />
  </main>
</div>
