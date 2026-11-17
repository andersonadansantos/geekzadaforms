<?php
/**
 * Definicao de cada formulario: tabela de destino + colunas tipadas.
 * Esta e a unica fonte de verdade usada na gravacao e na leitura,
 * e tambem impede injecao de SQL: nenhum nome de tabela ou coluna
 * vem do input do usuario.
 *
 * Tipos:
 *   'string'  -> coluna VARCHAR/TEXT, com o tamanho maximo na 2a posicao
 *   'text'    -> coluna TEXT (65535), sem corte
 *   'int'     -> coluna INT
 *   'bool'    -> coluna TINYINT(1), devolvida como booleano no JSON
 *   'json'    -> coluna LONGTEXT, gravada e devolvida como array JSON
 */

declare(strict_types=1);

const TEXT_MAX = 65535;

function form_definitions(): array
{
    return [
        'kpop' => [
            'table' => 'kpop_registrations',
            'labels' => [
                'participation_type'            => 'Tipo de Participação',
                'participation_group_name'      => 'Nome do Grupo',
                'participation_solo_duo_name'   => 'Nome do Solo / Dupla',
                'responsible_name'              => 'Nome do Responsável',
                'members_count'                 => 'Quantidade de Membros',
                'members_names'                 => 'Nome Completo dos Integrantes',
                'dance_practice_links'          => 'Link Dance Practice',
                'document'                      => 'Documentos do Responsável (RG ou CPF)',
                'whatsapp'                      => 'WhatsApp',
                'email'                         => 'E-mail',
                'song_artist'                   => 'Música e Artista',
            ],
            'columns' => [
                'participation_type'            => ['string', 45],
                'participation_group_name'      => ['string', 150],
                'participation_solo_duo_name'   => ['string', 150],
                'responsible_name'              => ['string', 150],
                'members_count'                 => ['int', null],
                'members_names'                 => ['text', TEXT_MAX],
                'dance_practice_links'          => ['json', null],
                'document'                      => ['string', 45],
                'whatsapp'                      => ['string', 45],
                'email'                         => ['string', 150],
                'song_artist'                   => ['string', 150],
            ],
            'sections' => [
                'Dados da Inscrição' => [
                    'participation_type',
                    'participation_group_name', 'participation_solo_duo_name',
                    'responsible_name', 'members_count', 'members_names',
                    'dance_practice_links',
                    'document', 'whatsapp', 'email', 'song_artist',
                ],
            ],
        ],

        'cosplayerperf' => [
            'table' => 'cosplayer_registrations',
            'labels' => [
                'full_name'             => 'Nome Completo',
                'artistic_name'         => 'Nome artístico ou social',
                'instagram_link'        => 'Link do Instagram',
                'email'                 => 'E-mail',
                'phone'                 => 'Telefone',
                'age'                   => 'Idade',
                'cpf'                   => 'CPF',
                'character_name_origin' => 'Nome do personagem e sua origem',
                'video'                 => 'Anexar vídeo (1 vídeo, opcional)',
                'photos'                => 'Anexar fotos (Mínimo 1 até 3 fotos)',
                'image_release'         => 'Autorização de uso de imagem',
                'rules_agreement'       => 'Concordância com o regulamento',
                'signature'             => 'Assinatura Digital',
            ],
            'columns' => [
                'full_name'             => ['string', 150],
                'artistic_name'         => ['string', 150],
                'instagram_link'        => ['string', 500],
                'email'                 => ['string', 150],
                'phone'                 => ['string', 45],
                'age'                   => ['int', 3],
                'cpf'                   => ['string', 45],
                'character_name_origin' => ['text', TEXT_MAX],
                // Anexos: a coluna guarda o caminho (video) e a lista de
                // caminhos (photos), sempre relativos a pasta da app.
                'video'                 => ['string', 255],
                'photos'                => ['json', null],
                'image_release'         => ['bool', null],
                'rules_agreement'       => ['bool', null],
                'signature'             => ['string', 150],
            ],
            // Regras dos anexos. Nada aqui vem do usuario: forms.php e a
            // unica fonte de verdade, entao nao da para burlar o limite
            // trocando o campo no envio.
            //   kind       -> video | image (define a checagem de conteudo)
            //   min_count  -> minimo de arquivos (0 = opcional)
            //   max_count  -> maximo de arquivos
            //   max_bytes  -> tamanho maximo de CADA arquivo
            //   ext        -> extensoes aceitas (o nome final vem do MIME)
            'files' => [
                'video' => [
                    'kind'      => 'video',
                    // Opcional: a inscricao vale sem video. Quem envia
                    // pode mandar ate 511 MB (limite do proxy da hosting).
                    'min_count' => 0,
                    'max_count' => 1,
                    'max_bytes' => 511 * 1024 * 1024,
                    'ext'       => ['mp4', 'webm', 'mov', 'm4v', 'avi', 'mkv'],
                ],
                'photos' => [
                    'kind'      => 'image',
                    'min_count' => 1,
                    'max_count' => 3,
                    'max_bytes' => 511 * 1024 * 1024,
                    'ext'       => ['jpg', 'jpeg', 'png', 'webp'],
                ],
            ],
            // O proxy nginx da hospedagem corta o corpo em ~512 MB antes do
            // PHP. 511 MB e o limite util por arquivo E por inscricao inteira.
            'max_upload_bytes' => 511 * 1024 * 1024,
            'sections' => [
                'Dados Pessoais' => [
                    'full_name', 'artistic_name', 'instagram_link',
                    'email', 'phone', 'age', 'cpf', 'character_name_origin',
                ],
                'Anexos' => ['video', 'photos'],
                'Termos e Aceite' => ['image_release', 'rules_agreement', 'signature'],
            ],
        ],

        // Cosplayer Desfile: a outra categoria do concurso Cosplay.
        // Mesmos dados pessoais do Performance, sem anexos - a ficha e
        // separada no painel (o admin_cosplayer abre as duas).
        'cosplayerdesfile' => [
            'table' => 'cosplayer_desfile_registrations',
            'labels' => [
                'full_name'             => 'Nome completo',
                'artistic_name'         => 'Nome artístico ou social',
                'instagram_link'        => 'Link do Instagram (opcional)',
                'email'                 => 'E-mail',
                'phone'                 => 'Telefone',
                'age'                   => 'Idade',
                'cpf'                   => 'CPF',
                'character_name_origin' => 'Nome do personagem e sua origem',
                'image_release'         => 'Autorizo o uso de minha imagem para fins de divulgação do evento',
                'rules_agreement'       => 'Declaro que li e concordo com o regulamento oficial do evento',
                'signature'             => 'Assinatura Digital',
            ],
            'columns' => [
                'full_name'             => ['string', 150],
                'artistic_name'         => ['string', 150],
                'instagram_link'        => ['string', 500],
                'email'                 => ['string', 150],
                'phone'                 => ['string', 45],
                'age'                   => ['int', 3],
                'cpf'                   => ['string', 45],
                'character_name_origin' => ['text', TEXT_MAX],
                'image_release'         => ['bool', null],
                'rules_agreement'       => ['bool', null],
                'signature'             => ['string', 150],
            ],
            'sections' => [
                'Dados Pessoais' => [
                    'full_name', 'artistic_name', 'instagram_link',
                    'email', 'phone', 'age', 'cpf', 'character_name_origin',
                ],
                'Termos e Aceite' => ['image_release', 'rules_agreement', 'signature'],
            ],
        ],

        'arena' => [
            'table' => 'arena_registrations',
            'labels' => [
                'name'           => 'Nome Completo',
                'email'          => 'E-mail',
                'birth_date'     => 'Data de Nascimento',
                'whatsapp'       => 'WhatsApp',
                'bairro'         => 'Bairro',
                'city'           => 'Cidade',
                'identification' => 'Como você se identifica?',
                'image_release'    => 'Autorização de uso de imagem',
                'rules_agreement'  => 'Concordância com o regulamento',
            ],
            'columns' => [
                'name'           => ['string', 150],
                'email'          => ['string', 150],
                'birth_date'     => ['string', 20],
                'whatsapp'       => ['string', 45],
                'bairro'         => ['string', 120],
                'city'           => ['string', 120],
                'identification' => ['string', 255],
                'image_release'  => ['bool', null],
                'rules_agreement' => ['bool', null],
            ],
            // O Arena e o unico formulario sem assinatura digital, mas
            // exige aceite de imagem e de regulamento.
            'sections' => [
                'Dados Pessoais' => [
                    'name', 'email', 'birth_date', 'whatsapp',
                    'bairro', 'city', 'identification',
                ],
                'Termos e Aceite' => ['image_release', 'rules_agreement'],
            ],
        ],

        'imprensa' => [
            'table' => 'press_registrations',
            'labels' => [
                'full_name'           => 'Nome Completo',
                'badge_name'          => 'Nome profissional',
                'document'            => 'CPF ou RG',
                'whatsapp'            => 'Telefone / WhatsApp',
                'email'               => 'E-mail',
                'media_outlet'        => 'Nome do veículo',
                'media_type'          => 'Tipo de mídia',
                'role'                => 'Cargo / Função',
                'city_state'          => 'Cidade / Estado',
                'link'                => 'Link do site ou rede social',
                'coverage_type'       => 'Cobertura: Foto / Vídeo / Entrevista',
                'special_credential'  => 'Necessita credencial especial?',
                'equipment'           => 'Equipamentos que levará',
                'responsibility_term' => 'Termo de responsabilidade',
                'image_release'       => 'Autorização de uso de imagem',
                'signature'           => 'Assinatura Digital',
                'second_name'         => 'Nome',
                'second_cpf'          => 'CPF',
                'second_whatsapp'     => 'WhatsApp',
            ],
            'columns' => [
                'full_name'          => ['string', 150],
                'badge_name'         => ['string', 150],
                'document'           => ['string', 45],
                'whatsapp'           => ['string', 45],
                'email'              => ['string', 150],
                'media_outlet'       => ['string', 150],
                'media_type'         => ['string', 100],
                'role'               => ['string', 100],
                'city_state'         => ['string', 150],
                'link'               => ['string', 500],
                'coverage_type'      => ['text', TEXT_MAX],
                'special_credential' => ['text', TEXT_MAX],
                'equipment'          => ['text', TEXT_MAX],
                'responsibility_term' => ['bool', null],
                'image_release'      => ['bool', null],
                'signature'          => ['string', 150],
                // 2a midia/auxiliar: campos opcionais, para quando a
                // credencial cobre mais de uma pessoa.
                'second_name'        => ['string', 150],
                'second_cpf'         => ['string', 45],
                'second_whatsapp'    => ['string', 45],
            ],
            // A ordem das secoes e a mesma do formulario. A 2a midia
            // fica logo depois dos dados pessoais, e nao no fim da
            // ficha, para nao passar despercebida.
            'sections' => [
                'Dados Pessoais' => [
                    'full_name', 'badge_name', 'document', 'whatsapp', 'email',
                ],
                '2º Mídia / Auxiliar' => [
                    'second_name', 'second_cpf', 'second_whatsapp',
                ],
                'Dados do Veículo' => [
                    'media_outlet', 'media_type', 'role', 'city_state', 'link',
                ],
                'Dados Operacionais' => [
                    'coverage_type', 'special_credential', 'equipment',
                ],
                'Termos e Aceite' => [
                    'responsibility_term', 'image_release', 'signature',
                ],
            ],
        ],

        'estandista' => [
            'table' => 'estandista_registrations',
            'labels' => [
                'company_name'                 => 'Nome da Empresa / Nome Fantasia',
                'razao_social'                 => 'Razão Social (se houver)',
                'document'                     => 'CNPJ (ou CPF para Artists Alley)',
                'responsible_name'             => 'Nome do Responsável pelo Stand',
                'whatsapp'                     => 'WhatsApp do Responsável com DDD',
                'email'                        => 'E-mail do Responsável',
                'portfolio_link'               => 'Instagram / Site / Portfólio',
                'category'                     => 'Categoria Principal',
                'segment_description'          => 'Tipo de Produto / Segmento Principal',
                'main_products'                => 'Principais produtos (4)',
                'average_price'                => 'Preço Médio dos Itens',
                'target_audience'              => 'Público-Alvo Principal',
                'target_audience_other'        => 'Público-Alvo (outro)',
                'previous_events_participation' => 'Participou de outros eventos geek?',
                'previous_events_details'      => 'Detalhes de outros eventos',
                'food_flagship'                => 'Carro-chefe',
                'food_options'                 => 'Opções de alimentação',
                'food_needs'                   => 'Necessidades alimentares',
                'space_size'                   => 'Tamanho de espaço pretendido',
                'space_size_custom'            => 'Tamanho de espaço (outro)',
                'structure_type'               => 'Estrutura',
                'energy_need'                  => 'Energia',
                'energy_equipment_count'       => 'Qtd de equipamentos de energia',
                'staff_count'                  => 'Qtd de pessoas no estande',
                'staff_justification'          => 'Justificativa para mais de 4 pessoas',
                'differential'                 => 'Por que o stand agrega valor à Geekzada?',
                'interactive_experiences'      => 'Experiências interativas',
                'interactive_experiences_other' => 'Experiências interativas (outras)',
                'declaration_true'             => 'Declaro que as informações são verdadeiras',
                'declaration_curatorship'      => 'Ciente da pré-inscrição sujeita à curadoria',
                'image_release'                => 'Autorização de uso de imagem',
                'rules_agreement'              => 'Concordância com o regulamento',
                'signature'                    => 'Assinatura Digital',
            ],
            'columns' => [
                'company_name'                 => ['string', 150],
                'razao_social'                 => ['string', 200],
                'document'                     => ['string', 45],
                'responsible_name'             => ['string', 150],
                'whatsapp'                     => ['string', 45],
                'email'                        => ['string', 150],
                'portfolio_link'               => ['string', 500],
                'category'                     => ['string', 100],
                'segment_description'          => ['text', TEXT_MAX],
                'main_products'                => ['json', null],
                'average_price'                => ['string', 100],
                'target_audience'              => ['text', TEXT_MAX],
                'target_audience_other'        => ['string', 255],
                'previous_events_participation' => ['bool', null],
                'previous_events_details'      => ['text', TEXT_MAX],
                'food_flagship'                => ['string', 100],
                'food_options'                 => ['json', null],
                'food_needs'                   => ['json', null],
                'space_size'                   => ['string', 50],
                'space_size_custom'            => ['string', 100],
                'structure_type'               => ['string', 100],
                'energy_need'                  => ['string', 100],
                'energy_equipment_count'       => ['int', null],
                'staff_count'                  => ['string', 50],
                'staff_justification'          => ['text', TEXT_MAX],
                'differential'                 => ['text', TEXT_MAX],
                'interactive_experiences'      => ['json', null],
                'interactive_experiences_other' => ['string', 255],
                'declaration_true'             => ['bool', null],
                'declaration_curatorship'      => ['bool', null],
                'image_release'                => ['bool', null],
                'rules_agreement'              => ['bool', null],
                'signature'                    => ['string', 150],
            ],
            // Reflete os titulos "SECAO 1..8" do formulario, na mesma ordem.
            'sections' => [
                'Identificação do Estabelecimento' => [
                    'company_name', 'razao_social', 'document', 'responsible_name',
                    'whatsapp', 'email', 'portfolio_link',
                ],
                'Categoria do Estabelecimento' => [
                    'category', 'segment_description', 'main_products', 'average_price',
                ],
                'Sobre o seu Stand' => [
                    'target_audience', 'target_audience_other',
                    'previous_events_participation', 'previous_events_details',
                    'food_flagship',
                ],
                'Informações para Alimentação' => ['food_options', 'food_needs'],
                'Estrutura e Logística' => [
                    'space_size', 'space_size_custom', 'structure_type', 'energy_need',
                    'energy_equipment_count', 'staff_count', 'staff_justification',
                ],
                'Diferencial do seu Stand' => ['differential'],
                'Experiências Interativas' => [
                    'interactive_experiences', 'interactive_experiences_other',
                ],
                'Declaração' => ['declaration_true', 'declaration_curatorship'],
                'Termos e Aceite' => ['image_release', 'rules_agreement', 'signature'],
            ],
        ],

        // Creators / influenciadores digitais ("Pulse Creators"): identidade,
        // idade, endereco de envio, redes sociais + alcance e WhatsApp.
        'creators' => [
            'table' => 'creators_registrations',
            'labels' => [
                'full_name'           => 'Nome Completo',
                'artistic_name'       => 'Nome Artístico ou @handle',
                'age'                 => 'Idade',
                'age_range'           => 'Faixa Etária',
                'cep'                 => 'CEP',
                'address'             => 'Endereço Completo',
                'city'                => 'Cidade',
                'state'               => 'Estado (UF)',
                'instagram_handle'    => 'Instagram',
                'instagram_followers' => 'Seguidores no Instagram',
                'tiktok_handle'       => 'TikTok',
                'tiktok_followers'    => 'Seguidores no TikTok',
                'youtube_link'        => 'YouTube',
                'twitch_handle'       => 'Twitch / Live',
                'whatsapp'            => 'WhatsApp para Contratos',
                'whatsapp_optin'      => 'Aceita convites VIP no WhatsApp',
            ],
            'columns' => [
                'full_name'           => ['string', 150],
                'artistic_name'       => ['string', 150],
                'age'                 => ['int', null],
                'age_range'           => ['string', 20],
                'cep'                 => ['string', 15],
                'address'             => ['string', 255],
                'city'                => ['string', 120],
                'state'               => ['string', 10],
                'instagram_handle'    => ['string', 150],
                'instagram_followers' => ['string', 50],
                'tiktok_handle'       => ['string', 150],
                'tiktok_followers'    => ['string', 50],
                'youtube_link'        => ['string', 500],
                'twitch_handle'       => ['string', 150],
                'whatsapp'            => ['string', 45],
                'whatsapp_optin'      => ['bool', null],
            ],
            'sections' => [
                'Identidade do Creator' => ['full_name', 'artistic_name'],
                'Idade & Faixa Etária' => ['age', 'age_range'],
                'Endereço de Envio' => ['cep', 'address', 'city', 'state'],
                'Redes Sociais & Alcance' => [
                    'instagram_handle', 'instagram_followers',
                    'tiktok_handle', 'tiktok_followers',
                    'youtube_link', 'twitch_handle',
                ],
                'WhatsApp para Contratos' => ['whatsapp', 'whatsapp_optin'],
            ],
        ],

        // Beco dos Artistas: inscricao enxuta (identidade, contato e idade)
        // com um video obrigatorio de apresentacao.
        'becodosartistas' => [
            'table' => 'becodosartistas_registrations',
            'labels' => [
                'full_name' => 'Nome Completo',
                'cpf'       => 'CPF',
                'instagram' => 'Instagram',
                'age'       => 'Idade',
                'whatsapp'  => 'WhatsApp',
                'video'     => 'Upload de vídeo',
            ],
            'columns' => [
                'full_name' => ['string', 150],
                'cpf'       => ['string', 45],
                'instagram' => ['string', 150],
                'age'       => ['int', null],
                'whatsapp'  => ['string', 45],
                // Guarda o caminho do video (api/uploads/...).
                'video'     => ['string', 255],
            ],
            'files' => [
                'video' => [
                    'kind'      => 'video',
                    'min_count' => 1,
                    'max_count' => 1,
                    'max_bytes' => 40 * 1024 * 1024,
                    'ext'       => ['mp4', 'webm', 'mov', 'm4v', 'avi', 'mkv'],
                ],
            ],
            'sections' => [
                'Dados Pessoais' => ['full_name', 'cpf', 'instagram', 'age', 'whatsapp'],
                'Vídeo' => ['video'],
            ],
        ],

        'usinageek' => [
            'table' => 'usinageek_registrations',
            'labels' => [
                'name'            => 'Nome Completo',
                'email'           => 'E-mail',
                'whatsapp'        => 'WhatsApp',
                'birth_date'      => 'Data de Nascimento',
                'bairro'          => 'Bairro',
                'city'            => 'Cidade',
                'identification'  => 'Como você se identifica?',
                'image_release'   => 'Autorização de uso de imagem',
                'rules_agreement' => 'Concordância com o regulamento',
                'signature'       => 'Assinatura Digital',
            ],
            'columns' => [
                'name'            => ['string', 150],
                'email'           => ['string', 150],
                'whatsapp'        => ['string', 45],
                'birth_date'      => ['string', 20],
                'bairro'          => ['string', 120],
                'city'            => ['string', 120],
                'identification'  => ['string', 255],
                'image_release'   => ['bool', null],
                'rules_agreement' => ['bool', null],
                'signature'       => ['string', 150],
            ],
            'sections' => [
                'Dados Pessoais' => [
                    'name', 'email', 'whatsapp', 'birth_date',
                    'bairro', 'city', 'identification',
                ],
                'Termos e Aceite' => ['image_release', 'rules_agreement', 'signature'],
            ],
        ],

        // Pesquisa de satisfacao pos-evento: NPS, notas por area do evento,
        // comentarios e sugestoes de curadoria. Sem anexos.
        'pesquisa' => [
            'table' => 'pesquisa_registrations',
            'labels' => [
                'overall_rating'      => 'Nota Geral do Evento (0 a 10)',
                'experience_rating'   => 'Nível de Experiência (1 a 5)',
                'highlights'          => 'Destaques Favoritos',
                'rating_entrada'      => 'Entrada & Acesso',
                'rating_arenas'       => 'Arenas & Shows',
                'rating_audiovisual'  => 'Audiovisual',
                'rating_tecnologia'   => 'Tecnologia & Sinal',
                'rating_conforto'     => 'Conforto Ambiental',
                'rating_gastronomia'  => 'Gastronomia Geek',
                'tech_issue_note'     => 'Detalhes sobre Tecnologia & Sinal',
                'open_feedback'       => 'Comentário Aberto',
                'desired_categories'  => 'Categorias de Atração Desejadas',
                'top_guests'          => 'Top 3 Convidados Solicitados',
                'desired_games'       => 'Jogos Solicitados',
                'curation_notes'      => 'Sugestões de Curadoria',
                'raffle_optin'        => 'Participar do Sorteio VIP',
                'email'               => 'E-mail',
                'whatsapp'            => 'WhatsApp',
                'lucky_number'        => 'Número da Sorte',
            ],
            'columns' => [
                'overall_rating'     => ['int', null],
                'experience_rating'  => ['int', null],
                'highlights'         => ['json', null],
                'rating_entrada'     => ['int', null],
                'rating_arenas'      => ['int', null],
                'rating_audiovisual' => ['int', null],
                'rating_tecnologia'  => ['int', null],
                'rating_conforto'    => ['int', null],
                'rating_gastronomia' => ['int', null],
                'tech_issue_note'    => ['text', TEXT_MAX],
                'open_feedback'      => ['text', TEXT_MAX],
                'desired_categories' => ['json', null],
                'top_guests'         => ['json', null],
                'desired_games'      => ['json', null],
                'curation_notes'     => ['text', TEXT_MAX],
                'raffle_optin'       => ['bool', null],
                'email'              => ['string', 150],
                'whatsapp'           => ['string', 45],
                'lucky_number'       => ['string', 30],
            ],
            'sections' => [
                'Etapa 1 - Experiência Geral' => [
                    'overall_rating', 'experience_rating', 'highlights',
                ],
                'Etapa 2 - Áreas & Estrutura' => [
                    'rating_entrada', 'rating_arenas', 'rating_audiovisual',
                    'rating_tecnologia', 'tech_issue_note', 'rating_conforto',
                    'rating_gastronomia',
                ],
                'Etapa 2 - Comentário' => ['open_feedback'],
                'Etapa 3 - Sugestão de Atrações' => [
                    'desired_categories', 'top_guests', 'desired_games', 'curation_notes',
                ],
                'Etapa 3 - Sorteio VIP' => ['raffle_optin', 'email', 'whatsapp'],
                'Recompensa' => ['lucky_number'],
            ],
        ],
    ];
}

