const API_URL = 'http://localhost:3000';

let vendas = [];
let comissoesManuais = JSON.parse(localStorage.getItem('comissoesManuaisTurismo')) || {};
let configCiclo = JSON.parse(localStorage.getItem('configCicloTurismo')) || { abertura: 26, fechamento: 25 };
let configComissao = JSON.parse(localStorage.getItem('configComissaoTurismo')) || {
  taxaServico: 3,
  taxaBase: 3,
  taxaIntermediaria: 4,
  taxaAlta: 5,
  limiteBase: 100000,
  limiteAlta: 180000,
};
let configAgencia = JSON.parse(localStorage.getItem('configAgenciaTurismo')) || {
  nome: 'Agência de Turismo',
  logo: ''
};
let vendedores = JSON.parse(localStorage.getItem('vendedoresTurismo')) || [];
let leadsPorMes = JSON.parse(localStorage.getItem('leadsPorMesTurismo')) || {};
let metasPorMes = JSON.parse(localStorage.getItem('metasPorMesTurismo')) || {};
let metasPainelVisivel = false;
let leadsPainelVisivel = false;
let temaAtual = localStorage.getItem('temaTurismo') || 'light';

const nomesMeses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function salvarLocalFallback() {
  localStorage.setItem('vendasTurismo', JSON.stringify(vendas));
}

async function carregarVendas() {
  try {
    const response = await fetch(`${API_URL}/vendas`);
    if (!response.ok) throw new Error('Não foi possível carregar vendas.');
    vendas = await response.json();
    salvarLocalFallback();
  } catch (error) {
    const fallback = JSON.parse(localStorage.getItem('vendasTurismo') || '[]');
    vendas = fallback;
  }
  atualizarTelas();
}

async function carregarResumo() {
  try {
    const response = await fetch(`${API_URL}/vendas/resumo`);
    if (!response.ok) throw new Error('Erro ao carregar resumo.');
    const resumo = await response.json();

    document.getElementById('totalVendasResumo').textContent = formatarMoeda(resumo.totalVendas || 0);
    document.getElementById('qtdVendasResumo').textContent = resumo.qtdVendas || 0;
    document.getElementById('ticketMedioResumo').textContent = formatarMoeda(resumo.ticketMedio || 0);
    document.getElementById('comissaoResumo').textContent = formatarMoeda(resumo.totalComissoes || 0);
  } catch (error) {
    const total = vendas.reduce((acc, venda) => acc + Number(venda.valor || 0), 0);
    const comissao = vendas.reduce((acc, venda) => acc + Number(venda.comissao || 0), 0);
    document.getElementById('totalVendasResumo').textContent = formatarMoeda(total);
    document.getElementById('qtdVendasResumo').textContent = vendas.length;
    document.getElementById('ticketMedioResumo').textContent = formatarMoeda(vendas.length ? total / vendas.length : 0);
    document.getElementById('comissaoResumo').textContent = formatarMoeda(comissao);
  }
}

function getCiclo(dataVendaString, diaAb, diaFe) {
  const partes = dataVendaString.split('-');
  const ano = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10) - 1;
  const dia = parseInt(partes[2], 10);

  if (diaAb > diaFe) {
    if (dia >= diaAb) {
      let mesCiclo = mes + 1;
      let anoCiclo = ano;
      if (mesCiclo > 11) {
        mesCiclo = 0;
        anoCiclo += 1;
      }
      return { mes: mesCiclo, ano: anoCiclo };
    }
    return { mes, ano };
  }

  return { mes, ano };
}

function calcularTaxaHospedagem(valor) {
  if (valor > configComissao.limiteAlta) return configComissao.taxaAlta;
  if (valor > configComissao.limiteBase) return configComissao.taxaIntermediaria;
  return configComissao.taxaBase;
}

function calcularComissaoVenda(venda) {
  if (venda.tipo === 'servico') {
    return Number(venda.valor || 0) * (configComissao.taxaServico / 100);
  }

  const taxa = calcularTaxaHospedagem(Number(venda.valor || 0));
  return Number(venda.valor || 0) * (taxa / 100);
}

