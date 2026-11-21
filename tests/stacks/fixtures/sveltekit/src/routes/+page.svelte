<script>
  import Crews from '../lib/Crews.svelte';
  import Hero from '../lib/Hero.svelte';
  import Signup from '../lib/Signup.svelte';
  import '../trailhead.css';
</script>

<div class="page">
  <header class="top">
    <strong class="brand">Trailhead</strong>
    <span id="stack" class="stack">sveltekit</span>
  </header>
  <main>
    <Hero />
    <Crews />
    <Signup />
  </main>
</div>
