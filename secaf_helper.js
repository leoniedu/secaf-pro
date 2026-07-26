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
  const siape = partes[1];
  const ano = parseInt(anoMes.substring(0, 4));
  const mes = parseInt(anoMes.substring(4, 6));
  const diasSegundaASexta = calcularDiasSegundaASexta(ano, mes);

  // Get work days
  const elementoDiasUteis = document.querySelector("#SideNav > div:nth-child(1) > info-mes > div.mx-3.pb-3.work-days > span.work-days__number");
  if (!elementoDiasUteis) {
    alert("Não foi possível encontrar a informação de dias úteis.");
    return;
  }
  const diasUteis = parseInt(elementoDiasUteis.textContent.trim());

  // Get required hours
  const horasPresencial = pedirNumero("Número de horas presenciais obrigatórias por mês:", "64");
  if (horasPresencial === null) return;

  // Get vacation days
  const diasFerias = pedirNumero("Número de dias de férias no mês:", "0");
  if (diasFerias === null) return;

  // Calculate holidays
  let feriadosEFacultativos = diasSegundaASexta - diasUteis;
  const usarFeriadosCalculados = confirm(
    `Foram detectados ${feriadosEFacultativos} dias de feriados/pontos facultativos.\nDeseja usar este valor calculado automaticamente?\nClique em OK para usar o valor calculado ou em Cancelar para informar manualmente.`
  );

  if (!usarFeriadosCalculados) {
    const feriadosManual = pedirNumero("Número de feriados e pontos facultativos no mês:", feriadosEFacultativos.toString());
    if (feriadosManual === null) return;
    feriadosEFacultativos = feriadosManual;
  }

  // Ask how many holidays fell inside the vacation period to avoid double deduction
  let feriadosNasFerias = 0;
  if (diasFerias > 0 && feriadosEFacultativos > 0) {
    feriadosNasFerias = pedirNumero("Quantos feriados/pontos facultativos caíram dentro das férias?", "0");
    if (feriadosNasFerias === null) return;
  }
  const feriadosForaFerias = feriadosEFacultativos - feriadosNasFerias;

  // Calculate required hours
  const ultimoDiaMes = new Date(ano, mes, 0).getDate();
  const horasDevidasMes0 = horasPresencial * (1 - diasFerias / ultimoDiaMes) - feriadosForaFerias * 8;
  const horasDevidasMes = Math.max(horasDevidasMes0, 0);

  // Get worked hours from table
  const tabelaApuracao = document.querySelector("body > app-root > main-page > div > main > painel-apuracao > tabela-apuracao");
  let horasTrabalhadasMes = 0;

  if (tabelaApuracao) {
    console.log("Tabela de apuração encontrada usando o seletor específico");
    const linhas = tabelaApuracao.querySelectorAll("tr");
    console.log(`Encontradas ${linhas.length} linhas na tabela`);

    // Find the row matching the current date, wherever it is in the table
    const dataAtual = new Date();
    const diaAtual = String(dataAtual.getDate()).padStart(2, '0');
    const mesAtual = dataAtual.getMonth() + 1;
    const mesesAbrev = {
      1: "JAN", 2: "FEV", 3: "MAR", 4: "ABR", 5: "MAI", 6: "JUN",
      7: "JUL", 8: "AGO", 9: "SET", 10: "OUT", 11: "NOV", 12: "DEZ"
    };
    const regexHoje = new RegExp(`${diaAtual}${mesesAbrev[mesAtual]}`, 'i');

    let linhaHoje = null;
    for (const linha of linhas) {
      const celulaData = linha.querySelector("th");
      if (celulaData && regexHoje.test(celulaData.textContent.trim())) {
        linhaHoje = linha;
        break;
      }
    }

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
  } else {
    alert("Não foi possível encontrar a tabela de apuração de horas.");
    return;
  }

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

  let remainingWorkdays = 0;
  for (let dayOfMonth = primeiroDiaRestante; dayOfMonth <= ultimoDiaMes; dayOfMonth++) {
    const dateObject = new Date(ano, mes - 1, dayOfMonth);
    if (dateObject.getDay() !== 0 && dateObject.getDay() !== 6) { // Skip weekends
      remainingWorkdays++;
    }
  }

  const saldoHorasDia = saldoHoras > 0 && remainingWorkdays > 0 ? saldoHoras / remainingWorkdays : 0;

  // Create results HTML
  const htmlResultado = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ccc; border-radius: 5px; background-color: #f9f9f9;">
    <h2 style="color: #333; text-align: center;">Cálculo de Horas Presenciais SECAF</h2>
    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
      <tr style="background-color: #f2f2f2;">
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">SIAPE</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${siape}</td>
      </tr>
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
        <td style="padding: 8px; border: 1px solid #ddd;">${feriadosEFacultativos}${feriadosNasFerias > 0 ? ` (${feriadosNasFerias} durante as férias)` : ''}</td>
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
      *Dias úteis restantes não consideram feriados ou pontos facultativos<br>
      Cálculo baseado nas regras do PGD 2.0 do IBGE.<br>
      Desenvolvido pelo pacote ibgeba_utils - Chrome Extension
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
