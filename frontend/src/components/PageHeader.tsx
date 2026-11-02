import React from 'react';

interface PageHeaderProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  section?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  action,
  section = 'Kestrel / Operations',
}) => (
  <div className="page-heading">
    <div className="page-heading-copy">
      <div className="page-kicker">{section}</div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
    {action && <div className="page-heading-action">{action}</div>}
  </div>
);
