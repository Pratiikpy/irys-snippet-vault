# Vercel Deployment Instructions

## Setting up Environment Variables in Vercel

1. **Go to your Vercel dashboard**
2. **Navigate to your project settings**
3. **Click on "Environment Variables"**
4. **Add the following variables:**

### Required Environment Variables:

```
CLAUDE_API_KEY=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
IRYS_PRIVATE_KEY=0x725bbe9ad10ef6b48397d37501ff0c908119fdc0513a85a046884fc9157c80f5
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/database
DB_NAME=irys_snippet_vault
```

### Important Notes:

1. **MONGO_URL**: You'll need to use MongoDB Atlas (cloud) instead of localhost for production
2. **CLAUDE_API_KEY**: Your Claude AI API key for content processing
3. **IRYS_PRIVATE_KEY**: Your Ethereum private key for Irys blockchain transactions
4. **DB_NAME**: Your MongoDB database name

## Vercel Deployment Steps:

### Option 1: Deploy via GitHub (Recommended)
1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Option 2: Deploy via Vercel CLI
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in your project directory
3. Follow the prompts
4. Add environment variables in dashboard

## MongoDB Atlas Setup:
1. Go to https://cloud.mongodb.com/
2. Create a free cluster
3. Create a database user
4. Get connection string
5. Add to MONGO_URL environment variable

## File Structure for Vercel:
```
/
├── vercel.json (configuration)
├── frontend/ (React app)
│   ├── package.json
│   ├── src/
│   └── public/
└── backend/ (Python API)
    ├── server.py
    └── requirements.txt
```

## Testing the Deployment:
1. Test all API endpoints
2. Test image upload functionality
3. Test Irys blockchain integration
4. Test Claude AI integration