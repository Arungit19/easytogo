import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ContactButtons from "../components/ContactButtons";
import Navbar from "../components/Navbar";
import { ThemeProvider } from "next-themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Easy To Go",
  description: "Professional House Shifting Service",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/favicon.ico?v=2" />
      </head>

      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="dark"
          enableSystem={false}
        >
          <Navbar />

          {/* ✅ pt-16 = 64px — pushes ALL pages below the fixed navbar */}
          {/* If your navbar is taller, check its height in DevTools and update:
              56px → pt-14
              64px → pt-16  ✅
              80px → pt-20  */}
          <main className="flex-grow pt-6">{children}</main>

          <ContactButtons />
        </ThemeProvider>
      </body>
    </html>
  );
}