function salvarConfigCiclo() {
  const ab = parseInt(document.getElementById('diaAbertura').value, 10);
  const fe = parseInt(document.getElementById('diaFechamento').value, 10);

  if (ab > 0 && ab <= 31 && fe > 0 && fe <= 31) {
    configCiclo = { abertura: ab, fechamento: fe };
    localStorage.setItem('configCicloTurismo', JSON.stringify(configCiclo));
    alert('Regras de ciclo atualizadas com sucesso.');
    atualizarTelas();
  } else {
    alert('Dias inválidos. Escolha valores entre 1 e 31.');
  }
}

function salvarConfigComissao() {
  configComissao = {
    taxaServico: Number(document.getElementById('taxaServico').value || 0),
    taxaBase: Number(document.getElementById('taxaBase').value || 0),
    taxaIntermediaria: Number(document.getElementById('taxaIntermediaria').value || 0),
    taxaAlta: Number(document.getElementById('taxaAlta').value || 0),
    limiteBase: Number(configComissao.limiteBase || 100000),
    limiteAlta: Number(configComissao.limiteAlta || 180000),
  };
  localStorage.setItem('configComissaoTurismo', JSON.stringify(configComissao));
  alert('Regras de comissão atualizadas com sucesso.');
  atualizarTelas();
}

function salvarConfigAgencia() {
  const nome = document.getElementById('nomeAgenciaInput').value.trim();
  const logo = document.getElementById('fotoAgenciaInput').value.trim();

  configAgencia = {
    nome: nome || 'Agência de Turismo',
    logo: logo || configAgencia.logo || ''
  };

  localStorage.setItem('configAgenciaTurismo', JSON.stringify(configAgencia));
  atualizarBranding();
  alert('Identidade da agência atualizada com sucesso.');
}

function adicionarVendedor() {
  const input = document.getElementById('novoVendedor');
  const nome = input.value.trim();

  if (!nome) {
    alert('Digite o nome do vendedor antes de adicionar.');
    return;
  }

  const jaExiste = vendedores.some((v) => v.toLowerCase() === nome.toLowerCase());
  if (jaExiste) {
    alert('Esse vendedor já está cadastrado.');
    return;
  }

  vendedores = [...vendedores, nome];
  localStorage.setItem('vendedoresTurismo', JSON.stringify(vendedores));
  input.value = '';
  renderizarListaVendedores();
  popularSelectVendedores();
  alert('Vendedor cadastrado com sucesso.');
}

function removerVendedor(nome) {
  if (!confirm(`Deseja excluir o vendedor "${nome}"?`)) {
    return;
  }

  vendedores = vendedores.filter((v) => v !== nome);
  localStorage.setItem('vendedoresTurismo', JSON.stringify(vendedores));
  renderizarListaVendedores();
  popularSelectVendedores();
}

function renderizarListaVendedores() {
  const container = document.getElementById('listaVendedores');
  if (!container) return;

  container.innerHTML = '';

  if (vendedores.length === 0) {
    container.innerHTML = '<p class="msg-vazia">Nenhum vendedor cadastrado.</p>';
    return;
  }

  vendedores.forEach((nome) => {
    const item = document.createElement('div');
    item.className = 'vendedor-chip';

    const nomeSpan = document.createElement('span');
    nomeSpan.textContent = nome;

    const btnExcluir = document.createElement('button');
    btnExcluir.type = 'button';
    btnExcluir.className = 'btn-remove-vendedor';
    btnExcluir.textContent = '✕';
    btnExcluir.title = `Excluir ${nome}`;
    btnExcluir.addEventListener('click', () => removerVendedor(nome));

    item.appendChild(nomeSpan);
    item.appendChild(btnExcluir);
    container.appendChild(item);
  });
}

function popularSelectVendedores() {
  const select = document.getElementById('vendedor');
  if (!select) return;

  const valorAtual = select.value;
  select.innerHTML = '<option value="">Selecione um vendedor</option>';

  vendedores.forEach((nome) => {
    const option = document.createElement('option');
    option.value = nome;
    option.textContent = nome;
    select.appendChild(option);
  });

  if (vendedores.includes(valorAtual)) {
    select.value = valorAtual;
  }
}

