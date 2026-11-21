import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-signup',
  template: `
    <section id="signup" class="signup">
      <h2>Get reminders</h2>
      <label for="name">Your first name</label>
      <input id="name" [value]="name()" (input)="name.set($any($event.target).value)" autocomplete="off" />
      <p id="hello" class="hello">Hello, {{ name() || 'friend' }}!</p>
    </section>
  `,
})
export class Signup {
  readonly name = signal('');
}
