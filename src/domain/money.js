function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function toAmount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return round2(parsed);
}

module.exports = { round2, toAmount };
