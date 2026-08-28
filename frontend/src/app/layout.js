import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'RoadRakshak — AI Road Safety & Pothole Detection Platform',
  description: 'AI-powered road damage detection, automated severity scoring, GPS clustering, municipal dashboard, and repair verification.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          <main className="page-content">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
