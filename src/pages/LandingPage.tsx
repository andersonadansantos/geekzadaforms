
import React, { useState, useEffect } from 'react';
import { api } from '../apiClient';
import { ContestType } from '../types';
import { 
  CheckCircle2, Music, Send, Star, AlertCircle, Camera, 
  Wand2, Gamepad2, MapPin, Calendar, User, Mail, 
  Phone, Home, Map, RefreshCw, MessageCircle, Clock, 
  Link as LinkIcon, FileText, Award, Mic, Newspaper, Radio, Laptop, 
  Camera as CameraIcon, Store, Briefcase, Zap, Globe, Package, X, Check, Layers, Users, Plus
} from 'lucide-react';
import logoGeekzada from '../assets/logo-Geekzada26.png';
import CreatorsForm from './CreatorsForm';
import PesquisaForm from './PesquisaForm';

// Limites dos anexos, espelhados em api/forms.php ('files'). Aqui sao
// apenas um aviso para quem preenche; quem valida de verdade e o servidor.
const VIDEO_MAX_BYTES = 40 * 1024 * 1024;            // Beco dos Artistas
const COSPLAYER_VIDEO_MAX_BYTES = 4 * 1024 * 1024 * 1024;  // Cosplayer Performance
const PHOTO_MAX_BYTES = 2 * 1024 * 1024 * 1024;            // Cosplayer Performance
const PHOTO_MAX_COUNT = 3;
const VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime,video/x-m4v,video/x-msvideo,video/x-matroska';
const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';

