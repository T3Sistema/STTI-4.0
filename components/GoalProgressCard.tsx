import React from 'react';
import Card from './Card';

interface GoalProgressCardProps {
  title: string;
  current: number;
  goal: number;
}

const GoalProgressCard: React.FC<GoalProgressCardProps> = ({ title, current, goal }) => {
  const percentage = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;

  const getProgressBarColor = () => {
    // Verde (#00FF88) até 70%
    // Amarelo (#FFC107) até 90%
    // Vermelho (#FF005C) acima de 90%
    if (percentage > 90) return 'bg-[#FF005C]';
    if (percentage > 70) return 'bg-[#FFC107]';
    return 'bg-[#00FF88]';
  };

  const barColorClass = getProgressBarColor();

  return (
    <Card className="p-4 text-center animate-fade-in flex flex-col justify-between">
      <p className="text-sm font-medium text-dark-secondary h-10 flex items-center justify-center">{title}</p>
      <div className="my-2">
        <span className="text-4xl font-bold text-dark-text">{current}</span>
        <span className="text-2xl font-semibold text-dark-secondary">/{goal > 0 ? goal : '∞'}</span>
      </div>
      <div className="w-full bg-dark-background rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${barColorClass}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </Card>
  );
};

export default GoalProgressCard;
