import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import {
  PlusCircle,
  MinusCircle,
  Wallet,
  History,
  Download,
  AlertCircle,
  Loader2,
  Calendar,
  Filter,
  Plus,
  Edit2,
  Save,
  X,
  TrendingUp,
  PieChart,
  Users,
  DollarSign
} from 'lucide-react';
import * as XLSX from 'xlsx';

function App() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [coins, setCoins] = useState(0);
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [totalWithdrawals, setTotalWithdrawals] = useState(0);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [syncing, setSyncing] = useState(false);

  // Date filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Add account
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');

  // Edit entry
  const [editingEntry, setEditingEntry] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editUtr, setEditUtr] = useState('');

  // UTR for new entry
  const [utrNumber, setUtrNumber] = useState('');

  // Analysis view
  const [showAnalysis, setShowAnalysis] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);

      // Fetch accounts
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('*')
        .order('name');
      setAccounts(accountsData || []);

      // Build entries query with date filters
      let entriesQuery = supabase
        .from('entries')
        .select(`
          *,
          accounts (name)
        `)
        .order('created_at', { ascending: false });

      // Apply date filters
      if (startDate) {
        entriesQuery = entriesQuery.gte('created_at', startDate + 'T00:00:00');
      }
      if (endDate) {
        entriesQuery = entriesQuery.lte('created_at', endDate + 'T23:59:59');
      }

      const { data: entriesData } = await entriesQuery;
      setEntries(entriesData || []);

      // Calculate totals from entries
      const deposits = entriesData
        ?.filter(e => e.type === 'deposit')
        .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0) || 0;

      const withdrawals = entriesData
        ?.filter(e => e.type === 'withdrawal')
        .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0) || 0;

      setTotalDeposits(deposits);
      setTotalWithdrawals(withdrawals);
      setCoins(deposits - withdrawals);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleEntry(type) {
    if (!selectedAccount || !amount) return;

    const amountNum = parseFloat(amount);
    if (amountNum <= 0) {
      alert('Please enter a valid amount greater than 0');
      return;
    }

    try {
      setSyncing(true);
      const { error } = await supabase
        .from('entries')
        .insert([{
          account_id: selectedAccount,
          amount: amountNum,
          type,
          description: description || (type === 'deposit' ? 'Deposit' : 'Withdrawal'),
          utr_number: utrNumber || null
        }]);

      if (error) throw error;

      setAmount('');
      setDescription('');
      setUtrNumber('');
      fetchData();
    } catch (error) {
      alert('Error adding entry: ' + error.message);
    } finally {
      setSyncing(false);
    }
  }

  function clearFilters() {
    setStartDate('');
    setEndDate('');
    fetchData();
  }

  async function handleAddAccount() {
    if (!newAccountName.trim()) return;

    try {
      setSyncing(true);
      const { error } = await supabase
        .from('accounts')
        .insert([{ name: newAccountName.trim() }]);

      if (error) throw error;

      setNewAccountName('');
      setShowAddAccount(false);
      fetchData();
    } catch (error) {
      alert('Error adding account: ' + error.message);
    } finally {
      setSyncing(false);
    }
  }

  // Edit functions
  function startEdit(entry) {
    setEditingEntry(entry.id);
    setEditAmount(entry.amount);
    setEditDescription(entry.description || '');
    setEditUtr(entry.utr_number || '');
  }

  async function saveEdit() {
    if (!editAmount || parseFloat(editAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      setSyncing(true);
      const { error } = await supabase
        .from('entries')
        .update({
          amount: parseFloat(editAmount),
          description: editDescription,
          utr_number: editUtr || null
        })
        .eq('id', editingEntry);

      if (error) throw error;

      setEditingEntry(null);
      fetchData();
    } catch (error) {
      alert('Error updating entry: ' + error.message);
    } finally {
      setSyncing(false);
    }
  }

  function cancelEdit() {
    setEditingEntry(null);
    setEditAmount('');
    setEditDescription('');
    setEditUtr('');
  }

  // Export Account Summary Excel
  const exportAccountSummary = () => {
    const data = accounts.map(acc => {
      const accEntries = entries.filter(e => e.account_id === acc.id);
      const deposits = accEntries.filter(e => e.type === 'deposit').reduce((sum, e) => sum + e.amount, 0);
      const withdrawals = accEntries.filter(e => e.type === 'withdrawal').reduce((sum, e) => sum + e.amount, 0);

      return {
        'Account Name': acc.name,
        'Total Deposits': deposits,
        'Total Withdrawals': withdrawals,
        'Net Balance': deposits - withdrawals,
        'Transactions': accEntries.length
      };
    });

    const summary = [
      { 'Account Name': 'TOTAL', 'Total Deposits': totalDeposits, 'Total Withdrawals': totalWithdrawals, 'Net Balance': totalDeposits - totalWithdrawals, 'Transactions': entries.length }
    ];

    const ws = XLSX.utils.json_to_sheet([...data, ...summary]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Account Summary");
    XLSX.writeFile(wb, `Account_Summary_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export Transaction Details Excel
  const exportTransactionDetails = () => {
    const data = entries.map(e => ({
      Date: new Date(e.created_at).toLocaleDateString(),
      Time: new Date(e.created_at).toLocaleTimeString(),
      'Account Name': e.accounts?.name || 'Unknown',
      Type: e.type.toUpperCase(),
      Amount: e.amount,
      'UTR/Ref No': e.utr_number || '-',
      Description: e.description || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, `Transactions_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Calculate analysis data
  const getAccountStats = () => {
    return accounts.map(acc => {
      const accEntries = entries.filter(e => e.account_id === acc.id);
      const deposits = accEntries.filter(e => e.type === 'deposit').reduce((sum, e) => sum + e.amount, 0);
      const withdrawals = accEntries.filter(e => e.type === 'withdrawal').reduce((sum, e) => sum + e.amount, 0);

      return {
        name: acc.name,
        deposits,
        withdrawals,
        balance: deposits - withdrawals,
        transactionCount: accEntries.length
      };
    }).sort((a, b) => b.balance - a.balance);
  };

  const accountStats = getAccountStats();
  const topAccount = accountStats[0];
  const totalTransactions = entries.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <Loader2 className="w-10 h-10 text-brand animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-neutral-950 pb-20 p-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-6 pt-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Hisab System</h1>
          <p className="text-neutral-400 text-sm">Track Deposits & Withdrawals</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAnalysis(!showAnalysis)}
            className={`p-2 rounded-xl border transition-colors ${
              showAnalysis
                ? 'bg-brand text-white border-brand'
                : 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800'
            }`}
          >
            <PieChart className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-xl border transition-colors ${
              showFilters
                ? 'bg-brand text-white border-brand'
                : 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800'
            }`}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Analysis Section */}
      {showAnalysis && (
        <section className="mb-6 p-4 bg-gradient-to-br from-brand/20 to-purple-500/10 rounded-2xl border border-brand/20">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-brand" />
            <span className="text-white font-semibold">Analysis</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-neutral-900/50 rounded-xl">
              <div className="flex items-center gap-1.5 mb-1">
                <Users className="w-3.5 h-3.5 text-neutral-400" />
                <span className="text-neutral-400 text-xs">Total Accounts</span>
              </div>
              <p className="text-white font-bold text-xl">{accounts.length}</p>
            </div>
            <div className="p-3 bg-neutral-900/50 rounded-xl">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-neutral-400" />
                <span className="text-neutral-400 text-xs">Total Transactions</span>
              </div>
              <p className="text-white font-bold text-xl">{totalTransactions}</p>
            </div>
          </div>

          {topAccount && (
            <div className="p-3 bg-neutral-900/50 rounded-xl mb-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-neutral-400 text-xs">Top Account</span>
              </div>
              <p className="text-white font-bold">{topAccount.name}</p>
              <p className="text-emerald-400 text-sm">Balance: {topAccount.balance.toLocaleString()}</p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-neutral-400 text-xs font-medium">Account Breakdown</p>
            {accountStats.slice(0, 5).map((acc, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-neutral-900/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${acc.balance >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span className="text-white text-sm">{acc.name}</span>
                </div>
                <span className={`text-sm font-medium ${acc.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {acc.balance.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Date Filters */}
      {showFilters && (
        <section className="mb-6 p-4 bg-neutral-900 rounded-2xl border border-neutral-800">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-neutral-400" />
            <span className="text-neutral-400 text-sm font-medium">Filter by Date</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-neutral-500 text-xs mb-1 block">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2.5 bg-neutral-950 rounded-xl border border-neutral-800 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-neutral-500 text-xs mb-1 block">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2.5 bg-neutral-950 rounded-xl border border-neutral-800 text-white text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchData}
              className="flex-1 py-2 bg-brand text-white rounded-xl text-sm font-medium"
            >
              Apply Filter
            </button>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-xl text-sm"
            >
              Clear
            </button>
          </div>
        </section>
      )}

      {/* Summary Cards */}
      <section className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <PlusCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-emerald-500 text-xs font-medium">Deposit</span>
          </div>
          <p className="text-emerald-400 font-bold text-lg">
            {totalDeposits.toLocaleString()}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <MinusCircle className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-rose-500 text-xs font-medium">Withdrawal</span>
          </div>
          <p className="text-rose-400 font-bold text-lg">
            {totalWithdrawals.toLocaleString()}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-brand/10 border border-brand/20">
          <div className="flex items-center gap-1.5 mb-1">
            <Wallet className="w-3.5 h-3.5 text-brand" />
            <span className="text-brand text-xs font-medium">Available</span>
          </div>
          <p className={`font-bold text-lg ${coins >= 0 ? 'text-white' : 'text-rose-400'}`}>
            {coins.toLocaleString()}
          </p>
        </div>
      </section>

      {/* Transaction Form */}
      <section className="space-y-4 mb-8">
        <div className="space-y-3">
          {/* Account Select with Add Button */}
          <div className="relative">
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full p-4 bg-neutral-900 rounded-2xl border border-neutral-800 text-white focus:outline-hidden focus:border-brand transition-colors appearance-none pr-12"
            >
              <option value="">Select Account</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
            <button
              onClick={() => setShowAddAccount(true)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand/20 text-brand rounded-lg hover:bg-brand/30 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {showAddAccount && (
            <div className="p-4 bg-neutral-900 rounded-2xl border border-brand/30 space-y-3">
              <input
                type="text"
                placeholder="New Account Name"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddAccount()}
                className="w-full p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-white focus:outline-hidden focus:border-brand transition-colors"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddAccount}
                  disabled={syncing || !newAccountName.trim()}
                  className="flex-1 py-2.5 bg-brand text-white rounded-xl font-medium disabled:opacity-50"
                >
                  Add Account
                </button>
                <button
                  onClick={() => { setShowAddAccount(false); setNewAccountName(''); }}
                  className="px-4 py-2.5 bg-neutral-800 text-neutral-300 rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <input
            type="number"
            placeholder="Amount (e.g. 100)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full p-4 bg-neutral-900 rounded-2xl border border-neutral-800 text-white focus:outline-hidden focus:border-brand transition-colors"
            min="0"
            step="0.01"
          />

          <input
            type="text"
            placeholder="UTR / Reference No. (Optional)"
            value={utrNumber}
            onChange={(e) => setUtrNumber(e.target.value)}
            className="w-full p-4 bg-neutral-900 rounded-2xl border border-neutral-800 text-white focus:outline-hidden focus:border-brand transition-colors"
          />

          <input
            type="text"
            placeholder="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-4 bg-neutral-900 rounded-2xl border border-neutral-800 text-white focus:outline-hidden focus:border-brand transition-colors"
          />

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => handleEntry('deposit')}
              disabled={syncing || !selectedAccount || !amount}
              className="flex items-center justify-center gap-2 p-5 bg-emerald-500/10 text-emerald-500 rounded-2xl font-bold border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-50 active:scale-95"
            >
              <PlusCircle className="w-6 h-6" />
              Deposit
            </button>
            <button
              onClick={() => handleEntry('withdrawal')}
              disabled={syncing || !selectedAccount || !amount}
              className="flex items-center justify-center gap-2 p-5 bg-rose-500/10 text-rose-500 rounded-2xl font-bold border border-rose-500/20 hover:bg-rose-500/20 transition-all disabled:opacity-50 active:scale-95"
            >
              <MinusCircle className="w-6 h-6" />
              Withdrawal
            </button>
          </div>
        </div>
      </section>

      {/* Excel Export Buttons */}
      <section className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={exportAccountSummary}
          className="flex items-center justify-center gap-2 p-3 bg-neutral-900 rounded-xl border border-neutral-800 hover:bg-neutral-800 transition-colors"
        >
          <Download className="w-4 h-4 text-neutral-300" />
          <span className="text-neutral-300 text-sm font-medium">Account Summary</span>
        </button>
        <button
          onClick={exportTransactionDetails}
          className="flex items-center justify-center gap-2 p-3 bg-neutral-900 rounded-xl border border-neutral-800 hover:bg-neutral-800 transition-colors"
        >
          <Download className="w-4 h-4 text-neutral-300" />
          <span className="text-neutral-300 text-sm font-medium">Transaction Details</span>
        </button>
      </section>

      {/* Recent Activity with Edit */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-neutral-500" />
          <h2 className="text-lg font-semibold text-white">
            Recent Transactions
            <span className="text-neutral-500 text-sm font-normal ml-2">
              ({entries.length})
            </span>
          </h2>
        </div>
        <div className="space-y-3">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 opacity-40">
              <AlertCircle className="w-10 h-10 mb-2" />
              <p>No transactions yet</p>
            </div>
          ) : (
            entries.slice(0, 10).map(entry => (
              <div
                key={entry.id}
                className="p-4 bg-neutral-900/40 rounded-2xl border border-neutral-800/50"
              >
                {editingEntry === entry.id ? (
                  // Edit Mode
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="p-2 bg-neutral-950 rounded-lg border border-neutral-700 text-white text-sm"
                      />
                      <input
                        type="text"
                        value={editUtr}
                        onChange={(e) => setEditUtr(e.target.value)}
                        placeholder="UTR No."
                        className="p-2 bg-neutral-950 rounded-lg border border-neutral-700 text-white text-sm"
                      />
                    </div>
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Description"
                      className="w-full p-2 bg-neutral-950 rounded-lg border border-neutral-700 text-white text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        disabled={syncing}
                        className="flex-1 flex items-center justify-center gap-1 py-2 bg-emerald-600 text-white rounded-lg text-sm"
                      >
                        <Save className="w-4 h-4" /> Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-4 py-2 bg-neutral-700 text-white rounded-lg text-sm"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${
                        entry.type === 'deposit'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-rose-500/10 text-rose-500'
                      }`}>
                        {entry.type === 'deposit'
                          ? <PlusCircle className="w-5 h-5" />
                          : <MinusCircle className="w-5 h-5" />
                        }
                      </div>
                      <div>
                        <p className="text-white font-medium">{entry.accounts?.name}</p>
                        <p className="text-neutral-500 text-xs">
                          {new Date(entry.created_at).toLocaleDateString()} - {entry.description || '-'}
                        </p>
                        {entry.utr_number && (
                          <p className="text-neutral-400 text-xs">UTR: {entry.utr_number}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className={`font-bold text-lg ${
                        entry.type === 'deposit' ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {entry.type === 'deposit' ? '+' : '-'}{entry.amount.toLocaleString()}
                      </p>
                      <button
                        onClick={() => startEdit(entry)}
                        className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {syncing && (
        <div className="fixed inset-0 bg-neutral-950/50 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-neutral-900 p-6 rounded-3xl border border-neutral-800 flex flex-col items-center gap-4 shadow-2xl">
            <Loader2 className="w-8 h-8 text-brand animate-spin" />
            <p className="text-white font-medium">Syncing...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
