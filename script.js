
import { MODO_MANUTENCAO, APP_VERSION, fatorKTable, seguroTable } from './config.js';
import {
    fmtBRL, fmtDate, fmtPct, fmtPctNo, addDaysUTC, addMonthsSetDayUTC,
    buildHolidaySetForRange, nextBusinessDay, calculateBusinessDays, calculateIRR
} from './utils.js';

// --- Estado Global da Aplicação ---
let latestSimData = null;
let isInsuranceIncluded = false;
let isBaseDateOverridden = false;
let originalFirstPaymentDate = '';

document.addEventListener('DOMContentLoaded', () => {
    // --- MODO MANUTENÇÃO ---
    if (MODO_MANUTENCAO) {
        document.body.innerHTML = `
            <main style="text-align: center; padding-top: 50px;">
                <h1>Sistema em Manutenção</h1>
                <p>O simulador está passando por atualizações no momento.</p>
                <p>Por favor, tente novamente em alguns instantes.</p>
            </main>
        `;
        return;
    }

    // --- Rodapé ---
    const footer = document.getElementById('app-footer');
    if (footer) footer.textContent = `Versão ${APP_VERSION} - Aplicação web desenvolvida por Francisco Eliciano. Contato: eliciano@outlook.com.br.`;

    // --- Seletores de Elementos ---
    const formElements = {
        cnpj: document.getElementById('client-cnpj'),
        razaoSocial: document.getElementById('client-name'),
        fantasia: document.getElementById('client-fantasy-name'),
        inicioAtividade: document.getElementById('client-activity-start-date'),
        naturezaJuridica: document.getElementById('client-legal-nature'),
        atividadePrincipal: document.getElementById('client-main-activity'),
        endereco: document.getElementById('client-address'),
        socios: document.getElementById('client-partners'),
        qtdSocios: document.getElementById('partners-qty'),
        loanAmount: document.getElementById('loan-amount'),
        contractRate: document.getElementById('contract-rate'),
        cdiRate: document.getElementById('cdi-rate'),
        tacAmount: document.getElementById('tac-amount'),
        baseDate: document.getElementById('base-date'),
        baseDateIcon: document.getElementById('base-date-icon'),
        proposalDate: document.getElementById('proposal-date'),
        gracePeriod: document.getElementById('grace-period'),
        firstPaymentDate: document.getElementById('first-payment-date'),
        editBtn: document.getElementById('edit-btn'),
        calculateBtn: document.getElementById('calculate-btn'),
        toggleInsuranceBtn: document.getElementById('toggle-insurance-btn'),
        cnpjLoadingMessage: document.getElementById('cnpj-loading-message'),
        editNotification: document.getElementById('edit-notification'),
        dateChangeConfirmation: document.getElementById('date-change-confirmation'),
        confirmDateChangeBtn: document.getElementById('confirm-date-change-btn'),
        cancelDateChangeBtn: document.getElementById('cancel-date-change-btn'),
        allApiFields: [
            document.getElementById('client-name'),
            document.getElementById('client-fantasy-name'),
            document.getElementById('client-activity-start-date'),
            document.getElementById('client-legal-nature'),
            document.getElementById('client-main-activity'),
            document.getElementById('client-address'),
            document.getElementById('client-partners'),
            document.getElementById('partners-qty'),
        ]
    };

    const masks = {};

    // --- LÓGICA DAS MÁSCARAS DE INPUT ---
    const setupInputMasks = () => {
        masks.cnpj = IMask(formElements.cnpj, { mask: '00.000.000/0000-00' });

        const currencyOptions = {
            mask: Number,
            scale: 2,
            signed: false,
            thousandsSeparator: '.',
            padFractionalZeros: true,
            normalizeZeros: true,
            radix: ',',
            mapToRadix: ['.'],
        };
        masks.loanAmount = IMask(formElements.loanAmount, currencyOptions);
        masks.tacAmount = IMask(formElements.tacAmount, currencyOptions);
        masks.contractRate = IMask(formElements.contractRate, { ...currencyOptions, scale: 2 });
        masks.cdiRate = IMask(formElements.cdiRate, { ...currencyOptions, scale: 2 });
    };

    // --- LÓGICA DE CONTROLE DO FORMULÁRIO ---
    const setFieldsReadOnly = (isReadOnly) => {
        [formElements.cnpj, ...formElements.allApiFields].forEach(field => {
            if (field) field.readOnly = isReadOnly;
        });
        formElements.editBtn.disabled = !isReadOnly;
        formElements.firstPaymentDate.readOnly = isReadOnly;
    };

    const updateButtonState = (button, isActive, text) => {
        if (isActive) {
            button.classList.add('active');
            button.innerHTML = `${text} <span class="check-icon">✔</span>`;
        } else {
            button.classList.remove('active');
            button.innerHTML = text;
        }
    };

    // --- LÓGICA DA API DE CNPJ ---
    const setupCnpjListener = () => {
        let loadingTimeout;
        formElements.cnpj.addEventListener('blur', async () => {
            const cnpj = masks.cnpj.unmaskedValue;
            if (cnpj.length !== 14) return;

            loadingTimeout = setTimeout(() => {
                formElements.cnpjLoadingMessage.classList.remove('hidden');
            }, 1000);

            const url = `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`;
            formElements.cnpj.disabled = true;

            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`CNPJ não encontrado (status: ${response.status})`);
                const data = await response.json();

                formElements.razaoSocial.value = data.razao_social || '';
                formElements.fantasia.value = data.nome_fantasia || '';
                formElements.naturezaJuridica.value = data.natureza_juridica || '';
                formElements.atividadePrincipal.value = data.cnae_fiscal_descricao || '';
                formElements.endereco.value = `${data.logradouro || ''}, ${data.numero || ''} - ${data.bairro || ''}, ${data.municipio || ''} - ${data.uf || ''}`;
                formElements.inicioAtividade.value = data.data_inicio_atividade ? fmtDate(new Date(data.data_inicio_atividade + 'T00:00:00')) : '';

                if (data.qsa && data.qsa.length > 0) {
                    formElements.qtdSocios.value = data.qsa.length;
                    formElements.socios.value = data.qsa.map(socio => `${socio.nome_socio} (${socio.qualificacao_socio || 'Sócio'})`).join('\n');
                } else {
                    formElements.qtdSocios.value = 0;
                    formElements.socios.value = 'Nenhum sócio encontrado.';
                }
                setFieldsReadOnly(true);
            } catch (error) {
                console.error('Erro ao buscar CNPJ:', error);
                alert('Não foi possível buscar os dados do CNPJ. Verifique o número e a sua conexão.');
                setFieldsReadOnly(false);
            } finally {
                clearTimeout(loadingTimeout);
                formElements.cnpjLoadingMessage.classList.add('hidden');
                formElements.cnpj.disabled = false;
            }
        });
    };
    
    // --- LÓGICA DO BOTÃO EDITAR ---
    const setupEditButtonListener = () => {
        formElements.editBtn.addEventListener('click', () => {
            setFieldsReadOnly(false);
            formElements.firstPaymentDate.readOnly = false;
            formElements.editBtn.disabled = true;
            updateButtonState(formElements.calculateBtn, false, 'Simular');

            isBaseDateOverridden = false;
            formElements.baseDate.classList.remove('invalid-field');
            formElements.baseDateIcon.classList.add('hidden');
            updateFirstPaymentDate();
            originalFirstPaymentDate = formElements.firstPaymentDate.value;

            formElements.editNotification.classList.add('show');
            setTimeout(() => {
                formElements.editNotification.classList.remove('show');
            }, 3000);
        });
    };

    // --- LÓGICA DO BOTÃO DE SEGURO ---
    const setupInsuranceButtonListener = () => {
        formElements.toggleInsuranceBtn.addEventListener('click', () => {
            isInsuranceIncluded = !isInsuranceIncluded;
            updateButtonState(formElements.toggleInsuranceBtn, isInsuranceIncluded, isInsuranceIncluded ? 'Seguro Incluído' : 'Incluir Seguro Prestamista');
        });
    };

    // --- CÁLCULO E ALTERAÇÃO MANUAL DA DATA DA 1ª PARCELA ---
    const updateFirstPaymentDate = () => {
        if (isBaseDateOverridden) return;

        const proposalDateStr = formElements.proposalDate.value;
        const gracePeriod = parseInt(formElements.gracePeriod.value, 10);
        const baseDay = parseInt(formElements.baseDate.value, 10);

        if (!proposalDateStr || isNaN(gracePeriod) || isNaN(baseDay)) {
            formElements.firstPaymentDate.value = '';
            return;
        }

        const proposalDate = new Date(proposalDateStr + 'T12:00:00Z');
        const calculatedDate = addDaysUTC(proposalDate, gracePeriod + 30);
        const finalDate = new Date(Date.UTC(calculatedDate.getUTCFullYear(), calculatedDate.getUTCMonth(), baseDay));

        const year = finalDate.getUTCFullYear();
        const month = String(finalDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(finalDate.getUTCDate()).padStart(2, '0');

        formElements.firstPaymentDate.value = `${year}-${month}-${day}`;
        originalFirstPaymentDate = formElements.firstPaymentDate.value;
    };

    const handleManualDateChange = () => {
        if (formElements.firstPaymentDate.readOnly) return;
        if (formElements.firstPaymentDate.value !== originalFirstPaymentDate) {
            formElements.dateChangeConfirmation.classList.remove('hidden');
        }
    };

    const setupDateChangeConfirmationListeners = () => {
        formElements.firstPaymentDate.addEventListener('change', handleManualDateChange);

        formElements.confirmDateChangeBtn.addEventListener('click', () => {
            isBaseDateOverridden = true;
            formElements.baseDate.classList.add('invalid-field');
            formElements.baseDateIcon.innerHTML = 'X';
            formElements.baseDateIcon.classList.remove('hidden');
            formElements.dateChangeConfirmation.classList.add('hidden');
            originalFirstPaymentDate = formElements.firstPaymentDate.value;
        });

        formElements.cancelDateChangeBtn.addEventListener('click', () => {
            formElements.firstPaymentDate.value = originalFirstPaymentDate;
            formElements.dateChangeConfirmation.classList.add('hidden');
            formElements.firstPaymentDate.readOnly = true;
            formElements.editBtn.disabled = false;
        });
    };

    // --- FUNÇÃO DE EXIBIÇÃO DE RESULTADOS ---
    function displayResults(schedule, summary, totals) {
        const $ = (id) => document.getElementById(id);
        $('summary-client-name').textContent = summary.clientName;
        $('summary-client-cnpj').textContent = summary.clientCnpj;
        $('summary-monthly-rate').textContent = fmtPct(summary.monthlyInterestRate);
        $('summary-cet-monthly').textContent = fmtPct(summary.cetMonthly);
        $('summary-cet-annual').textContent = fmtPct(summary.cetAnnual);
        $('summary-tac').textContent = fmtBRL(summary.TAC);
        $('summary-ecg').textContent = fmtBRL(summary.ecg);
        $('summary-iof').textContent = fmtBRL(summary.iof);
        $('summary-insurance').textContent = fmtBRL(summary.insuranceInstallmentValue);
        $('summary-total-costs').textContent = fmtBRL(summary.upfrontCosts);

        const tbody = $('schedule-body');
        tbody.innerHTML = '';
        schedule.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${r.index}</td><td>${fmtDate(r.date)}</td><td>${fmtBRL(r.capital)}</td><td>${fmtBRL(r.interest)}</td><td>${fmtBRL(r.insurance)}</td><td>${fmtBRL(r.totalPayment)}</td><td>${fmtBRL(r.balance)}</td>`;
            tbody.appendChild(tr);
        });

        const table = $('schedule-table');
        let tfoot = table.querySelector('tfoot');
        if (tfoot) tfoot.remove();
        tfoot = table.createTFoot();
        const row = tfoot.insertRow();
        row.className = 'table-totals-row';
        row.innerHTML = `<td colspan="2"><strong>TOTAIS</strong></td><td><strong>${fmtBRL(totals.capital)}</strong></td><td><strong>${fmtBRL(totals.interest)}</strong></td><td></td><td><strong>${fmtBRL(totals.totalPayment)}</strong></td><td></td>`;

        $('disclaimer-text').textContent = `Esta simulação está sujeita à confirmação e/ou revisão antes do fechamento da operação, uma vez que reflete as condições vigentes de mercado e pode ser alterada a qualquer momento caso ocorram mudanças no cenário macroeconômico nacional e/ou internacional. Nenhuma suposição, projeção ou exemplificação contida neste material deve ser considerada garantia de eventos futuros e/ou de desempenho. Este documento não constitui oferta, convite, promessa de contratação ou qualquer obrigação.`;
        $('results-area').classList.remove('hidden');
    }
    
    // --- INICIALIZAÇÃO ---
    setupInputMasks();
    setupCnpjListener();
    setupEditButtonListener();
    setupInsuranceButtonListener();
    setupDateChangeConfirmationListeners();

    ['proposal-date', 'grace-period', 'base-date'].forEach(id => {
        document.getElementById(id).addEventListener('change', updateFirstPaymentDate);
    });

    setFieldsReadOnly(false);
    formElements.editBtn.disabled = true;

    // --- EVENT LISTENER DO BOTÃO SIMULAR ---
    formElements.calculateBtn.addEventListener('click', () => {
        const required = ['client-name', 'client-cnpj', 'proposal-date', 'loan-amount', 'grace-period', 'installments', 'partners-qty', 'contract-rate', 'cdi-rate', 'tac-amount'];
        if (!isBaseDateOverridden) {
            required.push('base-date');
        }

        if (required.some(id => !document.getElementById(id)?.value)) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        const proposalDateStr = formElements.proposalDate.value;
        const firstPaymentDateStr = formElements.firstPaymentDate.value;
        const proposalDate = new Date(proposalDateStr + 'T00:00:00');
        const firstPaymentDate = new Date(firstPaymentDateStr + 'T00:00:00');

        const baseDay = isBaseDateOverridden
            ? firstPaymentDate.getUTCDate()
            : parseInt(formElements.baseDate.value, 10);

        const loanAmount = parseFloat(masks.loanAmount.unmaskedValue);
        const contractRate = parseFloat(masks.contractRate.unmaskedValue) / 100;
        const cdiRate = parseFloat(masks.cdiRate.unmaskedValue) / 100;
        const upfrontTAC = parseFloat(masks.tacAmount.unmaskedValue);
        const gracePeriodDays = parseInt(formElements.gracePeriod.value, 10);
        const installments = parseInt(document.getElementById('installments').value, 10);
        const partnersQty = parseInt(document.getElementById('partners-qty').value, 10);
        const prelimEnd = addMonthsSetDayUTC(firstPaymentDate, installments + 6, baseDay);
        const HOLIDAYS_SET = buildHolidaySetForRange(proposalDate, prelimEnd);
        const totalTermDays = gracePeriodDays + (installments * 30);
        const totalTermMonths = Math.ceil(totalTermDays / 30);
        const insuranceRatePercent = seguroTable.find(r => totalTermDays >= r.minDays && totalTermDays <= r.maxDays)?.ratePercent;
        if (isInsuranceIncluded && !insuranceRatePercent) { alert('Prazo da operação fora da tabela de seguro.'); return; }
        const kFactor = fatorKTable.find(r => totalTermMonths >= r.minMonths && totalTermMonths <= r.maxMonths)?.value;
        if (!kFactor) { alert('Prazo da operação fora da tabela de fator K.'); return; }
        const totalInsuranceValue = isInsuranceIncluded ? loanAmount * (insuranceRatePercent / 100) * partnersQty : 0;
        const numGracePayments = Math.floor(gracePeriodDays / 30);
        const numInsurancePayments = numGracePayments + (installments - 1);
        const insuranceInstallmentValue = (isInsuranceIncluded && numInsurancePayments > 0) ? totalInsuranceValue / numInsurancePayments : 0;
        const ecgN = Math.floor(totalTermDays / 30);
        const ecg = 0.4 * (0.8 * kFactor * loanAmount * ecgN);
        const paymentSchedule = [];
        const cashFlow = [];
        paymentSchedule.push({ index: 0, date: proposalDate, capital: 0, interest: 0, insurance: insuranceInstallmentValue, totalPayment: 0, balance: loanAmount });
        cashFlow.push(loanAmount);
        const periodRateFromDU = (du, cdi, st) => Math.pow(1 + cdi, du / 252) * Math.pow(1 + st, du / 252) - 1;
        const backRaw = addMonthsSetDayUTC(firstPaymentDate, -(numGracePayments + 1), baseDay);
        const avulsoDate = nextBusinessDay(backRaw, HOLIDAYS_SET);
        let lastPaymentDate = proposalDate;
        if (avulsoDate.getTime() > proposalDate.getTime()) {
            const duAvulso = calculateBusinessDays(lastPaymentDate, avulsoDate, HOLIDAYS_SET);
            const jurosAvulso = loanAmount * periodRateFromDU(duAvulso, cdiRate, contractRate);
            paymentSchedule.push({ index: 'A', date: avulsoDate, capital: 0, interest: jurosAvulso, insurance: 0, totalPayment: jurosAvulso, balance: loanAmount });
            cashFlow.push(-jurosAvulso);
            lastPaymentDate = avulsoDate;
        }
        for (let i = 1; i <= numGracePayments; i++) {
            const graceRaw = addMonthsSetDayUTC(avulsoDate, i, baseDay);
            const graceDate = nextBusinessDay(graceRaw, HOLIDAYS_SET);
            const du = calculateBusinessDays(lastPaymentDate, graceDate, HOLIDAYS_SET);
            const interest = loanAmount * periodRateFromDU(du, cdiRate, contractRate);
            paymentSchedule.push({ index: i, date: graceDate, capital: 0, interest, insurance: insuranceInstallmentValue, totalPayment: interest + insuranceInstallmentValue, balance: loanAmount });
            cashFlow.push(-(interest + insuranceInstallmentValue));
            lastPaymentDate = graceDate;
        }
        let balance = loanAmount;
        const amortValue = loanAmount / installments;
        for (let i = 1; i <= installments; i++) {
            const amortRaw = addMonthsSetDayUTC(firstPaymentDate, i - 1, baseDay);
            const amortDate = nextBusinessDay(amortRaw, HOLIDAYS_SET);
            const du = calculateBusinessDays(lastPaymentDate, amortDate, HOLIDAYS_SET);
            const interest = balance * periodRateFromDU(du, cdiRate, contractRate);
            const insurancePayment = (i === installments) ? 0 : insuranceInstallmentValue;
            const amort = (i === installments) ? balance : amortValue;
            const totalPayment = amort + interest + insurancePayment;
            balance = (i === installments) ? 0 : (balance - amort);
            paymentSchedule.push({ index: numGracePayments + i, date: amortDate, capital: amort, interest, insurance: insurancePayment, totalPayment, balance });
            cashFlow.push(-totalPayment);
            lastPaymentDate = amortDate;
        }
        const iofFixed = loanAmount * 0.0038;
        const iofDailyRate = 0.000082;
        const cutoff = addDaysUTC(proposalDate, 365);
        let outstanding = loanAmount, cur = proposalDate, iofDaily = 0;
        for (const row of paymentSchedule) {
            const segEnd = row.date < cutoff ? row.date : cutoff;
            if (segEnd > cur) {
                const days = Math.floor((segEnd - cur) / 86400000);
                iofDaily += outstanding * iofDailyRate * days;
                cur = segEnd;
            }
            if (row.date <= cutoff && row.capital > 0) outstanding -= row.capital;
            if (cur >= cutoff) break;
        }
        if (cur < cutoff) iofDaily += outstanding * iofDailyRate * Math.floor((cutoff - cur) / 86400000);
        const iof = iofFixed + iofDaily;
        const upfrontCosts = upfrontTAC + ecg + iof + insuranceInstallmentValue;
        paymentSchedule[0].totalPayment = upfrontCosts;
        cashFlow[0] = loanAmount - upfrontCosts;
        const totals = paymentSchedule.reduce((acc, row, idx) => {
            if (idx > 0) { acc.capital += row.capital; acc.interest += row.interest; acc.totalPayment += row.totalPayment; }
            return acc;
        }, { capital: 0, interest: 0, totalPayment: 0 });
        const totalAnnualRate = contractRate + cdiRate;
        const monthlyInterestRate = Math.pow(1 + totalAnnualRate, 1 / 12) - 1;
        const cetMonthly = calculateIRR(cashFlow);
        const cetAnnual = cetMonthly ? (Math.pow(1 + cetMonthly, 12) - 1) : 0;
        latestSimData = {
            schedule: paymentSchedule,
            summary: {
                clientName: document.getElementById('client-name').value, clientCnpj: document.getElementById('client-cnpj').value,
                proposalDate: proposalDateStr, loanAmount, gracePeriodDays, firstPaymentDate: firstPaymentDateStr, installments,
                contractRate: contractRate * 100, cdiRate: cdiRate * 100, TAC: upfrontTAC, ecg, iof, insuranceInstallmentValue, upfrontCosts,
                monthlyInterestRate, cetMonthly, cetAnnual,
            },
            totals
        };
        displayResults(latestSimData.schedule, latestSimData.summary, latestSimData.totals);
        updateButtonState(formElements.calculateBtn, true, 'Simulação Concluída');
    });

    document.getElementById('export-pdf-btn').addEventListener('click', () => {
        if (!latestSimData) {
            alert('Por favor, primeiro realize uma simulação.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const { schedule, summary, totals } = latestSimData;
        const margin = 15,
            pageWidth = doc.internal.pageSize.width,
            bottomMargin = 20;
        let y = 20;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(0, 90, 156);
        doc.text("Simulação de Capital de Giro PEAC FGI", margin, y);
        y += 8;
        doc.setDrawColor(255, 193, 7);
        doc.setLineWidth(1.0);
        doc.line(margin, y, pageWidth - margin, y);
        y += 10;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(45, 55, 72);
        const introParagraphs = [
            "Prezado Cliente,",
            "Esta é uma simulação de operação de crédito baseada nos parâmetros da linha Capital de Giro PEAC-FGI. Trata-se de uma linha de crédito desenvolvida pelo Governo Federal, no âmbito do Programa Emergencial de Acesso a Crédito (PEAC), com garantia complementar do FGI - Fundo Garantidor para Investimentos, administrado pelo BNDES.",
            "Como parte dos encargos é pós-fixada (atrelada ao CDI), os valores podem variar conforme a oscilação desse Indice. Por essa razão, este documento não constitui proposta, promessa, oferta ou convite. A decisão de contratação deve ser tomada pelo cliente após sua própria análise."
        ];
        for (const paragraph of introParagraphs) {
            const splitText = doc.splitTextToSize(paragraph, pageWidth - margin * 2);
            doc.text(splitText, margin, y);
            y += (doc.getTextDimensions(splitText).h) + 4;
        }
        y += 5;

        const lineH = 5,
            blk = 8,
            col2 = pageWidth / 2 + 5;
        let yL = y,
            yR = y;
        doc.setFontSize(7);
        const sub = (txt, x, y0) => {
            doc.setFont('helvetica', 'bold');
            doc.text(txt, x, y0);
            doc.setDrawColor(255, 193, 7);
            doc.setLineWidth(1.0);
            doc.line(x, y0 + 1.5, x + doc.getTextWidth(txt), y0 + 1.5);
            doc.setFont('helvetica', 'normal');
            return y0 + blk;
        };
        yL = sub('Cliente', margin, yL);
        doc.text(`Nome: ${summary.clientName}`, margin, yL);
        yL += lineH;
        doc.text(`CNPJ: ${summary.clientCnpj}`, margin, yL);
        yL += lineH;
        doc.text(`Data da Proposta: ${fmtDate(new Date(summary.proposalDate + 'T00:00:00'))}`, margin, yL);
        yL += blk;
        yL = sub('Operação', margin, yL);
        doc.text(`Sistema de Reposição: SAC`, margin, yL);
        yL += lineH;
        doc.text(`Valor a Financiar: ${fmtBRL(summary.loanAmount)}`, margin, yL);
        yL += lineH;
        doc.text(`Carência: ${summary.gracePeriodDays} dias`, margin, yL);
        yL += lineH;
        doc.text(`Data da 1ª Parcela: ${fmtDate(new Date(summary.firstPaymentDate + 'T00:00:00'))}`, margin, yL);
        yL += lineH;
        doc.text(`Parcelas: ${summary.installments}`, margin, yL);
        yR = sub('Taxas da Operação', col2, yR);
        doc.text(`Taxa Contratual: CDI + ${fmtPctNo(summary.contractRate)}% a.a.`, col2, yR);
        yR += lineH;
        doc.text(`CDI: ${fmtPctNo(summary.cdiRate)}% a.a.`, col2, yR);
        yR += lineH;
        doc.text(`Taxa de Juros Equivalente Mensal: ${fmtPct(summary.monthlyInterestRate)}`, col2, yR);
        yR += blk;
        yR = sub('Custos Iniciais (Pagos na Liberação)', col2, yR);
        const totalCustos = summary.TAC + summary.ecg + summary.iof + summary.insuranceInstallmentValue;
        doc.text(`TAC: ${fmtBRL(summary.TAC)}`, col2, yR);
        yR += lineH;
        doc.text(`ECG: ${fmtBRL(summary.ecg)}`, col2, yR);
        yR += lineH;
        doc.text(`IOF: ${fmtBRL(summary.iof)}`, col2, yR);
        yR += lineH;
        doc.text(`1ª Parcela do Prestamista: ${fmtBRL(summary.insuranceInstallmentValue)}`, col2, yR);
        yR += lineH;
        doc.setFont('helvetica', 'bold');
        doc.text(`Total: ${fmtBRL(totalCustos)}`, col2, yR);
        doc.setFont('helvetica', 'normal');
        y = Math.max(yL, yR) + 15;

        const tableBody = schedule.map(r => [r.index, fmtDate(r.date), fmtBRL(r.capital), fmtBRL(r.interest), fmtBRL(r.insurance), fmtBRL(r.totalPayment), fmtBRL(r.balance)]);
        const tableFooter = [
            [{ content: 'TOTAIS', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } }, { content: fmtBRL(totals.capital), styles: { halign: 'right', fontStyle: 'bold' } }, { content: fmtBRL(totals.interest), styles: { halign: 'right', fontStyle: 'bold' } }, '', { content: fmtBRL(totals.totalPayment), styles: { halign: 'right', fontStyle: 'bold' } }, '']
        ];
        doc.autoTable({
            startY: y,
            head: [
                ['#', 'Data', 'Capital (Amortização)', 'Juros', 'Prestamista', 'Valor a Pagar', 'Saldo Devedor']
            ],
            body: tableBody,
            foot: tableFooter,
            showFoot: 'lastPage',
            theme: 'grid',
            headStyles: { fillColor: [0, 90, 156], textColor: [255, 255, 255], fontStyle: 'bold' },
            footStyles: { fillColor: [229, 239, 245], textColor: [45, 55, 72], fontStyle: 'bold' },
            styles: { fontSize: 7, cellPadding: 2 },
            columnStyles: { 0: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } },
            didDrawPage: (data) => {
                doc.setFontSize(7);
                doc.setTextColor(128, 128, 128);
                doc.text(`Página ${data.pageNumber}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
            }
        });

        let finalY = doc.lastAutoTable.finalY;
        const pageHeight = doc.internal.pageSize.height;

        doc.setFontSize(7);
        const disclaimer = `Esta simulação está sujeita à confirmação e/ou revisão antes do fechamento da operação, uma vez que reflete as condições vigentes de mercado e pode ser alterada a qualquer momento caso ocorram mudanças no cenário macroeconômico nacional e/ou internacional. Nenhuma suposição, projeção ou exemplificação contida neste material deve ser considerada garantia de eventos futuros e/ou de desempenho. Este documento não constitui oferta, convite, promessa de contratação ou qualquer obrigação.`;
        const splitDisclaimer = doc.splitTextToSize(disclaimer, pageWidth - margin * 2);
        const disclaimerHeight = (splitDisclaimer.length * doc.getFontSize()) / doc.internal.scaleFactor;
        if (finalY + disclaimerHeight + 15 > pageHeight - bottomMargin) {
            doc.addPage();
            finalY = margin;
        }
        finalY += 5;
        doc.setDrawColor(0, 90, 156);
        doc.setLineWidth(0.5);
        doc.line(margin, finalY, pageWidth - margin, finalY);
        finalY += 7;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(45, 55, 72);
        doc.text(splitDisclaimer, margin, finalY);

        doc.setTextColor(128, 128, 128);
        const footTxt = `Versão ${APP_VERSION} - Aplicação web desenvolvida por Francisco Eliciano. Contato: eliciano@outlook.com.br.`;
        doc.text(footTxt, pageWidth / 2, pageHeight - 15, { align: 'center' });

        doc.save(`Cotacao_Indicativa_PEAC_FGI_${summary.clientName.replace(/ /g, '_')}.pdf`);
    });
});
