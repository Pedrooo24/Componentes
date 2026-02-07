import * as XLSX from 'xlsx';
import { MarcaConfig, Componente, ProcessingStatus } from '../types';

// ============================================================================
// LIMPEZA DE DADOS
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

// Remove acentos, lixo invisível e põe em minúsculas
function normalizar(texto: unknown): string {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/ç/g, 'c')
    .replace(/[\s\t\n\r\u00A0\u200B\uFEFF]+/g, ' ') // remove espaços invisíveis
    .replace(/\./g, '') // Remove pontos (P.V.P -> PVP)
    .trim();
}

// ============================================================================
// MAPEAMENTO (LÓGICA HIERÁRQUICA ESTRITA)
// ============================================================================

type CamposBD = 'referencia' | 'descricao' | 'familia' | 'ean' | 'preco_tabela' | 
                'grupo_desconto' | 'unidade' | 'quantidade_minima' | 'peso';

const CAMPOS_ORDEM: CamposBD[] = [
  'referencia', 'descricao', 'preco_tabela', 'ean', 'familia', 
  'grupo_desconto', 'unidade', 'quantidade_minima', 'peso'
];

// Fallbacks genéricos atualizados com 'fam' e 'actividad'
const FALLBACKS_GENERICOS: Record<CamposBD, string[]> = {
  referencia: ['referencia', 'ref', 'codigo', 'artigo'],
  descricao: ['descricao', 'designacao', 'description'],
  familia: ['familia', 'fam', 'actividad', 'category', 'grupo'], // ADICIONADO 'fam' e 'actividad'
  ean: ['ean', 'gtin', 'barcode'],
  preco_tabela: ['pvp', 'preco', 'price', 'eur', 'valor'], 
  grupo_desconto: ['mpg', 'desconto'],
  unidade: ['unidad', 'unit', 'un', 'emb'],
  quantidade_minima: ['quantidade', 'indivisible', 'minima', 'qtd'],
  peso: ['peso', 'weight']
};

