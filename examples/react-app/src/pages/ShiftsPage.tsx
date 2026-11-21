import { useState } from 'react';
import { Button } from '../components';
import { UPCOMING_SHIFTS } from '../data/sampleData';
import './stubPages.css';

export function ShiftsPage() {
  const [signedUp, setSignedUp] = useState<Set<string>>(() => new Set());

  const toggle = (id: string) => {
    setSignedUp((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="stub-page">
      <h1>Shifts</h1>
      <p className="stub-page__intro">Upcoming work parties for your crew.</p>
      <div className="stub-table-wrap">
        <table className="stub-table">
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Project</th>
              <th scope="col">Time</th>
              <th scope="col">Spots</th>
              <th scope="col">Crew lead</th>
              <th scope="col">
                <span className="visually-hidden">Sign up</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {UPCOMING_SHIFTS.map((shift) => {
              const isSignedUp = signedUp.has(shift.id);
              const taken = shift.spotsTaken + (isSignedUp ? 1 : 0);
              const isFull = taken >= shift.spotsTotal && !isSignedUp;
              return (
                <tr key={shift.id}>
                  <td>{shift.date}</td>
                  <td>{shift.project}</td>
                  <td>{shift.time}</td>
                  <td>
                    {taken}/{shift.spotsTotal} spots
                  </td>
                  <td>{shift.lead}</td>
                  <td>
                    {isFull ? (
                      <span className="stub-page__muted">Full</span>
                    ) : (
                      <Button
                        variant={isSignedUp ? 'secondary' : 'primary'}
                        aria-label={`${isSignedUp ? 'Leave' : 'Sign up for'} ${shift.project} on ${shift.date}`}
                        onClick={() => toggle(shift.id)}
                      >
                        {isSignedUp ? 'Leave shift' : 'Sign up'}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
