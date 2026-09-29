import { useEffect, useState } from 'react';
import { getVirtualAccount, createVirtualAccount } from '../services/api';

interface VirtualAccountInfo {
  bankName: string;
  accountName: string;
  accountNumber: string;
  hasVirtualAccount?: boolean;
}

export default function VirtualAccount() {
  const [account, setAccount] = useState<VirtualAccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAccount() {
      try {
        const data = await getVirtualAccount();
        setAccount(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchAccount();
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const data = await createVirtualAccount();
      setAccount(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const copyNumber = async () => {
    if (account?.accountNumber) {
      await navigator.clipboard.writeText(account.accountNumber);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-semibold mb-6 text-center">Virtual Account</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {account && account.accountNumber && account.hasVirtualAccount !== false ? (
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-medium mb-4">Your Virtual Account Details</h2>
          <p className="mb-2"><strong>Bank:</strong> {account.bankName}</p>
          <p className="mb-2"><strong>Account Name:</strong> {account.accountName}</p>
          <p className="flex items-center mb-4">
            <strong className="mr-2">Number:</strong> <span className="font-mono text-lg">{account.accountNumber}</span>
            <button
              onClick={copyNumber}
              className="ml-3 text-primary hover:text-primary-dark transition-colors"
              aria-label="Copy account number"
            >
              📋
            </button>
          </p>
        </div>
      ) : (
        <div className="text-center">
          <p className="mb-4">You do not have a virtual account yet.</p>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="bg-primary hover:bg-secondary text-white px-6 py-2.5 rounded-full font-medium transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            {creating ? 'Creating…' : 'Create Virtual Account'}
          </button>
        </div>
      )}
    </div>
  );
}
