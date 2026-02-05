
import React, { useState, useEffect } from 'react';
import { supabase, TABLES } from '../supabaseClient.ts';
import { ContestType } from '../types.ts';
import { 
  Trash2, LogOut, Search, RefreshCw, FileSpreadsheet, Layers, 
  Music, Wand2, Camera, Link, Copy, Check, ExternalLink, 
  Gamepad2, X, Eye, Calendar, User, Phone, Mail, Info, 
  Share2, TriangleAlert 
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface AdminDashboardProps {
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<ContestType>('kpop');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const contestConfig: Record<ContestType, { label: string; icon: any; colorClass: string; bgColorClass: string; textColorClass: string; hash: string }> = {
    kpop: { label: 'K-Pop', icon: Music, colorClass: 'bg-pink-600', bgColorClass: 'bg-pink-500/10', textColorClass: 'text-pink-500', hash: '' },
    cospobre: { label: 'Cospobre', icon: Wand2, colorClass: 'bg-green-600', bgColorClass: 'bg-green-500/10', textColorClass: 'text-green-500', hash: '#cospobre' },
    cosplayer: { label: 'Cosplayer', icon: Camera, colorClass: 'bg-purple-600', bgColorClass: 'bg-purple-500/10', textColorClass: 'text-purple-500', hash: '#cosplayer' },
    arena: { label: 'Arena Gamer', icon: Gamepad2, colorClass: 'bg-cyan-600', bgColorClass: 'bg-cyan-500/10', textColorClass: 'text-cyan-500', hash: '#arena' }
  };

  const menuItems = (Object.keys(contestConfig) as ContestType[]).map(key => ({
    id: key,
    ...contestConfig[key]
  }));

  const fetchData = async () => {
    setLoading(true);
    const tableName = activeTab === 'kpop' ? TABLES.KPOP : 
                     activeTab === 'cospobre' ? TABLES.COSPOBRE : 
                     activeTab === 'arena' ? TABLES.ARENA :
                     TABLES.COSPLAYER;
    try {
      const { data: result, error } = await supabase.from(tableName).select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setData(result || []);
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar dados do banco.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const deleteOne = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Impede que o clique na linha da tabela abra o modal
    if (!id) return;
    
    const confirmMessage = `Tem certeza que deseja excluir permanentemente este registro?`;
    if (!window.confirm(confirmMessage)) return;
    
    const tableName = activeTab === 'kpop' ? TABLES.KPOP : 
                     activeTab === 'cospobre' ? TABLES.COSPOBRE : 
                     activeTab === 'arena' ? TABLES.ARENA :
                     TABLES.COSPLAYER;
    
    try {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      
      if (error) throw error;
      
      // Remove do estado local para atualização instantânea
      setData(prev => prev.filter(item => item.id !== id));
      
      // Se o item estiver aberto no modal, fecha o modal
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
    } catch (err: any) {
      console.error("Erro ao deletar:", err);
      alert('Não foi possível excluir o registro: ' + (err.message || 'Erro desconhecido'));
    }
  };

  const deleteAll = async () => {
    if (data.length === 0) return alert('Não há registros para deletar.');
    
    const count = data.length;
    const confirmation = window.confirm(`⚠️ ALERTA CRÍTICO: Você está prestes a deletar TODOS os ${count} registros da categoria ${activeTab.toUpperCase()}!\n\nEsta ação não pode ser desfeita. Deseja prosseguir com a exclusão total?`);
    
    if (!confirmation) return;

    setLoading(true);
    const tableName = activeTab === 'kpop' ? TABLES.KPOP : 
                     activeTab === 'cospobre' ? TABLES.COSPOBRE : 
                     activeTab === 'arena' ? TABLES.ARENA :
                     TABLES.COSPLAYER;
    
    try {
      // Deleta todos os registros da tabela atual
      const { error } = await supabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      
      setData([]);
      setSelectedItem(null);
      alert('Todos os registros desta categoria foram apagados.');
    } catch (err: any) {
      console.error(err);
      alert('Erro ao deletar registros: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = () => {
    if (data.length === 0) return alert('Não há dados para exportar.');
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab.toUpperCase());
    XLSX.writeFile(wb, `Inscricoes_${activeTab}_2026.xlsx`);
  };

  const copyFormLink = (hash: string, id: string) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const fullUrl = baseUrl + hash;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const renderMediaPreview = (key: string, value: any) => {
    if (!value || typeof value !== 'string' || !value.startsWith('http')) return null;

    const url = value.trim();
    const isVideoField = key.toLowerCase().includes('video');
    const isPhotoField = key.toLowerCase().includes('photo') || key.toLowerCase().includes('foto') || key.toLowerCase().includes('link');

    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^\/\?]+)/);

    if (isVideoField) {
      if (ytMatch && ytMatch[1]) {
        return (
          <div className="mt-2 aspect-video rounded-xl overflow-hidden border border-white/10 bg-black shadow-lg">
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${ytMatch[1]}`}
              title="YouTube Preview"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        );
      }
      if (driveMatch && driveMatch[1]) {
        return (
          <div className="mt-2 aspect-video rounded-xl overflow-hidden border border-white/10 bg-black shadow-lg">
            <iframe
              className="w-full h-full"
              src={`https://drive.google.com/file/d/${driveMatch[1]}/preview`}
              allow="autoplay"
            ></iframe>
          </div>
        );
      }
    }

    if (isPhotoField) {
      if (driveMatch && driveMatch[1]) {
        return (
          <div className="mt-2 rounded-xl overflow-hidden border border-white/10 bg-black/20 shadow-lg">
            <img 
              src={`https://lh3.googleusercontent.com/d/${driveMatch[1]}=s1000`} 
              alt="Drive Preview" 
              className="w-full h-auto max-h-64 object-contain"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          </div>
        );
      }

      const isDirectImage = /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(url);
      if (isDirectImage) {
        return (
          <div className="mt-2 rounded-xl overflow-hidden border border-white/10 bg-black/20 shadow-lg">
            <img 
              src={url} 
              alt="Photo Preview" 
              className="w-full h-auto max-h-64 object-contain"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          </div>
        );
      }
    }

    return null;
  };

  const filtered = data.filter(item => 
    JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20">
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 w-full max-w-2xl max-h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className={`p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r ${contestConfig[activeTab].colorClass}/10 to-transparent`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${contestConfig[activeTab].bgColorClass} ${contestConfig[activeTab].textColorClass}`}>
                   <Info className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white uppercase tracking-tight">Detalhes da Inscrição</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{selectedItem.id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                {Object.entries(selectedItem).map(([key, value]) => {
                  if (key === 'id' || key === 'created_at') return null;
                  return (
                    <div key={key} className="space-y-1">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{key.replace(/_/g, ' ')}</p>
                      <div className="text-sm font-medium text-slate-200 bg-white/5 p-3 rounded-xl border border-white/5 break-words">
                        {typeof value === 'boolean' ? (value ? '✅ Sim' : '❌ Não') : (value?.toString() || '-')}
                        {key.includes('video') || key.includes('photo') || key.includes('link') ? (
                          <div className="space-y-3 mt-1">
                            {value && value.toString().startsWith('http') && (
                              <a href={value.toString()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 hover:underline transition-all font-bold text-xs">
                                <ExternalLink className="w-3.5 h-3.5" /> ABRIR LINK
                              </a>
                            )}
                            {renderMediaPreview(key, value)}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-8 pt-6 border-t border-white/5 text-right">
                 <p className="text-[10px] text-slate-600 font-bold">INSCRITO EM: {new Date(selectedItem.created_at).toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="bg-slate-900 border-b border-white/5 p-4 sticky top-0 z-50 shadow-xl">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Layers className="text-pink-500 w-6 h-6" />
            <h1 className="font-black text-xl uppercase tracking-tighter">Admin Geekzada</h1>
          </div>
          <button 
            onClick={onLogout} 
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-red-600/20 hover:text-red-400 text-slate-400 transition-all border border-white/5"
          >
            <span className="text-sm font-bold">SAIR</span>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-10 animate-in slide-in-from-top-4 duration-500 bg-slate-900/30 p-6 rounded-[2rem] border border-white/5 shadow-2xl">
           <div className="flex items-center gap-3 mb-6">
              <Link className="w-4 h-4 text-pink-500" />
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Links Diretos para Divulgação</p>
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {menuItems.map((item) => (
                <div key={`link-${item.id}`} className="bg-slate-900/80 border border-white/5 p-4 rounded-2xl flex items-center justify-between group hover:border-pink-500/30 transition-all shadow-lg hover:shadow-pink-500/5">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${item.bgColorClass} ${item.textColorClass} group-hover:scale-110 transition-transform`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black uppercase text-slate-100 tracking-tight">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <a href={`${window.location.origin}${window.location.pathname}${item.hash}`} target="_blank" rel="noreferrer" className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors" title="Abrir Formulário">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button 
                      onClick={() => copyFormLink(item.hash, item.id)} 
                      className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors" 
                      title="Copiar Link"
                    >
                      {copiedLink === item.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
           </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 mb-8 items-center justify-between">
          <div className="flex flex-wrap justify-center items-center bg-slate-900 p-1.5 rounded-full border border-white/5 shadow-inner">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-5 md:px-7 py-2.5 rounded-full text-xs md:text-sm font-black transition-all ${
                    isActive 
                      ? `${item.colorClass} text-white shadow-xl scale-105` 
                      : 'text-slate-500 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label.toUpperCase()}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2 w-full lg:w-auto justify-center">
            <div className="relative flex-1 min-w-[200px] lg:w-64">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input 
                placeholder="Filtrar registros..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-pink-500/50"
              />
            </div>
            
            <div className="flex gap-2">
                <button onClick={exportExcel} className="bg-green-600 hover:bg-green-500 px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 text-white shadow-lg shadow-green-600/20 active:scale-95">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">Excel</span>
                </button>
                <button onClick={fetchData} className="bg-slate-800 hover:bg-slate-700 p-3 rounded-xl transition-all shadow-lg active:scale-95" title="Atualizar">
                  <RefreshCw className={`w-4 h-4 text-slate-300 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button 
                  onClick={deleteAll} 
                  className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg active:scale-95" 
                  title="DELETAR TUDO NESTA CATEGORIA"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-widest">Deletar Tudo</span>
                </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 text-slate-500 text-[10px] uppercase font-black tracking-[0.2em]">
                  <th className="px-8 py-5">Nome / Grupo</th>
                  <th className="px-8 py-5">{activeTab === 'arena' ? 'Bairro' : 'Categoria'}</th>
                  <th className="px-8 py-5">WhatsApp</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={5} className="p-32 text-center"><RefreshCw className="animate-spin mx-auto w-10 h-10 text-pink-500" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="p-24 text-center text-slate-500 font-bold uppercase tracking-widest opacity-50">Nenhuma inscrição em {activeTab}</td></tr>
                ) : filtered.map(item => (
                  <tr 
                    key={item.id} 
                    onClick={() => setSelectedItem(item)}
                    className="hover:bg-white/[0.03] cursor-pointer transition-all group"
                  >
                    <td className="px-8 py-5">
                      <div className="font-black text-white group-hover:text-pink-400 transition-colors uppercase tracking-tight">
                        {item.group_name || item.cosplayer_name || item.full_name || item.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                        {item.character_name || item.song_artist || item.email || '-'}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`text-[10px] font-black px-3 py-1.5 rounded-full border ${contestConfig[activeTab].bgColorClass} ${contestConfig[activeTab].textColorClass} border-transparent uppercase`}>
                        {item.category || item.bairro}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                       <span className="text-sm font-mono text-slate-400 font-bold">
                         {item.whatsapp}
                       </span>
                    </td>
                    <td className="px-8 py-5">
                       <div className="flex items-center gap-2 text-[10px] font-black uppercase text-green-500">
                         <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                         Recebida
                       </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button className="p-2 rounded-xl text-slate-500 hover:bg-white/5 hover:text-white transition-all">
                          <Eye className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={(e) => deleteOne(e, item.id)} 
                          className="p-2 rounded-xl text-slate-500 hover:bg-red-500/10 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <footer className="py-12 text-center text-slate-800 text-[10px] border-t border-white/5 mt-10 tracking-[0.5em] font-black uppercase">
        WD SOLUÇÕES DIGITAIS 2026
      </footer>
    </div>
  );
};

export default AdminDashboard;