/**
 * Nome fisico da coluna no MySQL. As colunas do tipo 'json' recebem
 * o sufixo '_json' no banco, para nao conflitar com o nome logico
 * devolvido ao front.
 */
function column_name(string $logicalName, array $spec): string
{
    return $spec[0] === 'json' ? $logicalName . '_json' : $logicalName;
}

/**
 * Resolve a definicao de um formulario. A tabela e as colunas sempre
 * vem do catalogo interno, nunca do input do usuario.
 */
function resolve_form(string $formId): array
{
    $definitions = form_definitions();
    $key = strtolower(trim($formId));

    if ($key === 'cosplayer') {
        $key = 'cosplayerperf';
    }

    if (!isset($definitions[$key])) {
        throw new InvalidArgumentException('Formulario desconhecido: ' . $formId);
    }

    return $definitions[$key] + ['key' => $key];
}

/**
 * Rotulo de cada campo, na ordem em que as colunas sao declaradas.
 *
 * A ordem importa: e a mesma do formulario, entao o painel mostra a
 * ficha na ordem em que a pessoa preencheu. Campo sem rotulo declarado
 * recebe um nome derivado da coluna, para nunca aparecer cru.
 */
function form_labels(array $form): array
{
    $labels = $form['labels'] ?? [];
    $out = [];

    foreach (array_keys($form['columns']) as $column) {
        $out[$column] = $labels[$column] ?? humanize_column($column);
    }

    return $out;
}

