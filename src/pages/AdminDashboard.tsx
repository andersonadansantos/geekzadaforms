
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, TABLES } from '../supabaseClient';
import { ContestType } from '../types';
import { 
  Trash2, LogOut, Search, RefreshCw, FileSpreadsheet, Layers, 
  Music, Wand2, Camera, Link, Copy, Check, ExternalLink, 
  Gamepad2, X, Eye, Calendar, User, Phone, Mail, Info, 
  Share2, TriangleAlert, Mic, ChevronLeft, ChevronRight, Store, AlertCircle
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
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({
    kpop: 0, cosplayerperf: 0, arena: 0, imprensa: 0, estandista: 0, usinageek: 0
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100; // Alterado para 100 conforme solicitado

  const contestConfig: Record<Exclude<ContestType, 'home' | 'cosplayer'>, { label: string; icon: any; colorClass: string; bgColorClass: string; textColorClass: string; hash: string }> = {
    kpop: { label: 'K-Pop', icon: Music, colorClass: 'bg-pink-600', bgColorClass: 'bg-pink-500/10', textColorClass: 'text-pink-500', hash: '#kpop' },
    cosplayerperf: { label: 'CosplayerPerf.', icon: Camera, colorClass: 'bg-purple-600', bgColorClass: 'bg-purple-500/10', textColorClass: 'text-purple-500', hash: '#cosplayerperformance' },
    arena: { label: 'Arena Gamer', icon: Gamepad2, colorClass: 'bg-cyan-600', bgColorClass: 'bg-cyan-500/10', textColorClass: 'text-cyan-500', hash: '#arena' },
    imprensa: { label: 'Imprensa', icon: Mic, colorClass: 'bg-indigo-600', bgColorClass: 'bg-indigo-500/10', textColorClass: 'text-indigo-500', hash: '#imprensa' },
    estandista: { label: 'Expositores', icon: Store, colorClass: 'bg-orange-600', bgColorClass: 'bg-orange-500/10', textColorClass: 'text-orange-500', hash: '#estandista' },
    usinageek: { label: 'Usina Geek', icon: Store, colorClass: 'bg-[#83E509]', bgColorClass: 'bg-[#83E509]/10', textColorClass: 'text-[#83E509]', hash: '#usinageek' }
  };

  const getTableName = useCallback((tab: ContestType) => {
    switch (tab) {
      case 'kpop': return TABLES.KPOP;
      case 'cosplayer': return TABLES.COSPLAYER;
      case 'cosplayerperf': return TABLES.COSPLAYER;
      case 'arena': return TABLES.ARENA;
      case 'imprensa': return TABLES.IMPRENSA;
      case 'estandista': return TABLES.ESTANDISTA;
      case 'usinageek': return TABLES.USINAGEEK;
      default: return TABLES.KPOP;
    }
  }, []);

  const loadAllCounts = useCallback(async () => {
    const types = Object.keys(contestConfig) as ContestType[];
    const newCounts = { ...counts };
    
    try {
      await Promise.all(types.map(async (type) => {
        const { count, error } = await supabase
          .from(getTableName(type))
          .select('*', { count: 'exact', head: true });
        if (!error) newCounts[type] = count || 0;
      }));
      setCounts(newCounts);
    } catch (e) {
      console.error("Erro ao sincronizar contadores:", e);
    }
  }, [getTableName]);

  const fetchData = useCallback(async (tabToFetch: ContestType = activeTab) => {
    setLoading(true);
    setFetchError(null);
    const tableName = getTableName(tabToFetch);
    
    try {
      let { data: result, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        const { data: fallbackResult, error: fallbackError } = await supabase
          .from(tableName)
          .select('*');
        
        if (fallbackError) throw fallbackError;
        setData(fallbackResult || []);
      } else {
        setData(result || []);
      }
      
      loadAllCounts();
      setCurrentPage(1);
    } catch (err: any) {
      console.error("Erro crítico de conexão:", err);
      setFetchError(err.message || 'Falha na conexão com o banco de dados.');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, getTableName, loadAllCounts]);

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab, fetchData]);

  const deleteOne = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!id) return;
    if (!window.confirm(`Excluir permanentemente este registro?`)) return;
    
    try {
      const { error } = await supabase.from(getTableName(activeTab)).delete().eq('id', id);
      if (error) throw error;
      
      setData(prev => prev.filter(item => item.id !== id));
      setCounts(prev => ({ ...prev, [activeTab]: Math.max(0, prev[activeTab] - 1) }));
    } catch (err: any) {
      alert('Erro ao excluir registro: ' + err.message);
    }
  };

  const deleteAll = async () => {
    if (data.length === 0) return alert('Sem registros para excluir.');
    if (!window.confirm(`⚠️ AVISO: Isso excluirá TODOS os registros desta aba. Prosseguir?`)) return;

    try {
      const { error } = await supabase.from(getTableName(activeTab)).delete().neq('whatsapp', '000000');
      if (error) throw error;
      fetchData(activeTab);
    } catch (err: any) {
      alert('Erro ao limpar base de dados: ' + err.message);
    }
  };

  const exportExcel = () => {
    if (data.length === 0) return alert('Não há dados para exportar.');
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab.toUpperCase());
    XLSX.writeFile(wb, `Geekzada_Relatorio_${activeTab}.xlsx`);
  };

  const copyFormLink = (hash: string, id: string) => {
    const fullUrl = window.location.origin + window.location.pathname + hash;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const s = searchTerm.toLowerCase();
    return data.filter(item => 
      Object.values(item).some(v => String(v).toLowerCase().includes(s))
    );
  }, [data, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const handlePrevPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
  const handleNextPage = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20 selection:bg-[#83E509]/30">
      {/* Modal de Detalhes */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
          <div className="bg-slate-900 border border-white/10 w-full max-w-2xl max-h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className={`p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r ${contestConfig[activeTab].colorClass}/10 to-transparent`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${contestConfig[activeTab].bgColorClass} ${contestConfig[activeTab].textColorClass}`}><Info className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-black text-white uppercase tracking-tight">Ficha de Inscrição</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{activeTab.toUpperCase()}</p>
                </div>
              </div>
              <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <div className="overflow-y-auto p-8 custom-scrollbar space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(selectedItem).map(([key, value]) => {
                  if (key === 'id' || key === 'created_at') return null;
                  return (
                    <div key={key} className="space-y-1">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{key.replace(/_/g, ' ')}</p>
                      <div className="text-sm font-medium text-slate-200 bg-white/5 p-3 rounded-xl border border-white/5 break-words">
                        {typeof value === 'boolean' ? (value ? '✅ Sim' : '❌ Não') : (String(value || '-'))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="bg-slate-900 border-b border-white/5 p-4 sticky top-0 z-50 shadow-xl">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Layers className="text-[#83E509] w-6 h-6" />
            <h1 className="font-black text-xl uppercase tracking-tighter">Painel de Cadastro Geekzada</h1>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-400 border border-white/5 hover:bg-red-600/20 transition-all">
            <span className="text-sm font-bold uppercase tracking-widest">Sair</span><LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {/* Resumo Estatístico */}
        <div className="mb-10 bg-slate-900/30 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl backdrop-blur-md">
           <div className="flex items-center justify-between mb-8">
             <div className="flex items-center gap-3"><Link className="w-4 h-4 text-[#83E509]" /><p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Status das Inscrições 2026</p></div>
             <button onClick={() => fetchData(activeTab)} className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar Base
             </button>
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
              {(Object.keys(contestConfig) as ContestType[]).map((type) => {
                const item = contestConfig[type];
                return (
                  <div key={type} onClick={() => setActiveTab(type)} className={`bg-slate-900/60 border ${activeTab === type ? 'border-[#83E509] shadow-[0_0_20px_rgba(131,229,9,0.15)]' : 'border-white/5'} p-6 rounded-[2rem] flex flex-col gap-5 group hover:border-[#83E509]/30 cursor-pointer hover:bg-slate-900/80 transition-all`}>
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-2xl shrink-0 ${item.bgColorClass} ${item.textColorClass}`}><item.icon className="w-5 h-5" /></div>
                      <button onClick={(e) => { e.stopPropagation(); copyFormLink(item.hash, type); }} className="p-2 hover:bg-white/10 rounded-xl text-slate-500 hover:text-white transition-colors">
                        {copiedLink === type ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.15em] block">{item.label}</span>
                      <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-black ${item.textColorClass} tracking-tighter`}>{counts[type] || 0}</span>
                        <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest italic">Inscritos</span>
                      </div>
                    </div>
                  </div>
                );
              })}
           </div>
        </div>

        {/* Barra de Busca e Ações */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8 items-center justify-between">
          <div className="flex flex-wrap justify-center items-center bg-slate-900 p-1.5 rounded-full border border-white/5 shadow-inner">
            {(Object.keys(contestConfig) as ContestType[]).map((type) => (
              <button key={type} onClick={() => setActiveTab(type)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black transition-all ${activeTab === type ? `${contestConfig[type].colorClass} text-white shadow-lg` : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
                {React.createElement(contestConfig[type].icon, { className: "w-3.5 h-3.5" })}<span>{contestConfig[type].label.toUpperCase()}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 w-full lg:w-auto justify-center">
            <div className="relative flex-1 min-w-[200px] lg:w-64">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input placeholder="Filtrar por nome, email..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full bg-slate-900 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-white/20" />
            </div>
            <button onClick={exportExcel} className="bg-green-600 hover:bg-green-500 px-4 py-2.5 rounded-xl flex items-center gap-2 text-white font-black uppercase text-xs shadow-lg transition-all"><FileSpreadsheet className="w-4 h-4" />Exportar Excel</button>
            <button onClick={deleteAll} className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 px-4 py-2.5 rounded-xl flex items-center gap-2 font-black uppercase text-xs transition-all"><Trash2 className="w-4 h-4" />Limpar Tabela</button>
          </div>
        </div>

        {fetchError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-500 font-bold uppercase text-[10px] tracking-widest">
            <AlertCircle className="w-4 h-4" /> Falha: {fetchError}
          </div>
        )}

        {/* Tabela de Dados */}
        <div className="bg-slate-900/50 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 text-slate-500 text-[10px] uppercase font-black tracking-[0.2em]">
                  <th className="px-8 py-5">Nome / Identificação</th>
                  <th className="px-8 py-5">
                    {activeTab === 'imprensa' ? 'Mídia' : activeTab === 'estandista' ? 'Empresa' : activeTab === 'usinageek' ? 'Identificação' : 'Categoria'}
                  </th>
                  <th className="px-8 py-5">WhatsApp</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={5} className="p-32 text-center"><RefreshCw className="animate-spin mx-auto w-10 h-10 text-[#83E509]" /></td></tr>
                ) : paginatedData.length === 0 ? (
                  <tr><td colSpan={5} className="p-24 text-center text-slate-500 font-bold uppercase tracking-widest opacity-50 italic">Sem registros para exibir.</td></tr>
                ) : paginatedData.map(item => (
                  <tr key={item.id} onClick={() => setSelectedItem(item)} className="hover:bg-white/[0.03] cursor-pointer transition-all group">
                    <td className="px-8 py-5">
                      <div className="font-black text-white group-hover:text-[#83E509] transition-colors uppercase tracking-tight">
                        {activeTab === 'imprensa' ? item.full_name : 
                         activeTab === 'estandista' ? item.company_name : 
                         (item.group_name || item.cosplayer_name || item.full_name || item.name || 'N/A')}
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                        {activeTab === 'imprensa' ? item.role : 
                         activeTab === 'estandista' ? item.document : 
                         (item.character_name_origin || item.song_artist || item.email || '-')}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`text-[10px] font-black px-3 py-1.5 rounded-full border ${contestConfig[activeTab].bgColorClass} ${contestConfig[activeTab].textColorClass} border-transparent uppercase`}>
                        {activeTab === 'imprensa' ? item.media_outlet : 
                         activeTab === 'estandista' ? item.category : 
                         (item.identification || item.category || item.bairro || 'Geral')}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm font-mono font-bold text-slate-400">{item.phone || item.whatsapp || '-'}</td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase text-green-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                        Ativo
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                          <Eye className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={(e) => deleteOne(e, item.id)} 
                          className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
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
          
          {/* Controles de Paginação */}
          <div className="bg-white/[0.02] px-8 py-6 flex flex-col sm:flex-row items-center justify-between border-t border-white/5 gap-4">
            <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
              Exibindo <span className="text-slate-300">{paginatedData.length}</span> de <span className="text-slate-300">{filteredData.length}</span> registros
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                disabled={currentPage === 1 || loading}
                onClick={handlePrevPage}
                className="p-2 rounded-xl bg-slate-800 border border-white/5 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-xl border border-white/5">
                <span className="text-xs font-black text-[#83E509]">{currentPage}</span>
                <span className="text-xs font-black text-slate-600">/</span>
                <span className="text-xs font-black text-slate-400">{totalPages || 1}</span>
              </div>
              
              <button 
                disabled={currentPage >= totalPages || loading}
                onClick={handleNextPage}
                className="p-2 rounded-xl bg-slate-800 border border-white/5 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </main>
      <footer className="py-12 text-center text-slate-800 text-[10px] font-black uppercase tracking-[0.5em] opacity-30">
        WD SOLUÇÕES DIGITAIS 2026
      </footer>
    </div>
  );
};

export default AdminDashboard;
