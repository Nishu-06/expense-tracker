const API_URL = "/api/expenses";
const CATEGORIES = ["Food", "Travel", "Shopping", "Bills", "Entertainment", "Other"];
const CATEGORY_ICONS = { Food: "🍽", Travel: "✈", Shopping: "🛍", Bills: "▤", Entertainment: "♫", Other: "◈" };
const form = document.querySelector("#expense-form");
const titleInput = document.querySelector("#title");
const amountInput = document.querySelector("#amount");
const categoryInput = document.querySelector("#category");
const expenseDateInput = document.querySelector("#expense-date");
const submitButton = document.querySelector("#submit-button");
const cancelEditButton = document.querySelector("#cancel-edit");
const formMessage = document.querySelector("#form-message");
const expenseRows = document.querySelector("#expense-rows");
const refreshButton = document.querySelector("#refresh-button");
let editingId = null;
let expenses = [];

function formatMoney(value) {
  const amount = Number(value);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number.isFinite(amount) ? amount : 0);
}

function formatExpenseDate(value) {
  if (!value) return "—";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(year, month - 1, day));
}

function setExpenseDateToToday() {
  const today = new Date();
  expenseDateInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function showFormMessage(message = "", type = "error") {
  formMessage.textContent = message;
  formMessage.classList.toggle("success", type === "success");
}

function setFormBusy(busy) {
  submitButton.disabled = busy;
  submitButton.innerHTML = busy ? '<span class="spinner"></span> Saving…' : editingId ? 'Update expense <span>→</span>' : 'Save expense <span>→</span>';
  submitButton.style.opacity = busy ? ".7" : "1";
}

function enterEditMode(expense) {
  editingId = expense.id;
  titleInput.value = expense.title ?? "";
  amountInput.value = expense.amount ?? "";
  categoryInput.value = expense.category ?? "";
  expenseDateInput.value = expense.expenseDate ?? "";
  document.querySelector("#form-heading").textContent = "Edit expense";
  cancelEditButton.classList.remove("hidden");
  showFormMessage(`Editing expense #${expense.id}.`, "success");
  document.querySelector("#add-expense").scrollIntoView({ behavior: "smooth", block: "center" });
  titleInput.focus({ preventScroll: true });
}

function resetForm() {
  editingId = null;
  form.reset();
  setExpenseDateToToday();
  document.querySelector("#form-heading").textContent = "Add an expense";
  cancelEditButton.classList.add("hidden");
  showFormMessage();
  setFormBusy(false);
}

function renderSummary() {
  const total = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const highest = expenses.reduce((max, expense) => Number(expense.amount || 0) > Number(max?.amount || 0) ? expense : max, null);
  document.querySelector("#total-expenses").textContent = formatMoney(total);
  document.querySelector("#transaction-count").textContent = expenses.length.toLocaleString("en-IN");
  document.querySelector("#highest-expense").textContent = highest ? formatMoney(highest.amount) : formatMoney(0);
  document.querySelector("#highest-expense-title").textContent = highest ? highest.title : "No expenses recorded yet";
  document.querySelector("#table-count").textContent = `${expenses.length} ${expenses.length === 1 ? "record" : "records"}`;
  document.querySelector("#table-summary").textContent = expenses.length ? `Showing ${expenses.length} expense${expenses.length === 1 ? "" : "s"} from your account` : "Your expense history is ready when you are";
  renderCategories();
}

function renderCategories() {
  const totals = new Map(CATEGORIES.map((category) => [category, { amount: 0, count: 0 }]));
  expenses.forEach((expense) => {
    const key = CATEGORIES.includes(expense.category) ? expense.category : "Other";
    const item = totals.get(key);
    item.amount += Number(expense.amount || 0);
    item.count += 1;
  });
  const populated = CATEGORIES.filter((category) => totals.get(category).count > 0);
  document.querySelector("#category-list").innerHTML = populated.length ? populated.map((category) => {
    const item = totals.get(category);
    return `<div class="category-item"><span class="category-emoji" aria-hidden="true">${CATEGORY_ICONS[category]}</span><div><div class="category-name">${category}</div><div class="category-meta">${item.count} ${item.count === 1 ? "expense" : "expenses"}</div></div><span class="category-total">${formatMoney(item.amount)}</span></div>`;
  }).join("") : '<div class="category-empty">No category totals yet. Add an expense to get started.</div>';
}

function renderRows() {
  if (!expenses.length) {
    expenseRows.innerHTML = '<tr><td colspan="6" class="empty-cell">No expenses yet. Add your first expense above.</td></tr>';
    return;
  }
  const ordered = [...expenses].sort((a, b) => Number(b.id) - Number(a.id));
  expenseRows.innerHTML = ordered.map((expense) => {
    const category = CATEGORIES.includes(expense.category) ? expense.category : "Other";
    const categoryClass = category.toLowerCase();
    return `<tr>
      <td class="id-cell">#${escapeHtml(expense.id)}</td>
      <td class="title-cell">${escapeHtml(expense.title)}</td>
      <td class="amount-cell">${formatMoney(expense.amount)}</td>
      <td><span class="category-badge ${categoryClass}">${escapeHtml(category)}</span></td>
      <td>${escapeHtml(formatExpenseDate(expense.expenseDate))}</td>
      <td><div class="actions-cell"><button class="action-button" type="button" data-action="edit" data-id="${escapeHtml(expense.id)}" aria-label="Edit ${escapeHtml(expense.title)}" title="Edit">✎</button><button class="action-button delete" type="button" data-action="delete" data-id="${escapeHtml(expense.id)}" aria-label="Delete ${escapeHtml(expense.title)}" title="Delete">⌫</button></div></td>
    </tr>`;
  }).join("");
}

async function loadExpenses() {
  refreshButton.disabled = true;
  refreshButton.innerHTML = '<span class="spinner"></span><span>Loading</span>';
  expenseRows.innerHTML = '<tr><td colspan="6" class="loading-cell"><span class="spinner"></span>Loading your expenses…</td></tr>';
  try {
    const response = await fetch(API_URL, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Could not load expenses (HTTP ${response.status}).`);
    const payload = await response.json();
    if (!Array.isArray(payload)) throw new Error("The expenses API returned an unexpected response.");
    expenses = payload;
    renderSummary();
    renderRows();
  } catch (error) {
    expenseRows.innerHTML = `<tr><td colspan="6" class="empty-cell">${escapeHtml(error.message || "Unable to load expenses.")} Check that the Spring Boot app is running, then refresh.</td></tr>`;
    document.querySelector("#total-expenses").textContent = "—";
    document.querySelector("#transaction-count").textContent = "—";
    document.querySelector("#highest-expense").textContent = "—";
    document.querySelector("#category-list").innerHTML = '<div class="category-empty">Could not load category totals.</div>';
  } finally {
    refreshButton.disabled = false;
    refreshButton.innerHTML = '↻ <span>Refresh</span>';
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const expense = { title: titleInput.value.trim(), amount: Number(amountInput.value), category: categoryInput.value, expenseDate: expenseDateInput.value };
  if (!expense.title || !Number.isFinite(expense.amount) || expense.amount <= 0 || !CATEGORIES.includes(expense.category) || !expense.expenseDate) {
    showFormMessage("Enter a title, a positive amount, choose a category, and select a date.");
    return;
  }
  const wasEditing = editingId !== null;
  setFormBusy(true);
  showFormMessage();
  try {
    const url = editingId === null ? API_URL : `${API_URL}/${encodeURIComponent(editingId)}`;
    const response = await fetch(url, { method: editingId === null ? "POST" : "PUT", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(expense) });
    if (!response.ok) throw new Error(`Could not ${editingId === null ? "save" : "update"} expense (HTTP ${response.status}).`);
    resetForm();
    await loadExpenses();
    showFormMessage(wasEditing ? "Expense updated successfully." : "Expense saved successfully.", "success");
  } catch (error) {
    showFormMessage(`${error.message || "Unable to save expense."} Please try again.`);
    setFormBusy(false);
  }
});

expenseRows.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const id = button.dataset.id;
  if (button.dataset.action === "edit") {
    button.disabled = true;
    try {
      const response = await fetch(`${API_URL}/${encodeURIComponent(id)}`, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`Could not fetch expense (HTTP ${response.status}).`);
      enterEditMode(await response.json());
    } catch (error) {
      window.alert(`${error.message || "Could not load this expense."} Please refresh and try again.`);
    } finally {
      button.disabled = false;
    }
  } else if (button.dataset.action === "delete") {
    const expense = expenses.find((item) => String(item.id) === String(id));
    if (!window.confirm(`Delete “${expense?.title || `expense #${id}`}”? This cannot be undone.`)) return;
    button.disabled = true;
    try {
      const response = await fetch(`${API_URL}/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error(`Could not delete expense (HTTP ${response.status}).`);
      if (String(editingId) === String(id)) resetForm();
      await loadExpenses();
    } catch (error) {
      window.alert(`${error.message || "Could not delete expense."} Please try again.`);
      button.disabled = false;
    }
  }
});

cancelEditButton.addEventListener("click", resetForm);
refreshButton.addEventListener("click", loadExpenses);
document.querySelectorAll(".nav-link").forEach((link) => link.addEventListener("click", () => {
  document.querySelectorAll(".nav-link").forEach((item) => item.classList.remove("active"));
  link.classList.add("active");
}));
document.querySelector("#today-label").textContent = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date());
setExpenseDateToToday();
loadExpenses();
