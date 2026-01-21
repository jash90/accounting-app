export interface ScreenshotMetadata {
  path: string;
  category: string;
  pageName: string;
  state: string;
  viewport: string;
  timestamp: string;
}

export interface Issue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category:
    | 'spacing'
    | 'typography'
    | 'colors'
    | 'interactions'
    | 'accessibility'
    | 'responsiveness';
  description: string;
  affectedComponents: string[];
  screenshots: string[];
  wcagViolation?: string;
  recommendation: string;
}

export interface Recommendation {
  issueId: string;
  title: string;
  description: string;
  implementation: {
    files: string[];
    changes: string;
  };
  priority: number;
  estimatedEffort: 'low' | 'medium' | 'high';
}

export interface Metrics {
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  wcagViolations: number;
  wcagComplianceRate: number;
}

export interface DesignAnalysis {
  view: string;
  screenshots: ScreenshotMetadata[];
  issues: Issue[];
  recommendations: Recommendation[];
  metrics: Metrics;
  generatedAt: string;
}
