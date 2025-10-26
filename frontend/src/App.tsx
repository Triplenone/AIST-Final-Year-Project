import './styles/global.css';

export default function App() {
  return (
    <main className="app-shell">
      <section>
        <p className="eyebrow">Future React dashboard</p>
        <h1>SmartCare PWA shell</h1>
        <p>
          This lightweight React entry point keeps the build pipeline healthy while the legacy
          <code>frontend/web-dashboard</code> continues to serve production traffic.
        </p>
        <p>
          Start replacing sections by creating feature folders under <code>src/</code> and wiring them
          into this component. Shared hooks/utilities can live under <code>src/shared</code>.
        </p>
      </section>
      <section className="next-step">
        <h2>Next steps</h2>
        <ul>
          <li>Map DataGateway APIs to React Query or custom hooks.</li>
          <li>Port visual tokens from the static dashboard into CSS variables.</li>
          <li>Add routing/auth flows and migrate real panels incrementally.</li>
        </ul>
      </section>
    </main>
  );
}
