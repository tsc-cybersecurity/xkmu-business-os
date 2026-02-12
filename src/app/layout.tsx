import type { Metadata } from "next";
import { Ubuntu, Ubuntu_Mono, Geist, Inter, Roboto, Montserrat } from "next/font/google";
import "./globals.css";
import { DesignProvider } from "./_components/design-provider";

const ubuntu = Ubuntu({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-ubuntu",
});

const ubuntuMono = Ubuntu_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-ubuntu-mono",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
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
        className={`${ubuntu.variable} ${ubuntuMono.variable} ${geist.variable} ${inter.variable} ${roboto.variable} ${montserrat.variable} antialiased`}
      >
        <DesignProvider>{children}</DesignProvider>
      </body>
    </html>
  );
}
