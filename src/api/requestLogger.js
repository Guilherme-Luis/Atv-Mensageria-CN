function requestLogger(req, res, next) {
  const inicio = process.hrtime.bigint();

  res.on('finish', () => {
    const duracao = Number(process.hrtime.bigint() - inicio) / 1e6;
    const alvo = req.originalUrl || req.url;

    console.log(
      `[${new Date().toISOString()}] HTTP ${req.method} ${alvo} ${res.statusCode} ${duracao.toFixed(1)}ms`
    );
  });

  next();
}

module.exports = requestLogger;
