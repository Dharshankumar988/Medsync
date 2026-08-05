import "./globals.css";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/providers/theme-provider";
import { Providers } from "@/providers/query-provider";
import { RoleProvider } from "@/providers/role-provider";
import { Web3Provider } from "@/context/Web3Context";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "MedSync — Secure Healthcare Platform",
  description: "Enterprise healthcare platform powered by AI diagnostics and blockchain-verified medical records. Built for hospitals, doctors, pharmacies, and patients.",
  openGraph: {
    title: "MedSync — Secure Healthcare Platform",
    description: "Enterprise healthcare platform powered by AI diagnostics and blockchain-verified medical records.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <Providers>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem
            disableTransitionOnChange
          >
            <RoleProvider>
              <Web3Provider>
                {children}
              </Web3Provider>
            </RoleProvider>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
