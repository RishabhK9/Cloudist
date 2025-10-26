# CodeRabbit Integration Documentation

## Overview

Cloudist integrates with CodeRabbit to provide professional AI-powered code review for Terraform configurations. The implementation uses a **three-tier fallback strategy** to ensure reliable code review functionality.

## Architecture

```
User clicks "Code Review" button
        ↓
Generate Terraform files
        ↓
┌─────────────────────────────────────┐
│  Strategy 1: CodeRabbit REST API   │ ← Preferred
│  - Fast, reliable                   │
│  - No CLI installation needed       │
│  - Requires CODERABBIT_API_KEY      │
└─────────────────────────────────────┘
        ↓ (if fails or not configured)
┌─────────────────────────────────────┐
│  Strategy 2: CodeRabbit CLI         │ ← Alternative
│  - Local processing                 │
│  - Requires CLI installation        │
│  - Uses git commits                 │
└─────────────────────────────────────┘
        ↓ (if fails or not installed)
┌─────────────────────────────────────┐
│  Strategy 3: OpenAI GPT-4           │ ← Fallback
│  - Always available                 │
│  - Requires OPENAI_API_KEY          │
│  - Good general analysis            │
└─────────────────────────────────────┘
        ↓
Display review results in UI
```

## Implementation Files

### Core Files

1. **`lib/coderabbit-client.ts`** - CodeRabbit REST API client
   - `CodeRabbitClient` class for API interactions
   - `convertCodeRabbitToUIFormat()` to transform API responses
   - Type definitions for requests/responses

2. **`app/api/ai-review/route.ts`** - Review API endpoint
   - Implements three-tier fallback strategy
   - Handles CodeRabbit REST API calls
   - Falls back to CLI and OpenAI
   - Returns standardized review format

3. **`components/dialogs/ai-review-dialog.tsx`** - UI component
   - Displays review results
   - Shows scores, issues, recommendations
   - Categorizes findings by severity

4. **`.env.example`** - Environment variables template
   - `CODERABBIT_API_KEY` for REST API
   - `OPENAI_API_KEY` for fallback

## API Integration Details

### CodeRabbit REST API

**Endpoint:** `https://api.coderabbit.ai/v1/reviews`

**Request:**
```typescript
{
  files: [
    {
      path: "main.tf",
      content: "...",
      language: "terraform"
    }
  ],
  options: {
    security: true,
    performance: true,
    best_practices: true,
    cost_optimization: true
  }
}
```

**Response:**
```typescript
{
  review_id: string,
  status: "completed",
  summary: {
    overall_score: 85,
    security_score: 90,
    performance_score: 80,
    maintainability_score: 85
  },
  findings: [
    {
      severity: "high" | "medium" | "low",
      category: "security" | "performance" | "cost",
      title: "Issue title",
      description: "Detailed description",
      file: "main.tf",
      line: 42,
      suggestion: "How to fix"
    }
  ],
  suggestions: [...]
}
```

## Setup Instructions

### Option 1: CodeRabbit REST API (Recommended)

1. Get API key from https://app.coderabbit.ai/settings/api-keys
2. Add to `.env.local`:
   ```env
   CODERABBIT_API_KEY=cr_xxxxxxxxxxxxx
   ```
3. Restart Next.js dev server
4. Click "Code Review" button - it should use REST API

### Option 2: CodeRabbit CLI

1. Install CLI:
   ```bash
   curl -fsSL https://cli.coderabbit.ai/install.sh | sh
   ```
2. Authenticate:
   ```bash
   coderabbit auth login
   ```
3. Click "Code Review" button - it will use CLI if REST API is not configured

### Option 3: OpenAI Fallback

1. Get OpenAI API key from https://platform.openai.com/api-keys
2. Add to `.env.local`:
   ```env
   OPENAI_API_KEY=sk-xxxxxxxxxxxxx
   ```
3. Will be used automatically if CodeRabbit is unavailable

## Testing

### Manual Testing

1. **Test REST API:**
   ```bash
   # Set CODERABBIT_API_KEY in .env.local
   npm run dev
   # Open app, design infrastructure, click "Code Review"
   # Check console for: "🤖 [Strategy 1] Trying CodeRabbit REST API..."
   ```

2. **Test CLI Fallback:**
   ```bash
   # Remove CODERABBIT_API_KEY from .env.local
   # Install and auth CLI
   npm run dev
   # Click "Code Review"
   # Check console for: "🤖 [Strategy 2] Trying CodeRabbit CLI..."
   ```

3. **Test OpenAI Fallback:**
   ```bash
   # Remove CODERABBIT_API_KEY
   # Uninstall or logout from CodeRabbit CLI
   # Set OPENAI_API_KEY in .env.local
   npm run dev
   # Click "Code Review"
   # Check console for: "🤖 [Strategy 3] Using OpenAI API..."
   ```

