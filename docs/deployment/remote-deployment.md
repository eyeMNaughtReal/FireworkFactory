# Remote Deployment and Error Monitoring Setup Guide - v0.1.2

This guide will help you set up remote deployment capabilities and error monitoring for the Firework Factory application.

## 🆕 What's New in v0.1.2
- Enhanced error monitoring for new inventory history features
- Improved deployment scripts with better error handling
- Updated CI/CD pipeline to handle new audit logging features

## 🚨 Error Monitoring Setup

### 1. Environment Variables Configuration

1. Copy the environment template:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` with your actual values:
   - **Discord Webhook**: For error notifications
   - **GitHub Token**: For automatic issue creation
   - **GitHub Repo**: Your repository name

### 2. Discord Webhook Setup

1. Go to your Discord server
2. Server Settings → Integrations → Webhooks
3. Create a new webhook named "Firework Factory Errors"
4. Choose the channel for error notifications
5. Copy the webhook URL and add it to `.env.local`

### 3. GitHub Token Setup

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select `repo` scope for private repos or `public_repo` for public repos
4. Copy the token and add it to `.env.local`

## 🚀 Remote Deployment Options

### Option 1: GitHub Actions with Self-Hosted Runner

#### Prerequisites
- A server/VPS with Node.js and npm installed
- SSH access to your server
- GitHub repository

#### Setup Steps

1. **Set up Self-Hosted Runner on your server:**
   ```bash
   # On your server
   mkdir actions-runner && cd actions-runner
   curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
   tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz
   ./config.sh --url https://github.com/YOUR_USERNAME/YOUR_REPO --token YOUR_RUNNER_TOKEN
   ./run.sh
   ```

2. **Create GitHub Actions workflow** (`.github/workflows/deploy.yml`):
   ```yaml
   name: Deploy to Production
   
   on:
     push:
       branches: [ main ]
     workflow_dispatch:
   
   jobs:
     deploy:
       runs-on: self-hosted
       steps:
         - uses: actions/checkout@v3
         
         - name: Setup Node.js
           uses: actions/setup-node@v3
           with:
             node-version: '18'
             cache: 'npm'
             cache-dependency-path: firework-factory/package-lock.json
         
         - name: Install dependencies
           run: |
             cd firework-factory
             npm ci
         
         - name: Build application
           run: |
             cd firework-factory
             npm run build
         
         - name: Deploy to production
           run: |
             # Copy built files to your web server directory
             sudo cp -r firework-factory/dist/* /var/www/html/
             # Restart web server if needed
             sudo systemctl reload nginx
   ```

3. **Add secrets to GitHub repository:**
   - Go to your repo → Settings → Secrets and variables → Actions
   - Add your environment variables as secrets

### Option 2: Discord Bot for Remote Commands

#### Create a Discord Bot

1. Go to Discord Developer Portal
2. Create a new application
3. Go to Bot section and create a bot
4. Copy the bot token
5. Invite bot to your server with appropriate permissions

#### Bot Commands Setup

Create a simple bot script that can trigger deployments:

```javascript
// discord-bot.js
const { Client, GatewayIntentBits } = require('discord.js');
const { exec } = require('child_process');

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  
  // Only allow specific users/roles
  if (!message.member.permissions.has('ADMINISTRATOR')) return;
  
  if (message.content === '!deploy') {
    message.reply('🚀 Starting deployment...');
    
    exec('cd /path/to/your/app && git pull && npm install && npm run build', (error, stdout, stderr) => {
      if (error) {
        message.reply(`❌ Deployment failed: ${error.message}`);
        return;
      }
      message.reply('✅ Deployment successful!');
    });
  }
  
  if (message.content === '!status') {
    // Check app status
    message.reply('📊 App is running normally');
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
```

## 🔧 Testing Error Monitoring

Once set up, you can test error monitoring by:

1. **Triggering a test error:**
   ```javascript
   // Add this to any view temporarily
   methods: {
     testError() {
       throw new Error('Test error for monitoring');
     }
   }
   ```

2. **Check Discord channel** for error notification
3. **Check GitHub repository** for created issue

## 📊 Monitoring Dashboard

The error monitoring service provides:

- **Discord notifications** with error details, stack traces, and context
- **GitHub issues** automatically created for critical errors
- **Local storage** of errors for offline analysis
- **Error categorization** (Vue errors, Promise rejections, JavaScript errors)

## 🛠️ Available Remote Commands

### GitHub Actions Triggers
- **Push to main branch**: Automatic deployment
- **Manual dispatch**: Trigger deployment from GitHub Actions tab

### Discord Bot Commands (if implemented)
- `!deploy`: Trigger deployment
- `!status`: Check application status
- `!logs`: View recent logs
- `!rollback`: Rollback to previous version

## 🔒 Security Considerations

1. **Environment Variables**: Never commit `.env.local` to git
2. **Access Control**: Limit who can trigger deployments
3. **Webhook Security**: Use Discord webhook securely
4. **Server Security**: Keep your deployment server updated
5. **Token Management**: Rotate GitHub tokens regularly

## 📝 Next Steps

1. Configure your `.env.local` file
2. Set up Discord webhook and GitHub token
3. Choose and implement a deployment strategy
4. Test error monitoring
5. Document your specific deployment workflow

For additional help, refer to:
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Discord.js Documentation](https://discord.js.org/)
- [Vue.js Deployment Guide](https://vuejs.org/guide/best-practices/production-deployment.html)
