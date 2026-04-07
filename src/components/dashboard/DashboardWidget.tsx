import { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';

interface DashboardWidgetProps {
  title: string;
  icon?: ReactNode;
  content: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function DashboardWidget({
  title,
  icon,
  content,
  footer,
  className = '',
}: DashboardWidgetProps): React.ReactElement {
  return (
    <Card
      title={title}
      icon={icon}
      footer={footer}
      className={className}
    >
      {content}
    </Card>
  );
}
