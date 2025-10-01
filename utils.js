// utils.js

/**
 * Arquivo de Utilitários
 *
 * Contém funções auxiliares genéricas para formatação, manipulação de datas
 * e cálculos financeiros que podem ser reutilizados em toda a aplicação.
 */

// ===== FUNÇÕES DE FORMATAÇÃO =====

/**
 * Formata um número para o padrão de moeda brasileiro (BRL).
 * @param {number} value - O valor a ser formatado.
 * @returns {string} - A string formatada (ex: "R$ 1.234,56").
 */
export const fmtBRL = (v) => `R$ ${(+v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Formata um objeto Date para o padrão de data brasileiro (dd/mm/aaaa).
 * @param {Date} date - O objeto Date a ser formatado.
 * @returns {string} - A string formatada (ex: "26/09/2025").
 */
export const fmtDate = (d) => d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });

/**
 * Formata um número (taxa) para uma string de porcentagem.
 * @param {number} rate - A taxa (ex: 0.1234).
 * @returns {string} - A string formatada (ex: "12,34%").
 */
export const fmtPct  = (x) => `${(x * 100).toFixed(2).replace('.', ',')}%`;

/**
 * Formata um número (taxa) para uma string de porcentagem, sem o símbolo %.
 * @param {number} rate - A taxa (ex: 15.5).
 * @returns {string} - A string formatada (ex: "15,50").
 */
export const fmtPctNo = (x) => `${x.toFixed(2).replace('.', ',')}`;


// ===== FUNÇÕES DE DATA (DIAS ÚTEIS E FERIADOS) =====

/**
 * Converte um objeto Date para uma string no formato ISO (YYYY-MM-DD).
 * @param {Date} d - O objeto Date.
 * @returns {string}
 */
const toISO = (d) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

/**
 * Adiciona um número de dias a uma data UTC.
 * @param {Date} d - A data inicial.
 * @param {number} n - O número de dias a adicionar.
 * @returns {Date}
 */
export const addDaysUTC = (d, n) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n));

/**
 * Adiciona um número de meses a uma data UTC, fixando o dia.
 * @param {Date} d - A data inicial.
 * @param {number} months - O número de meses a adicionar.
 * @param {number} day - O dia do mês para o resultado.
 * @returns {Date}
 */
export const addMonthsSetDayUTC = (d, months, day) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, day));


/**
 * Calcula a data da Páscoa para um determinado ano (algoritmo de Meeus/Jones/Butcher).
 * @param {number} year - O ano.
 * @returns {Date} - A data da Páscoa em UTC.
 */
function easterDate(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // Mês (0-11)
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(year, month, day));
}

/**
 * Retorna um Set com as strings de data (YYYY-MM-DD) dos feriados nacionais brasileiros para um ano.
 * @param {number} year - O ano.
 * @returns {Set<string>}
 */
function brazilBankHolidays(year) {
    const holidays = new Set();
    // Feriados fixos [mês(0-11), dia]
    const fixedHolidays = [[0, 1], [3, 21], [4, 1], [8, 7], [9, 12], [10, 2], [10, 15], [11, 25]];
    fixedHolidays.forEach(([m, d]) => holidays.add(toISO(new Date(Date.UTC(year, m, d)))));

    // Feriados móveis baseados na Páscoa
    const easter = easterDate(year);
    const goodFriday = addDaysUTC(easter, -2);      // Sexta-feira Santa
    const carnivalTuesday = addDaysUTC(easter, -47); // Terça-feira de Carnaval
    const corpusChristi = addDaysUTC(easter, 60);    // Corpus Christi

    [goodFriday, carnivalTuesday, corpusChristi].forEach(date => holidays.add(toISO(date)));

    return holidays;
}


/**
 * Cria um Set de feriados para um intervalo de anos.
 * @param {Date} startDate - A data de início.
 * @param {Date} endDate - A data de fim.
 * @returns {Set<string>|null} - O Set de feriados ou null se não for para usar feriados.
 */
export function buildHolidaySetForRange(startDate, endDate) {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('feriados') !== '1') {
        return null;
    }

    const startYear = startDate.getUTCFullYear();
    const endYear = endDate.getUTCFullYear();
    const holidays = new Set();
    for (let y = startYear; y <= endYear; y++) {
        brazilBankHolidays(y).forEach(holiday => holidays.add(holiday));
    }
    return holidays;
}

/**
 * Verifica se uma data é um dia útil (não é fim de semana nem feriado).
 * @param {Date} d - A data a ser verificada.
 * @param {Set<string>} holidaysSet - O Set de feriados.
 * @returns {boolean}
 */
const isBusinessDay = (d, holidaysSet) => {
    const dayOfWeek = d.getUTCDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) { // Domingo ou Sábado
        return false;
    }
    if (holidaysSet && holidaysSet.has(toISO(d))) {
        return false;
    }
    return true;
};

/**
 * Encontra o próximo dia útil a partir de uma data (incluindo a própria data).
 * @param {Date} d - A data inicial.
 * @param {Set<string>} holidaysSet - O Set de feriados.
 * @returns {Date}
 */
export const nextBusinessDay = (d, holidaysSet) => {
    const nextDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    while (!isBusinessDay(nextDate, holidaysSet)) {
        nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    }
    return nextDate;
};

/**
 * Calcula o número de dias úteis entre duas datas.
 * @param {Date} startDate - A data de início (exclusiva).
 * @param {Date} endDate - A data de fim (inclusiva).
 * @param {Set<string>} holidaysSet - O Set de feriados.
 * @returns {number}
 */
export const calculateBusinessDays = (startDate, endDate, holidaysSet) => {
    let count = 0;
    const currentDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
    const finalDate = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));

    currentDate.setUTCDate(currentDate.getUTCDate() + 1); // Começa a contar do dia seguinte

    while (currentDate.getTime() <= finalDate.getTime()) {
        if (isBusinessDay(currentDate, holidaysSet)) {
            count++;
        }
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
    return count;
};


// ===== FUNÇÕES FINANCEIRAS =====

/**
 * Calcula a taxa de juros para um período com base em dias úteis.
 * @param {number} du - Dias úteis no período.
 * @param {number} cdiAnnual - Taxa CDI anual (ex: 0.1125).
 * @param {number} stAnnual - Taxa da SPREAD/Contratual anual (ex: 0.155).
 * @returns {number} - A taxa de juros para o período.
 */
export const periodRateFromDU = (du, cdi, st) => Math.pow(1 + cdi, du / 252) * Math.pow(1 + st, du / 252) - 1;

/**
 * Calcula a Taxa Interna de Retorno (TIR) para uma série de fluxos de caixa.
 * @param {number[]} cashFlow - Um array de fluxos de caixa.
 * @param {number} [guess=0.01] - Uma estimativa inicial para a taxa.
 * @returns {number} - A TIR calculada.
 */
export function calculateIRR(cashFlow, guess = 0.01) {
    const MAX_ITERATIONS = 100;
    const PRECISION = 1e-7;
    let rate = guess;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
        let npv = 0;  // Valor Presente Líquido (VPL)
        let dnpv = 0; // Derivada do VPL

        for (let j = 0; j < cashFlow.length; j++) {
            const denominator = Math.pow(1 + rate, j);
            if (denominator === 0) return Infinity; // Evita divisão por zero
            npv += cashFlow[j] / denominator;
            dnpv -= j * cashFlow[j] / Math.pow(1 + rate, j + 1);
        }

        if (dnpv === 0) return Infinity; // Evita divisão por zero

        const newRate = rate - npv / dnpv;
        if (Math.abs(newRate - rate) < PRECISION) {
            return newRate;
        }
        rate = newRate;
    }
    return rate; // Retorna a melhor aproximação encontrada
}