function atualizarBranding() {
  const logoEl = document.getElementById('logoAgencia');
  const nomeEl = document.getElementById('nomeAgencia');
  if (logoEl) {
    if (configAgencia.logo) {
      logoEl.src = configAgencia.logo;
      logoEl.classList.remove('hidden');
    } else {
      logoEl.removeAttribute('src');
      logoEl.classList.add('hidden');
    }
  }
  if (nomeEl) {
    nomeEl.textContent = configAgencia.nome || 'Agência de Turismo';
  }
}

function aplicarTema() {
  document.body.dataset.theme = temaAtual;
  const btnTema = document.getElementById('btnTema');
  if (btnTema) {
    btnTema.textContent = temaAtual === 'dark' ? '☀️' : '🌙';
    btnTema.title = temaAtual === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro';
  }
}

function alternarTema() {
  temaAtual = temaAtual === 'dark' ? 'light' : 'dark';
  localStorage.setItem('temaTurismo', temaAtual);
  aplicarTema();
}

function mudarAba(abaDestino) {
  document.getElementById('aba-dashboard').classList.add('hidden');
  document.getElementById('aba-clientes').classList.add('hidden');
  const botoes = document.querySelectorAll('.tab-btn');
  botoes.forEach((btn) => btn.classList.remove('active'));

  if (abaDestino === 'dashboard') {
    document.getElementById('aba-dashboard').classList.remove('hidden');
    botoes[0].classList.add('active');
  } else {
    document.getElementById('aba-clientes').classList.remove('hidden');
    botoes[1].classList.add('active');
  }
}

