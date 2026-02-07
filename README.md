# 🔌 Gestor de Componentes - Sistema de Orçamentos Elergos

Sistema web para importação de preços de fornecedores para a base de dados de orçamentos.

## ✨ Funcionalidades

- **📊 Importação de Excel**: Upload de ficheiros de preços de fornecedores
- **🏷️ Seleção de Marca**: Modal para escolher a marca ao fazer upload
- **📦 Visualização**: Tabela paginada com pesquisa e filtros por marca
- **💾 Supabase**: Conexão segura via REST API

## 🚀 Como usar

### 1. Configuração Inicial

Ao abrir a aplicação pela primeira vez, verás a página de setup:

1. Vai ao teu projeto no [Supabase Dashboard](https://supabase.com/dashboard)
2. Clica em **Settings** → **API**
3. Copia o **Project URL** e a **anon public key**
4. Cola na aplicação e clica **Conectar**

### 2. Estrutura da Base de Dados

Certifica-te que tens as seguintes tabelas no Supabase:

```sql
-- Tabela de marcas (já deves ter)
CREATE TABLE IF NOT EXISTS tblmarca (
  idmarca SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL
);

-- Inserir a Schneider se ainda não existe
INSERT INTO tblmarca (idmarca, nome) VALUES (1, 'Schneider Electric')
ON CONFLICT (idmarca) DO NOTHING;

-- Tabela de componentes
CREATE TABLE IF NOT EXISTS tblcomponentes (
  idcomponente SERIAL PRIMARY KEY,
  idmarca INTEGER NOT NULL,
  referencia VARCHAR(100) NOT NULL,
  descricao TEXT,
  familia VARCHAR(50),
  ean VARCHAR(20),
  preco_tabela DECIMAL(10,2),
  grupo_desconto VARCHAR(20),
  unidade VARCHAR(10),
  quantidade_minima INTEGER,
  peso DECIMAL(10,3),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(idmarca, referencia)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_componentes_marca ON tblcomponentes(idmarca);
CREATE INDEX IF NOT EXISTS idx_componentes_referencia ON tblcomponentes(referencia);
```

### 3. Configurar RLS (Row Level Security)

```sql
-- Opção simples (para desenvolvimento)
ALTER TABLE tblcomponentes DISABLE ROW LEVEL SECURITY;
ALTER TABLE tblmarca DISABLE ROW LEVEL SECURITY;

-- OU criar políticas (para produção)
ALTER TABLE tblcomponentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON tblcomponentes FOR ALL USING (true);

ALTER TABLE tblmarca ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow select" ON tblmarca FOR SELECT USING (true);
```

### 4. Upload de Ficheiros

1. Clica no separador **Upload**
2. Arrasta o ficheiro Excel ou clica para selecionar
3. Um popup aparece para selecionares a marca
4. Clica em **Processar** para importar

## 🏷️ Adicionar Novas Marcas

Para adicionar suporte a uma nova marca, edita `src/config/marcas.ts`:

```typescript
export const MARCAS_PROCESSAMENTO: Record<number, MarcaConfig> = {
  // Schneider já existe (idmarca = 1)
  1: {
    id: 1,
    nome: 'Schneider Electric',
    sheetName: 'TP',
    colunaMap: {
      'Referência': 'referencia',
      'Descrição': 'descricao',
      // ...
    }
  },
  
  // Adiciona nova marca aqui (idmarca = 2)
  2: {
    id: 2,
    nome: 'ABB',
    sheetName: 'Preços',  // Nome da folha no Excel da ABB
    colunaMap: {
      'Código': 'referencia',  // Mapeia colunas do Excel ABB
      'Nome Produto': 'descricao',
      'Preço': 'preco_tabela',
      // ...
    }
  },
};
```

**Importante**: A marca também precisa existir na tabela `tblmarca` do Supabase com o mesmo `idmarca`.

## 📋 Mapeamento Schneider (idmarca = 1)

| Coluna Excel | Campo BD |
|--------------|----------|
| Referência | referencia |
| Descrição | descricao |
| Actividade | familia |
| EAN-13 | ean |
| PVP | preco_tabela |
| COD MPG | grupo_desconto |
| Unidad | unidade |
| Quantidade indivisible | quantidade_minima |
| Peso Bruto | peso |

**Folha Excel**: `TP`

## 🗄️ Histórico de Preços (Opcional)

Para guardar automaticamente o histórico quando os preços mudam:

```sql
-- Tabela de histórico
CREATE TABLE tblcomponentes_historico (
  id SERIAL PRIMARY KEY,
  idcomponente INTEGER REFERENCES tblcomponentes(idcomponente),
  preco_tabela_anterior DECIMAL(10,2),
  preco_tabela_novo DECIMAL(10,2),
  data_alteracao TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger automático
CREATE OR REPLACE FUNCTION log_preco_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.preco_tabela IS DISTINCT FROM NEW.preco_tabela THEN
    INSERT INTO tblcomponentes_historico 
      (idcomponente, preco_tabela_anterior, preco_tabela_novo)
    VALUES 
      (NEW.idcomponente, OLD.preco_tabela, NEW.preco_tabela);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_preco
  BEFORE UPDATE ON tblcomponentes
  FOR EACH ROW EXECUTE FUNCTION log_preco_change();
```

## 🛠️ Desenvolvimento

```bash
# Instalar dependências
npm install

# Correr em modo desenvolvimento
npm run dev

# Build para produção
npm run build
```

## 💡 Arquitetura Recomendada

1. **Organização de Ficheiros**: Guarda os ficheiros por data
   - `/precos/2024-01/schneider.xlsx`
   - `/precos/2024-01/abb.xlsx`

2. **Automatização Futura**: 
   - Usa Supabase Storage para guardar os ficheiros
   - Cria Edge Functions para processar automaticamente

3. **Histórico**: 
   - O trigger SQL guarda automaticamente quando preços mudam
   - Consulta `tblcomponentes_historico` para ver evolução

---

Desenvolvido para o Sistema de Orçamentos Elergos • 2024
