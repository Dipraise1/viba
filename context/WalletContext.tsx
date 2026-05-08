import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import {
  getOrCreateWallet,
  getSolBalance,
  getVibaBalance,
  getRecentTransactions,
  fetchSolPriceData,
  SolanaKeypair,
  SolanaTx,
} from '@/lib/solana-wallet';

interface WalletState {
  ready: boolean;
  publicKey: string | null;
  solBalance: number;
  vibaBalance: number;
  solPriceUsd: number;
  solChange24h: number;
  transactions: SolanaTx[];
  refreshing: boolean;
  refresh: () => Promise<void>;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [keypair, setKeypair] = useState<SolanaKeypair | null>(null);
  const [solBalance, setSolBalance] = useState(0);
  const [vibaBalance, setVibaBalance] = useState(0);
  const [solPriceUsd, setSolPriceUsd] = useState(0);
  const [solChange24h, setSolChange24h] = useState(0);
  const [transactions, setTransactions] = useState<SolanaTx[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const publicKey = keypair?.publicKey ?? null;

  const refresh = useCallback(async () => {
    if (!keypair) return;
    setRefreshing(true);
    try {
      const pk = keypair.publicKey;
      const [sol, viba, priceData, txs] = await Promise.all([
        getSolBalance(pk),
        getVibaBalance(pk),
        fetchSolPriceData(),
        getRecentTransactions(pk, 10),
      ]);
      setSolBalance(sol);
      setVibaBalance(viba);
      setSolPriceUsd(priceData.priceUsd);
      setSolChange24h(priceData.change24h);
      setTransactions(txs);
    } finally {
      setRefreshing(false);
    }
  }, [keypair]);

  useEffect(() => {
    getOrCreateWallet().then(({ keypair: kp }: { keypair: SolanaKeypair; isNew: boolean }) => {
      setKeypair(kp);
      setReady(true);
    }).catch(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready && keypair) refresh();
  }, [ready, keypair]);

  useEffect(() => {
    if (!ready || !keypair) return;
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [ready, keypair, refresh]);

  return (
    <WalletContext.Provider value={{ ready, publicKey, solBalance, vibaBalance, solPriceUsd, solChange24h, transactions, refreshing, refresh }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider');
  return ctx;
}
