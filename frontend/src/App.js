import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Uploader } from '@irys/upload';
import { Ethereum } from '@irys/upload-ethereum';
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

// Wallet Connection Component
const WalletConnection = ({ onWalletConnected, connectedWallet }) => {
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask to use this application!");
      return;
    }

    try {
      setIsConnecting(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      
      onWalletConnected(signer, accounts[0]);
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
          <span className="wallet-address">
            {connectedWallet.slice(0, 6)}...{connectedWallet.slice(-4)}
          </span>
        </div>
      ) : (
        <NeonButton onClick={connectWallet} disabled={isConnecting}>
          {isConnecting ? <LoadingSpinner size="sm" /> : "Connect Wallet"}
        </NeonButton>
      )}
    </div>
  );
};

// Snippet Form Component
const SnippetForm = ({ signer, userAddress, onSnippetSaved }) => {
  const [url, setUrl] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const [summarizedData, setSummarizedData] = useState(null);
  const [network, setNetwork] = useState('devnet');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  const saveToIrys = async () => {
    if (!extractedData || !summarizedData || !signer) return;
    
    try {
      setIsSaving(true);
      
      // Create Irys uploader
      const irysUploader = await Uploader(Ethereum)
        .withWallet(signer)
        .withConfig({ 
          network: network,
          token: "ethereum"
        });
      
      // Prepare snippet data
      const snippetData = {
        applicationId: "IrysSnippetVault",
        user: userAddress,
        url: extractedData.url,
        title: extractedData.title,
        snippet: extractedData.snippet,
        summary: summarizedData.summary,
        tags: summarizedData.tags,
        timestamp: Date.now(),
        network: network
      };
      
      // Upload to Irys
      const receipt = await irysUploader.upload(JSON.stringify(snippetData), {
        tags: [
          { name: "application-id", value: "IrysSnippetVault" },
          { name: "user", value: userAddress },
          { name: "url", value: extractedData.url },
          { name: "title", value: extractedData.title },
          { name: "timestamp", value: snippetData.timestamp.toString() },
          { name: "network", value: network },
          ...summarizedData.tags.map(tag => ({ name: "tag", value: tag }))
        ]
      });
      
      // Save metadata to backend
      await fetch(`${API}/save-snippet-metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: userAddress,
          irys_id: receipt.id,
          url: extractedData.url,
          title: extractedData.title,
          summary: summarizedData.summary,
          tags: summarizedData.tags,
          network: network
        })
      });
      
      alert(`Snippet saved successfully! Irys ID: ${receipt.id}`);
      
      // Reset form
      setUrl('');
      setExtractedData(null);
      setSummarizedData(null);
      
      // Trigger refresh of snippets list
      if (onSnippetSaved) onSnippetSaved();
      
    } catch (error) {
      console.error('Error saving to Irys:', error);
      alert(`Error saving snippet: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <GlassCard className="snippet-form">
      <h2 className="form-title">Clip & Store Web Snippets</h2>
      
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
          <p>AI is summarizing your snippet...</p>
        </div>
      )}

      {summarizedData && (
        <div className="summarized-content">
          <h3>🤖 AI Analysis</h3>
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
          <div className="network-selector">
            <label>Storage Network:</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  value="devnet"
                  checked={network === 'devnet'}
                  onChange={(e) => setNetwork(e.target.value)}
                />
                Devnet (Testing)
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  value="mainnet"
                  checked={network === 'mainnet'}
                  onChange={(e) => setNetwork(e.target.value)}
                />
                Mainnet (Production)
              </label>
            </div>
          </div>
          
          <NeonButton 
            onClick={saveToIrys} 
            disabled={isSaving}
            className="save-button"
          >
            {isSaving ? <LoadingSpinner size="sm" /> : `Save to Irys (${network})`}
          </NeonButton>
        </div>
      )}
    </GlassCard>
  );
};

// Snippet List Component
const SnippetList = ({ userAddress, refreshTrigger }) => {
  const [snippets, setSnippets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSnippets = async () => {
    if (!userAddress) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`${API}/snippets/${userAddress}`);
      const data = await response.json();
      setSnippets(data.snippets || []);
    } catch (error) {
      console.error('Error fetching snippets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSnippets();
  }, [userAddress, refreshTrigger]);

  const openIrysGateway = (irysId) => {
    window.open(`https://gateway.irys.xyz/${irysId}`, '_blank');
  };

  if (isLoading) {
    return (
      <GlassCard className="snippet-list">
        <div className="loading-container">
          <LoadingSpinner size="lg" />
          <p>Loading your snippets...</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="snippet-list">
      <h2 className="list-title">Your Snippet Vault</h2>
      
      {snippets.length === 0 ? (
        <div className="empty-state">
          <p>No snippets saved yet. Start by clipping your first web snippet!</p>
        </div>
      ) : (
        <div className="snippets-grid">
          {snippets.map((snippet) => (
            <div key={snippet.id} className="snippet-card">
              <div className="snippet-header">
                <h3>{snippet.title}</h3>
                <span className="network-badge">{snippet.network}</span>
              </div>
              <p className="snippet-summary">{snippet.summary}</p>
              <div className="snippet-tags">
                {snippet.tags.map((tag, index) => (
                  <span key={index} className="tag">{tag}</span>
                ))}
              </div>
              <div className="snippet-footer">
                <a href={snippet.url} target="_blank" rel="noopener noreferrer" className="original-link">
                  View Original
                </a>
                <button 
                  onClick={() => openIrysGateway(snippet.irys_id)}
                  className="irys-link"
                >
                  View on Irys
                </button>
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
  const [refreshSnippets, setRefreshSnippets] = useState(0);

  const handleWalletConnected = (connectedSigner, address) => {
    setSigner(connectedSigner);
    setUserAddress(address);
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
          <p className="app-subtitle">Permanently store and organize web snippets on the blockchain</p>
          <WalletConnection 
            onWalletConnected={handleWalletConnected}
            connectedWallet={userAddress}
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
              <p>Connect your wallet to start saving web snippets permanently on the blockchain.</p>
              <ul className="features-list">
                <li>🔗 Extract content from any webpage</li>
                <li>🤖 AI-powered summarization and tagging</li>
                <li>⛓️ Permanent storage on Irys blockchain</li>
                <li>🎨 Beautiful Notion-style interface</li>
              </ul>
            </GlassCard>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;