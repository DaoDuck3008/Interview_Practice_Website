"use client";

import type { ActivityDay } from "@/lib/api/sessions";

const cardClass =
  "rounded-2xl p-6 md:p-8 backdrop-blur-xl border border-white/10";
const cardBg = { background: "rgba(255,255,255,0.05)" };

const WEEKDAY_LABELS = ["T2", "", "T4", "", "T6", "", "CN"]; // Mon..Sun
const MONTH_ABBR = [
  "Th1",
  "Th2",
  "Th3",
  "Th4",
  "Th5",
  "Th6",
  "Th7",
  "Th8",
  "Th9",
  "Th10",
  "Th11",
  "Th12",
];
const DAY_MS = 24 * 60 * 60 * 1000;

/** Màu ô theo số buổi luyện: 0 = nền mờ; tăng dần theo sắc xanh success. */
function cellStyle(count: number): React.CSSProperties {
  if (count <= 0) return { background: "rgba(255,255,255,0.04)" };
  const alpha = count >= 4 ? 1 : count === 3 ? 0.75 : count === 2 ? 0.5 : 0.28;
  return { background: `rgba(34,197,94,${alpha})` };
}

interface Cell {
  date: string; // 'YYYY-MM-DD'
  count: number;
  month: number; // 0..11
  dom: number; // ngày trong tháng
}

function ymdToUtcMs(s: string): number {
  const [y, m, d] = s.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}
function fmtYmd(ms: number): string {
  const dt = new Date(ms);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

/** Dựng lưới cả năm: cột = tuần, hàng = thứ (T2..CN). null = ô đệm đầu/cuối. */
function buildGrid(from: string, to: string, counts: Map<string, number>) {
  const startMs = ymdToUtcMs(from);
  const endMs = ymdToUtcMs(to);
  const startWeekday = (new Date(startMs).getUTCDay() + 6) % 7; // T2=0..CN=6

  const days: Cell[] = [];
  for (let ms = startMs; ms <= endMs; ms += DAY_MS) {
    const date = fmtYmd(ms);
    const dt = new Date(ms);
    days.push({
      date,
      count: counts.get(date) ?? 0,
      month: dt.getUTCMonth(),
      dom: dt.getUTCDate(),
    });
  }

  const numCols = Math.ceil((startWeekday + days.length) / 7);
  const cols: (Cell | null)[][] = [];
  for (let c = 0; c < numCols; c += 1) {
    const rows: (Cell | null)[] = [];
    for (let r = 0; r < 7; r += 1) {
      const idx = c * 7 + r - startWeekday;
      rows.push(idx < 0 || idx >= days.length ? null : days[idx]);
    }
    cols.push(rows);
  }

  // Nhãn tháng: hiện ở cột đầu tiên mà tháng thay đổi.
  let lastMonth = -1;
  const monthLabels = cols.map((rows) => {
    const first = rows.find((c): c is Cell => c !== null);
    if (!first) return "";
    if (first.month !== lastMonth) {
      lastMonth = first.month;
      return MONTH_ABBR[first.month];
    }
    return "";
  });

  return { cols, monthLabels };
}

interface Props {
  data: ActivityDay[];
  loading?: boolean;
  /** 'YYYY-MM-DD' — mốc đầu/cuối của cửa sổ 1 năm. */
  from?: string;
  to?: string;
}

export default function ActivityHeatmap({ data, loading, from, to }: Props) {
  const counts = new Map(data.map((d) => [d.date, d.count]));
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const ready = Boolean(from && to);
  const { cols, monthLabels } = ready
    ? buildGrid(from!, to!, counts)
    : { cols: [], monthLabels: [] };

  return (
    <div className={cardClass} style={cardBg}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
            Hoạt động luyện tập
          </h3>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            {total} buổi trong 1 năm qua
          </p>
        </div>
      </div>

      <div className={`mt-5 ${loading ? "opacity-40" : ""}`}>
        <div className="overflow-x-auto pb-1">
          <div className="inline-block">
            {/* Nhãn tháng */}
            <div className="flex">
              <div className="mr-1 w-5 flex-shrink-0" />
              <div className="flex gap-[3px]">
                {monthLabels.map((lbl, ci) => (
                  <div key={ci} className="relative h-4 w-[12px]">
                    {lbl && (
                      <span className="absolute left-0 top-0 whitespace-nowrap text-[9px] text-[var(--color-text-muted)]">
                        {lbl}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Lưới */}
            <div className="flex">
              {/* Nhãn thứ */}
              <div className="mr-1 flex w-5 flex-shrink-0 flex-col gap-[3px]">
                {WEEKDAY_LABELS.map((lbl, i) => (
                  <span
                    key={i}
                    className="flex h-[12px] items-center text-[9px] text-[var(--color-text-muted)]"
                  >
                    {lbl}
                  </span>
                ))}
              </div>
              {/* Cột tuần */}
              <div className="flex gap-[3px]">
                {cols.map((rows, ci) => (
                  <div key={ci} className="flex flex-col gap-[3px]">
                    {rows.map((cell, ri) =>
                      cell === null ? (
                        <span key={ri} className="h-[12px] w-[12px]" />
                      ) : (
                        <span
                          key={ri}
                          title={`${cell.count} buổi · ${cell.dom}/${cell.month + 1}/${cell.date.slice(0, 4)}`}
                          className="h-[12px] w-[12px] rounded-[2px]"
                          style={cellStyle(cell.count)}
                        />
                      ),
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Chú thích */}
        <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-[var(--color-text-muted)]">
          <span>Ít</span>
          {[0, 1, 2, 3, 4].map((c) => (
            <span
              key={c}
              className="h-[12px] w-[12px] rounded-[2px]"
              style={cellStyle(c)}
            />
          ))}
          <span>Nhiều</span>
        </div>
      </div>
    </div>
  );
}
