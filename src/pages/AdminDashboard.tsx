
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api, fileUrl, AdminUser, AdminAccess } from '../apiClient';
import { ContestType } from '../types';
import { 
  Trash2, LogOut, Search, RefreshCw, FileSpreadsheet, Layers, 
  Music, Wand2, Camera, Link, Copy, Check, ExternalLink, 
  Gamepad2, X, Eye, Calendar, User, Phone, Mail, Info, 
  Share2, TriangleAlert, Mic, ChevronLeft, ChevronRight, Store, AlertCircle,
  ShieldCheck, Crown, KeyRound, Users, UserX, UserCheck, ClipboardCopy, Ban, Sparkles, ClipboardList, Video
} from 'lucide-react';
import * as XLSX from 'xlsx';
import PesquisaMetrics from './PesquisaMetrics';

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
  // Rotulo de cada campo da categoria aberta, na ordem do formulario.
  const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({});
const [fieldSections, setFieldSections] = useState<{ title: string; fields: Record<string, string> }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({
    kpop: 0, cosplayerperf: 0, cosplayerdesfile: 0, arena: 0, imprensa: 0, estandista: 0, usinageek: 0, creators: 0, becodosartistas: 0, pesquisa: 0
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100; // Alterado para 100 conforme solicitado

  const contestConfig: Record<Exclude<ContestType, 'home' | 'cosplayer'>, { label: string; icon: any; colorClass: string; bgColorClass: string; textColorClass: string; hash: string }> = {
    kpop: { label: 'K-Pop', icon: Music, colorClass: 'bg-pink-600', bgColorClass: 'bg-pink-500/10', textColorClass: 'text-pink-500', hash: '#kpop' },
    cosplayerperf: { label: 'Cosplayer Perf.', icon: Camera, colorClass: 'bg-purple-600', bgColorClass: 'bg-purple-500/10', textColorClass: 'text-purple-500', hash: '#cosplayerperformance' },
    cosplayerdesfile: { label: 'Cosplayer Desfile', icon: Wand2, colorClass: 'bg-purple-700', bgColorClass: 'bg-purple-500/10', textColorClass: 'text-purple-500', hash: '#cosplayerdesfile' },
    arena: { label: 'Arena Gamer', icon: Gamepad2, colorClass: 'bg-cyan-600', bgColorClass: 'bg-cyan-500/10', textColorClass: 'text-cyan-500', hash: '#arena' },
    imprensa: { label: 'Imprensa', icon: Mic, colorClass: 'bg-indigo-600', bgColorClass: 'bg-indigo-500/10', textColorClass: 'text-indigo-500', hash: '#imprensa' },
    estandista: { label: 'Expositores', icon: Store, colorClass: 'bg-orange-600', bgColorClass: 'bg-orange-500/10', textColorClass: 'text-orange-500', hash: '#estandista' },
    usinageek: { label: 'Usina Geek', icon: Store, colorClass: 'bg-blue-600', bgColorClass: 'bg-blue-50', textColorClass: 'text-blue-600', hash: '#usinageek' },
    creators: { label: 'Creators', icon: Sparkles, colorClass: 'bg-fuchsia-600', bgColorClass: 'bg-fuchsia-500/10', textColorClass: 'text-fuchsia-500', hash: '#creators' },
    becodosartistas: { label: 'Beco dos Artistas', icon: Video, colorClass: 'bg-rose-600', bgColorClass: 'bg-rose-500/10', textColorClass: 'text-rose-500', hash: '#becodosartistas' },
    pesquisa: { label: 'Pesquisa', icon: ClipboardList, colorClass: 'bg-violet-600', bgColorClass: 'bg-violet-500/10', textColorClass: 'text-violet-400', hash: '#pesquisa' }
  };

  // Categorias que este usuario pode abrir. O admin de categoria fica
  // preso na dele: o servidor tambem recusa as outras, mas esconder aqui
  // evita o usuario clicar em algo que vai dar erro.
  const visibleForms = useMemo(() => {
    if (isSuper) {
      return Object.keys(contestConfig) as ContestType[];
    }
    // Admin de categoria: o que o servidor liberou (form_id + extra_forms),
    // na ordem em que veio da API. Cai no form_id como garantia de sessao.
    const liberados = (user?.forms ?? [])
      .filter((f): f is ContestType => f in contestConfig);
    return liberados.length ? liberados : ([myForm] as ContestType[]);
  }, [isSuper, myForm, user?.forms, contestConfig]);

  // Se a sessao chegar com usuario fora das categorias liberadas, corrige.
  useEffect(() => {
    if (!isSuper && !visibleForms.includes(activeTab)) {
      setActiveTab(myForm);
    }
  }, [isSuper, myForm, activeTab, visibleForms]);

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
      const { data: result, labels, sections } = await api.list(tabToFetch);
      setData(result || []);
      // Rotulos e secoes do formulario atual, para a ficha mostrar os
      // nomes de verdade, agrupados na ordem em que a pessoa preencheu.
      setFieldLabels(labels || {});
      setFieldSections(sections || []);
      loadAllCounts();
      setCurrentPage(1);
    } catch (err: any) {
      console.error("Erro crítico de conexão:", err);
      setFetchError(err.message || 'Falha na conexão com o banco de dados.');
      setData([]);
      setFieldLabels({});
      setFieldSections([]);
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
    <div className="min-h-screen bg-[#f8f9ff] text-slate-900 font-sans pb-20 selection:bg-blue-600/30">
      {/* Modal de Detalhes (nao aparece na aba de metricas da pesquisa) */}
      {selectedItem && activeTab !== 'pesquisa' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
          <div className="bg-white border border-slate-200 w-full max-w-2xl max-h-[90vh] rounded-xl shadow-lg overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className={`p-6 border-b border-slate-200/80 flex items-center justify-between bg-gradient-to-r ${contestConfig[activeTab].colorClass}/10 to-transparent`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${contestConfig[activeTab].bgColorClass} ${contestConfig[activeTab].textColorClass}`}><Info className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-bold text-slate-900 tracking-tight">Ficha de Inscrição</h3>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{activeTab.toUpperCase()}</p>
                </div>
              </div>
              <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><X className="w-6 h-6 text-slate-500" /></button>
            </div>
            <div className="overflow-y-auto p-8 custom-scrollbar space-y-8">
              {(() => {
                const ocultos = new Set(['id', 'created_at']);

                const textos = (value: unknown) => {
                  if (Array.isArray(value)) return value.length ? value.join(', ') : '-';
                  if (value === null || value === undefined || value === '') return '-';
                  return String(value);
                };

                // So caminhos que o servidor gerou (api/uploads/...) sao
                // tratados como anexo: um texto comum nunca vira link.
                const anexosDe = (value: unknown): React.ReactNode => {
                  const lista = Array.isArray(value)
                    ? value
                    : typeof value === 'string' ? [value] : [];
                  if (lista.length === 0) return null;
                  if (!lista.every((c) => typeof c === 'string' && c.startsWith('api/uploads/'))) {
                    return null;
                  }
                  return (lista as string[]).map((caminho) => (
                    <a
                      key={caminho}
                      href={fileUrl(caminho)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:text-blue-700 underline break-all transition-colors"
                    >
                      {caminho.split('/').pop()}
                    </a>
                  ));
                };

                const celula = (key: string, rotulo: string) => {
                  const value = (selectedItem as Record<string, unknown>)[key];
                  const vazio =
                    value === null || value === undefined || value === '' ||
                    (Array.isArray(value) && value.length === 0);

                  // Anexo gravado pelo servidor ("api/uploads/...") vira
                  // link; qualquer outro texto continua como estava.
                  const anexo = anexosDe(value);

                  // K-Pop: os links de dance practice viram links clicaveis,
                  // em vez do texto puro separado por virgula.
                  const linksPractice = key === 'dance_practice_links' && Array.isArray(value)
                    ? value.filter((c): c is string => typeof c === 'string' && c.trim() !== '')
                    : null;

                  return (
                    <div key={key} className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{rotulo}</p>
                      <div className={`text-sm font-medium p-3 rounded-xl border break-words ${
                        vazio
                          ? 'bg-slate-50 border-slate-200 text-slate-600 italic'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}>
                        {anexo ? (
                          <div className="flex flex-wrap gap-x-4 gap-y-2">{anexo}</div>
                        ) : linksPractice ? (
                          <div className="flex flex-col gap-2">
                            {linksPractice.map((link) => (
                              <a
                                key={link}
                                href={link}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:text-blue-700 underline break-all transition-colors"
                              >
                                {link}
                              </a>
                            ))}
                          </div>
                        ) : typeof value === 'boolean' && !vazio ? (
                          <span className={value ? 'text-emerald-600' : 'text-slate-500'}>
                            {value ? 'Sim' : 'Nao'}
                          </span>
                        ) : (
                          textos(value)
                        )}
                      </div>
                    </div>
                  );
                };

                // Par de nomes do K-Pop (grupo x solo/dupla): o formulario so preenche
                // um dos dois, entao a ficha mostra apenas o preenchido. Sem
                // isso, aparecia um campo vazio ao lado do que tem valor,
                // dando a impressao de dado faltando.
                const nomeKpop = (k: string) =>
                  k === 'participation_group_name' || k === 'participation_solo_duo_name';

                const vazio = (v: unknown) =>
                  v === null || v === undefined || v === '' ||
                  (Array.isArray(v) && v.length === 0);

                const presente = (k: string) =>
                  !ocultos.has(k) &&
                  Object.prototype.hasOwnProperty.call(selectedItem, k) &&
                  (!nomeKpop(k) || !vazio((selectedItem as Record<string, unknown>)[k]));

                // Secoes do formulario, na ordem do formulario. Sem
                // secoes vindas do servidor, cai em uma unica com todos
                // os campos, para a ficha nunca quebrar.
                let grupos = fieldSections.length > 0
                  ? fieldSections
                  : [{ title: 'Dados', fields: fieldLabels }];

                // Campo sem secao declarada nunca some da ficha: o que
                // sobrar (coluna nova no banco, por exemplo) entra em
                // "Outros Dados".
                const usados = new Set(grupos.flatMap((s) => Object.keys(s.fields)));
                const restantes: Record<string, string> = {};
                Object.keys(fieldLabels).forEach((k) => {
                  if (!usados.has(k)) restantes[k] = fieldLabels[k];
                });
                Object.keys(selectedItem).forEach((k) => {
                  if (!usados.has(k) && !(k in restantes)) restantes[k] = k.replace(/_/g, ' ');
                });
                if (Object.keys(restantes).length > 0) {
                  grupos = [...grupos, { title: 'Outros Dados', fields: restantes }];
                }

                const total = grupos.reduce(
                  (acc, s) => acc + Object.keys(s.fields).filter(presente).length, 0,
                );
                if (total === 0) {
                  return <p className="text-sm text-slate-500 text-center py-8">Nenhum campo registrado.</p>;
                }

                return (
                  <div className="space-y-8">
                    {grupos.map((secao) => {
                      const chaves = Object.keys(secao.fields).filter(presente);
                      if (chaves.length === 0) return null;
                      return (
                        <section key={secao.title} className="space-y-4">
                          <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wider border-b border-slate-200 pb-2">
                            {secao.title}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                            {chaves.map((k) => celula(k, secao.fields[k]))}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <nav className="bg-white border-b border-slate-200/80 p-4 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto flex justify-between items-center gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Layers className="text-blue-600 w-6 h-6 shrink-0" />
            <div className="min-w-0">
              <h1 className="font-bold text-xl tracking-tight truncate">
                {isSuper ? 'Painel de Cadastro Geekzada' : contestConfig[myForm].label}
              </h1>
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                {isSuper ? (
                  <><Crown className="w-3 h-3 text-blue-600" /> <span className="text-blue-600">Superadmin</span></>
                ) : (
                  <><ShieldCheck className="w-3 h-3 text-slate-500" /> <span className="text-slate-500">Admin de categoria</span></>
                )}
                <span className="text-slate-600">·</span>
                <span className="text-slate-500 truncate">{user?.display_name ?? user?.username}</span>
              </p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-slate-600 border border-slate-200 hover:bg-red-50 hover:text-red-600 transition-all shrink-0">
            <span className="text-sm font-bold uppercase tracking-widest">Sair</span><LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Aba de gestao de acessos: somente superadmin */}
        {isSuper && (
          <div className="container mx-auto mt-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setVerAcessos(false)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${!verAcessos ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900'}`}
              >
                <Layers className="w-3.5 h-3.5" /> Inscrições
              </button>
              <button
                onClick={() => setVerAcessos(true)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${verAcessos ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900'}`}
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
          <div className="mb-10 bg-white p-8 rounded-xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Acessos do painel</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={copiarTodos}
                  title="Copiar todos os usuários e senhas"
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                    todosCopiados
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-white hover:bg-blue-600 text-slate-600 hover:text-white border border-slate-200 hover:border-blue-600'
                  }`}
                >
                  {todosCopiados ? <Check className="w-3.5 h-3.5" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
                  {todosCopiados ? 'Copiado' : 'Copiar todos'}
                </button>
                <button onClick={loadAcessos} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-all flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                  <RefreshCw className={`w-4 h-4 ${acessosLoading ? 'animate-spin' : ''}`} /> Atualizar
                </button>
              </div>
            </div>

            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-700 text-xs font-medium uppercase tracking-wider leading-relaxed">
              <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Usuário e senha de todos os acessos ficam visíveis aqui.
                As senhas são cifradas no banco (AES-256-GCM) e ficam registradas em auditoria
                toda vez que alguém abre esta aba — compartilhe com cuidado.
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="w-full text-left">
                <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
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
                <tbody className="divide-y divide-slate-100">
                  {acessosLoading ? (
                    <tr><td colSpan={8} className="p-24 text-center"><RefreshCw className="animate-spin mx-auto w-10 h-10 text-blue-600" /></td></tr>
                  ) : acessos.length === 0 ? (
                    <tr><td colSpan={8} className="p-24 text-center text-slate-500 font-bold uppercase tracking-widest opacity-50 italic">Nenhum acesso encontrado.</td></tr>
                  ) : acessos.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/60 transition-all">
                      <td className="px-6 py-5">
                        <span className="font-semibold text-slate-900 tracking-tight break-all">{a.username}</span>
                      </td>
                      <td className="px-6 py-5">
                        {a.senha ? (
                          <div className="flex items-center gap-2">
                            <code className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-blue-600 font-semibold tracking-wider select-all whitespace-nowrap">
                              {reveladas[a.id] ? a.senha : '•'.repeat(Math.max(8, a.senha.length))}
                            </code>
                            <button
                              onClick={() => alternarRevelada(a.id)}
                              title={reveladas[a.id] ? 'Ocultar senha' : 'Mostrar senha'}
                              aria-label={reveladas[a.id] ? 'Ocultar senha' : 'Mostrar senha'}
                              className="p-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-all shrink-0"
                            >
                              {reveladas[a.id] ? <Eye className="w-4 h-4" /> : <Eye className="w-4 h-4 opacity-60" />}
                            </button>
                            <button
                              onClick={() => copiarCredencial(a)}
                              title="Copiar usuário e senha"
                              aria-label="Copiar usuário e senha"
                              className={`p-2.5 rounded-lg transition-all shrink-0 ${senhaCopiada === a.id ? 'bg-emerald-50 text-emerald-700' : 'bg-white hover:bg-blue-600 text-slate-600 hover:text-white border border-slate-200 hover:border-blue-600'}`}
                            >
                              {senhaCopiada === a.id ? <Check className="w-4 h-4" /> : <ClipboardCopy className="w-4 h-4" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">indisponível</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-slate-500 text-sm">{a.display_name}</td>
                      <td className="px-6 py-5">
                        {a.role === 'superadmin' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold uppercase tracking-wider">
                            <Crown className="w-3 h-3" /> Superadmin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                            <ShieldCheck className="w-3 h-3" /> Admin
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        {a.form_label
                          ? <span className="text-slate-700 text-sm font-bold">{a.form_label}</span>
                          : <span className="text-blue-600 text-sm font-bold italic">Todas</span>}
                      </td>
                      <td className="px-6 py-5 text-slate-500 text-xs">
                        {formatarData(a.last_login_at)}
                        {a.sessoes_ativas > 0 && (
                          <span className="ml-2 text-[10px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 font-semibold uppercase tracking-wider">
                            {a.sessoes_ativas} online
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        {a.is_active ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 text-xs font-semibold uppercase tracking-wider"><UserCheck className="w-3.5 h-3.5" /> Ativo</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-red-600 text-xs font-semibold uppercase tracking-wider"><UserX className="w-3.5 h-3.5" /> Inativo</span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => abrirTrocaSenha(a)}
                            title="Trocar senha"
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-blue-600 text-blue-600 hover:text-white border border-slate-200 hover:border-blue-600 text-xs font-semibold uppercase tracking-wider transition-all"
                          >
                            <KeyRound className="w-3.5 h-3.5" /> Senha
                          </button>
                          <button
                            onClick={() => alternarAtivo(a)}
                            title={a.is_active ? 'Desativar acesso' : 'Reativar acesso'}
                            className={`p-2 rounded-xl border transition-all ${a.is_active ? 'bg-white hover:bg-red-50 text-red-600 border-red-200' : 'bg-white hover:bg-emerald-50 text-emerald-600 border-emerald-200'}`}
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

            <p className="mt-6 text-xs text-slate-500 font-medium uppercase tracking-wider">
              {acessos.length} acessos · o botão de olho mostra e o de cópia leva usuário e senha · trocar a senha encerra as sessões abertas
            </p>
          </div>
        ) : (
          <>
        {/* Resumo Estatístico */}
        <div className="mb-10 bg-white p-8 rounded-xl border border-slate-200/80 shadow-sm">
           <div className="flex items-center justify-between mb-8">
             <div className="flex items-center gap-3"><Link className="w-4 h-4 text-blue-600" /><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status das Inscrições 2026</p></div>
             <button onClick={() => fetchData(activeTab)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-all flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar Base
             </button>
           </div>
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${visibleForms.length === 1 ? 'xl:grid-cols-1' : 'xl:grid-cols-6'} gap-6`}>
               {visibleForms.map((type) => {

                const item = contestConfig[type];
                return (
                  <div key={type} onClick={() => setActiveTab(type)} className={`bg-white border ${activeTab === type ? 'border-blue-500 ring-1 ring-blue-100' : 'border-slate-200/80'} p-6 rounded-xl flex flex-col gap-4 group hover:border-blue-300 cursor-pointer transition-all`}>
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-lg shrink-0 ${item.bgColorClass} ${item.textColorClass}`}><item.icon className="w-5 h-5" /></div>
                      <button onClick={(e) => { e.stopPropagation(); copyFormLink(item.hash, type); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors">
                        {copiedLink === type ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider block">{item.label}</span>
                      <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-bold text-slate-900 tracking-tight`}>{counts[type] || 0}</span>
                        <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Inscritos</span>
                      </div>
                    </div>
                  </div>
                );
              })}
           </div>
        </div>

        {/* Barra de Busca e Ações */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8 items-center justify-between">
          <div className="flex flex-wrap justify-center items-center bg-slate-100 p-1 rounded-full border border-slate-200/80">
            {visibleForms.map((type) => (
              <button key={type} onClick={() => setActiveTab(type)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all ${activeTab === type ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-white'}`}>
                {React.createElement(contestConfig[type].icon, { className: "w-3.5 h-3.5" })}<span>{contestConfig[type].label.toUpperCase()}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 w-full lg:w-auto justify-center">
            <div className="relative flex-1 min-w-[200px] lg:w-64">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input placeholder="Filtrar por nome, email..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <button onClick={exportExcel} className="bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 font-medium px-4 py-2 rounded-lg shadow-sm transition-all flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" />Exportar Excel</button>
            {/* Limpar a tabela inteira fica so com o superadmin: o admin de
                categoria apaga registro por registro, mas nao a base toda. */}
            {isSuper && (
              <button onClick={deleteAll} className="bg-white text-red-600 border border-red-200 hover:bg-red-50 px-4 py-2 rounded-lg shadow-sm transition-all flex items-center gap-2 font-medium"><Trash2 className="w-4 h-4" />Limpar Tabela</button>
            )}
          </div>
        </div>

        {fetchError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 font-semibold uppercase text-xs tracking-wider">
            <AlertCircle className="w-4 h-4" /> Falha: {fetchError}
          </div>
        )}

        {/* Métricas (pesquisa) ou Tabela de Dados */}
        {activeTab === 'pesquisa' ? (
          <PesquisaMetrics data={filteredData as Record<string, unknown>[]} loading={loading} />
        ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-8 py-5">Nome / Identificação</th>
                  <th className="px-8 py-5">
                    {activeTab === 'imprensa' ? 'Mídia' : activeTab === 'estandista' ? 'Empresa' : activeTab === 'usinageek' ? 'Identificação' : activeTab === 'creators' ? 'Faixa Etária' : activeTab === 'becodosartistas' ? 'Instagram' : activeTab === 'pesquisa' ? 'Destaques' : 'Categoria'}
                  </th>
                  <th className="px-8 py-5">WhatsApp</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={5} className="p-32 text-center"><RefreshCw className="animate-spin mx-auto w-10 h-10 text-blue-600" /></td></tr>
                ) : paginatedData.length === 0 ? (
                  <tr><td colSpan={5} className="p-24 text-center text-slate-500 font-bold uppercase tracking-widest opacity-50 italic">Sem registros para exibir.</td></tr>
                ) : paginatedData.map(item => (
                  <tr key={item.id} onClick={() => setSelectedItem(item)} className="hover:bg-slate-50/60 cursor-pointer transition-all group">
                    <td className="px-8 py-5">
                      <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                         {activeTab === 'imprensa' ? item.full_name : 
                          activeTab === 'estandista' ? item.company_name : 
                          activeTab === 'creators' ? (item.artistic_name || item.full_name) :
                          activeTab === 'becodosartistas' ? item.full_name :
                          activeTab === 'pesquisa' ? (item.email || 'Anônimo') :
                          (item.responsible_name || item.group_name || item.cosplayer_name || item.full_name || item.name || 'N/A')}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {activeTab === 'imprensa' ? item.role : 
                         activeTab === 'estandista' ? item.document : 
                         activeTab === 'creators' ? (item.instagram_handle || item.email || '-') :
                         activeTab === 'becodosartistas' ? (item.instagram || item.cpf || '-') :
                          activeTab === 'pesquisa' ? `Recomendação: ${item.overall_rating ?? '-'}/10 | Exp.: ${item.experience_rating ?? '-'}/5` :
                          (item.character_name_origin || item.song_artist || item.email || '-')}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${contestConfig[activeTab].bgColorClass} ${contestConfig[activeTab].textColorClass} border-transparent uppercase`}>
                        {activeTab === 'imprensa' ? item.media_outlet : 
                         activeTab === 'estandista' ? item.category : 
                         activeTab === 'creators' ? (item.age_range || 'Geral') :
                         activeTab === 'becodosartistas' ? (item.age ? `${item.age} anos` : 'Geral') :
                          activeTab === 'pesquisa' ? (Array.isArray(item.highlights) && item.highlights.length ? item.highlights.slice(0,2).join(', ') : '—') :
                          (item.participation_type || item.identification || item.category || item.bairro || 'Geral')}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm font-mono font-medium text-slate-600">{item.phone || item.whatsapp || '-'}</td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-emerald-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
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
                          className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={(e) => deleteOne(e, item.id)} 
                          title="Excluir registro"
                          aria-label="Excluir registro"
                          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
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
          <div className="bg-slate-50/80 px-8 py-5 flex flex-col sm:flex-row items-center justify-between border-t border-slate-200/80 gap-4">
            <div className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
              Exibindo <span className="text-slate-700">{paginatedData.length}</span> de <span className="text-slate-700">{filteredData.length}</span> registros
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                disabled={currentPage === 1 || loading}
                onClick={handlePrevPage}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-slate-200">
                <span className="text-xs font-semibold text-blue-600">{currentPage}</span>
                <span className="text-xs font-semibold text-slate-500">/</span>
                <span className="text-xs font-semibold text-slate-500">{totalPages || 1}</span>
              </div>
              
              <button 
                disabled={currentPage >= totalPages || loading}
                onClick={handleNextPage}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        )}
          </>
        )}
      </main>

      {/* ==========================================================
          Modal de troca de senha (superadmin)
          ========================================================== */}
      {alvoSenha && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => !salvandoSenha && setAlvoSenha(null)}>
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-xl shadow-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200/80 flex items-center justify-between bg-gradient-to-r from-blue-50 to-transparent">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><KeyRound className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-bold text-slate-900 tracking-tight">Trocar senha</h3>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider break-all">
                    {alvoSenha.username} · {alvoSenha.form_label || 'todas as categorias'}
                  </p>
                </div>
              </div>
              <button onClick={() => setAlvoSenha(null)} disabled={salvandoSenha} className="p-2 hover:bg-slate-50 rounded-full transition-colors disabled:opacity-40">
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              {senhaGerada ? (
                /* senha ja gerada: mostrar uma unica vez */
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-700 text-xs font-medium uppercase tracking-wider leading-relaxed">
                    <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Anote agora: esta senha não será exibida de novo.</span>
                  </div>

                  <div className="flex items-center gap-3 bg-slate-50 border border-blue-200 rounded-lg p-4">
                    <code className="flex-1 text-lg font-semibold text-blue-600 tracking-widest break-all select-all">{senhaGerada}</code>
                    <button onClick={copiarSenha} title="Copiar senha" className="p-3 rounded-lg bg-white border border-slate-200 hover:bg-blue-600 text-blue-600 hover:text-white transition-all shrink-0">
                      {copiado ? <Check className="w-4 h-4" /> : <ClipboardCopy className="w-4 h-4" />}
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider leading-relaxed">
                    As sessões que {alvoSenha.username} tinha abertas foram encerradas.
                    Passe a senha para o responsável da categoria.
                  </p>

                  <button
                    onClick={() => { setAlvoSenha(null); setSenhaGerada(null); setSenhaDefinida(false); }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-lg uppercase tracking-wider text-xs transition-all"
                  >
                    Concluído
                  </button>
                </div>
              ) : senhaDefinida ? (
                /* senha definida na mao: nao ha nada a exibir, so confirmar */
                <div className="space-y-4">
                  <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-lg flex flex-col items-center gap-3 text-center">
                    <Check className="w-10 h-10 text-emerald-600" />
                    <p className="text-sm font-semibold text-emerald-600 uppercase tracking-widest">Senha atualizada</p>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider leading-relaxed">
                      As sessões que {alvoSenha.username} tinha abertas foram encerradas.
                    </p>
                  </div>

                  <button
                    onClick={() => { setAlvoSenha(null); setSenhaDefinida(false); }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-lg uppercase tracking-wider text-xs transition-all"
                  >
                    Concluído
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1">
                      Nova senha (deixe vazio para gerar uma forte)
                    </label>
                    <input
                      type="text"
                      value={senhaDigitada}
                      onChange={e => setSenhaDigitada(e.target.value)}
                      disabled={salvandoSenha}
                      autoComplete="new-password"
                      placeholder="mínimo de 6 caracteres"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-4 text-slate-900 outline-none focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-60"
                    />
                  </div>

                  {erroSenha && (
                    <p className="text-red-500 text-xs font-medium uppercase tracking-wider">{erroSenha}</p>
                  )}

                  <button
                    onClick={salvarSenha}
                    disabled={salvandoSenha}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-lg uppercase tracking-wider text-xs transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {salvandoSenha ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> Salvando</>
                    ) : senhaDigitada.trim() ? (
                      'Definir senha'
                    ) : (
                      <><KeyRound className="w-4 h-4" /> Gerar senha forte</>
                    )}
                  </button>

                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider leading-relaxed text-center">
                    A senha guardada é um hash bcrypt: nem o superadmin consegue lê-la depois.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="py-12 text-center text-slate-500 text-xs font-semibold uppercase tracking-widest">
        WD SOLUÇÕES DIGITAIS 2026
      </footer>
    </div>
  );
};

export default AdminDashboard;
