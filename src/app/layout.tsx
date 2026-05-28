import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const twkEverett = localFont({
  src: [
    { path: "../../public/fonts/TWKEverett-Thin.woff2", weight: "100", style: "normal" },
    { path: "../../public/fonts/TWKEverett-Light.woff2", weight: "300", style: "normal" },
    { path: "../../public/fonts/TWKEverett-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/TWKEverett-RegularItalic.woff2", weight: "400", style: "italic" },
    { path: "../../public/fonts/TWKEverett-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/TWKEverett-Bold.woff2", weight: "700", style: "normal" },
    { path: "../../public/fonts/TWKEverett-Black.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-twk-everett",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dither / Tool",
  description: "Generative dithering tool — turn images, video and audio into rhythmic pixel grids.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${twkEverett.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
