import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="legal">
      <p>
        <Link to="/">← На сторінку замовлення</Link>
      </p>
      <h1>{title}</h1>
      {children}
    </main>
  );
}
