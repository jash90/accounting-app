import fs from 'fs';
import path from 'path';
import { DesignAnalysis, Issue } from './types';

export class ReportGenerator {
  /**
   * Generate comprehensive markdown report
   */
  static generateMarkdownReport(analyses: DesignAnalysis[]): string {
    const totalIssues = analyses.reduce((sum, a) => sum + a.metrics.totalIssues, 0);
    const totalCritical = analyses.reduce(
      (sum, a) => sum + a.metrics.criticalIssues,
      0
    );
    const totalHigh = analyses.reduce((sum, a) => sum + a.metrics.highIssues, 0);
    const totalMedium = analyses.reduce((sum, a) => sum + a.metrics.mediumIssues, 0);
    const totalLow = analyses.reduce((sum, a) => sum + a.metrics.lowIssues, 0);
    const totalWCAG = analyses.reduce((sum, a) => sum + a.metrics.wcagViolations, 0);

    const avgCompliance =
      analyses.reduce((sum, a) => sum + a.metrics.wcagComplianceRate, 0) /
      analyses.length;

    let report = `# Design Analysis Report - Accounting Application\n\n`;
    report += `**Generated**: ${new Date().toLocaleString()}\n\n`;
    report += `---\n\n`;

    // Executive Summary
    report += `## Executive Summary\n\n`;
    report += `- **Total Views Analyzed**: ${analyses.length}\n`;
    report += `- **Total Screenshots Captured**: ${analyses.reduce((sum, a) => sum + a.screenshots.length, 0)}\n`;
    report += `- **Total Issues Identified**: ${totalIssues}\n`;
    report += `  - 🚨 Critical: ${totalCritical}\n`;
    report += `  - ⚠️ High: ${totalHigh}\n`;
    report += `  - ⚡ Medium: ${totalMedium}\n`;
    report += `  - ℹ️ Low: ${totalLow}\n`;
    report += `- **WCAG Violations**: ${totalWCAG}\n`;
    report += `- **WCAG Compliance Rate**: ${avgCompliance.toFixed(1)}% (Target: ≥90%)\n\n`;

    report += `---\n\n`;

    // Critical Issues
    const criticalIssues = this.getAllIssuesBySerity(analyses, 'critical');
    if (criticalIssues.length > 0) {
      report += `## 🚨 Critical Issues (Immediate Action Required)\n\n`;
      report += `Found ${criticalIssues.length} critical issues that must be addressed immediately:\n\n`;

      criticalIssues.forEach((issue, index) => {
        report += `### ${index + 1}. ${issue.description}\n\n`;
        report += `**Severity**: 🚨 Critical\n`;
        report += `**Category**: ${issue.category}\n`;
        if (issue.wcagViolation) {
          report += `**WCAG Violation**: ${issue.wcagViolation}\n`;
        }
        report += `**Affected Components**: ${issue.affectedComponents.join(', ')}\n\n`;
        report += `**Recommendation**:\n${issue.recommendation}\n\n`;
        report += `---\n\n`;
      });
    }

    // High Priority Issues
    const highIssues = this.getAllIssuesBySeverity(analyses, 'high');
    if (highIssues.length > 0) {
      report += `## ⚠️ High Priority Issues\n\n`;
      report += `Found ${highIssues.length} high priority issues:\n\n`;

      highIssues.forEach((issue, index) => {
        report += `### ${index + 1}. ${issue.description}\n\n`;
        report += `**Category**: ${issue.category}\n`;
        report += `**Affected Components**: ${issue.affectedComponents.join(', ')}\n`;
        report += `**Recommendation**: ${issue.recommendation}\n\n`;
      });

      report += `---\n\n`;
    }

    // Medium/Low Priority Issues Summary
    const mediumIssues = this.getAllIssuesBySeverity(analyses, 'medium');
    const lowIssues = this.getAllIssuesBySeverity(analyses, 'low');

    if (mediumIssues.length > 0 || lowIssues.length > 0) {
      report += `## Medium & Low Priority Issues\n\n`;
      report += `- Medium Priority: ${mediumIssues.length} issues\n`;
      report += `- Low Priority: ${lowIssues.length} issues\n\n`;
      report += `*See detailed JSON report for full list*\n\n`;
      report += `---\n\n`;
    }

    // WCAG Compliance
    report += `## Accessibility Compliance (WCAG 2.1 AA)\n\n`;
    report += `**Overall Compliance Rate**: ${avgCompliance.toFixed(1)}%\n\n`;
    report += `**WCAG Violations by Type**:\n`;

    const wcagViolations = this.groupWCAGViolations(analyses);
    Object.entries(wcagViolations).forEach(([violation, count]) => {
      report += `- ${violation}: ${count} instances\n`;
    });

    report += `\n---\n\n`;

    // Implementation Priority Queue
    report += `## Implementation Priority Queue\n\n`;
    report += `### Sprint 1 (Days 1-2): Critical Issues\n`;
    criticalIssues.forEach((issue, index) => {
      report += `${index + 1}. ${issue.description}\n`;
    });
    report += `\n`;

    report += `### Sprint 2 (Days 3-4): High Priority\n`;
    highIssues.slice(0, 5).forEach((issue, index) => {
      report += `${index + 1}. ${issue.description}\n`;
    });
    report += `\n`;

    report += `### Sprint 3 (Days 5+): Medium/Low Priority\n`;
    report += `Address remaining ${mediumIssues.length + lowIssues.length} issues based on business priority\n\n`;

    report += `---\n\n`;

    // Tools Used
    report += `## Tools & MCP Servers Used\n\n`;
    report += `- **Playwright MCP**: Screenshot capture, accessibility tree analysis\n`;
    report += `- **Sequential MCP**: Systematic issue identification and prioritization\n`;
    report += `- **Context7 MCP**: Tailwind CSS and WCAG best practices\n`;
    report += `- **Magic MCP**: Component-specific design suggestions\n\n`;

    report += `---\n\n`;

    // Next Steps
    report += `## Next Steps\n\n`;
    report += `1. ✅ Review this report with design/development team\n`;
    report += `2. ⏳ Prioritize issues based on impact and effort\n`;
    report += `3. ⏳ Assign issues to developers\n`;
    report += `4. ⏳ Implement fixes in priority order\n`;
    report += `5. ⏳ Re-run visual tests to verify improvements\n`;
    report += `6. ⏳ Generate before/after comparison report\n\n`;

    return report;
  }

