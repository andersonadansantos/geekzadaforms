
import React, { useMemo } from 'react';
import {
  Star, Smile, Sparkles, LayoutGrid, MessageSquareQuote,
  Tags, Trophy, Gamepad2, Megaphone, Users, TrendingUp,
} from 'lucide-react';

/**
 * Painel de metricas da pesquisa de satisfacao.
 *
 * Para cada pergunta mostra um grafico (pizza ou barras) conforme a
 * natureza da resposta; nas perguntas abertas, lista cada resposta.
 * Os graficos sao SVG/CSS puros, sem bibliotecas externas.
 */

interface PesquisaMetricsProps {
  data: Record<string, unknown>[];
  loading?: boolean;
}

type Slice = { label: string; value: number; color: string };

const PALETTE = [
  '#2563eb', '#3b82f6', '#60a5fa', '#6366f1', '#0ea5e9',
  '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6',
];

const EXPERIENCE_SCALE = [
  { emoji: '🥱', label: 'Nem um pouco' },
  { emoji: '😐', label: 'Bem ou menos' },
  { emoji: '🙂', label: 'Bacana' },
  { emoji: '⚡', label: 'Muito boa' },
  { emoji: '🔥', label: 'Inesquecível' },
];

const AREAS: { key: string; title: string }[] = [
  { key: 'rating_entrada', title: 'Entrada & Acesso' },
  { key: 'rating_arenas', title: 'Arenas & Shows' },
  { key: 'rating_audiovisual', title: 'Audiovisual' },
  { key: 'rating_tecnologia', title: 'Tecnologia & Sinal' },
  { key: 'rating_conforto', title: 'Conforto Ambiental' },
  { key: 'rating_gastronomia', title: 'Gastronomia Geek' },
];

const AREA_LEVELS = [1, 2, 3, 4, 5];
const AREA_LABELS = ['Péssimo', 'Ruim', 'Regular', 'Bom', 'Excelente'];

// ---------------------------------------------------------------- helpers

const asNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

const asText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const asArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string' && v.trim() !== '')
    : [];

const average = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
};

const fmt1 = (n: number | null): string => (n === null ? '—' : n.toFixed(1));

/** Conta quantas vezes cada item aparece, preservando a grafia vista. */
const countItems = (items: string[]): Slice[] => {
  const map = new Map<string, Slice>();
  for (const raw of items) {
    const label = raw.trim().replace(/\s+/g, ' ');
    const key = label.toLowerCase();
    if (!key) continue;
    const found = map.get(key);
    if (found) found.value += 1;
    else map.set(key, { label, value: 1, color: PALETTE[0] });
  }
  return [...map.values()].sort((a, b) => b.value - a.value);
};

const colorize = (slices: Slice[]): Slice[] =>
  slices.map((s, i) => ({ ...s, color: PALETTE[i % PALETTE.length] }));

/** Mantem os N mais votados e agrupa o resto em "Outros". */
const topN = (slices: Slice[], n: number): Slice[] => {
  if (slices.length <= n) return colorize(slices);
  const head = slices.slice(0, n);
  const rest = slices.slice(n).reduce((a, s) => a + s.value, 0);
  return colorize(rest > 0 ? [...head, { label: 'Outros', value: rest, color: PALETTE[0] }] : head);
};

// ---------------------------------------------------------------- graficos

