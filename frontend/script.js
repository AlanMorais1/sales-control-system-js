// Variáveis Globais
let vendas = JSON.parse(localStorage.getItem('vendasTurismo')) ||[];
let comissoesManuais = JSON.parse(localStorage.getItem('comissoesManuaisTurismo')) || {};

const nomesMeses =[
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  const dataAtual = new Date();
  
  // Preencher campo de data com a data atual
  document.getElementById('dataVenda').value = dataAtual.toISOString().split('T')[0];
  document.getElementById('anoAtual').innerText = dataAtual.getFullYear();

  // Gerar opções de meses no select da aba de clientes
  const selectMes = document.getElementById('filtroMes');
  selectMes.innerHTML = '<option value="todos">Todos os Meses</option>';
  nomesMeses.forEach((mes, index) => {
    selectMes.innerHTML += `<option value="${index}">${mes}</option>`;
  });
  
  // Define o mês atual como o padrão no select
  selectMes.value = dataAtual.getMonth();

  atualizarTelas();
});

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

// Evento de adicionar nova venda
document.getElementById('formVenda').addEventListener('submit', function(e) {
  e.preventDefault();

  const idVenda = document.getElementById('idVendaInput').value.trim();
  const cliente = document.getElementById('cliente').value;
  const vendedor = document.getElementById('vendedor').value;
  const data = document.getElementById('dataVenda').value;
  const valor = parseFloat(document.getElementById('valor').value);

  // Verifica se o ID já existe
  const idJaExiste = vendas.some(v => v.id.toLowerCase() === idVenda.toLowerCase());
  if (idJaExiste) {
    alert("ERRO: Este ID de Venda / Localizador já está cadastrado!");
    return;
  }

  vendas.push({ id: idVenda, cliente, vendedor, data, valor });
  localStorage.setItem('vendasTurismo', JSON.stringify(vendas));

  // Limpar os campos do formulário após adicionar
  document.getElementById('idVendaInput').value = '';
  document.getElementById('cliente').value = '';
  document.getElementById('valor').value = '';
  
  alert("Venda cadastrada com sucesso!");
  atualizarTelas();
});

// Função para Excluir Venda/Cliente
function excluirVenda(idVenda) {
  if (confirm(`Tem certeza que deseja excluir a venda de ID: ${idVenda}?`)) {
    vendas = vendas.filter(venda => venda.id !== idVenda);
    localStorage.setItem('vendasTurismo', JSON.stringify(vendas));
    atualizarTelas();
  }
}

function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarDataBR(dataString) {
  const [ano, mes, dia] = dataString.split('-');
  return `${dia}/${mes}/${ano}`;
}

// Atualiza ambas as abas simultaneamente
function atualizarTelas() {
  renderizarDashboard();
  renderizarListaClientes();
}

// Renderiza a Aba 1: Dashboard Financeiro
function renderizarDashboard() {
  const container = document.getElementById('mesesGrid');
  container.innerHTML = '';
  const anoAtual = new Date().getFullYear();

  for (let i = 0; i < 12; i++) {
    const vendasDoMes = vendas.filter(venda => {
      const mesVenda = parseInt(venda.data.split('-')[1]) - 1; 
      const anoVenda = parseInt(venda.data.split('-')[0]);
      return mesVenda === i && anoVenda === anoAtual;
    });

    const totalVendido = vendasDoMes.reduce((acc, venda) => acc + venda.valor, 0);
    
    // Lógica Automática de Metas
    let taxaAutomatica = 0;
    if (totalVendido > 181000) taxaAutomatica = 5;
    else if (totalVendido > 101000) taxaAutomatica = 4;
    else if (totalVendido > 0) taxaAutomatica = 3;

    let isManual = comissoesManuais[i] !== undefined;
    let taxaAplicada = isManual ? comissoesManuais[i] : taxaAutomatica;
    let totalComissao = totalVendido * (taxaAplicada / 100);

    const mesCard = document.createElement('div');
    mesCard.className = 'mes-card';

    const btnAutomatico = isManual 
      ? `<button class="btn-auto-mes" onclick="restaurarComissaoAutomatica(${i})">Usar Automático</button>` : '';

    mesCard.innerHTML = `
      <h2>${nomesMeses[i]}</h2>
      <div class="resumo-valores">
        <p><span>Total Vendido:</span> <span>${formatarMoeda(totalVendido)}</span></p>
        <p class="comissao-texto"><span>Comissão (${taxaAplicada}%):</span> <span>${formatarMoeda(totalComissao)}</span></p>
      </div>
      <div class="edit-comissao">
        <label>Mudar %:</label>
        <input type="number" step="0.1" id="input-comissao-${i}" value="${taxaAplicada}">
        <button class="btn-salvar-mes" onclick="salvarComissaoMes(${i})">Salvar</button>
        ${btnAutomatico}
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

function restaurarComissaoAutomatica(mesIndex) {
  delete comissoesManuais[mesIndex];
  localStorage.setItem('comissoesManuaisTurismo', JSON.stringify(comissoesManuais));
  atualizarTelas();
}

// Renderiza a Aba 2: Lista de Clientes filtrada pelo seletor
function renderizarListaClientes() {
  const container = document.getElementById('clientesGrid');
  container.innerHTML = '';
  
  const anoAtual = new Date().getFullYear();
  const filtroMes = document.getElementById('filtroMes').value; // Retorna 'todos' ou numero do mes '0', '1'...
  
  let teveAlgumDado = false;

  for (let i = 0; i < 12; i++) {
    // Se não for 'todos' e o índice do loop não for o mês selecionado, pula pro próximo loop
    if (filtroMes !== 'todos' && i !== parseInt(filtroMes)) {
      continue; 
    }

    const vendasDoMes = vendas.filter(venda => {
      const mesVenda = parseInt(venda.data.split('-')[1]) - 1; 
      const anoVenda = parseInt(venda.data.split('-')[0]);
      return mesVenda === i && anoVenda === anoAtual;
    });

    if (vendasDoMes.length === 0) continue; // Pula meses vazios na visualização

    teveAlgumDado = true;

    const tabelaMesHTML = document.createElement('div');
    tabelaMesHTML.className = 'tabela-mes';

    let linhas = '';
    vendasDoMes.forEach(venda => {
      linhas += `
        <tr>
          <td>${venda.id}</td>
          <td><strong>${venda.cliente}</strong></td>
          <td>${venda.vendedor}</td>
          <td>${formatarDataBR(venda.data)}</td>
          <td>${formatarMoeda(venda.valor)}</td>
          <td>
            <button class="btn-excluir" onclick="excluirVenda('${venda.id}')">Excluir</button>
          </td>
        </tr>
      `;
    });

    tabelaMesHTML.innerHTML = `
      <h3>Mês: ${nomesMeses[i]}</h3>
      <table>
        <thead>
          <tr>
            <th>ID da Venda</th>
            <th>Cliente</th>
            <th>Vendedor</th>
            <th>Data</th>
            <th>Valor</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${linhas}
        </tbody>
      </table>
    `;

    container.appendChild(tabelaMesHTML);
  }

  // Exibe mensagem caso a busca não tenha resultados
  if (!teveAlgumDado) {
    if (filtroMes === 'todos') {
      container.innerHTML = '<p class="msg-vazia">Nenhum cliente cadastrado neste ano ainda.</p>';
    } else {
      const nomeMesSelecionado = nomesMeses[parseInt(filtroMes)];
      container.innerHTML = `<p class="msg-vazia">Nenhum cliente cadastrado no mês de <strong>${nomeMesSelecionado}</strong>.</p>`;
    }
  }
}