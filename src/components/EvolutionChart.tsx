interface DataPoint {
  m: string;
  saldo: number;
  projecao: number;
}

interface Props {
  data: DataPoint[];
}

export function EvolutionChart({ data }: Props) {
  if (!data || data.length < 2) {
    return (
      <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
        Adicione lançamentos para ver a evolução.
      </div>
    );
  }

  const w = 880;
  const h = 260;
  const padL = 8;
  const padR = 8;
  const padT = 16;
  const padB = 28;

  const values = data.flatMap((d) => [d.saldo, d.projecao]);
  const min = Math.min(...values) * 0.92;
  const max = Math.max(...values) * 1.04;
  const range = max - min || 1;

  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const stepX = innerW / (data.length - 1);

  const pt = (v: number, i: number) => {
    const x = padL + i * stepX;
    const y = padT + (1 - (v - min) / range) * innerH;
    return [x, y] as const;
  };

  const smoothPath = (vals: number[]) => {
    const pts = vals.map((v, i) => pt(v, i));
    return pts
      .map(([x, y], i) => {
        if (i === 0) return `M ${x} ${y}`;
        const [px, py] = pts[i - 1];
        const cx = (px + x) / 2;
        return `C ${cx} ${py} ${cx} ${y} ${x} ${y}`;
      })
      .join(" ");
  };

  const saldoPath = smoothPath(data.map((d) => d.saldo));
  const projPath = smoothPath(data.map((d) => d.projecao));
  const areaPath = `${saldoPath} L ${padL + innerW} ${padT + innerH} L ${padL} ${padT + innerH} Z`;
  const [endX, endY] = pt(data[data.length - 1].saldo, data.length - 1);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
        <defs>
          <linearGradient id="evo-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--champagne)" stopOpacity="0.28" />
            <stop offset="60%" stopColor="var(--champagne)" stopOpacity="0.06" />
            <stop offset="100%" stopColor="var(--champagne)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* grid */}
        {[0.25, 0.5, 0.75].map((p) => (
          <line
            key={p}
            x1={padL}
            x2={w - padR}
            y1={padT + innerH * p}
            y2={padT + innerH * p}
            stroke="oklch(1 0 0 / 0.04)"
            strokeDasharray="2 4"
          />
        ))}

        {/* projection (dashed) */}
        <path
          d={projPath}
          fill="none"
          stroke="oklch(1 0 0 / 0.18)"
          strokeWidth={1}
          strokeDasharray="3 4"
        />

        {/* area */}
        <path d={areaPath} fill="url(#evo-fill)" />

        {/* saldo line */}
        <path
          d={saldoPath}
          fill="none"
          stroke="var(--champagne)"
          strokeWidth={1.75}
          strokeLinecap="round"
          className="animate-draw"
          style={{ ["--dash" as never]: 3000 }}
        />

        {/* end point */}
        <g>
          <circle cx={endX} cy={endY} r={6} fill="var(--champagne)" opacity={0.18} />
          <circle cx={endX} cy={endY} r={3} fill="var(--champagne)" />
        </g>

        {/* x labels */}
        {data.map((d, i) => (
          <text
            key={d.m}
            x={padL + i * stepX}
            y={h - 8}
            fill="oklch(0.65 0.012 70)"
            fontSize="10"
            textAnchor="middle"
            fontFamily="Inter"
          >
            {d.m}
          </text>
        ))}
      </svg>
    </div>
  );
}
