import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "URDF Color Palette",
  description:
    "Browse named URDF materials and copy their <material> snippets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
