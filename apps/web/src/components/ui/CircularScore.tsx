interface Props {
  score: number;
  label: string;
  color?: string;
}

export default function CircularScore({ score, label, color = "#7c3aed" }: Props) {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(10, score)) / 10);
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="#1c1c28"
          strokeWidth="5"
        />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 40 40)"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
        <text
          x="40"
          y="45"
          textAnchor="middle"
          fill="#f4f4f6"
          fontSize="17"
          fontWeight="bold"
          fontFamily="inherit"
        >
          {score}
        </text>
      </svg>
      <span className="text-xs text-[#9898aa] text-center leading-tight">
        {label}
      </span>
    </div>
  );
}
