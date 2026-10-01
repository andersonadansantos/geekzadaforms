
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api, AdminUser, AdminAccess } from '../apiClient';
import { ContestType } from '../types';
import { 
  Trash2, LogOut, Search, RefreshCw, FileSpreadsheet, Layers, 
  Music, Wand2, Camera, Link, Copy, Check, ExternalLink, 
  Gamepad2, X, Eye, Calendar, User, Phone, Mail, Info, 
  Share2, TriangleAlert, Mic, ChevronLeft, ChevronRight, Store, AlertCircle,
  ShieldCheck, Crown, KeyRound, Users, UserX, UserCheck, ClipboardCopy, Ban
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface AdminDashboardProps {
  user: AdminUser | null;
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
  // Admin de categoria so enxerga a dele; o superadmin enxerga todas.
  const isSuper = user?.is_superadmin ?? false;
  const myForm = (user?.form_id ?? 'kpop') as ContestType;

  const [activeTab, setActiveTab] = useState<ContestType>(myForm);

  // --- aba de acessos (so superadmin) ---
  const [verAcessos, setVerAcessos] = useState(false);
  const [acessos, setAcessos] = useState<AdminAccess[]>([]);
  const [acessosLoading, setAcessosLoading] = useState(false);
  const [alvoSenha, setAlvoSenha] = useState<AdminAccess | null>(null);
  const [senhaDigitada, setSenhaDigitada] = useState('');
  const [senhaGerada, setSenhaGerada] = useState<string | null>(null);
  const [senhaDefinida, setSenhaDefinida] = useState(false);
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState('');
  const [copiado, setCopiado] = useState(false);
  // quais linhas estao com a senha revelada
  const [reveladas, setReveladas] = useState<Record<number, boolean>>({});
  // qual senha acabou de ser copiada, para piscar o icone
  const [senhaCopiada, setSenhaCopiada] = useState<number | null>(null);
  const [todosCopiados, setTodosCopiados] = useState(false);
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

  // Categorias que este usuario pode abrir. O admin de categoria fica
  // preso na dele: o servidor tambem recusa as outras, mas esconder aqui
  // evita o usuario clicar em algo que vai dar erro.
  const visibleForms = useMemo<ContestType[]>(
    () => (isSuper ? (Object.keys(contestConfig) as ContestType[]) : [myForm]),
    [isSuper, myForm],
  );

  // Se a sessao chegar com usuario de outra categoria, corrige a aba.
  useEffect(() => {
    if (!isSuper && activeTab !== myForm) {
      setActiveTab(myForm);
    }
  }, [isSuper, myForm, activeTab]);

  // Admin de categoria nunca deve cair nesta view.
  useEffect(() => {
    if (!isSuper && verAcessos) {
      setVerAcessos(false);
    }
  }, [isSuper, verAcessos]);

  const loadAcessos = useCallback(async () => {
    if (!isSuper) return;
    setAcessosLoading(true);
    try {
      const { users } = await api.users();
      setAcessos(users || []);
    } catch (err: any) {
      setErroSenha(err?.message || 'Falha ao carregar os acessos.');
    } finally {
      setAcessosLoading(false);
    }
  }, [isSuper]);

  useEffect(() => {
    if (verAcessos) {
      loadAcessos();
    }
  }, [verAcessos, loadAcessos]);

  const abrirTrocaSenha = (alvo: AdminAccess) => {
    setAlvoSenha(alvo);
    setSenhaDigitada('');
    setSenhaGerada(null);
    setSenhaDefinida(false);
    setErroSenha('');
    setCopiado(false);
  };

  /**
   * Salva a nova senha. Sem texto digitado, pede ao servidor para gerar
   * uma senha forte e devolve-la para mostrarmos uma unica vez.
   */
  const salvarSenha = async () => {
    if (!alvoSenha || salvandoSenha) return;
    setErroSenha('');
    setSalvandoSenha(true);

    try {
      const digitada = senhaDigitada.trim();
      const { senha } = await api.setPassword(alvoSenha.id, digitada || undefined);
      // so vem preenchida quando o servidor gerou
      setSenhaGerada(senha);
      // senha digitada pelo superadmin: nao ha nada novo a mostrar, mas
      // precisamos confirmar que a troca foi feita
      setSenhaDefinida(digitada.length > 0);
      setSenhaDigitada('');
      loadAcessos();
    } catch (err: any) {
      setErroSenha(err?.message || 'Falha ao trocar a senha.');
    } finally {
      setSalvandoSenha(false);
    }
  };

  const alternarAtivo = async (alvo: AdminAccess) => {
    if (!window.confirm(
      alvo.is_active
        ? `Desativar o acesso "${alvo.username}"? Ele não vai mais conseguir entrar.`
        : `Reativar o acesso "${alvo.username}"?`,
    )) {
      return;
    }

    try {
      await api.toggleActive(alvo.id);
      loadAcessos();
    } catch (err: any) {
      alert('Falha ao alterar o acesso: ' + (err?.message || ''));
    }
  };

  const copiarSenha = () => {
    if (!senhaGerada) return;
    navigator.clipboard.writeText(senhaGerada);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const alternarRevelada = (id: number) => {
    setReveladas(prev => ({ ...prev, [id]: !prev[id] }));
  };

  /** Copia usuario e senha de um acesso, no formato "usuario: senha". */
  const copiarCredencial = async (a: AdminAccess) => {
    if (!a.senha) return;
    const texto = `${a.username}: ${a.senha}`;
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      // clipboard bloqueado (http sem https): usa o truque do textarea
      const ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setSenhaCopiada(a.id);
    setTimeout(() => setSenhaCopiada(null), 2000);
  };

  /** Copia todos os acessos de uma vez, como tabela. */
  const copiarTodos = async () => {
    const linhas = acessos
      .filter(a => a.senha)
      .map(a => `${a.username}\t${a.senha}\t${a.form_label || 'todas'}`)
      .join('\n');
    if (!linhas) return;

    try {
      await navigator.clipboard.writeText(linhas);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = linhas;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setTodosCopiados(true);
    setTimeout(() => setTodosCopiados(false), 2000);
  };

  const formatarData = (valor: string | null) => {
    if (!valor) return 'nunca entrou';
    // a API devolve "YYYY-MM-DD HH:MM:SS" em UTC
    const d = new Date(valor.replace(' ', 'T') + 'Z');
    if (isNaN(d.getTime())) return valor;
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const loadAllCounts = useCallback(async () => {
    try {
      const { counts: serverCounts } = await api.counts();
      setCounts(prev => ({ ...prev, ...serverCounts }));
    } catch (e) {
      console.error("Erro ao sincronizar contadores:", e);
    }
  }, []);

  const fetchData = useCallback(async (tabToFetch: ContestType = activeTab) => {
    setLoading(true);
    setFetchError(null);

    try {
      const { data: result } = await api.list(tabToFetch);
      setData(result || []);
      loadAllCounts();
      setCurrentPage(1);
    } catch (err: any) {
      console.error("Erro crítico de conexão:", err);
      setFetchError(err.message || 'Falha na conexão com o banco de dados.');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, loadAllCounts]);

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab, fetchData]);

  const deleteOne = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!id) return;
    if (!window.confirm(`Excluir permanentemente este registro?`)) return;

    try {
      await api.remove(id);
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
      await api.removeAll(activeTab);
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
        <div className="container mx-auto flex justify-between items-center gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Layers className="text-[#83E509] w-6 h-6 shrink-0" />
            <div className="min-w-0">
              <h1 className="font-black text-xl uppercase tracking-tighter truncate">
                {isSuper ? 'Painel de Cadastro Geekzada' : contestConfig[myForm].label}
              </h1>
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest">
                {isSuper ? (
                  <><Crown className="w-3 h-3 text-[#83E509]" /> <span className="text-[#83E509]">Superadmin</span></>
                ) : (
                  <><ShieldCheck className="w-3 h-3 text-slate-500" /> <span className="text-slate-500">Admin de categoria</span></>
                )}
                <span className="text-slate-600">·</span>
                <span className="text-slate-500 truncate">{user?.display_name ?? user?.username}</span>
              </p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-400 border border-white/5 hover:bg-red-600/20 transition-all shrink-0">
            <span className="text-sm font-bold uppercase tracking-widest">Sair</span><LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Aba de gestao de acessos: somente superadmin */}
        {isSuper && (
          <div className="container mx-auto mt-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setVerAcessos(false)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!verAcessos ? 'bg-[#83E509] text-slate-950' : 'bg-slate-900 text-slate-500 border border-white/5 hover:text-white'}`}
              >
                <Layers className="w-3.5 h-3.5" /> Inscrições
              </button>
              <button
                onClick={() => setVerAcessos(true)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${verAcessos ? 'bg-[#83E509] text-slate-950' : 'bg-slate-900 text-slate-500 border border-white/5 hover:text-white'}`}
              >
                <Users className="w-3.5 h-3.5" /> Acessos
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className="container mx-auto px-4 py-8">
        {verAcessos && isSuper ? (
          /* ==========================================================
             ABA DE ACESSOS
             ========================================================== */
          <div className="mb-10 bg-slate-900/30 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-[#83E509]" />
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Acessos do painel</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={copiarTodos}
                  title="Copiar todos os usuários e senhas"
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    todosCopiados
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-slate-800 hover:bg-[#83E509] text-slate-400 hover:text-slate-950'
                  }`}
                >
                  {todosCopiados ? <Check className="w-3.5 h-3.5" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
                  {todosCopiados ? 'Copiado' : 'Copiar todos'}
                </button>
                <button onClick={loadAcessos} className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                  <RefreshCw className={`w-4 h-4 ${acessosLoading ? 'animate-spin' : ''}`} /> Atualizar
                </button>
              </div>
            </div>

            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-amber-300 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
              <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Usuário e senha de todos os acessos ficam visíveis aqui.
                As senhas são cifradas no banco (AES-256-GCM) e ficam registradas em auditoria
                toda vez que alguém abre esta aba — compartilhe com cuidado.
              </span>
            </div>

            <div className="overflow-x-auto rounded-[2rem] border border-white/5">
              <table className="w-full text-left">
                <thead>
                <tr className="bg-white/5 text-slate-500 text-[10px] uppercase font-black tracking-[0.2em]">
                    <th className="px-6 py-5">Usuário</th>
                    <th className="px-6 py-5">Senha</th>
                    <th className="px-6 py-5">Nome</th>

                    <th className="px-6 py-5">Papel</th>
                    <th className="px-6 py-5">Categoria</th>
                    <th className="px-6 py-5">Último acesso</th>
                    <th className="px-6 py-5">Status</th>
                    <th className="px-6 py-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {acessosLoading ? (
                    <tr><td colSpan={8} className="p-24 text-center"><RefreshCw className="animate-spin mx-auto w-10 h-10 text-[#83E509]" /></td></tr>
                  ) : acessos.length === 0 ? (
                    <tr><td colSpan={8} className="p-24 text-center text-slate-500 font-bold uppercase tracking-widest opacity-50 italic">Nenhum acesso encontrado.</td></tr>
                  ) : acessos.map((a) => (
                    <tr key={a.id} className="hover:bg-white/[0.03] transition-all">
                      <td className="px-6 py-5">
                        <span className="font-black text-white tracking-tight break-all">{a.username}</span>
                      </td>
                      <td className="px-6 py-5">
                        {a.senha ? (
                          <div className="flex items-center gap-2">
                            <code className="px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-[#83E509] font-black tracking-wider select-all whitespace-nowrap">
                              {reveladas[a.id] ? a.senha : '•'.repeat(Math.max(8, a.senha.length))}
                            </code>
                            <button
                              onClick={() => alternarRevelada(a.id)}
                              title={reveladas[a.id] ? 'Ocultar senha' : 'Mostrar senha'}
                              aria-label={reveladas[a.id] ? 'Ocultar senha' : 'Mostrar senha'}
                              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all shrink-0"
                            >
                              {reveladas[a.id] ? <Eye className="w-4 h-4" /> : <Eye className="w-4 h-4 opacity-60" />}
                            </button>
                            <button
                              onClick={() => copiarCredencial(a)}
                              title="Copiar usuário e senha"
                              aria-label="Copiar usuário e senha"
                              className={`p-2.5 rounded-xl transition-all shrink-0 ${senhaCopiada === a.id ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 hover:bg-[#83E509] text-slate-400 hover:text-slate-950'}`}
                            >
                              {senhaCopiada === a.id ? <Check className="w-4 h-4" /> : <ClipboardCopy className="w-4 h-4" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">indisponível</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-slate-400 text-sm">{a.display_name}</td>
                      <td className="px-6 py-5">
                        {a.role === 'superadmin' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#83E509]/10 text-[#83E509] text-[10px] font-black uppercase tracking-widest">
                            <Crown className="w-3 h-3" /> Superadmin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-500/10 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                            <ShieldCheck className="w-3 h-3" /> Admin
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        {a.form_label
                          ? <span className="text-slate-300 text-sm font-bold">{a.form_label}</span>
                          : <span className="text-[#83E509] text-sm font-bold italic">Todas</span>}
                      </td>
                      <td className="px-6 py-5 text-slate-400 text-xs">
                        {formatarData(a.last_login_at)}
                        {a.sessoes_ativas > 0 && (
                          <span className="ml-2 text-[9px] px-2 py-1 rounded-full bg-green-500/10 text-green-400 font-black uppercase tracking-widest">
                            {a.sessoes_ativas} online
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        {a.is_active ? (
                          <span className="inline-flex items-center gap-1.5 text-green-400 text-[10px] font-black uppercase tracking-widest"><UserCheck className="w-3.5 h-3.5" /> Ativo</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-red-400 text-[10px] font-black uppercase tracking-widest"><UserX className="w-3.5 h-3.5" /> Inativo</span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => abrirTrocaSenha(a)}
                            title="Trocar senha"
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#83E509]/10 hover:bg-[#83E509] text-[#83E509] hover:text-slate-950 border border-[#83E509]/20 text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            <KeyRound className="w-3.5 h-3.5" /> Senha
                          </button>
                          <button
                            onClick={() => alternarAtivo(a)}
                            title={a.is_active ? 'Desativar acesso' : 'Reativar acesso'}
                            className={`p-2 rounded-xl border transition-all ${a.is_active ? 'bg-red-500/10 hover:bg-red-500 text-red-400 border-red-500/20' : 'bg-green-500/10 hover:bg-green-500 text-green-400 border-green-500/20'}`}
                          >
                            {a.is_active ? <Ban className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-6 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
              {acessos.length} acessos · o botão de olho mostra e o de cópia leva usuário e senha · trocar a senha encerra as sessões abertas
            </p>
          </div>
        ) : (
          <>
        {/* Resumo Estatístico */}
        <div className="mb-10 bg-slate-900/30 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl backdrop-blur-md">
           <div className="flex items-center justify-between mb-8">
             <div className="flex items-center gap-3"><Link className="w-4 h-4 text-[#83E509]" /><p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Status das Inscrições 2026</p></div>
             <button onClick={() => fetchData(activeTab)} className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar Base
             </button>
           </div>
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${visibleForms.length === 1 ? 'xl:grid-cols-1' : 'xl:grid-cols-6'} gap-6`}>
               {visibleForms.map((type) => {

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
            {visibleForms.map((type) => (
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
            {/* Limpar a tabela inteira fica so com o superadmin: o admin de
                categoria apaga registro por registro, mas nao a base toda. */}
            {isSuper && (
              <button onClick={deleteAll} className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 px-4 py-2.5 rounded-xl flex items-center gap-2 font-black uppercase text-xs transition-all"><Trash2 className="w-4 h-4" />Limpar Tabela</button>
            )}
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
                        {/* o clique na linha ja abre a ficha; aqui so o rotulo
                            para o botao ter nome acessivel */}
                        <button 
                          title="Ver ficha de inscrição"
                          aria-label="Ver ficha de inscrição"
                          className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={(e) => deleteOne(e, item.id)} 
                          title="Excluir registro"
                          aria-label="Excluir registro"
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
          </>
        )}
      </main>

      {/* ==========================================================
          Modal de troca de senha (superadmin)
          ========================================================== */}
      {alvoSenha && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => !salvandoSenha && setAlvoSenha(null)}>
          <div className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-[#83E509]/10 to-transparent">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#83E509]/10 text-[#83E509]"><KeyRound className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-black text-white uppercase tracking-tight">Trocar senha</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest break-all">
                    {alvoSenha.username} · {alvoSenha.form_label || 'todas as categorias'}
                  </p>
                </div>
              </div>
              <button onClick={() => setAlvoSenha(null)} disabled={salvandoSenha} className="p-2 hover:bg-white/5 rounded-full transition-colors disabled:opacity-40">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              {senhaGerada ? (
                /* senha ja gerada: mostrar uma unica vez */
                <div className="space-y-4">
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-amber-300 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                    <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Anote agora: esta senha não será exibida de novo.</span>
                  </div>

                  <div className="flex items-center gap-3 bg-slate-950 border border-[#83E509]/30 rounded-2xl p-4">
                    <code className="flex-1 text-lg font-black text-[#83E509] tracking-widest break-all select-all">{senhaGerada}</code>
                    <button onClick={copiarSenha} title="Copiar senha" className="p-3 rounded-xl bg-[#83E509]/10 hover:bg-[#83E509] text-[#83E509] hover:text-slate-950 transition-all shrink-0">
                      {copiado ? <Check className="w-4 h-4" /> : <ClipboardCopy className="w-4 h-4" />}
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                    As sessões que {alvoSenha.username} tinha abertas foram encerradas.
                    Passe a senha para o responsável da categoria.
                  </p>

                  <button
                    onClick={() => { setAlvoSenha(null); setSenhaGerada(null); setSenhaDefinida(false); }}
                    className="w-full bg-[#83E509] hover:bg-[#83E509]/90 text-slate-950 font-black py-4 rounded-2xl uppercase tracking-[0.2em] text-xs transition-all"
                  >
                    Concluído
                  </button>
                </div>
              ) : senhaDefinida ? (
                /* senha definida na mao: nao ha nada a exibir, so confirmar */
                <div className="space-y-4">
                  <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-2xl flex flex-col items-center gap-3 text-center">
                    <Check className="w-10 h-10 text-green-400" />
                    <p className="text-sm font-black text-green-400 uppercase tracking-widest">Senha atualizada</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                      As sessões que {alvoSenha.username} tinha abertas foram encerradas.
                    </p>
                  </div>

                  <button
                    onClick={() => { setAlvoSenha(null); setSenhaDefinida(false); }}
                    className="w-full bg-[#83E509] hover:bg-[#83E509]/90 text-slate-950 font-black py-4 rounded-2xl uppercase tracking-[0.2em] text-xs transition-all"
                  >
                    Concluído
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Nova senha (deixe vazio para gerar uma forte)
                    </label>
                    <input
                      type="text"
                      value={senhaDigitada}
                      onChange={e => setSenhaDigitada(e.target.value)}
                      disabled={salvandoSenha}
                      autoComplete="new-password"
                      placeholder="mínimo de 6 caracteres"
                      className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-4 py-4 text-white outline-none focus:ring-2 focus:ring-[#83E509]/50 transition-all disabled:opacity-60"
                    />
                  </div>

                  {erroSenha && (
                    <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest">{erroSenha}</p>
                  )}

                  <button
                    onClick={salvarSenha}
                    disabled={salvandoSenha}
                    className="w-full bg-[#83E509] hover:bg-[#83E509]/90 text-slate-950 font-black py-4 rounded-2xl uppercase tracking-[0.2em] text-xs transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {salvandoSenha ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> Salvando</>
                    ) : senhaDigitada.trim() ? (
                      'Definir senha'
                    ) : (
                      <><KeyRound className="w-4 h-4" /> Gerar senha forte</>
                    )}
                  </button>

                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest leading-relaxed text-center">
                    A senha guardada é um hash bcrypt: nem o superadmin consegue lê-la depois.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="py-12 text-center text-slate-800 text-[10px] font-black uppercase tracking-[0.5em] opacity-30">
        WD SOLUÇÕES DIGITAIS 2026
      </footer>
    </div>
  );
};

export default AdminDashboard;
