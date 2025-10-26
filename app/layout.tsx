import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hire-Me - Authentication",
  description: "Multi-agent authentication platform",
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
