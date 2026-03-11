// Use environment variable or fallback to local
const API_URL = import.meta.env.VITE_API_URL || 'https://hisab-server.onrender.com/api';

export async function getAccounts() {
  const res = await fetch(`${API_URL}/accounts`);
  return res.json();
}

export async function addAccount(name) {
  const res = await fetch(`${API_URL}/accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  return res.json();
}

export async function getEntries(startDate, endDate) {
  let url = `${API_URL}/entries`;
  if (startDate || endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    url += `?${params}`;
  }
  const res = await fetch(url);
  return res.json();
}

export async function addEntry(data) {
  const res = await fetch(`${API_URL}/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function updateEntry(id, data) {
  const res = await fetch(`${API_URL}/entries/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}
