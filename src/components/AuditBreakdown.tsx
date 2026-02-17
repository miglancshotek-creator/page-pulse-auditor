import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface BreakdownItem {
  category: string;
  score: number;
  status: string;
  recommendation: string;
}

interface AuditBreakdownProps {
  items: BreakdownItem[];
}

const statusConfig = {
  pass: { icon: CheckCircle, color: "text-score-excellent", bg: "bg-score-excellent/10" },
  warning: { icon: AlertTriangle, color: "text-score-warning", bg: "bg-score-warning/10" },
  fail: { icon: XCircle, color: "text-score-poor", bg: "bg-score-poor/10" },
};

const AuditBreakdown = ({ items }: AuditBreakdownProps) => {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold mb-4">Audit Breakdown</h3>
      <div className="rounded-lg border border-border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_80px_1fr] gap-4 p-3 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>Category</span>
          <span className="text-center">Score</span>
          <span>Recommendation</span>
        </div>
        {/* Rows */}
        {items.map((item, i) => {
          const config = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.warning;
          const Icon = config.icon;
          return (
            <div
              key={i}
              className="grid grid-cols-[1fr_80px_1fr] gap-4 p-4 border-t border-border items-start hover:bg-muted/20 transition-colors animate-fade-up"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${config.color} shrink-0`} />
                <span className="text-sm font-medium">{item.category}</span>
              </div>
              <div className="flex justify-center">
                <span className={`text-sm font-bold px-2 py-0.5 rounded ${config.bg} ${config.color}`}>
                  {item.score}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.recommendation}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AuditBreakdown;
