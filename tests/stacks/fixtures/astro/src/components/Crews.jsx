import { useState } from 'react';

const CREWS = [
  ['Ridge Runners', 'Saturday · 4 places'],
  ['Creek Keepers', 'Saturday · 2 places'],
  ['Switchback Six', 'Sunday · 5 places'],
  ['Cedar Hollow', 'Sunday · 1 place'],
  ['Summit Stewards', 'Next week · 6 places'],
];

export default function Crews() {
  const [shown, setShown] = useState(3);
  const [note, setNote] = useState(true);
  return (
    <section id="crews" className="crews">
      <h2>Crews near you</h2>
      <ul className={shown > 3 ? 'crew-list all' : 'crew-list'}>
        {CREWS.slice(0, shown).map(([name, when]) => (
          <li className="crew" key={name}>
            <b>{name}</b>
            <span>{when}</span>
          </li>
        ))}
      </ul>
      {note && (
        <p id="note" className="note">
          Two crews still need people this week.
        </p>
      )}
      <p id="count" className="count">
        Showing {shown} crews
      </p>
      <div className="row">
        <button id="more" className="btn ghost" type="button" onClick={() => setShown(5)}>
          Show more
        </button>
        <button id="toggle" className="btn ghost" type="button" onClick={() => setNote(!note)}>
          {note ? 'Hide the note' : 'Show the note'}
        </button>
      </div>
    </section>
  );
}
