import { For, Show, createSignal } from 'solid-js';

const CREWS = [
  ['Ridge Runners', 'Saturday · 4 places'],
  ['Creek Keepers', 'Saturday · 2 places'],
  ['Switchback Six', 'Sunday · 5 places'],
  ['Cedar Hollow', 'Sunday · 1 place'],
  ['Summit Stewards', 'Next week · 6 places'],
];

export function Crews() {
  const [shown, setShown] = createSignal(3);
  const [note, setNote] = createSignal(true);
  return (
    <section id="crews" class="crews">
      <h2>Crews near you</h2>
      <ul class={shown() > 3 ? 'crew-list all' : 'crew-list'}>
        <For each={CREWS.slice(0, shown())}>
          {([name, when]) => (
            <li class="crew">
              <b>{name}</b>
              <span>{when}</span>
            </li>
          )}
        </For>
      </ul>
      <Show when={note()}>
        <p id="note" class="note">
          Two crews still need people this week.
        </p>
      </Show>
      <p id="count" class="count">
        Showing {shown()} crews
      </p>
      <div class="row">
        <button id="more" class="btn ghost" type="button" onClick={() => setShown(5)}>
          Show more
        </button>
        <button id="toggle" class="btn ghost" type="button" onClick={() => setNote(!note())}>
          {note() ? 'Hide the note' : 'Show the note'}
        </button>
      </div>
    </section>
  );
}
