import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { DesignProvider } from "./_components/design-provider";

const ubuntu = localFont({
  src: "./fonts/ubuntu-regular.woff2",
  variable: "--font-ubuntu",
  weight: "400",
  display: "swap",
});

const ubuntuMono = localFont({
  src: "./fonts/ubuntu-mono-regular.woff2",
  variable: "--font-ubuntu-mono",
  weight: "400",
  display: "swap",
});

const inter = localFont({
  src: "./fonts/inter-variable.woff2",
  variable: "--font-inter",
  display: "swap",
});

const roboto = localFont({
  src: "./fonts/roboto-variable.woff2",
  variable: "--font-roboto",
  display: "swap",
});

const montserrat = localFont({
  src: "./fonts/montserrat-variable.woff2",
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')
      ? process.env.NEXT_PUBLIC_APP_URL
      : 'https://bos.dev.xkmu.de'
  ),
  title: "xKMU Business OS",
  description: "Professionelles Business Operating System für KMU",
  openGraph: {
    type: 'website',
    siteName: 'xKMU Business OS',
    images: [{ url: 'https://www.xkmu.de/xkmu_q_gross_slogan.png', width: 400, height: 128, alt: 'xKMU Business OS' }],
  },
  twitter: {
    card: 'summary',
    site: '@xkmu',
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body
        className={`${ubuntu.variable} ${ubuntuMono.variable} ${inter.variable} ${roboto.variable} ${montserrat.variable} antialiased`}
      >
        <DesignProvider>{children}</DesignProvider>
      </body>
    </html>
  );
}
