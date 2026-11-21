import { Component } from '@angular/core';
import { Crews } from './crews';
import { Hero } from './hero';
import { Signup } from './signup';

@Component({
  selector: 'app-root',
  imports: [Hero, Crews, Signup],
  styles: ':host, app-hero, app-crews, app-signup { display: contents; }',
  template: `
    <div class="page">
      <header class="top">
        <strong class="brand">Trailhead</strong>
        <span id="stack" class="stack">angular</span>
      </header>
      <main>
        <app-hero />
        <app-crews />
        <app-signup />
      </main>
    </div>
  `,
})
export class App {}
