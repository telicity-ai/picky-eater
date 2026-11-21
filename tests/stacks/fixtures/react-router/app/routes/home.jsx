import { Crews } from '../Crews.jsx';
import { Hero } from '../Hero.jsx';
import { Signup } from '../Signup.jsx';

export default function Home() {
  return (
    <div className="page">
      <header className="top">
        <strong className="brand">Trailhead</strong>
        <span id="stack" className="stack">react-router</span>
      </header>
      <main>
        <Hero />
        <Crews />
        <Signup />
      </main>
    </div>
  );
}
