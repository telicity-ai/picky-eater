<script>
  const CREWS = [
    ['Ridge Runners', 'Saturday · 4 places'],
    ['Creek Keepers', 'Saturday · 2 places'],
    ['Switchback Six', 'Sunday · 5 places'],
    ['Cedar Hollow', 'Sunday · 1 place'],
    ['Summit Stewards', 'Next week · 6 places'],
  ];
  let shown = $state(3);
  let note = $state(true);
</script>

<section id="crews" class="crews">
  <h2>Crews near you</h2>
  <ul class={shown > 3 ? 'crew-list all' : 'crew-list'}>
    {#each CREWS.slice(0, shown) as [name, when] (name)}
      <li class="crew">
        <b>{name}</b>
        <span>{when}</span>
      </li>
    {/each}
  </ul>
  {#if note}
    <p id="note" class="note">Two crews still need people this week.</p>
  {/if}
  <p id="count" class="count">Showing {shown} crews</p>
  <div class="row">
    <button id="more" class="btn ghost" type="button" onclick={() => (shown = 5)}>Show more</button>
    <button id="toggle" class="btn ghost" type="button" onclick={() => (note = !note)}>{note ? 'Hide the note' : 'Show the note'}</button>
  </div>
</section>
