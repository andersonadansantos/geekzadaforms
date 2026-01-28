
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

export interface CospobreRegistration {
  id?: string;
  cosplayer_name: string;
  character_name: string;
  character_origin: string;
  category: string;
  cosplay_type: string;
  age: number;
  birth_date: string;
  guardian_name: string;
  guardian_document: string;
  city_state: string;
  whatsapp: string;
  email: string;
  photo_links: string;
  video_link: string;
  performance_time: string;
  cosplay_description: string;
  authorship_declaration: boolean;
  technical_needs: string;
  image_release: boolean;
  rules_agreement: boolean;
  signature: string;
  created_at: string;
}

export interface CosplayerRegistration {
  id?: string;
  full_name: string;
  character_name: string;
  origin_work: string;
  category: string;
  cosplay_type: string;
  age: number;
  birth_date: string;
  legal_guardian: string;
  guardian_document: string;
  city_state: string;
  whatsapp: string;
  email: string;
  photo_links: string;
  video_link: string;
  performance_time: string;
  description_process: string;
  authorship_declaration: boolean;
  technical_needs: string;
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

export type ContestType = 'kpop' | 'cospobre' | 'cosplayer' | 'arena';

export enum AppRoute {
  LANDING = 'landing',
  ADMIN_LOGIN = 'admin-login',
  ADMIN_DASHBOARD = 'admin-dashboard'
}
