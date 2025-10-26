# Cloudist Dockerfile with Terraform CLI
# This builds a production image with Next.js + Terraform

# Stage 1: Build the Next.js app
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install dependencies (prefer pnpm if available)
RUN npm install -g pnpm && pnpm install --frozen-lockfile || npm ci

# Copy source code
COPY . .

# Build Next.js app
RUN npm run build

# Stage 2: Production image with Terraform CLI
FROM node:20-alpine AS runner

WORKDIR /app

# Install Terraform CLI
RUN apk add --no-cache \
    wget \
    unzip \
    && wget https://releases.hashicorp.com/terraform/1.9.5/terraform_1.9.5_linux_amd64.zip \
    && unzip terraform_1.9.5_linux_amd64.zip \
    && mv terraform /usr/local/bin/ \
    && rm terraform_1.9.5_linux_amd64.zip \
    && terraform version

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built app from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/package.json ./

# Create directory for Terraform workspaces
RUN mkdir -p /app/terraform-workspaces && chmod 777 /app/terraform-workspaces

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]

