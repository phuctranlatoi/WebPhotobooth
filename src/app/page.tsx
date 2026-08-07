import { redirect } from 'next/navigation';

export default function Home() {
  // Photobooth root URL shouldn't show anything specific, redirect to 404 or a landing page
  redirect('/404');
}
