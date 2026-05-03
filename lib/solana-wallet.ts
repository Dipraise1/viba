import 'react-native-get-random-values';
import * as SecureStore from 'expo-secure-store';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

// ─── Config ───────────────────────────────────────────────────────────────────

const STORE_KEY = 'viba_solana_secret_key';

export const SOLANA_CLUSTER: 'devnet' | 'mainnet-beta' = 'devnet';
const RPC_URL =
  SOLANA_CLUSTER === 'devnet'
    ? 'https://api.devnet.solana.com'
    : 'https://api.mainnet-beta.solana.com';

// Replace with real VIBA SPL mint at token launch
export const VIBA_MINT = 'ViBAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

// ─── Keypair type ─────────────────────────────────────────────────────────────

export interface SolanaKeypair {
  publicKey: string;   // base58
  secretKey: Uint8Array;
}

// ─── Key storage ──────────────────────────────────────────────────────────────

export async function getOrCreateWallet(): Promise<{ keypair: SolanaKeypair; isNew: boolean }> {
  const stored = await SecureStore.getItemAsync(STORE_KEY);

  if (stored) {
    const secretKey = new Uint8Array(JSON.parse(stored));
    const pair = nacl.sign.keyPair.fromSecretKey(secretKey);
    return {
      keypair: { publicKey: bs58.encode(Buffer.from(pair.publicKey)), secretKey: pair.secretKey },
      isNew: false,
    };
  }

  const pair = nacl.sign.keyPair();
  await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(Array.from(pair.secretKey)));
  return {
    keypair: { publicKey: bs58.encode(Buffer.from(pair.publicKey)), secretKey: pair.secretKey },
    isNew: true,
  };
}

export async function deleteWallet(): Promise<void> {
  await SecureStore.deleteItemAsync(STORE_KEY);
}

// ─── JSON-RPC helper ──────────────────────────────────────────────────────────

async function rpc(method: string, params: unknown[]): Promise<any> {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

// ─── Balances ─────────────────────────────────────────────────────────────────

export async function getSolBalance(publicKey: string): Promise<number> {
  try {
    const result = await rpc('getBalance', [publicKey, { commitment: 'confirmed' }]);
    return (result?.value ?? 0) / 1_000_000_000;
  } catch {
    return 0;
  }
}

export async function getVibaBalance(publicKey: string): Promise<number> {
  try {
    const result = await rpc('getTokenAccountsByOwner', [
      publicKey,
      { mint: VIBA_MINT },
      { encoding: 'jsonParsed', commitment: 'confirmed' },
    ]);
    if (!result?.value?.length) return 0;
    const uiAmount = result.value[0]?.account?.data?.parsed?.info?.tokenAmount?.uiAmount;
    return typeof uiAmount === 'number' ? uiAmount : 0;
  } catch {
    return 0;
  }
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export interface SolanaTx {
  signature: string;
  blockTime: number | null;
}

export async function getRecentTransactions(publicKey: string, limit = 10): Promise<SolanaTx[]> {
  try {
    const result = await rpc('getSignaturesForAddress', [publicKey, { limit }]);
    return (result ?? []).map((s: any) => ({
      signature: s.signature as string,
      blockTime: s.blockTime ?? null,
    }));
  } catch {
    return [];
  }
}

// ─── SOL price (CoinGecko) ───────────────────────────────────────────────────

export interface SolPriceData {
  priceUsd: number;
  change24h: number;
}

export async function fetchSolPriceData(): Promise<SolPriceData> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true',
      { headers: { Accept: 'application/json' } }
    );
    const data = await res.json();
    return {
      priceUsd: data?.solana?.usd ?? 0,
      change24h: data?.solana?.usd_24h_change ?? 0,
    };
  } catch {
    return { priceUsd: 0, change24h: 0 };
  }
}
