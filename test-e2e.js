const assert = require('node:assert');

async function runTests() {
  const base = process.env.BASE_URL || 'http://localhost:8801';
  console.log('Testing CRM Harness at', base);

  // 1. Health check
  const hRes = await fetch(`${base}/api/health`);
  assert.strictEqual(hRes.status, 200);
  const hJson = await hRes.json();
  assert.strictEqual(hJson.service, 'crm-harness');

  // 2. Dashboard check
  const dRes = await fetch(`${base}/api/dashboard`);
  assert.strictEqual(dRes.status, 200);
  const dJson = await dRes.json();
  assert.ok(dJson.deals.length >= 2);

  // 3. Zero-input meeting notes ingestion
  const ingestRes = await fetch(`${base}/api/deals/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company_name: '東都インダストリー株式会社',
      contact_person: '専務取締役 営業本部長 佐々木 剛',
      raw_notes: '佐々木専務と商談。既存のSalesforceのコスト削減目的で年額600万円の予算確保に合意。来週稟議承認予定。',
    }),
  });
  assert.strictEqual(ingestRes.status, 200);
  const ingestJson = await ingestRes.json();
  assert.strictEqual(ingestJson.ok, true);
  assert.strictEqual(ingestJson.deal.deal_amount_jpy, 6000000);
  assert.ok(ingestJson.deal.win_probability >= 80);

  // 4. MCP endpoint check
  const mcpRes = await fetch(`${base}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'list_pipeline_deals', arguments: {} },
    }),
  });
  assert.strictEqual(mcpRes.status, 200);
  const mcpJson = await mcpRes.json();
  assert.ok(mcpJson.result.content[0].text.includes('東都インダストリー株式会社'));

  console.log('✅ CRM Harness E2E tests passed!');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