### Expected Console Output

**Successful REST API Review:**
```
🚀 AI Review API called
📥 Parsing request body...
✅ Request body parsed
🔍 Starting code review for 4 files
🤖 [Strategy 1] Trying CodeRabbit REST API...
✅ CodeRabbit REST API review completed
✅ Review completed using: CodeRabbit REST API
   Score: 85
   Issues: 3
```

**CLI Fallback:**
```
⚠️ CodeRabbit API key not configured, skipping REST API
🤖 [Strategy 2] Trying CodeRabbit CLI...
📁 Creating temp directory: /tmp/terraform-review-xxxxx
✅ CodeRabbit CLI found at: /usr/local/bin/coderabbit
✅ CodeRabbit CLI review completed in 2341 ms
✅ Review completed using: CodeRabbit CLI
```

**OpenAI Fallback:**
```
⚠️ CodeRabbit API key not configured, skipping REST API
🤖 [Strategy 2] Trying CodeRabbit CLI...
⚠️ CodeRabbit CLI failed: Command failed: which coderabbit
   Falling back to OpenAI...
🤖 [Strategy 3] Using OpenAI API as final fallback...
✅ OpenAI analysis complete
✅ Review completed using: OpenAI API
```

## Error Handling

The implementation includes comprehensive error handling:

1. **Invalid API Key:** Returns user-friendly error message
2. **Rate Limits:** Catches 429 errors and provides guidance
3. **Network Errors:** Falls back to next strategy automatically
4. **Missing Dependencies:** Provides installation instructions

## Data Flow

```
1. User designs infrastructure on canvas
2. User clicks "Generate Terraform" button
3. Frontend generates Terraform code (main.tf, variables.tf, outputs.tf, providers.tf)
4. "Code Review" button becomes visible (only after Terraform is generated)
5. User clicks "Code Review" button
6. Frontend sends POST to /api/ai-review with all Terraform files
7. Backend tries CodeRabbit REST API
   - If successful: Parse and format response
   - If failed: Try CLI method
8. Backend tries CodeRabbit CLI (if REST failed)
   - Create temp directory
   - Write Terraform files
   - Initialize git repo
   - Run coderabbit CLI
   - Parse plain text output
   - Clean up temp directory
   - If failed: Try OpenAI
9. Backend tries OpenAI (if both CodeRabbit methods failed)
   - Send Terraform code to GPT-4
   - Request structured analysis
   - Return formatted response
10. Backend returns standardized review object
11. Frontend displays results in AI Review Dialog
    - Overall score
    - Security score
    - Issues by severity
    - Recommendations
    - Cost optimization suggestions
```

### Button Visibility

The "Code Review" button is only visible when:
- `deploymentStage === 'generated'` (Terraform code has been generated)
- `deploymentStage === 'planned'` (After running terraform plan)
- `deploymentStage === 'applied'` (After applying infrastructure)

This ensures users can only review code that has already been generated.

## UI Features

### Review Dialog Tabs

1. **Overview**
   - Overall score (0-100)
   - Security score (0-100)
   - Estimated monthly cost
   - Summary
   - Strengths

2. **Issues**
   - Categorized by severity (high/medium/low)
   - Shows file and line number
   - Recommendation for each issue
   - Color-coded by severity

3. **Recommendations**
   - Improvement suggestions
   - Impact level (high/medium/low)
   - Categorized by type

4. **Cost & Security**
   - Cost optimization tips
   - Security findings
   - Best practices

## Future Enhancements

1. **Caching:** Cache review results to avoid re-analyzing unchanged code
2. **Incremental Review:** Only review changed files
3. **GitHub Integration:** Create PRs with review comments
4. **Custom Rules:** Allow users to define custom review rules
5. **Historical Trends:** Track score improvements over time
6. **Export Reports:** Generate PDF/HTML review reports

## Troubleshooting

### "CodeRabbit API key not configured"
- Check `.env.local` has `CODERABBIT_API_KEY`
- Verify API key is valid (not the example value)
- Restart Next.js dev server

### "CodeRabbit CLI not found"
- Install CLI: `curl -fsSL https://cli.coderabbit.ai/install.sh | sh`
- Check installation: `which coderabbit`
- Login: `coderabbit auth login`

### "All review methods failed"
- Check internet connection
- Verify at least one API key is configured
- Check API key validity
- Review server logs for specific errors

## References

- CodeRabbit API Docs: https://docs.coderabbit.ai/api/
- CodeRabbit CLI Docs: https://docs.coderabbit.ai/cli/overview
- OpenAI API Docs: https://platform.openai.com/docs
