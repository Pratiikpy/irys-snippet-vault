# 🚀 Irys Snippet Vault - Replit Deployment Guide

Welcome to the **Irys Snippet Vault** - a decentralized application that allows users to store and share content on the blockchain with AI-powered analysis and social features!

## 🎯 One-Click Deployment

This app is configured for **zero-configuration deployment** on Replit. Just follow these simple steps:

### Step 1: Fork the Project
1. Click the "Fork" button in Replit
2. The project will be copied to your account

### Step 2: Add Required Secrets
Click on the **🔒 Secrets** tab in your Repl and add these environment variables:

```env
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/
DB_NAME=irys_snippet_vault
CLAUDE_API_KEY=sk-ant-api03-...
IRYS_PRIVATE_KEY=0x...
```

#### Where to Get These Values:

**MONGO_URL** (Database):
- Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier available)
- Create a new cluster
- Click "Connect" → "Connect your application"
- Copy the connection string and replace `<password>` with your actual password

**CLAUDE_API_KEY** (AI Analysis):
- Go to [Anthropic Console](https://console.anthropic.com/)
- Create an API key
- Copy the key (starts with `sk-ant-api03-...`)

**IRYS_PRIVATE_KEY** (Blockchain):
- Use MetaMask or any Ethereum wallet
- Export your private key (64 characters starting with `0x`)
- ⚠️ **Use a test wallet with minimal funds for safety**

**DB_NAME** (Database Name):
- Use: `irys_snippet_vault` (or any name you prefer)

### Step 3: Run the Application
1. Click the **▶️ Run** button
2. Wait for the servers to start (takes 1-2 minutes)
3. Your app will be available at: `https://[your-repl-name].[your-username].repl.co`

## 🎉 Features

Your deployed app includes:

### 🔗 **Blockchain Integration**
- **Permanent Storage**: Content stored on Irys blockchain
- **Real Transactions**: Actual blockchain operations
- **Decentralized**: No single point of failure

### 🤖 **AI-Powered Analysis**
- **Smart Summarization**: AI analyzes and summarizes content
- **Mood Detection**: Detects emotional tone of text
- **Theme Extraction**: Identifies key themes and topics
- **Image Analysis**: Describes and analyzes uploaded images

### 📱 **Multi-Content Types**
- **Web Snippets**: Save and analyze web pages
- **Text & Poetry**: Store creative writing with AI analysis
- **Images**: Upload images with AI-generated descriptions
- **Rich Metadata**: Comprehensive tagging and organization

### 👥 **Social Features**
- **User Profiles**: Customizable profiles with avatars
- **Public Feed**: Discover content from other users
- **Social Interactions**: Like, comment, and share content
- **Follow System**: Follow users and build connections
- **User Discovery**: Find and connect with other creators

## 🛠️ Technical Architecture

### Backend (FastAPI)
- **API Endpoints**: RESTful API for all operations
- **Database**: MongoDB for metadata storage
- **Blockchain**: Irys network integration
- **AI**: Claude API for content analysis
- **Authentication**: Wallet-based authentication

### Frontend (React)
- **Modern UI**: Dark theme with Tailwind CSS
- **Responsive Design**: Works on all devices
- **Real-time Updates**: Live social interactions
- **Wallet Integration**: MetaMask and other wallets
- **Image Upload**: Drag-and-drop image handling

### Deployment
- **Zero-Config**: Automatic setup and configuration
- **Environment Detection**: Adapts to Replit environment
- **Graceful Fallbacks**: Handles missing configurations
- **Health Checks**: Monitors server status

## 🔧 Development

### Local Development
```bash
# Install dependencies
npm run install

# Start both servers
npm start

# Backend only
npm run backend

# Frontend only
npm run frontend
```

### Project Structure
```
irys-snippet-vault/
├── main.py                 # Replit entry point
├── backend/                # FastAPI backend
│   ├── server.py          # Main API server
│   ├── irys_service.js    # Blockchain integration
│   └── requirements.txt   # Python dependencies
├── frontend/              # React frontend
│   ├── src/               # React components
│   ├── public/            # Static assets
│   └── package.json       # Node.js dependencies
├── .replit               # Replit configuration
├── replit.nix            # System dependencies
└── requirements.txt      # Root Python dependencies
```

## 🚨 Important Notes

### Security
- **Never commit private keys** to version control
- **Use test wallets** for development
- **Limit funds** in development wallets
- **Rotate keys** regularly

### Environment Variables
- All secrets are stored in **Replit Secrets**
- The app gracefully handles missing variables
- Default values are provided for development

### Costs
- **MongoDB Atlas**: Free tier (500MB storage)
- **Anthropic Claude**: Pay-per-use API
- **Irys Blockchain**: Minimal costs for storage
- **Replit**: Free tier with limitations

## 🐛 Troubleshooting

### Common Issues

**"Environment variables missing"**
- Check that all required secrets are added in Replit
- Restart your Repl after adding secrets

**"Backend server not starting"**
- Check the console for error messages
- Ensure MongoDB connection string is correct
- Verify Python dependencies are installed

**"Frontend can't connect to backend"**
- The app automatically configures URLs for Replit
- Check that both servers are running
- Verify CORS settings

**"Blockchain operations failing"**
- Check IRYS_PRIVATE_KEY is valid
- Ensure you have test tokens in your wallet
- Verify network connectivity

### Getting Help

1. **Check Console**: Look for error messages in the console
2. **Restart Repl**: Try restarting your Repl
3. **Check Secrets**: Verify all environment variables are set
4. **Test Endpoints**: Try `/api/health` to test the backend

## 📚 API Documentation

Once running, visit: `https://[your-repl-name].[your-username].repl.co/docs`

## 🎨 Customization

### Themes
- Modify `frontend/src/App.css` for styling
- Update Tailwind config in `frontend/tailwind.config.js`

### Features
- Add new content types in `backend/server.py`
- Extend social features in the frontend
- Integrate additional AI models

## 🚀 Deployment to Other Platforms

This app is configured for Replit but can be deployed to:
- **Vercel**: Frontend + serverless functions
- **Railway**: Full-stack deployment
- **Heroku**: Container-based deployment
- **AWS/Google Cloud**: Traditional cloud deployment

## 📄 License

MIT License - feel free to use and modify!

## 🌟 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

**Happy coding! 🎉**

Build amazing decentralized applications with the power of blockchain and AI!