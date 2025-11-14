import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Garden Style Advisor",
  description: "Agentic questionnaire to discover your ideal garden",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="app-header">
            <div className="brand">Garden Style Advisor</div>
            <nav className="header-nav">
              <a href="/" className="link">Questionnaire</a>
            </nav>
          </header>
          <main className="app-main">{children}</main>
          <footer className="app-footer">
            <span>? {new Date().getFullYear()} Garden Style Advisor</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
