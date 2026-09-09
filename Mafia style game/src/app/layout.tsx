import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hidden Agenda | Bhavya Jangid Projects',
  description: 'Multiplayer Hidden Agenda social deduction game for 4 to 20 players. Uncover the Godfather, eliminate the Mafia, and protect the innocent villagers.',
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen text-slate-100">{children}</body>
    </html>
  );
}


