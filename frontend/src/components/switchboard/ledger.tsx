// The exchange's ledger: how the two operators score on held-out tickets.
import { ActivityStatsCard } from '../ui/stats-card';
import { DEPARTMENTS, LEDGER } from '../../lib/exchange';

const pct = (v: number) => (v * 100).toFixed(1);

export function Ledger() {
  const lead = Math.round((LEDGER.transformerAccuracy - LEDGER.tfidfAccuracy) * 1000) / 10;
  const chartData = LEDGER.transformerF1.map(({ label, f1 }) => ({
    label: DEPARTMENTS.find((d) => d.label === label)?.plate ?? label,
    currentValue: f1 * 100,
    valueLabel: (f1 * 100).toFixed(0),
  }));

  return (
    <section aria-labelledby="ledger-heading" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-bakelite pb-3">
        <h2 id="ledger-heading" className="font-display text-3xl font-extrabold uppercase tracking-tight sm:text-4xl">
          The ledger
        </h2>
        <p className="font-type text-sm text-graphite">
          {LEDGER.trainTickets.toLocaleString('en')} tickets trained · {LEDGER.testTickets.toLocaleString('en')} held out
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">
        <div className="panel flex flex-col p-5 sm:p-6">
          <h3 className="plate text-graphite">The two operators</h3>
          <dl className="mt-5 grid grid-cols-2 gap-6">
            <div>
              <dt className="plate text-[0.7rem] text-graphite">Local · TF-IDF + SVM</dt>
              <dd className="mt-1 font-display text-5xl font-extrabold leading-none">{pct(LEDGER.tfidfAccuracy)}%</dd>
            </div>
            <div>
              <dt className="plate text-[0.7rem] text-graphite">Trunk · DistilBERT</dt>
              <dd className="mt-1 font-display text-5xl font-extrabold leading-none">{pct(LEDGER.transformerAccuracy)}%</dd>
            </div>
          </dl>
          <p className="mt-auto pt-6 text-sm leading-relaxed text-graphite">
            Accuracy on the same held-out set. The local operator is a fraction of the cost and answers short, clear
            calls itself; anything long, unclear or not in English goes to the multilingual trunk.
          </p>
        </div>

        <ActivityStatsCard
          title="Trunk operator · F1 by department"
          mainValue={`${pct(LEDGER.transformerAccuracy)}%`}
          changeValue={lead}
          changeDescription="points of accuracy over the local operator"
          chartData={chartData}
          floor={70}
          primaryBarClassName="bg-bakelite"
        />
      </div>
    </section>
  );
}
