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

/**
 * Accessibility tree node interface for Playwright a11y testing
 * Based on Playwright's accessibility snapshot API
 */
export interface AccessibilityNode {
  /** Accessible role (e.g., 'button', 'textbox', 'link') */
  role?: string;
  /** Accessible name (computed from aria-label, text content, etc.) */
  name?: string;
  /** Current value (for input elements) */
  value?: string;
  /** Accessible description (from aria-describedby) */
  description?: string;
  /** Keyboard shortcuts (from aria-keyshortcuts) */
  keyshortcuts?: string;
  /** Custom role description (from aria-roledescription) */
  roledescription?: string;
  /** Human-readable value text (from aria-valuetext) */
  valuetext?: string;
  /** Whether the element is disabled */
  disabled?: boolean;
  /** Whether the element is expanded (for expandable elements) */
  expanded?: boolean;
  /** Whether the element has focus */
  focused?: boolean;
  /** Whether the element is modal */
  modal?: boolean;
  /** Whether multiple items can be selected */
  multiselectable?: boolean;
  /** Whether the element is read-only */
  readonly?: boolean;
  /** Whether the element is required */
  required?: boolean;
  /** Whether the element is selected */
  selected?: boolean;
  /** Checked state (true, false, or 'mixed' for indeterminate) */
  checked?: boolean | 'mixed';
  /** Pressed state (true, false, or 'mixed' for toggle buttons) */
  pressed?: boolean | 'mixed';
  /** Hierarchical level (for headings, tree items) */
  level?: number;
  /** Minimum value (for range inputs) */
  valuemin?: number;
  /** Maximum value (for range inputs) */
  valuemax?: number;
  /** Autocomplete type */
  autocomplete?: string;
  /** Has popup type (from aria-haspopup) */
  haspopup?: string;
  /** Invalid state (from aria-invalid) */
  invalid?: string;
  /** Orientation (horizontal/vertical) */
  orientation?: string;
  /** Child accessibility nodes */
  children?: AccessibilityNode[];
}
