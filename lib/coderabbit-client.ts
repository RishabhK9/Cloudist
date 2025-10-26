/**
 * CodeRabbit API Client
 * Official API documentation: https://docs.coderabbit.ai/
 */

export interface CodeRabbitReviewRequest {
  files: {
    path: string;
    content: string;
    language?: string;
  }[];
  options?: {
    security?: boolean;
    performance?: boolean;
    bestPractices?: boolean;
    costOptimization?: boolean;
  };
}

export interface CodeRabbitReviewResponse {
  review_id: string;
  status: 'completed' | 'in_progress' | 'failed';
  summary: {
    overall_score: number;
    security_score: number;
    performance_score: number;
    maintainability_score: number;
  };
  findings: CodeRabbitFinding[];
  suggestions: CodeRabbitSuggestion[];
  metadata: {
    reviewed_at: string;
    files_reviewed: number;
    lines_reviewed: number;
  };
}

export interface CodeRabbitFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'security' | 'performance' | 'best-practices' | 'cost' | 'maintainability';
  title: string;
  description: string;
  file: string;
  line: number;
  suggestion: string;
  code_snippet?: string;
}

export interface CodeRabbitSuggestion {
  category: 'security' | 'performance' | 'cost' | 'best-practices' | 'reliability';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
}

export class CodeRabbitClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.CODERABBIT_API_KEY || '';
    this.baseUrl = 'https://api.coderabbit.ai/v1';
  }

  /**
   * Check if CodeRabbit API is configured
   */
  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  /**
   * Submit code for review
   */
  async reviewCode(request: CodeRabbitReviewRequest): Promise<CodeRabbitReviewResponse> {
    if (!this.isConfigured()) {
      throw new Error('CodeRabbit API key not configured');
    }

    console.log('🤖 [CodeRabbit] Submitting review request...');
    console.log('   Files:', request.files.length);
    console.log('   Options:', request.options);

    const response = await fetch(`${this.baseUrl}/reviews`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: request.files.map(f => ({
          path: f.path,
          content: f.content,
          language: f.language || this.detectLanguage(f.path),
        })),
        options: {
          security: request.options?.security ?? true,
          performance: request.options?.performance ?? true,
          best_practices: request.options?.bestPractices ?? true,
          cost_optimization: request.options?.costOptimization ?? true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [CodeRabbit] API error:', response.status, errorText);
      
      if (response.status === 401) {
        throw new Error('Invalid CodeRabbit API key');
      } else if (response.status === 429) {
        throw new Error('CodeRabbit API rate limit exceeded');
      } else {
        throw new Error(`CodeRabbit API error: ${response.status} - ${errorText}`);
      }
    }

    const data = await response.json();
    console.log('✅ [CodeRabbit] Review completed:', data.review_id);
    
    return data;
  }

  /**
   * Get review status and results
   */
  async getReview(reviewId: string): Promise<CodeRabbitReviewResponse> {
    if (!this.isConfigured()) {
      throw new Error('CodeRabbit API key not configured');
    }

    const response = await fetch(`${this.baseUrl}/reviews/${reviewId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get review: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Detect language from file extension
   */
  private detectLanguage(filepath: string): string {
    const ext = filepath.split('.').pop()?.toLowerCase();
    
    const languageMap: Record<string, string> = {
      'tf': 'terraform',
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'go': 'go',
      'java': 'java',
      'rb': 'ruby',
      'yml': 'yaml',
      'yaml': 'yaml',
      'json': 'json',
    };

    return languageMap[ext || ''] || 'text';
  }
}

/**
 * Convert CodeRabbit response to our UI format
 */
export function convertCodeRabbitToUIFormat(
  coderabbitResponse: CodeRabbitReviewResponse
): {
  overallScore: number;
  summary: string;
  strengths: string[];
  issues: any[];
  securityAnalysis: {
    securityScore: number;
    findings: string[];
  };
  reviewedBy?: string;
  reviewMethod?: string;
} {
  // Extract strengths from high scores
  const strengths: string[] = [];
  if (coderabbitResponse.summary.security_score >= 80) {
    strengths.push('Strong security practices implemented');
  }
  if (coderabbitResponse.summary.performance_score >= 80) {
    strengths.push('Good performance optimization');
  }
  if (coderabbitResponse.summary.maintainability_score >= 80) {
    strengths.push('Well-structured and maintainable code');
  }

  // Convert findings to issues
  const severityMap: { [key: string]: 'high' | 'medium' | 'low' } = {
    critical: 'high',
    high: 'high',
    medium: 'medium',
  };
  const issues = coderabbitResponse.findings.map(finding => ({
    severity: severityMap[finding.severity] || 'low',
    category: finding.category,
    description: finding.title,
    recommendation: finding.suggestion,
    file: finding.file,
    line: finding.line,
  }));

  // Extract security findings
  const securityFindings = coderabbitResponse.findings
    .filter(f => f.category === 'security')
    .map(f => f.description);

  // Generate summary
  const criticalCount = coderabbitResponse.findings.filter(f => 
    f.severity === 'critical' || f.severity === 'high'
  ).length;
  
  let summary = '';
  if (criticalCount > 0) {
    summary = `⚠️ CodeRabbit identified ${criticalCount} critical issue${criticalCount > 1 ? 's' : ''} that require immediate attention`;
  } else if (issues.length > 0) {
    summary = `📋 CodeRabbit found ${issues.length} suggestion${issues.length > 1 ? 's' : ''} for improving your infrastructure`;
  } else {
    summary = '✅ CodeRabbit review complete: Your infrastructure configuration looks solid!';
  }

  return {
    overallScore: coderabbitResponse.summary.overall_score,
    summary,
    strengths,
    issues,
    securityAnalysis: {
      securityScore: coderabbitResponse.summary.security_score,
      findings: securityFindings,
    },
  };
}
