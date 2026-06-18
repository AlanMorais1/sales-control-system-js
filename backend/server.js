const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

let vendas = [];

function calcularComissao(tipo, valor) {
  if (tipo === 'servico') return valor * 0.03;

  if (valor > 180000) return valor * 0.05;
  if (valor > 100000) return valor * 0.04;
  return valor * 0.03;
}

app.get('/vendas', (req, res) => {
  res.json(vendas);
});

app.get('/vendas/resumo', (req, res) => {
  const totalVendas = vendas.reduce((acc, venda) => acc + Number(venda.valor || 0), 0);
  const totalComissoes = vendas.reduce((acc, venda) => acc + Number(venda.comissao || 0), 0);
  const qtdVendas = vendas.length;
  const ticketMedio = qtdVendas > 0 ? totalVendas / qtdVendas : 0;

  res.json({
    totalVendas,
    totalComissoes,
    qtdVendas,
    ticketMedio,
  });
});

app.post('/vendas', (req, res) => {
  const { id, cliente, vendedor, tipo, data, valor } = req.body;

  const idLimpo = String(id || '').trim();
  const clienteLimpo = String(cliente || '').trim();
  const vendedorLimpo = String(vendedor || '').trim();
  const tipoLimpo = String(tipo || '').trim();
  const dataLimpa = String(data || '').trim();
  const valorNumerico = Number(valor);

  if (!idLimpo || !clienteLimpo || !vendedorLimpo || !tipoLimpo || !dataLimpa || !Number.isFinite(valorNumerico) || valorNumerico <= 0) {
    return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios corretamente.' });
  }

  if (vendas.some((v) => v.id.toLowerCase() === idLimpo.toLowerCase())) {
    return res.status(409).json({ erro: 'Já existe uma venda com este ID.' });
  }

  const comissao = calcularComissao(tipoLimpo, valorNumerico);

  const venda = {
    id: idLimpo,
    cliente: clienteLimpo,
    vendedor: vendedorLimpo,
    tipo: tipoLimpo,
    data: dataLimpa,
    valor: valorNumerico,
    comissao,
  };

  vendas.push(venda);
  res.status(201).json(venda);
});

app.delete('/vendas/:id', (req, res) => {
  const { id } = req.params;
  const indice = vendas.findIndex((venda) => venda.id === id);

  if (indice === -1) {
    return res.status(404).json({ erro: 'Venda não encontrada.' });
  }

  vendas.splice(indice, 1);
  res.status(200).json({ mensagem: 'Venda removida com sucesso.' });
});

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});