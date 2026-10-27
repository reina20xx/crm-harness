import { Bindings, analyzeMeetingNotes } from '../index';

export async function handleMcpRequest(req: any, env: Bindings) {
  const { id, method, params } = req;

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'crm-harness-mcp', version: '0.1.0' },
      },
    };
  }

  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        tools: [
          {
            name: 'ingest_meeting_notes',
            description: '商談メモ・議事録テキストからMEDDIC項目・受注確度・ネクストアクション・フォローメールを自動抽出してD1へ保存します',
            inputSchema: {
              type: 'object',
              properties: {
                company_name: { type: 'string' },
                contact_person: { type: 'string' },
                raw_notes: { type: 'string' },
              },
              required: ['company_name', 'raw_notes'],
            },
          },
          {
            name: 'list_pipeline_deals',
            description: '現在の営業パイプライン案件一覧と加重ヨミ予測（Weighted Forecast）を取得します',
            inputSchema: { type: 'object', properties: {} },
          },
        ],
      },
    };
  }

  if (method === 'tools/call') {
    const toolName = params?.name;
    const args = params?.arguments || {};

    if (toolName === 'ingest_meeting_notes') {
      const parsed = analyzeMeetingNotes(args);
      const dealId = `deal_${Date.now()}`;
      const now = new Date().toISOString();
      await env.DB.prepare(
        `INSERT INTO deals (id, company_name, contact_person, deal_stage, deal_amount_jpy, win_probability, meddic_pain, meddic_economic_buyer, meddic_decision_criteria, meddic_champion, meddic_competition, next_action, next_action_due, risk_alert, ai_followup_draft, raw_notes, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          dealId,
          args.company_name,
          args.contact_person || '担当者様',
          parsed.deal_stage,
          parsed.deal_amount_jpy,
          parsed.win_probability,
          parsed.meddic_pain,
          parsed.meddic_economic_buyer,
          parsed.meddic_decision_criteria,
          parsed.meddic_champion,
          parsed.meddic_competition,
          parsed.next_action,
          parsed.next_action_due,
          parsed.risk_alert,
          parsed.ai_followup_draft,
          args.raw_notes,
          now
        )
        .run();

      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: JSON.stringify({ deal_id: dealId, ...parsed }, null, 2) }],
        },
      };
    }

    if (toolName === 'list_pipeline_deals') {
      const deals = (await env.DB.prepare('SELECT * FROM deals ORDER BY updated_at DESC').all()).results || [];
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: JSON.stringify(deals, null, 2) }],
        },
      };
    }
  }

  return {
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: 'Method not found' },
  };
}
