import { Component } from '@angular/core';

@Component({
  selector: 'app-hero',
  template: `
    <section id="hero" class="hero">
      <h1>Fix a trail this weekend</h1>
      <p class="lede">Join a volunteer crew near you. Tools and lunch are provided.</p>
      <button id="join" class="btn" type="button">Join a crew</button>
    </section>
  `,
})
export class Hero {}
