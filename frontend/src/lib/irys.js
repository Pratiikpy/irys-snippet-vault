import { WebUploader } from "@irys/web-upload";
import { WebEthereum } from "@irys/web-upload-ethereum";
import { EthersV6Adapter } from "@irys/web-upload-ethereum-ethers-v6";
import { BrowserProvider } from "ethers";
import Query from "@irys/query";

let irys = null;

export async function getIrys() {
  if (!irys) {
    const provider = new BrowserProvider(window.ethereum);
    const network = process.env.REACT_APP_IRYS_NETWORK || 'devnet';
    
    irys = await WebUploader(WebEthereum)
      .withAdapter(EthersV6Adapter(provider))
      .withRpc(process.env.REACT_APP_IRYS_RPC_URL);
    
    if (network === 'mainnet') {
      irys = irys.mainnet();
    } else {
      irys = irys.devnet();
    }
    
    await irys.ready();
  }
  return irys;
}

export async function uploadSnippet(data) {
  const uploader = await getIrys();
  
  // Prepare tags for better queryability
  const tags = [
    { name: "application-id", value: "IrysSnippetVault" },
    { name: "user", value: data.user },
    { name: "url", value: data.url },
    { name: "title", value: data.title },
    { name: "timestamp", value: String(data.timestamp) },
    { name: "network", value: data.network || 'devnet' },
    ...data.tags.map(tag => ({ name: "tag", value: tag }))
  ];
  
  const receipt = await uploader.upload(JSON.stringify(data), { tags });
  return receipt.id;
}

export async function listSnippets(wallet) {
  try {
    const myQuery = new Query();
    
    const results = await myQuery
      .search("irys:transactions")
      .tags([
        { name: "application-id", values: ["IrysSnippetVault"] },
        { name: "user", values: [wallet] }
      ])
      .sort("DESC")
      .limit(100);
    
    const snippets = await Promise.all(results.map(async tx => {
      try {
        const data = await fetch(`https://gateway.irys.xyz/${tx.id}`).then(r => r.json());
        return { 
          id: tx.id, 
          irys_id: tx.id,
          ...data,
          // Ensure we have the required fields
          wallet_address: data.user,
          network: data.network || 'devnet'
        };
      } catch (error) {
        console.error(`Error fetching data for transaction ${tx.id}:`, error);
        return null;
      }
    }));
    
    // Filter out any failed fetches
    return snippets.filter(snippet => snippet !== null);
  } catch (error) {
    console.error('Error listing snippets:', error);
    return [];
  }
}

export async function getBalance() {
  try {
    const uploader = await getIrys();
    const balance = await uploader.getBalance();
    return balance;
  } catch (error) {
    console.error('Error getting balance:', error);
    return '0';
  }
}

export async function fundWallet(amount) {
  try {
    const uploader = await getIrys();
    const receipt = await uploader.fund(amount);
    return receipt;
  } catch (error) {
    console.error('Error funding wallet:', error);
    throw error;
  }
}