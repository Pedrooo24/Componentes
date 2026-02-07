import { MarcaConfig } from '../types';

// Configuração dos scripts de processamento por marca
// A marca vem da base de dados (tblmarca), aqui só definimos como processar cada ficheiro

export const MARCAS_PROCESSAMENTO: Record<number, MarcaConfig> = {
  // Schneider Electric - idmarca = 1
  1: {
    id: 1,
    nome: 'Schneider Electric',
    sheetName: 'TP', // Nome da folha Excel
    colunaMap: {
      'Referência': 'referencia',
      'Ref': 'referencia',
      'Ref.': 'referencia',
      'Descrição': 'descricao',
      'Descripcion': 'descricao',
      'Descripción': 'descricao',
      'Actividad': 'familia',
      'Actividade': 'familia',
      'Atividade': 'familia',
      'Família': 'familia',
      'Familia': 'familia',
      'Fam': 'familia',
      'Fam.': 'familia',
      'Fam/': 'familia',
      'EAN-13': 'ean',
      'EAN': 'ean',
      'PVP': 'preco_tabela',
      'Precio': 'preco_tabela',
      'Preço': 'preco_tabela',
      'COD MPG': 'grupo_desconto',
      'Unidad': 'unidade',
      'Unidade': 'unidade',
      'Quantidade indivisible': 'quantidade_minima',
      'Cantidad indivisible': 'quantidade_minima',
      'Peso Bruto': 'peso',
      'Peso': 'peso'
    }
  },
  // Adiciona mais marcas aqui conforme necessário:
  // 2: {
  //   id: 2,
  //   nome: 'ABB',
  //   sheetName: 'Preços',
  //   colunaMap: { ... }
  // },
};

export function getMarcaConfig(idmarca: number): MarcaConfig | null {
  return MARCAS_PROCESSAMENTO[idmarca] || null;
}

export function hasMarcaConfig(idmarca: number): boolean {
  return idmarca in MARCAS_PROCESSAMENTO;
}
