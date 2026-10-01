
export type FormId = 'kpop' | 'cosplayerperf' | 'arena' | 'imprensa' | 'estandista' | 'usinageek';

export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ?? '/geekzadaforms/api/index.php';

const FORM_IDS: Record<string, FormId> = {
  kpop: 'kpop',
  cosplayer: 'cosplayerperf',
  cosplayerperf: 'cosplayerperf',
  arena: 'arena',
  imprensa: 'imprensa',
  estandista: 'estandista',
  usinageek: 'usinageek',
};

export const toFormId = (contest: string): FormId => FORM_IDS[contest] ?? 'kpop';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// ---------------------------------------------------------------------
//  Sessao do painel
//
//  O token fica no sessionStorage: vale so nesta aba e some ao fechar o
//  navegador. Nunca vai para o banco do navegador alem do necessario.
// ---------------------------------------------------------------------
const TOKEN_KEY = 'gz_admin_token';
const USER_KEY = 'gz_admin_user';

export interface AdminUser {
  username: string;
  display_name: string;
  role: 'superadmin' | 'admin';
  form_id: string | null;
  is_superadmin: boolean;
}

/** Linha da aba "Acessos" do superadmin. */
export interface AdminAccess {
  id: number;
  username: string;
  display_name: string;
  role: 'superadmin' | 'admin';
  form_id: string | null;
  form_label: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  sessoes_ativas: number;
  /** Senha em texto puro, decifrada no servidor. null se a chave nao existir. */
  senha: string | null;
}

export const getToken = (): string | null => {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const getStoredUser = (): AdminUser | null => {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AdminUser) : null;
  } catch {
    return null;
  }
};

export function saveSession(token: string, user: AdminUser): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* modo privado sem storage: a sessao vale so nesta aba */
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  } catch {
    /* ignora */
  }
}

/** Disparado quando o servidor rejeita a sessao, para voltar ao login. */
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;
export const setUnauthorizedHandler = (fn: UnauthorizedHandler | null) => {
  onUnauthorized = fn;
};

async function call<T>(params: Record<string, string>, init?: RequestInit): Promise<T> {
  const url = new URL(API_BASE, window.location.origin);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init?.headers as Record<string, string>) ?? {}),
  };

  // O token vai no cabecalho Authorization para as acoes do painel.
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url.toString(), { ...init, headers });

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError('Resposta invalida do servidor (HTTP ' + response.status + ').', response.status);
  }

  if (!response.ok || payload?.error) {
    // 401 = sessao expirada ou invalida: limpa e volta para o login.
    if (response.status === 401) {
      clearSession();
      onUnauthorized?.();
    }
    throw new ApiError(
      payload?.error || 'Falha na comunicacao com o servidor (HTTP ' + response.status + ').',
      response.status,
    );
  }

  return payload as T;
}

export const api = {
  health: () => call<{ ok: boolean }>({ action: 'health' }),

  login: (username: string, password: string) =>
    call<{ ok: true; token: string; user: AdminUser; forms: string[] }>(
      { action: 'login' },
      { method: 'POST', body: JSON.stringify({ username, password }) },
    ),

  logout: () => call<{ ok: true }>({ action: 'logout' }, { method: 'POST', body: '{}' }),

  me: () => call<{ user: AdminUser; forms: string[] }>({ action: 'me' }),

  changePassword: (currentPassword: string, newPassword: string) =>
    call<{ ok: true }>(
      { action: 'change-password' },
      {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      },
    ),

  counts: () => call<{ counts: Record<string, number>; forms: string[] }>({ action: 'counts' }),

  list: (contest: string) =>
    call<{ form_id: string; count: number; data: Record<string, unknown>[] }>({
      action: 'list',
      form_id: toFormId(contest),
    }),

  submit: (contest: string, data: Record<string, unknown>) =>
    call<{ ok: true; id: number; form_id: string }>(
      { action: 'submit' },
      { method: 'POST', body: JSON.stringify({ form_id: toFormId(contest), data }) },
    ),

  remove: (id: number | string) =>
    call<{ ok: true; id: number }>({ action: 'delete' }, { method: 'POST', body: JSON.stringify({ id }) }),

  removeAll: (contest: string) =>
    call<{ ok: true; form_id: string; deleted: number }>(
      { action: 'delete-all' },
      { method: 'POST', body: JSON.stringify({ form_id: toFormId(contest) }) },
    ),

  // ---- gestao de acessos (so superadmin) ----

  users: () => call<{ users: AdminAccess[] }>({ action: 'users' }),

  /** Sem newPassword o servidor gera uma e devolve em "senha". */
  setPassword: (userId: number, newPassword?: string) =>
    call<{ ok: true; senha: string | null }>(
      { action: 'set-password' },
      {
        method: 'POST',
        body: JSON.stringify(
          newPassword ? { user_id: userId, new_password: newPassword } : { user_id: userId },
        ),
      },
    ),

  toggleActive: (userId: number) =>
    call<{ ok: true; is_active: boolean }>(
      { action: 'toggle-active' },
      { method: 'POST', body: JSON.stringify({ user_id: userId }) },
    ),
};
