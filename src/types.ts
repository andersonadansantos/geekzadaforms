
export interface KPopRegistration {
  id?: string;
  group_name: string;
  category: string;
  guardian_name: string;
  members_names: string;
  members_ages: string;
  birth_date: string;
  guardian_document: string;
  city_state: string;
  whatsapp: string;
  email: string;
  fandom_name: string;
  performance_style: string;
  song_artist: string;
  duration: string;
  video_link: string;
  social_links: string;
  members_count: number;
  technical_needs: string;
  image_release: boolean;
  rules_agreement: boolean;
  signature: string;
  created_at: string;
}

export interface CosplayerRegistration {
  id?: string;
  full_name: string;
  artistic_name: string;
  instagram_link: string;
  email: string;
  phone: string;
  rg: string;
  cpf: string;
  character_name_origin: string;
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

export type ContestType = 'kpop' | 'cosplayer' | 'cosplayerperf' | 'arena' | 'imprensa' | 'estandista' | 'usinageek' | 'home';

export enum AppRoute {
  LANDING = 'landing',
  ADMIN_LOGIN = 'admin-login',
  ADMIN_DASHBOARD = 'admin-dashboard'
}
