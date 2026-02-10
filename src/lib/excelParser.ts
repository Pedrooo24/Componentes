import * as XLSX from 'xlsx';
import {
    Componente, Desconto, HeaderValidation, ParsedUploadData,
    ParsedDescontosData, ProcessingStatus, LinhaIgnorada
} from '../types';

// ============================================================================
// DICIONÁRIO DE HEADERS (Determinístico — sem fuzzy matching)
// ============================================================================

type CampoBD = 'referencia' | 'descricao' | 'preco_tabela' | 'grupo_desconto' |
    'valor_desconto' | 'familia' | 'ean' | 'peso' | 'quantidade_minima' | 'unidade';

/**
 * Mapeamento normalizado: header Excel (lowercase, sem acentos) → campo BD.
 * A primeira entrada de cada grupo é o "nome canónico" que aparece na UI.
 */
const HEADER_MAP: Record<string, CampoBD> = {
    // Referência (obrigatório)
    'referencia': 'referencia',
    'referência': 'referencia',
    'ref': 'referencia',
    'ref.': 'referencia',
    'codigo': 'referencia',
    'código': 'referencia',

    // Descrição (obrigatório)
    'descricao': 'descricao',
    'descrição': 'descricao',
    'description': 'descricao',
    'designacao': 'descricao',
    'designação': 'descricao',

    // PVP / Preço (obrigatório)
    'pvp': 'preco_tabela',
    'p.v.p': 'preco_tabela',
    'p.v.p.': 'preco_tabela',
    'preco': 'preco_tabela',
    'preço': 'preco_tabela',
    'precio': 'preco_tabela',
    'price': 'preco_tabela',
    'eur': 'preco_tabela',

    // COD MPG / Grupo Desconto
    'cod mpg': 'grupo_desconto',
    'cod. mpg': 'grupo_desconto',
    'mpg': 'grupo_desconto',
    'grupo desconto': 'grupo_desconto',
    'grupo': 'grupo_desconto',

    // Desconto (valor numérico — vai para tbldescontos)
    'desconto': 'valor_desconto',
    'discount': 'valor_desconto',
    'dto': 'valor_desconto',
    'dto.': 'valor_desconto',
    'desc.': 'valor_desconto',

    // Família (opcional)
    'familia': 'familia',
    'família': 'familia',
    'fam': 'familia',
    'fam.': 'familia',
    'actividad': 'familia',
    'actividade': 'familia',
    'family': 'familia',
    'category': 'familia',

    // EAN (opcional)
    'ean': 'ean',
    'ean-13': 'ean',
    'ean13': 'ean',
    'gtin': 'ean',
    'barcode': 'ean',

    // Unidade (opcional)
    'unidade': 'unidade',
    'uni': 'unidade',
    'unid': 'unidade',
    'unid.': 'unidade',
    'unit': 'unidade',

    // Peso (opcional)
    'peso': 'peso',
    'peso bruto': 'peso',
    'weight': 'peso',

    // Quantidade (opcional)
    'quantidade': 'quantidade_minima',
    'qtd': 'quantidade_minima',
    'qt': 'quantidade_minima',
    'qtd.': 'quantidade_minima',
    'unid. emb.': 'quantidade_minima',
    'quantidade indivisible': 'quantidade_minima',
    'indivisible': 'quantidade_minima',
};

/** Headers que o user deve ver na UI para copiar (formato canónico) */
export const HEADERS_OBRIGATORIOS = ['Referência', 'Descrição', 'PVP'];
export const HEADERS_DESCONTO = ['COD MPG', 'Desconto'];
export const HEADERS_OPCIONAIS = ['Família', 'Ean', 'Peso', 'Quantidade'];

/** Headers para upload de descontos standalone */
export const HEADERS_DESCONTOS_OBRIGATORIOS = ['COD MPG', 'Desconto'];

// ============================================================================
// UTILITÁRIOS
// ============================================================================

