import { SynergyScore as SynergyScoreType } from '@/integrations/supabase/types';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface SynergyScoreProps {
  score: SynergyScoreType;
  className?: string;
}

export function SynergyScore({ score, className }: SynergyScoreProps) {
  const dimensions = {
    E: { label: 'Experience', weight: 35 },
    T: { label: 'Technical', weight: 35 },
    C: { label: 'Certifications', weight: 15 },
    R: { label: 'Region', weight: 15 },
  };

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-green-600">{score.score}</span>
          <span className="text-sm text-gray-500">Synergy Score</span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-4 h-4 text-gray-400" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{score.explanation}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="space-y-3">
        {Object.entries(dimensions).map(([key, { label, weight }]) => {
          const value = score.dimension[key as keyof typeof score.dimension] || 0;
          return (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{label}</span>
                <span className="text-gray-900 font-medium">{value}/5</span>
              </div>
              <Progress value={(value / 5) * 100} className="h-2" />
            </div>
          );
        })}
      </div>
    </Card>
  );
} 