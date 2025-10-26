# Cloudist Deployment Guide

Cloudist requires **Terraform CLI** on the server to provision cloud infrastructure. This guide covers deployment options that support running Terraform.

---

## 🚀 **Recommended: Railway (Easiest)**

Railway supports Docker and persistent storage - perfect for Terraform.

### Steps:

1. **Push code to GitHub:**
   ```bash
   git add .
   git commit -m "feat: production deployment with Terraform"
   git push origin main
   ```

2. **Deploy to Railway:**
   - Go to [railway.app](https://railway.app)
   - Sign in with GitHub
   - Click **"New Project"** → **"Deploy from GitHub repo"**
   - Select your `Cloudist` repository
   - Railway will auto-detect the Dockerfile

3. **Add Environment Variables:**
   - In Railway dashboard → Variables
   - Add:
     - `ASI1_API_KEY` = your Fetch.ai API key
     - `NODE_ENV` = `production`

4. **Add Persistent Volume (for Terraform state):**
   - Settings → Volumes
   - Mount path: `/app/terraform-workspaces`

5. **Deploy!** Railway will build and deploy automatically.

**Cost:** ~$5/month

---

## 🐳 **Option 2: Fly.io**

Fly.io is excellent for Docker-based apps.

### Steps:

1. **Install Fly CLI:**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login and initialize:**
   ```bash
   fly auth login
   fly launch
   ```

3. **Set secrets:**
   ```bash
   fly secrets set ASI1_API_KEY=your_fetch_ai_key
   ```

4. **Create persistent volume:**
   ```bash
   fly volumes create terraform_data --size 1
   ```

5. **Deploy:**
   ```bash
   fly deploy
   ```

**Cost:** Free tier available, then ~$3/month

---

## 🖥️ **Option 3: DigitalOcean Droplet (Traditional VPS)**

Full control with a traditional server.

### Steps:

1. **Create Droplet:**
   - Go to [DigitalOcean](https://digitalocean.com)
   - Create Droplet (Ubuntu 22.04)
   - Size: $6/month (1GB RAM minimum)

2. **SSH into server:**
   ```bash
   ssh root@your_droplet_ip
   ```

3. **Install Node.js, Terraform, and Docker:**
   ```bash
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
   apt-get install -y nodejs
   
   # Install Terraform
   wget https://releases.hashicorp.com/terraform/1.9.5/terraform_1.9.5_linux_amd64.zip
   unzip terraform_1.9.5_linux_amd64.zip
   mv terraform /usr/local/bin/
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   ```

4. **Clone and setup:**
   ```bash
   git clone https://github.com/your-username/Cloudist.git
   cd Cloudist
   npm install
   npm run build
   ```

5. **Create .env.local:**
   ```bash
   nano .env.local
   # Add: ASI1_API_KEY=your_key
   ```

6. **Run with PM2 (process manager):**
   ```bash
   npm install -g pm2
   pm2 start npm --name "cloudist" -- start
   pm2 save
   pm2 startup
   ```

7. **Setup Nginx reverse proxy:**
   ```bash
   apt install nginx
   # Configure nginx to proxy port 3000
   ```

**Cost:** $6/month

---

## 🐋 **Option 4: Docker Compose (Any Server)**

Deploy anywhere with Docker Compose.

### Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  cloudist:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - ASI1_API_KEY=${ASI1_API_KEY}
    volumes:
      - ./terraform-workspaces:/app/terraform-workspaces
    restart: unless-stopped
```

### Deploy:
```bash
docker-compose up -d
```

---

## ⚠️ **Important Notes:**

1. **Terraform State Storage:**
   - Current setup stores state locally in `terraform-workspaces/`
   - For production, consider using [Terraform Cloud](https://cloud.hashicorp.com/products/terraform) for remote state

2. **Security:**
   - Never commit `.env.local` (it's in `.gitignore`)
   - Use environment variables for all secrets
   - Consider adding authentication to your app

3. **AWS Credentials:**
   - Users will provide their own AWS credentials via the Settings UI
   - These are stored in browser localStorage (client-side only)
   - Server-side credentials are passed per-request

4. **Persistent Storage:**
   - Ensure `/app/terraform-workspaces` is persistent (volume mount)
   - This is where Terraform state and config files are stored

---

## 🎯 **My Recommendation:**

**Start with Railway** - it's the easiest and handles everything automatically:
- ✅ Docker support out of the box
- ✅ Persistent volumes
- ✅ Automatic HTTPS/SSL
- ✅ GitHub integration
- ✅ Easy environment variables
- ✅ Great for demos/hackathons

**Scale to VPS later** if you need more control or lower costs.

---

## 📞 **Need Help?**

- Railway Docs: https://docs.railway.app
- Fly.io Docs: https://fly.io/docs
- DigitalOcean Tutorials: https://www.digitalocean.com/community/tutorials

