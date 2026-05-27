import fs from 'node:fs/promises';
import path from 'node:path';

const outputPath = path.join(process.cwd(), 'data', 'exchange-rate.json');
const apiUrl = process.env.EXCHANGE_RATE_API_URL ?? 'https://open.er-api.com/v6/latest/USD';

function toBeijingIsoString(date = new Date()) {
  const beijing = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return `${beijing.toISOString().replace('Z', '+08:00')}`;
}

function readCnyRate(payload) {
  const rate = payload?.rates?.CNY ?? payload?.conversion_rates?.CNY;
  return typeof rate === 'number' && Number.isFinite(rate) && rate > 0 ? rate : null;
}

async function main() {
  const response = await fetch(apiUrl, {
    headers: {
      accept: 'application/json',
      'user-agent': 'uniontech-3dp-quote-tool/0.1',
    },
  });

  if (!response.ok) {
    throw new Error(`Exchange-rate API failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  const rate = readCnyRate(payload);
  if (!rate) {
    throw new Error('Exchange-rate API response does not contain a valid USD/CNY rate.');
  }

  const nextRate = {
    base: 'USD',
    quote: 'CNY',
    rate: Number(rate.toFixed(6)),
    source: apiUrl,
    fetchedAt: toBeijingIsoString(),
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(nextRate, null, 2)}\n`);
  console.log(`Updated USD/CNY exchange rate: ${nextRate.rate}`);
  console.log(`Saved to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
