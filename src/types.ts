
export interface KPopRegistration {
  id?: string;
  responsible_name: string;
  members_count: number | null;
  members_names: string;
  document: string;
  whatsapp: string;
  email: string;
  song_artist: string;
  created_at: string;
}

export interface CosplayerRegistration {
  id?: string;
  full_name: string;
  artistic_name: string;
  instagram_link: string;
  email: string;
  phone: string;
  age: number | null;
  cpf: string;
  character_name_origin: string;
  video?: string | null;
  photos?: string[];
  created_at: string;
}

export interface CosplayerDesfileRegistration {
  id?: string;
  full_name: string;
  artistic_name: string;
  instagram_link: string;
  email: string;
  phone: string;
  age: number | null;
  cpf: string;
  character_name_origin: string;
  image_release: boolean;
  rules_agreement: boolean;
  signature: string;
  created_at: string;
}

export interface ArenaGamerRegistration {
  id?: string;
  name: string;
  email: string;
  whatsapp: string;
  bairro: string;
  city: string;
  birth_date: string;
  identification: string;
  created_at: string;
}

export interface UsinaGeekRegistration {
  id?: string;
  name: string;
  email: string;
  whatsapp: string;
  birth_date: string;
  bairro: string;
  city: string;
  identification: string;
  image_release: boolean;
  rules_agreement: boolean;
  created_at: string;
}

export interface ImprensaRegistration {
  id?: string;
  full_name: string;
  badge_name: string;
  document: string;
  whatsapp: string;
  email: string;
  media_outlet: string;
  media_type: string;
  role: string;
  city_state: string;
  link: string;
  coverage_type: string;
  special_credential: string;
  equipment: string;
  responsibility_term: boolean;
  image_release: boolean;
  signature: string;
  created_at: string;
}

export interface EstandistaRegistration {
  id?: string;
  company_name: string;
  razao_social?: string;
  document: string;
  responsible_name: string;
  whatsapp: string;
  email: string;
  portfolio_link: string;
  category: string;
  segment_description: string;
  main_products: string[];
  average_price: string;
  target_audience: string;
  target_audience_other?: string;
  previous_events_participation: boolean;
  previous_events_details?: string;
  food_flagship?: string;
  food_options?: string[];
  food_needs?: string[];
  space_size: string;
  space_size_custom?: string;
  structure_type: string;
  energy_need: string;
  energy_equipment_count?: number;
  differential: string;
  interactive_experiences: string[];
  interactive_experiences_other?: string;
  declaration_true: boolean;
  declaration_curatorship: boolean;
  created_at: string;
}

export type ContestType = 'kpop' | 'cosplayer' | 'cosplayerperf' | 'cosplayerdesfile' | 'arena' | 'imprensa' | 'estandista' | 'usinageek' | 'creators' | 'becodosartistas' | 'pesquisa' | 'home';

export enum AppRoute {
  LANDING = 'landing',
  ADMIN_LOGIN = 'admin-login',
  ADMIN_DASHBOARD = 'admin-dashboard'
}
