import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://heykai.vercel.app"),
  title: {
    default: "Kai Focus — AI focus coach for adaptive Pomodoro sessions",
    template: "%s | Kai Focus",
  },
  description:
    "Kai Focus is an adaptive AI Pomodoro coach for calendar-aware planning, Gmail signals, voice commands, Spotify focus music, and productivity trends.",
  applicationName: "Kai Focus",
  keywords: [
    "Kai",
    "Kai Focus",
    "AI focus coach",
    "adaptive Pomodoro",
    "productivity trends",
    "calendar planner",
    "Spotify focus music",
  ],
  authors: [{ name: "Kai Focus" }],
  creator: "Kai Focus",
  publisher: "Kai Focus",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    title: "Kai Focus — AI focus coach for adaptive Pomodoro sessions",
    description:
      "Plan your next focus block around your calendar, priorities, inbox signals, energy, and Spotify music.",
    siteName: "Kai Focus",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kai Focus — AI focus coach for adaptive Pomodoro sessions",
    description:
      "A calm focus room with adaptive timing, calendar planning, voice, Spotify, and productivity trends.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [{ url: "/logo.svg", type: "image/svg+xml" }],
    apple: [{ url: "/logo.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
