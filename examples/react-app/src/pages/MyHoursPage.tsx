import { LOGGED_HOURS } from '../data/sampleData';
import './stubPages.css';

export function MyHoursPage() {
  const total = LOGGED_HOURS.reduce((sum, entry) => sum + entry.hours, 0);

  return (
    <div className="stub-page">
      <h1>My hours</h1>
      <p className="stub-page__intro">
        {total.toFixed(1)} hours logged this season. Crew leads approve hours after each shift.
      </p>
      <div className="stub-table-wrap">
        <table className="stub-table">
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Project</th>
              <th scope="col">Hours</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {LOGGED_HOURS.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.date}</td>
                <td>{entry.project}</td>
                <td>{entry.hours.toFixed(1)}</td>
                <td>{entry.status === 'approved' ? 'Approved' : 'Pending approval'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
