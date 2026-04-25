const express = require('express');
const app = express();

app.use(express.json());

let vendas = [];

app.get('/vendas', (req, res) => {
  res.json(vendas);
});

app.post('/vendas', (req, res) => {
  const { vendedor, valor } = req.body;

  const comissao = valor * 0.05;

  const venda = { vendedor, valor, comissao };

  vendas.push(venda);

  res.json(venda);
});

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});