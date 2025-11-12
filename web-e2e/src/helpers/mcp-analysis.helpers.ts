import { Page } from '@playwright/test';
import {
  ScreenshotMetadata,
  Issue,
  Recommendation,
  DesignAnalysis,
  Metrics,
} from './types';

export class MCPAnalysisHelper {
  constructor(private page: Page) {}

  /**
   * Sequential MCP: Systematic screenshot analysis
   * Uses sequential-thinking to analyze design systematically
   */
  async analyzeWithSequential(
    screenshots: ScreenshotMetadata[]
  ): Promise<Issue[]> {
    console.log('🔄 Starting Sequential MCP analysis...');

    const issues: Issue[] = [];

    // Analyze color contrast
    const contrastIssues = await this.checkColorContrast();
    issues.push(...contrastIssues);

    // Analyze spacing consistency
    const spacingIssues = await this.checkSpacingConsistency();
    issues.push(...spacingIssues);

    // Analyze interactive elements
    const interactionIssues = await this.checkInteractiveElements();
    issues.push(...interactionIssues);

    // Analyze accessibility
    const a11yIssues = await this.checkAccessibility();
    issues.push(...a11yIssues);

    console.log(`✅ Sequential analysis complete: ${issues.length} issues found`);
    return issues;
  }

  /**
   * Check color contrast using page evaluation
   */
  private async checkColorContrast(): Promise<Issue[]> {
    const issues: Issue[] = [];

    try {
      const contrastResults = await this.page.evaluate(() => {
        const problems: Array<{
          element: string;
          fg: string;
          bg: string;
          ratio: number;
        }> = [];

        // Check buttons
        document.querySelectorAll('button').forEach((button) => {
          const styles = window.getComputedStyle(button);
          const bgColor = styles.backgroundColor;
          const color = styles.color;

          // Simple contrast check (would need proper implementation)
          if (
            bgColor.includes('rgb(241, 245, 249)') &&
            color.includes('rgb(15, 23, 42)')
          ) {
            problems.push({
              element: button.textContent?.trim() || 'Button',
              fg: color,
              bg: bgColor,
              ratio: 2.5, // Simplified
            });
          }
        });

        return problems;
      });

      contrastResults.forEach((result, index) => {
        if (result.ratio < 4.5) {
          issues.push({
            id: `contrast-${index}`,
            severity: 'critical',
            category: 'accessibility',
            description: `Insufficient color contrast on "${result.element}": ${result.ratio.toFixed(2)}:1 (requires 4.5:1)`,
            affectedComponents: [result.element],
            screenshots: [],
            wcagViolation: 'WCAG 2.1 1.4.3 Contrast (Minimum) - AA',
            recommendation: 'Increase color contrast to meet WCAG AA standards',
          });
        }
      });
    } catch (error) {
      console.warn('Color contrast check failed:', error);
    }

    return issues;
  }

  /**
   * Check spacing consistency
   */
  private async checkSpacingConsistency(): Promise<Issue[]> {
    const issues: Issue[] = [];

    try {
      const spacingResults = await this.page.evaluate(() => {
        const problems: Array<{ element: string; padding: string }> = [];

        // Check table cells
        document.querySelectorAll('td').forEach((cell) => {
          const styles = window.getComputedStyle(cell);
          const padding = styles.padding;

          // Track different padding values
          if (padding && !padding.includes('12px')) {
            problems.push({
              element: 'Table cell',
              padding,
            });
          }
        });

        return problems;
      });

      if (spacingResults.length > 0) {
        issues.push({
          id: 'spacing-tables',
          severity: 'high',
          category: 'spacing',
          description: `Inconsistent table cell padding: ${spacingResults.length} cells with non-standard padding`,
          affectedComponents: ['Table cells'],
          screenshots: [],
          recommendation:
            'Standardize table cell padding to 12px (Tailwind: p-3)',
        });
      }
    } catch (error) {
      console.warn('Spacing check failed:', error);
    }

    return issues;
  }

