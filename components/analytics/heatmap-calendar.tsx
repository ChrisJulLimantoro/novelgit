"use client";

import { useEffect, useState } from "react";
import { ResponsiveCalendar } from "@nivo/calendar";

interface Entry { date: string; wordCount: number }

export function HeatmapCalendar({ data }: { data: Entry[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div style={{ height: 200 }} aria-hidden="true" />;
  }

  const nivoData = data.map((e) => ({ day: e.date, value: e.wordCount }));
  const thisYear = new Date().getFullYear();

  return (
    <div style={{ height: 200 }}>
      <ResponsiveCalendar
        data={nivoData}
        from={`${thisYear}-01-01`}
        to={`${thisYear}-12-31`}
        emptyColor="var(--parchment-100)"
        colors={["var(--parchment-200)", "var(--ink-200)", "var(--ink-400)", "var(--ink-600)"]}
        monthBorderColor="var(--border-default)"
        dayBorderColor="var(--border-default)"
      />
    </div>
  );
}
