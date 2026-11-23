import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Real Gas Escape Room",
  description:
    "A three-level interactive investigation of real gases with a live class data wall.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
