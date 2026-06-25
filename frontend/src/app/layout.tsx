import type { Metadata } from "next";
import { Fredoka, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/context/AuthContext";

// Display font: rounded, friendly, high character -- used for headings,
// the logo, and big numbers. This is the "personality" font.
const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
});

// Body font: clean, highly legible at small sizes -- used for all
// paragraph text, form inputs, and flashcard question/answer content.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Recall — Smart Flashcards from Your Notes",
  description:
    "Paste your study notes and Recall turns them into flashcards automatically using NLP, then helps you review the ones you struggle with most.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${fredoka.variable} ${inter.variable} font-body bg-paper text-ink antialiased`}>
        <AuthProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "#241F1A",
                color: "#FBF6EC",
                borderRadius: "9999px",
                padding: "10px 18px",
                fontFamily: "var(--font-body)",
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
