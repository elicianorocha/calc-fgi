// config.js

/**
 * Arquivo de Configuração
 *
 * Centraliza todas as variáveis de configuração, constantes e tabelas
 * para facilitar a manutenção e futuras atualizações do sistema.
 */

// --- CONFIGURAÇÕES GERAIS ---

// Altere para 'true' para ativar o modo de manutenção e bloquear a calculadora.
export const MODO_MANUTENCAO = false;

// Versão da aplicação (exibida no rodapé)
export const APP_VERSION = '2.2.0';


// --- TABELAS DE CÁLCULO ---

// Tabela de Fator K para cálculo do Encargo por Concessão de Garantia (ECG)
export const fatorKTable = [
    { minMonths: 0, maxMonths: 3, value: 0.0142 }, { minMonths: 4, maxMonths: 6, value: 0.0062 },
    { minMonths: 7, maxMonths: 9, value: 0.0042 }, { minMonths: 10, maxMonths: 12, value: 0.0031 },
    { minMonths: 13, maxMonths: 15, value: 0.0027 }, { minMonths: 16, maxMonths: 18, value: 0.0024 },
    { minMonths: 19, maxMonths: 21, value: 0.0022 }, { minMonths: 22, maxMonths: 24, value: 0.0020 },
    { minMonths: 25, maxMonths: 27, value: 0.0018 }, { minMonths: 28, maxMonths: 30, value: 0.0017 },
    { minMonths: 31, maxMonths: 33, value: 0.0016 }, { minMonths: 34, maxMonths: 36, value: 0.0015 },
    { minMonths: 37, maxMonths: 39, value: 0.0014 }, { minMonths: 40, maxMonths: 45, value: 0.0013 },
    { minMonths: 46, maxMonths: 48, value: 0.0012 }, { minMonths: 49, maxMonths: 54, value: 0.0011 },
    { minMonths: 55, maxMonths: 60, value: 0.0010 }, { minMonths: 61, maxMonths: 69, value: 0.0009 },
];

// Tabela de alíquotas do seguro prestamista com base no prazo total em dias
export const seguroTable = [
    { minDays: 30, maxDays: 92, ratePercent: 0.7412086 }, { minDays: 93, maxDays: 184, ratePercent: 0.8894502 },
    { minDays: 185, maxDays: 276, ratePercent: 1.1562853 }, { minDays: 277, maxDays: 368, ratePercent: 1.1859336 },
    { minDays: 369, maxDays: 460, ratePercent: 2.2236256 }, { minDays: 461, maxDays: 552, ratePercent: 2.3125705 },
    { minDays: 553, maxDays: 644, ratePercent: 2.3451838 }, { minDays: 645, maxDays: 736, ratePercent: 2.3718672 },
    { minDays: 737, maxDays: 828, ratePercent: 3.2020207 }, { minDays: 829, maxDays: 920, ratePercent: 3.2613174 },
    { minDays: 921, maxDays: 1012, ratePercent: 3.4243834 }, { minDays: 1013, maxDays: 1104, ratePercent: 3.5578008 },
    { minDays: 1105, maxDays: 1196, ratePercent: 4.4324269 }, { minDays: 1197, maxDays: 1288, ratePercent: 4.5658445 },
    { minDays: 1289, maxDays: 1380, ratePercent: 4.6696136 }, { minDays: 1381, maxDays: 1472, ratePercent: 4.7437345 },
    { minDays: 1473, maxDays: 1564, ratePercent: 5.7458484 }, { minDays: 1565, maxDays: 1656, ratePercent: 5.7636374 },
    { minDays: 1657, maxDays: 1748, ratePercent: 5.8585121 }, { minDays: 1749, maxDays: 1840, ratePercent: 5.9718606 },
    { minDays: 1841, maxDays: 1932, ratePercent: 6.3712526 }, { minDays: 1933, maxDays: 2024, ratePercent: 8.3818046 },
    { minDays: 2025, maxDays: 2116, ratePercent: 8.7627958 }, { minDays: 2117, maxDays: 2208, ratePercent: 9.1437868 },
    { minDays: 2209, maxDays: 2300, ratePercent: 10.9245836 }, { minDays: 2301, maxDays: 2392, ratePercent: 11.3615669 },
    { minDays: 2393, maxDays: 2484, ratePercent: 11.7985504 }, { minDays: 2485, maxDays: 2576, ratePercent: 12.2355337 },
    { minDays: 2577, maxDays: 2668, ratePercent: 12.6725170 }, { minDays: 2669, maxDays: 2760, ratePercent: 13.1095003 },
    { minDays: 2761, maxDays: 2852, ratePercent: 13.5464836 }, { minDays: 2853, maxDays: 2944, ratePercent: 13.9834670 },
    { minDays: 2945, maxDays: 3653, ratePercent: 14.4204503 },

];
