import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Packing List Generator',
  description: 'Learn LLM tool-calling patterns with an AI-powered packing checklist generator',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
