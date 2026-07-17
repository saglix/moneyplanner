"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Minus,
  Plus,
  UserRound,
} from "lucide-react";

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
type Account = {
  id: string;
  username: string;
  email: string;
  password: string;
  role: "admin" | "user";
};

const STORAGE_KEY = "money-planner-transactions-v2";
const AUTH_KEY = "money-planner-authenticated";
const ACCOUNT_KEY = "money-planner-account";
const USERS_KEY = "money-planner-users";
const defaultAccount: Account = {
  id: "user-sagi",
  username: "sagi",
  email: "",
  password: "1727",
  role: "admin",
};
const today = startOfDay(new Date());
const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
const defaultVisibleDayCount =
  Math.round(
    (addDays(today, 25).getTime() - currentMonthStart.getTime()) /
      (1000 * 60 * 60 * 24),
  ) + 1;

const defaultDraft: Draft = {
  type: "income",
  amount: 0,
  field: "personal",
  recurrence: "one-time",
  date: toISODate(today),
  endDate: null,
  notes: "",
};

const seedTransactions: Transaction[] = [];

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
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function getMonthTitle(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
  }).format(parseISODate(value));
}

function getCalendarDays(monthDate: Date) {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const firstGridDate = addDays(firstOfMonth, -firstOfMonth.getDay());
  return Array.from({ length: 42 }, (_, index) => addDays(firstGridDate, index));
}

function currency(amount: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(amount);
}

