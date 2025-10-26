# Cloudist ☁️

> AI-powered visual infrastructure designer with intelligent code review

Cloudist is a next-generation infrastructure design tool that combines visual drag-and-drop canvas with AI-powered assistance and professional code review. Built for Cal Hacks 2025.

## ✨ Features

- 🤖 **AI Infrastructure Assistant (Rex)** - Powered by Claude 3.5 Sonnet
- 🐰 **CodeRabbit Integration** - Professional Terraform code review via CLI
- 🎨 **Visual Canvas** - Drag-and-drop infrastructure designer
- 🌐 **Multi-Cloud Support** - AWS, Azure, GCP services
- 📦 **Third-Party Integrations** - Supabase, Stripe, and more
- 🚀 **Export Terraform** - Production-ready infrastructure code

## 🚀 Quick Start

See [SETUP.md](./SETUP.md) for detailed setup instructions.

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Install CodeRabbit CLI
curl -fsSL https://cli.coderabbit.ai/install.sh | sh
coderabbit auth login

# Run development server
npm run dev
```

## 🏆 Technologies

- **AI**: Claude 3.5 Sonnet (Anthropic)
- **Code Review**: CodeRabbit CLI
- **Frontend**: Next.js 14, React, TailwindCSS
- **Infrastructure**: React Flow, Terraform

## 📄 License

MIT

---

Built for Cal Hacks 2025 🐻