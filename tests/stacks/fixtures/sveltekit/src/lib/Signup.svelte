<script>
  let name = $state('');
</script>

<section id="signup" class="signup">
  <h2>Get reminders</h2>
  <label for="name">Your first name</label>
  <input id="name" bind:value={name} autocomplete="off" />
  <p id="hello" class="hello">Hello, {name || 'friend'}!</p>
</section>
