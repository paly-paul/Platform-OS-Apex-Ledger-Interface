import { redirect } from 'next/navigation';

// Root redirects to dashboard; auth guard in dashboard handles unauthenticated users.
export default function RootPage() {
  redirect('/dashboard');
}
