"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type TxType = "income" | "outcome";
type TxField = "business" | "personal";
type Recurrence = "one-time" | "recurring";

type Transaction = {
  id: string;
  type: TxType;
  amount: number;
  field: TxField;
  recurrence: Recurrence;
  date: string;
  endDate: string | null;
  notes: string;
};

type Draft = Omit<Transaction, "id">;

const STORAGE_KEY = "money-planner-transactions";
const AUTH_KEY = "money-planner-authenticated";
const today = startOfDay(new Date());

const defaultDraft: Draft = {
  type: "income",
  amount: 0,
  field: "personal",
  recurrence: "one-time",
  date: toISODate(today),
  endDate: null,
  notes: "",
};

const seedTransactions: Transaction[] = [
  {
    id: "seed-salary",
    type: "income",
    amount: 14500,
    field: "business",
    recurrence: "recurring",
    date: toISODate(addDays(today, 3)),
    endDate: null,
    notes: "Monthly client retainer",
  },
  {
    id: "seed-rent",
    type: "outcome",
    amount: 5400,
    field: "personal",
    recurrence: "recurring",
    date: toISODate(addDays(today, -2)),
    endDate: null,
    notes: "Apartment rent",
  },
  {
    id: "seed-groceries",
    type: "outcome",
    amount: 420,
    field: "personal",
    recurrence: "one-time",
    date: toISODate(addDays(today, 1)),
    endDate: null,
    notes: "Groceries",
  },
  {
    id: "seed-project",
    type: "income",
    amount: 3200,
    field: "business",
    recurrence: "one-time",
    date: toISODate(addDays(today, 10)),
    endDate: null,
    notes: "Project milestone",
  },
];

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseISODate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parseISODate(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(parseISODate(value));
}

function currency(amount: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(amount);
}

function makeRange(before: number, after: number) {
  const dates: string[] = [];
  for (let offset = -before; offset <= after; offset += 1) {
    dates.push(toISODate(addDays(today, offset)));
  }
  return dates;
}

function occursOn(transaction: Transaction, isoDate: string) {
  if (transaction.recurrence === "one-time") {
    return transaction.date === isoDate;
  }

  const target = parseISODate(isoDate).getTime();
  const starts = parseISODate(transaction.date).getTime();
  const ends = transaction.endDate
    ? parseISODate(transaction.endDate).getTime()
    : Number.POSITIVE_INFINITY;

  if (target < starts || target > ends) {
    return false;
  }

  const startDate = parseISODate(transaction.date);
  const targetDate = parseISODate(isoDate);
  return startDate.getDate() === targetDate.getDate();
}

function getTransactionsForDate(transactions: Transaction[], isoDate: string) {
  return transactions.filter((transaction) => occursOn(transaction, isoDate));
}

