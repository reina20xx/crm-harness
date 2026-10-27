import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handleMcpRequest } from './agent/mcp';

export type Bindings = {
  DB: D1Database;
  STATIC_HTML?: string;
};

const app = new Hono<{ Bindings: Bindings }>();
app.use('*', cors());

export interface MeetingNoteInput {
  company_name: string;
  contact_person: string;
  raw_notes: string;
  estimated_amount_jpy?: number;
}

export function analyzeMeetingNotes(input: MeetingNoteInput) {
  const text = `${input.contact_person || ''} ${input.raw_notes || ''}`;

  // Extract deal amount from text (e.g., "600万円", "480万", etc.) or fallback
  let amount = input.estimated_amount_jpy || 3600000;
  const manMatch = text.match(/(\d+)\s*万円/);
  if (manMatch) {
    amount = parseInt(manMatch[1], 10) * 10000;
  }

  // MEDDIC extraction heuristics
  const hasCfoOrCeo = /社長|代表取締役|CFO|役員|取締役|専務|常務|本部長/.test(text);
  const hasBudgetApproved = /予算確保|合意|稟議承認|決裁|導入決定|内定/.test(text);
  const hasCompetitor = /Salesforce|HubSpot|Mazrica|Senses|競合|他社/.test(text);
  const hasDelayOrBlocker = /検討中|持ち帰り|未定|難航|ペンディング|時期尚早|止まって/.test(text);

  const meddic_pain =
    text.includes('入力') || text.includes('SFA') || text.includes('Salesforce')
      ? '営業現場のSFA手入力負荷（1日90分ロス）とライセンス費用高騰によるROI悪化'
      : text.includes('属人化') || text.includes('Excel')
      ? '案件進捗とヨミ管理の属人化・ブラックボックス化による失注リスク'
      : '営業プロセスの可視化不足とリードタイム長期化による機会損失';

  const meddic_economic_buyer = hasCfoOrCeo
    ? '決裁権者（取締役・営業本部長クラス）の関与確認済'
    : '⚠️ 未特定（現場担当者のみ・決裁者へのアプローチ必須）';

  const meddic_decision_criteria =
    '現場が入力ゼロ（議事録貼り付けのみ）で定着すること・初期コスト0円・既存フローとのシームレス連携';

  const meddic_champion = `${input.contact_person || '担当者'}（社内推進・稟議起案担当）`;

  const meddic_competition = hasCompetitor
    ? '既存大手SaaS（Salesforce / HubSpot）からのリプレイス比較中（コスト優位性90%以上）'
    : '現状維持（スプレッドシート / 手動管理）との比較';

  let win_probability = 55;
  let deal_stage = 'Proposal（提案・要件定義）';
  let risk_alert = '🟡 注意：決裁スケジュールと稟議ルートの確定が必要';

  if (hasCfoOrCeo && hasBudgetApproved && !hasDelayOrBlocker) {
    win_probability = 85;
    deal_stage = 'Negotiation（最終条件交渉・稟議中）';
    risk_alert = '🟢 順調：Economic Buyer特定済・予算合意形成クリア';
  } else if (hasDelayOrBlocker || !hasCfoOrCeo) {
    win_probability = 35;
    deal_stage = 'At Risk（停滞・失注リスク）';
    risk_alert = '🚨 危険：決裁権者（Economic Buyer）未同席または稟議停滞シグナル検知';
  }

  const nextDue = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const next_action =
    win_probability >= 80
      ? '最終ROI試算シート＋申込書ドラフトの送付（決裁会議向け）'
      : '決裁権者（役員・部門長）を交えた15分エグゼクティブデモの打診';

  const ai_followup_draft = `${input.company_name}\n${input.contact_person || 'ご担当者'} 様\n\nお世話になっております。本日の商談のお時間をいただき誠にありがとうございました。\n\n本日お伺いした「${meddic_pain}」という課題に対し、弊社のAIネイティブ基盤をご活用いただくことで、営業現場の手入力時間をゼロにしつつ、年間コストを大幅に削減可能です。\n\n【ネクストアクション】\n・${next_action}（目標期日：${nextDue}）\n\n社内稟議用の比較資料も添付いたしますので、ぜひご査収くださいませ。`;

  return {
    deal_stage,
    deal_amount_jpy: amount,
    win_probability,
    meddic_pain,
    meddic_economic_buyer,
    meddic_decision_criteria,
    meddic_champion,
    meddic_competition,
    next_action,
    next_action_due: nextDue,
    risk_alert,
    ai_followup_draft,
  };
}

app.get('/api/health', (c) =>
  c.json({
    status: 'ok',
    service: 'crm-harness',
    thesis: 'SaaS is Dead -> Zero-Input AI Sales CRM on Cloudflare D1 + MCP',
    cost: '¥0/month (Replaces ¥30,000/seat/month Legacy SFA)',
  })
);

app.get('/api/dashboard', async (c) => {
  const deals = (await c.env.DB.prepare('SELECT * FROM deals ORDER BY updated_at DESC').all()).results || [];
  const totalPipeline = deals.reduce((s: number, d: any) => s + Number(d.deal_amount_jpy), 0);
  const weightedForecast = deals.reduce(
    (s: number, d: any) => s + Math.round((Number(d.deal_amount_jpy) * Number(d.win_probability)) / 100),
    0
  );
  const atRiskCount = deals.filter((d: any) => String(d.deal_stage).includes('At Risk') || Number(d.win_probability) <= 40).length;

  return c.json({
    metrics: {
      total_deals: deals.length,
      total_pipeline_jpy: totalPipeline,
      weighted_forecast_jpy: weightedForecast,
      at_risk_deals: atRiskCount,
      annual_saas_cost_saved_jpy: 5400000,
    },
    deals,
  });
});

app.post('/api/deals/ingest', async (c) => {
  const body = await c.req.json<MeetingNoteInput>();
  if (!body.company_name || !body.raw_notes) {
    return c.json({ error: 'company_name and raw_notes are required' }, 400);
  }

  const parsed = analyzeMeetingNotes(body);
  const id = `deal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `INSERT INTO deals (id, company_name, contact_person, deal_stage, deal_amount_jpy, win_probability, meddic_pain, meddic_economic_buyer, meddic_decision_criteria, meddic_champion, meddic_competition, next_action, next_action_due, risk_alert, ai_followup_draft, raw_notes, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      body.company_name,
      body.contact_person || '担当者様',
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
      body.raw_notes,
      now
    )
    .run();

  return c.json({
    ok: true,
    deal: {
      id,
      company_name: body.company_name,
      contact_person: body.contact_person || '担当者様',
      ...parsed,
      raw_notes: body.raw_notes,
      updated_at: now,
    },
  });
});

app.post('/mcp', async (c) => {
  const body = await c.req.json();
  return c.json(await handleMcpRequest(body, c.env));
});

app.get('/', (c) => (c.env.STATIC_HTML ? c.html(c.env.STATIC_HTML) : c.text('CRM Harness API running')));

export default app;