/** Normaliza header: lowercase, trim, remove espaços duplicados */
function normalizarHeader(h: string): string {
    return h.toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Limpa valor para string, preservando encoding original */
function limparValor(valor: unknown): string | null {
    if (valor === undefined || valor === null) return null;
    const str = String(valor).trim();
    if (str === '' || str.toLowerCase() === 'nan') return null;
    return str;
}

/** Converte valor para número */
function paraNumero(valor: unknown): number | null {
    if (valor === undefined || valor === null) return null;
    const str = String(valor).trim().replace(',', '.').replace(/\s/g, '');
    if (str === '' || str.toLowerCase() === 'nan') return null;
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
}

/** Normaliza valor de desconto (remove %, converte decimal→inteiro) */
function normalizarDesconto(valor: unknown): number | null {
    if (valor === undefined || valor === null) return null;
    const str = String(valor).trim().replace(/[%€\s]/g, '').replace(',', '.');
    const num = parseFloat(str);
    if (isNaN(num)) return null;
    // Se <= 1 e > 0, converte para percentagem (0.35 → 35)
    if (num > 0 && num <= 1) return num * 100;
    return num;
}

// ============================================================================
// LEITURA DE DADOS (Excel ou Texto colado)
// ============================================================================

interface RawData {
    rows: unknown[][];
    fonte: 'excel' | 'clipboard';
    avisos: string[];
}

/**
 * Lê um ficheiro Excel (.xlsx/.xls).
 * Procura a sheet 'P'; se não existir, usa a primeira e avisa.
 */
export async function lerExcel(file: File): Promise<RawData> {
    const avisos: string[] = [];
    const data = await file.arrayBuffer();

    // codepage 65001 = UTF-8 para preservar caracteres especiais
    const workbook = XLSX.read(data, {
        type: 'array',
        // codepage: 65001, // REMOVIDO: Permitir auto-deteção (o user pode ter ficheiros Windows-1252)
        raw: false,       // formata números mas preserva strings
    });

    let sheetName = 'P';
    if (!workbook.SheetNames.includes('P')) {
        sheetName = workbook.SheetNames[0];
        avisos.push(`Folha "P" não encontrada. A usar a folha "${sheetName}".`);
    }

    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: true,         // mantém valores raw para números
        defval: null,
    }) as unknown[][];

    return { rows, fonte: 'excel', avisos };
}

/**
 * Lê texto colado (tab-separated, como copy/paste do Excel).
 * Cada linha é separada por \n, colunas por \t.
 */
export function lerClipboard(texto: string): RawData {
    const linhas = texto.trim().split('\n');
    const rows = linhas.map(linha =>
        linha.split('\t').map(cell => {
            const trimmed = cell.trim();
            if (trimmed === '') return null;
            // Tenta converter para número se parecer número
            const numTest = trimmed.replace(',', '.');
            const num = parseFloat(numTest);
            if (!isNaN(num) && numTest === num.toString()) return num;
            return trimmed;
        })
    );

    return { rows, fonte: 'clipboard', avisos: [] };
}

// ============================================================================
// VALIDAÇÃO DE HEADERS
// ============================================================================

/**
 * Encontra a linha de headers nas primeiras 10 linhas e mapeia para campos BD.
 */
