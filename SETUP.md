# Cloudist Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

### 3. Configure Required Services

#### Claude API (Required for AI Agent)

Cloudist uses **Claude 3.5 Sonnet** for the AI infrastructure assistant (Rex).

1. Get your API key from [Anthropic Console](https://console.anthropic.com/)
2. Add to `.env.local`:
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   ```

#### CodeRabbit CLI (Required for Code Review)

CodeRabbit provides AI-powered code reviews for your Terraform configurations.

1. Install the CLI:
   ```bash
   curl -fsSL https://cli.coderabbit.ai/install.sh | sh
   ```

2. Restart your shell:
   ```bash
   source ~/.zshrc  # or ~/.bashrc
   ```

3. Authenticate:
   ```bash
   coderabbit auth login
   ```

4. Verify installation:
   ```bash
   coderabbit --version
   ```

**Note**: CodeRabbit CLI must be installed on your system. The application calls it as a subprocess.

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see Cloudist in action!

---

## 🛠️ Technologies Used

- **AI Agent**: Claude 3.5 Sonnet (Anthropic) - Powers the "Rex" infrastructure assistant
- **Code Review**: CodeRabbit CLI - Provides professional-grade Terraform code analysis
- **Frontend**: Next.js 14, React, TailwindCSS
- **Infrastructure Visualization**: React Flow
- **Cloud Providers**: AWS, Azure, GCP support

---

## 📝 Optional Configurations

### Cloud Provider Credentials

For actual infrastructure deployment (optional):

#### AWS
```env
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
```

#### Azure
```env
AZURE_SUBSCRIPTION_ID=your_id
AZURE_CLIENT_ID=your_client_id
AZURE_CLIENT_SECRET=your_secret
AZURE_TENANT_ID=your_tenant_id
```

#### GCP
```env
GCP_PROJECT_ID=your_project
GCP_SERVICE_ACCOUNT_KEY=your_json_key
```

### Third-Party Integrations

#### Supabase
```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

#### Stripe
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_key
STRIPE_SECRET_KEY=your_secret
```

---

## 🏆 Cal Hacks 2025 Integration

This project integrates:

- **🧊 Claude (Anthropic)**: AI infrastructure assistant with function calling
- **👓 CodeRabbit**: CLI-based code review for Terraform configurations
- **🚀 Y Combinator**: B2B developer tool with clear product-market fit

### Features Showcased

1. **AI-Powered Infrastructure Design**: Chat with Rex to create cloud infrastructure
2. **CodeRabbit Code Review**: Click "Code Review 🐰" to analyze Terraform with CodeRabbit CLI
3. **Visual Canvas**: Drag-and-drop infrastructure designer
4. **Multi-Cloud Support**: AWS, Azure, GCP service integration

---

## 🐛 Troubleshooting

### CodeRabbit CLI Not Found

If you see "CodeRabbit CLI not installed":

1. Verify installation: `which coderabbit`
2. If not found, reinstall: `curl -fsSL https://cli.coderabbit.ai/install.sh | sh`
3. Restart your terminal
4. Authenticate: `coderabbit auth login`

### Claude API Errors

If Rex isn't responding:

1. Check your `ANTHROPIC_API_KEY` in `.env.local`
2. Verify API key at [Anthropic Console](https://console.anthropic.com/)
3. Check console logs for specific error messages

### Development Server Issues

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Run development server
npm run dev
```

---

## 📚 Documentation

- [Claude API Documentation](https://docs.anthropic.com/)
- [CodeRabbit CLI Documentation](https://docs.coderabbit.ai/cli/overview)
- [Next.js Documentation](https://nextjs.org/docs)

---

## 🎯 Demo Tips

1. **Show AI Agent**: Ask Rex to "create a web application infrastructure"
2. **Show Code Review**: Click "Code Review 🐰" button to analyze with CodeRabbit
3. **Show Multi-Provider**: Add Supabase Auth or Stripe Payment components
4. **Export Terraform**: Generate production-ready infrastructure code

---

Built with ❤️ for Cal Hacks 2025 🐻