interface LandingPageProps {
  activeContest: ContestType | 'home';
  setActiveContest: (type: ContestType | 'home') => void;
  onGoAdmin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ activeContest, setActiveContest, onGoAdmin }) => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otherId, setOtherId] = useState('');
  const [selectedIdentifications, setSelectedIdentifications] = useState<string[]>([]);
  const [estandistaCategory, setEstandistaCategory] = useState('');
  const [estandistaPreviousEvents, setEstandistaPreviousEvents] = useState('');
  const [estandistaSpaceSize, setEstandistaSpaceSize] = useState('');
  const [estandistaEnergy, setEstandistaEnergy] = useState('');
  const [estandistaTargetAudience, setEstandistaTargetAudience] = useState<string[]>([]);
  const [estandistaFoodOptions, setEstandistaFoodOptions] = useState<string[]>([]);
  const [estandistaFoodNeeds, setEstandistaFoodNeeds] = useState<string[]>([]);
  const [estandistaInteractiveExperiences, setEstandistaInteractiveExperiences] = useState<string[]>([]);
  const [estandistaStaffCount, setEstandistaStaffCount] = useState('');
  const [estandistaStaffJustification, setEstandistaStaffJustification] = useState('');
  // Anexos do Cosplayer Performance: 1 video e 1 a 3 fotos.
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  // Links de dance practice do K-Pop: um input por link (0 a varios).
  const [dancePracticeLinks, setDancePracticeLinks] = useState<string[]>(['']);
  // Participacao do K-Pop: Grupo, Solo ou Dupla. O nome depende do tipo.
  // "Grupo" ja vem marcado para o campo de nome aparecer de imediato.
  const [participationType, setParticipationType] = useState('Grupo');
  const [participationName, setParticipationName] = useState('');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Sem isso o modal de "inscricao enviada" continua aberto ao trocar de
    // formulario (por exemplo, voltando pelo historico do navegador).
    setSubmitted(false);
    setLoading(false);
    setSelectedIdentifications([]);
    setEstandistaCategory('');
    setEstandistaPreviousEvents('');
    setEstandistaSpaceSize('');
    setEstandistaEnergy('');
    setEstandistaTargetAudience([]);
    setEstandistaFoodOptions([]);
    setEstandistaFoodNeeds([]);
    setEstandistaInteractiveExperiences([]);
    setEstandistaStaffCount('');
    setEstandistaStaffJustification('');
    setVideoFile(null);
    setPhotoFiles([]);
    setDancePracticeLinks(['']);
    // Ao trocar de formulario o K-Pop volta ao padrao: Grupo marcado e campo
    // de nome visivel, sem texto do preenchimento anterior.
    setParticipationType('Grupo');
    setParticipationName('');
    setOtherId('');
    setError(null);
  }, [activeContest]);

  const handleIdentificationChange = (val: string) => {
    if (selectedIdentifications.includes(val)) {
      setSelectedIdentifications(prev => prev.filter(i => i !== val));
    } else {
      if (selectedIdentifications.length < 3) {
        setSelectedIdentifications(prev => [...prev, val]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if ((activeContest === 'arena' || activeContest === 'usinageek') && selectedIdentifications.length === 0) {
      setError('Selecione pelo menos uma opção em "Como você se identifica?".');
      return;
    }

    if (activeContest === 'estandista') {
      if (estandistaTargetAudience.length === 0) {
        setError('Selecione pelo menos uma opção em "3.4 Público-Alvo Principal".');
        return;
      }
    }

    // Cosplayer Performance: o video e opcional; as fotos sao obrigatorias
    // (1 a 3). Quem envia video respeita o limite de 4 GB.
    if (activeContest === 'cosplayerperf' || activeContest === 'cosplayer') {
      if (videoFile && videoFile.size > COSPLAYER_VIDEO_MAX_BYTES) {
        setError('O vídeo pode ter no máximo 4 GB.');
        return;
      }
      if (photoFiles.length < 1) {
        setError('Anexe pelo menos 1 foto.');
        return;
      }
      if (photoFiles.length > PHOTO_MAX_COUNT) {
        setError(`Envie no máximo ${PHOTO_MAX_COUNT} fotos.`);
        return;
      }
      if (photoFiles.some((foto) => foto.size > PHOTO_MAX_BYTES)) {
        setError('Cada foto pode ter no máximo 2 GB.');
        return;
      }
    }

    // Beco dos Artistas: o video de apresentacao e obrigatorio.
    if (activeContest === 'becodosartistas') {
      if (!videoFile) {
        setError('Anexe o vídeo de apresentação.');
        return;
      }
      if (videoFile.size > VIDEO_MAX_BYTES) {
        setError('O vídeo pode ter no máximo 40 MB.');
        return;
      }
    }

    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const rawData = Object.fromEntries(formData.entries());

    // Os arquivos vao no multipart (api.submit), nunca dentro do JSON.
    delete (rawData as Record<string, unknown>).video;
    delete (rawData as Record<string, unknown>).photos;
    
    let payload: any = { ...rawData };
    const createdAt = new Date().toISOString();

    if (activeContest === 'arena' || activeContest === 'usinageek') {
      const finalIdentifications = selectedIdentifications.map(item => {
        if (item === 'Outro:') return `Outro: ${otherId || 'Não especificado'}`;
        return item;
      }).join(', ');

      payload = {
        name: rawData.name,
        email: rawData.email,
        whatsapp: rawData.whatsapp,
        bairro: rawData.bairro,
        city: rawData.city,
        birth_date: rawData.birth_date,
        identification: finalIdentifications,
        // O Arena nao pede assinatura digital, mas os dois formularios
        // exigem aceite de imagem e de regulamento.
        image_release: rawData.image_release === 'on',
        rules_agreement: rawData.rules_agreement === 'on',
        created_at: createdAt
      };

      if (activeContest === 'usinageek') {
        payload.signature = rawData.signature;
      }
    } else if (activeContest === 'imprensa') {
      payload = {
        full_name: rawData.full_name,
        badge_name: rawData.badge_name,
        document: rawData.document,
        whatsapp: rawData.whatsapp,
        email: rawData.email,
        media_outlet: rawData.media_outlet,
        media_type: rawData.media_type,
        role: rawData.role,
        city_state: rawData.city_state,
        link: rawData.link,
        coverage_type: rawData.coverage_type,
        special_credential: rawData.special_credential,
        equipment: rawData.equipment,
        responsibility_term: rawData.responsibility_term === 'on',
        image_release: rawData.image_release === 'on',
        signature: rawData.signature,
        // 2a midia/auxiliar: campos opcionais. Sem estes o credencial
        // do segundo profissional nunca chegava ao banco.
        second_name: rawData.second_name,
        second_cpf: rawData.second_cpf,
        second_whatsapp: rawData.second_whatsapp,
        created_at: createdAt
      };
    } else if (activeContest === 'estandista') {
      payload = {
        company_name: rawData.company_name,
        razao_social: rawData.razao_social,
        document: rawData.document,
        responsible_name: rawData.responsible_name,
        whatsapp: rawData.whatsapp,
        email: rawData.email,
        portfolio_link: rawData.portfolio_link,
        category: estandistaCategory,
        segment_description: rawData.segment_description,
        main_products: [
          rawData.product_1,
          rawData.product_2,
          rawData.product_3,
          rawData.product_4
        ].filter(Boolean),
        average_price: rawData.average_price,
        target_audience: estandistaTargetAudience.join(', '),
        target_audience_other: rawData.target_audience_other,
        previous_events_participation: estandistaPreviousEvents === 'Sim',
        previous_events_details: rawData.previous_events_details,
        food_flagship: rawData.food_flagship,
        food_options: estandistaFoodOptions,
        food_needs: estandistaFoodNeeds,
        space_size: estandistaSpaceSize,
        space_size_custom: rawData.space_size_custom,
        structure_type: rawData.structure_type,
        energy_need: estandistaEnergy,
        energy_equipment_count: parseInt(rawData.energy_equipment_count as string) || 0,
        differential: rawData.differential,
        staff_count: estandistaStaffCount,
        staff_justification: rawData.staff_justification,
        interactive_experiences: estandistaInteractiveExperiences,
        interactive_experiences_other: rawData.interactive_experiences_other,
        declaration_true: rawData.declaration_true === 'on',
        declaration_curatorship: rawData.declaration_curatorship === 'on',
        image_release: rawData.image_release === 'on',
        rules_agreement: rawData.rules_agreement === 'on',
        signature: rawData.signature,
        created_at: createdAt
      };
    } else {
      payload.created_at = createdAt;
      const checkboxFields = ['image_release', 'rules_agreement', 'authorship_declaration'];
      checkboxFields.forEach(field => {
        if (payload[field] !== undefined) {
          payload[field] = payload[field] === 'on';
        }
      });
      // K-Pop: links de dance practice vêm do estado React (inputs dinâmicos),
      // senão o Object.fromEntries capturaria só o último input repetido.
      if (activeContest === 'kpop') {
        payload.dance_practice_links = dancePracticeLinks.map(link => link.trim()).filter(Boolean);
        payload.participation_type = participationType;
        // Cada tipo grava na SUA coluna: a ficha do painel mostra so o
        // preenchido, sem misturar nome de grupo com nome de solo/dupla.
        if (participationType === 'Grupo') {
          payload.participation_group_name = participationName.trim();
        } else if (participationType) {
          payload.participation_solo_duo_name = participationName.trim();
        }
      }
    }

    try {
      const anexos =
        activeContest === 'cosplayerperf' || activeContest === 'cosplayer'
          ? { video: videoFile, photos: photoFiles }
          : activeContest === 'becodosartistas'
            ? { video: videoFile }
            : undefined;

      await api.submit(activeContest, payload, anexos);
      setSubmitted(true);
    } catch (err: any) {
      console.error("Erro ao inserir:", err);
      setError(err.message || 'Ocorreu um erro ao processar sua inscrição.');
    } finally {
      setLoading(false);
    }
  };

  const getContestVisuals = (type: ContestType | 'home') => {
    switch (type) {
      case 'cosplayer':
      case 'cosplayerperf':
      case 'cosplayerdesfile': return { title: 'Cosplay', color: 'from-purple-500', accent: 'purple', shadow: 'shadow-purple-500/20', focus: 'focus:ring-purple-500/50 focus:border-purple-500', btn: 'bg-purple-600 hover:bg-purple-500', textColorClass: 'text-purple-500' };
      case 'arena': return { title: 'Arena Gamer', color: 'from-cyan-400', accent: 'cyan', shadow: 'shadow-cyan-500/20', focus: 'focus:ring-cyan-500/50 focus:border-cyan-500', btn: 'bg-cyan-600 hover:bg-cyan-500', textColorClass: 'text-cyan-400' };
      case 'imprensa': return { title: 'Imprensa', color: 'from-indigo-500', accent: 'indigo', shadow: 'shadow-indigo-500/20', focus: 'focus:ring-indigo-500/50 focus:border-indigo-500', btn: 'bg-indigo-600 hover:bg-indigo-500', textColorClass: 'text-indigo-500' };
      case 'estandista': return { title: 'Expositores', color: 'from-orange-500', accent: 'orange', shadow: 'shadow-orange-500/20', focus: 'focus:ring-orange-500/50 focus:border-orange-500', btn: 'bg-orange-600 hover:bg-orange-500', textColorClass: 'text-orange-500' };
      case 'creators': return { title: 'Creators', color: 'from-fuchsia-500', accent: 'fuchsia', shadow: 'shadow-fuchsia-500/20', focus: 'focus:ring-fuchsia-500/50 focus:border-fuchsia-500', btn: 'bg-fuchsia-600 hover:bg-fuchsia-500', textColorClass: 'text-fuchsia-500' };
      case 'becodosartistas': return { title: 'Beco dos Artistas', color: 'from-rose-500', accent: 'rose', shadow: 'shadow-rose-500/20', focus: 'focus:ring-rose-500/50 focus:border-rose-500', btn: 'bg-rose-600 hover:bg-rose-500', textColorClass: 'text-rose-500' };
      case 'pesquisa': return { title: 'Pesquisa', color: 'from-violet-500', accent: 'violet', shadow: 'shadow-violet-500/20', focus: 'focus:ring-violet-500/50 focus:border-violet-500', btn: 'bg-violet-600 hover:bg-violet-500', textColorClass: 'text-violet-500' };
      case 'usinageek': return { title: 'Usina Geek', color: 'from-[#83E509]', accent: '[#83E509]', shadow: 'shadow-[#83E509]/20', focus: 'focus:ring-[#83E509]/50 focus:border-[#83E509]', btn: 'bg-[#83E509] hover:bg-[#83E509]/80', textColorClass: 'text-[#83E509]' };
      case 'home': return { title: 'Home', color: 'from-slate-500', accent: 'slate', shadow: 'shadow-slate-500/20', focus: 'focus:ring-slate-500/50 focus:border-slate-500', btn: 'bg-slate-600 hover:bg-slate-500', textColorClass: 'text-slate-500' };
      default: return { title: 'K-Pop', color: 'from-pink-500', accent: 'pink', shadow: 'shadow-pink-500/20', focus: 'focus:ring-pink-500/50 focus:border-pink-500', btn: 'bg-pink-600 hover:bg-pink-500', textColorClass: 'text-pink-500' };
    }
  };

  const activeVisuals = getContestVisuals(activeContest);
  const inputStyle = `w-full bg-white border border-slate-200 rounded-xl p-3.5 outline-none text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400`;
  const labelStyle = "text-xs font-semibold text-slate-500 mb-2 block uppercase tracking-wider";

  // Creators tem tela propria (autonoma, dark/cyber), fora do container
  // padrao dos concursos: o briefing pede uma pagina sem cara de portal.
  if (activeContest === 'creators') {
    return <CreatorsForm onBack={() => setActiveContest('home')} />;
  }

  // A pesquisa de satisfacao tem tela propria (multi-etapas, dark), fora do
  // container padrao dos concursos.
  if (activeContest === 'pesquisa') {
    return <PesquisaForm onBack={() => setActiveContest('home')} />;
  }

  const renderFormFields = () => {
    if (activeContest === 'usinageek') {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 relative z-10 text-left">
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
              <span className={`text-[10px] font-semibold uppercase ${selectedIdentifications.length === 3 ? 'text-slate-900' : 'text-slate-900'}`}>
                {selectedIdentifications.length} / 3 selecionados
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
              {['Gamer', 'Otaku', 'Cosplayer', 'K-pop', 'Entusiasta da cultura Geek', 'Outro:'].map((opt) => {
                const isSelected = selectedIdentifications.includes(opt);
                const isDisabled = !isSelected && selectedIdentifications.length >= 3;
                return (
                  <label key={opt} className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-all group ${isSelected ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/15' : 'bg-white border-slate-200 shadow-sm hover:border-blue-300'} ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
                    <input type="checkbox" checked={isSelected} disabled={isDisabled} onChange={() => handleIdentificationChange(opt)} className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-white border-slate-300" />
                    <span className={`text-xs font-bold transition-colors ${isSelected ? 'text-slate-900' : 'text-slate-900 group-hover:text-slate-700'}`}>{opt}</span>
                  </label>
                );
              })}
            </div>
            {selectedIdentifications.includes('Outro:') && (
              <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                <label className={labelStyle}>Especifique sua identificação *</label>
                <input type="text" placeholder="Ex: Desenvolvedor, Streamer..." className={inputStyle} value={otherId} onChange={(e) => setOtherId(e.target.value)} required />
              </div>
            )}
          </div>
          <div className="space-y-4 pt-4">
            {/* Checkboxes handled by the main form body to avoid duplication */}
          </div>
        </div>
      );
    }

    if (activeContest === 'estandista') {
      const isFoodCategory = estandistaCategory === 'Praça de Alimentação (comidas, bebidas, food truck, carrinhos)';
      
      return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500 relative z-10 text-left">
          {/* SEÇÃO 1 – IDENTIFICAÇÃO DO ESTABELECIMENTO */}
          <div className="space-y-6">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2 flex items-center gap-2"><Briefcase className="w-3 h-3"/> SEÇÃO 1 – IDENTIFICAÇÃO DO ESTABELECIMENTO</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelStyle}>Nome da Empresa / Nome Fantasia *</label>
                <input required name="company_name" type="text" className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Razão Social (se houver)</label>
                <input name="razao_social" type="text" className={inputStyle} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelStyle}>CNPJ (ou CPF para Artists’ Alley) *</label>
                <input required name="document" type="text" className={inputStyle} placeholder="00.000.000/0000-00 ou 000.000.000-00" />
              </div>
              <div>
                <label className={labelStyle}>Nome do Responsável pelo Stand *</label>
                <input required name="responsible_name" type="text" className={inputStyle} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelStyle}>WhatsApp do Responsável com DDD *</label>
                <input required name="whatsapp" type="tel" className={inputStyle} placeholder="(00) 00000-0000" />
              </div>
              <div>
                <label className={labelStyle}>E-mail do Responsável *</label>
                <input required name="email" type="email" className={inputStyle} placeholder="seu@email.com" />
              </div>
            </div>
            <div>
              <label className={labelStyle}>Instagram / Site / Portfólio (Obrigatório para curadoria visual) *</label>
              <input required name="portfolio_link" type="text" className={inputStyle} placeholder="Link do seu trabalho" />
            </div>
          </div>

          {/* SEÇÃO 2 – CATEGORIA DO ESTABELECIMENTO */}
          <div className="space-y-6">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2 flex items-center gap-2"><Layers className="w-3 h-3"/> SEÇÃO 2 – CATEGORIA DO ESTABELECIMENTO</h3>
            <div className="space-y-3">
              <label className={labelStyle}>Categoria Principal (Seleção única) *</label>
              <div className="grid grid-cols-1 gap-3">
                {[
                  'Loja / Expositor (produtos geek, colecionáveis, vestuário, acessórios)',
                  'Artists\' Alley (ilustradores, quadrinistas, artistas independentes)',
                  'Praça de Alimentação (comidas, bebidas, food truck, carrinhos)',
                  'Marca / Patrocinador (ativações, games, experiências interativas)'
                ].map((cat) => (
                  <label key={cat} className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all group ${estandistaCategory === cat ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/15' : 'bg-white border-slate-200 shadow-sm hover:border-blue-300'}`}>
                    <input 
                      required
                      type="radio" 
                      name="category"
                      value={cat}
                      checked={estandistaCategory === cat} 
                      onChange={() => setEstandistaCategory(cat)}
                      className="w-5 h-5 text-blue-600 focus:ring-0 bg-white border-slate-300" 
                    />
                    <span className={`text-xs font-bold transition-colors ${estandistaCategory === cat ? 'text-slate-900' : 'text-slate-900 group-hover:text-slate-700'}`}>{cat}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* SEÇÃO 3 – SOBRE SEU STAND */}
          <div className="space-y-6">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2 flex items-center gap-2"><Zap className="w-3 h-3"/> SEÇÃO 3 – SOBRE SEU STAND</h3>
            
            <div>
              <label className={labelStyle}>3.1 Tipo de Produto / Segmento Principal *</label>
              <textarea required name="segment_description" rows={3} className={inputStyle} placeholder="Descrição objetiva do que será vendido"></textarea>
            </div>

            <div className="space-y-4">
              <label className={labelStyle}>3.2 Liste os 4 PRINCIPAIS produtos que você venderá *</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required name="product_1" type="text" className={inputStyle} placeholder="Produto 1" />
                <input required name="product_2" type="text" className={inputStyle} placeholder="Produto 2" />
                <input required name="product_3" type="text" className={inputStyle} placeholder="Produto 3" />
                <input required name="product_4" type="text" className={inputStyle} placeholder="Produto 4" />
              </div>
            </div>

            <div className="space-y-3">
              <label className={labelStyle}>3.3 Preço Médio dos Itens *</label>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {['Até R$ 40', 'R$ 41 a R$ 80', 'R$ 81 a R$ 150', 'Acima de R$ 150'].map((opt) => (
                  <label key={opt} className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer shadow-sm transition-all hover:border-blue-300">
                    <input required type="radio" name="average_price" value={opt} className="w-4 h-4 text-blue-600 focus:ring-0 bg-white border-slate-300" />
                    <span className="text-xs font-bold text-slate-900">{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className={labelStyle}>3.4 Público-Alvo Principal *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['Infantil', 'Jovem / Gen Z', 'Adulto Geek', 'Colecionadores', 'Fãs de K-pop', 'Gamer', 'Público geral', 'Outro'].map((opt) => (
                  <label key={opt} className={`flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer shadow-sm transition-all hover:border-blue-300 ${estandistaTargetAudience.includes(opt) ? 'border-blue-400 ring-2 ring-blue-500/15 bg-blue-50' : ''}`}>
                    <input 
                      type="checkbox" 
                      checked={estandistaTargetAudience.includes(opt)}
                      onChange={(e) => {
                        if (e.target.checked) setEstandistaTargetAudience(prev => [...prev, opt]);
                        else setEstandistaTargetAudience(prev => prev.filter(o => o !== opt));
                      }}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-white border-slate-300" 
                    />
                    <span className="text-xs font-bold text-slate-900">{opt}</span>
                  </label>
                ))}
              </div>
              {estandistaTargetAudience.includes('Outro') && (
                <input required name="target_audience_other" type="text" className={`${inputStyle} mt-2`} placeholder="Especifique o público" />
              )}
            </div>

            <div className="space-y-3">
              <label className={labelStyle}>3.5 Já participou de outros eventos geek? *</label>
              <div className="flex gap-6">
                {['Sim', 'Não'].map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input required type="radio" name="previous_events_participation" value={opt} onChange={() => setEstandistaPreviousEvents(opt)} className="w-4 h-4 text-blue-600 focus:ring-0 bg-white border-slate-300" />
                    <span className="text-xs font-bold text-slate-900">{opt}</span>
                  </label>
                ))}
              </div>
              {estandistaPreviousEvents === 'Sim' && (
                <textarea required name="previous_events_details" rows={2} className={`${inputStyle} mt-2`} placeholder="Quais eventos e qual teve melhor resultado?"></textarea>
              )}
            </div>
          </div>

          {/* SEÇÃO 4 – INFORMAÇÕES ESPECÍFICAS PARA ALIMENTAÇÃO */}
          {isFoodCategory && (
            <div className="space-y-6 p-6 bg-blue-50/60 rounded-2xl border border-blue-100 animate-in fade-in slide-in-from-top-2">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2 flex items-center gap-2"><Globe className="w-3 h-3"/> SEÇÃO 4 – INFORMAÇÕES ESPECÍFICAS PARA ALIMENTAÇÃO</h3>
              <div>
                <label className={labelStyle}>Qual seu carro-chefe? *</label>
                <input required name="food_flagship" type="text" className={inputStyle} />
              </div>
              
              <div className="space-y-3">
                <label className={labelStyle}>Opções (Múltipla escolha)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {['Temáticas', 'Vegetarianas', 'Veganas', 'Sem lactose', 'Sem glúten'].map((opt) => (
                    <label key={opt} className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-all ${estandistaFoodOptions.includes(opt) ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/15' : 'bg-white border-slate-200 shadow-sm hover:border-blue-300'}`}>
                      <input 
                        type="checkbox" 
                        checked={estandistaFoodOptions.includes(opt)}
                        onChange={(e) => {
                          if (e.target.checked) setEstandistaFoodOptions(prev => [...prev, opt]);
                          else setEstandistaFoodOptions(prev => prev.filter(o => o !== opt));
                        }}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-white border-slate-300" 
                      />
                      <span className="text-xs font-bold text-slate-900">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className={labelStyle}>Necessidades (Múltipla escolha) *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {['Ponto de energia', 'Ponto de água', 'Área externa (food truck)', 'Área interna'].map((opt) => (
                    <label key={opt} className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-all ${estandistaFoodNeeds.includes(opt) ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/15' : 'bg-white border-slate-200 shadow-sm hover:border-blue-300'}`}>
                      <input 
                        type="checkbox" 
                        checked={estandistaFoodNeeds.includes(opt)}
                        onChange={(e) => {
                          if (e.target.checked) setEstandistaFoodNeeds(prev => [...prev, opt]);
                          else setEstandistaFoodNeeds(prev => prev.filter(o => o !== opt));
                        }}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-white border-slate-300" 
                      />
                      <span className="text-xs font-bold text-slate-900">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SEÇÃO 5 – ESTRUTURA E LOGÍSTICA */}
          <div className="space-y-6">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2 flex items-center gap-2"><Package className="w-3 h-3"/> SEÇÃO 5 – ESTRUTURA E LOGÍSTICA</h3>
            
            <div className="space-y-3">
              <label className={labelStyle}>5.1 Tamanho de espaço pretendido (Seleção única) *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  'Mesa / Balcão (Artists’ Alley)',
                  'Stand 2x2m',
                  'Stand 3x3m',
                  'Área para Food Truck',
                  'Stand personalizado'
                ].map((opt) => (
                  <label key={opt} className={`flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer shadow-sm transition-all hover:border-blue-300 ${estandistaSpaceSize === opt ? 'border-blue-400 ring-2 ring-blue-500/15 bg-blue-50' : ''}`}>
                    <input required type="radio" name="space_size" value={opt} onChange={() => setEstandistaSpaceSize(opt)} className="w-4 h-4 text-blue-600 focus:ring-0 bg-white border-slate-300" />
                    <span className="text-xs font-bold text-slate-900">{opt}</span>
                  </label>
                ))}
              </div>
              {estandistaSpaceSize === 'Stand personalizado' && (
                <input required name="space_size_custom" type="text" className={`${inputStyle} mt-2`} placeholder="Informe a metragem desejada" />
              )}
            </div>

            <div className="space-y-3">
              <label className={labelStyle}>5.2 Estrutura (Seleção única) *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  'Sim, levo estrutura completa',
                  'Levo estrutura parcial',
                  'Preciso de estrutura básica (mesa, cadeiras)',
                  'Preciso de estrutura completa'
                ].map((opt) => (
                  <label key={opt} className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer shadow-sm transition-all hover:border-blue-300">
                    <input required type="radio" name="structure_type" value={opt} className="w-4 h-4 text-blue-600 focus:ring-0 bg-white border-slate-300" />
                    <span className="text-xs font-bold text-slate-900">{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className={labelStyle}>5.3 Energia (Seleção única) *</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  'Não',
                  'Sim – Quantos equipamentos?',
                  'Sim – Alta carga (freezer, chapa, micro-ondas, etc.)'
                ].map((opt) => (
                  <label key={opt} className={`flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer shadow-sm transition-all hover:border-blue-300 ${estandistaEnergy === opt ? 'border-blue-400 ring-2 ring-blue-500/15 bg-blue-50' : ''}`}>
                    <input required type="radio" name="energy_need" value={opt} onChange={() => setEstandistaEnergy(opt)} className="w-4 h-4 text-blue-600 focus:ring-0 bg-white border-slate-300" />
                    <span className="text-xs font-bold text-slate-900">{opt}</span>
                  </label>
                ))}
              </div>
              {estandistaEnergy === 'Sim – Quantos equipamentos?' && (
                <input required name="energy_equipment_count" type="number" className={`${inputStyle} mt-2`} placeholder="Quantidade de equipamentos" />
              )}
            </div>

            <div className="space-y-3">
              <label className={labelStyle}>5.4 Quantas pessoas trabalharão no estande? *</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {['1', '2', '3', '4', 'Acima de 4'].map((opt) => (
                  <label key={opt} className={`flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer shadow-sm transition-all hover:border-blue-300 ${estandistaStaffCount === opt ? 'border-blue-400 ring-2 ring-blue-500/15 bg-blue-50' : ''}`}>
                    <input required type="radio" name="staff_count" value={opt} onChange={() => setEstandistaStaffCount(opt)} className="w-4 h-4 text-blue-600 focus:ring-0 bg-white border-slate-300" />
                    <span className="text-xs font-bold text-slate-900">{opt}</span>
                  </label>
                ))}
              </div>
              {estandistaStaffCount === 'Acima de 4' && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                  <label className={labelStyle}>Justificativa para mais de 4 pessoas *</label>
                  <textarea required name="staff_justification" rows={3} className={inputStyle} placeholder="Explique por que seu estande precisa de mais de 4 pessoas"></textarea>
                </div>
              )}
            </div>
          </div>

          {/* SEÇÃO 6 – DIFERENCIAL DO SEU STAND */}
          <div className="space-y-6">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2 flex items-center gap-2"><Star className="w-3 h-3"/> SEÇÃO 6 – DIFERENCIAL DO SEU STAND</h3>
            <div>
              <label className={labelStyle}>Por que seu stand agrega valor à Geekzada? *</label>
              <p className="text-[10px] text-slate-900 mb-2 italic">Este campo é importante para curadoria.</p>
              <textarea required name="differential" rows={3} className={inputStyle}></textarea>
            </div>
          </div>

          {/* SEÇÃO 7 – EXPERIÊNCIAS INTERATIVAS */}
          <div className="space-y-6">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2 flex items-center gap-2"><Gamepad2 className="w-3 h-3"/> SEÇÃO 7 – EXPERIÊNCIAS INTERATIVAS</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {['Sorteios', 'Demonstrações', 'Ativação temática', 'Mini campeonato', 'Nenhuma', 'Outra'].map((opt) => (
                <label key={opt} className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-all ${estandistaInteractiveExperiences.includes(opt) ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/15' : 'bg-white border-slate-200 shadow-sm hover:border-blue-300'}`}>
                  <input 
                    type="checkbox" 
                    checked={estandistaInteractiveExperiences.includes(opt)}
                    onChange={(e) => {
                      if (e.target.checked) setEstandistaInteractiveExperiences(prev => [...prev, opt]);
                      else setEstandistaInteractiveExperiences(prev => prev.filter(o => o !== opt));
                    }}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-white border-slate-300" 
                  />
                  <span className="text-xs font-bold text-slate-900">{opt}</span>
                </label>
              ))}
            </div>
            {estandistaInteractiveExperiences.includes('Outra') && (
              <input required name="interactive_experiences_other" type="text" className={inputStyle} placeholder="Especifique a atividade" />
            )}
          </div>

          {/* SEÇÃO 8 – DECLARAÇÃO */}
          <div className="space-y-6 pt-6 border-t border-slate-200">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2 flex items-center gap-2"><CheckCircle2 className="w-3 h-3"/> SEÇÃO 8 – DECLARAÇÃO</h3>
            <div className="space-y-4">
              <label className="flex items-start gap-4 cursor-pointer group p-4 bg-slate-50/70 rounded-2xl border border-slate-200 hover:border-blue-200 hover:bg-white shadow-sm transition-colors text-left">
                <input required name="declaration_true" type="checkbox" className="w-5 h-5 rounded-md border-slate-300 bg-white text-blue-600 focus:ring-0 mt-1" />
                <span className="text-xs text-slate-900 group-hover:text-slate-700 transition-colors leading-relaxed font-medium">Declaro que as informações acima são verdadeiras.</span>
              </label>
              <label className="flex items-start gap-4 cursor-pointer group p-4 bg-slate-50/70 rounded-2xl border border-slate-200 hover:border-blue-200 hover:bg-white shadow-sm transition-colors text-left">
                <input required name="declaration_curatorship" type="checkbox" className="w-5 h-5 rounded-md border-slate-300 bg-white text-blue-600 focus:ring-0 mt-1" />
                <span className="text-xs text-slate-900 group-hover:text-slate-700 transition-colors leading-relaxed font-medium">Estou ciente de que esta é uma pré-inscrição sujeita à curadoria e aprovação.</span>
              </label>
            </div>
          </div>
        </div>
      );
    }

    if (activeContest === 'imprensa') {
      return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500 relative z-10 text-left">
          <div className="space-y-6">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2 flex items-center gap-2"><User className="w-3 h-3"/> DADOS PESSOAIS</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelStyle}>Nome Completo *</label>
                <input required name="full_name" type="text" className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Nome profissional</label>
                <input name="badge_name" type="text" className={inputStyle} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className={labelStyle}>CPF ou RG *</label>
                <input required name="document" type="text" className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Telefone / WhatsApp *</label>
                <input required name="whatsapp" type="tel" className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>E-mail *</label>
                <input required name="email" type="email" className={inputStyle} />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2 flex items-center gap-2"><Users className="w-3 h-3"/> 2º MÍDIA/AUXILIAR</h3>
            <p className="text-[11px] font-bold text-slate-500">
              Preencha somente se a credencial cobrir uma segunda pessoa.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className={labelStyle}>Nome</label>
                <input name="second_name" type="text" className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>CPF</label>
                <input name="second_cpf" type="text" className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>WhatsApp</label>
                <input name="second_whatsapp" type="tel" className={inputStyle} />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2 flex items-center gap-2"><Newspaper className="w-3 h-3"/> DADOS DO VEÍCULO</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelStyle}>Nome do veículo *</label>
                <input required name="media_outlet" type="text" className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Tipo de mídia *</label>
                <select required name="media_type" className={inputStyle}>
                  <option value="">Selecione...</option>
                  <option value="TV">TV</option>
                  <option value="Rádio">Rádio</option>
                  <option value="Portal">Portal</option>
                  <option value="Jornal">Jornal</option>
                  <option value="Blog">Blog</option>
                  <option value="Influencer">Influencer</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className={labelStyle}>Cargo / Função *</label>
                <input required name="role" type="text" className={inputStyle} placeholder="Repórter, Fotógrafo..." />
              </div>
              <div>
                <label className={labelStyle}>Cidade / Estado *</label>
                <input required name="city_state" type="text" className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Link do site ou rede social *</label>
                <input required name="link" type="url" className={inputStyle} placeholder="https://..." />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2 flex items-center gap-2"><Mic className="w-3 h-3"/> DADOS OPERACIONAIS</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelStyle}>Cobertura: Foto / Vídeo / Entrevista *</label>
                <input required name="coverage_type" type="text" className={inputStyle} placeholder="Ex: Apenas fotos e entrevistas" />
              </div>
              <div>
                <label className={labelStyle}>Necessita credencial especial?</label>
                <select name="special_credential" className={inputStyle}>
                  <option value="Nenhuma">Não necessita</option>
                  <option value="Área VIP">Área VIP</option>
                  <option value="Palco">Acesso ao Palco</option>
                  <option value="Backstage">Backstage</option>
                  <option value="Total">Acesso Total</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelStyle}>Equipamentos que levará *</label>
              <textarea required name="equipment" rows={2} className={inputStyle} placeholder="Câmeras, tripés, microfones, drones..."></textarea>
            </div>
          </div>
        </div>
      );
    }

    if (activeContest === 'arena') {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 relative z-10">
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
              <span className={`text-[10px] font-semibold uppercase ${selectedIdentifications.length === 3 ? 'text-slate-900' : 'text-slate-900'}`}>
                {selectedIdentifications.length} / 3 selecionados
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
              {['Gamer', 'Otaku', 'Cosplayer', 'K-pop', 'Entusiasta da cultura Geek', 'Outro:'].map((opt) => {
                const isSelected = selectedIdentifications.includes(opt);
                const isDisabled = !isSelected && selectedIdentifications.length >= 3;
                return (
                  <label key={opt} className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-all group ${isSelected ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/15' : 'bg-white border-slate-200 shadow-sm hover:border-blue-300'} ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
                    <input type="checkbox" checked={isSelected} disabled={isDisabled} onChange={() => handleIdentificationChange(opt)} className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-white border-slate-300" />
                    <span className={`text-xs font-bold transition-colors ${isSelected ? 'text-slate-900' : 'text-slate-900 group-hover:text-slate-700'}`}>{opt}</span>
                  </label>
                );
              })}
            </div>
            {selectedIdentifications.includes('Outro:') && (
              <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                <label className={labelStyle}>Especifique sua identificação *</label>
                <input type="text" placeholder="Ex: Desenvolvedor, Streamer..." className={inputStyle} value={otherId} onChange={(e) => setOtherId(e.target.value)} required />
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activeContest === 'kpop') {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="space-y-3">
            <label className={labelStyle}>Tipo de Participação *</label>
            <div className="flex flex-wrap gap-6">
              {['Grupo', 'Solo/Dupla'].map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    required
                    type="radio"
                    name="participation_type"
                    value={opt}
                    checked={participationType === opt}
                    onChange={() => setParticipationType(opt)}
                    className="w-4 h-4 text-pink-500 focus:ring-0 bg-white border-slate-300"
                  />
                  <span className="text-xs font-bold text-slate-900">{opt}</span>
                </label>
              ))}
            </div>
            {participationType && (
              <div>
                <label className={labelStyle}>
                  {participationType === 'Grupo'
                    ? 'Nome do grupo *'
                    : 'Seu nome ou nome da dupla *'}
                </label>
                <input
                  required
                  type="text"
                  value={participationName}
                  onChange={(e) => setParticipationName(e.target.value)}
                  className={inputStyle}
                  placeholder={
                    participationType === 'Grupo'
                      ? 'Nome do seu grupo'
                      : 'Seu nome artístico ou o nome da dupla'
                  }
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelStyle}>Nome do Responsável *</label>
              <input required name="responsible_name" type="text" className={inputStyle} />
            </div>
            <div>
              <label className={labelStyle}>Quantidade de Membros *</label>
              <input required name="members_count" type="number" min="1" className={inputStyle} />
            </div>
          </div>

          <div>
            <label className={labelStyle}>Nome Completo dos Integrantes *</label>
            <textarea required name="members_names" rows={3} className={inputStyle} placeholder="Separe por vírgulas"></textarea>
          </div>

          <div>
            <label className={labelStyle}>Link Dance Practice</label>
            <div className="space-y-2">
              {dancePracticeLinks.map((link, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="url"
                    value={link}
                    onChange={(e) => {
                      const next = [...dancePracticeLinks];
                      next[i] = e.target.value;
                      setDancePracticeLinks(next);
                    }}
                    className={inputStyle}
                    placeholder="https://youtu.be/..."
                  />
                  <button
                    type="button"
                    onClick={() => setDancePracticeLinks(dancePracticeLinks.filter((_, j) => j !== i))}
                    title="Remover link"
                    aria-label="Remover link"
                    className="px-3 rounded-xl bg-white border border-slate-200 text-slate-500 shadow-sm hover:text-red-500 hover:border-red-200 transition-all shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setDancePracticeLinks([...dancePracticeLinks, ''])}
              className="mt-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar outro link
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelStyle}>Documentos do Responsável (RG ou CPF) *</label>
              <input required name="document" type="text" className={inputStyle} placeholder="RG ou CPF" />
            </div>
            <div>
              <label className={labelStyle}>WhatsApp *</label>
              <input required name="whatsapp" type="tel" className={inputStyle} placeholder="(00) 00000-0000" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelStyle}>E-mail *</label>
              <input required name="email" type="email" className={inputStyle} />
            </div>
            <div>
              <label className={labelStyle}>Música e Artista *</label>
              <input required name="song_artist" type="text" className={inputStyle} placeholder="Ex: Super Shy - NewJeans" />
            </div>
          </div>
        </div>
      );
    }

    if (activeContest === 'becodosartistas') {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelStyle}>Nome completo *</label>
              <input required name="full_name" type="text" className={inputStyle} placeholder="Como está no documento" />
            </div>
            <div>
              <label className={labelStyle}>CPF *</label>
              <input required name="cpf" type="text" className={inputStyle} placeholder="000.000.000-00" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelStyle}>Instagram *</label>
              <input required name="instagram" type="text" className={inputStyle} placeholder="@seuusuario" />
            </div>
            <div>
              <label className={labelStyle}>Idade *</label>
              <input required name="age" type="number" min="1" max="120" className={inputStyle} placeholder="Sua idade" />
            </div>
          </div>
          <div>
            <label className={labelStyle}>WhatsApp *</label>
            <input required name="whatsapp" type="tel" className={inputStyle} placeholder="(00) 00000-0000" />
          </div>
          <div className="pt-8 border-t border-slate-200">
            <label className={labelStyle}>Upload de vídeo *</label>
            <input
              required
              name="video"
              type="file"
              accept={VIDEO_ACCEPT}
              className={inputStyle}
              onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs font-bold uppercase tracking-widest mt-2 text-slate-500">
              {videoFile
                ? `Selecionado: ${videoFile.name} · ${(videoFile.size / 1048576).toFixed(1)} MB`
                : 'MP4, WebM ou MOV · até 40 MB'}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelStyle}>Nome completo *</label>
            <input required name="full_name" type="text" className={inputStyle} />
          </div>
          <div>
            <label className={labelStyle}>Nome artístico ou social *</label>
            <input required name="artistic_name" type="text" className={inputStyle} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelStyle}>Link do Instagram {activeContest === 'cosplayerdesfile' ? '(opcional)' : '*'}</label>
            <input required={activeContest !== 'cosplayerdesfile'} name="instagram_link" type="url" className={inputStyle} placeholder="https://instagram.com/seuusuario" />
          </div>
          <div>
            <label className={labelStyle}>E-mail *</label>
            <input required name="email" type="email" className={inputStyle} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelStyle}>Telefone *</label>
            <input required name="phone" type="tel" className={inputStyle} placeholder="(00) 00000-0000" />
          </div>
          <div>
            <label className={labelStyle}>Idade *</label>
            <input required name="age" type="number" min="1" max="120" className={inputStyle} placeholder="Sua idade" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelStyle}>CPF *</label>
            <input required name="cpf" type="text" className={inputStyle} />
          </div>
          <div>
            <label className={labelStyle}>Nome do personagem e sua origem *</label>
            <input required name="character_name_origin" type="text" className={inputStyle} />
          </div>
        </div>

        {activeContest === 'cosplayerperf' || activeContest === 'cosplayer' ? (
        <div className="space-y-6 pt-8 border-t border-slate-200">
          <div>
            <label className={labelStyle}>Anexar vídeo (1 vídeo) — opcional</label>
            <input
              name="video"
              type="file"
              accept={VIDEO_ACCEPT}
              className={inputStyle}
              onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs font-bold uppercase tracking-widest mt-2 text-slate-500">
              {videoFile
                ? `Selecionado: ${videoFile.name} · ${(videoFile.size / 1048576).toFixed(1)} MB`
                : 'MP4, WebM ou MOV · até 4 GB'}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between gap-4 mb-2">
              <label className={`${labelStyle} mb-0`}>Anexar fotos (Mínimo 1 até 3 fotos) *</label>
              <span className={`text-[10px] font-semibold uppercase tracking-widest ${photoFiles.length > PHOTO_MAX_COUNT ? 'text-red-400' : 'text-slate-900'}`}>
                {photoFiles.length} / {PHOTO_MAX_COUNT}
              </span>
            </div>
            <input
              required
              name="photos"
              type="file"
              accept={PHOTO_ACCEPT}
              multiple
              className={inputStyle}
              onChange={(e) => setPhotoFiles(Array.from(e.target.files ?? []))}
            />
            <p className="text-xs font-bold uppercase tracking-widest mt-2 text-slate-500">
              {photoFiles.length > 0
                ? photoFiles.map((foto) => foto.name).join(', ')
                : 'JPG, PNG ou WebP · até 2 GB cada'}
            </p>
          </div>
        </div>
        ) : null}
      </div>
    );
  };

  const getSuccessMessage = (type: ContestType) => {
    switch (type) {
      case 'cosplayer':
      case 'cosplayerperf':
      case 'cosplayerdesfile': return "Seu cadastro foi feito com sucesso!";
      case 'estandista': return "AVISO IMPORTANTE: O preenchimento deste formulário constitui apenas uma MANIFESTAÇÃO DE INTERESSE e inclusão na nossa LISTA DE ESPERA.\n\nRessaltamos que este cadastro NÃO GARANTE reserva de espaço, vaga ou participação no evento. A seleção dos expositores passará por uma curadoria interna baseada na disponibilidade de espaço, mix de produtos e perfil do perfil do evento. Caso haja disponibilidade, a nossa equipa entrará em contacto através dos dados fornecidos abaixo.";
      case 'usinageek': return "Cadastro feito com Sucesso! A gente se vê na Usina Geek";
      case 'imprensa': return "Sua solicitação de credenciamento de imprensa foi enviada. Você receberá uma confirmação oficial por e-mail após o período de curadoria.";
      case 'arena': return "Inscrição na Arena Gamer realizada! Prepare seus periféricos, nos vemos no campo de batalha.";
      case 'becodosartistas': return "Sua inscrição para o Beco dos Artistas foi enviada com sucesso! Fique atento ao WhatsApp e ao Instagram para novidades.";
      default: return `Sua inscrição para o concurso ${activeVisuals.title} foi enviada com sucesso! Fique atento às suas redes sociais e WhatsApp para novidades.`;
    }
  };

  return (
    <div className="relative bg-[#f8f9ff] min-h-screen text-slate-900 pb-20 selection:bg-blue-100 transition-all duration-1000">

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-32 -top-40 h-[30rem] w-[30rem] rounded-full bg-blue-300/30 blur-[130px]" />
        <div className="absolute -right-32 top-1/4 h-[26rem] w-[26rem] rounded-full bg-indigo-300/20 blur-[130px]" />
        <div className="absolute -bottom-40 left-1/3 h-[24rem] w-[24rem] rounded-full bg-sky-300/20 blur-[130px]" />
      </div>

      {/* Success Popup Modal */}
      {submitted && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white border border-slate-200/80 w-full max-w-lg rounded-3xl shadow-2xl shadow-slate-900/10 overflow-hidden p-10 md:p-14 text-center space-y-8 animate-in zoom-in-95 duration-500">
            <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center bg-gradient-to-br ${activeVisuals.color} to-white p-1`}>
              <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                <Check className={`w-10 h-10 ${activeVisuals.textColorClass || 'text-white'}`} />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-3xl font-semibold uppercase tracking-tighter text-slate-900">
                {activeContest === 'estandista' ? 'Aviso Importante' : 'Inscrição Enviada!'}
              </h3>
              <p className="text-slate-900 text-sm font-medium leading-relaxed whitespace-pre-line">
                {getSuccessMessage(activeContest)}
              </p>
            </div>

            {activeContest === 'estandista' && (
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest">
                  ENTRE NO NOSSO GRUPO DE ESTANDISTAS
                </p>
                <a 
                  href="https://chat.whatsapp.com/BeZBIHv9c6FIoQHNVzSIiR"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-4 rounded-lg shadow-xl transition-all active:scale-95 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Entrar no Grupo do WhatsApp
                </a>
              </div>
            )}
            
            <button 
              onClick={() => {
                setSubmitted(false);
                window.location.hash = '';
              }}
              className={`w-full ${activeVisuals.btn} text-white font-semibold py-5 rounded-lg shadow-xl transition-all active:scale-95 uppercase tracking-widest text-xs`}
            >
              {activeContest === 'usinageek' ? 'Finalizar' : (activeContest === 'estandista' ? 'Entendi' : 'Voltar ao Início')}
            </button>
            
            {activeContest !== 'usinageek' && (
              <button 
                onClick={() => {
                  setSubmitted(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-slate-900 hover:text-slate-900 text-xs font-semibold uppercase tracking-[0.2em] transition-colors"
              >
                Fazer outra inscrição
              </button>
            )}
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 pt-20 pb-16 text-center">
        
        {activeContest === 'home' && (
          <div className="flex flex-col items-center mb-12 animate-in fade-in duration-1000">
            <img 
              src={logoGeekzada} 
              alt="Geekzada Logo" 
              className="h-24 md:h-32 object-contain mb-6"
            />
            <a 
              href="https://geekzada.com.br/" 
              className="px-8 py-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-full shadow-sm text-xs font-semibold uppercase tracking-[0.2em] transition-all active:scale-95"
            >
              Voltar ao site
            </a>
          </div>
        )}

        {/* Logo Geekzada no topo de todos os formularios, centralizada */}
        {activeContest !== 'home' && (
          <div className="flex justify-center mb-8 animate-in fade-in duration-500">
            <img
              src={logoGeekzada}
              alt="Geekzada"
              className="w-full max-w-[250px] object-contain"
            />
          </div>
        )}

        {/* Lógica do Título com Logo SEEL para Arena Gamer */}
        {activeContest === 'arena' ? (
          <div className="flex justify-center mb-8 animate-in zoom-in-95 duration-500">
            <img 
              src="https://geekzada.com.br/logo-seel.png" 
              alt="Arena Gamer" 
              className="h-24 sm:h-32 md:h-48 lg:h-56 object-contain"
            />
          </div>
        ) : activeContest !== 'home' ? (
          <h2 className={`text-4xl sm:text-6xl md:text-[7rem] font-semibold bg-clip-text text-transparent bg-gradient-to-b ${activeVisuals.color} to-slate-900 uppercase tracking-tighter mb-8 leading-[0.85] animate-in zoom-in-95 duration-500 break-words`}>
            {activeContest === 'imprensa' ? 'CREDENCIAMENTO IMPRENSA' : activeContest === 'usinageek' ? 'USINA GEEK' : activeContest === 'estandista' ? 'FORMULÁRIO DE PRÉ-INSCRIÇÃO' : activeContest === 'cosplayer' ? 'CONCURSO COSPLAY' : activeContest === 'cosplayerdesfile' ? 'COSPLAYER DESFILE' : activeContest === 'becodosartistas' ? 'BECO DOS ARTISTAS' : `CONCURSO ${activeVisuals.title}`}
          </h2>
        ) : null}

        {activeContest === 'usinageek' && (
          <div className="max-w-2xl mx-auto mb-12 animate-in fade-in duration-1000">
            <p className="text-orange-400 text-lg font-bold mb-2 uppercase tracking-tight">Usina Geek</p>
            <p className="text-slate-900 text-sm font-medium leading-relaxed italic">
              Participe da Usina Geek! Preencha seus dados abaixo para se conectar com a maior comunidade geek da região.
            </p>
          </div>
        )}

        {activeContest === 'estandista' && (
          <div className="max-w-2xl mx-auto mb-12 animate-in fade-in duration-1000">
            <p className="text-orange-400 text-lg font-bold mb-2 uppercase tracking-tight">Geekzada 2026 – Expositores & Alimentação</p>
            <p className="text-slate-900 text-sm font-medium leading-relaxed italic">
              Este formulário é uma pré-inscrição. O envio não garante aprovação. A curadoria busca diversidade de produtos e experiências, evitando duplicidade de stands.
            </p>
          </div>
        )}

        {activeContest === 'arena' ? (
          <div className="flex flex-wrap items-center justify-center gap-4 mb-16 animate-in duration-1000 delay-300">
            <div className="px-6 py-3 bg-white/80 rounded-2xl border border-slate-200 shadow-sm backdrop-blur-sm flex items-center gap-3">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <div className="text-left">
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Data</p>
                <p className="text-sm font-bold">28 DE FEV</p>
              </div>
            </div>
            <div className="px-6 py-3 bg-white/80 rounded-2xl border border-slate-200 shadow-sm backdrop-blur-sm flex items-center gap-3">
              <MapPin className="w-5 h-5 text-cyan-400" />
              <div className="text-left">
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Local</p>
                <p className="text-sm font-bold">ESTÁDIO MANGUEIRÃO</p>
              </div>
            </div>
            <div className="px-6 py-3 bg-white/80 rounded-2xl border border-slate-200 shadow-sm backdrop-blur-sm flex items-center">
              <img 
                src="https://geekzada.com.br/logo_seel_branca.png" 
                alt="SEEL Branca" 
                className="h-10 object-contain"
              />
            </div>
          </div>
        ) : (activeContest === 'imprensa' || activeContest === 'estandista' || activeContest === 'home') ? (
          <div className="mb-16"></div>
        ) : (
          <p className="text-slate-500 max-w-xl mx-auto text-sm md:text-base mb-16 font-medium leading-relaxed italic">
            {activeContest === 'becodosartistas'
              ? 'Envie seu vídeo de apresentação e mostre seu talento no Beco dos Artistas do Geekzada 2026.'
              : '"A glória espera por aqueles que transformam sua paixão em arte."'}
          </p>
        )}
      </div>
      {activeContest !== 'home' && (
        <section className="container mx-auto px-4">
          <div className={`max-w-4xl mx-auto bg-white/90 backdrop-blur border border-slate-200/80 rounded-3xl p-8 md:p-14 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_30px_60px_-30px_rgba(37,99,235,0.35)] transition-all duration-700 relative ${activeVisuals.shadow}`}>
            <form onSubmit={handleSubmit} className="space-y-12 relative z-10">
              {renderFormFields()}
              
              {/* O K-Pop nao tem aceites nem assinatura: a ficha dele termina
                  nos 7 campos acima. */}
              {activeContest !== 'kpop' && activeContest !== 'becodosartistas' && (
              <div className="space-y-6 pt-12 border-t border-slate-200">
                <div className="grid grid-cols-1 gap-4">
                  {activeContest === 'imprensa' ? (
                    <>
                      <label className="flex items-start gap-4 cursor-pointer group p-4 bg-slate-50/70 rounded-2xl border border-slate-200 hover:border-blue-200 hover:bg-white shadow-sm transition-colors text-left">
                        <input required name="responsibility_term" type="checkbox" className="w-5 h-5 rounded-md border-slate-300 bg-white text-blue-600 focus:ring-0 mt-1" />
                        <span className="text-xs text-slate-900 group-hover:text-slate-700 transition-colors leading-relaxed font-medium">Declaro assumir total responsabilidade pelo uso de equipamentos e conduta profissional durante o evento.</span>
                      </label>
                      <label className="flex items-start gap-4 cursor-pointer group p-4 bg-slate-50/70 rounded-2xl border border-slate-200 hover:border-blue-200 hover:bg-white shadow-sm transition-colors text-left">
                        <input required name="image_release" type="checkbox" className="w-5 h-5 rounded-md border-slate-300 bg-white text-blue-600 focus:ring-0 mt-1" />
                        <span className="text-xs text-slate-900 group-hover:text-slate-700 transition-colors leading-relaxed font-medium">Autorizo o uso de minha imagem para fins de divulgação do evento Geekzada 2026.</span>
                      </label>
                    </>
                  ) : (
                    <>
                      <label className="flex items-start gap-4 cursor-pointer group p-4 bg-slate-50/70 rounded-2xl border border-slate-200 hover:border-blue-200 hover:bg-white shadow-sm transition-colors text-left">
                        <input required name="image_release" type="checkbox" className="w-5 h-5 rounded-md border-slate-300 bg-white text-blue-600 focus:ring-0 mt-1" />
                        <span className="text-xs text-slate-900 group-hover:text-slate-700 transition-colors leading-relaxed font-medium">Autorizo o uso de minha imagem para fins de divulgação do evento *</span>
                      </label>
                      <label className="flex items-start gap-4 cursor-pointer group p-4 bg-slate-50/70 rounded-2xl border border-slate-200 hover:border-blue-200 hover:bg-white shadow-sm transition-colors text-left">
                        <input required name="rules_agreement" type="checkbox" className="w-5 h-5 rounded-md border-slate-300 bg-white text-blue-600 focus:ring-0 mt-1" />
                        <span className="text-xs text-slate-900 group-hover:text-slate-700 transition-colors leading-relaxed font-medium">Declaro que li e concordo com o regulamento oficial do evento *</span>
                      </label>
                    </>
                  )}
                </div>
                
                {activeContest !== 'arena' && (
                  <div className="animate-in fade-in slide-in-from-top-2 text-left">
                    <label className={labelStyle}>Assinatura Digital *</label>
                    <input required name="signature" type="text" placeholder="Digite seu nome completo" className={inputStyle} />
                  </div>
                )}
              </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 flex gap-3 animate-in fade-in">
                  <AlertCircle className="shrink-0 w-5 h-5" /> <span className="text-sm font-bold uppercase tracking-tight">{error}</span>
                </div>
              )}
              
              <button disabled={loading} type="submit" className={`w-full ${activeVisuals.btn} hover:scale-[1.02] active:scale-[0.98] text-white font-semibold py-6 rounded-2xl flex items-center justify-center gap-4 transition-all shadow-lg hover:-translate-y-0.5 disabled:opacity-50 uppercase tracking-[0.2em] text-xs`}>
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <>{activeContest === 'arena' ? <Gamepad2 className="w-5 h-5" /> : activeContest === 'imprensa' ? <Mic className="w-5 h-5" /> : activeContest === 'usinageek' ? <Zap className="w-5 h-5" /> : activeContest === 'estandista' ? <Store className="w-5 h-5" /> : <Send className="w-5 h-5" />} Finalizar Cadastro</>}
              </button>
            </form>
          </div>
        </section>
      )}
      <footer className="py-24 text-center mt-20">
        <div className="container mx-auto px-4">
          <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 mx-auto mb-12 rounded-full"></div>
          <p className="text-slate-400 font-semibold tracking-[0.5em] text-xs mb-8 uppercase">WD SOLUÇÕES DIGITAIS 2026</p>
          <div className="flex flex-col items-center gap-4">
            <button onClick={onGoAdmin} className="text-slate-500 hover:text-blue-600 text-xs font-bold uppercase tracking-widest transition-colors">Admin</button>

          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
