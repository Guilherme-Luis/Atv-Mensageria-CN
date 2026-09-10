class RequisicaoInvalidaError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RequisicaoInvalidaError';
    this.status = 400;
  }
}

function inteiroPositivo(valor, campo, padrao, maximo) {
  if (valor === undefined || valor === '') {
    return padrao;
  }

  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < 1) {
    throw new RequisicaoInvalidaError(`Parametro "${campo}" deve ser um inteiro maior que zero`);
  }

  return maximo ? Math.min(numero, maximo) : numero;
}

function inteiroOpcional(valor, campo) {
  if (valor === undefined || valor === '') {
    return undefined;
  }

  const numero = Number(valor);
  if (!Number.isInteger(numero)) {
    throw new RequisicaoInvalidaError(`Parametro "${campo}" deve ser um inteiro`);
  }

  return numero;
}

function textoOpcional(valor) {
  if (valor === undefined || valor === '') {
    return undefined;
  }
  return String(valor).trim();
}

function dataOpcional(valor, campo, fimDoDia) {
  if (valor === undefined || valor === '') {
    return undefined;
  }

  const bruto = String(valor).trim();
  const somenteData = /^\d{4}-\d{2}-\d{2}$/.test(bruto);
  const normalizado = somenteData ? `${bruto}T${fimDoDia ? '23:59:59.999' : '00:00:00.000'}Z` : bruto;
  const data = new Date(normalizado);

  if (Number.isNaN(data.getTime())) {
    throw new RequisicaoInvalidaError(`Parametro "${campo}" deve ser uma data valida (YYYY-MM-DD ou ISO 8601)`);
  }

  return data;
}

function opcaoValida(valor, campo, opcoes, padrao) {
  if (valor === undefined || valor === '') {
    return padrao;
  }

  const escolha = String(valor).toLowerCase();
  if (!opcoes.includes(escolha)) {
    throw new RequisicaoInvalidaError(`Parametro "${campo}" deve ser um destes valores: ${opcoes.join(', ')}`);
  }

  return escolha;
}

function primeiroDefinido(...valores) {
  return valores.find(valor => valor !== undefined && valor !== '');
}

module.exports = {
  RequisicaoInvalidaError,
  inteiroPositivo,
  inteiroOpcional,
  textoOpcional,
  dataOpcional,
  opcaoValida,
  primeiroDefinido
};
