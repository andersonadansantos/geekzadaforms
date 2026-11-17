import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../apiClient';
import {
  Sparkles, Bell, ChevronLeft, Check, Copy, Send, Star, Trophy,
  Gamepad2, Utensils, Wifi, DoorOpen, Armchair, Volume2, Zap, Gift,
  Ticket, Lightbulb, BadgeCheck, Home, Heart, RefreshCw, AlertCircle,
  Instagram, Twitter, Youtube,
} from 'lucide-react';

/**
 * Pesquisa de satisfacao pos-evento (multi-etapas).
 *
 * Tela autonoma, no mesmo espirito do CreatorsForm: dark elegante, com
 * stepper de progresso e tres etapas de perguntas + tela de confirmacao.
 * Os nomes dos campos enviados batem com a definicao 'pesquisa' de
 * api/forms.php.
 */
interface PesquisaFormProps {
  onBack: () => void;
}

type AreaKey = 'entrada' | 'arenas' | 'audiovisual' | 'tecnologia' | 'conforto' | 'gastronomia';

const DRAFT_KEY = 'gz_pesquisa_draft_v1';

const STEP_TITLES = ['Experiência', 'Áreas & Estrutura', 'Sugestões'];

const AREAS: { key: AreaKey; title: string; desc: string; icon: any }[] = [
  { key: 'entrada', title: 'Entrada & Acesso', desc: 'Filas, credenciamento e circulação', icon: DoorOpen },
  { key: 'arenas', title: 'Arenas & Shows', desc: 'Palcos, competições e atrações', icon: Gamepad2 },
  { key: 'audiovisual', title: 'Audiovisual', desc: 'Som, iluminação e telões', icon: Volume2 },
  { key: 'tecnologia', title: 'Tecnologia & Sinal', desc: 'Wi-Fi, conectividade e aplicativo', icon: Wifi },
  { key: 'conforto', title: 'Conforto Ambiental', desc: 'Clima, assentos e circulação', icon: Armchair },
  { key: 'gastronomia', title: 'Gastronomia Geek', desc: 'Praça de alimentação e variedade', icon: Utensils },
];

