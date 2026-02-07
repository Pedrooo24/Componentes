import * as XLSX from 'xlsx';
import { MarcaConfig, Componente, ProcessingStatus } from '../types';

// ============================================================================
// MAPEAMENTO EXATO SCHNEIDER - DEFINIDO PELO UTILIZADOR (PRIORIDADE MÁXIMA!)
// Este mapeamento é testado PRIMEIRO, antes de qualquer outra pesquisa
// ============================================================================
const SCHNEIDER_MAPEAMENTO_EXATO: Record<string, string> = {
  // === MAPEAMENTO ORIGINAL EXATO (como está no Excel → campo BD) ===
  'referência': 'referencia',
  'referencia': 'referencia',
  'ref': 'referencia',
  'ref.': 'referencia',
  'descrição': 'descricao',
  'descricao': 'descricao',
  'descripcion': 'descricao',
  'actividad': 'familia',
  'actividade': 'familia',
  'familia': 'familia',
  'ean-13': 'ean',
  'ean': 'ean',
  'ean13': 'ean',
  'pvp': 'preco_tabela',
  'preco': 'preco_tabela',
  'precio': 'preco_tabela',
  'cod mpg': 'grupo_desconto',
  'mpg': 'grupo_desconto',
  'unidad': 'unidade',
  'unidade': 'unidade',
  'un': 'unidade',
  'quantidade indivisible': 'quantidade_minima',
  'cantidad indivisible': 'quantidade_minima',
  'quantidade': 'quantidade_minima',
  'qty': 'quantidade_minima',
  'peso bruto': 'peso',
  'peso': 'peso',
};

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

function limparValor(valor: unknown): string | null {
  if (valor === undefined || valor === null) return null;
  const str = String(valor).trim();
  if (str === '' || str.toLowerCase() === 'nan') return null;
  return str;
}

function paraNumero(valor: unknown): number | null {
  if (valor === undefined || valor === null) return null;
  const str = String(valor).trim().replace(',', '.');
  if (str === '' || str.toLowerCase() === 'nan') return null;
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

/**
 * Normaliza texto para comparação:
 * - minúsculas
 * - remove acentos
 * - mantém espaços e hífens para matching exato
 */
function normalizar(texto: unknown): string {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/ç/g, 'c')
    .trim();
}

/**
 * Normaliza para comparação mais flexível (sem caracteres especiais)
 */
