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
    default: "Kai Focus — a calm Pomodoro focus room with lock-in sessions",
    template: "%s | Kai Focus",
  },
  description:
    "Commit to a stretch of time and Kai plans the focus blocks and breaks around it. Layered focus sounds, tasks, voice control, and measured stats. Free, no account.",
  applicationName: "Kai Focus",
  keywords: [
    "Kai",
    "Kai Focus",
    "pomodoro timer",
    "focus timer",
    "study timer",
    "lock in session",
    "focus sounds",
    "brown noise",
    "adaptive pomodoro",
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
    title: "Kai Focus — a calm Pomodoro focus room with lock-in sessions",
    description:
      "Commit to two hours and Kai lays out the focus blocks and breaks, then runs them while you work.",
    siteName: "Kai Focus",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kai Focus — a calm Pomodoro focus room with lock-in sessions",
    description:
      "A calm focus room: lock-in sessions, your own timings, layered focus sounds, and stats you can trust.",
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
