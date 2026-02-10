/**
 * Utilitários de Formatação Centralizados
 * Garantem consistência visual em toda a aplicação
 */

/**
 * Formata um valor numérico como percentagem.
 * Lógica inteligente: se valor <= 1 e > 0, assume decimal (0.75 -> 75%).
 * Caso contrário, assume valor inteiro (75 -> 75%).
 * Força sempre 2 casas decimais.
 */
export function formatarPercentagem(valor: number): string {
    if (valor === undefined || valor === null) return '0,00%';

    let valorFinal = valor;

    // Detetar se é decimal (0.XX) ou inteiro (XX.XX)
    // Regra de negócio: Se for <= 1 (e não 0), assumimos que é percentagem decimal (ex: 0.35 = 35%)
    if (valor > 0 && valor <= 1) {
        valorFinal = valor * 100;
    }

    return valorFinal.toLocaleString('pt-PT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + '%';
}

/**
 * Formata um valor numérico como moeda (EUR).
 */
export function formatarMoeda(valor: number | null | undefined): string {
    if (valor === null || valor === undefined) return '—';

    return new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR'
    }).format(valor);
}

/**
 * Normaliza o valor de desconto para armazenamento (opcional, se precisares validar inputs)
 * Retorna o valor "bruto" (ex: 35.5) para salvar na BD.
 */
export function normalizarInputDesconto(input: string): number {
    // Remove %, €, espaços
    const limpo = input.replace(/[%€\s]/g, '').replace(',', '.');
    const valor = parseFloat(limpo);

    if (isNaN(valor)) return 0;

    // Se o user escrever 0.35, convertemos para 35 para consistência na BD?
    // NOTA: A tua BD parece aceitar ambos. Esta função devolve o valor "human readable" (35.5)
    // Se for <= 1, converte.
    if (valor > 0 && valor <= 1) {
        return valor * 100;
    }

    return valor;
}
