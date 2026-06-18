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

  if (!id || !cliente || !vendedor || !tipo || !data || valor === undefined) {
    return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios.' });
  }

  if (vendas.some((v) => v.id.toLowerCase() === String(id).toLowerCase())) {
    return res.status(409).json({ erro: 'Já existe uma venda com este ID.' });
  }

  const valorNumerico = Number(valor);
  const comissao = calcularComissao(tipo, valorNumerico);

  const venda = {
    id: String(id),
    cliente: String(cliente),
    vendedor: String(vendedor),
    tipo: String(tipo),
    data: String(data),
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