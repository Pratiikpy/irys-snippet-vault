import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Glass Card Component
const GlassCard = ({ children, className = "", ...props }) => (
  <div className={`glass-card ${className}`} {...props}>
    {children}
  </div>
);

// Neon Button Component
const NeonButton = ({ children, onClick, disabled = false, variant = "primary", className = "", ...props }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`neon-button ${variant} ${className} ${disabled ? 'disabled' : ''}`}
    {...props}
  >
    {children}
  </button>
);

// Loading Spinner Component
const LoadingSpinner = ({ size = "md" }) => (
  <div className={`loading-spinner ${size}`}>
    <div className="spinner"></div>
  </div>
);

// Real Irys Integration Helper
const createIrysUploader = async (signer) => {
  try {
    // For simplicity, we'll use the backend to handle Irys uploads
    // since browser Irys SDK has complex polyfill requirements
    const address = await signer.getAddress();
    return {
      address,
      signer,
      upload: async (data, options = {}) => {
        // Create a message for the user to sign
        const message = `Upload to Irys blockchain:\nData: ${data.substring(0, 100)}${data.length > 100 ? '...' : ''}\nTimestamp: ${Date.now()}`;
        const signature = await signer.signMessage(message);
        
        // Send to backend for real Irys upload
        const response = await fetch(`${API}/irys-upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data,
            signature,
            address,
            tags: options.tags || []
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to upload to Irys');
        }
        
        return await response.json();
      }
    };
  } catch (error) {
    console.error('Error creating Irys uploader:', error);
    throw error;
  }
};

// Wallet Connection Component
const WalletConnection = ({ onWalletConnected, connectedWallet, balance }) => {
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask to use this application!");
      return;
    }

    try {
      setIsConnecting(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const walletAddress = await signer.getAddress();
      
      onWalletConnected(signer, walletAddress);
    } catch (error) {
      console.error("Wallet connection failed:", error);
      alert("Failed to connect wallet. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="wallet-connection">
      {connectedWallet ? (
        <div className="connected-wallet">
          <div className="wallet-indicator"></div>
          <div className="wallet-info">
            <span className="wallet-address">
              {connectedWallet.slice(0, 6)}...{connectedWallet.slice(-4)}
            </span>
            {balance && (
              <span className="wallet-balance">
                Balance: {balance} ETH
              </span>
            )}
          </div>
        </div>
      ) : (
        <NeonButton onClick={connectWallet} disabled={isConnecting}>
          {isConnecting ? <LoadingSpinner size="sm" /> : "Connect Wallet"}
        </NeonButton>
      )}
    </div>
  );
};

// Snippet Form Component - Now with REAL Irys blockchain storage
const SnippetForm = ({ signer, userAddress, onSnippetSaved }) => {
  const [url, setUrl] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const [summarizedData, setSummarizedData] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [irysUploader, setIrysUploader] = useState(null);

  useEffect(() => {
    if (signer) {
      createIrysUploader(signer).then(setIrysUploader).catch(console.error);
    }
  }, [signer]);

  const extractSnippet = async () => {
    if (!url.trim()) return;
    
    try {
      setIsExtracting(true);
      const response = await fetch(`${API}/extract-snippet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to extract snippet');
      }
      
      const data = await response.json();
      setExtractedData(data);
      
      // Auto-summarize after extraction
      summarizeSnippet(data);
    } catch (error) {
      console.error('Error extracting snippet:', error);
      alert(`Error extracting snippet: ${error.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const summarizeSnippet = async (data = extractedData) => {
    if (!data) return;
    
    try {
      setIsSummarizing(true);
      const response = await fetch(`${API}/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snippet: data.snippet,
          url: data.url,
          title: data.title
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to summarize snippet');
      }
      
      const summaryData = await response.json();
      setSummarizedData(summaryData);
    } catch (error) {
      console.error('Error summarizing snippet:', error);
      alert(`Error summarizing snippet: ${error.message}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  const saveToIrysBlockchain = async () => {
    if (!extractedData || !summarizedData || !irysUploader || !userAddress) return;
    
    try {
      setIsSaving(true);
      
      // Prepare snippet data for REAL Irys blockchain storage
      const blockchainData = {
        applicationId: "IrysSnippetVault",
        user: userAddress,
        url: extractedData.url,
        title: extractedData.title,
        snippet: extractedData.snippet,
        summary: summarizedData.summary,
        tags: summarizedData.tags,
        timestamp: Date.now(),
        network: "irys-testnet"
      };
      
      // Upload to REAL Irys blockchain via our backend
      const receipt = await irysUploader.upload(JSON.stringify(blockchainData), {
        tags: [
          { name: "application-id", value: "IrysSnippetVault" },
          { name: "user", value: userAddress },
          { name: "url", value: extractedData.url },
          { name: "title", value: extractedData.title },
          { name: "Content-Type", value: "application/json" },
          ...summarizedData.tags.map(tag => ({ name: "tag", value: tag }))
        ]
      });
      
      // Show success with REAL Irys gateway link
      const gatewayUrl = `https://gateway.irys.xyz/${receipt.id}`;
      alert(`🎉 SUCCESS! Snippet saved to Irys blockchain!\n\nTransaction ID: ${receipt.id}\n\nView permanently stored data:\n${gatewayUrl}\n\nThis is now stored FOREVER on the blockchain!`);
      
      // Reset form
      setUrl('');
      setExtractedData(null);
      setSummarizedData(null);
      
      // Trigger refresh of snippets list
      if (onSnippetSaved) onSnippetSaved();
      
    } catch (error) {
      console.error('Error saving to Irys blockchain:', error);
      alert(`Error saving to blockchain: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <GlassCard className="snippet-form">
      <h2 className="form-title">🔗 Save Web Snippets to Irys Blockchain</h2>
      
      <div className="form-group">
        <label htmlFor="url">Website URL</label>
        <input
          id="url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/article"
          className="url-input"
        />
        <NeonButton 
          onClick={extractSnippet} 
          disabled={!url.trim() || isExtracting}
          className="extract-button"
        >
          {isExtracting ? <LoadingSpinner size="sm" /> : "Extract Snippet"}
        </NeonButton>
      </div>

      {extractedData && (
        <div className="extracted-content">
          <h3>📄 Extracted Content</h3>
          <div className="content-preview">
            <h4>{extractedData.title}</h4>
            <p className="snippet-text">{extractedData.snippet}</p>
          </div>
        </div>
      )}

      {isSummarizing && (
        <div className="summarizing">
          <LoadingSpinner size="md" />
          <p>AI is analyzing your snippet...</p>
        </div>
      )}

      {summarizedData && (
        <div className="summarized-content">
          <h3>🤖 AI Analysis Complete</h3>
          <div className="summary-section">
            <h4>Summary</h4>
            <p>{summarizedData.summary}</p>
          </div>
          <div className="tags-section">
            <h4>Tags</h4>
            <div className="tags-container">
              {summarizedData.tags.map((tag, index) => (
                <span key={index} className="tag">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {extractedData && summarizedData && (
        <div className="save-section">
          <div className="blockchain-info">
            <h3>⛓️ Ready for Irys Blockchain Storage</h3>
            <div className="network-info">
              <p className="info-text">
                <strong>Network:</strong> Irys Devnet (Free Testing)<br/>
                <strong>Storage:</strong> Permanent & Immutable<br/>
                <strong>Gateway:</strong> devnet.irys.xyz<br/>
                <strong>Cost:</strong> <span className="free-badge">FREE</span> on testnet
              </p>
            </div>
          </div>
          
          <div className="network-selector">
            <label>Choose Irys Network:</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  value="devnet"
                  checked={network === 'devnet'}
                  onChange={(e) => setNetwork(e.target.value)}
                />
                <div className="network-option">
                  <strong>Devnet</strong> (devnet.irys.xyz)
                  <br/>
                  <small>Free • Testing • Same permanence</small>
                </div>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  value="mainnet"
                  checked={network === 'mainnet'}
                  onChange={(e) => setNetwork(e.target.value)}
                />
                <div className="network-option">
                  <strong>Mainnet</strong> (gateway.irys.xyz)
                  <br/>
                  <small>Paid • Production • Real ETH cost</small>
                </div>
              </label>
            </div>
          </div>
          
          <NeonButton 
            onClick={saveToIrysBlockchain} 
            disabled={isSaving || !irysUploader}
            className="save-button"
          >
            {isSaving ? <LoadingSpinner size="sm" /> : `💾 Save to Irys ${network === 'devnet' ? 'Devnet' : 'Mainnet'} (${network === 'devnet' ? 'FREE' : 'Paid'})`}
          </NeonButton>
          
          <div className="blockchain-details">
            <h4>📋 What happens when you save:</h4>
            <ul className="save-details-list">
              <li>🔐 <strong>Sign message:</strong> MetaMask will ask for signature</li>
              <li>⛓️ <strong>Blockchain upload:</strong> Data stored permanently on Irys</li>
              <li>🌐 <strong>Gateway access:</strong> Viewable at {network === 'devnet' ? 'devnet.irys.xyz' : 'gateway.irys.xyz'}</li>
              <li>💰 <strong>Cost:</strong> {network === 'devnet' ? 'FREE (testnet)' : 'Small ETH fee (mainnet)'}</li>
              <li>🔒 <strong>Permanent:</strong> Cannot be deleted or modified once saved</li>
            </ul>
          </div>
          
          {network === 'devnet' && (
            <div className="devnet-info">
              <p className="success-text">
                ✅ <strong>Devnet is FREE!</strong> Perfect for testing. Your data will still be permanently stored and accessible forever.
              </p>
            </div>
          )}
          
          {network === 'mainnet' && (
            <div className="warning-section">
              <p className="warning-text">
                ⚠️ <strong>MAINNET COSTS REAL ETH:</strong> Small fee required for permanent storage
              </p>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
};

// Snippet List Component - Now fetches from REAL Irys blockchain
const SnippetList = ({ userAddress, refreshTrigger }) => {
  const [snippets, setSnippets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSnippets = async () => {
    if (!userAddress) return;
    
    try {
      setIsLoading(true);
      // Fetch from backend which queries real Irys blockchain
      const response = await fetch(`${API}/irys-query/${userAddress}`);
      const data = await response.json();
      setSnippets(data.snippets || []);
    } catch (error) {
      console.error('Error fetching snippets from blockchain:', error);
      setSnippets([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSnippets();
  }, [userAddress, refreshTrigger]);

  const openUrl = (url) => {
    window.open(url, '_blank');
  };

  const openIrysGateway = (irysId) => {
    window.open(`https://gateway.irys.xyz/${irysId}`, '_blank');
  };

  if (isLoading) {
    return (
      <GlassCard className="snippet-list">
        <div className="loading-container">
          <LoadingSpinner size="lg" />
          <p>Loading your snippets from Irys blockchain...</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="snippet-list">
      <h2 className="list-title">🔗 Your Blockchain Snippet Vault</h2>
      
      {snippets.length === 0 ? (
        <div className="empty-state">
          <p>No snippets found on the blockchain yet.</p>
          <p className="small-text">Save your first snippet to start building your permanent collection!</p>
        </div>
      ) : (
        <div className="snippets-grid">
          {snippets.map((snippet) => (
            <div key={snippet.id} className="snippet-card">
              <div className="snippet-header">
                <h3>{snippet.title}</h3>
                <span className="network-badge">Irys</span>
              </div>
              <p className="snippet-summary">{snippet.summary}</p>
              <div className="snippet-tags">
                {snippet.tags && snippet.tags.map((tag, index) => (
                  <span key={index} className="tag">{tag}</span>
                ))}
              </div>
              <div className="snippet-footer">
                <button 
                  onClick={() => openUrl(snippet.url)}
                  className="original-link"
                >
                  📄 Original
                </button>
                <button 
                  onClick={() => openIrysGateway(snippet.irys_id)}
                  className="irys-link"
                >
                  🔗 Blockchain
                </button>
              </div>
              <div className="blockchain-info">
                <span className="tx-id">TX: {snippet.irys_id?.slice(0, 8)}...{snippet.irys_id?.slice(-6)}</span>
                <span className="permanent-badge">PERMANENT</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
};

// Main App Component
function App() {
  const [signer, setSigner] = useState(null);
  const [userAddress, setUserAddress] = useState(null);
  const [balance, setBalance] = useState(null);
  const [refreshSnippets, setRefreshSnippets] = useState(0);

  const handleWalletConnected = async (connectedSigner, address) => {
    setSigner(connectedSigner);
    setUserAddress(address);
    
    // Get wallet balance
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const bal = await provider.getBalance(address);
      setBalance(ethers.formatEther(bal));
    } catch (error) {
      console.error('Error getting balance:', error);
    }
  };

  const handleSnippetSaved = () => {
    setRefreshSnippets(prev => prev + 1);
  };

  return (
    <div className="App">
      <div className="app-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>
      
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">
            <span className="title-icon">🔗</span>
            Irys Snippet Vault
          </h1>
          <p className="app-subtitle">Permanently store web snippets on Irys blockchain with AI analysis</p>
          <WalletConnection 
            onWalletConnected={handleWalletConnected}
            connectedWallet={userAddress}
            balance={balance}
          />
        </div>
      </header>

      <main className="app-main">
        {signer ? (
          <div className="app-content">
            <SnippetForm 
              signer={signer}
              userAddress={userAddress}
              onSnippetSaved={handleSnippetSaved}
            />
            <SnippetList 
              userAddress={userAddress}
              refreshTrigger={refreshSnippets}
            />
          </div>
        ) : (
          <div className="welcome-screen">
            <GlassCard className="welcome-card">
              <h2>Welcome to Irys Snippet Vault</h2>
              <p>Connect your wallet to start saving web snippets permanently on Irys blockchain.</p>
              <ul className="features-list">
                <li>🔗 Extract content from any webpage</li>
                <li>🤖 AI-powered summarization and tagging</li>
                <li>⛓️ <strong>REAL</strong> permanent storage on Irys blockchain</li>
                <li>🎨 Beautiful Notion-style interface</li>
              </ul>
              <div className="demo-section">
                <h3>🔥 Real Blockchain Storage</h3>
                <p>Your snippets will be <strong>permanently stored</strong> on the Irys blockchain forever!</p>
                <p className="small-text">
                  💰 <strong>Real ETH:</strong> Uses your actual ETH balance for blockchain transactions<br/>
                  🌐 <strong>Global Access:</strong> View stored data at gateway.irys.xyz<br/>
                  🔒 <strong>Immutable:</strong> Data cannot be deleted or modified once stored
                </p>
              </div>
            </GlassCard>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;