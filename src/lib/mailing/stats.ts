export type CampaignStats = {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  unsubscribed: number;
  proxy: number;
};

type RecipientStatRow = {
  campaign_id: string;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  complained_at: string | null;
  unsubscribed_at: string | null;
  proxy_opened_at: string | null;
};

export function emptyStats(sent = 0): CampaignStats {
  return {
    sent,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    complained: 0,
    unsubscribed: 0,
    proxy: 0,
  };
}

export function statsFromRecipients(rows: RecipientStatRow[], sentFallback = 0): CampaignStats {
  const stats = emptyStats(sentFallback);
  stats.sent = sentFallback || rows.length;
  for (const row of rows) {
    if (row.delivered_at) stats.delivered += 1;
    if (row.opened_at) stats.opened += 1;
    if (row.clicked_at) stats.clicked += 1;
    if (row.bounced_at) stats.bounced += 1;
    if (row.complained_at) stats.complained += 1;
    if (row.unsubscribed_at) stats.unsubscribed += 1;
    if (row.proxy_opened_at) stats.proxy += 1;
  }
  return stats;
}

export function groupStats(rows: RecipientStatRow[]) {
  const map = new Map<string, CampaignStats>();
  const grouped = new Map<string, RecipientStatRow[]>();
  for (const row of rows) {
    const list = grouped.get(row.campaign_id) || [];
    list.push(row);
    grouped.set(row.campaign_id, list);
  }
  for (const [id, list] of grouped) {
    map.set(id, statsFromRecipients(list, list.length));
  }
  return map;
}
