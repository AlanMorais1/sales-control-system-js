// Variáveis Globais e LocalStorage
let vendas = JSON.parse(localStorage.getItem('vendasTurismo')) ||[];
let comissoesManuais = JSON.parse(localStorage.getItem('comissoesManuaisTurismo')) || {};

// Carregar ciclo (Padrão 26 a 25 se não existir)
let configCiclo = JSON.parse(localStorage.getItem('configCicloTurismo')) || { abertura: 26, fechamento: 25 };

const nomesMeses =[
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  const dataAtual = new Date();
  document.getElementById('dataVenda').value = dataAtual.toISOString().split('T')[0];
  document.getElementById('anoAtual').innerText = dataAtual.getFullYear();

  // Carregar dados de config de ciclo nos inputs
  document.getElementById('diaAbertura').value = configCiclo.abertura;
  document.getElementById('diaFechamento').value = configCiclo.fechamento;

  // Gerar select de meses
  const selectMes = document.getElementById('filtroMes');
  selectMes.innerHTML = '<option value="todos">Todos os Ciclos</option>';
  nomesMeses.forEach((mes, index) => {
    selectMes.innerHTML += `<option value="${index}">${mes}</option>`;
  });
  
  // Como estamos trabalhando por ciclo, vamos tentar adivinhar o ciclo atual
  const cicloAtual = getCiclo(dataAtual.toISOString().split('T')[0], configCiclo.abertura, configCiclo.fechamento);
  selectMes.value = cicloAtual.mes;

  atualizarTelas();
});

// Lógica de "Mês do Ciclo" - Ex: 26/03 até 25/04 conta como ciclo de ABRIL
function getCiclo(dataVendaString, diaAb, diaFe) {
  const partes = dataVendaString.split('-');
  const ano = parseInt(partes[0]);
  const mes = parseInt(partes[1]) - 1; // 0 a 11
  const dia = parseInt(partes[2]);

  if (diaAb > diaFe) { // Ex: 26 a 25 (virada de mês)
    if (dia >= diaAb) {
      // Já conta pro ciclo do próximo mês
      let mesCiclo = mes + 1;
      let anoCiclo = ano;
      if (mesCiclo > 11) {
        mesCiclo = 0;
        anoCiclo += 1;
      }
      return { mes: mesCiclo, ano: anoCiclo };
    } else {
      // Dia 1 até 25: Pertence ao mês atual do calendário
      return { mes: mes, ano: ano };
    }
  } else {
    // Ex: 1 a 31 (dentro do mesmo mês)
    return { mes: mes, ano: ano };
  }
}

// Salvar Configuração do Ciclo
function salvarConfigCiclo() {
  const ab = parseInt(document.getElementById('diaAbertura').value);
  const fe = parseInt(document.getElementById('diaFechamento').value);
  
  if (ab > 0 && ab <= 31 && fe > 0 && fe <= 31) {
    configCiclo = { abertura: ab, fechamento: fe };
    localStorage.setItem('configCicloTurismo', JSON.stringify(configCiclo));
    alert('Regras de Ciclo atualizadas! O sistema recalculará os painéis agora.');
    atualizarTelas();
  } else {
    alert('Dias inválidos. Escolha de 1 a 31.');
  }
}

// Controle de Abas
function mudarAba(abaDestino) {
  document.getElementById('aba-dashboard').classList.add('hidden');
  document.getElementById('aba-clientes').classList.add('hidden');
  const botoes = document.querySelectorAll('.tab-btn');
  botoes.forEach(btn => btn.classList.remove('active'));

  if (abaDestino === 'dashboard') {
    document.getElementById('aba-dashboard').classList.remove('hidden');
    botoes[0].classList.add('active');
  } else {
    document.getElementById('aba-clientes').classList.remove('hidden');
    botoes[1].classList.add('active');
  }
}

