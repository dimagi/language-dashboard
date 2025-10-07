import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Trophy, Medal, Award } from 'lucide-react';

interface LeaderboardEntry {
  model: string;
  avgReadability: number;
  avgAdequacy: number;
  languageCount: number;
  totalScore: number;
}

interface ModelLeaderboardProps {
  leaderboard: LeaderboardEntry[];
}

const ModelLeaderboard: React.FC<ModelLeaderboardProps> = ({ leaderboard }) => {
  const getIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">{index + 1}</div>;
    }
  };

  const getRankColor = (index: number) => {
    switch (index) {
      case 0:
        return "border-l-yellow-500 bg-yellow-50";
      case 1:
        return "border-l-gray-400 bg-gray-50";
      case 2:
        return "border-l-amber-600 bg-amber-50";
      default:
        return "border-l-muted bg-background";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" />
          Model Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {leaderboard.map((entry, index) => (
          <div
            key={entry.model}
            className={`flex items-center justify-between p-4 rounded-lg border-l-4 transition-all hover:shadow-md ${getRankColor(index)}`}
          >
            <div className="flex items-center gap-3">
              {getIcon(index)}
              <div>
                <div className="font-semibold text-foreground">
                  {entry.model}
                </div>
                <div className="text-sm text-muted-foreground">
                  {entry.languageCount} language{entry.languageCount !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {((entry.avgReadability + entry.avgAdequacy) / 2).toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">
                R: {entry.avgReadability.toFixed(1)} | A: {entry.avgAdequacy.toFixed(1)}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ModelLeaderboard;