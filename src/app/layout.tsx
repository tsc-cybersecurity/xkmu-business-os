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
  title: "xKMU Business OS",
  description: "Professionelles Business Operating System für KMU",
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
