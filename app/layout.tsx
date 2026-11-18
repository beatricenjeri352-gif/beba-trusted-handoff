import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Beba",
  description: "Trusted delivery coordination",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
