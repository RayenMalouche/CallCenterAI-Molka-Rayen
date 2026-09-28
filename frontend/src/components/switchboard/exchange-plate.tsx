// The cabinet's nameplate, with a pilot lamp for each service behind the board.
import { useEffect, useState } from 'react';

import { cn } from '../../lib/cn';
import { fetchHealth, Health } from '../../lib/exchange';

type LampState = 'checking' | 'on' | 'off';

function usePilotLamps(intervalMs = 15000) {
  const [health, setHealth] = useState<Health | null>(null);
  const [reachable, setReachable] = useState<LampState>('checking');

  useEffect(() => {
    let controller = new AbortController();
    const check = async () => {
      controller.abort();
      controller = new AbortController();
      try {
        setHealth(await fetchHealth(controller.signal));
        setReachable('on');
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setHealth(null);
        setReachable('off');
      }
    };
    check();
    const id = setInterval(check, intervalMs);
    return () => {
      clearInterval(id);
      controller.abort();
    };
  }, [intervalMs]);

  const service = (up: boolean | undefined): LampState =>
    reachable === 'checking' ? 'checking' : up ? 'on' : 'off';

  return [
    { name: 'Agent', model: 'router', state: reachable },
    { name: 'Local', model: 'TF-IDF + SVM', state: service(health?.tfidf_service) },
    { name: 'Trunk', model: 'DistilBERT', state: service(health?.transformer_service) },
  ];
}

export function ExchangePlate() {
  const lamps = usePilotLamps();

  return (
    <header className="bg-bakelite text-faceplate">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-7 pt-8 sm:px-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="plate text-brass">ENSIT · MLOps project 2025</p>
          <h1 className="mt-2 font-display text-5xl font-extrabold uppercase leading-[0.9] tracking-tight sm:text-7xl">
            CallCenter<span className="text-lamp">AI</span>
          </h1>
          <p className="mt-3 max-w-xl text-faceplate/75">
            A ticket switchboard. Every call is scrubbed of caller details, handed to the operator best suited to it,
            and patched through to one of eight departments.
          </p>
        </div>

        <ul className="flex gap-5 sm:gap-7" aria-label="Service status">
          {lamps.map((lamp) => (
            <li key={lamp.name} className="flex flex-col items-center gap-2 text-center">
              <span
                className={cn(
                  'h-4 w-4 rounded-full border border-brass/60',
                  lamp.state === 'on' && 'bg-lamp shadow-[0_0_12px_2px_rgba(240,167,58,0.6)]',
                  lamp.state === 'off' && 'bg-cord/70',
                  lamp.state === 'checking' && 'animate-ring bg-lamp/60',
                )}
                aria-hidden
              />
              <span className="plate text-[0.7rem]">{lamp.name}</span>
              <span className="font-type text-[0.7rem] text-faceplate/60">
                {lamp.state === 'checking' ? 'testing…' : lamp.state === 'on' ? 'in service' : 'no answer'}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="h-2 bg-gradient-to-r from-brass/70 via-brass to-brass/70" aria-hidden />
    </header>
  );
}