function summarize(transactions: Transaction[]) {
  const income = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const outcome = transactions
    .filter((transaction) => transaction.type === "outcome")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return {
    income,
    outcome,
    net: income - outcome,
    count: transactions.length,
  };
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fieldFilter, setFieldFilter] = useState<"all" | TxField>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "incomes" | "outcomes">(
    "all",
  );
  const [beforeDays, setBeforeDays] = useState(5);
  const [afterDays, setAfterDays] = useState(25);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [modalMode, setModalMode] = useState<"closed" | "create" | "edit">(
    "closed",
  );
  const [draft, setDraft] = useState<Draft>(defaultDraft);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setIsAuthenticated(window.localStorage.getItem(AUTH_KEY) === "true");
    const stored = window.localStorage.getItem(STORAGE_KEY);
    setTransactions(stored ? JSON.parse(stored) : seedTransactions);
  }, []);

  useEffect(() => {
    if (transactions.length) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    }
  }, [transactions]);

  const visibleDates = useMemo(
    () => makeRange(beforeDays, afterDays),
    [beforeDays, afterDays],
  );

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const fieldMatches =
        fieldFilter === "all" || transaction.field === fieldFilter;
      const typeMatches =
        typeFilter === "all" ||
        (typeFilter === "incomes" && transaction.type === "income") ||
        (typeFilter === "outcomes" && transaction.type === "outcome");
      return fieldMatches && typeMatches;
    });
  }, [fieldFilter, transactions, typeFilter]);

  const datesForSummary = selectedDates.length ? selectedDates : visibleDates;
  const summaryTransactions = useMemo(() => {
    return datesForSummary.flatMap((date) =>
      getTransactionsForDate(filteredTransactions, date),
    );
  }, [datesForSummary, filteredTransactions]);
  const summary = summarize(summaryTransactions);
  const maxAmount = Math.max(
    1,
    ...filteredTransactions.map((transaction) => transaction.amount),
  );

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") || "");
    const password = String(formData.get("password") || "");

    if (username === "sagi" && password === "1727") {
      window.localStorage.setItem(AUTH_KEY, "true");
      setIsAuthenticated(true);
      setLoginError("");
      return;
    }

    setLoginError("Incorrect username or password.");
  }

  function openCreate(type: TxType) {
    setDraft({ ...defaultDraft, type });
    setEditingId(null);
    setModalMode("create");
  }

  function openEdit(transaction: Transaction) {
    setDraft({
      type: transaction.type,
      amount: transaction.amount,
      field: transaction.field,
      recurrence: transaction.recurrence,
      date: transaction.date,
      endDate: transaction.endDate,
      notes: transaction.notes,
    });
    setEditingId(transaction.id);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode("closed");
    setEditingId(null);
  }

  function saveTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanDraft = {
      ...draft,
      amount: Math.max(1, Number(draft.amount) || 1),
      endDate: draft.recurrence === "recurring" ? draft.endDate : null,
    };

    if (modalMode === "edit" && editingId) {
      setTransactions((current) =>
        current.map((transaction) =>
          transaction.id === editingId
            ? { ...cleanDraft, id: editingId }
            : transaction,
        ),
      );
    } else {
      setTransactions((current) => [
        ...current,
        { ...cleanDraft, id: crypto.randomUUID() },
      ]);
    }

    closeModal();
  }

  function deleteTransaction() {
    if (!editingId) {
      return;
    }
    setTransactions((current) =>
      current.filter((transaction) => transaction.id !== editingId),
    );
    closeModal();
  }

  function toggleDate(date: string) {
    setSelectedDates((current) =>
      current.includes(date)
        ? current.filter((selected) => selected !== date)
        : [...current, date],
    );
  }

  function zoom(delta: number) {
    setAfterDays((current) => Math.min(70, Math.max(7, current + delta)));
    setBeforeDays((current) => Math.min(20, Math.max(2, current + delta / 5)));
    setSelectedDates([]);
  }

  if (!isAuthenticated) {
    return (
      <main className="login-screen">
        <section className="login-panel" aria-label="Login">
          <p className="eyebrow">Money Planner</p>
          <h1>Sign in</h1>
          <form onSubmit={handleLogin} className="login-form">
            <label>
              Username
              <input name="username" autoComplete="username" />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
              />
            </label>
            {loginError ? <p className="form-error">{loginError}</p> : null}
            <button type="submit">Login</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="dashboard" aria-label="Money planning dashboard">
        <div className="matrix-panel">
          <header className="topbar">
            <div>
              <p className="eyebrow">Money Planner</p>
              <h1>Cash flow matrix</h1>
            </div>
            <button
              className="ghost-button"
              onClick={() => {
                window.localStorage.removeItem(AUTH_KEY);
                setIsAuthenticated(false);
              }}
            >
              Logout
            </button>
          </header>

          <div
            className="date-matrix"
            onWheel={(event) => {
              event.preventDefault();
              zoom(event.deltaY > 0 ? 5 : -5);
            }}
          >
            {visibleDates.map((date) => {
              const dayTransactions = getTransactionsForDate(
                filteredTransactions,
                date,
              );
              const isToday = date === toISODate(today);
              const isSelected = selectedDates.includes(date);

              return (
                <div
                  role="button"
                  tabIndex={0}
                  className={[
                    "date-column",
                    isToday ? "today" : "",
                    isSelected ? "selected" : "",
                  ].join(" ")}
                  key={date}
                  onClick={() => toggleDate(date)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggleDate(date);
                    }
                  }}
                >
                  <span className="date-label">{formatShortDate(date)}</span>
                  <span className="weekday">
                    {new Intl.DateTimeFormat("en-US", {
                      weekday: "short",
                    }).format(parseISODate(date))}
                  </span>
                  <span className="candle-stack">
                    {dayTransactions.map((transaction) => {
                      const height = 28 + (transaction.amount / maxAmount) * 92;
                      return (
                        <button
                          type="button"
                          key={`${transaction.id}-${date}`}
                          className={`candle ${transaction.type}`}
                          style={{ height }}
                          onClick={(event) => {
                            event.stopPropagation();
                            openEdit(transaction);
                          }}
                          title={`${transaction.notes || transaction.type}: ${currency(transaction.amount)}`}
                        />
                      );
                    })}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="axis-controls" aria-label="Date zoom controls">
            <button type="button" onClick={() => zoom(-5)}>
              Zoom in
            </button>
            <span>
              {formatDate(visibleDates[0])} -{" "}
              {formatDate(visibleDates[visibleDates.length - 1])}
            </span>
            <button type="button" onClick={() => zoom(5)}>
              Zoom out
            </button>
          </div>
        </div>

        <aside className="side-panel" aria-label="Summary and actions">
          <div>
            <p className="eyebrow">
              {selectedDates.length ? "Selected dates" : "Visible range"}
            </p>
            <h2>{currency(summary.net)}</h2>
            <p className="muted">
              {summary.count} transaction{summary.count === 1 ? "" : "s"}
            </p>
          </div>

          <div className="summary-grid">
            <span>Income</span>
            <strong className="positive">{currency(summary.income)}</strong>
            <span>Outcome</span>
            <strong className="negative">{currency(summary.outcome)}</strong>
          </div>

          <div className="actions">
            <button type="button" onClick={() => openCreate("income")}>
              Add income
            </button>
            <button type="button" onClick={() => openCreate("outcome")}>
              Add outcome
            </button>
          </div>

          <div className="filters">
            <label>
              Field
              <select
                value={fieldFilter}
                onChange={(event) =>
                  setFieldFilter(event.target.value as "all" | TxField)
                }
              >
                <option value="all">All</option>
                <option value="business">Business</option>
                <option value="personal">Personal</option>
              </select>
            </label>
            <label>
              Out/In
              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(
                    event.target.value as "all" | "incomes" | "outcomes",
                  )
                }
              >
                <option value="all">All</option>
                <option value="incomes">Incomes</option>
                <option value="outcomes">Outcomes</option>
              </select>
            </label>
          </div>
        </aside>
      </section>

      {selectedDates.length ? (
        <button className="floating-clear" onClick={() => setSelectedDates([])}>
          Deselect dates
        </button>
      ) : null}

      {modalMode !== "closed" ? (
        <div className="modal-backdrop" role="presentation">
          <section className="transaction-modal" aria-label="Transaction form">
            <header>
              <div>
                <p className="eyebrow">
                  {modalMode === "edit" ? "Edit transaction" : "New transaction"}
                </p>
                <h2>{modalMode === "edit" ? "Update candle" : "Add candle"}</h2>
              </div>
              <button className="icon-button" onClick={closeModal} type="button">
                x
              </button>
            </header>

            <form onSubmit={saveTransaction} className="transaction-form">
              <div className="switch-row">
                <button
                  type="button"
                  className={draft.type === "income" ? "active" : ""}
                  onClick={() => setDraft((current) => ({ ...current, type: "income" }))}
                >
                  Income
                </button>
                <button
                  type="button"
                  className={draft.type === "outcome" ? "active" : ""}
                  onClick={() => setDraft((current) => ({ ...current, type: "outcome" }))}
                >
                  Outcome
                </button>
              </div>

              <label className="amount-label">
                Amount in ₪
                <input
                  type="number"
                  min="1"
                  value={draft.amount || ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      amount: Number(event.target.value),
                    }))
                  }
                  required
                />
              </label>

              <div className="form-grid">
                <label>
                  Field
                  <select
                    value={draft.field}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        field: event.target.value as TxField,
                      }))
                    }
                  >
                    <option value="personal">Personal</option>
                    <option value="business">Business</option>
                  </select>
                </label>
                <label>
                  Frequency
                  <select
                    value={draft.recurrence}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        recurrence: event.target.value as Recurrence,
                      }))
                    }
                  >
                    <option value="one-time">One time</option>
                    <option value="recurring">Recurring</option>
                  </select>
                </label>
                <label>
                  Transaction date
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        date: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                {draft.recurrence === "recurring" ? (
                  <label>
                    End date
                    <input
                      type="date"
                      value={draft.endDate || ""}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          endDate: event.target.value || null,
                        }))
                      }
                    />
                  </label>
                ) : (
                  <div className="no-end">No end date</div>
                )}
              </div>

              <label>
                Notes
                <textarea
                  value={draft.notes}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  rows={3}
                />
              </label>

              <footer>
                {modalMode === "edit" ? (
                  <button
                    className="danger-button"
                    onClick={deleteTransaction}
                    type="button"
                  >
                    Delete
                  </button>
                ) : (
                  <span />
                )}
                <button type="submit">Finish</button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