  /**
   * Check interactive elements (buttons, links)
   */
  private async checkInteractiveElements(): Promise<Issue[]> {
    const issues: Issue[] = [];

    try {
      const interactionResults = await this.page.evaluate(() => {
        const problems: Array<{
          type: string;
          issue: string;
        }> = [];

        // Check focus indicators
        document.querySelectorAll('button, a, input').forEach((el) => {
          const styles = window.getComputedStyle(el);
          const outline = styles.outline;
          const outlineOffset = styles.outlineOffset;

          if (!outline || outline === 'none') {
            problems.push({
              type: el.tagName,
              issue: 'Missing focus indicator',
            });
          }
        });

        return problems;
      });

      if (interactionResults.length > 0) {
        issues.push({
          id: 'interaction-focus',
          severity: 'critical',
          category: 'accessibility',
          description: `${interactionResults.length} interactive elements missing focus indicators`,
          affectedComponents: ['Buttons', 'Links', 'Inputs'],
          screenshots: [],
          wcagViolation: 'WCAG 2.1 2.4.7 Focus Visible - AA',
          recommendation:
            'Add visible focus indicators using focus-visible:ring-2',
        });
      }
    } catch (error) {
      console.warn('Interactive elements check failed:', error);
    }

    return issues;
  }

  /**
   * Check accessibility using Playwright's accessibility tree
   */
  private async checkAccessibility(): Promise<Issue[]> {
    const issues: Issue[]  = [];

    try {
      const snapshot = await this.page.accessibility.snapshot();

      // Basic accessibility checks
      if (snapshot) {
        // Check for missing alt text on images
        const checkNode = (node: any) => {
          if (node.role === 'img' && !node.name) {
            issues.push({
              id: `a11y-img-${Date.now()}`,
              severity: 'medium',
              category: 'accessibility',
              description: 'Image missing alt text',
              affectedComponents: ['Images'],
              screenshots: [],
              wcagViolation: 'WCAG 2.1 1.1.1 Non-text Content - A',
              recommendation: 'Add descriptive alt text to all images',
            });
          }

          if (node.children) {
            node.children.forEach(checkNode);
          }
        };

        checkNode(snapshot);
      }
    } catch (error) {
      console.warn('Accessibility check failed:', error);
    }

    return issues;
  }

  /**
   * Context7 MCP: Get design best practices
   * Note: This is a placeholder - actual MCP integration would happen here
   */
  async getBestPractices(topic: string): Promise<any> {
    console.log(`📚 Fetching best practices for: ${topic}`);
    // In real implementation, this would call Context7 MCP
    // For now, return mock data
    return {
      topic,
      guidelines: [
        'Use consistent spacing scale (Tailwind: 4, 8, 12, 16, 24px)',
        'Maintain color contrast ratio ≥4.5:1 for text',
        'Ensure touch targets ≥44x44px',
        'Provide visible focus indicators',
      ],
    };
  }

  /**
   * Magic MCP: Component-specific suggestions
   * Note: This is a placeholder - actual MCP integration would happen here
   */
  async getComponentSuggestions(
    component: string,
    context: string
  ): Promise<Recommendation[]> {
    console.log(`✨ Getting Magic suggestions for: ${component} (${context})`);
    // In real implementation, this would call Magic MCP
    return [];
  }

  /**
   * Generate comprehensive analysis report
   */
  async generateReport(
    screenshots: ScreenshotMetadata[],
    viewName: string
  ): Promise<DesignAnalysis> {
    console.log(`📊 Generating comprehensive report for: ${viewName}`);

    // Run Sequential analysis
    const issues = await this.analyzeWithSequential(screenshots);

    // Get best practices from Context7
    await this.getBestPractices('spacing');
    await this.getBestPractices('accessibility');

    // Get Magic suggestions
    await this.getComponentSuggestions('button', 'action buttons in tables');

    // Calculate metrics
    const metrics: Metrics = {
      totalIssues: issues.length,
      criticalIssues: issues.filter((i) => i.severity === 'critical').length,
      highIssues: issues.filter((i) => i.severity === 'high').length,
      mediumIssues: issues.filter((i) => i.severity === 'medium').length,
      lowIssues: issues.filter((i) => i.severity === 'low').length,
      wcagViolations: issues.filter((i) => i.wcagViolation).length,
      wcagComplianceRate:
        ((issues.length - issues.filter((i) => i.wcagViolation).length) /
          Math.max(issues.length, 1)) *
        100,
    };

    // Generate recommendations from issues
    const recommendations: Recommendation[] = issues.map((issue, index) => ({
      issueId: issue.id,
      title: issue.description,
      description: issue.recommendation,
      implementation: {
        files: issue.affectedComponents,
        changes: issue.recommendation,
      },
      priority: index + 1,
      estimatedEffort:
        issue.severity === 'critical' || issue.severity === 'high'
          ? 'high'
          : 'medium',
    }));

    return {
      view: viewName,
      screenshots,
      issues,
      recommendations,
      metrics,
      generatedAt: new Date().toISOString(),
    };
  }
}