/** 'second_cpf' vira 'Second cpf'. So para o que sobrar sem rotulo. */
function humanize_column(string $column): string
{
    return ucfirst(strtolower(trim(str_replace('_', ' ', $column))));
}

/**
 * Agrupa os campos nas secoes do formulario, para a ficha do painel
 * acompanhar a ordem em que a pessoa preencheu.
 *
 * Cada item e ['title' => ..., 'fields' => [coluna => rotulo]].
 * Campo que nao foi declarado em nenhuma secao cai em "Outros Dados",
 * no fim: nenhum campo declarado pode sumir da ficha.
 */
function form_sections(array $form): array
{
    $labels = form_labels($form);
    $sections = [];
    $seen = [];

    foreach ($form['sections'] ?? [] as $title => $fields) {
        $group = [];

        foreach ($fields as $field) {
            if (!isset($form['columns'][$field])) {
                continue;
            }
            $group[$field] = $labels[$field];
            $seen[$field] = true;
        }

        if ($group) {
            $sections[] = ['title' => $title, 'fields' => $group];
        }
    }

    $remaining = [];
    foreach (array_keys($form['columns']) as $field) {
        if (!isset($seen[$field])) {
            $remaining[$field] = $labels[$field];
        }
    }

    if ($remaining) {
        $sections[] = ['title' => 'Outros Dados', 'fields' => $remaining];
    }

    return $sections;
}

