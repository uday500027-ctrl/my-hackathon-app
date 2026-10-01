import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  // Fraunces is a variable font; no weight needed
});

export const viewport: Viewport = {
  themeColor: "#2f5e3e",
};

export const metadata: Metadata = {
  title: "PasteGuard - check text before you send it",
  description:
    "PasteGuard masks personal data, keys and passwords on the server, then has Gemini review only the masked text for business and context risks — so your raw text is never exposed.",
  metadataBase: new URL("https://my-hackathon-app.vercel.app"),
  openGraph: {
    title: "PasteGuard - check text before you send it",
    description:
      "Mask sensitive data and check contextual risk before you paste text into an AI, email, or public post.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full antialiased",
        inter.variable,
        fraunces.variable
      )}
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
