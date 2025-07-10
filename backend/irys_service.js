const { Uploader } = require("@irys/upload");
const { Ethereum } = require("@irys/upload-ethereum");
const { ethers } = require("ethers");

// Create a test private key for backend operations
// In production, use a dedicated wallet with minimal funds
const BACKEND_PRIVATE_KEY = process.env.IRYS_PRIVATE_KEY || "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

class IrysService {
    constructor() {
        this.uploader = null;
    }

    async initialize() {
        try {
            // Initialize Irys uploader for testnet
            this.uploader = await Uploader(Ethereum)
                .withWallet(BACKEND_PRIVATE_KEY)
                .withRpc("https://testnet-rpc.irys.xyz/v1/execution-rpc")
                .devnet(); // Use devnet for testnet

            console.log("✅ Irys service initialized successfully");
            console.log("📍 Network:", "testnet");
            console.log("💰 Wallet:", this.uploader.address);
            
            return true;
        } catch (error) {
            console.error("❌ Failed to initialize Irys service:", error);
            return false;
        }
    }

    async uploadData(data, tags = []) {
        if (!this.uploader) {
            throw new Error("Irys service not initialized");
        }

        try {
            // Add timestamp and application tags
            const allTags = [
                { name: "application-id", value: "IrysSnippetVault" },
                { name: "timestamp", value: Date.now().toString() },
                { name: "Content-Type", value: "application/json" },
                ...tags
            ];

            // Upload to Irys blockchain
            const receipt = await this.uploader.upload(data, { tags: allTags });
            
            console.log("✅ Data uploaded to Irys:", receipt.id);
            return {
                id: receipt.id,
                timestamp: receipt.timestamp,
                size: receipt.size,
                gateway_url: `https://gateway.irys.xyz/${receipt.id}`
            };
        } catch (error) {
            console.error("❌ Irys upload failed:", error);
            throw error;
        }
    }

    async getBalance() {
        if (!this.uploader) {
            throw new Error("Irys service not initialized");
        }

        try {
            const balance = await this.uploader.getLoadedBalance();
            const formatted = this.uploader.utils.fromAtomic(balance);
            return {
                atomic: balance,
                formatted: formatted,
                token: this.uploader.token
            };
        } catch (error) {
            console.error("❌ Failed to get balance:", error);
            throw error;
        }
    }

    async fundAccount(amount) {
        if (!this.uploader) {
            throw new Error("Irys service not initialized");
        }

        try {
            const atomic = this.uploader.utils.toAtomic(amount);
            const receipt = await this.uploader.fund(atomic);
            console.log("✅ Account funded:", amount, this.uploader.token);
            return receipt;
        } catch (error) {
            console.error("❌ Funding failed:", error);
            throw error;
        }
    }
}

// Export singleton instance
const irysService = new IrysService();

module.exports = irysService;

// Initialize when module is loaded
if (require.main === module) {
    // Direct execution for testing
    irysService.initialize().then(success => {
        if (success) {
            console.log("🚀 Irys service ready for blockchain operations!");
        } else {
            console.log("💥 Failed to initialize Irys service");
        }
    });
}