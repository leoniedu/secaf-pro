// SECAF Helper main script
// Converted from bookmarklet to Chrome extension format

function secaf() {
  // Check if we're on the SECAF system (background.js already probes for this;
  // kept as a silent safety net)
  if (!document.querySelector('img[alt="Logotipo SECAF"]')) {
    return;
  }

  // Get month information
  const elementoMes = document.querySelector("#SideNav > div:nth-child(1) > info-mes > div.d-flex.justify-content-between.align-items-center.mx-3.pb-3.text-center.dropdown.month-select > a");
  if (!elementoMes) {
    alert("Não foi possível encontrar as informações de ano, mês e SIAPE.");
    return;
  }

  const partes = elementoMes.getAttribute("href").split("/").slice(-2);
  const anoMes = partes[0];
  const ano = parseInt(anoMes.substring(0, 4));
  const mes = parseInt(anoMes.substring(4, 6));
  const diasSegundaASexta = calcularDiasSegundaASexta(ano, mes);
  const ultimoDiaMes = new Date(ano, mes, 0).getDate();

  // Get work days
  const elementoDiasUteis = document.querySelector("#SideNav > div:nth-child(1) > info-mes > div.mx-3.pb-3.work-days > span.work-days__number");
  if (!elementoDiasUteis) {
    alert("Não foi possível encontrar a informação de dias úteis.");
    return;
  }
  const diasUteis = parseInt(elementoDiasUteis.textContent.trim());

  // Find the worked-hours table up front so vacation days can be autodetected
  const tabelaApuracao = document.querySelector("body > app-root > main-page > div > main > painel-apuracao > tabela-apuracao");
  if (!tabelaApuracao) {
    alert("Não foi possível encontrar a tabela de apuração de horas.");
    return;
  }
  const linhas = tabelaApuracao.querySelectorAll("tr");
  console.log(`Encontradas ${linhas.length} linhas na tabela`);

  // Read each row's date cell text once, reused below for vacation detection
  // and for finding today's row
  const diasCelulaData = Array.from(linhas, (linha) => {
    const celula = linha.querySelector("th");
    return celula ? celula.textContent.trim() : "";
  });

  // Autodetect vacation days reported in the table (e.g. "0221 Férias"),
  // keeping track of which day-of-month each vacation row falls on
  const diasDeFeriasDetectados = [];
  linhas.forEach((linha, indice) => {
    if (linha.textContent.toLowerCase().includes("férias")) {
      const matchDia = diasCelulaData[indice].match(/^(\d{1,2})/);
      if (matchDia) diasDeFeriasDetectados.push(parseInt(matchDia[1]));
    }
  });
  console.log(`Dias de férias detectados na tabela: ${diasDeFeriasDetectados.join(", ") || "nenhum"}`);

  // Read the holiday list (day + description) from the sidebar, if present.
  // Some pontos facultativos are afternoon-only (e.g. "após as 13 horas"):
  // SECAF's diasUteis still credits these as a full day off, but only half
  // the working day is actually free, so they're tracked separately to
  // deduct 4h instead of 8h.
  const diasFeriados = [];
  const diasFeriadosParciais = new Set();
  document.querySelectorAll(".holidays__number").forEach((elementoDia) => {
    const dia = parseInt(elementoDia.textContent.trim());
    if (isNaN(dia)) return;
    diasFeriados.push(dia);
    const textoDescricao = elementoDia.parentElement?.querySelector(".holidays__text")?.textContent || "";
    if (/após\s+as\s+\d{1,2}\s*horas/i.test(textoDescricao)) {
      diasFeriadosParciais.add(dia);
    }
  });
  console.log(`Feriados listados na página: ${diasFeriados.join(", ") || "nenhum"}`);
  console.log(`Feriados parciais (meio período): ${Array.from(diasFeriadosParciais).join(", ") || "nenhum"}`);

  // Get required hours
  const horasPresencial = pedirNumero("Número de horas presenciais obrigatórias por mês:", "64");
  if (horasPresencial === null) return;

  // Confirm the vacation days detected in the apuração table, same pattern
  // as the holiday confirmation below: show what was found and let the
  // user override with the day-spec format if the table is wrong/incomplete.
  let diasDeFeriasRegistrados = diasDeFeriasDetectados;
  if (diasDeFeriasDetectados.length > 0) {
    const usarFeriasDetectadas = confirm(
      `Foram detectados os seguintes dias de férias na apuração: ${formatarDiasDoMes(diasDeFeriasDetectados)}.\nDeseja usar estes dias?\nClique em OK para usar os dias detectados ou em Cancelar para informar manualmente.`
    );
    if (!usarFeriasDetectadas) {
      const feriasManualTexto = prompt(
        "Dias (números) de férias já registrados no mês, ex: 10-20:",
        formatarDiasDoMes(diasDeFeriasDetectados)
      );
      if (feriasManualTexto === null) return;
      diasDeFeriasRegistrados = parsearDiasDoMes(feriasManualTexto, ultimoDiaMes) || [];
    }
  }
  const diasDeFeriasRegistradosSet = new Set(diasDeFeriasRegistrados);

  // Get additional vacation days not yet shown in the apuração (e.g. future
  // vacation SECAF hasn't registered yet), as a "print pages" style day
  // spec (e.g. "22,23,24-26"). Exact days let us cross-reference holidays
  // precisely instead of relying on a bare count.
  const diasFeriasExtrasTexto = prompt(
    `Dias de férias ADICIONAIS no mês, ainda não registrados no SECAF (números do dia, ex: 22,23,24-26). Deixe em branco se não houver:`,
    ""
  );
  if (diasFeriasExtrasTexto === null) return;
  // Ignore any typed day that's already registered, so overlaps don't get
  // counted twice toward diasFerias
  const diasDeFeriasExtras = (parsearDiasDoMes(diasFeriasExtrasTexto, ultimoDiaMes) || [])
    .filter((dia) => !diasDeFeriasRegistradosSet.has(dia));
  const diasFeriasExtras = diasDeFeriasExtras.length;
  const diasFerias = diasDeFeriasRegistrados.length + diasFeriasExtras;

  // Calculate holidays. diasUteis does not net out vacation days, so
  // diasSegundaASexta - diasUteis is the total holiday count for the month,
  // including holidays that fall inside vacation (split out below).
  const feriadosCalculados = diasSegundaASexta - diasUteis;
  const usarFeriadosCalculados = confirm(
    `Foram detectados ${feriadosCalculados} dias de feriados/pontos facultativos.\nDeseja usar este valor calculado automaticamente?\nClique em OK para usar o valor calculado ou em Cancelar para informar manualmente.`
  );

  // diasDeTodosFeriados holds the exact days used for the vacation-overlap
  // split below. When the count is auto-detected, that's whatever the page
  // listed (diasFeriados); when overridden manually, the user provides the
  // days directly (same "print pages" format as vacation) so the split
  // stays consistent with whatever they typed instead of silently reusing
  // the scraped list.
  let diasDeTodosFeriados = diasFeriados;
  if (!usarFeriadosCalculados) {
    const feriadosManualTexto = prompt(
      `Dias (números) de feriados e pontos facultativos no mês, ex: 8,24,25,31 (esperado: ${feriadosCalculados}):`,
      formatarDiasDoMes(diasFeriados)
    );
    if (feriadosManualTexto === null) return;
    diasDeTodosFeriados = parsearDiasDoMes(feriadosManualTexto, ultimoDiaMes) || [];
  }
  const feriadosEFacultativos = diasDeTodosFeriados.length;

  // Split holidays into those inside vs. outside vacation (both already
  // registered in SECAF and the extra days just entered). Only holidays
  // outside vacation reduce the hours owed for presence: a holiday inside
  // vacation lands on a day that (1 - diasFerias/ultimoDiaMes) already
  // excludes from the requirement, so counting it again would double-discount.
  const todosOsDiasDeFerias = new Set([...diasDeFeriasRegistrados, ...diasDeFeriasExtras]);
  const diasDeFeriadosForaFerias = diasDeTodosFeriados.filter((dia) => !todosOsDiasDeFerias.has(dia));

  // Afternoon-only pontos facultativos only free up half the working day,
  // even though SECAF's diasUteis credits them as a full day off
  const feriadosParciaisForaFerias = diasDeFeriadosForaFerias.filter((dia) => diasFeriadosParciais.has(dia)).length;
  const feriadosIntegraisForaFerias = diasDeFeriadosForaFerias.length - feriadosParciaisForaFerias;

  // Calculate required hours
  const horasDevidasMes0 = horasPresencial * (1 - diasFerias / ultimoDiaMes)
    - feriadosIntegraisForaFerias * 8 - feriadosParciaisForaFerias * 4;
  const horasDevidasMes = Math.max(horasDevidasMes0, 0);

  // Get worked hours from table
  let horasTrabalhadasMes = 0;

  // Find the row matching the current date, wherever it is in the table
  const dataAtual = new Date();
  const diaAtual = String(dataAtual.getDate()).padStart(2, '0');
  const mesAtual = dataAtual.getMonth() + 1;
  const mesesAbrev = {
    1: "JAN", 2: "FEV", 3: "MAR", 4: "ABR", 5: "MAI", 6: "JUN",
    7: "JUL", 8: "AGO", 9: "SET", 10: "OUT", 11: "NOV", 12: "DEZ"
  };
  const regexHoje = new RegExp(`${diaAtual}${mesesAbrev[mesAtual]}`, 'i');

  const indiceHoje = diasCelulaData.findIndex((texto) => regexHoje.test(texto));
  const linhaHoje = indiceHoje >= 0 ? linhas[indiceHoje] : null;

  let pularHoje = false;
  if (linhaHoje) {
    pularHoje = !confirm("Incluir a data de hoje?");
  }

  // Process each row
  linhas.forEach((linha, indice) => {
    if (pularHoje && linha === linhaHoje) {
      console.log("Pulando a linha da data atual.");
      return;
    }

    // Find all elements with class movimentacao__horario-tempo
    const elementosHorario = linha.querySelectorAll(".movimentacao__horario-tempo");
    if (elementosHorario.length === 0) {
      console.log(`Linha ${indice}: Nenhum elemento de horário encontrado`);
      return;
    }

    // Get the last element
    const ultimoElemento = elementosHorario[elementosHorario.length - 1];
    const textoOriginal = ultimoElemento.textContent.trim();
    console.log(`Linha ${indice}, último elemento: "${textoOriginal}"`);

    // Extract hours and minutes
    const match = textoOriginal.match(/(\d+)[h:](\d+)/);
    if (match) {
      const horas = parseInt(match[1]) || 0;
      const minutos = parseInt(match[2]) || 0;
      console.log(`Extraído: ${horas}h${minutos}m`);
      horasTrabalhadasMes += horas + (minutos / 60);
    } else {
      console.log(`Não foi possível extrair horas de "${textoOriginal}"`);
    }
  });

  console.log(`Total de horas trabalhadas: ${horasTrabalhadasMes.toFixed(2)}`);

  // Calculate hour balance
  const saldoHoras = horasDevidasMes - horasTrabalhadasMes;

  // Calculate remaining weekdays in the viewed month (excluding holidays)
  const hoje = new Date();
  let primeiroDiaRestante;
  if (ano === hoje.getFullYear() && mes === hoje.getMonth() + 1) {
    primeiroDiaRestante = hoje.getDate();
  } else if (new Date(ano, mes - 1, 1) > hoje) {
    primeiroDiaRestante = 1; // future month: all weekdays remain
  } else {
    primeiroDiaRestante = ultimoDiaMes + 1; // past month: none remain
  }

  const diasFeriadosSet = new Set(diasFeriados);
  let remainingWorkdays = 0;
  for (let dayOfMonth = primeiroDiaRestante; dayOfMonth <= ultimoDiaMes; dayOfMonth++) {
    const dateObject = new Date(ano, mes - 1, dayOfMonth);
    const ehFimDeSemana = dateObject.getDay() === 0 || dateObject.getDay() === 6;
    const ehFeriado = diasFeriadosSet.has(dayOfMonth);
    const ehFerias = todosOsDiasDeFerias.has(dayOfMonth);
    if (!ehFimDeSemana && !ehFeriado && !ehFerias) {
      remainingWorkdays++;
    }
  }

  const saldoHorasDia = saldoHoras > 0 && remainingWorkdays > 0 ? saldoHoras / remainingWorkdays : 0;

  // Create results HTML
  const htmlResultado = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ccc; border-radius: 5px; background-color: #f9f9f9;">
    <h2 style="color: #333; text-align: center;">Cálculo de Horas Presenciais SECAF</h2>
    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Ano/Mês</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${formatarMes(anoMes)}</td>
      </tr>
      <tr style="background-color: #f2f2f2;">
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Dias de segunda a sexta</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${diasSegundaASexta}</td>
      </tr>
      <tr style="background-color: #f2f2f2;">
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Feriados e pontos facultativos</td>
        <td style="padding: 8px; border: 1px solid #ddd;">
          ${feriadosEFacultativos}
          ${diasDeFeriadosForaFerias.length < feriadosEFacultativos ? ` (${feriadosEFacultativos - diasDeFeriadosForaFerias.length} durante as férias)` : ''}
          ${feriadosParciaisForaFerias > 0 ? ` — ${feriadosIntegraisForaFerias} integral(is) + ${feriadosParciaisForaFerias} parcial(is) descontado(s)` : ''}
        </td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Dias de férias</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${diasFerias}</td>
      </tr>
      <tr style="background-color: #f2f2f2;">
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Horas presenciais devidas</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${formatarHorasMinutos(horasDevidasMes)}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Horas presenciais trabalhadas</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${formatarHorasMinutos(horasTrabalhadasMes)}</td>
      </tr>
      <tr style="background-color: #e6f7ff; font-weight: bold;">
        <td style="padding: 8px; border: 1px solid #ddd;">Saldo de horas</td>
        <td style="padding: 8px; border: 1px solid #ddd; color: ${saldoHoras > 0 ? 'red' : 'green'};">
          ${formatarHorasMinutos(Math.abs(saldoHoras))} ${saldoHoras > 0 ? '(faltam horas)' : '(horas excedentes)'}
        </td>
      </tr>
      ${saldoHoras > 0 && remainingWorkdays > 0 ? `
      <tr style="background-color: #f0f8ff; font-weight: bold;">
        <td style="padding: 8px; border: 1px solid #ddd;">Saldo diário (${remainingWorkdays} dias úteis restantes*)</td>
        <td style="padding: 8px; border: 1px solid #ddd; color: ${saldoHorasDia > 0 ? 'red' : 'green'};">
          ${formatarHorasMinutos(saldoHorasDia)}
        </td>
      </tr>` : ''}
    </table>
    <p style="margin-top: 20px; font-size: 12px; color: #666; text-align: center;">
      *Dias úteis restantes já excluem feriados, pontos facultativos e férias já registradas<br>
      Cálculo baseado nas regras do PGD 2.0 do IBGE.<br>
      SECAF-PRO - Extensão não oficial para o Chrome
    </p>
  </div>`;

  // Create modal (replacing any previous one)
  const modalAnterior = document.getElementById('secaf-helper-modal');
  if (modalAnterior) modalAnterior.remove();

  const modal = document.createElement('div');
  modal.id = 'secaf-helper-modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
  modal.style.zIndex = '9999';
  modal.style.display = 'flex';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';
  modal.innerHTML = htmlResultado;

  // Add close button
  const botaoFechar = document.createElement('button');
  botaoFechar.innerText = 'Fechar';
  botaoFechar.style.position = 'absolute';
  botaoFechar.style.top = '10px';
  botaoFechar.style.right = '10px';
  botaoFechar.style.padding = '5px 10px';
  botaoFechar.style.backgroundColor = '#f44336';
  botaoFechar.style.color = 'white';
  botaoFechar.style.border = 'none';
  botaoFechar.style.borderRadius = '3px';
  botaoFechar.style.cursor = 'pointer';
  botaoFechar.onclick = function() {
    document.body.removeChild(modal);
  };

  modal.querySelector('div').appendChild(botaoFechar);
  document.body.appendChild(modal);
}

// Helper function to parse a "print pages" style day spec, e.g. "1,3,5-9",
// into a sorted array of unique day numbers. Returns null if nothing valid
// was found (blank input, garbage input).
function parsearDiasDoMes(texto, ultimoDiaMes) {
  const dias = new Set();
  for (const parteBruta of texto.split(",")) {
    const parte = parteBruta.trim();
    if (parte === "") continue;
    const matchIntervalo = parte.match(/^(\d{1,2})\s*-\s*(\d{1,2})$/);
    if (matchIntervalo) {
      const inicio = parseInt(matchIntervalo[1]);
      const fim = parseInt(matchIntervalo[2]);
      for (let dia = Math.min(inicio, fim); dia <= Math.max(inicio, fim); dia++) {
        if (dia >= 1 && dia <= ultimoDiaMes) dias.add(dia);
      }
      continue;
    }
    const matchDia = parte.match(/^(\d{1,2})$/);
    if (matchDia) {
      const dia = parseInt(matchDia[1]);
      if (dia >= 1 && dia <= ultimoDiaMes) dias.add(dia);
    }
  }
  return dias.size > 0 ? Array.from(dias).sort((a, b) => a - b) : null;
}

// Helper function to render a sorted array of day numbers back into
// "print pages" style text (e.g. [1,2,3,5] -> "1-3,5"), for prefilling
// a prompt that parsearDiasDoMes will read back.
function formatarDiasDoMes(dias) {
  if (dias.length === 0) return "";
  const partes = [];
  let inicio = dias[0];
  let anterior = dias[0];
  for (let i = 1; i <= dias.length; i++) {
    const atual = dias[i];
    if (atual === anterior + 1) {
      anterior = atual;
      continue;
    }
    partes.push(inicio === anterior ? `${inicio}` : `${inicio}-${anterior}`);
    inicio = atual;
    anterior = atual;
  }
  return partes.join(",");
}

// Helper function to calculate weekdays in month
function calcularDiasSegundaASexta(ano, mes) {
  const primeiroDia = new Date(ano, mes - 1, 1);
  const ultimoDia = new Date(ano, mes, 0);
  let contador = 0;

  for (let dia = new Date(primeiroDia); dia <= ultimoDia; dia.setDate(dia.getDate() + 1)) {
    const diaSemana = dia.getDay();
    if (diaSemana >= 1 && diaSemana <= 5) {
      contador++;
    }
  }

  return contador;
}

// Helper function to prompt for a non-negative number, re-asking until valid
function pedirNumero(mensagem, padrao) {
  while (true) {
    const resposta = prompt(mensagem, padrao);
    if (resposta === null) return null;
    const numero = parseFloat(resposta.trim().replace(",", "."));
    if (!isNaN(numero) && numero >= 0) return numero;
    alert("Valor inválido. Informe um número maior ou igual a zero.");
  }
}

// Helper function to format year/month
function formatarMes(anoMes) {
  const ano = anoMes.substring(0, 4);
  const mes = anoMes.substring(4, 6);
  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return `${meses[parseInt(mes) - 1]} de ${ano}`;
}

// Helper function to format decimal hours as hours and minutes
function formatarHorasMinutos(horasDecimais) {
  const totalMinutos = Math.round(horasDecimais * 60);
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;
  return `${horas}h${minutos.toString().padStart(2, '0')}min`;
}

// Execute the main function
secaf();
