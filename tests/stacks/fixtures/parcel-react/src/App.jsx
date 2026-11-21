import { Crews } from './Crews.jsx';
import { Hero } from './Hero.jsx';
import { Signup } from './Signup.jsx';

export function App() {
  return (
    <div className="page">
      <header className="top">
        <strong className="brand">Trailhead</strong>
        <span id="stack" className="stack">parcel-react</span>
      </header>
      <main>
        <Hero />
        <Crews />
        <Signup />
      </main>
    </div>
  );
}