function mapearColunas(
  headers: string[],
  marcaConfig: MarcaConfig
): { mapeamento: Record<CamposBD, number | undefined>; erros: string[] } {
  
  const mapeamento: Record<CamposBD, number | undefined> = {
    referencia: undefined, descricao: undefined, familia: undefined, ean: undefined,
    preco_tabela: undefined, grupo_desconto: undefined, unidade: undefined,
    quantidade_minima: undefined, peso: undefined
  };
  
  const erros: string[] = [];
  const colunasUsadas = new Set<number>(); 

  console.log(`[ExcelProcessor] A processar configuração para: ${marcaConfig.nome}`);

  for (const campo of CAMPOS_ORDEM) {
    let colunaEncontrada = -1;

    // === REGRA DE OURO DA FAMÍLIA (O QUE FALTAVA) ===
    if (campo === 'familia') {
      for (let i = 0; i < headers.length; i++) {
        if (colunasUsadas.has(i)) continue;
        const headerNorm = normalizar(headers[i]);
        // Se começa por 'fam' (ex: "fam.", "familia", "fam produto"), É A FAMÍLIA.
        if (headerNorm.startsWith('fam')) {
          colunaEncontrada = i;
          console.log(`[FAMILIA MATCH] Header "${headers[i]}" começa por "fam" -> ${campo}`);
          break;
        }
      }
    }

    // Se a regra de ouro da família não encontrou, continua para a lógica normal
    if (colunaEncontrada === -1) {
      
      // === PASSO 1: CONFIGURAÇÃO DA MARCA (PRIORIDADE MÁXIMA) ===
      for (const [excelColName, bdFieldName] of Object.entries(marcaConfig.colunaMap)) {
        if (bdFieldName !== campo) continue;
        
        const configNorm = normalizar(excelColName); 

        // 1.1: Procura EXATA
        for (let i = 0; i < headers.length; i++) {
          if (colunasUsadas.has(i)) continue;
          if (normalizar(headers[i]) === configNorm) {
            colunaEncontrada = i;
            console.log(`[MATCH EXATO] Config "${excelColName}" bateu com Header "${headers[i]}" -> ${campo}`);
            break;
          }
        }
        if (colunaEncontrada !== -1) break;

        // 1.2: Procura "CONTÉM" (Para PVP Abril, etc.)
        for (let i = 0; i < headers.length; i++) {
          if (colunasUsadas.has(i)) continue;
          const headerNorm = normalizar(headers[i]);
          
          if (headerNorm.includes(configNorm)) {
            if (configNorm.length < 3 && headerNorm !== configNorm) continue;
            colunaEncontrada = i;
            console.log(`[MATCH PARCIAL] Config "${excelColName}" encontrada em "${headers[i]}" -> ${campo}`);
            break;
          }
        }
        if (colunaEncontrada !== -1) break;
      }
    }

    // === PASSO 2: GENÉRICOS (SÓ SE O PASSO 1 FALHAR) ===
    if (colunaEncontrada === -1) {
      const padroes = FALLBACKS_GENERICOS[campo];
      for (let i = 0; i < headers.length; i++) {
        if (colunasUsadas.has(i)) continue;
        
        const headerNorm = normalizar(headers[i]);
        
        if (padroes.some(p => headerNorm.includes(p))) {
          colunaEncontrada = i;
          console.log(`[FALLBACK] Header "${headers[i]}" reconhecido como ${campo}`);
          break;
        }
      }
    }

    // === FINALIZAR CAMPO ===
    if (colunaEncontrada !== -1) {
      mapeamento[campo] = colunaEncontrada;
      colunasUsadas.add(colunaEncontrada);
    } else {
      console.warn(`[AVISO] Campo "${campo}" não encontrado.`);
    }
  }

  // Validação Crítica
  if (mapeamento.referencia === undefined) {
    erros.push('ERRO: Coluna de Referência não encontrada. Verifique se o ficheiro está correto.');
  }

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
    onProgress?.({ fase: 'lendo', progresso: 10, mensagem: 'A ler ficheiro...' });

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });

    // Seleção de folha
    let sheetName = marcaConfig.sheetName;
    if (!workbook.SheetNames.includes(sheetName)) {
      sheetName = workbook.SheetNames[0]; 
    }

    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

    if (rows.length < 2) throw new Error('Ficheiro vazio');

    onProgress?.({ fase: 'processando', progresso: 20, mensagem: 'A mapear colunas...' });

    // 1. Encontrar linha de cabeçalho
    let linhaHeaderIdx = 0;
    for (let i = 0; i < Math.min(rows.length, 50); i++) {
      const rowStr = JSON.stringify(rows[i]).toLowerCase();
      // Verificação mais robusta para encontrar a linha certa
      if (rowStr.includes('referencia') || rowStr.includes('ref') || (rowStr.includes('codigo') && rowStr.includes('descricao'))) {
        linhaHeaderIdx = i;
        break;
      }
    }
    
    const headers = (rows[linhaHeaderIdx] || []).map(c => String(c ?? '').trim());
    console.log('[ExcelProcessor] Headers:', headers);

    // 2. Mapear
    const { mapeamento, erros: errosMap } = mapearColunas(headers, marcaConfig);
    erros.push(...errosMap);

    if (mapeamento.referencia === undefined) {
      return { componentes: [], erros, linhasProcessadas: 0, linhasIgnoradas: 0 };
    }

    // 3. Extrair
    const startRow = linhaHeaderIdx + 1;
    const total = rows.length - startRow;

    onProgress?.({ fase: 'processando', progresso: 30, mensagem: 'A extrair dados...', total, atual: 0 });

    for (let i = startRow; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      if (i % 200 === 0) {
        onProgress?.({ 
            fase: 'processando', 
            progresso: 30 + Math.floor(((i - startRow) / total) * 60), 
            mensagem: `Linha ${i}...` 
        });
        await new Promise(r => setTimeout(r, 0));
      }

      const ref = limparValor(row[mapeamento.referencia!]);
      if (!ref) {
        linhasIgnoradas++;
        continue;
      }

      const getVal = (idx: number | undefined) => idx !== undefined ? row[idx] : null;

      componentes.push({
        idmarca,
        referencia: ref,
        descricao: limparValor(getVal(mapeamento.descricao)),
        familia: limparValor(getVal(mapeamento.familia)),
        ean: limparValor(getVal(mapeamento.ean)),
        preco_tabela: paraNumero(getVal(mapeamento.preco_tabela)),
        grupo_desconto: limparValor(getVal(mapeamento.grupo_desconto)),
        unidade: limparValor(getVal(mapeamento.unidade)) || 'UN',
        quantidade_minima: paraNumero(getVal(mapeamento.quantidade_minima)),
        peso: paraNumero(getVal(mapeamento.peso)),
      });
    }

    onProgress?.({ fase: 'concluido', progresso: 100, mensagem: 'Concluído!' });

    return { componentes, erros, linhasProcessadas: componentes.length, linhasIgnoradas };

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    return { componentes: [], erros: [msg], linhasProcessadas: 0, linhasIgnoradas: 0 };
  }
}