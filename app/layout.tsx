import type { ReactNode } from "react";
import "./globals.css";
import ClientSessionProvider from "./providers/ClientSessionProvider";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClientSessionProvider>
          {children}
        </ClientSessionProvider>
      </body>
    </html>
  );
}

