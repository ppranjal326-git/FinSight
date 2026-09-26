import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Sparkles, 
  CheckCircle2, 
  ArrowDownLeft, 
  ArrowUpRight 
} from 'lucide-react';
import { fetchTransactions, categorizeTransactions, formatCurrency } from '../api';

export default function TransactionsTab() {
  const [transactions, setTransactions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [categorizeMessage, setCategorizeMessage] = useState(null);

  const categories = [
    'All Categories',
    'Income',
    'Rent & Housing',
    'Groceries & Food',
    'Dining & Cafes',
    'Utilities & Bills',
    'Subscriptions & Media',
    'Shopping & Lifestyle',
    'Transport & Fuel',
    'Healthcare & Fitness',
    'Uncategorized'
  ];

  useEffect(() => {
    loadTransactions();
  }, [categoryFilter, searchQuery]);

  async function loadTransactions() {
    try {
      setLoading(true);
      const cat = categoryFilter === 'All Categories' ? '' : categoryFilter;
      const res = await fetchTransactions(150, cat, searchQuery);
      setTransactions(res.items || []);
      setTotalCount(res.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAutoCategorize() {
    try {
      setIsCategorizing(true);
      setCategorizeMessage(null);
      const res = await categorizeTransactions();
      setCategorizeMessage(res.message);
      await loadTransactions();
      setTimeout(() => setCategorizeMessage(null), 5000);
    } catch (err) {
      alert(`Auto-categorization failed: ${err.message}`);
    } finally {
      setIsCategorizing(false);
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#172033] tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#087F8C]" />
            <span>Transaction Ledger & AI Normalization</span>
          </h2>
          <p className="text-xs text-[#667085]">
            6 months of continuous transaction records ({totalCount} entries) with verified running balances.
          </p>
        </div>

        {/* AI Categorize Button */}
        <button
          onClick={handleAutoCategorize}
          disabled={isCategorizing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#087F8C] hover:bg-[#066873] text-white font-semibold text-xs transition shadow-xs disabled:opacity-50"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isCategorizing ? 'animate-spin' : ''}`} />
          <span>{isCategorizing ? 'Claude Categorizing...' : 'AI Auto-Categorize Unclassified'}</span>
        </button>
      </div>

      {categorizeMessage && (
        <div className="p-3.5 rounded-lg bg-[#EAF7F0] border border-[#168A5B]/25 text-xs text-[#168A5B] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#168A5B] flex-shrink-0" />
          <span>{categorizeMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#667085] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by merchant name or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg pl-9 pr-4 py-2 text-xs text-[#172033] placeholder-[#667085] focus:outline-none focus:border-[#087F8C]"
          />
        </div>

        <div className="sm:w-64">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#087F8C]"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-[#FFFFFF] rounded-xl border border-[#E5E7EB] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#087F8C] border-t-transparent"></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-[#667085] text-xs">
            No transactions matched your search filters.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[#F0F2EF] border-b border-[#E5E7EB] text-[#667085] uppercase text-[10px] tracking-wider font-semibold z-10">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Merchant</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {transactions.map((tx) => {
                  const isCredit = tx.type === 'credit';
                  const isAnomalousMerchant = tx.merchant.includes('ChronoCraft') || tx.merchant.includes('CryptoVault');

                  return (
                    <tr 
                      key={tx.id} 
                      className={`hover:bg-[#F6F7F4] transition-colors ${
                        isAnomalousMerchant ? 'bg-[#FCECEF]/40' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono text-[11px] text-[#667085]">
                        {tx.date}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#172033]">
                        <div className="flex items-center gap-2">
                          <span>{tx.merchant}</span>
                          {isAnomalousMerchant && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#FCECEF] text-[#C2415A] border border-[#C2415A]/30 font-bold uppercase">
                              Anomaly
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          tx.category === 'Uncategorized' 
                            ? 'bg-[#FFF5E5] text-[#C77A00] border border-[#C77A00]/25' 
                            : 'bg-[#F0F2EF] text-[#667085] border border-[#E5E7EB]'
                        }`}>
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                          isCredit ? 'text-[#168A5B]' : 'text-[#667085]'
                        }`}>
                          {isCredit ? (
                            <>
                              <ArrowDownLeft className="w-3 h-3 text-[#168A5B]" />
                              Credit
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="w-3 h-3 text-[#667085]" />
                              Debit
                            </>
                          )}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${
                        isCredit ? 'text-[#168A5B]' : 'text-[#172033]'
                      }`}>
                        {isCredit ? '+' : '-'}{formatCurrency(tx.amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[#667085]">
                        {formatCurrency(tx.balance_after)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
