import type { Metadata, Viewport } from "next";
import { Archivo, Archivo_Narrow, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const archivoNarrow = Archivo_Narrow({
  variable: "--font-archivo-narrow",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Moto App",
  description: "Prima, durante e dopo ogni uscita in moto.",
};

export const viewport: Viewport = {
  themeColor: "#050403",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const fontVars = `${archivo.variable} ${archivoNarrow.variable} ${jetbrainsMono.variable}`;
  return (
    <html lang="it" className={`${fontVars} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
