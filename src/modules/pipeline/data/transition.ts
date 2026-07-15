import { events } from '../../../core/events';
import { transitionLapsedInterviews } from './queries';

// Spec §3: the lapsed-interview check runs at app launch and at each local
// midnight. The midnight run also nudges views to recompute the staleness
// display, which ticks on the same day boundary.
export function startLapsedInterviewCheck(): void {
  const run = async () => {
    await transitionLapsedInterviews();
    events.emit('pipeline:changed');
  };

  const scheduleMidnight = () => {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    // +1s so the run lands safely on the new day
    setTimeout(() => {
      void run().finally(scheduleMidnight);
    }, midnight.getTime() - now.getTime() + 1000);
  };

  void run();
  scheduleMidnight();
}
