"use client";

import { useEffect, useState } from "react";

type Stats = {
  scans: number;
  identifications: number;
  completions: number;
  perMerchant: Array<{ name: string; scans: number }>;
};

export function LiveDashboard({ campaignId }: { campaignId: string }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let alive = true;
    const fetchStats = async () => {
      const res = await fetch(`/api/admin/campaigns/${campaignId}/stats`);
      if (!res.ok) return;
      const data = (await res.json()) as Stats;
      if (alive) setStats(data);
    };
    fetchStats();
    const id = setInterval(fetchStats, 5_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [campaignId]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Scans" value={stats?.scans ?? "—"} />
        <Stat label="Identificados" value={stats?.identifications ?? "—"} />
        <Stat label="Completados" value={stats?.completions ?? "—"} />
      </div>
      {stats?.perMerchant && stats.perMerchant.length > 0 ? (
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Top comerciantes
          </h3>
          <ol className="space-y-1 text-sm">
            {stats.perMerchant.slice(0, 5).map((m, i) => (
              <li key={i} className="flex justify-between">
                <span>
                  {i + 1}. {m.name}
                </span>
                <span className="font-mono">{m.scans}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