export function validarHeaders(rows: unknown[][]): HeaderValidation {
    const resultado: HeaderValidation = {
        headersEncontrados: {},
        headersDesconhecidos: [],
        headersObrigatoriosEmFalta: [],
        headersOpcionaisEmFalta: [],
        cenarioDesconto: 'cod_mpg_only', // default — será atualizado; se sem desconto, validação rejeita
        valido: false,
        erros: [],
        avisos: [],
        linhaHeader: -1,
    };

    if (rows.length === 0) {
        resultado.erros.push('O ficheiro/texto está vazio.');
        return resultado;
    }

    // Procurar header row nas primeiras 10 linhas
    let melhorLinha = -1;
    let melhorScore = 0;
    let melhorMapeamento: Record<string, number> = {};
    let melhorDesconhecidos: string[] = [];

    const maxLinhas = Math.min(rows.length, 10);

    for (let i = 0; i < maxLinhas; i++) {
        const row = rows[i];
        if (!row || row.length < 2) continue;

        const mapeamento: Record<string, number> = {};
        const desconhecidos: string[] = [];
        const usados = new Set<string>();
        let score = 0;

        for (let j = 0; j < row.length; j++) {
            const cellRaw = row[j];
            if (cellRaw === null || cellRaw === undefined) continue;
            const cellStr = String(cellRaw).trim();
            if (cellStr === '') continue;

            const normalizado = normalizarHeader(cellStr);
            const campo = HEADER_MAP[normalizado];

            if (campo && !usados.has(campo)) {
                mapeamento[campo] = j;
                usados.add(campo);
                score++;
            } else if (!campo && cellStr.length > 0) {
                // Só marca como desconhecido se parece um header (não é número)
                if (isNaN(Number(cellStr))) {
                    desconhecidos.push(cellStr);
                }
            }
        }

        if (score > melhorScore) {
            melhorScore = score;
            melhorLinha = i;
            melhorMapeamento = mapeamento;
            melhorDesconhecidos = desconhecidos;
        }
    }

    if (melhorLinha === -1 || melhorScore < 2) {
        resultado.erros.push(
            'Não foi possível identificar uma linha de headers válida nas primeiras 10 linhas. ' +
            'Certifica-te que o ficheiro tem os headers obrigatórios: Referência, Descrição, PVP.'
        );
        return resultado;
    }

    resultado.linhaHeader = melhorLinha;
    resultado.headersEncontrados = melhorMapeamento;
    resultado.headersDesconhecidos = melhorDesconhecidos;

    // Validar headers obrigatórios
    const obrigatorios: Array<{ campo: string; label: string }> = [
        { campo: 'referencia', label: 'Referência' },
        { campo: 'descricao', label: 'Descrição' },
        { campo: 'preco_tabela', label: 'PVP' },
    ];

    for (const { campo, label } of obrigatorios) {
        if (!(campo in melhorMapeamento)) {
            resultado.headersObrigatoriosEmFalta.push(label);
        }
    }

    // Verificar desconto / COD MPG — OBRIGATÓRIO (sem desconto = REJEIÇÃO TOTAL)
    const temCodMpg = 'grupo_desconto' in melhorMapeamento;
    const temDesconto = 'valor_desconto' in melhorMapeamento;

    if (!temCodMpg && !temDesconto) {
        resultado.headersObrigatoriosEmFalta.push('COD MPG ou Desconto');
        resultado.erros.push(
            '🚫 CRÍTICO: O ficheiro não contém nenhuma coluna de desconto (COD MPG ou Desconto). ' +
            'Sem informação de desconto, o ficheiro NÃO pode ser aceite. ' +
            'Adiciona pelo menos uma destas colunas ao ficheiro Excel.'
        );
        resultado.valido = false;
        // cenarioDesconto fica no default 'cod_mpg_only' mas valido=false impede qualquer upload
        return resultado;
    } else if (temCodMpg && temDesconto) {
        resultado.cenarioDesconto = 'cod_mpg_e_desconto';
    } else if (temCodMpg) {
        resultado.cenarioDesconto = 'cod_mpg_only';
    } else {
        resultado.cenarioDesconto = 'desconto_only';
    }

    // Headers opcionais em falta
    const opcionais: Array<{ campo: string; label: string }> = [
        { campo: 'familia', label: 'Família' },
        { campo: 'ean', label: 'Ean' },
        { campo: 'unidade', label: 'Unidade' },
        { campo: 'peso', label: 'Peso' },
        { campo: 'quantidade_minima', label: 'Quantidade' },
    ];

    for (const { campo, label } of opcionais) {
        if (!(campo in melhorMapeamento)) {
            resultado.headersOpcionaisEmFalta.push(label);
        }
    }

    // Avisos de headers desconhecidos - DESATIVADO a pedido do utilizador
    // if (melhorDesconhecidos.length > 0) {
    //     resultado.avisos.push(
    //         `Colunas ignoradas (não reconhecidas): ${melhorDesconhecidos.join(', ')}`
    //     );
    // }

    resultado.valido = resultado.headersObrigatoriosEmFalta.length === 0;

    if (!resultado.valido) {
        resultado.erros.push(
            `Headers obrigatórios em falta: ${resultado.headersObrigatoriosEmFalta.join(', ')}. ` +
            'Edita o ficheiro Excel e adiciona estes headers na folha "P".'
        );
    }

    return resultado;
}

