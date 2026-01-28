
import React, { useState } from 'react';
import Header from '../components/Header';
import { supabase, TABLES } from '../supabaseClient';
import { ContestType } from '../types';
// Fixed: Added RefreshCw to the lucide-react imports
import { CheckCircle2, Music, Send, Star, AlertCircle, Camera, Wand2, Gamepad2, MapPin, Calendar, User, Mail, Phone, Home, Map, RefreshCw } from 'lucide-react';

interface LandingPageProps {
  activeContest: ContestType;
  setActiveContest: (type: ContestType) => void;
  onGoAdmin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ activeContest, setActiveContest, onGoAdmin }) => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otherId, setOtherId] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const rawData = Object.fromEntries(formData.entries());
    
    // Objeto base com a data de criação
    let payload: any = { ...rawData };
    payload.created_at = new Date().toISOString();

    // Tratamento específico para Arena Gamer (Filtragem de colunas)
    if (activeContest === 'arena') {
      // Trata o campo de identificação "Outro"
      let finalId = payload.identification;
      if (finalId === 'Outro:') {
        finalId = `Outro: ${otherId || 'Não especificado'}`;
      }

      // Constrói o payload EXATO para a tabela arena_registrations
      // Evitando enviar image_release, rules_agreement e signature que não existem nela
      payload = {
        name: payload.name,
        email: payload.email,
        whatsapp: payload.whatsapp,
        bairro: payload.bairro,
        city: payload.city,
        birth_date: payload.birth_date,
        identification: finalId,
        created_at: payload.created_at
      };
    } else {
      // Para os outros concursos, converte checkboxes de 'on' para boolean
      const checkboxFields = ['image_release', 'rules_agreement', 'authorship_declaration'];
      checkboxFields.forEach(field => {
        if (payload[field] !== undefined) {
          payload[field] = payload[field] === 'on';
        }
      });
    }

    const tableName = activeContest === 'kpop' ? TABLES.KPOP : 
                     activeContest === 'cospobre' ? TABLES.COSPOBRE : 
                     activeContest === 'arena' ? TABLES.ARENA :
                     TABLES.COSPLAYER;

    try {
      const { error: insertError } = await supabase.from(tableName).insert([payload]);
      if (insertError) throw insertError;
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error("Erro ao inserir:", err);
      setError(err.message || 'Ocorreu um erro ao enviar o cadastro.');
    } finally {
      setLoading(false);
    }
  };

  const getContestVisuals = (type: ContestType) => {
    switch (type) {
      case 'cospobre': return { title: 'Cospobre', color: 'from-green-500', accent: 'green', shadow: 'shadow-green-500/20' };
      case 'cosplayer': return { title: 'Cosplayer', color: 'from-purple-500', accent: 'purple', shadow: 'shadow-purple-500/20' };
      case 'arena': return { title: 'Arena Gamer', color: 'from-cyan-400', accent: 'cyan', shadow: 'shadow-cyan-500/20' };
      default: return { title: 'K-Pop', color: 'from-pink-500', accent: 'pink', shadow: 'shadow-pink-500/20' };
    }
  };

  const activeVisuals = getContestVisuals(activeContest);

  const renderFormFields = () => {
    const inputStyle = `w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-${activeVisuals.accent}-500 outline-none text-white transition-all placeholder:text-slate-600`;
    const labelStyle = "text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider";

    if (activeContest === 'arena') {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelStyle}><span className="flex items-center gap-2"><User className="w-3 h-3"/> Nome Completo *</span></label>
              <input required name="name" type="text" className={inputStyle} placeholder="Seu nome completo" />
            </div>
            <div>
              <label className={labelStyle}><span className="flex items-center gap-2"><Mail className="w-3 h-3"/> E-mail *</span></label>
              <input required name="email" type="email" className={inputStyle} placeholder="email@exemplo.com" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelStyle}><span className="flex items-center gap-2"><Phone className="w-3 h-3"/> WhatsApp *</span></label>
              <input required name="whatsapp" type="tel" className={inputStyle} placeholder="(00) 00000-0000" />
            </div>
            <div>
              <label className={labelStyle}><span className="flex items-center gap-2"><Calendar className="w-3 h-3"/> Data de Nascimento *</span></label>
              <input required name="birth_date" type="date" className={inputStyle} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelStyle}><span className="flex items-center gap-2"><Home className="w-3 h-3"/> Bairro *</span></label>
              <input required name="bairro" type="text" className={inputStyle} placeholder="Seu bairro" />
            </div>
            <div>
              <label className={labelStyle}><span className="flex items-center gap-2"><Map className="w-3 h-3"/> Cidade *</span></label>
              <input required name="city" type="text" className={inputStyle} placeholder="Sua cidade" />
            </div>
          </div>
          <div>
            <label className={labelStyle}>Como você se identifica? *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              {['Gamer', 'Otaku', 'Cosplayer', 'K-popper', 'Entusiasta da Cultura Geek', 'Outro:'].map((opt) => (
                <label key={opt} className={`flex items-center gap-3 p-4 bg-slate-800/30 border border-slate-700 rounded-xl cursor-pointer hover:border-${activeVisuals.accent}-500/50 transition-all group`}>
                  <input required name="identification" type="radio" value={opt} className={`w-4 h-4 text-${activeVisuals.accent}-500 focus:ring-offset-slate-900`} />
                  <span className="text-sm text-slate-300 group-hover:text-white">{opt}</span>
                </label>
              ))}
            </div>
            <input 
              name="other_id" 
              type="text" 
              placeholder="Especifique se escolheu 'Outro'" 
              className={`${inputStyle} mt-4 text-sm h-12`}
              value={otherId}
              onChange={(e) => setOtherId(e.target.value)}
            />
          </div>
        </div>
      );
    }

    if (activeContest === 'kpop') {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelStyle}>Nome do grupo ou artista solo *</label>
              <input required name="group_name" type="text" className={inputStyle} />
            </div>
            <div>
              <label className={labelStyle}>Categoria *</label>
              <select required name="category" className={inputStyle}>
                <option value="">Selecione...</option>
                <option value="solo">Solo</option>
                <option value="duo">Duo</option>
                <option value="grupo">Grupo</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelStyle}>Nome do responsável (se menor)</label>
              <input name="guardian_name" type="text" className={inputStyle} />
            </div>
            <div>
              <label className={labelStyle}>CPF ou RG do responsável *</label>
              <input required name="guardian_document" type="text" className={inputStyle} />
            </div>
          </div>
          <div>
            <label className={labelStyle}>Nome completo dos integrantes *</label>
            <textarea required name="members_names" rows={3} className={inputStyle}></textarea>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className={labelStyle}>Idades *</label>
              <input required name="members_ages" type="text" className={inputStyle} />
            </div>
            <div>
              <label className={labelStyle}>Nascimento principal *</label>
              <input required name="birth_date" type="date" className={inputStyle} />
            </div>
            <div>
              <label className={labelStyle}>Qtd no palco *</label>
              <input required name="members_count" type="number" className={inputStyle} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className={labelStyle}>Estilo *</label>
              <select required name="performance_style" className={inputStyle}>
                <option value="dance cover">Dance Cover</option>
                <option value="vocal">Vocal</option>
                <option value="rap">Rap</option>
              </select>
            </div>
            <div>
              <label className={labelStyle}>Música/Artista *</label>
              <input required name="song_artist" type="text" className={inputStyle} />
            </div>
            <div>
              <label className={labelStyle}>Duração *</label>
              <input required name="duration" type="text" className={inputStyle} />
            </div>
          </div>
          <div>
            <label className={labelStyle}>Link do vídeo de apresentação *</label>
            <input required name="video_link" type="url" className={inputStyle} />
          </div>
        </div>
      );
    }

    if (activeContest === 'cospobre' || activeContest === 'cosplayer') {
      const isCosplayer = activeContest === 'cosplayer';
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelStyle}>{isCosplayer ? 'Nome completo do cosplayer *' : 'Nome do cosplayer *'}</label>
              <input required name={isCosplayer ? "full_name" : "cosplayer_name"} type="text" className={inputStyle} />
            </div>
            <div>
              <label className={labelStyle}>Nome do personagem *</label>
              <input required name="character_name" type="text" className={inputStyle} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelStyle}>Obra de origem *</label>
              <input required name={isCosplayer ? "origin_work" : "character_origin"} type="text" className={inputStyle} />
            </div>
            <div>
              <label className={labelStyle}>Categoria *</label>
              <select required name="category" className={inputStyle}>
                <option value="tradicional">Tradicional</option>
                <option value="desfile">Desfile</option>
                <option value="apresentacao">Apresentação</option>
                <option value="kids">Kids</option>
                <option value="grupo">Grupo</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className={labelStyle}>Tipo *</label>
              <select required name="cosplay_type" className={inputStyle}>
                <option value="original">Original</option>
                <option value="adaptado">Adaptado</option>
                <option value="replica">Réplica</option>
              </select>
            </div>
            <div>
              <label className={labelStyle}>Idade *</label>
              <input required name="age" type="number" className={inputStyle} />
            </div>
            <div>
              <label className={labelStyle}>Nascimento *</label>
              <input required name="birth_date" type="date" className={inputStyle} />
            </div>
          </div>
          <div>
            <label className={labelStyle}>Link de fotos *</label>
            <input required name="photo_links" type="url" className={inputStyle} />
          </div>
          <div>
            <label className={labelStyle}>Descrição do processo *</label>
            <textarea required name={isCosplayer ? "description_process" : "cosplay_description"} rows={3} className={inputStyle}></textarea>
          </div>
        </div>
      );
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className={`bg-slate-900 p-10 rounded-3xl shadow-2xl border border-${activeVisuals.accent}-500/50 max-w-md w-full space-y-6 animate-in zoom-in duration-300`}>
          <div className={`w-20 h-20 bg-${activeVisuals.accent}-500/10 rounded-full flex items-center justify-center mx-auto`}>
            <CheckCircle2 className={`w-12 h-12 text-${activeVisuals.accent}-500`} />
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
            {activeContest === 'arena' ? 'Tudo certo!' : 'Inscrição Enviada!'}
          </h2>
          <p className="text-slate-400 leading-relaxed font-medium">
            {activeContest === 'arena' 
              ? 'Seu nome já está na lista.' 
              : `Sua inscrição para o concurso de ${activeVisuals.title} foi recebida.`}
          </p>
          <button 
            onClick={() => setSubmitted(false)} 
            className={`w-full bg-${activeVisuals.accent}-600 hover:bg-${activeVisuals.accent}-700 text-white font-black py-4 rounded-xl transition-all uppercase tracking-widest text-sm`}
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 min-h-screen text-white pb-20 selection:bg-pink-500/30">
      <Header activeContest={activeContest} setActiveContest={setActiveContest} />
      
      <div className="container mx-auto px-4 pt-16 pb-12 text-center">
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-${activeVisuals.accent}-500/10 border border-${activeVisuals.accent}-500/20 text-${activeVisuals.accent}-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6`}>
           {activeContest === 'arena' ? <Gamepad2 className="w-3 h-3"/> : <Star className="w-3 h-3"/>}
           Evento Geekzada 2026
        </div>
        
        <h2 className={`text-5xl md:text-8xl font-black bg-clip-text text-transparent bg-gradient-to-b ${activeVisuals.color} to-slate-200 uppercase tracking-tighter mb-6 leading-none`}>
          {activeContest === 'arena' ? 'Arena Gamer 2026' : `CONCURSO ${activeVisuals.title}`}
        </h2>
        
        {activeContest === 'arena' ? (
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-3 px-6 py-3 bg-slate-900/50 rounded-2xl border border-white/5">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <div className="text-left leading-tight">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Data & Hora</p>
                <p className="text-sm font-bold text-white">14/Fevereiro | 09:00</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-6 py-3 bg-slate-900/50 rounded-2xl border border-white/5">
              <MapPin className="w-5 h-5 text-cyan-400" />
              <div className="text-left leading-tight">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Localização</p>
                <p className="text-sm font-bold text-white">Estádio Mangueirão</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-slate-500 max-w-xl mx-auto text-sm md:text-base mb-12 font-medium">
            Preencha o formulário abaixo para validar sua participação oficial na competição.
          </p>
        )}
      </div>

      <section className="container mx-auto px-4">
        <div className={`max-w-4xl mx-auto bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 md:p-12 shadow-2xl transition-all duration-500 ${activeVisuals.shadow}`}>
          <form onSubmit={handleSubmit} className="space-y-10">
            {renderFormFields()}

            <div className="space-y-4 pt-10 border-t border-white/5">
              <label className="flex items-start gap-4 cursor-pointer group">
                <div className="mt-1">
                  <input required name="image_release" type="checkbox" className={`w-5 h-5 rounded-md border-slate-700 bg-slate-800 text-${activeVisuals.accent}-500 focus:ring-0 focus:ring-offset-0`} />
                </div>
                <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors leading-relaxed">
                  Autorizo o uso de minha imagem e voz para fins de divulgação do evento Geekzada 2026.
                </span>
              </label>
              <label className="flex items-start gap-4 cursor-pointer group">
                <div className="mt-1">
                  <input required name="rules_agreement" type="checkbox" className={`w-5 h-5 rounded-md border-slate-700 bg-slate-800 text-${activeVisuals.accent}-500 focus:ring-0 focus:ring-offset-0`} />
                </div>
                <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors leading-relaxed">
                  Declaro que li e concordo plenamente com o regulamento oficial deste concurso.
                </span>
              </label>
              
              {activeContest !== 'arena' && (
                <div className="mt-6">
                  <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">Assinatura Digital *</label>
                  <input required name="signature" type="text" placeholder="Digite seu nome completo como assinatura" className={`w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-white outline-none focus:ring-2 focus:ring-${activeVisuals.accent}-500`} />
                </div>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="shrink-0 w-5 h-5" /> 
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            <button 
              disabled={loading} 
              type="submit" 
              className={`w-full bg-gradient-to-r ${activeContest === 'arena' ? 'from-cyan-500 to-blue-600' : 'from-pink-600 to-purple-600'} hover:scale-[1.01] active:scale-[0.99] text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-2xl disabled:opacity-50 uppercase tracking-[0.15em] text-sm`}
            >
              {loading ? (
                <RefreshCw className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  {activeContest === 'arena' ? <Gamepad2 className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                  {activeContest === 'arena' ? 'Garantir meu nome na lista' : 'Confirmar minha inscrição'}
                </>
              )}
            </button>
          </form>
        </div>
      </section>

      <footer className="py-24 text-center border-t border-white/5 mt-24">
        <div className="container mx-auto px-4">
          <p className="text-slate-700 font-black tracking-[0.3em] text-[10px] mb-6 uppercase">WD Soluções Digitais Ltda 2026</p>
          <button onClick={onGoAdmin} className="text-slate-800 hover:text-slate-600 text-[10px] font-bold uppercase tracking-widest transition-colors">Admin Access</button>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
