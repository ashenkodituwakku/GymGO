import type { Metadata } from 'next';
import { SavedList } from '@/components/SavedList';

export const metadata: Metadata = {
  title: 'Saved gyms',
  description: 'The gyms you saved in this browser.',
  robots: { index: false, follow: false },
};

export default function SavedPage() {
  return (
    <div className="page page--narrow">
      <h1>Saved gyms</h1>
      <p className="muted">
        Kept in this browser only. They are not sent to us, will not appear on another device, and
        will disappear if you clear this site&rsquo;s data. An account would be needed to sync them,
        and we would rather not require one for something this simple.
      </p>
      <SavedList />
    </div>
  );
}
