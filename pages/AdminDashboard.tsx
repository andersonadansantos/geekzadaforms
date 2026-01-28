
import React, { useState, useEffect } from 'react';
import { supabase, TABLES } from '../supabaseClient';
import { ContestType } from '../types';
import { Trash2, LogOut, Search, RefreshCw, FileSpreadsheet, Layers, Music, Wand2, Camera, Link, Copy, Check, ExternalLink, Gamepad2 } from 'lucide-react';
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

  // Mapeamento estático para evitar problemas com JIT do Tailwind
  const contestConfig: Record<ContestType, { label: string; icon: any; colorClass: string; bgColorClass: string; textColorClass: string }> = {
    kpop: { label: 'K-Pop', icon: Music, colorClass: 'bg-pink-600', bgColorClass: 'bg-pink-500/10', textColorClass: 'text-pink-500' },
    cospobre: { label: 'Cospobre', icon: Wand2, colorClass: 'bg-green-600', bgColorClass: 'bg-green-500/10', textColorClass: 'text-green-500' },
    cosplayer: { label: 'Cosplayer', icon: Camera, colorClass: 'bg-purple-600', bgColorClass: 'bg-purple-500/10', textColorClass: 'text-purple-500' },
    arena: { label: 'Arena Gamer', icon: Gamepad2, colorClass: 'bg-cyan-600', bgColorClass: 'bg-cyan-500/10', textColorClass: 'text-cyan-500' }
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

  const deleteOne = async (id: string) => {
    if (!window.confirm('Excluir este registro permanentemente?')) return;
    const tableName = activeTab === 'kpop' ? TABLES.KPOP : activeTab === 'cospobre' ? TABLES.COSPOBRE : activeTab === 'arena' ? TABLES.ARENA : TABLES.COSPLAYER;
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (!error) setData(prev => prev.filter(item => item.id !== id));
  };

  const deleteAll = async () => {
    if (!window.confirm(`ATENÇÃO: Isso excluirá TODOS os ${data.length} registros de ${activeTab.toUpperCase()}. Continuar?`)) return;
    const tableName = activeTab === 'kpop' ? TABLES.KPOP : activeTab === 'cospobre' ? TABLES.COSPOBRE : activeTab === 'arena' ? TABLES.ARENA : TABLES.COSPLAYER;
    const { error } = await supabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (!error) setData([]);
  };

  const exportExcel = () => {
    if (data.length === 0) return alert('Não há dados para exportar.');
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab.toUpperCase());
    XLSX.writeFile(wb, `Inscricoes_${activeTab}_2026.xlsx`);
  };

  const handleCopyLink = (type: ContestType) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const hash = type === 'kpop' ? '' : `#${type}`;
    const fullUrl = baseUrl + (baseUrl.endsWith('/') ? '' : '/') + hash;
    
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedLink(type);
      setTimeout(() => setCopiedLink(null), 2000);
    });
  };

  const filtered = data.filter(item => 
    JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20">
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
        
        {/* Seção de Links de Inscrição */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-6 text-slate-400">
            <Link className="w-4 h-4" />
            <h2 className="text-xs font-bold uppercase tracking-[0.2em]">Links Rápidos de Inscrição</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {menuItems.map((item) => {
              const hash = item.id === 'kpop' ? '' : `#${item.id}`;
              const fullUrl = window.location.origin + window.location.pathname + hash;
              const Icon = item.icon;
              return (
                <div key={`link-${item.id}`} className="bg-slate-900/50 border border-white/5 rounded-xl p-4 flex flex-col gap-3 group hover:border-white/10 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${item.bgColorClass} ${item.textColorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-white uppercase tracking-tight">{item.label}</span>
                    </div>
                    <a href={hash || '/'} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-white transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <div className="bg-slate-950/50 rounded-lg p-2 flex items-center justify-between gap-2 border border-white/5">
                    <span className="text-[10px] text-slate-500 truncate font-mono">{fullUrl}</span>
                    <button 
                      onClick={() => handleCopyLink(item.id)}
                      className={`p-1.5 rounded transition-all ${copiedLink === item.id ? 'text-green-500 bg-green-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                      {copiedLink === item.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 mb-8 items-center justify-between pt-8 border-t border-white/5">
          {/* Seletor de Tabelas */}
          <div className="flex flex-wrap justify-center items-center bg-slate-900 p-1 rounded-full border border-white/5 shadow-inner">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-bold transition-all ${
                    isActive 
                      ? `${item.colorClass} text-white shadow-lg` 
                      : 'text-slate-500 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">{item.label.toUpperCase()}</span>
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input 
                placeholder="Buscar em qualquer campo..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-white/5 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-1 focus:ring-pink-500"
              />
            </div>
            <button onClick={exportExcel} className="bg-green-600 hover:bg-green-700 p-2.5 rounded-lg transition-colors flex items-center gap-2" title="Exportar para Excel">
              <FileSpreadsheet className="w-5 h-5" />
            </button>
            <button onClick={deleteAll} className="bg-red-600 hover:bg-red-700 p-2.5 rounded-lg transition-colors flex items-center gap-2" title="Excluir Todos os Registros">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 text-slate-400 text-[10px] uppercase font-bold tracking-widest">
                  <th className="px-6 py-4">Inscrito / Grupo</th>
                  <th className="px-6 py-4">{activeTab === 'arena' ? 'Bairro' : 'Categoria'}</th>
                  <th className="px-6 py-4">{activeTab === 'arena' ? 'Identificação' : 'WhatsApp'}</th>
                  <th className="px-6 py-4">Data Inscrição</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={5} className="p-32 text-center"><RefreshCw className="animate-spin mx-auto w-12 h-12 text-pink-500" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="p-20 text-center text-slate-500 font-medium italic">Nenhum registro encontrado para {activeTab}.</td></tr>
                ) : filtered.map(item => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white group-hover:text-pink-400 transition-colors">
                        {item.group_name || item.cosplayer_name || item.full_name || item.name}
                      </div>
                      <div className="text-xs text-slate-500 font-medium truncate max-w-[200px]">
                        {item.character_name || item.song_artist || item.email || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs px-2 py-1 rounded bg-slate-800 border border-white/5 text-slate-300 capitalize whitespace-nowrap">
                        {item.category || item.bairro}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                       <span className={`text-sm ${activeTab === 'arena' ? 'text-cyan-400' : 'font-mono text-slate-300'}`}>
                         {activeTab === 'arena' ? item.identification : item.whatsapp}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => deleteOne(item.id)} 
                        className="p-2 rounded-lg text-slate-600 hover:bg-red-500/10 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <footer className="py-8 text-center text-slate-700 text-xs border-t border-white/5 mt-10 tracking-widest font-bold">
        WD SOLUÇÕES DIGITAIS LTDA 2026
      </footer>
    </div>
  );
};

export default AdminDashboard;
