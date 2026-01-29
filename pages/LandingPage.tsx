
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { supabase, TABLES } from '../supabaseClient';
import { ContestType } from '../types';
import { CheckCircle2, Music, Send, Star, AlertCircle, Camera, Wand2, Gamepad2, MapPin, Calendar, User, Mail, Phone, Home, Map, RefreshCw, MessageCircle } from 'lucide-react';

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
  // Identificações selecionadas (máximo 3)
  const [selectedIdentifications, setSelectedIdentifications] = useState<string[]>([]);

  // Scroll to top when active contest changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Limpa seleções ao trocar de aba
    setSelectedIdentifications([]);
    setOtherId('');
  }, [activeContest]);

  const handleIdentificationChange = (val: string) => {
    if (selectedIdentifications.includes(val)) {
      setSelectedIdentifications(prev => prev.filter(i => i !== val));
    } else {
      if (selectedIdentifications.length >= 3) {
        // Opcional: Alerta visual ou apenas impede
        return;
      }
      setSelectedIdentifications(prev => [...prev, val]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (activeContest === 'arena' && selectedIdentifications.length === 0) {
      setError('Por favor, selecione pelo menos uma opção de identificação.');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const rawData = Object.fromEntries(formData.entries());
    
    let payload: any = { ...rawData };
    payload.created_at = new Date().toISOString();

    if (activeContest === 'arena') {
      // Processa as múltiplas identificações
      let finalIdentifications = selectedIdentifications.map(item => {
        if (item === 'Outro:') return `Outro: ${otherId || 'Não especificado'}`;
        return item;
      }).join(', ');

      payload = {
        name: payload.name,
        email: payload.email,
        whatsapp: payload.whatsapp,
        bairro: payload.bairro,
        city: payload.city,
        birth_date: payload.birth_date,
        identification: finalIdentifications,
        created_at: payload.created_at
      };
    } else {
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
    } catch (err: any) {
      console.error("Erro ao inserir:", err);
      setError(err.message || 'Ocorreu um erro ao enviar o cadastro.');
    } finally {
      setLoading(false);
    }
  };

  const getContestVisuals = (type: ContestType) => {
    switch (type) {
      case 'cospobre': return { title: 'Cospobre', color: 'from-green-500', accent: 'green', shadow: 'shadow-green-500/20', focus: 'focus:ring-green-500/50 focus:border-green-500' };
      case 'cosplayer': return { title: 'Cosplayer', color: 'from-purple-500', accent: 'purple', shadow: 'shadow-purple-500/20', focus: 'focus:ring-purple-500/50 focus:border-purple-500' };
      case 'arena': return { title: 'Arena Gamer', color: 'from-cyan-400', accent: 'cyan', shadow: 'shadow-cyan-500/20', focus: 'focus:ring-cyan-500/50 focus:border-cyan-500' };
      default: return { title: 'K-Pop', color: 'from-pink-500', accent: 'pink', shadow: 'shadow-pink-500/20', focus: 'focus:ring-pink-500/50 focus:border-pink-500' };
    }
  };

  const activeVisuals = getContestVisuals(activeContest);

  const renderFormFields = () => {
    const inputStyle = `w-full bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 outline-none text-white transition-all placeholder:text-slate-600 focus:ring-4 ${activeVisuals.focus}`;
    const labelStyle = "text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-[0.15em]";

    if (activeContest === 'arena') {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelStyle}><span className="flex items-center gap-2"><User className="w-3 h-3"/> Nome Completo *</span></label>
              <input required name="name" type="text" className={inputStyle} placeholder="Como está no documento" />
            </div>
            <div>
              <label className={labelStyle}><span className="flex items-center gap-2"><Mail className="w-3 h-3"/> E-mail *</span></label>
              <input required name="email" type="email" className={inputStyle} placeholder="seu@email.com" />
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
            <div className="flex justify-between items-end mb-2">
              <label className={labelStyle}>Como você se identifica? (Marque até 3) *</label>
              <span className={`text-[9px] font-black uppercase ${selectedIdentifications.length === 3 ? 'text-cyan-400' : 'text-slate-600'}`}>
                {selectedIdentifications.length} / 3 selecionados
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
              {['Gamer', 'Otaku', 'Cosplayer', 'K-popper', 'Cultura Geek', 'Outro:'].map((opt) => {
                const isSelected = selectedIdentifications.includes(opt);
                const isDisabled = !isSelected && selectedIdentifications.length >= 3;
                
                return (
                  <label 
                    key={opt} 
                    className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-all group ${
                      isSelected 
                        ? 'bg-cyan-500/10 border-cyan-500/50 ring-1 ring-cyan-500/20' 
                        : 'bg-slate-800/30 border-slate-700/50 hover:bg-white/5'
                    } ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      disabled={isDisabled}
                      onChange={() => handleIdentificationChange(opt)}
                      className={`w-4 h-4 rounded text-cyan-500 focus:ring-0 bg-slate-700 border-slate-600`} 
                    />
                    <span className={`text-xs font-bold transition-colors ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                      {opt}
                    </span>
                  </label>
                );
              })}
            </div>
            {selectedIdentifications.includes('Outro:') && (
              <input 
                name="other_id" 
                type="text" 
                placeholder="Especifique sua identificação..." 
                className={`${inputStyle} mt-4 animate-in fade-in slide-in-from-top-1`}
                value={otherId}
                onChange={(e) => setOtherId(e.target.value)}
                required
              />
            )}
          </div>
        </div>
      );
    }

    if (activeContest === 'kpop') {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelStyle}>Nome do Grupo / Artista Solo *</label>
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
              <label className={labelStyle}>WhatsApp de Contato *</label>
              <input required name="whatsapp" type="tel" className={inputStyle} />
            </div>
            <div>
              <label className={labelStyle}>E-mail *</label>
              <input required name="email" type="email" className={inputStyle} />
            </div>
          </div>
          <div>
            <label className={labelStyle}>Integrantes (Nomes Completos) *</label>
            <textarea required name="members_names" rows={3} className={inputStyle} placeholder="Separe por vírgulas"></textarea>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className={labelStyle}>Idades *</label>
              <input required name="members_ages" type="text" className={inputStyle} />
            </div>
            <div>
              <label className={labelStyle}>Qtd no Palco *</label>
              <input required name="members_count" type="number" className={inputStyle} />
            </div>
            <div>
              <label className={labelStyle}>Música / Artista *</label>
              <input required name="song_artist" type="text" className={inputStyle} />
            </div>
          </div>
          <div>
            <label className={labelStyle}>Link do Vídeo (YouTube/Drive) *</label>
            <input required name="video_link" type="url" className={inputStyle} placeholder="https://..." />
          </div>
        </div>
      );
    }

    const isCosplayer = activeContest === 'cosplayer';
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelStyle}>Nome do Participante *</label>
            <input required name={isCosplayer ? "full_name" : "cosplayer_name"} type="text" className={inputStyle} />
          </div>
          <div>
            <label className={labelStyle}>Personagem *</label>
            <input required name="character_name" type="text" className={inputStyle} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelStyle}>WhatsApp *</label>
            <input required name="whatsapp" type="tel" className={inputStyle} />
          </div>
          <div>
            <label className={labelStyle}>Categoria *</label>
            <select required name="category" className={inputStyle}>
              <option value="tradicional">Tradicional</option>
              <option value="desfile">Desfile</option>
              <option value="kids">Kids</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelStyle}>Link de Referência / Fotos *</label>
          <input required name="photo_links" type="url" className={inputStyle} placeholder="Link do Drive ou Redes Sociais" />
        </div>
        <div>
          <label className={labelStyle}>Descrição curta do Cosplay *</label>
          <textarea required name={isCosplayer ? "description_process" : "cosplay_description"} rows={3} className={inputStyle}></textarea>
        </div>
      </div>
    );
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className={`bg-slate-900/50 backdrop-blur-3xl p-8 md:p-12 rounded-[3rem] shadow-2xl border border-${activeVisuals.accent}-500/30 max-w-md w-full space-y-8 text-center animate-in zoom-in duration-500`}>
          <div className={`w-24 h-24 bg-${activeVisuals.accent}-500/10 rounded-full flex items-center justify-center mx-auto ring-4 ring-${activeVisuals.accent}-500/20`}>
            <CheckCircle2 className={`w-12 h-12 text-${activeVisuals.accent}-400`} />
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Sucesso!</h2>
            <p className="text-slate-400 font-medium leading-relaxed">
              Sua participação no <span className={`text-${activeVisuals.accent}-400`}>{activeVisuals.title}</span> foi registrada com sucesso.
            </p>
          </div>
          
          <div className="space-y-3">
            {activeContest === 'arena' && (
              <a 
                href="https://chat.whatsapp.com/JEv5h5hq0YY2ZFbXHYkBT7" 
                target="_blank" 
                rel="noreferrer"
                className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-5 rounded-2xl transition-all uppercase tracking-widest text-[10px] md:text-xs shadow-xl shadow-green-500/20 flex items-center justify-center gap-3 active:scale-95"
              >
                <MessageCircle className="w-5 h-5" />
                Entrar no grupo Arena Gamer
              </a>
            )}
            
            <button 
              onClick={() => setSubmitted(false)} 
              className={`w-full ${activeContest === 'arena' ? 'bg-slate-800 hover:bg-slate-700' : 'bg-' + activeVisuals.accent + '-600 hover:bg-' + activeVisuals.accent + '-500'} text-white font-black py-5 rounded-2xl transition-all uppercase tracking-widest text-[10px] md:text-xs shadow-xl active:scale-95`}
            >
              Fazer Nova Inscrição
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 min-h-screen text-white pb-20 selection:bg-cyan-500/30">
      <Header activeContest={activeContest} setActiveContest={setActiveContest} />
      
      <div className="container mx-auto px-4 pt-20 pb-16 text-center">
        <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 border border-white/10 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mb-8 animate-in fade-in slide-in-from-top-4 duration-700`}>
           {activeContest === 'arena' ? <Gamepad2 className="w-4 h-4 text-cyan-400"/> : <Star className="w-4 h-4 text-pink-400"/>}
           GEEKZADA FESTIVAL 2026
        </div>
        
        <h2 className={`text-6xl md:text-[7rem] font-black bg-clip-text text-transparent bg-gradient-to-b ${activeVisuals.color} to-white uppercase tracking-tighter mb-8 leading-[0.85] animate-in zoom-in-95 duration-500`}>
          {activeContest === 'arena' ? 'ARENA GAMER' : `CONCURSO ${activeVisuals.title}`}
        </h2>
        
        {activeContest === 'arena' ? (
          <div className="flex flex-wrap items-center justify-center gap-4 mb-16 animate-in fade-in duration-1000 delay-300">
            <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm flex items-center gap-3">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <div className="text-left">
                <p className="text-[9px] text-slate-500 font-black uppercase">Data</p>
                <p className="text-sm font-bold">14 DE FEV</p>
              </div>
            </div>
            <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm flex items-center gap-3">
              <MapPin className="w-5 h-5 text-cyan-400" />
              <div className="text-left">
                <p className="text-[9px] text-slate-500 font-black uppercase">Local</p>
                <p className="text-sm font-bold">ESTÁDIO MANGUEIRÃO</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-slate-500 max-w-xl mx-auto text-sm md:text-base mb-16 font-medium leading-relaxed italic">
            "A glória espera por aqueles que transformam sua paixão em arte."
          </p>
        )}
      </div>

      <section className="container mx-auto px-4">
        <div className={`max-w-4xl mx-auto bg-slate-900/30 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 md:p-16 shadow-2xl transition-all duration-700 ${activeVisuals.shadow}`}>
          <form onSubmit={handleSubmit} className="space-y-12">
            {renderFormFields()}

            <div className="space-y-6 pt-12 border-t border-white/5">
              <div className="grid grid-cols-1 gap-4">
                <label className="flex items-start gap-4 cursor-pointer group p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors border border-transparent hover:border-white/5">
                  <input required name="image_release" type="checkbox" className={`w-6 h-6 rounded-md border-slate-700 bg-slate-800 text-${activeVisuals.accent}-500 focus:ring-0 mt-1`} />
                  <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors leading-relaxed font-medium">
                    Autorizo o uso de minha imagem para fins de divulgação do evento Geekzada 2026.
                  </span>
                </label>
                <label className="flex items-start gap-4 cursor-pointer group p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors border border-transparent hover:border-white/5">
                  <input required name="rules_agreement" type="checkbox" className={`w-6 h-6 rounded-md border-slate-700 bg-slate-800 text-${activeVisuals.accent}-500 focus:ring-0 mt-1`} />
                  <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors leading-relaxed font-medium">
                    Declaro que li e concordo com o regulamento oficial do evento.
                  </span>
                </label>
              </div>
              
              {activeContest !== 'arena' && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-[0.15em]">Assinatura Digital *</label>
                  <input required name="signature" type="text" placeholder="Digite seu nome completo" className={`w-full bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 outline-none text-white transition-all focus:ring-4 ${activeVisuals.focus}`} />
                </div>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex gap-3 animate-bounce">
                <AlertCircle className="shrink-0 w-5 h-5" /> 
                <span className="text-sm font-bold uppercase tracking-tight">{error}</span>
              </div>
            )}

            <button 
              disabled={loading} 
              type="submit" 
              className={`w-full bg-gradient-to-r ${activeContest === 'arena' ? 'from-cyan-500 to-blue-600 shadow-cyan-500/20' : 'from-pink-600 to-purple-600 shadow-pink-500/20'} hover:scale-[1.02] active:scale-[0.98] text-white font-black py-6 rounded-2xl flex items-center justify-center gap-4 transition-all shadow-2xl disabled:opacity-50 uppercase tracking-[0.2em] text-xs`}
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {activeContest === 'arena' ? <Gamepad2 className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                  Finalizar Cadastro
                </>
              )}
            </button>
          </form>
        </div>
      </section>

      <footer className="py-24 text-center mt-20">
        <div className="container mx-auto px-4">
          <div className="w-16 h-1 bg-slate-800 mx-auto mb-12 rounded-full"></div>
          <p className="text-slate-800 font-black tracking-[0.5em] text-[10px] mb-8 uppercase">WD SOLUÇÕES DIGITAIS 2026</p>
          <div className="flex justify-center gap-6">
            <button onClick={onGoAdmin} className="text-slate-800 hover:text-pink-500/50 text-[10px] font-bold uppercase tracking-widest transition-colors">Admin</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
