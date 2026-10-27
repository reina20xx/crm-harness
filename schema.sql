DROP TABLE IF EXISTS deals;
CREATE TABLE deals (
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  deal_stage TEXT NOT NULL,
  deal_amount_jpy INTEGER NOT NULL,
  win_probability INTEGER NOT NULL,
  meddic_pain TEXT NOT NULL,
  meddic_economic_buyer TEXT NOT NULL,
  meddic_decision_criteria TEXT NOT NULL,
  meddic_champion TEXT NOT NULL,
  meddic_competition TEXT NOT NULL,
  next_action TEXT NOT NULL,
  next_action_due TEXT NOT NULL,
  risk_alert TEXT NOT NULL,
  ai_followup_draft TEXT NOT NULL,
  raw_notes TEXT,
  updated_at TEXT NOT NULL
);

INSERT INTO deals (id, company_name, contact_person, deal_stage, deal_amount_jpy, win_probability, meddic_pain, meddic_economic_buyer, meddic_decision_criteria, meddic_champion, meddic_competition, next_action, next_action_due, risk_alert, ai_followup_draft, raw_notes, updated_at) VALUES
('deal_001', 'ネクストロジスティクス株式会社', '営業本部長 佐藤 健一', 'Negotiation（最終条件交渉）', 4800000, 82, '既存のSalesforce月額費用（年間720万円）が高騰し、現場の入力率が30%以下に低下', '取締役CFO 高橋 誠（来週火曜の経営会議で最終決裁）', '初期移行コスト0円・商談議事録からの自動入力精度・セキュリティ監査', '営業企画課長 鈴木 翔太（社内稟議書を作成中）', 'HubSpot Sales Hub Enterprise（価格面で弊社が圧倒的優位）', 'CFO向けROI試算シート（年間600万円削減案）とセキュリティチェックシートの送付', '2026-10-29', '🟢 順調（決裁者・推進者ともに合意済）', '佐藤本部長、鈴木様\n本日の商談ありがとうございました。来週火曜の取締役会に向け、現行SFAからの移行で年間600万円を削減できるROI試算表を添付いたします。', '佐藤本部長・鈴木課長とZoom商談。年額480万円プランで合意形成。来週火曜にCFO高橋様が稟議決裁。', '2026-10-26T15:30:00Z'),
('deal_002', '株式会社クラウドメディカル', '情報システム部長 田中 裕子', 'At Risk（停滞・失注リスク）', 3600000, 35, '営業15名の案件進捗がExcel管理でブラックボックス化、月末のヨミ集計に丸2日かかる', '未特定（情報システム部長止まりで営業役員が未同席）', '現場がマニュアルなしで使えること、既存Slackとの連携', '情報システム部 主任 渡辺 健', ' Mazrica Sales / 現状維持（Excel）', '営業担当役員（VP of Sales）を交えた15分デモの再設定', '2026-10-20', '🚨 危険：決裁権者（Economic Buyer）未特定＋次回アクション期限が7日超過', '田中部長\n先日ご提案したAI自動ヨミ集計につきまして、その後社内のご検討状況はいかがでしょうか？ぜひ一度、営業部門の責任者様向けに「議事録を貼るだけでExcel集計が0秒になるデモ」を15分だけご覧いただきたく存じます。', '田中部長と初回面談。予算360万円。ただし営業本部長が同席しておらず稟議が止まっている模様。', '2026-10-18T11:00:00Z');
