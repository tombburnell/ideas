import type { Metadata } from "next";
import "@/app/globals.css";
import { QueryProvider } from "@/contexts/query-provider";

export const metadata: Metadata = {
  title: "DSL Runner",
  description: "DSL-driven workflow runner with live execution visibility"
};

const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>): JSX.Element => (
  <html lang="en">
    <body>
      <QueryProvider>{children}</QueryProvider>
    </body>
  </html>
);

export default RootLayout;