const Donut: React.FC<{ data: Slice[] }> = ({ data }) => {
  const size = 180;
  const thickness = 26;
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = data.reduce((a, s) => a + s.value, 0);

  let acc = 0;
  const arcs = data.map((s, i) => {
    const dash = total > 0 ? (s.value / total) * circumference : 0;
    const offset = -acc;
    acc += dash;
    return (
      <circle
        key={i}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={s.color}
        strokeWidth={thickness}
        strokeDasharray={`${dash} ${circumference - dash}`}
        strokeDashoffset={offset}
      />
    );
  });

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={thickness} />
          {arcs}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-900">{total}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">menções</span>
        </div>
      </div>

      <div className="w-full space-y-2.5">
        {total === 0 ? (
          <p className="text-xs italic text-slate-400">Sem respostas para esta pergunta.</p>
        ) : (
          data.map((s) => {
            const pct = Math.round((s.value / total) * 100);
            return (
              <div key={s.label} className="flex items-center gap-3">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: s.color }} />
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">{s.label}</span>
                <span className="text-xs font-semibold text-slate-900">{s.value}</span>
                <span className="w-10 text-right text-[11px] font-medium text-slate-400">{pct}%</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const BarList: React.FC<{ data: Slice[] }> = ({ data }) => {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((a, d) => a + d.value, 0);

  if (total === 0) {
    return <p className="text-xs italic text-slate-400">Sem respostas para esta pergunta.</p>;
  }

  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label}>
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-slate-600">{d.label}</span>
            <span className="text-slate-400">{d.value}</span>
          </div>
          <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(d.value / max) * 100}%`, background: d.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const MetricCard: React.FC<{
  icon: any;
  eyebrow: string;
  title: string;
  stat?: { value: string; caption: string };
  wide?: boolean;
  children: React.ReactNode;
}> = ({ icon: Icon, eyebrow, title, stat, wide, children }) => (
  <section
    className={`rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8 ${
      wide ? 'lg:col-span-2' : ''
    }`}
  >
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">{eyebrow}</p>
          <h3 className="text-base font-semibold leading-snug tracking-tight text-slate-900">{title}</h3>
        </div>
      </div>
      {stat && (
        <div className="shrink-0 text-right">
          <p className="text-3xl font-bold leading-none text-slate-900">{stat.value}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">{stat.caption}</p>
        </div>
      )}
    </div>
    {children}
  </section>
);

const TextList: React.FC<{ items: string[] }> = ({ items }) => {
  if (items.length === 0) {
    return <p className="text-xs italic text-slate-400">Nenhuma resposta escrita ainda.</p>;
  }
  return (
    <ul className="max-h-[26rem] space-y-2.5 overflow-y-auto pr-1">
      {items.map((text, i) => (
        <li
          key={i}
          className="rounded-lg border border-slate-200/80 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700"
        >
          {text}
        </li>
      ))}
    </ul>
  );
};

const StatTile: React.FC<{ icon: any; label: string; value: string; hint?: string }> = ({
  icon: Icon, label, value, hint,
}) => (
  <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-2 text-blue-600">
      <Icon className="h-4 w-4" />
      <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
    </div>
    <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
    {hint && <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-400">{hint}</p>}
  </div>
);

// ---------------------------------------------------------------- painel

const PesquisaMetrics: React.FC<PesquisaMetricsProps> = ({ data, loading }) => {
  const m = useMemo(() => {
    const overallValues = data.map((r) => asNumber(r.overall_rating)).filter((v): v is number => v !== null);
    const experienceValues = data.map((r) => asNumber(r.experience_rating)).filter((v): v is number => v !== null);

    const recommendation: Slice[] = Array.from({ length: 11 }, (_, n) => ({
      label: String(n),
      value: overallValues.filter((v) => v === n).length,
      color: `hsl(221, 83%, ${Math.round(72 - (n / 10) * 30)}%)`,
    }));

    const experience: Slice[] = EXPERIENCE_SCALE.map((opt, i) => ({
      label: `${opt.emoji} ${opt.label}`,
      value: experienceValues.filter((v) => v === i + 1).length,
      color: PALETTE[i % PALETTE.length],
    }));

    const areaStats = AREAS.map((area) => {
      const values = data.map((r) => asNumber(r[area.key])).filter((v): v is number => v !== null);
      const dist: Slice[] = AREA_LEVELS.map((lvl, i) => ({
        label: AREA_LABELS[i],
        value: values.filter((v) => v === lvl).length,
        color: PALETTE[i % PALETTE.length],
      }));
      return { key: area.key, title: area.title, avg: average(values), dist };
    });

    const raffleOptin = data.filter((r) => {
      const v = r.raffle_optin;
      return v === true || v === 1 || v === '1';
    }).length;

    return {
      total: data.length,
      avgOverall: average(overallValues),
      avgExperience: average(experienceValues),
      raffleOptin,
      recommendation,
      experience,
      highlights: colorize(countItems(data.flatMap((r) => asArray(r.highlights)))),
      areaStats,
      categories: colorize(countItems(data.flatMap((r) => asArray(r.desired_categories)))),
      guests: topN(countItems(data.flatMap((r) => asArray(r.top_guests))), 8),
      games: topN(countItems(data.flatMap((r) => asArray(r.desired_games))), 8),
      openFeedback: data.map((r) => asText(r.open_feedback)).filter(Boolean),
      curationNotes: data.map((r) => asText(r.curation_notes)).filter(Boolean),
    };
  }, [data]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-24 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Carregando métricas...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-24 text-center shadow-sm">
        <Megaphone className="mx-auto mb-4 h-10 w-10 text-slate-300" />
        <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Ainda não há respostas na pesquisa.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile icon={Users} label="Respostas" value={String(m.total)} hint="formulários recebidos" />
        <StatTile icon={Star} label="Recomendação" value={`${fmt1(m.avgOverall)}/10`} hint="média geral" />
        <StatTile icon={TrendingUp} label="Experiência" value={`${fmt1(m.avgExperience)}/5`} hint="média geral" />
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          icon={Star}
          eyebrow="Pergunta 1"
          title="De 0 a 10, o quanto você recomenda a Geekzada?"
          stat={{ value: fmt1(m.avgOverall), caption: 'média' }}
        >
          <BarList data={m.recommendation} />
        </MetricCard>

        <MetricCard
          icon={Smile}
          eyebrow="Pergunta 2"
          title="Como você descreve a experiência de forma geral?"
          stat={{ value: fmt1(m.avgExperience), caption: 'média' }}
        >
          <BarList data={m.experience} />
        </MetricCard>

        <MetricCard icon={Sparkles} eyebrow="Pergunta 3" title="Quais foram os seus destaques?">
          <BarList data={m.highlights} />
        </MetricCard>

        <MetricCard icon={LayoutGrid} eyebrow="Pergunta 4" title="Como avaliamos cada área?" wide>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {m.areaStats.map((area) => (
              <div key={area.key} className="rounded-lg border border-slate-200/80 bg-slate-50 p-4">
                <div className="mb-3 flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-700">{area.title}</span>
                  <span className="text-sm font-bold text-blue-600">{fmt1(area.avg)}</span>
                </div>
                <BarList data={area.dist} />
              </div>
            ))}
          </div>
        </MetricCard>

        <MetricCard icon={MessageSquareQuote} eyebrow="Pergunta 5" title="Comentário, crítica ou elogio" wide>
          <TextList items={m.openFeedback} />
        </MetricCard>

        <MetricCard icon={Tags} eyebrow="Pergunta 6" title="Que categorias de atração te animam?">
          <Donut data={m.categories} />
        </MetricCard>

        <MetricCard icon={Trophy} eyebrow="Pergunta 7" title="Pódio dos convidados dos sonhos">
          <Donut data={m.guests} />
        </MetricCard>

        <MetricCard icon={Gamepad2} eyebrow="Pergunta 8" title="Que jogos não podem faltar no próximo evento?">
          <Donut data={m.games} />
        </MetricCard>

        <MetricCard icon={Megaphone} eyebrow="Pergunta 9" title="Recados para a curadoria" wide>
          <TextList items={m.curationNotes} />
        </MetricCard>
      </div>
    </div>
  );
};

export default PesquisaMetrics;
