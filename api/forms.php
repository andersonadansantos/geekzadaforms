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
            'columns' => [
                'group_name'        => ['string', 150],
                'category'          => ['string', 100],
                'fandom_name'       => ['string', 150],
                'whatsapp'          => ['string', 45],
                'email'             => ['string', 150],
                'birth_date'        => ['string', 20],
                'city_state'        => ['string', 150],
                'members_names'     => ['text', TEXT_MAX],
                'members_ages'      => ['string', 255],
                'members_count'     => ['int', null],
                'duration'          => ['string', 50],
                'song_artist'       => ['string', 150],
                'social_links'      => ['text', TEXT_MAX],
                'video_link'        => ['string', 500],
                'technical_needs'   => ['text', TEXT_MAX],
                'image_release'     => ['bool', null],
                'rules_agreement'   => ['bool', null],
                'signature'         => ['string', 150],
            ],
        ],

        'cosplayerperf' => [
            'table' => 'cosplayer_registrations',
            'columns' => [
                'full_name'             => ['string', 150],
                'artistic_name'         => ['string', 150],
                'instagram_link'        => ['string', 500],
                'email'                 => ['string', 150],
                'phone'                 => ['string', 45],
                'rg'                    => ['string', 45],
                'cpf'                   => ['string', 45],
                'character_name_origin' => ['text', TEXT_MAX],
            ],
        ],

        'arena' => [
            'table' => 'arena_registrations',
            'columns' => [
                'name'           => ['string', 150],
                'email'          => ['string', 150],
                'birth_date'     => ['string', 20],
                'whatsapp'       => ['string', 45],
                'bairro'         => ['string', 120],
                'city'           => ['string', 120],
                'identification' => ['string', 255],
            ],
        ],

        'imprensa' => [
            'table' => 'press_registrations',
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
                'rules_agreement'    => ['bool', null],
                'signature'          => ['string', 150],
            ],
        ],

        'estandista' => [
            'table' => 'estandista_registrations',
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
            ],
        ],

        'usinageek' => [
            'table' => 'usinageek_registrations',
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
