// The exchange directory: every service in docker-compose.yml, with its number.
const ENTRIES = [
  { name: 'Agent API docs', number: ':8000/docs', href: 'http://localhost:8000/docs' },
  { name: 'Grafana dashboards', number: ':3000', href: 'http://localhost:3000' },
  { name: 'MLflow experiments', number: ':5000', href: 'http://localhost:5000' },
  { name: 'Prometheus', number: ':9200', href: 'http://localhost:9200' },
];

export function Directory() {
  return (
    <footer className="bg-bakelite text-faceplate">
      <div className="h-2 bg-gradient-to-r from-brass/70 via-brass to-brass/70" aria-hidden />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_1.4fr]">
        <div>
          <p className="plate text-brass">Directory</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-faceplate/70">
            CallCenterAI — multilingual ticket classification with smart routing, PII scrubbing and full MLOps
            monitoring. By Molka &amp; Rayen.
          </p>
        </div>
        <ul className="font-type text-sm">
          {ENTRIES.map((entry) => (
            <li key={entry.name}>
              <a
                href={entry.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-baseline gap-2 py-1.5 hover:text-lamp"
              >
                <span>{entry.name}</span>
                <span className="flex-1 border-b border-dotted border-faceplate/30 group-hover:border-lamp" aria-hidden />
                <span className="text-faceplate/70 group-hover:text-lamp">localhost{entry.number}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