  private static getAllIssuesBySeverity(
    analyses: DesignAnalysis[],
    severity: Issue['severity']
  ): Issue[] {
    const issues: Issue[] = [];
    analyses.forEach((analysis) => {
      analysis.issues
        .filter((i) => i.severity === severity)
        .forEach((i) => issues.push(i));
    });
    return issues;
  }

  private static groupWCAGViolations(
    analyses: DesignAnalysis[]
  ): Record<string, number> {
    const violations: Record<string, number> = {};

    analyses.forEach((analysis) => {
      analysis.issues.forEach((issue) => {
        if (issue.wcagViolation) {
          violations[issue.wcagViolation] =
            (violations[issue.wcagViolation] || 0) + 1;
        }
      });
    });

    return violations;
  }

  /**
   * Save report to files
   */
  static saveReports(
    analyses: DesignAnalysis[],
    outputDir: string = 'screenshots/analysis'
  ): void {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save markdown report
    const markdownReport = this.generateMarkdownReport(analyses);
    const markdownPath = path.join(outputDir, 'design-analysis-report.md');
    fs.writeFileSync(markdownPath, markdownReport);
    console.log(`📄 Markdown report saved: ${markdownPath}`);

    // Save JSON analyses
    const jsonPath = path.join(outputDir, 'analyses.json');
    fs.writeFileSync(jsonPath, JSON.stringify(analyses, null, 2));
    console.log(`📄 JSON analyses saved: ${jsonPath}`);

    // Save issues only
    const allIssues = analyses.flatMap((a) => a.issues);
    const issuesPath = path.join(outputDir, 'issues.json');
    fs.writeFileSync(issuesPath, JSON.stringify(allIssues, null, 2));
    console.log(`📄 Issues list saved: ${issuesPath}`);

    // Save recommendations
    const allRecommendations = analyses.flatMap((a) => a.recommendations);
    const recommendationsPath = path.join(outputDir, 'recommendations.json');
    fs.writeFileSync(
      recommendationsPath,
      JSON.stringify(allRecommendations, null, 2)
    );
    console.log(`📄 Recommendations saved: ${recommendationsPath}`);

    // Save metrics summary
    const metricsSummary = {
      totalViews: analyses.length,
      totalScreenshots: analyses.reduce(
        (sum, a) => sum + a.screenshots.length,
        0
      ),
      totalIssues: analyses.reduce((sum, a) => sum + a.metrics.totalIssues, 0),
      criticalIssues: analyses.reduce(
        (sum, a) => sum + a.metrics.criticalIssues,
        0
      ),
      highIssues: analyses.reduce((sum, a) => sum + a.metrics.highIssues, 0),
      mediumIssues: analyses.reduce((sum, a) => sum + a.metrics.mediumIssues, 0),
      lowIssues: analyses.reduce((sum, a) => sum + a.metrics.lowIssues, 0),
      wcagViolations: analyses.reduce(
        (sum, a) => sum + a.metrics.wcagViolations,
        0
      ),
      avgWcagCompliance:
        analyses.reduce((sum, a) => sum + a.metrics.wcagComplianceRate, 0) /
        analyses.length,
    };
    const metricsPath = path.join(outputDir, 'metrics.json');
    fs.writeFileSync(metricsPath, JSON.stringify(metricsSummary, null, 2));
    console.log(`📄 Metrics summary saved: ${metricsPath}`);

    console.log(`\n✅ All reports saved to: ${outputDir}`);
  }
}
