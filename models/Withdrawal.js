const selectedBank = banks[parseInt(bankIndex)];

const body = {
  userId: "demo",  // change later when you add authentication
  amount: Number(amount),
  bankName: selectedBank.name,
  accountNumber: selectedBank.accountNumber,
  status: "pending",
};

const res = await fetch(`${API_BASE}/withdrawals`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const data = await res.json();