function makeRange(startDate: Date, dayCount: number) {
  const dates: string[] = [];
  for (let offset = 0; offset < dayCount; offset += 1) {
    dates.push(toISODate(addDays(startDate, offset)));
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

function getDayTooltip(date: string, transactions: Transaction[]) {
  if (!transactions.length) {
    return `${formatDate(date)}\nNo transactions`;
  }

  const incomeLines = transactions
    .filter((transaction) => transaction.type === "income")
    .map(
      (transaction) =>
        `+ ${currency(transaction.amount)}${transaction.notes ? ` - ${transaction.notes}` : ""}`,
    );
  const outcomeLines = transactions
    .filter((transaction) => transaction.type === "outcome")
    .map(
      (transaction) =>
        `- ${currency(transaction.amount)}${transaction.notes ? ` - ${transaction.notes}` : ""}`,
    );
  const summary = summarize(transactions);

  return [
    formatDate(date),
    incomeLines.length ? "Incomes:" : "",
    ...incomeLines,
    outcomeLines.length ? "Outcomes:" : "",
    ...outcomeLines,
    `Net: ${currency(summary.net)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function DatePicker({
  label,
  value,
  onChange,
  allowClear = false,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  allowClear?: boolean;
}) {
  const selectedDate = value ? parseISODate(value) : today;
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );
  const calendarDays = useMemo(() => getCalendarDays(viewDate), [viewDate]);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function shiftMonth(delta: number) {
    setViewDate((current) => {
      return new Date(current.getFullYear(), current.getMonth() + delta, 1);
    });
  }

  function selectDate(date: Date) {
    onChange(toISODate(date));
    setIsOpen(false);
  }

  return (
    <label className="date-picker-field">
      {label}
      <button
        type="button"
        className="date-picker-trigger"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>{value ? formatDate(value) : "No end date"}</span>
        <Calendar aria-hidden="true" size={18} strokeWidth={1.8} />
      </button>

      {isOpen ? (
        <div className="date-popover">
          <div className="calendar-header">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => shiftMonth(-1)}
            >
              <ChevronLeft aria-hidden="true" size={17} strokeWidth={1.8} />
            </button>
            <strong>{getMonthTitle(viewDate)}</strong>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => shiftMonth(1)}
            >
              <ChevronRight aria-hidden="true" size={17} strokeWidth={1.8} />
            </button>
          </div>

          <div className="calendar-grid">
            {weekDays.map((day) => (
              <span className="calendar-weekday" key={day}>
                {day}
              </span>
            ))}
            {calendarDays.map((date) => {
              const isoDate = toISODate(date);
              const isSelected = value === isoDate;
              const isCurrentMonth = date.getMonth() === viewDate.getMonth();
              const isCurrentDay = isoDate === toISODate(today);

              return (
                <button
                  type="button"
                  className={[
                    "calendar-day",
                    isSelected ? "selected" : "",
                    isCurrentMonth ? "" : "muted-day",
                    isCurrentDay ? "current-day" : "",
                  ].join(" ")}
                  key={isoDate}
                  onClick={() => selectDate(date)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="calendar-footer">
            {allowClear ? (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                }}
              >
                Clear
              </button>
            ) : (
              <span />
            )}
            <button type="button" onClick={() => selectDate(today)}>
              Today
            </button>
          </div>
        </div>
      ) : null}
    </label>
  );
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [users, setUsers] = useState<Account[]>([defaultAccount]);
  const [currentUserId, setCurrentUserId] = useState(defaultAccount.id);
  const [accountDraft, setAccountDraft] = useState({
    username: defaultAccount.username,
    email: defaultAccount.email,
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [newUserDraft, setNewUserDraft] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [userModalMode, setUserModalMode] = useState<"closed" | "create" | "edit">(
    "closed",
  );
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [userMessage, setUserMessage] = useState("");
  const [userError, setUserError] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [accountError, setAccountError] = useState("");
  const [view, setView] = useState<"dashboard" | "account">("dashboard");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fieldFilter, setFieldFilter] = useState<"all" | TxField>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "incomes" | "outcomes">(
    "all",
  );
  const [visibleDayCount, setVisibleDayCount] = useState(
    defaultVisibleDayCount,
  );
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [modalMode, setModalMode] = useState<"closed" | "create" | "edit">(
    "closed",
  );
  const [draft, setDraft] = useState<Draft>(defaultDraft);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const storedUsers = window.localStorage.getItem(USERS_KEY);
    const storedAccount = window.localStorage.getItem(ACCOUNT_KEY);
    const migratedAccount = storedAccount
      ? { ...defaultAccount, ...JSON.parse(storedAccount), role: "admin" as const }
      : defaultAccount;
    const nextUsers: Account[] = storedUsers
      ? JSON.parse(storedUsers)
      : [migratedAccount];
    const normalizedUsers = nextUsers.some((user) => user.username === "sagi")
      ? nextUsers.map((user) =>
          user.username === "sagi" ? { ...user, role: "admin" as const } : user,
        )
      : [defaultAccount, ...nextUsers];
    const storedAuth = window.localStorage.getItem(AUTH_KEY);
    const nextCurrentUser =
      normalizedUsers.find((user) => user.id === storedAuth) ||
      (storedAuth === "true"
        ? normalizedUsers.find((user) => user.username === "sagi")
        : null);

    setUsers(normalizedUsers);
    if (nextCurrentUser) {
      setCurrentUserId(nextCurrentUser.id);
      setIsAuthenticated(true);
      setAccountDraft((current) => ({
        ...current,
        username: nextCurrentUser.username,
        email: nextCurrentUser.email,
      }));
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    setTransactions(stored ? JSON.parse(stored) : seedTransactions);
  }, []);

  useEffect(() => {
    if (transactions.length) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    }
  }, [transactions]);

  useEffect(() => {
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }, [users]);

  const visibleDates = useMemo(
    () => makeRange(currentMonthStart, visibleDayCount),
    [visibleDayCount],
  );
  const monthGroups = useMemo(() => {
    return visibleDates.reduce<Array<{ month: string; span: number }>>(
      (groups, date) => {
        const month = formatMonth(date);
        const lastGroup = groups[groups.length - 1];

        if (lastGroup?.month === month) {
          lastGroup.span += 1;
        } else {
          groups.push({ month, span: 1 });
        }

        return groups;
      },
      [],
    );
  }, [visibleDates]);

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
  const currentUser =
    users.find((user) => user.id === currentUserId) || defaultAccount;
  const isAdmin = currentUser.role === "admin";

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") || "");
    const password = String(formData.get("password") || "");

    const matchedUser = users.find(
      (user) => user.username === username && user.password === password,
    );

    if (matchedUser) {
      window.localStorage.setItem(AUTH_KEY, matchedUser.id);
      setCurrentUserId(matchedUser.id);
      setAccountDraft((current) => ({
        ...current,
        username: matchedUser.username,
        email: matchedUser.email,
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      setIsAuthenticated(true);
      setView("dashboard");
      setLoginError("");
      return;
    }

    setLoginError("Incorrect username or password.");
  }

  function openCreate(
    type: TxType,
    date = toISODate(today),
    field: TxField = defaultDraft.field,
  ) {
    setDraft({ ...defaultDraft, type, date, field });
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
    setVisibleDayCount((current) => Math.min(90, Math.max(14, current + delta)));
    setSelectedDates([]);
  }

  function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountMessage("");
    setAccountError("");

    const wantsPasswordChange =
      accountDraft.oldPassword ||
      accountDraft.newPassword ||
      accountDraft.confirmPassword;

    if (!accountDraft.username.trim()) {
      setAccountError("Username cannot be empty.");
      return;
    }

    if (
      users.some(
        (user) =>
          user.id !== currentUser.id &&
          user.username.toLowerCase() === accountDraft.username.trim().toLowerCase(),
      )
    ) {
      setAccountError("Username is already taken.");
      return;
    }

    if (wantsPasswordChange) {
      if (accountDraft.oldPassword !== currentUser.password) {
        setAccountError("Old password is incorrect.");
        return;
      }

      if (accountDraft.newPassword.length < 4) {
        setAccountError("New password must be at least 4 characters.");
        return;
      }

      if (accountDraft.newPassword !== accountDraft.confirmPassword) {
        setAccountError("New passwords do not match.");
        return;
      }
    }

    setUsers((current) =>
      current.map((user) =>
        user.id === currentUser.id
          ? {
              ...user,
              username: accountDraft.username.trim(),
              email: accountDraft.email.trim(),
              password: wantsPasswordChange
                ? accountDraft.newPassword
                : user.password,
            }
          : user,
      ),
    );
    setAccountDraft((current) => ({
      ...current,
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    }));
    setAccountMessage("Account details updated.");
  }

  function openCreateUser() {
    setNewUserDraft({
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
    setEditingUserId(null);
    setUserModalMode("create");
    setUserMessage("");
    setUserError("");
  }

  function openEditUser(user: Account) {
    setNewUserDraft({
      username: user.username,
      email: user.email,
      password: "",
      confirmPassword: "",
    });
    setEditingUserId(user.id);
    setUserModalMode("edit");
    setUserMessage("");
    setUserError("");
  }

  function closeUserModal() {
    setUserModalMode("closed");
    setEditingUserId(null);
    setUserError("");
  }

  function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUserMessage("");
    setUserError("");

    const username = newUserDraft.username.trim();
    const email = newUserDraft.email.trim();
    const isEditing = userModalMode === "edit" && editingUserId;
    const editingUser = users.find((user) => user.id === editingUserId);
    const wantsPasswordChange =
      newUserDraft.password || newUserDraft.confirmPassword;

    if (!isAdmin) {
      setUserError("Only admins can manage users.");
      return;
    }

    if (!username) {
      setUserError("Username cannot be empty.");
      return;
    }

    if (
      users.some(
        (user) =>
          user.id !== editingUserId &&
          user.username.toLowerCase() === username.toLowerCase(),
      )
    ) {
      setUserError("Username is already taken.");
      return;
    }

    if (!isEditing && newUserDraft.password.length < 4) {
      setUserError("Password must be at least 4 characters.");
      return;
    }

    if (wantsPasswordChange && newUserDraft.password.length < 4) {
      setUserError("Password must be at least 4 characters.");
      return;
    }

    if (wantsPasswordChange && newUserDraft.password !== newUserDraft.confirmPassword) {
      setUserError("Passwords do not match.");
      return;
    }

    if (isEditing && editingUser) {
      setUsers((current) =>
        current.map((user) =>
          user.id === editingUser.id
            ? {
                ...user,
                username,
                email,
                password: wantsPasswordChange
                  ? newUserDraft.password
                  : user.password,
              }
            : user,
        ),
      );
      if (editingUser.id === currentUser.id) {
        setAccountDraft((current) => ({
          ...current,
          username,
          email,
        }));
      }
      setUserMessage("User updated.");
    } else {
      setUsers((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          username,
          email,
          password: newUserDraft.password,
          role: "user",
        },
      ]);
      setUserMessage("User created.");
    }

    setNewUserDraft({
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
    closeUserModal();
  }

  function confirmDeleteUser() {
    if (!deletingUserId) {
      return;
    }

    if (deletingUserId === currentUser.id) {
      setUserError("You cannot delete the user you are signed in as.");
      setDeletingUserId(null);
      return;
    }

    setUsers((current) => current.filter((user) => user.id !== deletingUserId));
    setDeletingUserId(null);
    setUserMessage("User deleted.");
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
      <section
        className={`dashboard ${view === "account" ? "account-mode" : ""}`}
        aria-label="Money planning dashboard"
      >
        <div className="matrix-panel">
          <header className="topbar">
            <div>
              <p className="eyebrow">Money Planner</p>
              <h1>Cash flow matrix</h1>
            </div>
            <div className="topbar-actions">
              <button
                className="icon-soft-button"
                aria-label="Account details"
                onClick={() => {
                  setView("account");
                  setAccountDraft({
                    username: currentUser.username,
                    email: currentUser.email,
                    oldPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  });
                  setAccountMessage("");
                  setAccountError("");
                  setUserMessage("");
                  setUserError("");
                }}
              >
                <UserRound aria-hidden="true" size={18} strokeWidth={1.8} />
              </button>
              <button
                className="ghost-button"
                onClick={() => {
                  window.localStorage.removeItem(AUTH_KEY);
                  setIsAuthenticated(false);
                  setView("dashboard");
                }}
              >
                Logout
              </button>
            </div>
          </header>

          {view === "account" ? (
            <section className="account-view" aria-label="Account details">
              <div className="account-card">
                <div>
                  <p className="eyebrow">Account</p>
                  <h2>Details</h2>
                </div>
                <form className="account-form" onSubmit={saveAccount}>
                  <div className="form-grid">
                    <label>
                      Username
                      <input
                        value={accountDraft.username}
                        onChange={(event) =>
                          setAccountDraft((current) => ({
                            ...current,
                            username: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      Email
                      <input
                        type="email"
                        value={accountDraft.email}
                        onChange={(event) =>
                          setAccountDraft((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      Old password
                      <input
                        type="password"
                        value={accountDraft.oldPassword}
                        onChange={(event) =>
                          setAccountDraft((current) => ({
                            ...current,
                            oldPassword: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      New password
                      <input
                        type="password"
                        value={accountDraft.newPassword}
                        onChange={(event) =>
                          setAccountDraft((current) => ({
                            ...current,
                            newPassword: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      New password again
                      <input
                        type="password"
                        value={accountDraft.confirmPassword}
                        onChange={(event) =>
                          setAccountDraft((current) => ({
                            ...current,
                            confirmPassword: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                  {accountError ? <p className="form-error">{accountError}</p> : null}
                  {accountMessage ? (
                    <p className="form-success">{accountMessage}</p>
                  ) : null}
                  <footer>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setView("dashboard")}
                    >
                      Back
                    </button>
                    <button type="submit">Save changes</button>
                  </footer>
                </form>
                {isAdmin ? (
                  <section className="users-block" aria-label="Users">
                    <div>
                      <p className="eyebrow">Admin</p>
                      <h3>Users</h3>
                    </div>
                    <button
                      type="button"
                      className="create-user-button"
                      onClick={openCreateUser}
                    >
                      <Plus aria-hidden="true" size={15} strokeWidth={1.9} />
                      Create user
                    </button>
                    <div className="user-list">
                      {users.map((user) => (
                        <div className="user-row" key={user.id}>
                          <div>
                            <span>{user.username}</span>
                            <small>
                              {user.email || "No email"} · {user.role}
                            </small>
                          </div>
                          <div className="user-row-actions">
                            <button
                              type="button"
                              aria-label={`Edit ${user.username}`}
                              onClick={() => openEditUser(user)}
                            >
                              <Pencil aria-hidden="true" size={15} strokeWidth={1.8} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete ${user.username}`}
                              onClick={() => {
                                setDeletingUserId(user.id);
                                setUserError("");
                                setUserMessage("");
                              }}
                              disabled={user.id === currentUser.id}
                            >
                              <Trash2 aria-hidden="true" size={15} strokeWidth={1.8} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {userError ? <p className="form-error">{userError}</p> : null}
                    {userMessage ? (
                      <p className="form-success">{userMessage}</p>
                    ) : null}
                  </section>
                ) : null}
              </div>
            </section>
          ) : (
            <>

          <div
            className="matrix-calendar"
            onWheel={(event) => {
              event.preventDefault();
              zoom(event.deltaY > 0 ? 5 : -5);
            }}
          >
            <div
              className="month-row"
              style={{
                gridTemplateColumns: `repeat(${visibleDates.length}, minmax(0, 1fr))`,
              }}
            >
              {monthGroups.map((group) => (
                <span
                  className="month-label"
                  key={group.month}
                  style={{ gridColumn: `span ${group.span}` }}
                >
                  {group.month}
                </span>
              ))}
            </div>

            <div
              className="date-matrix"
              style={{
                gridTemplateColumns: `repeat(${visibleDates.length}, minmax(0, 1fr))`,
              }}
            >
              {visibleDates.map((date) => {
                const dayTransactions = getTransactionsForDate(
                  filteredTransactions,
                  date,
                );
                const dayTooltip = getDayTooltip(date, dayTransactions);
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
                    <span className="date-label">
                      {parseISODate(date).getDate().toString().padStart(2, "0")}
                    </span>
                    <button
                      type="button"
                      className="day-add-button"
                      aria-label={`Add transaction on ${formatDate(date)}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        openCreate("income", date, "business");
                      }}
                    >
                      +
                    </button>
                    <span className="candle-stack">
                      {dayTransactions.length ? (
                        <span className="day-tooltip" role="tooltip">
                          {dayTooltip.split("\n").map((line) => (
                            <span key={line}>{line}</span>
                          ))}
                        </span>
                      ) : null}
                      {dayTransactions.map((transaction) => {
                        const height =
                          92 + (transaction.amount / maxAmount) * 340;
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
                        />
                      );
                    })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="axis-controls" aria-label="Date zoom controls">
            <button
              type="button"
              className="zoom-button"
              aria-label="Zoom in"
              onClick={() => zoom(-5)}
            >
              <Plus aria-hidden="true" size={18} strokeWidth={1.8} />
            </button>
            <span>
              {formatDate(visibleDates[0])} -{" "}
              {formatDate(visibleDates[visibleDates.length - 1])}
            </span>
            <button
              type="button"
              className="zoom-button"
              aria-label="Zoom out"
              onClick={() => zoom(5)}
            >
              <Minus aria-hidden="true" size={18} strokeWidth={1.8} />
            </button>
          </div>
            </>
          )}
        </div>

        {view === "dashboard" ? (
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
              <Plus aria-hidden="true" size={15} strokeWidth={1.9} />
              Add income
            </button>
            <button type="button" onClick={() => openCreate("outcome")}>
              <Minus aria-hidden="true" size={15} strokeWidth={1.9} />
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
        ) : null}
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
                <DatePicker
                  label="Transaction date"
                  value={draft.date}
                  onChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      date: value || toISODate(today),
                    }))
                  }
                />
                {draft.recurrence === "recurring" ? (
                  <DatePicker
                    label="End date"
                    value={draft.endDate}
                    allowClear
                    onChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        endDate: value,
                      }))
                    }
                  />
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

      {userModalMode !== "closed" ? (
        <div className="modal-backdrop" role="presentation">
          <section className="user-modal" aria-label="User form">
            <header>
              <div>
                <p className="eyebrow">
                  {userModalMode === "edit" ? "Edit user" : "New user"}
                </p>
                <h2>{userModalMode === "edit" ? "Update user" : "Create user"}</h2>
              </div>
              <button
                className="icon-button"
                onClick={closeUserModal}
                type="button"
              >
                x
              </button>
            </header>
            <form className="create-user-form" onSubmit={saveUser}>
              <div className="form-grid">
                <label>
                  Username
                  <input
                    value={newUserDraft.username}
                    onChange={(event) =>
                      setNewUserDraft((current) => ({
                        ...current,
                        username: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={newUserDraft.email}
                    onChange={(event) =>
                      setNewUserDraft((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    placeholder={
                      userModalMode === "edit" ? "Leave blank to keep" : ""
                    }
                    value={newUserDraft.password}
                    onChange={(event) =>
                      setNewUserDraft((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Password again
                  <input
                    type="password"
                    value={newUserDraft.confirmPassword}
                    onChange={(event) =>
                      setNewUserDraft((current) => ({
                        ...current,
                        confirmPassword: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              {userError ? <p className="form-error">{userError}</p> : null}
              <footer>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeUserModal}
                >
                  Cancel
                </button>
                <button type="submit">
                  {userModalMode === "edit" ? "Save user" : "Create user"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}

      {deletingUserId ? (
        <div className="modal-backdrop" role="presentation">
          <section className="confirm-modal" aria-label="Confirm delete user">
            <p className="eyebrow">Delete user</p>
            <h2>
              Delete{" "}
              {users.find((user) => user.id === deletingUserId)?.username ||
                "this user"}
              ?
            </h2>
            <p className="muted">
              This removes the user from this planner on this device.
            </p>
            <footer>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setDeletingUserId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="danger-confirm-button"
                onClick={confirmDeleteUser}
              >
                Delete user
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </main>
  );
}