async function adicionarVenda(venda) {
  try {
    const response = await fetch(`${API_URL}/vendas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(venda),
    });

    if (!response.ok) {
      const erro = await response.json();
      throw new Error(erro.erro || 'Erro ao cadastrar venda.');
    }

    return await response.json();
  } catch (error) {
    alert(error.message);
    return null;
  }
}

async function excluirVenda(idVenda) {
  if (!confirm(`Tem certeza que deseja excluir a venda ${idVenda}?`)) return;

  try {
    const response = await fetch(`${API_URL}/vendas/${encodeURIComponent(idVenda)}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Erro ao excluir venda.');
    await carregarVendas();
  } catch (error) {
    alert(error.message);
  }
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatarDataBR(dataStr) {
  const [ano, mes, dia] = dataStr.split('-');
  return `${dia}/${mes}/${ano}`;
}

function getCorTermometro(percentual) {
  if (percentual < 50) return '#e74c3c';
  if (percentual < 85) return '#f2c94c';
  return '#2dbf8d';
}

function atualizarTelas() {
  renderizarDashboard();
  renderizarListaClientes();
  carregarResumo();
}

function getVendasDoMes(ano, mesIndex) {
  return vendas.filter((venda) => {
    const ciclo = getCiclo(venda.data, configCiclo.abertura, configCiclo.fechamento);
    return ciclo.ano === ano && ciclo.mes === mesIndex;
  });
}

function calcularResumoMes(vendasDoMes) {
  const totalHospedagem = vendasDoMes
    .filter((v) => v.tipo === 'hospedagem')
    .reduce((acc, v) => acc + Number(v.valor || 0), 0);
  const totalServicos = vendasDoMes
    .filter((v) => v.tipo === 'servico')
    .reduce((acc, v) => acc + Number(v.valor || 0), 0);

  const totalGeral = totalHospedagem + totalServicos;
  const qtdVendas = vendasDoMes.length;
  const ticketMedio = qtdVendas > 0 ? totalGeral / qtdVendas : 0;
  const comissaoHospedagem = vendasDoMes
    .filter((v) => v.tipo === 'hospedagem')
    .reduce((acc, v) => acc + calcularComissaoVenda(v), 0);
  const comissaoServicos = vendasDoMes
    .filter((v) => v.tipo === 'servico')
    .reduce((acc, v) => acc + calcularComissaoVenda(v), 0);
  const totalComissao = comissaoHospedagem + comissaoServicos;

  return {
    totalGeral,
    totalHospedagem,
    totalServicos,
    qtdVendas,
    ticketMedio,
    totalComissao,
  };
}

function renderizarDashboard() {
  const selectAno = document.getElementById('selectAno');
  const selectMes = document.getElementById('selectMes');
  const resumoAnual = document.getElementById('resumoAnual');
  const detalheMes = document.getElementById('detalheMes');
  const anoAtual = new Date().getFullYear();

  const anoSelecionadoAnterior = Number(selectAno.value || anoAtual);
  const mesSelecionadoAnterior = selectMes.value || '';

  selectAno.innerHTML = '';
  for (let i = anoAtual - 5; i <= anoAtual + 5; i += 1) {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = String(i);
    selectAno.appendChild(option);
  }

  selectMes.innerHTML = '<option value="">Resumo anual</option>';
  nomesMeses.forEach((mes, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = mes;
    selectMes.appendChild(option);
  });

  selectAno.value = String(anoSelecionadoAnterior);
  if (mesSelecionadoAnterior !== '') {
    selectMes.value = mesSelecionadoAnterior;
  }

  const anoSelecionado = Number(selectAno.value || anoAtual);
  const mesSelecionado = selectMes.value === '' ? '' : Number(selectMes.value);

  resumoAnual.innerHTML = '';
  for (let i = 0; i < 12; i += 1) {
    const vendasDoMes = getVendasDoMes(anoSelecionado, i);
    const resumo = calcularResumoMes(vendasDoMes);
    const card = document.createElement('button');
    card.className = 'resumo-anual-card';
    card.type = 'button';
    card.innerHTML = `
      <h3>${nomesMeses[i]}</h3>
      <p><strong>${formatarMoeda(resumo.totalGeral)}</strong></p>
      <p>${resumo.qtdVendas} vendas</p>
      <p>${formatarMoeda(resumo.totalComissao)} comissão</p>
    `;
    card.addEventListener('click', () => {
      selectMes.value = String(i);
      const mesAtual = Number(selectMes.value);
      const anoAtualSelecionado = Number(selectAno.value || anoAtual);
      resumoAnual.classList.add('hidden');
      detalheMes.classList.remove('hidden');
      renderizarDetalheMes(anoAtualSelecionado, mesAtual);
    });
    resumoAnual.appendChild(card);
  }

  if (mesSelecionado === '') {
    detalheMes.classList.add('hidden');
    resumoAnual.classList.remove('hidden');
  } else {
    detalheMes.classList.remove('hidden');
    resumoAnual.classList.add('hidden');
    renderizarDetalheMes(anoSelecionado, mesSelecionado);
  }
}

function renderizarDetalheMes(ano, mesIndex) {
  const detalheMes = document.getElementById('detalheMes');
  const vendasDoMes = getVendasDoMes(ano, mesIndex);
  const resumo = calcularResumoMes(vendasDoMes);
  const leadsKey = `${ano}-${mesIndex}`;
  const leadsAtual = leadsPorMes[leadsKey] || '';
  const metaKey = `${ano}-${mesIndex}`;
  const metas = metasPorMes[metaKey] || { faturamento: 180000, salario: 5000 };
  const metaFaturamento = Number(metas.faturamento || 180000);
  const metaSalario = Number(metas.salario || 5000);
  const metasVisiveis = metasPainelVisivel;
  const leadsVisiveis = leadsPainelVisivel;

  const eficiencia = leadsAtual && Number(leadsAtual) > 0
    ? Math.min(100, (resumo.qtdVendas / Number(leadsAtual)) * 100)
    : 0;

  const salario = resumo.totalComissao;
  const faturamento = resumo.totalGeral;
  const percFaturamento = Math.min(100, (faturamento / metaFaturamento) * 100 || 0);
  const percSalario = Math.min(100, (salario / metaSalario) * 100 || 0);
  const corFaturamento = getCorTermometro(percFaturamento);
  const corSalario = getCorTermometro(percSalario);

  detalheMes.innerHTML = `
    <div class="detalhe-header">
      <div>
        <p class="eyebrow">Mês selecionado</p>
        <h2>${nomesMeses[mesIndex]} de ${ano}</h2>
      </div>
      <div class="detalhe-header-actions">
        <button class="btn-toggle" id="btnToggleLeads" onclick="toggleLeadsPanel()" type="button" aria-expanded="${leadsVisiveis}">${leadsVisiveis ? 'Ocultar leads' : 'Mostrar leads'}</button>
        <button class="btn-toggle" id="btnToggleMetas" onclick="toggleMetasPanel()" type="button" aria-expanded="${metasVisiveis}">${metasVisiveis ? 'Ocultar metas' : 'Mostrar metas'}</button>
        <button class="btn-refresh" onclick="document.getElementById('selectMes').value=''; renderizarDashboard();">Voltar para anual</button>
      </div>
    </div>
    <div class="detalhe-metrics">
      <div class="metric-box">
        <span>Total de vendas</span>
        <strong>${formatarMoeda(resumo.totalGeral)}</strong>
      </div>
      <div class="metric-box">
        <span>Ticket médio</span>
        <strong>${formatarMoeda(resumo.ticketMedio)}</strong>
      </div>
      <div class="metric-box">
        <span>Qtd. vendas</span>
        <strong>${resumo.qtdVendas}</strong>
      </div>
      <div class="metric-box">
        <span>Comissão</span>
        <strong>${formatarMoeda(resumo.totalComissao)}</strong>
      </div>
    </div>
    <div class="panel-grid">
      <div class="control-panel">
        <div id="leadsPanel" class="leads-panel${leadsVisiveis ? '' : ' hidden'}">
          <label for="inputLeads">Leads</label>
          <input id="inputLeads" type="number" min="0" value="${leadsAtual}">
          <button class="btn-salvar" onclick="salvarLeads('${leadsKey}')">Salvar leads</button>
        </div>
        <div id="metaConfigPanel" class="meta-panel${metasVisiveis ? '' : ' hidden'}">
          <div class="currency-field">
            <label for="inputMetaFaturamento">Meta de faturamento</label>
            <div class="currency-input-wrap">
              <span>R$</span>
              <input id="inputMetaFaturamento" class="currency-input" type="number" min="0" step="0.01" value="${metaFaturamento.toFixed(2)}">
            </div>
          </div>
          <div class="currency-field">
            <label for="inputMetaSalario">Meta de salário</label>
            <div class="currency-input-wrap">
              <span>R$</span>
              <input id="inputMetaSalario" class="currency-input" type="number" min="0" step="0.01" value="${metaSalario.toFixed(2)}">
            </div>
          </div>
          <button class="btn-salvar" onclick="salvarMetas('${metaKey}')">Salvar metas</button>
        </div>
      </div>
      <div class="efficiency-box">
        <span>Eficiência</span>
        <strong>${eficiencia.toFixed(1)}%</strong>
      </div>
    </div>
    <div class="charts-grid">
      <div>
        <div class="termo-card">
          <h4>Meta de faturamento</h4>
          <div class="termo-track"><div class="termo-fill" style="width:${percFaturamento}%; background:${corFaturamento};"></div></div>
          <div class="termo-label"><span>${formatarMoeda(Math.min(faturamento, metaFaturamento))}</span><span>${formatarMoeda(metaFaturamento)}</span></div>
        </div>
        <div class="termo-card">
          <h4>Meta de salário</h4>
          <div class="termo-track"><div class="termo-fill" style="width:${percSalario}%; background:${corSalario};"></div></div>
          <div class="termo-label"><span>${formatarMoeda(Math.min(salario, metaSalario))}</span><span>${formatarMoeda(metaSalario)}</span></div>
        </div>
      </div>
    </div>
  `;
}

function toggleMetasPanel() {
  const panel = document.getElementById('metaConfigPanel');
  const btn = document.getElementById('btnToggleMetas');
  if (!panel || !btn) return;

  const hidden = panel.classList.toggle('hidden');
  metasPainelVisivel = !hidden;
  btn.textContent = hidden ? 'Mostrar metas' : 'Ocultar metas';
  btn.setAttribute('aria-expanded', String(!hidden));
}

function toggleLeadsPanel() {
  const panel = document.getElementById('leadsPanel');
  const btn = document.getElementById('btnToggleLeads');
  if (!panel || !btn) return;

  const hidden = panel.classList.toggle('hidden');
  leadsPainelVisivel = !hidden;
  btn.textContent = hidden ? 'Mostrar leads' : 'Ocultar leads';
  btn.setAttribute('aria-expanded', String(!hidden));
}

function toggleNovaVendaPanel() {
  const container = document.getElementById('formVendaContainer');
  const btn = document.getElementById('btnToggleNovaVenda');
  if (!container || !btn) return;

  const hidden = container.classList.toggle('hidden');
  btn.textContent = hidden ? 'Mostrar' : 'Ocultar';
  btn.setAttribute('aria-expanded', String(!hidden));
}

function salvarLeads(chave) {
  const value = Number(document.getElementById('inputLeads').value || 0);
  leadsPorMes[chave] = value;
  localStorage.setItem('leadsPorMesTurismo', JSON.stringify(leadsPorMes));
  const selectAno = document.getElementById('selectAno');
  const selectMes = document.getElementById('selectMes');
  const ano = Number(selectAno.value || new Date().getFullYear());
  const mes = Number(selectMes.value);
  renderizarDetalheMes(ano, mes);
}

function salvarMetas(chave) {
  const metaFaturamento = Number(document.getElementById('inputMetaFaturamento').value || 0);
  const metaSalario = Number(document.getElementById('inputMetaSalario').value || 0);

  metasPorMes[chave] = {
    faturamento: metaFaturamento,
    salario: metaSalario,
  };

  localStorage.setItem('metasPorMesTurismo', JSON.stringify(metasPorMes));
  const selectAno = document.getElementById('selectAno');
  const selectMes = document.getElementById('selectMes');
  const ano = Number(selectAno.value || new Date().getFullYear());
  const mes = Number(selectMes.value);
  renderizarDetalheMes(ano, mes);
}

function renderizarListaClientes() {
  const container = document.getElementById('clientesGrid');
  container.innerHTML = '';

  const anoAtual = new Date().getFullYear();
  const filtroMes = document.getElementById('filtroMes').value;
  const filtroTipo = document.getElementById('filtroTipo').value;
  const busca = (document.getElementById('buscaVenda').value || '').toLowerCase();
  let teveAlgumDado = false;

  for (let i = 0; i < 12; i++) {
    if (filtroMes !== 'todos' && i !== parseInt(filtroMes, 10)) continue;

    const vendasDoCiclo = vendas.filter((venda) => {
      const ciclo = getCiclo(venda.data, configCiclo.abertura, configCiclo.fechamento);
      if (!venda.tipo) venda.tipo = 'hospedagem';
      return ciclo.mes === i && ciclo.ano === anoAtual;
    });

    const vendasFiltradas = vendasDoCiclo.filter((venda) => {
      const atendeTipo = filtroTipo === 'todos' || venda.tipo === filtroTipo;
      const buscaTexto = `${venda.id} ${venda.cliente} ${venda.vendedor}`.toLowerCase();
      const atendeBusca = buscaTexto.includes(busca);
      return atendeTipo && atendeBusca;
    });

    if (vendasFiltradas.length === 0) continue;
    teveAlgumDado = true;

    const tabelaMesHTML = document.createElement('div');
    tabelaMesHTML.className = 'tabela-mes';

    let linhas = '';
    vendasFiltradas.forEach((v) => {
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
    container.innerHTML = '<p class="msg-vazia">Nenhuma venda encontrada com os filtros atuais.</p>';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const dataAtual = new Date();
  const dataHoje = dataAtual.toISOString().split('T')[0];
  document.getElementById('dataVenda').value = dataHoje;
  document.getElementById('anoAtual').textContent = dataAtual.getFullYear();

  aplicarTema();

  document.getElementById('diaAbertura').value = configCiclo.abertura;
  document.getElementById('diaFechamento').value = configCiclo.fechamento;

  document.getElementById('taxaServico').value = configComissao.taxaServico;
  document.getElementById('taxaBase').value = configComissao.taxaBase;
  document.getElementById('taxaIntermediaria').value = configComissao.taxaIntermediaria;
  document.getElementById('taxaAlta').value = configComissao.taxaAlta;
  document.getElementById('limiar1Label').textContent = `${Math.round(configComissao.limiteBase / 1000)} mil`;
  document.getElementById('limiar2Label').textContent = `${Math.round(configComissao.limiteAlta / 1000)} mil`;
  document.getElementById('limiar3Label').textContent = `${Math.round(configComissao.limiteAlta / 1000)} mil`;
  document.getElementById('nomeAgenciaInput').value = configAgencia.nome || '';
  document.getElementById('fotoAgenciaInput').value = configAgencia.logo || '';
  atualizarBranding();
  renderizarListaVendedores();
  popularSelectVendedores();

  document.querySelectorAll('.config-tab').forEach((button) => {
    button.addEventListener('click', () => {
      const tab = button.dataset.tab;
      document.querySelectorAll('.config-tab').forEach((btn) => btn.classList.remove('active'));
      document.querySelectorAll('.config-section').forEach((section) => section.classList.remove('active'));
      button.classList.add('active');
      document.querySelector(`.config-section[data-section="${tab}"]`)?.classList.add('active');
    });
  });

  const selectMes = document.getElementById('filtroMes');
  selectMes.innerHTML = '<option value="todos">Todos os Ciclos</option>';
  nomesMeses.forEach((mes, index) => {
    selectMes.innerHTML += `<option value="${index}">${mes}</option>`;
  });

  const cicloAtual = getCiclo(dataHoje, configCiclo.abertura, configCiclo.fechamento);
  const selectAno = document.getElementById('selectAno');
  const selectDashboardMes = document.getElementById('selectMes');
  selectAno.value = String(dataAtual.getFullYear());
  selectDashboardMes.value = '';
  selectMes.value = String(cicloAtual.mes);

  document.getElementById('formVenda').addEventListener('submit', async (e) => {
    e.preventDefault();

    const idVenda = document.getElementById('idVendaInput').value.trim();
    const cliente = document.getElementById('cliente').value.trim();
    const vendedor = document.getElementById('vendedor').value;
    const tipo = document.getElementById('tipoVenda').value;
    const data = document.getElementById('dataVenda').value;
    const valor = Number(document.getElementById('valor').value);

    if (!idVenda || !cliente || !vendedor || !data || Number.isNaN(valor) || valor <= 0) {
      alert('Preencha os campos obrigatórios corretamente.');
      return;
    }

    const vendaCriada = await adicionarVenda({ id: idVenda, cliente, vendedor, tipo, data, valor });
    if (!vendaCriada) return;

    document.getElementById('formVenda').reset();
    document.getElementById('dataVenda').value = dataHoje;
    document.getElementById('tipoVenda').value = 'hospedagem';
    popularSelectVendedores();
    alert('Venda lançada com sucesso!');
    await carregarVendas();
  });

  document.getElementById('fotoAgenciaFile').addEventListener('change', (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      document.getElementById('fotoAgenciaInput').value = reader.result;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('btnTema').addEventListener('click', alternarTema);

  document.getElementById('btnAtualizar').addEventListener('click', async () => {
    await carregarVendas();
  });

  document.getElementById('btnConfig').addEventListener('click', () => {
    document.getElementById('configModal').classList.remove('hidden');
  });

  document.getElementById('btnCloseConfig').addEventListener('click', () => {
    document.getElementById('configModal').classList.add('hidden');
  });

  document.getElementById('btnLimparMes').addEventListener('click', () => {
    document.getElementById('selectMes').value = '';
    renderizarDashboard();
  });

  document.getElementById('selectAno').addEventListener('change', renderizarDashboard);
  document.getElementById('selectMes').addEventListener('change', renderizarDashboard);
  document.getElementById('buscaVenda').addEventListener('input', renderizarListaClientes);
  document.getElementById('filtroTipo').addEventListener('change', renderizarListaClientes);

  await carregarVendas();
});