document.addEventListener('DOMContentLoaded', () => {

    const APP_VERSION = '1.1.0';

    // --- ALERT DE NOVIDADES DA VERSÃO ---
    const lastVersionShown = localStorage.getItem('lastVersionShown');
    if (lastVersionShown !== APP_VERSION) {
        alert(`Novidades da Versão ${APP_VERSION}!\n\nA calculadora foi atualizada com as seguintes melhorias:\n- Totalizadores na tabela de pagamentos.\n- Inclusão de um termo de responsabilidade (disclaimer).\n- Informações de versão e desenvolvedor no rodapé.\n- Melhorias na exportação para PDF.`);
        localStorage.setItem('lastVersionShown', APP_VERSION);
    }

    // --- INICIALIZA O RODAPÉ ---
    const footer = document.getElementById('app-footer');
    if (footer) {
        footer.innerHTML = `Versão ${APP_VERSION} - Aplicação web desenvolvida por Francisco Eliciano. Contato: eliciano@outlook.com.br.`;
    }

    // --- VARIÁVEIS PARA GUARDAR OS RESULTADOS PARA O PDF ---
    let lastCalculationResults = null;

    // --- TABELAS DE DADOS ---
    const fatorKTable = [ { minMonths: 0, maxMonths: 3, value: 0.0142 }, { minMonths: 4, maxMonths: 6, value: 0.0062 }, { minMonths: 7, maxMonths: 9, value: 0.0042 }, { minMonths: 10, maxMonths: 12, value: 0.0031 }, { minMonths: 13, maxMonths: 15, value: 0.0027 }, { minMonths: 16, maxMonths: 18, value: 0.0024 }, { minMonths: 19, maxMonths: 21, value: 0.0022 }, { minMonths: 22, maxMonths: 24, value: 0.0020 }, { minMonths: 25, maxMonths: 27, value: 0.0018 }, { minMonths: 28, maxMonths: 30, value: 0.0017 }, { minMonths: 31, maxMonths: 33, value: 0.0016 }, { minMonths: 34, maxMonths: 36, value: 0.0015 }, { minMonths: 37, maxMonths: 39, value: 0.0014 }, { minMonths: 40, maxMonths: 45, value: 0.0013 }, { minMonths: 46, maxMonths: 48, value: 0.0012 }, { minMonths: 49, maxMonths: 54, value: 0.0011 }, { minMonths: 55, maxMonths: 60, value: 0.0010 }, { minMonths: 61, maxMonths: 69, value: 0.0009 }, ];
    
    const seguroTable = [
        { minDays: 30, maxDays: 92, ratePercent: 0.7412086 }, { minDays: 93, maxDays: 184, ratePercent: 0.8894502 }, { minDays: 185, maxDays: 276, ratePercent: 1.1562853 }, { minDays: 277, maxDays: 368, ratePercent: 1.1859336 }, { minDays: 369, maxDays: 460, ratePercent: 2.2236256 }, { minDays: 461, maxDays: 552, ratePercent: 2.3125705 }, { minDays: 553, maxDays: 644, ratePercent: 2.3451838 }, { minDays: 645, maxDays: 736, ratePercent: 2.3718672 }, { minDays: 737, maxDays: 828, ratePercent: 3.2020207 }, { minDays: 829, maxDays: 920, ratePercent: 3.2613174 }, { minDays: 921, maxDays: 1012, ratePercent: 3.4243834 }, { minDays: 1013, maxDays: 1104, ratePercent: 3.5578008 }, { minDays: 1105, maxDays: 1196, ratePercent: 4.4324269 }, { minDays: 1197, maxDays: 1288, ratePercent: 4.5658445 }, { minDays: 1289, maxDays: 1380, ratePercent: 4.6696136 }, { minDays: 1381, maxDays: 1472, ratePercent: 4.7437345 }, { minDays: 1473, maxDays: 1564, ratePercent: 5.7458484 }, { minDays: 1565, maxDays: 1656, ratePercent: 5.7636374 }, { minDays: 1657, maxDays: 1748, ratePercent: 5.8585121 }, { minDays: 1749, maxDays: 1840, ratePercent: 5.9718606 }, { minDays: 1841, maxDays: 1932, ratePercent: 6.3712526 }, { minDays: 1933, maxDays: 2024, ratePercent: 8.3818046 }, { minDays: 2025, maxDays: 2116, ratePercent: 8.7627958 }, { minDays: 2117, maxDays: 2208, ratePercent: 9.1437868 }, { minDays: 2209, maxDays: 2300, ratePercent: 10.9245836 }, { minDays: 2301, maxDays: 2392, ratePercent: 11.3615669 }, { minDays: 2393, maxDays: 2484, ratePercent: 11.7985504 }, { minDays: 2485, maxDays: 2576, ratePercent: 12.2355337 }, { minDays: 2577, maxDays: 2668, ratePercent: 12.6725170 }, { minDays: 2669, maxDays: 2760, ratePercent: 13.1095003 }, { minDays: 2761, maxDays: 2852, ratePercent: 13.5464836 }, { minDays: 2853, maxDays: 2944, ratePercent: 13.9834670 }, { minDays: 2945, maxDays: 3653, ratePercent: 14.4204503 },
    ];

    const formatCurrency = (value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatDate = (date) => date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    const formatPercentage = (value) => `${(value * 100).toFixed(2).replace('.', ',')}%`;
    const formatPercentageNoSymbol = (value) => `${value.toFixed(2).replace('.', ',')}`;

    const calculateBtn = document.getElementById('calculate-btn');
    calculateBtn.addEventListener('click', () => {
        const requiredFields = [ { id: 'client-name', name: 'Cliente' }, { id: 'client-cnpj', name: 'CNPJ' }, { id: 'proposal-date', name: 'Data da proposta' }, { id: 'loan-amount', name: 'Valor a Financiar' }, { id: 'grace-period', name: 'Carência' }, { id: 'first-payment-date', name: 'Data 1ª Parcela' }, { id: 'installments', name: 'Parcelas' }, { id: 'partners-qty', name: 'Quantidade de Sócios' }, { id: 'contract-rate', name: 'Taxa Contratual' }, { id: 'cdi-rate', name: 'CDI anual' } ];
        const emptyFields = requiredFields.filter(field => !document.getElementById(field.id).value);
        if (emptyFields.length > 0) {
            alert(`Por favor, preencha o(s) seguinte(s) campo(s): ${emptyFields.map(f => f.name).join(', ')}.`);
            return;
        }

        const proposalDateStr = document.getElementById('proposal-date').value;
        const firstPaymentDateStr = document.getElementById('first-payment-date').value;
        
        const proposalDate = new Date(proposalDateStr + 'T00:00:00');
        const firstPaymentDate = new Date(firstPaymentDateStr + 'T00:00:00');
        const loanAmount = parseFloat(document.getElementById('loan-amount').value);
        const gracePeriodDays = parseInt(document.getElementById('grace-period').value);
        const installments = parseInt(document.getElementById('installments').value);
        const partnersQty = parseInt(document.getElementById('partners-qty').value);
        const contractRate = parseFloat(document.getElementById('contract-rate').value);
        const cdiRate = parseFloat(document.getElementById('cdi-rate').value);

        const TAC = 5000;
        const totalAnnualRate = (contractRate + cdiRate) / 100;
        const monthlyInterestRate = Math.pow(1 + totalAnnualRate, 1 / 12) - 1;
        const totalTermDays = gracePeriodDays + (installments * 30);
        const totalTermMonths = Math.ceil(totalTermDays / 30);
        
        const insuranceRatePercent = seguroTable.find(r => totalTermDays >= r.minDays && totalTermDays <= r.maxDays)?.ratePercent;
        if (!insuranceRatePercent) {
            alert('Prazo da operação fora dos limites da tabela de seguro. Verifique os prazos e datas.');
            return;
        }
        
        const kFactor = fatorKTable.find(r => totalTermMonths >= r.minMonths && totalTermMonths <= r.maxMonths)?.value;
        if (!kFactor) {
            alert('Prazo da operação fora dos limites da tabela de fator K. Verifique os prazos e datas.');
            return;
        }
        
        const totalInsuranceValue = loanAmount * (insuranceRatePercent / 100) * partnersQty;
        const numGracePayments = Math.floor(gracePeriodDays / 30);
        const numInsurancePayments = numGracePayments + (installments - 1);
        const insuranceInstallmentValue = numInsurancePayments > 0 ? totalInsuranceValue / numInsurancePayments : 0;
        
        const ecgN = Math.floor(totalTermDays / 30);
        const ecg = 0.4 * (0.8 * kFactor * loanAmount * ecgN);
        const iof = (loanAmount * 0.0038) + (loanAmount * 0.000082 * Math.min(totalTermDays, 365));
        
        const upfrontCosts = TAC + ecg + iof + insuranceInstallmentValue;
        
        const paymentSchedule = [];
        const cashFlow = [loanAmount - upfrontCosts];
        paymentSchedule.push({ index: 0, date: proposalDate, capital: 0, interest: 0, insurance: insuranceInstallmentValue, totalPayment: upfrontCosts, balance: loanAmount });
        
        const paymentDay = firstPaymentDate.getUTCDate();
        
        for (let i = 1; i <= numGracePayments; i++) {
            let graceDate = new Date(firstPaymentDate);
            graceDate.setUTCMonth(graceDate.getUTCMonth() - (numGracePayments - i + 1));
            graceDate.setUTCDate(paymentDay);
            const interest = loanAmount * monthlyInterestRate;
            paymentSchedule.push({ index: i, date: graceDate, capital: 0, interest: interest, insurance: insuranceInstallmentValue, totalPayment: interest + insuranceInstallmentValue, balance: loanAmount });
            cashFlow.push(-(interest + insuranceInstallmentValue));
        }

        let balance = loanAmount;
        const amortizationValue = loanAmount / installments;
        for (let i = 1; i <= installments; i++) {
            let amortizationDate = new Date(firstPaymentDate);
            amortizationDate.setUTCMonth(amortizationDate.getUTCMonth() + (i - 1));
            const interest = balance * monthlyInterestRate;
            const insurancePayment = (i === installments) ? 0 : insuranceInstallmentValue;
            const totalPayment = amortizationValue + interest + insurancePayment;
            balance -= amortizationValue;
            balance = (i === installments) ? 0 : balance;
            paymentSchedule.push({ index: numGracePayments + i, date: amortizationDate, capital: amortizationValue, interest: interest, insurance: insurancePayment, totalPayment: totalPayment, balance: balance });
            cashFlow.push(-totalPayment);
        }

        const cetMonthly = calculateIRR(cashFlow);
        const cetAnnual = cetMonthly ? (Math.pow(1 + cetMonthly, 12) - 1) : 0;

        // --- CÁLCULO DOS TOTAIS ---
        const totals = paymentSchedule.reduce((acc, row, index) => {
            // Ignora a linha de liberação do crédito (índice 0)
            if (index > 0) {
                acc.capital += row.capital;
                acc.interest += row.interest;
                acc.totalPayment += row.totalPayment;
            }
            return acc;
        }, { capital: 0, interest: 0, totalPayment: 0 });
        
        const summaryData = {
            clientName: document.getElementById('client-name').value,
            clientCnpj: document.getElementById('client-cnpj').value,
            proposalDate: proposalDateStr,
            loanAmount: loanAmount,
            gracePeriodDays: gracePeriodDays,
            firstPaymentDate: firstPaymentDateStr,
            installments: installments,
            contractRate: contractRate,
            cdiRate: cdiRate,
            TAC, ecg, iof, insuranceInstallmentValue, upfrontCosts, monthlyInterestRate, cetMonthly, cetAnnual,
        };
        
        lastCalculationResults = { schedule: paymentSchedule, summary: summaryData, totals: totals };
        
        displayResults(paymentSchedule, summaryData, totals);
    });

    function displayResults(schedule, summary, totals) {
        // --- PREENCHE O RESUMO ---
        document.getElementById('summary-client-name').textContent = summary.clientName;
        document.getElementById('summary-client-cnpj').textContent = summary.clientCnpj;
        document.getElementById('summary-monthly-rate').textContent = formatPercentage(summary.monthlyInterestRate);
        document.getElementById('summary-cet-monthly').textContent = formatPercentage(summary.cetMonthly);
        document.getElementById('summary-cet-annual').textContent = formatPercentage(summary.cetAnnual);
        document.getElementById('summary-tac').textContent = formatCurrency(summary.TAC);
        document.getElementById('summary-ecg').textContent = formatCurrency(summary.ecg);
        document.getElementById('summary-iof').textContent = formatCurrency(summary.iof);
        document.getElementById('summary-insurance').textContent = formatCurrency(summary.insuranceInstallmentValue);
        document.getElementById('summary-total-costs').textContent = formatCurrency(summary.upfrontCosts);

        // --- PREENCHE A TABELA (CRONOGRAMA) ---
        const scheduleBody = document.getElementById('schedule-body');
        scheduleBody.innerHTML = '';
        schedule.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${row.index}</td><td>${formatDate(row.date)}</td><td>${formatCurrency(row.capital)}</td><td>${formatCurrency(row.interest)}</td><td>${formatCurrency(row.insurance)}</td><td>${formatCurrency(row.totalPayment)}</td><td>${formatCurrency(row.balance)}</td>`;
            scheduleBody.appendChild(tr);
        });

        // --- ADICIONA A LINHA DE TOTAIS NA TABELA ---
        const table = document.getElementById('schedule-table');
        let tfoot = table.querySelector('tfoot');
        if (tfoot) tfoot.remove(); // Limpa totais anteriores
        tfoot = table.createTFoot();
        const totalsRow = tfoot.insertRow();
        totalsRow.className = 'table-totals-row';
        totalsRow.innerHTML = `
            <td colspan="2"><strong>TOTAIS</strong></td>
            <td><strong>${formatCurrency(totals.capital)}</strong></td>
            <td><strong>${formatCurrency(totals.interest)}</strong></td>
            <td></td> <!-- Coluna Prestamista vazia no total -->
            <td><strong>${formatCurrency(totals.totalPayment)}</strong></td>
            <td></td> <!-- Coluna Saldo Devedor vazia no total -->
        `;

        // --- ADICIONA O DISCLAIMER ---
        const disclaimerTextElement = document.getElementById('disclaimer-text');
        disclaimerTextElement.textContent = `*Todas as opiniões, estimativas e projeções que constam do presente material traduzem nosso julgamento no momento da sua elaboração e podem ser modificadas a qualquer momento e sem aviso prévio, a exclusivo critério do BB e sem nenhum ônus e/ou responsabilidade para este. O BB não será responsável, ainda, por quaisquer perdas diretas, indiretas ou quaisquer tipos de prejuízos e/ou lucros cessantes que possam ser decorrentes do uso deste conteúdo. Qualquer decisão de contratar a estrutura aqui apresentada deve ser baseada exclusivamente em análise do cliente, sendo exclusivamente do cliente a responsabilidade por tal decisão. Nenhuma suposição, projeção ou exemplificação constante deste material deve ser considerada como garantia de eventos futuros e/ou de “performance”. Este documento não constitui oferta, convite, contratação da estrutura ou qualquer obrigação por parte do BB, de qualquer forma e em qualquer nível.`;

        // --- MOSTRA A ÁREA DE RESULTADOS ---
        document.getElementById('results-area').classList.remove('hidden');
    }

    function calculateIRR(cashFlow, guess = 0.01) {
        const MAX_ITERATIONS = 100, PRECISION = 1.0e-7;
        let rate = guess;
        for (let i = 0; i < MAX_ITERATIONS; i++) {
            let npv = 0.0, dnpv = 0.0;
            for (let j = 0; j < cashFlow.length; j++) {
                const denominator = Math.pow(1.0 + rate, j);
                if (denominator === 0) return Infinity;
                npv += cashFlow[j] / denominator;
                dnpv -= j * cashFlow[j] / Math.pow(1.0 + rate, j + 1);
            }
            if (dnpv === 0) return Infinity;
            const newRate = rate - npv / dnpv;
            if (Math.abs(newRate - rate) < PRECISION) return newRate;
            rate = newRate;
        }
        return rate;
    }
    
    // --- LÓGICA DE EXPORTAÇÃO PARA PDF ---
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    exportPdfBtn.addEventListener('click', () => {
        if (!lastCalculationResults) {
            alert('Por favor, primeiro realize uma simulação para depois exportar o PDF.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const { schedule, summary, totals } = lastCalculationResults;
        
        const margin = 15;
        const pageWidth = doc.internal.pageSize.width;
        let y = 20;

        const primaryColor = [0, 90, 156];
        const textColor = [45, 55, 72];
        const accentColor = [255, 193, 7];

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(...primaryColor);
        doc.text('Simulação de Capital de Giro PEAC FGI', pageWidth / 2, y, { align: 'center' });
        y += 7;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...textColor);
        doc.text('Desenvolvida por Agência Empresa Teresina (7625) - Banco do Brasil', pageWidth / 2, y, { align: 'center' });
        y += 4;
        
        doc.setDrawColor(...accentColor);
        doc.setLineWidth(1.0);
        doc.line(margin, y, pageWidth - margin, y);
        y += 10;

        doc.setFontSize(10);
        doc.text('Prezado Cliente,', margin, y);
        y += 6;
        const introText = 'Em atendimento à sua solicitação, informamos a COTAÇÃO INDICATIVA para contratação de BB CAPITAL DE GIRO PEAC FGI, nas seguintes condições:';
        doc.text(introText, margin, y, { maxWidth: pageWidth - margin * 2 });
        y += 12;

        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        const listItems = [
            '1. Precificação indicativa: sujeito à confirmação/revisão previamente ao fechamento da operação;',
            '2. A presente cotação reflete as atuais condições de mercado, com projeção dos especialistas, podendo ser alterada a qualquer momento, caso ocorram mudanças no cenário macroeconômico nacional e/ou internacional;',
            '3. Essa cotação tem validade de 2 dias a contar da data de sua emissão.'
        ];
        listItems.forEach(item => {
            doc.text(item, margin, y, { maxWidth: pageWidth - margin * 2 });
            y += 8;
        });
        y += 12;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...textColor);

        const lineHeight = 6;
        const blockSpacing = 10;
        const column2X = pageWidth / 2 + 5;
        let yLeft = y;
        let yRight = y;

        const drawSubtitle = (text, x, yPos) => {
            doc.setFont('helvetica', 'bold');
            doc.text(text, x, yPos);
            doc.setDrawColor(...accentColor);
            doc.setLineWidth(1.0);
            doc.line(x, yPos + 1.5, x + doc.getTextWidth(text), yPos + 1.5);
            doc.setFont('helvetica', 'normal');
            return yPos + blockSpacing;
        };

        yLeft = drawSubtitle('Cliente', margin, yLeft);
        doc.text(`Nome: ${summary.clientName}`, margin, yLeft);
        yLeft += lineHeight;
        doc.text(`CNPJ: ${summary.clientCnpj}`, margin, yLeft);
        yLeft += lineHeight;
        doc.text(`Data da Proposta: ${formatDate(new Date(summary.proposalDate + 'T00:00:00'))}`, margin, yLeft);
        yLeft += blockSpacing;
        
        doc.text(`Sistema de Reposição: SAC`, margin, yLeft);
        yLeft += lineHeight;
        doc.text(`Valor a Financiar: ${formatCurrency(summary.loanAmount)}`, margin, yLeft);
        yLeft += lineHeight;
        doc.text(`Carência: ${summary.gracePeriodDays} dias`, margin, yLeft);
        yLeft += lineHeight;
        doc.text(`Data da 1ª Parcela: ${formatDate(new Date(summary.firstPaymentDate + 'T00:00:00'))}`, margin, yLeft);
        yLeft += lineHeight;
        doc.text(`Parcelas: ${summary.installments}`, margin, yLeft);
        
        yRight = drawSubtitle('Taxas da Operação', column2X, yRight);
        doc.text(`Taxa Contratual: CDI + ${formatPercentageNoSymbol(summary.contractRate)}% a.a.`, column2X, yRight);
        yRight += lineHeight;
        doc.text(`CDI: ${formatPercentageNoSymbol(summary.cdiRate)}% a.a.`, column2X, yRight);
        yRight += lineHeight;
        doc.text(`Taxa de Juros Equivalente Mensal: ${formatPercentage(summary.monthlyInterestRate)}`, column2X, yRight);
        yRight += blockSpacing;

        yRight = drawSubtitle('Custos Iniciais (Pagos na Liberação)', column2X, yRight);
        const totalCustos = summary.TAC + summary.ecg + summary.iof + summary.insuranceInstallmentValue;
        doc.text(`TAC: ${formatCurrency(summary.TAC)}`, column2X, yRight);
        yRight += lineHeight;
        doc.text(`ECG: ${formatCurrency(summary.ecg)}`, column2X, yRight);
        yRight += lineHeight;
        doc.text(`IOF: ${formatCurrency(summary.iof)}`, column2X, yRight);
        yRight += lineHeight;
        doc.text(`1ª Parcela do Prestamista: ${formatCurrency(summary.insuranceInstallmentValue)}`, column2X, yRight);
        yRight += lineHeight;
        doc.setFont('helvetica', 'bold');
        doc.text(`Total: ${formatCurrency(totalCustos)}`, column2X, yRight);
        doc.setFont('helvetica', 'normal');

        y = Math.max(yLeft, yRight) + 15;

        const tableBody = schedule.map(row => [
            row.index, formatDate(row.date), formatCurrency(row.capital), formatCurrency(row.interest),
            formatCurrency(row.insurance), formatCurrency(row.totalPayment), formatCurrency(row.balance),
        ]);

        const tableFooter = [[
            { content: 'TOTAIS', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } },
            { content: formatCurrency(totals.capital), styles: { halign: 'right', fontStyle: 'bold' } },
            { content: formatCurrency(totals.interest), styles: { halign: 'right', fontStyle: 'bold' } },
            '',
            { content: formatCurrency(totals.totalPayment), styles: { halign: 'right', fontStyle: 'bold' } },
            '',
        ]];

        doc.autoTable({
            startY: y,
            head: [['#', 'Data', 'Capital (Amortização)', 'Juros', 'Prestamista', 'Valor a Pagar', 'Saldo Devedor']],
            body: tableBody,
            foot: tableFooter,
            theme: 'grid',
            headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
            footStyles: { fillColor: [229, 239, 245], textColor: textColor, fontStyle: 'bold' },
            bodyStyles: { textColor: textColor },
            alternateRowStyles: { fillColor: [244, 247, 249] },
            styles: { fontSize: 7, cellPadding: 2 },
            columnStyles: { 0: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' },},
            didDrawPage: (data) => {
                // Adiciona o rodapé com a paginação em todas as páginas
                doc.setFontSize(8);
                doc.setTextColor(128, 128, 128);
                doc.text(`Página ${data.pageNumber}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
            }
        });
        
        let finalY = doc.lastAutoTable.finalY;
        y = finalY + 10;

        doc.setDrawColor(...primaryColor);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 7;

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...textColor);
        const disclaimerText = `*Todas as opiniões, estimativas e projeções que constam do presente material traduzem nosso julgamento no momento da sua elaboração e podem ser modificadas a qualquer momento e sem aviso prévio, a exclusivo critério do BB e sem nenhum ônus e/ou responsabilidade para este. O BB não será responsável, ainda, por quaisquer perdas diretas, indiretas ou quaisquer tipos de prejuízos e/ou lucros cessantes que possam ser decorrentes do uso deste conteúdo. Qualquer decisão de contratar a estrutura aqui apresentada deve ser baseada exclusivamente em análise do cliente, sendo exclusivamente do cliente a responsabilidade por tal decisão. Nenhuma suposição, projeção ou exemplificação constante deste material deve ser considerada como garantia de eventos futuros e/ou de “performance”. Este documento não constitui oferta, convite, contratação da estrutura ou qualquer obrigação por parte do BB, de qualquer forma e em qualquer nível.`;
        const splitDisclaimer = doc.splitTextToSize(disclaimerText, pageWidth - margin * 2);
        doc.text(splitDisclaimer, margin, y);

        // Rodapé da aplicação na última página
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        const footerText = `Versão ${APP_VERSION} - Aplicação web desenvolvida por Francisco Eliciano. Contato: eliciano@outlook.com.br.`;
        doc.text(footerText, pageWidth / 2, doc.internal.pageSize.height - 15, { align: 'center' });

        doc.save(`Cotacao_Indicativa_PEAC_FGI_${summary.clientName.replace(/ /g, '_')}.pdf`);
    });
});
