document.addEventListener('DOMContentLoaded', () => {
  const APP_VERSION = '1.5.1';

  // --- Rodapé ---
  const footer = document.getElementById('app-footer');
  if (footer) footer.textContent = `Versão ${APP_VERSION} - Aplicação web desenvolvida por Francisco Eliciano. Contato: eliciano@outlook.com.br.`;

  // --- Estado para exportação de PDF ---
  let lastCalculationResults = null;

  // ===== Tabelas =====
  const fatorKTable = [
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

  const seguroTable = [
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

  // ===== Utilitários =====
  const fmtBRL = (v) => `R$ ${(+v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtDate = (d) => d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  const fmtPct  = (x) => `${(x * 100).toFixed(2).replace('.', ',')}%`;
  const fmtPctNo = (x) => `${x.toFixed(2).replace('.', ',')}`;

  // Feriados bancários opcionais via ?feriados=1
  const urlParams = new URLSearchParams(location.search);
  const USE_BANK_HOLIDAYS = urlParams.get('feriados') === '1';

  const toISO = (d) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const addDaysUTC = (d, n) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n));
  function easterDate(year){const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31)-1,day=((h+l-7*m+114)%31)+1;return new Date(Date.UTC(year,month,day));}
  function brazilBankHolidays(year){const set=new Set();const fixed=[[0,1],[3,21],[4,1],[8,7],[9,12],[10,2],[10,15],[10,20],[11,25]];fixed.forEach(([m,d])=>set.add(toISO(new Date(Date.UTC(year,m,d)))));const e=easterDate(year),gf=addDaysUTC(e,-2),cm=addDaysUTC(e,-48),ct=addDaysUTC(e,-47),cc=addDaysUTC(e,60);[gf,cm,ct,cc].forEach(dt=>set.add(toISO(dt)));return set;}
  function buildHolidaySetForRange(start,end){if(!USE_BANK_HOLIDAYS)return null;const y0=start.getUTCFullYear(),y1=end.getUTCFullYear();const set=new Set();for(let y=y0;y<=y1;y++){brazilBankHolidays(y).forEach(v=>set.add(v));}return set;}

  const isBusinessDay = (d, holidaysSet) => {
    const dow = d.getUTCDay(); // 0=Dom, 6=Sáb
    if (dow === 0 || dow === 6) return false;
    if (holidaysSet && holidaysSet.has(toISO(d))) return false;
    return true;
  };
  const nextBusinessDay = (d, holidaysSet) => {
    const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    while (!isBusinessDay(x, holidaysSet)) x.setUTCDate(x.getUTCDate() + 1);
    return x;
  };
  const calculateBusinessDays = (startDate, endDate, holidaysSet) => { // (início, fim]
    let count = 0;
    const cur = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
    const end = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));
    cur.setUTCDate(cur.getUTCDate() + 1);
    while (cur.getTime() <= end.getTime()) {
      if (isBusinessDay(cur, holidaysSet)) count++;
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return count;
  };
  const addMonthsSetDayUTC = (d, months, day) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth()+months, day));
  const periodRateFromDU = (du, cdiAnnual, stAnnual) => Math.pow(1 + cdiAnnual, du/252) * Math.pow(1 + stAnnual, du/252) - 1;

  // ===== Cálculo =====
  document.getElementById('calculate-btn').addEventListener('click', () => {
    const required = ['client-name','client-cnpj','proposal-date','loan-amount','grace-period','first-payment-date','installments','partners-qty','contract-rate','cdi-rate'];
    const missing = required.filter(id => !document.getElementById(id) || !document.getElementById(id).value);
    if (missing.length) { alert('Por favor, preencha todos os campos obrigatórios.'); return; }

    const proposalDateStr = document.getElementById('proposal-date').value;
    const firstPaymentDateStr = document.getElementById('first-payment-date').value;
    const proposalDate = new Date(proposalDateStr + 'T00:00:00');
    let firstPaymentDate = new Date(firstPaymentDateStr + 'T00:00:00');

    const loanAmount = parseFloat(document.getElementById('loan-amount').value);
    const gracePeriodDays = parseInt(document.getElementById('grace-period').value, 10);
    const installments = parseInt(document.getElementById('installments').value, 10);
    const partnersQty = parseInt(document.getElementById('partners-qty').value, 10);
    const contractRate = parseFloat(document.getElementById('contract-rate').value) / 100;
    const cdiRate = parseFloat(document.getElementById('cdi-rate').value) / 100;

    // baseDay = dia da 1ª parcela (data-base mensal)
    const baseDay = firstPaymentDate.getUTCDate();

    // Feriados para todo o range
    const prelimEnd = addMonthsSetDayUTC(firstPaymentDate, installments + 6, baseDay);
    const HOLIDAYS_SET = buildHolidaySetForRange(proposalDate, prelimEnd);

    // Tabelas auxiliares
    const totalTermDays = gracePeriodDays + (installments * 30);
    const totalTermMonths = Math.ceil(totalTermDays / 30);

    const insuranceRatePercent = seguroTable.find(r => totalTermDays >= r.minDays && totalTermDays <= r.maxDays)?.ratePercent;
    if (!insuranceRatePercent) { alert('Prazo da operação fora da tabela de seguro.'); return; }

    const kFactor = fatorKTable.find(r => totalTermMonths >= r.minMonths && totalTermMonths <= r.maxMonths)?.value;
    if (!kFactor) { alert('Prazo da operação fora da tabela de fator K.'); return; }

    const totalInsuranceValue = loanAmount * (insuranceRatePercent / 100) * partnersQty;
    const numGracePayments = Math.floor(gracePeriodDays / 30);
    const numInsurancePayments = numGracePayments + (installments - 1);
    const insuranceInstallmentValue = numInsurancePayments > 0 ? totalInsuranceValue / numInsurancePayments : 0;

    const ecgN = Math.floor(totalTermDays / 30);
    const ecg = 0.4 * (0.8 * kFactor * loanAmount * ecgN);

    // ===== Monta cronograma =====
    const paymentSchedule = [];
    const cashFlow = []; // para CET

    // Linha 0 (liberação) — custos plugados ao final
    paymentSchedule.push({ index: 0, date: proposalDate, capital: 0, interest: 0, insurance: insuranceInstallmentValue, totalPayment: 0, balance: loanAmount });
    cashFlow.push(loanAmount);

    // Pró‑rata avulso: reconstruído a partir da 1ª parcela para coerência com a cadeia de bases
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

    // Carência — juros apenas
    for (let i = 1; i <= numGracePayments; i++) {
      const graceRaw = addMonthsSetDayUTC(avulsoDate, i, baseDay);
      const graceDate = nextBusinessDay(graceRaw, HOLIDAYS_SET);
      const du = calculateBusinessDays(lastPaymentDate, graceDate, HOLIDAYS_SET);
      const interest = loanAmount * periodRateFromDU(du, cdiRate, contractRate);
      paymentSchedule.push({ index: i, date: graceDate, capital: 0, interest, insurance: insuranceInstallmentValue, totalPayment: interest + insuranceInstallmentValue, balance: loanAmount });
      cashFlow.push(-(interest + insuranceInstallmentValue));
      lastPaymentDate = graceDate;
    }

    // Amortizações — SAC
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

    // IOF por trechos (fixo + diário até 365 dias)
    const iofFixed = loanAmount * 0.0038; // 0,38%
    const iofDailyRate = 0.000082; // 0,0082%/dia
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

    // Custos iniciais e CET
    const upfrontTAC = 5000; // mantido
    const upfrontCosts = upfrontTAC + ecg + iof + insuranceInstallmentValue;
    paymentSchedule[0].totalPayment = upfrontCosts;
    cashFlow[0] = loanAmount - upfrontCosts; // entrada líquida para IRR

    const totals = paymentSchedule.reduce((acc, row, idx) => { if (idx>0){ acc.capital+=row.capital; acc.interest+=row.interest; acc.totalPayment+=row.totalPayment;} return acc; }, { capital:0, interest:0, totalPayment:0 });

    const totalAnnualRate = contractRate + cdiRate; // exibição
    const monthlyInterestRate = Math.pow(1 + totalAnnualRate, 1/12) - 1;
    const cetMonthly = calculateIRR(cashFlow);
    const cetAnnual = cetMonthly ? (Math.pow(1 + cetMonthly, 12) - 1) : 0;

    const summaryData = {
      clientName: document.getElementById('client-name').value,
      clientCnpj: document.getElementById('client-cnpj').value,
      proposalDate: proposalDateStr,
      loanAmount, gracePeriodDays, firstPaymentDate: firstPaymentDateStr, installments,
      contractRate: contractRate * 100, cdiRate: cdiRate * 100,
      TAC: upfrontTAC, ecg, iof, insuranceInstallmentValue, upfrontCosts,
      monthlyInterestRate, cetMonthly, cetAnnual,
    };

    lastCalculationResults = { schedule: paymentSchedule, summary: summaryData, totals };
    displayResults(paymentSchedule, summaryData, totals);
  });

  function displayResults(schedule, summary, totals){
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
    for (const r of schedule) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r.index}</td><td>${fmtDate(r.date)}</td><td>${fmtBRL(r.capital)}</td><td>${fmtBRL(r.interest)}</td><td>${fmtBRL(r.insurance)}</td><td>${fmtBRL(r.totalPayment)}</td><td>${fmtBRL(r.balance)}</td>`;
      tbody.appendChild(tr);
    }

    const table = $('schedule-table');
    let tfoot = table.querySelector('tfoot'); if (tfoot) tfoot.remove(); tfoot = table.createTFoot();
    const row = tfoot.insertRow(); row.className = 'table-totals-row';
    row.innerHTML = `<td colspan="2"><strong>TOTAIS</strong></td><td><strong>${fmtBRL(totals.capital)}</strong></td><td><strong>${fmtBRL(totals.interest)}</strong></td><td></td><td><strong>${fmtBRL(totals.totalPayment)}</strong></td><td></td>`;

    document.getElementById('disclaimer-text').textContent = `*Todas as opiniões, estimativas e projeções que constam do presente material traduzem nosso julgamento no momento da sua elaboração e podem ser modificadas a qualquer momento e sem aviso prévio, a exclusivo critério do BB e sem nenhum ônus e/ou responsabilidade para este. O BB não será responsável, ainda, por quaisquer perdas diretas, indiretas ou quaisquer tipos de prejuízos e/ou lucros cessantes que possam ser decorrentes do uso deste conteúdo. Qualquer decisão de contratar a estrutura aqui apresentada deve ser baseada exclusivamente em análise do cliente, sendo exclusivamente do cliente a responsabilidade por tal decisão. Nenhuma suposição, projeção ou exemplificação constante deste material deve ser considerada como garantia de eventos futuros e/ou de “performance”. Este documento não constitui oferta, convite, contratação da estrutura ou qualquer obrigação por parte do BB, de qualquer forma e em qualquer nível.`;

    document.getElementById('results-area').classList.remove('hidden');
  }

  function calculateIRR(cashFlow, guess=0.01){
    const MAX=100, PREC=1e-7; let rate=guess;
    for (let i=0;i<MAX;i++){
      let npv=0, dnpv=0;
      for (let j=0;j<cashFlow.length;j++){
        const den=Math.pow(1+rate, j); if(den===0) return Infinity;
        npv += cashFlow[j] / den;
        dnpv -= j * cashFlow[j] / Math.pow(1+rate, j+1);
      }
      if (dnpv===0) return Infinity;
      const newRate = rate - npv/dnpv;
      if (Math.abs(newRate - rate) < PREC) return newRate;
      rate = newRate;
    }
    return rate;
  }

  // ===== Exportação PDF =====
  document.getElementById('export-pdf-btn').addEventListener('click', () => {
    if (!lastCalculationResults) { alert('Por favor, primeiro realize uma simulação para depois exportar o PDF.'); return; }
    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    const { schedule, summary, totals } = lastCalculationResults;

    const margin=15, pageWidth=doc.internal.pageSize.width; let y=20;
    const primary=[0,90,156], text=[45,55,72], accent=[255,193,7];

    doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.setTextColor(...primary);
    doc.text('Simulação de Capital de Giro PEAC FGI', pageWidth/2, y, { align:'center' }); y+=7;

    doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(...text);
    doc.text('Desenvolvida por Agência Empresa Teresina (7625) - Banco do Brasil', pageWidth/2, y, { align:'center' }); y+=4;

    doc.setDrawColor(...accent); doc.setLineWidth(1.0); doc.line(margin,y,pageWidth-margin,y); y+=10;

    doc.setFontSize(10); doc.text('Prezado Cliente,', margin, y); y+=6;
    const intro='Em atendimento à sua solicitação, informamos a COTAÇÃO INDICATIVA para contratação de BB CAPITAL DE GIRO PEAC FGI, nas seguintes condições:';
    doc.text(intro, margin, y, { maxWidth: pageWidth - margin*2 }); y+=12;

    doc.setFontSize(8); doc.setTextColor(128,128,128);
    const bullets=[
      '1. Precificação indicativa: sujeito à confirmação/revisão previamente ao fechamento da operação;',
      '2. A presente cotação reflete as atuais condições de mercado, com projeção dos especialistas, podendo ser alterada a qualquer momento, caso ocorram mudanças no cenário macroeconômico nacional e/ou internacional;',
      '3. Essa cotação tem validade de 2 dias a contar da data de sua emissão.'
    ];
    for (const t of bullets){ doc.text(t, margin, y, { maxWidth: pageWidth - margin*2 }); y+=8; }
    y+=12;

    const lineH=6, blk=10, col2=pageWidth/2+5; let yL=y, yR=y;
    const sub=(txt,x,y0)=>{doc.setFont('helvetica','bold'); doc.text(txt,x,y0); doc.setDrawColor(...accent); doc.setLineWidth(1.0); doc.line(x,y0+1.5,x+doc.getTextWidth(txt),y0+1.5); doc.setFont('helvetica','normal'); return y0+blk;};
    yL=sub('Cliente',margin,yL);
    doc.text(`Nome: ${summary.clientName}`,margin,yL); yL+=lineH;
    doc.text(`CNPJ: ${summary.clientCnpj}`,margin,yL); yL+=lineH;
    doc.text(`Data da Proposta: ${fmtDate(new Date(summary.proposalDate+'T00:00:00'))}`,margin,yL); yL+=blk;

    doc.text(`Sistema de Reposição: SAC`,margin,yL); yL+=lineH;
    doc.text(`Valor a Financiar: ${fmtBRL(summary.loanAmount)}`,margin,yL); yL+=lineH;
    doc.text(`Carência: ${summary.gracePeriodDays} dias`,margin,yL); yL+=lineH;
    doc.text(`Data da 1ª Parcela: ${fmtDate(new Date(summary.firstPaymentDate+'T00:00:00'))}`,margin,yL); yL+=lineH;
    doc.text(`Parcelas: ${summary.installments}`,margin,yL);

    yR=sub('Taxas da Operação',col2,yR);
    doc.text(`Taxa Contratual: CDI + ${fmtPctNo(summary.contractRate)}% a.a.`,col2,yR); yR+=lineH;
    doc.text(`CDI: ${fmtPctNo(summary.cdiRate)}% a.a.`,col2,yR); yR+=lineH;
    doc.text(`Taxa de Juros Equivalente Mensal: ${fmtPct(summary.monthlyInterestRate)}`,col2,yR); yR+=blk;

    yR=sub('Custos Iniciais (Pagos na Liberação)',col2,yR);
    const totalCustos = summary.TAC + summary.ecg + summary.iof + summary.insuranceInstallmentValue;
    doc.text(`TAC: ${fmtBRL(summary.TAC)}`,col2,yR); yR+=lineH;
    doc.text(`ECG: ${fmtBRL(summary.ecg)}`,col2,yR); yR+=lineH;
    doc.text(`IOF: ${fmtBRL(summary.iof)}`,col2,yR); yR+=lineH;
    doc.text(`1ª Parcela do Prestamista: ${fmtBRL(summary.insuranceInstallmentValue)}`,col2,yR); yR+=lineH;
    doc.setFont('helvetica', 'bold'); doc.text(`Total: ${fmtBRL(totalCustos)}`,col2,yR); doc.setFont('helvetica','normal');

    y = Math.max(yL,yR) + 15;

    const tableBody = schedule.map(r=>[ r.index, fmtDate(r.date), fmtBRL(r.capital), fmtBRL(r.interest), fmtBRL(r.insurance), fmtBRL(r.totalPayment), fmtBRL(r.balance) ]);
    const tableFooter=[[ {content:'TOTAIS', colSpan:2, styles:{halign:'center', fontStyle:'bold'}}, {content:fmtBRL(totals.capital), styles:{halign:'right', fontStyle:'bold'}}, {content:fmtBRL(totals.interest), styles:{halign:'right', fontStyle:'bold'}}, '', {content:fmtBRL(totals.totalPayment), styles:{halign:'right', fontStyle:'bold'}}, '' ]];

    doc.autoTable({
      startY:y,
      head:[['#','Data','Capital (Amortização)','Juros','Prestamista','Valor a Pagar','Saldo Devedor']],
      body:tableBody,
      foot:tableFooter,
      showFoot:'lastPage',
      theme:'grid',
      headStyles:{ fillColor:[0,90,156], textColor:[255,255,255], fontStyle:'bold'},
      footStyles:{ fillColor:[229,239,245], textColor:[45,55,72], fontStyle:'bold'},
      bodyStyles:{ textColor:[45,55,72]},
      alternateRowStyles:{ fillColor:[244,247,249]},
      styles:{ fontSize:7, cellPadding:2 },
      columnStyles:{0:{halign:'center'},2:{halign:'right'},3:{halign:'right'},4:{halign:'right'},5:{halign:'right'},6:{halign:'right'}},
      didDrawPage:(data)=>{ doc.setFontSize(8); doc.setTextColor(128,128,128); doc.text(`Página ${data.pageNumber}`, pageWidth/2, doc.internal.pageSize.height-10, {align:'center'}); }
    });

    let y2 = doc.lastAutoTable.finalY;
    const pageHeight = doc.internal.pageSize.height;
    const bottomMargin = 20;

    doc.setFontSize(7);
    const disclaimer = `*Todas as opiniões, estimativas e projeções que constam do presente material traduzem nosso julgamento no momento da sua elaboração e podem ser modificadas a qualquer momento e sem aviso prévio, a exclusivo critério do BB e sem nenhum ônus e/ou responsabilidade para este. O BB não será responsável, ainda, por quaisquer perdas diretas, indiretas ou quaisquer tipos de prejuízos e/ou lucros cessantes que possam ser decorrentes do uso deste conteúdo. Qualquer decisão de contratar a estrutura aqui apresentada deve ser baseada exclusivamente em análise do cliente, sendo exclusivamente do cliente a responsabilidade por tal decisão. Nenhuma suposição, projeção ou exemplificação constante deste material deve ser considerada como garantia de eventos futuros e/ou de “performance”. Este documento não constitui oferta, convite, contratação da estrutura ou qualquer obrigação por parte do BB, de qualquer forma e em qualquer nível.`;
    const split = doc.splitTextToSize(disclaimer, pageWidth - margin*2);
    const discH = (split.length * doc.getFontSize()) / doc.internal.scaleFactor;
    const spaceForLine = 15; const need = spaceForLine + discH;
    if (y2 + need > pageHeight - bottomMargin) { doc.addPage(); y2 = margin; }
    y2 += 5; doc.setDrawColor(0,90,156); doc.setLineWidth(0.5); doc.line(margin,y2,pageWidth-margin,y2); y2 += 7; doc.setFont('helvetica','normal'); doc.setTextColor(45,55,72); doc.text(split, margin, y2);

    doc.setFontSize(7); doc.setTextColor(128,128,128); const footTxt = `Versão ${APP_VERSION} - Aplicação web desenvolvida por Francisco Eliciano. Contato: eliciano@outlook.com.br.`; doc.text(footTxt, pageWidth/2, pageHeight-15, {align:'center'});

    doc.save(`Cotacao_Indicativa_PEAC_FGI_${summary.clientName.replace(/ /g,'_')}.pdf`);
  });
});