const AREA_SCALE: { value: number; label: string; ring: string }[] = [
  { value: 1, label: 'Péssimo', ring: 'border-rose-300 bg-rose-50 text-rose-700' },
  { value: 2, label: 'Ruim', ring: 'border-orange-300 bg-orange-50 text-orange-700' },
  { value: 3, label: 'Regular', ring: 'border-amber-300 bg-amber-50 text-amber-700' },
  { value: 4, label: 'Bom', ring: 'border-lime-300 bg-lime-50 text-lime-700' },
  { value: 5, label: 'Excelente', ring: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
];

const EXPERIENCE_SCALE: { value: number; emoji: string; label: string }[] = [
  { value: 1, emoji: '🥱', label: 'Nem um pouco' },
  { value: 2, emoji: '😐', label: 'Bem ou menos' },
  { value: 3, emoji: '🙂', label: 'Bacana' },
  { value: 4, emoji: '⚡', label: 'Muito boa' },
  { value: 5, emoji: '🔥', label: 'Inesquecível' },
];

const HIGHLIGHTS = [
  'Arena Gamer', 'Palco Cosplay', 'Painéis & Dubladores', 'Beco dos Artistas',
  'Shows & DJ Geek', 'Vila Gastronômica', 'Boardgames & RPG',
];

const CATEGORIES = [
  'Dubladores & Vozes', 'Pro Players & Esports', 'Shows / J-Rock / K-Pop',
  'Streamers & Creators', 'Artistas & Quadrinistas', 'Devs & Publishers',
];

const GAME_SUGGESTIONS = ['Valorant', 'Minecraft', 'League of Legends', 'Street Fighter 6', 'Fortnite', 'Free Fire', 'CS2', 'Mario Kart'];

const PODIUM = [
  { pos: '1º', grad: 'from-pink-500 to-fuchsia-600', border: 'border-pink-500/40' },
  { pos: '2º', grad: 'from-violet-500 to-indigo-600', border: 'border-blue-200' },
  { pos: '3º', grad: 'from-cyan-500 to-sky-500', border: 'border-cyan-500/40' },
];

const formatPhone = (value: string): string => {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm ' +
  'placeholder:text-slate-400 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10';

const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <div className={`rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_14px_34px_-20px_rgba(37,99,235,0.35)] ${className}`}>{children}</div>
);

const StepHeading: React.FC<{ eyebrow: string; title: string; subtitle?: string; icon: any }> = ({ eyebrow, title, subtitle, icon: Icon }) => (
  <div className="flex items-start gap-4">
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-600/25">
      <Icon className="h-5 w-5 text-white" />
    </span>
    <div>
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-blue-600">
        <span className="h-px w-6 bg-blue-300" />
        {eyebrow}
      </p>
      <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
  </div>
);

const Chip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all active:scale-95 ${
      active
        ? 'border-transparent bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
        : 'border-slate-200 bg-white text-slate-600 shadow-sm hover:-translate-y-0.5 hover:border-blue-300 hover:text-slate-900'
    }`}
  >
    {children}
  </button>
);

const PesquisaForm: React.FC<PesquisaFormProps> = ({ onBack }) => {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [overallRating, setOverallRating] = useState<number | null>(null);
  const [experienceRating, setExperienceRating] = useState<number | null>(null);
  const [highlights, setHighlights] = useState<string[]>([]);

  const [areaRatings, setAreaRatings] = useState<Partial<Record<AreaKey, number>>>({});
  const [techIssueNote, setTechIssueNote] = useState('');
  const [openFeedback, setOpenFeedback] = useState('');

  const [desiredCategories, setDesiredCategories] = useState<string[]>([]);
  const [topGuests, setTopGuests] = useState<string[]>(['', '', '']);
  const [desiredGames, setDesiredGames] = useState<string[]>([]);
  const [gameInput, setGameInput] = useState('');
  const [curationNotes, setCurationNotes] = useState('');
  const [raffleOptin, setRaffleOptin] = useState(false);
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  const [luckyNumber, setLuckyNumber] = useState('');
  const [copied, setCopied] = useState(false);

  const progress = submitted ? 100 : step === 1 ? 33 : step === 2 ? 66 : 95;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.overallRating != null) setOverallRating(d.overallRating);
      if (d.experienceRating != null) setExperienceRating(d.experienceRating);
      if (Array.isArray(d.highlights)) setHighlights(d.highlights);
      if (d.areaRatings) setAreaRatings(d.areaRatings);
      if (d.techIssueNote) setTechIssueNote(d.techIssueNote);
      if (d.openFeedback) setOpenFeedback(d.openFeedback);
      if (Array.isArray(d.desiredCategories)) setDesiredCategories(d.desiredCategories);
      if (Array.isArray(d.topGuests)) setTopGuests([...d.topGuests, '', '', ''].slice(0, 3));
      if (Array.isArray(d.desiredGames)) setDesiredGames(d.desiredGames);
      if (d.curationNotes) setCurationNotes(d.curationNotes);
      if (d.raffleOptin) setRaffleOptin(true);
      if (d.email) setEmail(d.email);
      if (d.whatsapp) setWhatsapp(d.whatsapp);
      setToast('Rascunho restaurado. Você pode continuar de onde parou.');
    } catch {
      /* rascunho invalido: ignora */
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const confetti = useMemo(
    () =>
      Array.from({ length: 36 }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 2.5,
        dur: 3 + Math.random() * 3,
        size: 6 + Math.random() * 8,
        color: ['#8b5cf6', '#ec4899', '#22d3ee', '#10b981', '#d946ef'][Math.floor(Math.random() * 5)],
      })),
    [],
  );

  const toggle = (list: string[], value: string): string[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const addGame = () => {
    const g = gameInput.trim();
    if (!g) return;
    setDesiredGames((prev) => (prev.includes(g) ? prev : [...prev, g]));
    setGameInput('');
  };

  const buildPayload = (lucky: string) => ({
    overall_rating: overallRating,
    experience_rating: experienceRating,
    highlights,
    rating_entrada: areaRatings.entrada ?? null,
    rating_arenas: areaRatings.arenas ?? null,
    rating_audiovisual: areaRatings.audiovisual ?? null,
    rating_tecnologia: areaRatings.tecnologia ?? null,
    rating_conforto: areaRatings.conforto ?? null,
    rating_gastronomia: areaRatings.gastronomia ?? null,
    tech_issue_note: techIssueNote.trim(),
    open_feedback: openFeedback.trim(),
    desired_categories: desiredCategories,
    top_guests: topGuests.map((g) => g.trim()).filter(Boolean),
    desired_games: desiredGames,
    curation_notes: curationNotes.trim(),
    raffle_optin: raffleOptin,
    email: email.trim(),
    whatsapp: formatPhone(whatsapp),
    lucky_number: lucky,
  });

  const saveDraft = () => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          overallRating, experienceRating, highlights, areaRatings, techIssueNote,
          openFeedback, desiredCategories, topGuests, desiredGames, curationNotes,
          raffleOptin, email, whatsapp,
        }),
      );
      setToast('Rascunho salvo. Você pode continuar depois.');
    } catch {
      setToast('Não foi possível salvar o rascunho neste navegador.');
    }
  };

  const goto = (target: number) => {
    setError(null);
    setStep(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateStep1 = (): string | null => {
    if (overallRating === null) return 'Dê uma nota geral de 0 a 10 para o evento.';
    if (experienceRating === null) return 'Escolha como foi a sua experiência na Geekzada.';
    return null;
  };

  const validateStep2 = (): string | null => {
    const falta = AREAS.find((a) => areaRatings[a.key] == null);
    return falta ? `Avalie a área "${falta.title}".` : null;
  };

  const validateStep3 = (): string | null => {
    if (!raffleOptin) return null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Informe um e-mail válido para concorrer ao sorteio.';
    if (whatsapp.replace(/\D/g, '').length < 10) return 'Informe um WhatsApp válido com DDD para o sorteio.';
    return null;
  };

  const next = () => {
    const msg = step === 1 ? validateStep1() : step === 2 ? validateStep2() : validateStep3();
    if (msg) {
      setError(msg);
      return;
    }
    goto(Math.min(3, step + 1));
  };

  const handleSubmit = async () => {
    const msg = validateStep3();
    if (msg) {
      setError(msg);
      return;
    }
    setError(null);
    setSaving(true);
    const lucky = `#GKZ-${Math.floor(10000 + Math.random() * 90000)}`;
    try {
      await api.submit('pesquisa', buildPayload(lucky));
      setLuckyNumber(lucky);
      setSubmitted(true);
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignora */ }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err?.message || 'Não foi possível enviar a pesquisa. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const copyLucky = () => {
    if (!luckyNumber) return;
    navigator.clipboard?.writeText(luckyNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const bgStyle: React.CSSProperties = {
    fontFamily: "'Plus Jakarta Sans', Inter, system-ui, -apple-system, sans-serif",
    background:
      'radial-gradient(900px 600px at 10% -10%, rgba(37,99,235,0.10), transparent 60%),' +
      'radial-gradient(760px 520px at 95% 0%, rgba(59,130,246,0.08), transparent 55%),' +
      'radial-gradient(820px 700px at 50% 120%, rgba(99,102,241,0.08), transparent 60%),' +
      'linear-gradient(180deg, #f8f9ff, #eef2ff 60%, #f8f9ff)',
  };

  const nextLabel =
    step === 1 ? 'Próxima Etapa: Áreas & Estrutura' :
    step === 2 ? 'Próxima Etapa: Sugestão de Atrações' :
    'Finalizar e Enviar Pesquisa';

  return (
    <div className="min-h-screen w-full pt-16 text-slate-900" style={bgStyle}>
      <style>{`
        @keyframes gz-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(96vh) rotate(720deg); opacity: 0; }
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-32 -top-40 h-[30rem] w-[30rem] rounded-full bg-blue-300/35 blur-[130px]" />
        <div className="absolute -right-32 top-1/4 h-[26rem] w-[26rem] rounded-full bg-indigo-300/25 blur-[130px]" />
        <div className="absolute -bottom-40 left-1/4 h-[24rem] w-[24rem] rounded-full bg-sky-300/25 blur-[130px]" />
      </div>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <button type="button" onClick={onBack} className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Sparkles className="h-4 w-4 text-white" />
            </span>
            <span className="text-base font-semibold tracking-tight">
              Geekzada <span className="text-blue-600">Experience</span>
            </span>
          </button>

          <span className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 md:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Edição 2026 · Pesquisa Oficial
          </span>

          <nav className="hidden items-center gap-6 text-xs font-bold text-slate-500 lg:flex">
            <button type="button" onClick={onBack} className="transition-colors hover:text-slate-900">Início</button>
            <a href="#atracoes" className="transition-colors hover:text-slate-900">Atrações</a>
            <a href="#comunidade" className="transition-colors hover:text-slate-900">Comunidade</a>
            <span className="text-blue-600">Pesquisa</span>
          </nav>

          <div className="flex items-center gap-3">
            <button type="button" aria-label="Notificações" className="relative rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-500 transition-colors hover:text-slate-900">
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-blue-500" />
            </button>
            <div className="flex items-center gap-2">
              <div className="hidden text-right leading-tight sm:block">
                <span className="block text-xs font-bold uppercase tracking-widest text-slate-500">Bem-vindo,</span>
                <span className="text-xs font-semibold">Participante</span>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold">PT</span>
            </div>
          </div>
        </div>
      </header>

      <div className="sticky top-16 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em]">
            <span className="text-blue-600">
              {submitted ? 'Pesquisa enviada' : `Etapa ${step} de 3 · ${STEP_TITLES[step - 1]}`}
            </span>
            <span className="text-slate-500">{progress}% concluído</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-500 shadow-sm transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {STEP_TITLES.map((title, i) => {
              const n = i + 1;
              const done = submitted || step > n;
              const active = !submitted && step === n;
              return (
                <button
                  key={title}
                  type="button"
                  disabled={!done && !active}
                  onClick={() => done && goto(n)}
                  className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-left text-xs font-semibold uppercase tracking-widest transition-all ${
                    active
                      ? 'border-blue-300 bg-blue-50 text-blue-700 shadow-sm shadow-blue-600/10'
                      : done
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${done ? 'bg-emerald-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {done ? <Check className="h-3 w-3" /> : n}
                  </span>
                  <span className="truncate">{title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 pb-20 pt-8">
        {submitted ? (
          <div className="relative">
            <div className="pointer-events-none fixed inset-0 z-[110] overflow-hidden">
              {confetti.map((c, i) => (
                <span
                  key={i}
                  className="absolute top-0 block rounded-[2px]"
                  style={{
                    left: `${c.left}%`,
                    width: c.size,
                    height: c.size * 1.6,
                    backgroundColor: c.color,
                    animation: `gz-fall ${c.dur}s linear ${c.delay}s infinite`,
                  }}
                />
              ))}
            </div>

            <Card className="p-6 text-center sm:p-10">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-xl shadow-emerald-600/30">
                <Check className="h-10 w-10 text-white" />
              </div>
              <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700">
                <BadgeCheck className="h-3.5 w-3.5" /> Envio confirmado
              </span>
              <h2 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
                  Obrigado por ajudar a construir o{' '}
                  <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-500 bg-clip-text text-transparent">Geekzada!</span>
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-500">
                Sua opinião vai direto para o time de curadoria. É com esse retorno que montamos a próxima edição.
              </p>

               <div className="mx-auto mt-8 grid max-w-md gap-4">
                 <div className="rounded-2xl border border-blue-200/70 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 text-left shadow-sm">
                   <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600">
                     <Ticket className="h-3.5 w-3.5" /> Número da sorte
                   </div>
                   <div className="mt-3 flex items-center justify-between gap-2">
                     <span className="text-2xl font-bold tracking-tight text-slate-900">{luckyNumber || '#GKZ-00000'}</span>
                     <button
                       type="button"
                       onClick={copyLucky}
                       aria-label="Copiar número da sorte"
                       className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm transition-all hover:-translate-y-0.5 hover:text-slate-900"
                     >
                       {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                     </button>
                   </div>
                   <p className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-400">Guarde para conferir o sorteio</p>
                 </div>
               </div>

              <div className="mt-8 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-white shadow-lg shadow-blue-600/25 transition-all hover:-translate-y-0.5 hover:shadow-blue-600/40 active:scale-95"
                >
                  <Home className="h-4 w-4" /> Voltar ao início
                </button>
                <p className="flex items-center gap-2 text-xs text-slate-500">
                  <Heart className="h-3.5 w-3.5 text-blue-500" /> Obrigado por fazer parte da comunidade.
                </p>
              </div>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {step === 1 && (
              <>
                <StepHeading
                  icon={Star}
                  eyebrow="Etapa 1 · Experiência geral"
                  title="Como foi a sua Geekzada?"
                  subtitle="Comece pela visão geral do evento — leva menos de 1 minuto."
                />

                <Card className="p-5 sm:p-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    De 0 a 10, o quanto você recomenda a Geekzada?
                  </p>
                  <div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-11">
                    {Array.from({ length: 11 }, (_, i) => i).map((n) => {
                      const active = overallRating === n;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setOverallRating(n)}
                          className={`aspect-square rounded-xl border text-sm font-semibold transition-all active:scale-90 ${
                            active
                              ? 'scale-105 border-transparent bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
                              : 'border-slate-200 bg-white text-slate-600 shadow-sm hover:-translate-y-0.5 hover:border-blue-300'
                          }`}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    <span>Não recomendo</span>
                    <span>Recomendo muito</span>
                  </div>
                </Card>

                <Card className="p-5 sm:p-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Como você descreve a experiência de forma geral?
                  </p>
                  <div className="mt-4 grid grid-cols-5 gap-2">
                    {EXPERIENCE_SCALE.map((opt) => {
                      const active = experienceRating === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setExperienceRating(opt.value)}
                           className={`flex flex-col items-center gap-1.5 rounded-xl border px-1 py-3 transition-all active:scale-95 ${
                             active
                               ? 'border-blue-300 bg-gradient-to-b from-blue-50 to-indigo-50 shadow-sm shadow-blue-600/15 ring-1 ring-blue-400/30'
                               : 'border-slate-200 bg-white shadow-sm hover:-translate-y-0.5 hover:border-blue-300'
                           }`}
                        >
                          <span className={`text-2xl transition-transform ${active ? 'scale-110' : ''}`}>{opt.emoji}</span>
                          <span className={`px-1 text-center text-[10px] font-semibold uppercase leading-tight ${active ? 'text-slate-900' : 'text-slate-500'}`}>
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Card>

                <Card className="p-5 sm:p-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Quais foram os seus destaques? <span className="text-slate-600">(pode marcar vários)</span>
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {HIGHLIGHTS.map((h) => (
                      <Chip key={h} active={highlights.includes(h)} onClick={() => setHighlights((prev) => toggle(prev, h))}>
                        {h}
                      </Chip>
                    ))}
                  </div>
                </Card>
              </>
            )}

            {step === 2 && (
              <>
                <StepHeading
                  icon={Lightbulb}
                  eyebrow="Etapa 2 · Áreas & Estrutura"
                  title="Como avaliamos cada área?"
                  subtitle="Dê uma nota de Péssimo a Excelente para cada frente do evento."
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  {AREAS.map((a) => {
                    const Icon = a.icon;
                    const current = areaRatings[a.key];
                    return (
                      <Card key={a.key} className="p-5">
                        <div className="flex items-start gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{a.title}</p>
                            <p className="text-xs leading-tight text-slate-500">{a.desc}</p>
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-5 gap-1.5">
                          {AREA_SCALE.map((opt) => {
                            const active = current === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setAreaRatings((prev) => ({ ...prev, [a.key]: opt.value }))}
                                className={`rounded-lg border px-1 py-2 text-[10px] font-semibold uppercase leading-tight transition-all active:scale-95 ${
                                  active ? `${opt.ring} shadow-sm` : 'border-slate-200 bg-white text-slate-500 shadow-sm hover:-translate-y-0.5 hover:border-blue-300 hover:text-slate-700'
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                        {a.key === 'tecnologia' && current != null && current <= 3 && (
                          <div className="mt-4">
                            <label className="text-xs font-semibold uppercase tracking-widest text-amber-600">
                              O que deu errado com o sinal / Wi-Fi?
                            </label>
                            <textarea
                              value={techIssueNote}
                              onChange={(e) => setTechIssueNote(e.target.value.slice(0, 500))}
                              rows={2}
                              placeholder="Ex.: o Wi-Fi caiu perto dos palcos durante a tarde..."
                              className={`mt-2 resize-none ${inputCls}`}
                            />
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>

                <Card className="p-5 sm:p-7">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Comentário, crítica ou elogio <span className="text-slate-600">(até 500 caracteres)</span>
                    </p>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-700">
                      <BadgeCheck className="h-3.5 w-3.5" /> Envio anônimo
                    </span>
                  </div>
                  <textarea
                    value={openFeedback}
                    onChange={(e) => setOpenFeedback(e.target.value.slice(0, 500))}
                    rows={4}
                    placeholder="Conte o que marcou o seu dia — bom ou ruim. Sua opinião ajuda a melhorar."
                    className={`mt-4 resize-none ${inputCls}`}
                  />
                  <div className="mt-1 text-right text-xs font-bold tracking-widest text-slate-600">
                    {openFeedback.length}/500
                  </div>
                </Card>
              </>
            )}

            {step === 3 && (
              <>
                <StepHeading
                  icon={Heart}
                  eyebrow="Etapa 3 · Sugestão de atrações"
                  title="Quem você quer ver na próxima?"
                  subtitle="Ajude a curadoria a trazer o que a comunidade quer."
                />

                <Card className="p-5 sm:p-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Que categorias de atração te animam?
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => (
                      <Chip key={c} active={desiredCategories.includes(c)} onClick={() => setDesiredCategories((prev) => toggle(prev, c))}>
                        {c}
                      </Chip>
                    ))}
                  </div>
                </Card>

                <Card className="p-5 sm:p-7">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-400" />
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Pódio dos convidados dos sonhos</p>
                  </div>
                  <div className="mt-4 space-y-3">
                    {PODIUM.map((p, i) => (
                      <div key={p.pos} className={`flex items-center gap-3 rounded-lg border bg-slate-50 p-2 ${p.border}`}>
                        <span className={`flex h-10 w-12 shrink-0 items-center justify-center rounded-lg ${p.grad} text-sm font-semibold text-white`}>
                          {p.pos}
                        </span>
                        <input
                          value={topGuests[i]}
                          onChange={(e) => setTopGuests((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
                          placeholder="Nome do convidado ou atração"
                          className="w-full bg-transparent px-2 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-5 sm:p-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Que jogos não podem faltar no próximo evento?
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {GAME_SUGGESTIONS.map((g) => (
                      <Chip key={g} active={desiredGames.includes(g)} onClick={() => setDesiredGames((prev) => toggle(prev, g))}>
                        {g}
                      </Chip>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input
                      value={gameInput}
                      onChange={(e) => setGameInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGame(); } }}
                      placeholder="Incluir outro jogo..."
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={addGame}
                      className="shrink-0 rounded-xl border border-blue-200 bg-blue-50 px-4 text-xs font-semibold uppercase tracking-wider text-blue-700 transition-colors hover:bg-blue-100"
                    >
                      + Incluir
                    </button>
                  </div>
                  {desiredGames.filter((g) => !GAME_SUGGESTIONS.includes(g)).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {desiredGames.filter((g) => !GAME_SUGGESTIONS.includes(g)).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setDesiredGames((prev) => prev.filter((v) => v !== g))}
                          className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700"
                        >
                          {g} <span className="text-blue-500">×</span>
                        </button>
                      ))}
                    </div>
                  )}
                </Card>

                <Card className="p-5 sm:p-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Recados para a curadoria
                  </p>
                  <textarea
                    value={curationNotes}
                    onChange={(e) => setCurationNotes(e.target.value.slice(0, 1000))}
                    rows={3}
                    placeholder="Tem alguma ideia de painel, convidado ou atividade? Conta pra gente."
                    className={`mt-4 resize-none ${inputCls}`}
                  />
                </Card>

                <Card className="p-5 sm:p-7">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={raffleOptin}
                      onChange={(e) => setRaffleOptin(e.target.checked)}
                      className="mt-0.5 h-5 w-5 shrink-0 rounded-md border-slate-300 bg-white text-blue-600 focus:ring-blue-100"
                    />
                    <span className="text-sm text-slate-600">
                      Quero participar do <span className="font-semibold text-blue-700">sorteio de passes VIP</span> e novidades da Geekzada.
                    </span>
                  </label>

                  {raffleOptin && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className={inputCls}
                      />
                      <div className="flex gap-2">
                        <span className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-600">
                          🇧🇷 +55
                        </span>
                        <input
                          type="tel"
                          value={whatsapp}
                          onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                          placeholder="(11) 98765-4321"
                          className={inputCls}
                        />
                      </div>
                    </div>
                  )}
                </Card>
              </>
            )}

            {error && (
              <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-tight">{error}</span>
              </div>
            )}

            <div className="flex flex-col-reverse items-stretch gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => (step === 1 ? onBack() : goto(step - 1))}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:text-slate-900"
              >
                <ChevronLeft className="h-4 w-4" /> {step === 1 ? 'Voltar ao início' : 'Etapa anterior'}
              </button>

              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                {step === 1 && (
                  <button
                    type="button"
                    onClick={saveDraft}
                    className="rounded-full px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-500 transition-colors hover:text-slate-600"
                  >
                    Salvar e continuar depois
                  </button>
                )}
                <button
                  type="button"
                  onClick={step === 3 ? handleSubmit : next}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-white shadow-lg shadow-blue-600/25 transition-all hover:-translate-y-0.5 hover:shadow-blue-600/40 active:scale-95 disabled:opacity-60"
                >
                  {saving ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : step === 3 ? (
                    <><Send className="h-4 w-4" /> {nextLabel} 🚀</>
                  ) : (
                    <>{nextLabel} →</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-8 border-t border-slate-200 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-4 text-center md:flex-row md:text-left">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
            © 2026 Geekzada · WD Soluções Digitais
          </span>
          <div className="flex items-center gap-3 text-slate-500">
            <Instagram className="h-4 w-4" />
            <Twitter className="h-4 w-4" />
            <Youtube className="h-4 w-4" />
          </div>
        </div>
      </footer>

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-[120] -translate-x-1/2 rounded-full border border-slate-200 bg-white px-5 py-3 text-xs font-bold text-slate-200 shadow-sm">
          {toast}
        </div>
      )}
    </div>
  );
};

export default PesquisaForm;
