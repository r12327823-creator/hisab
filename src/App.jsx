import { useState, useEffect } from 'react';
import { getAccounts, addAccount, getEntries, addEntry, updateEntry } from './api';
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
  PieChart
} from 'lucide-react';
import * as XLSX from 'xlsx';

function App() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [entries, setEntries] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [editingEntry, setEditingEntry] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editUtr, setEditUtr] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [showAnalysis, setShowAnalysis] = useState(false);

  const fetchData = async () => {
    try {
      const [accountsData, entriesData] = await Promise.all([
        getAccounts(),
        getEntries(startDate, endDate)
      ]);
      setAccounts(accountsData);
      setEntries(entriesData);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const totalDeposits = entries.filter(e => e.type === 'deposit').reduce((sum, e) => sum + e.amount, 0);
  const totalWithdrawals = entries.filter(e => e.type === 'withdrawal').reduce((sum, e) => sum + e.amount, 0);
  const coins = totalDeposits - totalWithdrawals;

  async function handleEntry(type) {
    if (!selectedAccount || !amount) return;
    const amountNum = parseFloat(amount);
    if (amountNum <= 0) return;

    await addEntry({ accountId: selectedAccount, amount: amountNum, type, description: description || (type === 'deposit' ? 'Deposit' : 'Withdrawal'), utrNumber: utrNumber || null });
    setAmount('');
    setDescription('');
    setUtrNumber('');
    fetchData();
  }

  async function handleAddAccount() {
    if (!newAccountName.trim()) return;
    await addAccount(newAccountName.trim());
    setNewAccountName('');
    setShowAddAccount(false);
    fetchData();
  }

  async function startEdit(entry) {
    setEditingEntry(entry._id);
    setEditAmount(entry.amount);
    setEditDescription(entry.description || '');
    setEditUtr(entry.utrNumber || '');
  }

  async function saveEdit() {
    if (!editAmount || parseFloat(editAmount) <= 0) return;
    await updateEntry(editingEntry, { amount: parseFloat(editAmount), description: editDescription, utrNumber: editUtr || null });
    setEditingEntry(null);
    fetchData();
  }

  function exportAccountSummary() {
    const data = accounts.map(acc => {
      const accEntries = entries.filter(e => e.accountId === acc._id);
      const deposits = accEntries.filter(e => e.type === 'deposit').reduce((sum, e) => sum + e.amount, 0);
      const withdrawals = accEntries.filter(e => e.type === 'withdrawal').reduce((sum, e) => sum + e.amount, 0);
      return { 'Account Name': acc.name, 'Total Deposits': deposits, 'Total Withdrawals': withdrawals, 'Net Balance': deposits - withdrawals, 'Transactions': accEntries.length };
    });
    data.push({ 'Account Name': 'TOTAL', 'Total Deposits': totalDeposits, 'Total Withdrawals': totalWithdrawals, 'Net Balance': coins, 'Transactions': entries.length });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Account Summary");
    XLSX.writeFile(wb, `Account_Summary_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  function exportTransactionDetails() {
    const data = entries.map(e => ({ Date: new Date(e.createdAt).toLocaleDateString(), Time: new Date(e.createdAt).toLocaleTimeString(), 'Account Name': e.accountName, Type: e.type.toUpperCase(), Amount: e.amount, 'UTR/Ref No': e.utrNumber || '-', Description: e.description || '' }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Transactions");
    XLSX.writeFile(wb, `Transactions_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  const accountStats = accounts.map(acc => {
    const accEntries = entries.filter(e => e.accountId === acc._id);
    const deposits = accEntries.filter(e => e.type === 'deposit').reduce((sum, e) => sum + e.amount, 0);
    const withdrawals = accEntries.filter(e => e.type === 'withdrawal').reduce((sum, e) => sum + e.amount, 0);
    return { name: acc.name, balance: deposits - withdrawals };
  }).sort((a, b) => b.balance - a.balance);

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-neutral-950"><Loader2 className="w-10 h-10 text-brand animate-spin" /></div>;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-neutral-950 pb-20 p-4">
      <header className="flex items-center justify-between mb-6 pt-4">
        <div><h1 className="text-2xl font-bold text-white">Hisab System</h1><p className="text-neutral-400 text-sm">Track Deposits & Withdrawals</p></div>
        <div className="flex gap-2">
          <button onClick={() => setShowAnalysis(!showAnalysis)} className={`p-2 rounded-xl border ${showAnalysis ? 'bg-brand text-white' : 'bg-neutral-900 border-neutral-800'}`}><PieChart className="w-5 h-5" /></button>
          <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-xl border ${showFilters ? 'bg-brand text-white' : 'bg-neutral-900 border-neutral-800'}`}><Filter className="w-5 h-5" /></button>
        </div>
      </header>

      {showAnalysis && (
        <section className="mb-6 p-4 bg-gradient-to-br from-brand/20 to-purple-500/10 rounded-2xl border border-brand/20">
          <div className="flex items-center gap-2 mb-4"><TrendingUp className="w-5 h-5 text-brand" /><span className="text-white font-semibold">Analysis</span></div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-neutral-900/50 rounded-xl"><span className="text-neutral-400 text-xs">Total Accounts</span><p className="text-white font-bold text-xl">{accounts.length}</p></div>
            <div className="p-3 bg-neutral-900/50 rounded-xl"><span className="text-neutral-400 text-xs">Total Transactions</span><p className="text-white font-bold text-xl">{entries.length}</p></div>
          </div>
          <div className="space-y-2">{accountStats.slice(0, 5).map((acc, idx) => (<div key={idx} className="flex items-center justify-between p-2 bg-neutral-900/30 rounded-lg"><span className="text-white text-sm">{acc.name}</span><span className={`text-sm font-medium ${acc.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{acc.balance.toLocaleString()}</span></div>))}</div>
        </section>
      )}

      {showFilters && (
        <section className="mb-6 p-4 bg-neutral-900 rounded-2xl border border-neutral-800">
          <div className="flex items-center gap-2 mb-3"><Calendar className="w-4 h-4 text-neutral-400" /><span className="text-neutral-400 text-sm">Filter by Date</span></div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><label className="text-neutral-500 text-xs mb-1 block">Start Date</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2.5 bg-neutral-950 rounded-xl border border-neutral-800 text-white text-sm" /></div>
            <div><label className="text-neutral-500 text-xs mb-1 block">End Date</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-2.5 bg-neutral-950 rounded-xl border border-neutral-800 text-white text-sm" /></div>
          </div>
          <div className="flex gap-2"><button onClick={fetchData} className="flex-1 py-2 bg-brand text-white rounded-xl text-sm font-medium">Apply</button><button onClick={() => { setStartDate(''); setEndDate(''); }} className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-xl text-sm">Clear</button></div>
        </section>
      )}

      <section className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20"><div className="flex items-center gap-1.5 mb-1"><PlusCircle className="w-3.5 h-3.5 text-emerald-500" /><span className="text-emerald-500 text-xs">Deposit</span></div><p className="text-emerald-400 font-bold text-lg">{totalDeposits.toLocaleString()}</p></div>
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20"><div className="flex items-center gap-1.5 mb-1"><MinusCircle className="w-3.5 h-3.5 text-rose-500" /><span className="text-rose-500 text-xs">Withdrawal</span></div><p className="text-rose-400 font-bold text-lg">{totalWithdrawals.toLocaleString()}</p></div>
        <div className="p-4 rounded-2xl bg-brand/10 border border-brand/20"><div className="flex items-center gap-1.5 mb-1"><Wallet className="w-3.5 h-3.5 text-brand" /><span className="text-brand text-xs">Available</span></div><p className={`font-bold text-lg ${coins >= 0 ? 'text-white' : 'text-rose-400'}`}>{coins.toLocaleString()}</p></div>
      </section>

      <section className="space-y-4 mb-8">
        <div className="space-y-3">
          <div className="relative">
            <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} className="w-full p-4 bg-neutral-900 rounded-2xl border border-neutral-800 text-white appearance-none pr-12">
              <option value="">Select Account</option>
              {accounts.map(acc => (<option key={acc._id} value={acc._id}>{acc.name}</option>))}
            </select>
            <button onClick={() => setShowAddAccount(true)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand/20 text-brand rounded-lg"><Plus className="w-5 h-5" /></button>
          </div>
          {showAddAccount && (
            <div className="p-4 bg-neutral-900 rounded-2xl border border-brand/30 space-y-3">
              <input type="text" placeholder="New Account Name" value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} className="w-full p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-white" />
              <div className="flex gap-2">
                <button onClick={handleAddAccount} className="flex-1 py-2.5 bg-brand text-white rounded-xl font-medium">Add Account</button>
                <button onClick={() => { setShowAddAccount(false); setNewAccountName(''); }} className="px-4 py-2.5 bg-neutral-800 text-neutral-300 rounded-xl">Cancel</button>
              </div>
            </div>
          )}
          <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-4 bg-neutral-900 rounded-2xl border border-neutral-800 text-white" />
          <input type="text" placeholder="UTR / Reference No. (Optional)" value={utrNumber} onChange={(e) => setUtrNumber(e.target.value)} className="w-full p-4 bg-neutral-900 rounded-2xl border border-neutral-800 text-white" />
          <input type="text" placeholder="Description (Optional)" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-4 bg-neutral-900 rounded-2xl border border-neutral-800 text-white" />
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button onClick={() => handleEntry('deposit')} disabled={!selectedAccount || !amount} className="flex items-center justify-center gap-2 p-5 bg-emerald-500/10 text-emerald-500 rounded-2xl font-bold border border-emerald-500/20 disabled:opacity-50"><PlusCircle className="w-6 h-6" /> Deposit</button>
            <button onClick={() => handleEntry('withdrawal')} disabled={!selectedAccount || !amount} className="flex items-center justify-center gap-2 p-5 bg-rose-500/10 text-rose-500 rounded-2xl font-bold border border-rose-500/20 disabled:opacity-50"><MinusCircle className="w-6 h-6" /> Withdrawal</button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 mb-6">
        <button onClick={exportAccountSummary} className="flex items-center justify-center gap-2 p-3 bg-neutral-900 rounded-xl border border-neutral-800"><Download className="w-4 h-4 text-neutral-300" /><span className="text-neutral-300 text-sm">Account Summary</span></button>
        <button onClick={exportTransactionDetails} className="flex items-center justify-center gap-2 p-3 bg-neutral-900 rounded-xl border border-neutral-800"><Download className="w-4 h-4 text-neutral-300" /><span className="text-neutral-300 text-sm">Transactions</span></button>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4"><History className="w-5 h-5 text-neutral-500" /><h2 className="text-lg font-semibold text-white">Recent Transactions ({entries.length})</h2></div>
        <div className="space-y-3">
          {entries.length === 0 ? (<div className="flex flex-col items-center justify-center py-10 opacity-40"><AlertCircle className="w-10 h-10 mb-2" /><p>No transactions yet</p></div>) : (
            entries.slice(0, 10).map(entry => (
              <div key={entry._id} className="p-4 bg-neutral-900/40 rounded-2xl border border-neutral-800/50">
                {editingEntry === entry._id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="p-2 bg-neutral-950 rounded-lg border border-neutral-700 text-white text-sm" />
                      <input type="text" value={editUtr} onChange={(e) => setEditUtr(e.target.value)} placeholder="UTR No." className="p-2 bg-neutral-950 rounded-lg border border-neutral-700 text-white text-sm" />
                    </div>
                    <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full p-2 bg-neutral-950 rounded-lg border border-neutral-700 text-white text-sm" />
                    <div className="flex gap-2">
                      <button onClick={saveEdit} className="flex-1 flex items-center justify-center gap-1 py-2 bg-emerald-600 text-white rounded-lg text-sm"><Save className="w-4 h-4" /> Save</button>
                      <button onClick={() => setEditingEntry(null)} className="px-4 py-2 bg-neutral-700 text-white rounded-lg text-sm"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${entry.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        {entry.type === 'deposit' ? <PlusCircle className="w-5 h-5" /> : <MinusCircle className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-white font-medium">{entry.accountName}</p>
                        <p className="text-neutral-500 text-xs">{new Date(entry.createdAt).toLocaleDateString()} - {entry.description || '-'}</p>
                        {entry.utrNumber && <p className="text-neutral-400 text-xs">UTR: {entry.utrNumber}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className={`font-bold text-lg ${entry.type === 'deposit' ? 'text-emerald-400' : 'text-rose-400'}`}>{entry.type === 'deposit' ? '+' : '-'}{entry.amount.toLocaleString()}</p>
                      <button onClick={() => startEdit(entry)} className="p-1.5 text-neutral-400 hover:text-white rounded-lg"><Edit2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default App;
