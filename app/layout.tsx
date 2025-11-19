import type React from "react";
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import { ThemeProvider } from "next-themes";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EPANET Utilities",
  description:
    "A collection of tools to help you work with EPANET files and models",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} in-h-screen text-gray-900 dark:text-white h-dvh`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
        </ThemeProvider>
      </body>
      <Script src="https://ext.masteringwater.com/latest.js" />
      <Script
        async
        data-uid="89c2df9a6e"
        src="https://mastering-water-models.kit.com/89c2df9a6e/index.js"
      />
    </html>
  );
}
