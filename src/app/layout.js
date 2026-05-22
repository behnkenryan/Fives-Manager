import "./globals.css";

export const metadata = {
  title: "Five A Side Socials",
  description: "Monday night football — player selection",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
