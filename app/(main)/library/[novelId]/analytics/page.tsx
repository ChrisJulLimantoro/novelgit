import { getFile } from "@/lib/github-content";
import { HeatmapCalendar } from "@/components/analytics/heatmap-calendar";

export default async function AnalyticsPage({ params }: { params: Promise<{ novelId: string }> }) {
  const { novelId } = await params;
  let entries: { date: string; wordCount: number }[] = [];
  try {
    const { content } = await getFile(`content/${novelId}/analytics.json`);
    entries = JSON.parse(content);
  } catch { /* no analytics yet */ }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10">
      <h1 className="font-serif text-3xl font-semibold mb-8">Analytics</h1>
      <HeatmapCalendar data={entries} />
    </div>
  );
}
