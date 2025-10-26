# Cloudist ☁️

> AI-powered visual infrastructure designer with intelligent code review

Cloudist is a next-generation infrastructure design tool that combines visual drag-and-drop canvas with AI-powered assistance and professional code review. Built for Cal Hacks 2025.

## ✨ Features

- 🤖 **AI Infrastructure Assistant (Rex)** - Powered by Claude 3.5 Sonnet
- 🐰 **CodeRabbit Integration** - Professional Terraform code review via REST API, CLI, or OpenAI fallback
- 🎨 **Visual Canvas** - Drag-and-drop infrastructure designer
- 🌐 **Multi-Cloud Support** - AWS, Azure, GCP services
- 📦 **Third-Party Integrations** - Supabase, Stripe, and more
- 🚀 **Export Terraform** - Production-ready infrastructure code

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
```

Edit `.env.local` and add your API keys:

```env
# Required for AI code review (choose one or more):
CODERABBIT_API_KEY=your_coderabbit_api_key_here  # Recommended - Get from https://app.coderabbit.ai/settings/api-keys
OPENAI_API_KEY=your_openai_api_key_here          # Fallback option

# Optional - for CodeRabbit CLI method:
# Install CLI: curl -fsSL https://cli.coderabbit.ai/install.sh | sh
# Then login: coderabbit auth login
```

```bash
# 3. Run development server
npm run dev
```

### Code Review Integration

Cloudist uses a **three-tier fallback strategy** for code review:

1. **CodeRabbit REST API** (Recommended) - Fast, reliable, no CLI needed
   - Get API key from https://app.coderabbit.ai/settings/api-keys
   - Add to `.env.local` as `CODERABBIT_API_KEY`

2. **CodeRabbit CLI** (Alternative) - Local review using CLI
   - Install: `curl -fsSL https://cli.coderabbit.ai/install.sh | sh`
   - Login: `coderabbit auth login`

3. **OpenAI GPT-4** (Fallback) - If CodeRabbit is unavailable
   - Add `OPENAI_API_KEY` to `.env.local`

The system automatically tries each method in order until one succeeds.

## 🏆 Technologies

- **AI**: Claude 3.5 Sonnet (Anthropic), OpenAI GPT-4
- **Code Review**: CodeRabbit REST API / CLI
- **Frontend**: Next.js 14, React, TailwindCSS, shadcn/ui
- **Infrastructure**: React Flow, Terraform

## 📄 License

MIT

---

Built for Cal Hacks 2025 🐻