/**
 * Converte um valor cru do formulario no valor pronto para o MySQL,
 * conforme o tipo declarado da coluna.
 */
function cast_value(mixed $value, array $spec): mixed
{
    [$type, $maxLength] = $spec;

    switch ($type) {
        case 'int':
            if ($value === null || $value === '' || is_array($value)) {
                return null;
            }
            return (int) $value;

        case 'bool':
            if (is_bool($value)) {
                return $value ? 1 : 0;
            }
            if (is_string($value)) {
                return in_array(strtolower(trim($value)), ['1', 'on', 'true', 'yes'], true) ? 1 : 0;
            }
            return ((int) $value) === 1 ? 1 : 0;

        case 'json':
            if ($value === null || $value === '' || $value === []) {
                return json_encode([], JSON_UNESCAPED_UNICODE);
            }
            return json_encode($value, JSON_UNESCAPED_UNICODE);

        case 'text':
            $text = is_array($value) ? implode(', ', $value) : (string) $value;
            return mb_substr($text, 0, $maxLength);

        case 'string':
        default:
            $text = is_array($value) ? implode(', ', $value) : trim((string) $value);
            if ($text === '') {
                return null;
            }
            return mb_substr($text, 0, (int) $maxLength);
    }
}

/**
 * Converte uma linha do MySQL de volta para o formato esperado
 * pelo front (booleanos como bool, colunas JSON como array).
 */
function cast_row(array $row, array $definition): array
{
    $out = ['id' => isset($row['id']) ? (int) $row['id'] : null];

    foreach ($definition['columns'] as $column => $spec) {
        $value = $row[$column] ?? null;

        switch ($spec[0]) {
            case 'bool':
                $out[$column] = ((int) $value) === 1;
                break;

            case 'int':
                $out[$column] = $value === null ? null : (int) $value;
                break;

            case 'json':
                $decoded = $value === null ? null : json_decode((string) $value, true);
                $out[$column] = is_array($decoded) ? $decoded : ($value === null || $value === '' ? [] : [(string) $value]);
                break;

            default:
                $out[$column] = $value;
        }
    }

    $out['created_at'] = $row['created_at'] ?? null;

    return $out;
}
