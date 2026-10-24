import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Karya Saarthi Unified CRM",
  description: "Staff Admin Console",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