// ============================================================================
// PROCESSAMENTO DE COMPONENTES
// ============================================================================

/**
 * Processa os dados (Excel ou clipboard) para componentes + descontos.
 * Requer que validarHeaders() tenha retornado valido=true.
 */
export function processarComponentes(
    rows: unknown[][],
    validation: HeaderValidation,
    idmarca: number,
    onProgress?: (status: ProcessingStatus) => void
): ParsedUploadData {
    const { headersEncontrados, linhaHeader, cenarioDesconto } = validation;
    const componentes: Componente[] = [];
    const descontosMap = new Map<string, number>(); // grupo → valor (para dedup)
    const erros: string[] = [];
    const avisos: string[] = [...validation.avisos];
    let linhasIgnoradas = 0;
    const linhasIgnoradasDetalhe: LinhaIgnorada[] = [];

    const startRow = linhaHeader + 1;
    const total = rows.length - startRow;

    onProgress?.({ fase: 'processando', progresso: 10, mensagem: 'A processar linhas...', total, atual: 0 });

    const getVal = (row: unknown[], campo: string) => {
        const idx = headersEncontrados[campo];
        return idx !== undefined ? row[idx] : null;
    };

    for (let i = startRow; i < rows.length; i++) {
        const row = rows[i];
        const linhaExcel = i + 1; // 1-indexed para o utilizador

        if (!row || row.length === 0) {
            linhasIgnoradas++;
            linhasIgnoradasDetalhe.push({ linhaExcel, referencia: null, motivo: 'Linha vazia' });
            continue;
        }

        // Progresso a cada 500 linhas
        if ((i - startRow) % 500 === 0) {
            const progresso = 10 + Math.floor(((i - startRow) / total) * 70);
            onProgress?.({ fase: 'processando', progresso, mensagem: `Linha ${i - startRow + 1} de ${total}...`, total, atual: i - startRow });
        }

        // Referência é obrigatória por linha
        const ref = limparValor(getVal(row, 'referencia'));
        if (!ref) {
            linhasIgnoradas++;
            linhasIgnoradasDetalhe.push({ linhaExcel, referencia: null, motivo: 'Sem referência' });
            continue;
        }

        // Descrição — preservar encoding exatamente como está
        const descricao = limparValor(getVal(row, 'descricao'));
        const preco = paraNumero(getVal(row, 'preco_tabela'));
        const familia = limparValor(getVal(row, 'familia'));
        const ean = limparValor(getVal(row, 'ean'));
        const unidade = limparValor(getVal(row, 'unidade')) || 'UN';
        const peso = paraNumero(getVal(row, 'peso'));
        const qtd = paraNumero(getVal(row, 'quantidade_minima'));

        // Grupo desconto e valor desconto
        let grupoDesconto = limparValor(getVal(row, 'grupo_desconto'));
        const valorDesconto = normalizarDesconto(getVal(row, 'valor_desconto'));

        // Cenário C: gerar grupo automático a partir do valor
        if (cenarioDesconto === 'desconto_only' && valorDesconto !== null) {
            grupoDesconto = `D${valorDesconto}`;
        }

        // Cenário B: guardar para tbldescontos
        if (cenarioDesconto === 'cod_mpg_e_desconto' && grupoDesconto && valorDesconto !== null) {
            descontosMap.set(grupoDesconto, valorDesconto);
        }

        // Cenário C: guardar para tbldescontos
        if (cenarioDesconto === 'desconto_only' && grupoDesconto && valorDesconto !== null) {
            descontosMap.set(grupoDesconto, valorDesconto);
        }

        componentes.push({
            idmarca,
            referencia: ref,
            descricao,
            familia,
            ean,
            preco_tabela: preco,
            grupo_desconto: grupoDesconto,
            unidade: unidade,
            quantidade_minima: qtd,
            peso,
        });
    }

    onProgress?.({ fase: 'processando', progresso: 85, mensagem: 'A finalizar...', total, atual: total });

    // Construir array de descontos a partir do map
    const descontos: Desconto[] = Array.from(descontosMap.entries()).map(([grupo, valor]) => ({
        idmarca,
        grupo_desconto: grupo,
        valor_desconto: valor,
        updated_at: new Date().toISOString(),
    }));

    // Avisos contextuais
    if (cenarioDesconto === 'desconto_only') {
        avisos.push(
            `⚠️ Cenário de desconto direto: ${descontos.length} grupo(s) automático(s) gerado(s) (ex: "D35"). ` +
            'Para maior organização, considera usar COD MPG no ficheiro.'
        );
    }

    if (linhasIgnoradas > 0) {
        avisos.push(
            `⚠️ ${linhasIgnoradas} linha(s) ignorada(s). ` +
            'Revê os detalhes abaixo e confirma se são linhas irrelevantes ou se há dados em falta.'
        );
    }

    onProgress?.({ fase: 'concluido', progresso: 100, mensagem: 'Processamento concluído!' });

    return {
        componentes,
        descontos,
        cenarioDesconto,
        totalLinhas: total,
        linhasIgnoradas,
        linhasIgnoradasDetalhe,
        erros,
        avisos,
    };
}

