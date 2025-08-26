import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";

interface MLMetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  progress?: number;
  trend?: "up" | "down" | "stable";
  badge?: string;
  color?: "default" | "green" | "red" | "yellow";
}

const MLMetricCard: React.FC<MLMetricCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  progress,
  trend,
  badge,
  color = "default"
}) => {
  const getColorClasses = () => {
    switch (color) {
      case "green":
        return "border-green-200 bg-green-50";
      case "red":
        return "border-red-200 bg-red-50";
      case "yellow":
        return "border-yellow-200 bg-yellow-50";
      default:
        return "";
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return "📈";
      case "down":
        return "📉";
      case "stable":
        return "➡️";
      default:
        return "";
    }
  };

  return (
    <Card className={getColorClasses()}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="flex items-center gap-2">
          {badge && <Badge variant="secondary">{badge}</Badge>}
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">{value}</div>
          {trend && <span className="text-lg">{getTrendIcon()}</span>}
        </div>
        {progress !== undefined && (
          <div className="mt-2">
            <Progress value={progress} className="h-2" />
          </div>
        )}
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
};

export default MLMetricCard;
