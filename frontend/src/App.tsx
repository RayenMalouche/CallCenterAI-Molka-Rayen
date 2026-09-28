import { useState } from 'react';

import { OperatorLine } from './components/ui/operator-line';
import { Directory } from './components/switchboard/directory';
import { ExchangePlate } from './components/switchboard/exchange-plate';
import { Ledger } from './components/switchboard/ledger';
import { PatchPanel } from './components/switchboard/patch-panel';
import { TollTicket } from './components/switchboard/toll-ticket';
import { API_URL, Call, Operator, predict, SAMPLE_CALLS } from './lib/exchange';

export default function App() {
  const [text, setText] = useState('');
  const [forced, setForced] = useState<Operator | null>(null);
  const [ringing, setRinging] = useState(false);
  const [call, setCall] = useState<Call | null>(null);
  const [fault, setFault] = useState<string | null>(null);
  const [serial, setSerial] = useState(0);

  const connect = async () => {
    const ticket = text.trim();
    if (!ticket || ringing) return;
    setRinging(true);
    setFault(null);
    setCall(null);
    try {
      const prediction = await predict(ticket, forced);
      setCall({ text: ticket, forced, prediction });
      setSerial((n) => n + 1);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      setFault(`${reason === 'Failed to fetch' ? 'No answer from the agent' : reason} — is it running at ${API_URL}?`);
    } finally {
      setRinging(false);
    }
  };

  return (
    <div className="min-h-screen">
      <ExchangePlate />

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
        <section aria-label="The board">
          <PatchPanel call={call} ringing={ringing} fault={fault} />
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-8">
          <section aria-label="Place a call" className="space-y-6">
            <OperatorLine
              value={text}
              onValueChange={setText}
              forced={forced}
              onForcedChange={setForced}
              onConnect={connect}
              busy={ringing}
            />

            <div>
              <h2 className="plate mb-3 text-graphite">Callers on hold</h2>
              <ul className="space-y-2">
                {SAMPLE_CALLS.map((sample) => (
                  <li key={sample}>
                    <button
                      type="button"
                      onClick={() => setText(sample)}
                      disabled={ringing}
                      dir="auto"
                      className="w-full border-l-4 border-brass/60 bg-faceplate/60 px-4 py-2.5 text-left font-type text-sm transition-colors hover:border-lamp hover:bg-faceplate disabled:opacity-50"
                    >
                      {sample}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section aria-label="Routing record" className="min-w-0">
            {call ? (
              <TollTicket call={call} serial={serial} />
            ) : (
              <p className="flex h-full min-h-[12rem] items-center justify-center border border-dashed border-brass/70 px-5 py-6 text-center font-type text-sm text-graphite">
                {ringing
                  ? 'Ringing — the agent is routing the call…'
                  : fault
                    ? 'No toll ticket — the call never connected.'
                    : 'No call on the board. Pick a caller on hold, or take a new call.'}
              </p>
            )}
          </section>
        </div>
      </main>

      <Ledger />
      <Directory />
    </div>
  );
}
