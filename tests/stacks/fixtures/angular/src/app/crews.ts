import { Component, computed, signal } from '@angular/core';

const CREWS: Array<[string, string]> = [
  ['Ridge Runners', 'Saturday · 4 places'],
  ['Creek Keepers', 'Saturday · 2 places'],
  ['Switchback Six', 'Sunday · 5 places'],
  ['Cedar Hollow', 'Sunday · 1 place'],
  ['Summit Stewards', 'Next week · 6 places'],
];

@Component({
  selector: 'app-crews',
  template: `
    <section id="crews" class="crews">
      <h2>Crews near you</h2>
      <ul [class]="shown() > 3 ? 'crew-list all' : 'crew-list'">
        @for (crew of crews(); track crew[0]) {
          <li class="crew">
            <b>{{ crew[0] }}</b>
            <span>{{ crew[1] }}</span>
          </li>
        }
      </ul>
      @if (note()) {
        <p id="note" class="note">Two crews still need people this week.</p>
      }
      <p id="count" class="count">Showing {{ shown() }} crews</p>
      <div class="row">
        <button id="more" class="btn ghost" type="button" (click)="shown.set(5)">Show more</button>
        <button id="toggle" class="btn ghost" type="button" (click)="note.set(!note())">{{ note() ? 'Hide the note' : 'Show the note' }}</button>
      </div>
    </section>
  `,
})
export class Crews {
  readonly shown = signal(3);
  readonly note = signal(true);
  readonly crews = computed(() => CREWS.slice(0, this.shown()));
}