// Cadastrar Venda
document.getElementById('formVenda').addEventListener('submit', function(e) {
  e.preventDefault();

  const idVenda = document.getElementById('idVendaInput').value.trim();
  const cliente = document.getElementById('cliente').value;
  const vendedor = document.getElementById('vendedor').value;
  const tipo = document.getElementById('tipoVenda').value;
  const data = document.getElementById('dataVenda').value;
  const valor = parseFloat(document.getElementById('valor').value);

  if (vendas.some(v => v.id.toLowerCase() === idVenda.toLowerCase())) {
    alert("ERRO: Este ID de Venda / Localizador já está cadastrado!");
    return;
  }

  vendas.push({ id: idVenda, cliente, vendedor, tipo, data, valor });
  localStorage.setItem('vendasTurismo', JSON.stringify(vendas));

  document.getElementById('idVendaInput').value = '';
  document.getElementById('cliente').value = '';
  document.getElementById('valor').value = '';
  
  alert("Venda lançada!");
  atualizarTelas();
});

function excluirVenda(idVenda) {
  if (confirm(`Tem certeza que deseja excluir a venda: ${idVenda}?`)) {
    vendas = vendas.filter(venda => venda.id !== idVenda);
    localStorage.setItem('vendasTurismo', JSON.stringify(vendas));
    atualizarTelas();
  }
}

