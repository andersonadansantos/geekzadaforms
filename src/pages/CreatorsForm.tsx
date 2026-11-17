
import React, { useState } from 'react';
import { api } from '../apiClient';
import {
  Sparkles, User, AtSign, MapPin, Home, Building2, Hash,
  Instagram, Youtube, Twitch, Music2, BadgeCheck, Lock,
  Rocket, Check, RefreshCw, AlertCircle, Phone, Package,
} from 'lucide-react';
import logoGeekzada from '../assets/logo-Geekzada26.png';

/**
 * Formulario "Pulse Creators": tela autonoma (sem navbar/rodape do portal),
 * com a mesma identidade visual do painel admin (tema claro corporativo).
 * Os campos batem exatamente com a definicao 'creators' de api/forms.php.
 */
interface CreatorsFormProps {
  onBack: () => void;
}

type IconType = React.ComponentType<{ className?: string }>;

const FAIXAS = ['18-24 anos', '25-30 anos', '31-39 anos', '40+ anos'];

/** Mascara (00) 00000-0000 conforme se digita. */
const formatPhone = (value: string): string => {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

/** Mascara 00000-000 do CEP. */
const formatCep = (value: string): string => {
  const d = value.replace(/\D/g, '').slice(0, 8);
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`;
};

const inputCls =
  'w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3 py-3 text-sm text-slate-900 shadow-sm ' +
  'placeholder:text-slate-400 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10';

const IconInput = ({
  icon: Icon,
  className = '',
  ...props
}: { icon: IconType; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="relative">
    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
    <input className={`${inputCls} ${className}`} {...props} />
  </div>
);

const Section: React.FC<{
  step: number;
  title: string;
  note?: React.ReactNode;
  children: React.ReactNode;
}> = ({ step, title, note, children }) => (
  <section className="space-y-5 pt-8 border-t border-slate-100 first:border-t-0 first:pt-0">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-3 text-sm md:text-base font-semibold uppercase tracking-[0.12em] text-slate-900">
        <span className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xs font-bold flex items-center justify-center shadow-lg shadow-blue-600/25">
          {step}
        </span>
        {title}
      </h2>
      {note}
    </div>
    {children}
  </section>
);

const CreatorsForm: React.FC<CreatorsFormProps> = ({ onBack }) => {
  const [fullName, setFullName] = useState('');
  const [artisticName, setArtisticName] = useState('');
  const [age, setAge] = useState('');
  const [ageRange, setAgeRange] = useState('');

  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  const [instagramHandle, setInstagramHandle] = useState('');
  const [instagramFollowers, setInstagramFollowers] = useState('');
  const [tiktokHandle, setTiktokHandle] = useState('');
  const [tiktokFollowers, setTiktokFollowers] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [twitchHandle, setTwitchHandle] = useState('');

  const [whatsapp, setWhatsapp] = useState('');
  const [optin, setOptin] = useState(true);

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Informe seu nome completo.');
      return;
    }
    if (!artisticName.trim()) {
      setError('Informe seu nome artístico ou @handle principal.');
      return;
    }
    if (whatsapp.replace(/\D/g, '').length < 10) {
      setError('Informe um número de WhatsApp válido com DDD.');
      return;
    }

    setLoading(true);
    try {
      await api.submit('creators', {
        full_name: fullName.trim(),
        artistic_name: artisticName.trim(),
        age: age ? Number(age) : null,
        age_range: ageRange,
        cep,
        address: address.trim(),
        city: city.trim(),
        state: state.trim().toUpperCase(),
        instagram_handle: instagramHandle.trim(),
        instagram_followers: instagramFollowers.trim(),
        tiktok_handle: tiktokHandle.trim(),
        tiktok_followers: tiktokFollowers.trim(),
        youtube_link: youtubeLink.trim(),
        twitch_handle: twitchHandle.trim(),
        whatsapp: formatPhone(whatsapp),
        whatsapp_optin: optin,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'Ocorreu um erro ao enviar seu cadastro.');
    } finally {
      setLoading(false);
    }
  };

  const bgStyle: React.CSSProperties = {
    fontFamily: "'Plus Jakarta Sans', Inter, system-ui, -apple-system, sans-serif",
    background:
      'radial-gradient(900px 620px at 12% -8%, rgba(37,99,235,0.10), transparent 60%),' +
      'radial-gradient(820px 520px at 92% 8%, rgba(99,102,241,0.08), transparent 55%),' +
      'radial-gradient(760px 720px at 50% 118%, rgba(56,189,248,0.08), transparent 62%),' +
      'linear-gradient(180deg, #f8f9ff, #eef2ff 58%, #f8f9ff)',
  };

  return (
    <div className="relative min-h-screen w-full text-slate-900 px-3 py-8 sm:px-4 sm:py-10 md:py-16" style={bgStyle}>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-32 -top-40 h-[30rem] w-[30rem] rounded-full bg-blue-300/35 blur-[130px]" />
        <div className="absolute -right-32 top-1/4 h-[26rem] w-[26rem] rounded-full bg-indigo-300/25 blur-[130px]" />
        <div className="absolute -bottom-40 left-1/4 h-[24rem] w-[24rem] rounded-full bg-sky-300/25 blur-[130px]" />
      </div>

      {submitted && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10 p-7 sm:p-10 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-xl shadow-emerald-600/30">
              <Check className="w-10 h-10 text-white" />
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-semibold tracking-tight">Cadastro enviado!</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Recebemos o seu perfil. Nosso time de curadoria entra em contato
                pelo WhatsApp em até 48h.
              </p>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="w-full h-12 rounded-xl font-semibold uppercase tracking-wider text-xs text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-600/25 transition-all hover:-translate-y-0.5 active:scale-95"
            >
              Concluir
            </button>
          </div>
        </div>
      )}

      <div className="relative z-10 max-w-3xl mx-auto rounded-[28px] p-[1.5px] bg-gradient-to-br from-blue-300/70 via-indigo-200/60 to-sky-200/70 shadow-[0_2px_4px_rgba(15,23,42,0.04),0_30px_60px_-30px_rgba(37,99,235,0.45)]">
        <div className="rounded-[27px] bg-white/95 backdrop-blur-xl px-5 py-7 sm:px-8 sm:py-10 md:px-10 md:py-12">
          {/* Top bar: empilha e centraliza no celular, lado a lado no desktop */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-blue-600" />
              </span>
              <span className="text-lg font-semibold tracking-tight">Pulse Creators</span>
            </div>
            <span className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 border border-slate-200 bg-slate-50 rounded-full px-3 py-1.5 max-w-full">
              <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-blue-500" />
              <img
                src={logoGeekzada}
                alt="Geekzada 2026"
                className="object-contain w-[140px] sm:w-[200px] max-w-full h-auto"
              />
            </span>
          </div>

          {/* Hero */}
          <div className="mt-8 text-center sm:text-left">
            <h1 className="text-[1.9rem] sm:text-4xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
              Formulário de{' '}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-500 bg-clip-text text-transparent">
                Creators
              </span>
            </h1>
            <p className="mt-4 text-sm md:text-base text-slate-500 leading-relaxed max-w-xl mx-auto sm:mx-0">
              Inscreva seu perfil para ter acesso a parcerias exclusivas, campanhas
              patrocinadas e press kits oficiais.
            </p>
          </div>

          {/* Status + progresso */}
          <div className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-[0.18em]">
              <span className="text-blue-600">• Etapa única • ~2 min</span>
              <span className="text-slate-500">Vagas abertas</span>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full w-full bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-500" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-10 space-y-2">
            {/* 1. Identidade */}
            <Section step={1} title="Identidade do Creator">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <IconInput
                  icon={User}
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Lucas Guimarães"
                />
                <IconInput
                  icon={AtSign}
                  type="text"
                  value={artisticName}
                  onChange={(e) => setArtisticName(e.target.value)}
                  placeholder="lucas.creative"
                />
              </div>
            </Section>

            {/* 2. Idade */}
            <Section
              step={2}
              title="Idade & Faixa Etária do público"
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
                <div className="sm:w-40">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Sua idade
                  </span>
                  <IconInput
                    icon={Hash}
                    type="number"
                    max={120}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="24"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Faixa etária do seu público
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {FAIXAS.map((faixa) => {
                      const ativo = ageRange === faixa;
                      return (
                        <button
                          key={faixa}
                          type="button"
                          onClick={() => setAgeRange(ativo ? '' : faixa)}
                           className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border active:scale-95 ${
                             ativo
                               ? 'border-transparent bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                               : 'border-slate-200 bg-white text-slate-600 shadow-sm hover:-translate-y-0.5 hover:border-blue-300'
                           }`}
                        >
                          {faixa}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Section>

            {/* 3. Endereco */}
            <Section
              step={3}
              title="Endereço de Envio"
              note={
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-700 border border-blue-200 bg-blue-50 rounded-full px-3 py-1.5">
                  <Package className="w-3.5 h-3.5" /> Recebidos VIP
                </span>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <IconInput
                  icon={MapPin}
                  type="text"
                  inputMode="numeric"
                  value={cep}
                  onChange={(e) => setCep(formatCep(e.target.value))}
                  placeholder="01310-100"
                />
                <IconInput
                  icon={Home}
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua / Avenida e número"
                />
                <IconInput
                  icon={Building2}
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="São Paulo"
                />
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    className={inputCls}
                    type="text"
                    maxLength={2}
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    placeholder="SP"
                  />
                </div>
              </div>
            </Section>

            {/* 4. Redes sociais */}
            <Section step={4} title="Redes Sociais & Alcance">
              <p className="-mt-2 text-xs text-slate-500">Conecte seus principais canais de conteúdo.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Instagram */}
                <div className="rounded-2xl bg-slate-50/70 border border-slate-200 p-4 space-y-3 transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md hover:shadow-blue-600/5">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 flex items-center justify-center">
                      <Instagram className="w-4 h-4 text-white" />
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Instagram / Reels/Stories</span>
                  </div>
                  <IconInput
                    icon={AtSign}
                    type="text"
                    value={instagramHandle}
                    onChange={(e) => setInstagramHandle(e.target.value)}
                    placeholder="@instagram"
                  />
                  <input
                    className={`${inputCls} !pl-3`}
                    type="text"
                    value={instagramFollowers}
                    onChange={(e) => setInstagramFollowers(e.target.value)}
                    placeholder="Seguidores (ex: 85k)"
                  />
                </div>

                {/* TikTok */}
                <div className="rounded-2xl bg-slate-50/70 border border-slate-200 p-4 space-y-3 transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md hover:shadow-blue-600/5">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-slate-900 flex items-center justify-center">
                      <Music2 className="w-4 h-4 text-white" />
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">TikTok / Shorts</span>
                  </div>
                  <IconInput
                    icon={AtSign}
                    type="text"
                    value={tiktokHandle}
                    onChange={(e) => setTiktokHandle(e.target.value)}
                    placeholder="@tiktok"
                  />
                  <input
                    className={`${inputCls} !pl-3`}
                    type="text"
                    value={tiktokFollowers}
                    onChange={(e) => setTiktokFollowers(e.target.value)}
                    placeholder="Seguidores (ex: 210k)"
                  />
                </div>

                {/* YouTube */}
                <div className="rounded-2xl bg-slate-50/70 border border-slate-200 p-4 space-y-3 transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md hover:shadow-blue-600/5">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
                      <Youtube className="w-4 h-4 text-white" />
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">YouTube</span>
                  </div>
                  <IconInput
                    icon={Youtube}
                    type="url"
                    value={youtubeLink}
                    onChange={(e) => setYoutubeLink(e.target.value)}
                    placeholder="youtube.com/@canal"
                  />
                </div>

                {/* Twitch */}
                <div className="rounded-2xl bg-slate-50/70 border border-slate-200 p-4 space-y-3 transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md hover:shadow-blue-600/5">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
                      <Twitch className="w-4 h-4 text-white" />
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Twitch / Live</span>
                  </div>
                  <IconInput
                    icon={Twitch}
                    type="text"
                    value={twitchHandle}
                    onChange={(e) => setTwitchHandle(e.target.value)}
                    placeholder="twitch.tv/usuario"
                  />
                </div>
              </div>
            </Section>

            {/* 5. WhatsApp */}
            <Section step={5} title="WhatsApp para Contratos">
              <div className="relative rounded-2xl border border-blue-200/70 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 space-y-4 shadow-sm">
                <span className="absolute right-3 top-3 text-[10px] font-semibold uppercase tracking-wider text-blue-700 border border-blue-200 bg-blue-100 rounded-full px-2.5 py-1">
                  Prioritário
                </span>
                <p className="text-xs text-slate-500 pr-24">Contato direto com nossos curadores de marca.</p>
                <div className="flex gap-3">
                  <div className="flex items-center gap-2 shrink-0 px-3 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-400">
                    <span>🇧🇷</span>
                    <span>+55</span>
                  </div>
                  <div className="relative flex-1 min-w-0">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    <input
                      className={inputCls}
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                      placeholder="(11) 98765-4321"
                    />
                  </div>
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={optin}
                    onChange={(e) => setOptin(e.target.checked)}
                    className="mt-0.5 w-5 h-5 shrink-0 rounded-md bg-white border-slate-300 text-blue-600 focus:ring-blue-100"
                  />
                  <span className="text-xs text-slate-600 leading-relaxed">
                    Desejo receber convites urgentes de campanhas pagas, propostas com
                    cachê em aberto e avisos VIP no WhatsApp.
                  </span>
                </label>
              </div>
            </Section>

            {error && (
              <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-tight">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-8 w-full min-h-14 py-4 px-4 rounded-2xl font-semibold uppercase tracking-[0.12em] text-xs sm:text-sm leading-tight text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-600/25 hover:-translate-y-0.5 hover:shadow-blue-600/40 active:scale-[0.99] transition-all disabled:opacity-60 flex items-center justify-center gap-2 text-center"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Enviar Cadastro de Creator 🚀
                </>
              )}
            </button>

            <div className="pt-4 flex flex-col items-center gap-4 text-center">
              <p className="flex items-center gap-2 text-xs text-slate-500">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                Criptografia AES-256
              </p>
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-slate-900 transition-colors"
              >
                <BadgeCheck className="w-3.5 h-3.5" /> Pulse Creators • Voltar ao início
              </button>
            </div>
          </form>
        </div>
      </div>

      <p className="mt-8 text-center text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
        <Rocket className="inline w-3 h-3 mr-1" /> WD SOLUÇÕES DIGITAIS 2026
      </p>
    </div>
  );
};

export default CreatorsForm;
