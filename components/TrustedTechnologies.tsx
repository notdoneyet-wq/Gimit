const technologies = [
  "GitHub",
  "Google ADK",
  "MCP",
  "FastAPI",
  "Next.js",
  "Claude",
  "OpenAI",
  "Gemini",
];

export function TrustedTechnologies() {
  return (
    <section className="section">
      <div className="section-header">
        <span className="eyebrow">Trusted Technologies</span>
        <h2>Built with the developer tools that already power modern open source.</h2>
      </div>
      <div className="logo-grid" aria-label="Trusted technologies">
        {technologies.map((item) => (
          <div className="logo-chip" key={item}>
            <span className="logo-mark">{item.slice(0, 1)}</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