// ============================================================================
// PROCESSAMENTO DE DESCONTOS (standalone)
// ============================================================================

/**
 * Processa dados (Excel ou clipboard) para upload de descontos.
 * Headers obrigatórios: COD MPG, Desconto
 */
export function processarDescontosStandalone(
    rows: unknown[][],
    idmarca: number
): ParsedDescontosData {
    const descontos: Desconto[] = [];
    const erros: string[] = [];
    let linhasIgnoradas = 0;

    if (rows.length < 2) {
        return { descontos: [], totalLinhas: 0, linhasIgnoradas: 0, erros: ['Dados vazios ou sem linhas de dados.'] };
    }

    // Encontrar header row nas primeiras 10 linhas
    let linhaHeader = -1;
    let idxGrupo = -1;
    let idxDesconto = -1;

    for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const row = rows[i];
        if (!row) continue;

        for (let j = 0; j < row.length; j++) {
            const cell = row[j];
            if (cell === null || cell === undefined) continue;
            const norm = normalizarHeader(String(cell));

            if (HEADER_MAP[norm] === 'grupo_desconto' && idxGrupo === -1) {
                idxGrupo = j;
            }
            if (HEADER_MAP[norm] === 'valor_desconto' && idxDesconto === -1) {
                idxDesconto = j;
            }
        }

        if (idxGrupo !== -1 && idxDesconto !== -1) {
            linhaHeader = i;
            break;
        }

        // Reset for next row
        idxGrupo = -1;
        idxDesconto = -1;
    }

    if (linhaHeader === -1) {
        erros.push(
            'Headers obrigatórios não encontrados: COD MPG e Desconto. ' +
            'Certifica-te que as colunas têm os nomes corretos.'
        );
        return { descontos: [], totalLinhas: 0, linhasIgnoradas: 0, erros };
    }

    const startRow = linhaHeader + 1;
    const total = rows.length - startRow;

    for (let i = startRow; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) {
            linhasIgnoradas++;
            continue;
        }

        const grupo = limparValor(row[idxGrupo]);
        const valor = normalizarDesconto(row[idxDesconto]);

        if (!grupo || valor === null) {
            linhasIgnoradas++;
            continue;
        }

        descontos.push({
            idmarca,
            grupo_desconto: grupo,
            valor_desconto: valor,
            updated_at: new Date().toISOString(),
        });
    }

    if (descontos.length === 0 && erros.length === 0) {
        erros.push('Nenhum desconto válido encontrado. Verifica que os dados têm código de grupo e valor de desconto numérico.');
    }

    return { descontos, totalLinhas: total, linhasIgnoradas, erros };
}