function normalizarFlex(texto: unknown): string {
  return normalizar(texto)
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================================
// DETEÇÃO DE HEADER - PROCURA LINHA A LINHA COMEÇANDO PELA 1
// ============================================================================

/**
 * Verifica se uma linha parece ser um header (tem colunas típicas)
 */
function linhaTemHeader(row: unknown[]): { score: number; temReferencia: boolean } {
  if (!row || !Array.isArray(row)) return { score: 0, temReferencia: false };
  
  let score = 0;
  let temReferencia = false;
  
  for (const cell of row) {
    const norm = normalizar(cell);
    if (!norm || norm.length < 2) continue;
    
    // Referência (mais importante)
    if (norm === 'referencia' || norm === 'ref' || norm.includes('referencia')) {
      score += 100;
      temReferencia = true;
    }
    // Descrição
    else if (norm.includes('descricao') || norm.includes('descripcion') || norm === 'descricao') {
      score += 20;
    }
    // Preço
    else if (norm === 'pvp' || norm.includes('pvp') || norm.includes('preco') || norm.includes('precio')) {
      score += 15;
    }
    // EAN
    else if (norm.includes('ean') || norm === 'ean-13' || norm === 'ean13') {
      score += 10;
    }
    // Família
    else if (norm === 'actividad' || norm.includes('familia') || norm.startsWith('fam')) {
      score += 10;
    }
    // Unidade
    else if (norm === 'unidad' || norm === 'unidade' || norm === 'un') {
      score += 5;
    }
    // Quantidade
    else if (norm.includes('quantidade') || norm.includes('qty') || norm.includes('qtd')) {
      score += 5;
    }
    // Peso
    else if (norm.includes('peso') || norm === 'peso bruto') {
      score += 5;
    }
  }
  
  return { score, temReferencia };
}

/**
 * Encontra a linha que contém os headers.
 * COMEÇA PELA LINHA 1, depois 2, 3... até encontrar uma linha com "Referência"
 * Se não encontrar, tenta linha 0.
 */
function encontrarLinhaHeader(rows: unknown[][]): number {
  const maxLinhas = Math.min(rows.length, 50); // Procura até 50 linhas
  
  console.log('[ExcelProcessor] === A PROCURAR LINHA DE HEADERS ===');
  
  // ESTRATÉGIA: Procura linha a linha até encontrar uma com "Referência" ou similar
  for (let i = 0; i < maxLinhas; i++) {
    const row = rows[i];
    if (!row || !Array.isArray(row)) continue;
    
    // Verifica cada célula desta linha
    for (const cell of row) {
      const cellNorm = normalizar(cell);
      
      // Se encontrar "referência" ou "ref" como header, esta é a linha!
      if (cellNorm === 'referencia' || 
          cellNorm === 'referência' ||
          cellNorm === 'ref' || 
          cellNorm === 'ref.' ||
          cellNorm.includes('referencia')) {
        console.log(`[ExcelProcessor] ✓ HEADER ENCONTRADO NA LINHA ${i + 1} (encontrou: "${cell}")`);
        return i;
      }
    }
  }
  
  // Se não encontrou "Referência", procura qualquer linha com score alto
  console.log('[ExcelProcessor] ⚠ "Referência" não encontrada explicitamente. A usar scoring...');
  
  let melhorLinha = 0;
  let melhorScore = 0;
  
  for (let i = 0; i < maxLinhas; i++) {
    const { score, temReferencia } = linhaTemHeader(rows[i]);
    
    if (score > melhorScore) {
      melhorScore = score;
      melhorLinha = i;
    }
    
    if (temReferencia) {
      console.log(`[ExcelProcessor] Linha ${i + 1} tem referência, score=${score}`);
      return i;
    }
  }
  
  if (melhorScore > 0) {
    console.log(`[ExcelProcessor] ⚠ A usar linha ${melhorLinha + 1} (melhor score: ${melhorScore})`);
    return melhorLinha;
  }
  
  // Último fallback: assume linha 1 (índice 0)
  console.warn('[ExcelProcessor] ⚠ Não encontrou header. A assumir linha 1.');
  return 0;
}

// ============================================================================
// MAPEAMENTO DE COLUNAS - 4 NÍVEIS PROGRESSIVOS
// ============================================================================

type CamposBD = 'referencia' | 'descricao' | 'familia' | 'ean' | 'preco_tabela' | 
                'grupo_desconto' | 'unidade' | 'quantidade_minima' | 'peso';

const CAMPOS_ORDEM: CamposBD[] = [
  'referencia',      // PRIMEIRO - obrigatório
  'descricao',
  'preco_tabela',
  'ean',
  'familia',
  'grupo_desconto',
  'unidade',
  'quantidade_minima',
  'peso'
];

// Padrões de fallback por campo (do mais específico ao mais genérico)
const FALLBACK_PATTERNS: Record<CamposBD, { contem: string[]; comeca: string[] }> = {
  referencia: {
    contem: ['referencia', 'reference', 'codigo', 'code'],
    comeca: ['ref', 'cod']
  },
  descricao: {
    contem: ['descricao', 'descripcion', 'description', 'designacao'],
    comeca: ['desc', 'desig']
  },
  familia: {
    contem: ['familia', 'family', 'actividad', 'categoria', 'segmento'],
    comeca: ['fam', 'activ', 'categ']
  },
  ean: {
    contem: ['ean', 'gtin', 'barcode'],
    comeca: ['ean']
  },
  preco_tabela: {
    contem: ['pvp', 'preco', 'precio', 'price', 'tarifa'],
    comeca: ['pvp', 'prec', 'preci', 'price']
  },
  grupo_desconto: {
    contem: ['mpg', 'desconto', 'discount'],
    comeca: ['cod mpg', 'mpg', 'desc']
  },
  unidade: {
    contem: ['unidad', 'unidade', 'unit'],
    comeca: ['unid', 'unit', 'un']
  },
  quantidade_minima: {
    contem: ['quantidade', 'quantity', 'indivisible', 'minima'],
    comeca: ['qtd', 'qty', 'quant']
  },
  peso: {
    contem: ['peso', 'weight'],
    comeca: ['peso', 'weight']
  }
};

/**
 * Mapeia colunas do Excel para campos da BD usando 4 níveis de pesquisa:
 * 1. EXATO - Mapeamento Schneider definido pelo utilizador (PRIORIDADE MÁXIMA!)
 * 2. EXATO NORMALIZADO - colunaMap da marca
 * 3. CONTÉM - Header contém o padrão
 * 4. COMEÇA COM - Header começa com o padrão
 */
function mapearColunas(
  headers: string[],
  marcaConfig: MarcaConfig
): { mapeamento: Record<CamposBD, number | undefined>; erros: string[] } {
  const mapeamento: Record<CamposBD, number | undefined> = {
    referencia: undefined,
    descricao: undefined,
    familia: undefined,
    ean: undefined,
    preco_tabela: undefined,
    grupo_desconto: undefined,
    unidade: undefined,
    quantidade_minima: undefined,
    peso: undefined
  };
  
  const usadas = new Set<number>();
  const erros: string[] = [];
  
  console.log('[ExcelProcessor] ═══════════════════════════════════════════');
  console.log('[ExcelProcessor] INÍCIO DO MAPEAMENTO DE COLUNAS');
  console.log('[ExcelProcessor] Headers encontrados:', headers);
  console.log('[ExcelProcessor] ═══════════════════════════════════════════');
  
  // Primeiro, vamos normalizar todos os headers para debug
  const headersNorm = headers.map((h, i) => `[${i}] "${h}" → "${normalizar(h)}"`);
  console.log('[ExcelProcessor] Headers normalizados:\n' + headersNorm.join('\n'));
  
  // Para cada campo, tenta encontrar a coluna correspondente
  for (const campo of CAMPOS_ORDEM) {
    let colunaEncontrada = -1;
    let metodoUsado = '';
    
    // === NÍVEL 1: MAPEAMENTO EXATO SCHNEIDER (PRIORIDADE MÁXIMA!) ===
    // Testa cada header contra TODOS os aliases do mapeamento Schneider
    for (let i = 0; i < headers.length; i++) {
      if (usadas.has(i)) continue;
      if (!headers[i] || headers[i].toString().trim() === '') continue;
      
      const headerNorm = normalizar(headers[i]);
      
      // Procura no mapeamento Schneider
      for (const [excelCol, bdCol] of Object.entries(SCHNEIDER_MAPEAMENTO_EXATO)) {
        if (bdCol !== campo) continue;
        
        const excelNorm = normalizar(excelCol);
        
        // Match exato (após normalização)
        if (headerNorm === excelNorm) {
          colunaEncontrada = i;
          metodoUsado = `EXATO Schneider ("${excelCol}")`;
          break;
        }
      }
      if (colunaEncontrada !== -1) break;
    }
    
    // === NÍVEL 2: MAPEAMENTO DA MARCA (colunaMap) ===
    if (colunaEncontrada === -1) {
      for (let i = 0; i < headers.length; i++) {
        if (usadas.has(i)) continue;
        if (!headers[i] || headers[i].toString().trim() === '') continue;
        
        const headerNorm = normalizar(headers[i]);
        
        for (const [excelCol, bdCol] of Object.entries(marcaConfig.colunaMap)) {
          if (bdCol !== campo) continue;
          
          const excelNorm = normalizar(excelCol);
          
          if (headerNorm === excelNorm) {
            colunaEncontrada = i;
            metodoUsado = `colunaMap ("${excelCol}")`;
            break;
          }
        }
        if (colunaEncontrada !== -1) break;
      }
    }
    
    // === NÍVEL 3: CONTÉM (header contém o padrão) ===
    if (colunaEncontrada === -1) {
      const patterns = FALLBACK_PATTERNS[campo];
      
      for (let i = 0; i < headers.length; i++) {
        if (usadas.has(i)) continue;
        if (!headers[i] || headers[i].toString().trim() === '') continue;
        
        const headerNorm = normalizarFlex(headers[i]);
        
        for (const pattern of patterns.contem) {
          if (headerNorm.includes(pattern)) {
            colunaEncontrada = i;
            metodoUsado = `CONTÉM "${pattern}"`;
            break;
          }
        }
        if (colunaEncontrada !== -1) break;
      }
    }
    
    // === NÍVEL 4: COMEÇA COM ===
    if (colunaEncontrada === -1) {
      const patterns = FALLBACK_PATTERNS[campo];
      
      for (let i = 0; i < headers.length; i++) {
        if (usadas.has(i)) continue;
        if (!headers[i] || headers[i].toString().trim() === '') continue;
        
        const headerNorm = normalizarFlex(headers[i]);
        
        for (const pattern of patterns.comeca) {
          if (headerNorm.startsWith(pattern)) {
            colunaEncontrada = i;
            metodoUsado = `COMEÇA COM "${pattern}"`;
            break;
          }
        }
        if (colunaEncontrada !== -1) break;
      }
    }
    
    // Registar resultado
    if (colunaEncontrada !== -1) {
      mapeamento[campo] = colunaEncontrada;
      usadas.add(colunaEncontrada);
      console.log(`[ExcelProcessor] ✓ "${campo}" → Coluna ${colunaEncontrada + 1}: "${headers[colunaEncontrada]}" (${metodoUsado})`);
    } else {
      console.warn(`[ExcelProcessor] ✗ "${campo}" → NÃO ENCONTRADO`);
    }
  }
  
  // === FALLBACK ESPECIAL PARA FAMILIA: qualquer coisa com "fam" ===
  if (mapeamento.familia === undefined) {
    for (let i = 0; i < headers.length; i++) {
      if (usadas.has(i)) continue;
      if (!headers[i]) continue;
      
      const headerNorm = normalizar(headers[i]);
      if (headerNorm.includes('fam') || headerNorm.startsWith('fam')) {
        mapeamento.familia = i;
        usadas.add(i);
        console.log(`[ExcelProcessor] ✓ "familia" (FALLBACK fam*) → Coluna ${i + 1}: "${headers[i]}"`);
        break;
      }
    }
  }
  
  // === FALLBACK ESPECIAL PARA QUANTIDADE_MINIMA ===
  if (mapeamento.quantidade_minima === undefined) {
    for (let i = 0; i < headers.length; i++) {
      if (usadas.has(i)) continue;
      if (!headers[i]) continue;
      
      const headerNorm = normalizar(headers[i]);
      if (headerNorm.includes('quantidade') || 
          headerNorm.includes('qty') || 
          headerNorm.includes('qtd') ||
          headerNorm.includes('cantidad')) {
        mapeamento.quantidade_minima = i;
        usadas.add(i);
        console.log(`[ExcelProcessor] ✓ "quantidade_minima" (FALLBACK) → Coluna ${i + 1}: "${headers[i]}"`);
        break;
      }
    }
  }
  
  // Verificar campo obrigatório
  if (mapeamento.referencia === undefined) {
    erros.push('ERRO CRÍTICO: Coluna "Referência" não encontrada!');
    erros.push(`Colunas disponíveis: ${headers.filter(h => h?.toString().trim()).join(' | ')}`);
  }
  
  console.log('[ExcelProcessor] ═══════════════════════════════════════════');
  console.log('[ExcelProcessor] RESULTADO DO MAPEAMENTO:');
  for (const [campo, idx] of Object.entries(mapeamento)) {
    if (idx !== undefined) {
      console.log(`  ✓ ${campo}: Coluna ${idx + 1} ("${headers[idx]}")`);
    } else {
      console.log(`  ✗ ${campo}: NÃO MAPEADO`);
    }
  }
  console.log('[ExcelProcessor] ═══════════════════════════════════════════');
  
  return { mapeamento, erros };
}

// ============================================================================
// PROCESSAMENTO PRINCIPAL
// ============================================================================

export interface ProcessarExcelResult {
  componentes: Componente[];
  erros: string[];
  linhasProcessadas: number;
  linhasIgnoradas: number;
}

export async function processarExcel(
  file: File,
  marcaConfig: MarcaConfig,
  idmarca: number,
  onProgress?: (status: ProcessingStatus) => void
): Promise<ProcessarExcelResult> {
  const erros: string[] = [];
  const componentes: Componente[] = [];
  let linhasIgnoradas = 0;

  try {
    onProgress?.({
      fase: 'lendo',
      progresso: 10,
      mensagem: `A ler ficheiro ${file.name}...`,
    });

    // Ler ficheiro Excel
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });

    console.log('[ExcelProcessor] Folhas disponíveis:', workbook.SheetNames);

    // Encontrar folha (tenta a configurada, senão usa a primeira)
    let sheetName = marcaConfig.sheetName;
    if (!workbook.SheetNames.includes(sheetName)) {
      // Tenta encontrar folha com nome parecido
      const folhaSimilar = workbook.SheetNames.find(s => 
        normalizar(s).includes(normalizar(sheetName)) ||
        normalizar(sheetName).includes(normalizar(s))
      );
      
      if (folhaSimilar) {
        console.log(`[ExcelProcessor] Folha "${sheetName}" não encontrada, a usar "${folhaSimilar}"`);
        sheetName = folhaSimilar;
      } else {
        const primeira = workbook.SheetNames[0];
        if (primeira) {
          console.log(`[ExcelProcessor] Folha "${sheetName}" não encontrada, a usar primeira: "${primeira}"`);
          erros.push(`Aviso: Folha "${marcaConfig.sheetName}" não encontrada. A usar "${primeira}".`);
          sheetName = primeira;
        } else {
          erros.push('Ficheiro Excel vazio (sem folhas)');
          return { componentes: [], erros, linhasProcessadas: 0, linhasIgnoradas: 0 };
        }
      }
    }

    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

    console.log(`[ExcelProcessor] Total de linhas no ficheiro: ${rows.length}`);

    if (rows.length < 2) {
      erros.push('Ficheiro vazio ou com dados insuficientes');
      return { componentes: [], erros, linhasProcessadas: 0, linhasIgnoradas: 0 };
    }

    onProgress?.({
      fase: 'processando',
      progresso: 20,
      mensagem: 'A procurar cabeçalhos...',
    });

    // PASSO 1: Encontrar linha dos headers
    const linhaHeader = encontrarLinhaHeader(rows);
    const headers = (rows[linhaHeader] || []).map(c => String(c ?? '').trim());
    
    console.log(`[ExcelProcessor] Linha do header: ${linhaHeader + 1}`);
    console.log(`[ExcelProcessor] Headers:`, headers);

    onProgress?.({
      fase: 'processando',
      progresso: 30,
      mensagem: `Cabeçalho na linha ${linhaHeader + 1}. A mapear colunas...`,
    });

    // PASSO 2: Mapear colunas
    const { mapeamento, erros: errosMapeamento } = mapearColunas(headers, marcaConfig);
    erros.push(...errosMapeamento);

    if (mapeamento.referencia === undefined) {
      return { componentes: [], erros, linhasProcessadas: 0, linhasIgnoradas: 0 };
    }

    // PASSO 3: Processar linhas de dados
    const linhaInicioDados = linhaHeader + 1;
    const totalLinhas = rows.length - linhaInicioDados;

    onProgress?.({
      fase: 'processando',
      progresso: 40,
      mensagem: `A processar ${totalLinhas} linhas...`,
      total: totalLinhas,
      atual: 0,
    });

    for (let i = linhaInicioDados; i < rows.length; i++) {
      const row = rows[i] as unknown[];
      if (!row || row.length === 0) {
        linhasIgnoradas++;
        continue;
      }

      // Atualizar progresso a cada 100 linhas
      if ((i - linhaInicioDados) % 100 === 0) {
        onProgress?.({
          fase: 'processando',
          progresso: 40 + Math.floor(((i - linhaInicioDados) / totalLinhas) * 40),
          mensagem: `A processar linha ${i - linhaInicioDados + 1} de ${totalLinhas}...`,
          total: totalLinhas,
          atual: i - linhaInicioDados,
        });
      }

      // Obter referência (obrigatório)
      const referencia = limparValor(row[mapeamento.referencia!]);
      if (!referencia) {
        linhasIgnoradas++;
        continue;
      }

      // Construir componente com valores default para campos NOT NULL
      // Extrair valores com fallbacks seguros
      const descricaoVal = mapeamento.descricao !== undefined 
        ? limparValor(row[mapeamento.descricao]) 
        : null;
      
      const familiaVal = mapeamento.familia !== undefined 
        ? limparValor(row[mapeamento.familia]) 
        : null;
      
      const eanVal = mapeamento.ean !== undefined 
        ? limparValor(row[mapeamento.ean]) 
        : null;
      
      const precoVal = mapeamento.preco_tabela !== undefined 
        ? paraNumero(row[mapeamento.preco_tabela]) 
        : null;
      
      const grupoDescontoVal = mapeamento.grupo_desconto !== undefined 
        ? limparValor(row[mapeamento.grupo_desconto]) 
        : null;
      
      // UNIDADE: Campo NOT NULL - usar 'UN' se vazio
      let unidadeVal = mapeamento.unidade !== undefined 
        ? limparValor(row[mapeamento.unidade])
        : null;
      if (!unidadeVal || unidadeVal.trim() === '') {
        unidadeVal = 'UN';
      }
      
      const qtdMinimaVal = mapeamento.quantidade_minima !== undefined 
        ? paraNumero(row[mapeamento.quantidade_minima]) 
        : null;
      
      const pesoVal = mapeamento.peso !== undefined 
        ? paraNumero(row[mapeamento.peso]) 
        : null;

      const componente: Componente = {
        idmarca: idmarca,
        referencia: referencia,
        descricao: descricaoVal,
        familia: familiaVal,
        ean: eanVal,
        preco_tabela: precoVal,
        grupo_desconto: grupoDescontoVal,
        unidade: unidadeVal,
        quantidade_minima: qtdMinimaVal,
        peso: pesoVal,
      };

      componentes.push(componente);
    }

    onProgress?.({
      fase: 'concluido',
      progresso: 80,
      mensagem: `${componentes.length} componentes prontos para inserir (${linhasIgnoradas} linhas ignoradas)`,
      total: componentes.length,
      atual: componentes.length,
    });

    return {
      componentes,
      erros,
      linhasProcessadas: componentes.length,
      linhasIgnoradas,
    };

  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    erros.push(`Erro ao processar ficheiro: ${mensagem}`);
    console.error('[ExcelProcessor] Erro:', error);
    return { componentes: [], erros, linhasProcessadas: 0, linhasIgnoradas: 0 };
  }
}