function formatarMoeda(valor) { return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function formatarDataBR(dataStr) { const [a, m, d] = dataStr.split('-'); return `${d}/${m}/${a}`; }

function atualizarTelas() {
  renderizarDashboard();
  renderizarListaClientes();
}

// ----------------------------------------------------
// LÓGICA PRINCIPAL: CÁLCULOS E DASHBOARD
// ----------------------------------------------------
function renderizarDashboard() {
  const container = document.getElementById('mesesGrid');
  container.innerHTML = '';
  const anoAtual = new Date().getFullYear();

  for (let i = 0; i < 12; i++) {
    // Pegar vendas apenas que pertencem ao CICLO deste mês (i)
    const vendasDoCiclo = vendas.filter(venda => {
      const ciclo = getCiclo(venda.data, configCiclo.abertura, configCiclo.fechamento);
      // Se não houver tipo salvo (legado), considera hospedagem
      if(!venda.tipo) venda.tipo = 'hospedagem';
      return ciclo.mes === i && ciclo.ano === anoAtual;
    });

    const totalHospedagem = vendasDoCiclo.filter(v => v.tipo === 'hospedagem').reduce((acc, v) => acc + v.valor, 0);
    const totalServicos = vendasDoCiclo.filter(v => v.tipo === 'servico').reduce((acc, v) => acc + v.valor, 0);
    const totalGeral = totalHospedagem + totalServicos;
    
    // Regra da variável: Baseia-se no TOTAL GERAL do ciclo
    let taxaHospedagem = 3;
    if (totalGeral > 180000) taxaHospedagem = 5;
    else if (totalGeral > 100000) taxaHospedagem = 4;
    else if (totalGeral > 0) taxaHospedagem = 3;

    // Checa edição manual apenas para hospedagem
    let isManual = comissoesManuais[i] !== undefined;
    let taxaAplicadaHosp = isManual ? comissoesManuais[i] : taxaHospedagem;

    // Cálculo das comissões finais
    const comissaoHospedagem = totalHospedagem * (taxaAplicadaHosp / 100);
    const comissaoServicos = totalServicos * 0.03; // Fixa em 3%
    const totalComissao = comissaoHospedagem + comissaoServicos;

    const mesCard = document.createElement('div');
    mesCard.className = 'mes-card';
    const btnAuto = isManual ? `<button class="btn-auto-mes" onclick="restaurarComissao(${i})">Usar Regra Automática</button>` : '';

    mesCard.innerHTML = `
      <h2>Ciclo de ${nomesMeses[i]}</h2>
      
      <div class="resumo-valores">
        <p><span>🏨 Hospedagem:</span> <span>${formatarMoeda(totalHospedagem)}</span></p>
        <p><span>✈️ Serviços:</span> <span>${formatarMoeda(totalServicos)}</span></p>
        <p class="linha-destaque"><span>Total Vendido:</span> <span>${formatarMoeda(totalGeral)}</span></p>
      </div>
      
      <div class="resumo-valores">
        <p><span>Comissão Hosp. (${taxaAplicadaHosp}%):</span> <span>${formatarMoeda(comissaoHospedagem)}</span></p>
        <p><span>Comissão Serv. (3% fixo):</span> <span>${formatarMoeda(comissaoServicos)}</span></p>
        <p class="linha-destaque comissao-texto"><span>Comissão Total:</span> <span>${formatarMoeda(totalComissao)}</span></p>
      </div>

      <div class="edit-comissao">
        <label>Alterar % Hospedagem:</label>
        <input type="number" step="0.1" id="input-comissao-${i}" value="${taxaAplicadaHosp}">
        <button class="btn-salvar-mes" onclick="salvarComissaoMes(${i})">Salvar</button>
        ${btnAuto}
      </div>
    `;
    container.appendChild(mesCard);
  }
}

function salvarComissaoMes(mesIndex) {
  const novaTaxa = parseFloat(document.getElementById(`input-comissao-${mesIndex}`).value);
  if (novaTaxa >= 0) {
    comissoesManuais[mesIndex] = novaTaxa;
    localStorage.setItem('comissoesManuaisTurismo', JSON.stringify(comissoesManuais));
    atualizarTelas();
  }
}

function restaurarComissao(mesIndex) {
  delete comissoesManuais[mesIndex];
  localStorage.setItem('comissoesManuaisTurismo', JSON.stringify(comissoesManuais));
  atualizarTelas();
}

// ----------------------------------------------------
// ABA DE CLIENTES (Separados pelo Ciclo Contábil)
// ----------------------------------------------------
function renderizarListaClientes() {
  const container = document.getElementById('clientesGrid');
  container.innerHTML = '';
  
  const anoAtual = new Date().getFullYear();
  const filtroMes = document.getElementById('filtroMes').value; 
  let teveAlgumDado = false;

  for (let i = 0; i < 12; i++) {
    if (filtroMes !== 'todos' && i !== parseInt(filtroMes)) continue; 

    const vendasDoCiclo = vendas.filter(venda => {
      const ciclo = getCiclo(venda.data, configCiclo.abertura, configCiclo.fechamento);
      return ciclo.mes === i && ciclo.ano === anoAtual;
    });

    if (vendasDoCiclo.length === 0) continue; 
    teveAlgumDado = true;

    const tabelaMesHTML = document.createElement('div');
    tabelaMesHTML.className = 'tabela-mes';

    let linhas = '';
    vendasDoCiclo.forEach(v => {
      const tipoLabel = v.tipo === 'servico' 
        ? '<span class="badge badge-serv">✈️ Serviço</span>' 
        : '<span class="badge badge-hosp">🏨 Hosped.</span>';

      linhas += `
        <tr>
          <td>${v.id}</td>
          <td><strong>${v.cliente}</strong></td>
          <td>${tipoLabel}</td>
          <td>${v.vendedor}</td>
          <td>${formatarDataBR(v.data)}</td>
          <td>${formatarMoeda(v.valor)}</td>
          <td>
            <button class="btn-excluir" onclick="excluirVenda('${v.id}')">Excluir</button>
          </td>
        </tr>
      `;
    });

    tabelaMesHTML.innerHTML = `
      <h3>Referência: Ciclo de ${nomesMeses[i]}</h3>
      <table>
        <thead>
          <tr>
            <th>Loc / ID</th>
            <th>Cliente</th>
            <th>Tipo</th>
            <th>Vendedor</th>
            <th>Data Real</th>
            <th>Valor</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
    `;
    container.appendChild(tabelaMesHTML);
  }

  if (!teveAlgumDado) {
    if (filtroMes === 'todos') {
      container.innerHTML = '<p class="msg-vazia">Nenhuma venda cadastrada neste ano.</p>';
    } else {
      container.innerHTML = `<p class="msg-vazia">Nenhuma venda contabilizada no ciclo de <strong>${nomesMeses[parseInt(filtroMes)]}</strong>.</p>`;
    }
  }
}