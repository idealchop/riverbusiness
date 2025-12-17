// This file handles the root route of the application.
// It immediately redirects the user to the /login page,
// which is the intended entry point for the app.
import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirect to the login page.
  redirect('/login');
}
