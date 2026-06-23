const STORAGE_KEY = "tripSplitData";
const PHOTO_CACHE_KEY = "tripSplitCityPhotoCache";
const DEFAULT_TRIP_PHOTO = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80";

const state = loadState();
const photoCache = loadPhotoCache();

const screens = document.querySelectorAll(".screen");
const navButtons = document.querySelectorAll("[data-target]");
const tabButtons = document.querySelectorAll(".tab-button");
const toggleTripFormBtn = document.getElementById("toggleTripFormBtn");
const tripForm = document.getElementById("tripForm");
const tripName = document.getElementById("tripName");
const tripCity = document.getElementById("tripCity");
const tripTitle = document.getElementById("tripTitle");
const tripCityLabel = document.getElementById("tripCityLabel");
const memberForm = document.getElementById("memberForm");
const memberName = document.getElementById("memberName");
const membersList = document.getElementById("membersList");
const memberCount = document.getElementById("memberCount");
const expenseForm = document.getElementById("expenseForm");
const expenseTitle = document.getElementById("expenseTitle");
const expenseCity = document.getElementById("expenseCity");
const expenseAmount = document.getElementById("expenseAmount");
const expensePayer = document.getElementById("expensePayer");
const sharedPeople = document.getElementById("sharedPeople");
const expensesList = document.getElementById("expensesList");
const homeExpenseCount = document.getElementById("homeExpenseCount");
const homeMemberCount = document.getElementById("homeMemberCount");
const youPaid = document.getElementById("youPaid");
const homeTotalExpense = document.getElementById("homeTotalExpense");
const totalExpense = document.getElementById("totalExpense");
const homeBalancesList = document.getElementById("homeBalancesList");
const balancesList = document.getElementById("balancesList");
const settlementsList = document.getElementById("settlementsList");
const settlementCount = document.getElementById("settlementCount");
const shareBtn = document.getElementById("shareBtn");
const showResetTripsBtn = document.getElementById("showResetTripsBtn");
const resetTripPanel = document.getElementById("resetTripPanel");
const resetTripList = document.getElementById("resetTripList");
const clearDataBtn = document.getElementById("clearDataBtn");
const removeMemberModal = document.getElementById("removeMemberModal");
const removeMemberMessage = document.getElementById("removeMemberMessage");
const keepMemberBtn = document.getElementById("keepMemberBtn");
const confirmRemoveMemberBtn = document.getElementById("confirmRemoveMemberBtn");

let pendingRemoveMemberId = "";
let tripPhotoTimer = 0;

navButtons.forEach((button) => {
  button.addEventListener("click", () => showScreen(button.dataset.target));
});

toggleTripFormBtn.addEventListener("click", () => {
  tripForm.hidden = !tripForm.hidden;
  toggleTripFormBtn.textContent = tripForm.hidden ? "Add Trip" : "Close";
});

tripForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = tripName.value.trim();
  const city = normalizeCity(tripCity.value);
  if (!name && !city) return;
  if (name) state.tripName = name;
  if (city !== "General") state.tripCity = city;
  tripName.value = "";
  tripCity.value = "";
  tripForm.hidden = true;
  toggleTripFormBtn.textContent = "Add Trip";
  saveAndRender();
});

tripCity.addEventListener("input", () => {
  const city = normalizeCity(tripCity.value);
  window.clearTimeout(tripPhotoTimer);
  tripPhotoTimer = window.setTimeout(() => {
    if (city === "General") {
      updateTripPhoto(state.tripCity);
      return;
    }
    state.tripCity = city;
    saveAndRender();
  }, 450);
});

memberForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = memberName.value.trim();

  if (!name) return;
  if (state.members.some((member) => member.name.toLowerCase() === name.toLowerCase())) {
    alert("That member is already added.");
    return;
  }

  state.members.push({ id: createId(), name });
  memberName.value = "";
  saveAndRender();
});

expenseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const selectedPeople = Array.from(sharedPeople.querySelectorAll("input:checked")).map((input) => input.value);

  if (!state.members.length) {
    alert("Add at least one member first.");
    return;
  }

  if (!selectedPeople.length) {
    alert("Choose at least one person who shared the expense.");
    return;
  }

  state.expenses.push({
    id: createId(),
    title: expenseTitle.value.trim(),
    city: normalizeCity(expenseCity.value),
    amount: Number(expenseAmount.value),
    payerId: expensePayer.value,
    sharedBy: selectedPeople,
    createdAt: new Date().toISOString()
  });

  expenseForm.reset();
  saveAndRender();
  showScreen("expenses");
});

shareBtn.addEventListener("click", () => {
  const message = buildSummaryText();
  const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
});

showResetTripsBtn.addEventListener("click", () => {
  resetTripPanel.hidden = !resetTripPanel.hidden;
  renderResetTrips();
});

resetTripList.addEventListener("change", () => {
  clearDataBtn.disabled = !resetTripList.querySelector("input:checked");
});

clearDataBtn.addEventListener("click", () => {
  const selectedTrip = resetTripList.querySelector("input:checked");
  if (!selectedTrip) return;
  const tripName = selectedTrip.value;
  if (!confirm(`Reset "${tripName}"? This will clear its members and expenses.`)) return;
  state.tripName = "";
  state.tripCity = "";
  state.members = [];
  state.expenses = [];
  saveAndRender();
  resetTripPanel.hidden = true;
  showScreen("home");
});

keepMemberBtn.addEventListener("click", closeRemoveMemberModal);

removeMemberModal.addEventListener("click", (event) => {
  if (event.target === removeMemberModal) closeRemoveMemberModal();
});

confirmRemoveMemberBtn.addEventListener("click", () => {
  removeMemberAfterConfirmation(pendingRemoveMemberId);
});

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return { tripName: "", tripCity: "", members: [], expenses: [] };

  try {
    const parsed = JSON.parse(saved);
    const members = Array.isArray(parsed.members) ? parsed.members : [];
    const hasOldDemoData = members.some((member) => String(member.id).startsWith("demo-"));

    if (hasOldDemoData) {
      localStorage.removeItem(STORAGE_KEY);
      return { tripName: "", tripCity: "", members: [], expenses: [] };
    }

    return {
      tripName: typeof parsed.tripName === "string" ? parsed.tripName : "",
      tripCity: typeof parsed.tripCity === "string" ? parsed.tripCity : "",
      members,
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : []
    };
  } catch {
    return { tripName: "", tripCity: "", members: [], expenses: [] };
  }
}

function loadPhotoCache() {
  const saved = localStorage.getItem(PHOTO_CACHE_KEY);
  if (!saved) return {};

  try {
    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function savePhotoCache() {
  localStorage.setItem(PHOTO_CACHE_KEY, JSON.stringify(photoCache));
}

function saveAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

function showScreen(name) {
  screens.forEach((screen) => {
    screen.classList.toggle("active", screen.dataset.screen === name);
  });
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.target === name);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function render() {
  renderTrip();
  renderMembers();
  renderExpenseForm();
  renderExpenses();
  renderSummary();
  renderResetTrips();
}

function renderTrip() {
  updateTripPhoto(state.tripCity);

  if (!state.tripName) {
    tripTitle.className = "trip-title empty-state";
    tripTitle.textContent = "No trip name added.";
  } else {
    tripTitle.className = "trip-title";
    tripTitle.textContent = state.tripName;
  }

  tripCityLabel.textContent = state.tripCity || "No destination city added.";
}

function renderResetTrips() {
  if (!state.tripName) {
    resetTripList.className = "reset-trip-list empty-state";
    resetTripList.textContent = "No trip added yet.";
    clearDataBtn.disabled = true;
    return;
  }

  resetTripList.className = "reset-trip-list";
  resetTripList.innerHTML = `
    <label class="reset-trip-option">
      <input type="radio" name="resetTrip" value="${escapeHtml(state.tripName)}">
      <span>${escapeHtml(state.tripName)}</span>
    </label>
  `;
  clearDataBtn.disabled = true;
}

function updateTripPhoto(city) {
  const normalizedCity = normalizeCity(city || "");

  if (normalizedCity === "General") {
    setTripPhoto(DEFAULT_TRIP_PHOTO);
    return;
  }

  const cacheKey = normalizedCity.toLowerCase();
  if (photoCache[cacheKey]) {
    setTripPhoto(photoCache[cacheKey]);
    return;
  }

  const query = encodeURIComponent(`${normalizedCity} city skyline travel landscape`);
  const photoUrl = `https://source.unsplash.com/900x500/?${query}`;
  const testImage = new Image();

  testImage.onload = () => {
    photoCache[cacheKey] = photoUrl;
    savePhotoCache();
    setTripPhoto(photoUrl);
  };
  testImage.onerror = () => setTripPhoto(DEFAULT_TRIP_PHOTO);
  testImage.src = photoUrl;
}

function setTripPhoto(url) {
  document.documentElement.style.setProperty("--trip-photo", `url("${url.replaceAll('"', "%22")}")`);
}

function renderMembers() {
  memberCount.textContent = `${state.members.length} ${state.members.length === 1 ? "person" : "people"}`;
  homeMemberCount.textContent = state.members.length;

  if (!state.members.length) {
    membersList.className = "chip-list empty-state";
    membersList.textContent = "No members yet.";
    return;
  }

  membersList.className = "chip-list";
  membersList.innerHTML = state.members.map((member) => `
    <div class="chip">
      <span>${escapeHtml(member.name)}</span>
      <button class="delete-button" type="button" aria-label="Remove ${escapeHtml(member.name)}" data-remove-member="${member.id}">x</button>
    </div>
  `).join("");

  membersList.querySelectorAll("[data-remove-member]").forEach((button) => {
    button.addEventListener("click", () => removeMember(button.dataset.removeMember));
  });
}

function renderExpenseForm() {
  expensePayer.innerHTML = state.members.map((member) => (
    `<option value="${member.id}">${escapeHtml(member.name)}</option>`
  )).join("");

  if (!state.members.length) {
    sharedPeople.className = "check-list empty-state";
    sharedPeople.textContent = "Add members first.";
    expenseForm.querySelector(".primary-button").disabled = true;
    return;
  }

  sharedPeople.className = "check-list";
  sharedPeople.innerHTML = state.members.map((member) => `
    <label class="check-row">
      <input type="checkbox" value="${member.id}" checked>
      <span>${escapeHtml(member.name)}</span>
    </label>
  `).join("");
  expenseForm.querySelector(".primary-button").disabled = false;
}

function renderExpenses() {
  homeExpenseCount.textContent = state.expenses.length;

  if (!state.expenses.length) {
    expensesList.className = "expense-list empty-state";
    expensesList.textContent = "No expenses yet.";
    return;
  }

  expensesList.className = "expense-list";
  expensesList.innerHTML = groupExpensesByCity(state.expenses).map((group) => `
    <section class="city-group">
      <div class="city-heading">
        <strong>${escapeHtml(group.city)}</strong>
        <span>${formatMoney(group.total)}</span>
      </div>
      ${group.expenses.map((expense) => {
        const payer = getMemberName(expense.payerId);
        const sharedNames = expense.sharedBy.map(getMemberName).join(", ");
        return `
          <article class="expense-row">
            <span class="icon-bubble">${iconForExpense(expense.title)}</span>
            <div class="row-title">
              <strong>${escapeHtml(expense.title)}</strong>
              <span class="list-meta">Paid by ${escapeHtml(payer)}</span>
              <span class="list-meta">${escapeHtml(sharedNames)}</span>
            </div>
            <div class="amount-block">
              <span>${formatDate(expense.createdAt)}</span>
              <strong>${formatMoney(expense.amount)}</strong>
            </div>
          </article>
        `;
      }).join("")}
    </section>
  `).join("");
}

function renderSummary() {
  const total = state.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const balances = calculateBalances();
  const settlements = calculateSettlements(balances);

  homeTotalExpense.textContent = formatMoney(total);
  totalExpense.textContent = formatMoney(total);
  youPaid.textContent = formatMoney(totalPaidBy(state.members[0]?.id));
  renderHomeBalances(balances);
  renderBalances(balances);
  renderSettlements(settlements);
}

function renderHomeBalances(balances) {
  if (!state.members.length) {
    homeBalancesList.className = "stack-list empty-state";
    homeBalancesList.textContent = "Balances will appear here.";
    return;
  }

  homeBalancesList.className = "stack-list";
  homeBalancesList.innerHTML = state.members.slice(0, 4).map((member) => balanceRow(member, balances, "list-item")).join("");
}

function renderBalances(balances) {
  if (!state.members.length) {
    balancesList.className = "balance-list empty-state";
    balancesList.textContent = "Balances will appear here.";
    return;
  }

  balancesList.className = "balance-list";
  balancesList.innerHTML = state.members.map((member) => balanceRow(member, balances, "balance-row", true)).join("");
}

function balanceRow(member, balances, rowClass, includePaid = false) {
  const amount = roundMoney(balances[member.id] || 0);
  const className = amount >= 0 ? "positive" : "negative";
  const label = amount > 0 ? "will get back" : amount < 0 ? "owes you" : "settled up";
  const paid = includePaid ? `<span class="list-meta">Paid ${formatMoney(totalPaidBy(member.id))}</span>` : "";

  if (rowClass === "balance-row") {
    return `
      <div class="balance-row">
        <span class="icon-bubble">●</span>
        <div class="row-title">
          <strong>${escapeHtml(member.name)}</strong>
          ${paid}
        </div>
        <div class="amount-block ${className}">
          <strong>${formatMoney(Math.abs(amount))}</strong>
          <span>${label}</span>
        </div>
      </div>
    `;
  }

  return `
    <div class="list-item">
      <div class="list-title">
        <span>${escapeHtml(member.name)}</span>
        <span class="${className}">${formatMoney(Math.abs(amount))}</span>
      </div>
      <p class="list-meta">${label}</p>
    </div>
  `;
}

function renderSettlements(settlements) {
  settlementCount.textContent = `${settlements.length} ${settlements.length === 1 ? "transaction" : "transactions"}`;

  if (!settlements.length) {
    settlementsList.className = "settlement-list empty-state";
    settlementsList.textContent = "Nothing to settle yet.";
    return;
  }

  settlementsList.className = "settlement-list";
  settlementsList.innerHTML = settlements.map((settlement) => `
    <div class="settlement-row">
      <div class="settlement-person">
        <span class="icon-bubble">●</span>
        <strong>${escapeHtml(settlement.from)}</strong>
        <span class="negative">owes</span>
      </div>
      <strong>→</strong>
      <div class="settlement-person">
        <span class="icon-bubble">●</span>
        <strong>${escapeHtml(settlement.to)}</strong>
        <span class="positive">gets</span>
      </div>
      <div class="settlement-amount">${formatMoney(settlement.amount)}</div>
    </div>
  `).join("");
}

function calculateBalances() {
  const balances = Object.fromEntries(state.members.map((member) => [member.id, 0]));

  state.expenses.forEach((expense) => {
    if (!expense.sharedBy.length) return;
    const share = expense.amount / expense.sharedBy.length;
    balances[expense.payerId] = (balances[expense.payerId] || 0) + expense.amount;
    expense.sharedBy.forEach((memberId) => {
      balances[memberId] = (balances[memberId] || 0) - share;
    });
  });

  return balances;
}

function calculateSettlements(balances) {
  const debtors = [];
  const creditors = [];

  state.members.forEach((member) => {
    const balance = roundMoney(balances[member.id] || 0);
    if (balance < 0) debtors.push({ name: member.name, amount: Math.abs(balance) });
    if (balance > 0) creditors.push({ name: member.name, amount: balance });
  });

  const settlements = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = roundMoney(Math.min(debtor.amount, creditor.amount));

    if (amount > 0) settlements.push({ from: debtor.name, to: creditor.name, amount });

    debtor.amount = roundMoney(debtor.amount - amount);
    creditor.amount = roundMoney(creditor.amount - amount);

    if (debtor.amount === 0) debtorIndex += 1;
    if (creditor.amount === 0) creditorIndex += 1;
  }

  return settlements;
}

function groupExpensesByCity(expenses) {
  const groups = new Map();

  expenses.forEach((expense) => {
    const city = expense.city || "General";
    if (!groups.has(city)) groups.set(city, { city, total: 0, expenses: [] });
    const group = groups.get(city);
    group.total += expense.amount;
    group.expenses.push(expense);
  });

  return Array.from(groups.values()).map((group) => ({
    ...group,
    total: roundMoney(group.total)
  }));
}

function buildSummaryText() {
  const balances = calculateBalances();
  const settlements = calculateSettlements(balances);
  const total = state.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const cityLines = groupExpensesByCity(state.expenses).flatMap((group) => [
    `${group.city}: ${formatMoney(group.total)}`,
    ...group.expenses.map((expense) => `- ${expense.title}: ${formatMoney(expense.amount)}`)
  ]);
  const balanceLines = state.members.map((member) => {
    const amount = roundMoney(balances[member.id] || 0);
    return `${member.name}: ${amount >= 0 ? "gets back" : "owes"} ${formatMoney(Math.abs(amount))}`;
  });
  const settlementLines = settlements.length
    ? settlements.map((item) => `${item.from} pays ${item.to} ${formatMoney(item.amount)}`)
    : ["Nothing to settle."];

  return [
    "TripSplit Summary",
    state.tripName || "Untitled trip",
    `Total: ${formatMoney(total)}`,
    "",
    "Cities:",
    ...(cityLines.length ? cityLines : ["No city expenses yet."]),
    "",
    "Balances:",
    ...balanceLines,
    "",
    "Who pays whom:",
    ...settlementLines
  ].join("\n");
}

function removeMember(memberId) {
  const member = state.members.find((item) => item.id === memberId);
  if (!member) return;

  pendingRemoveMemberId = memberId;
  removeMemberMessage.textContent = `Are you sure you want to remove ${member.name} from this trip?`;
  removeMemberModal.hidden = false;
}

function closeRemoveMemberModal() {
  pendingRemoveMemberId = "";
  removeMemberModal.hidden = true;
}

function removeMemberAfterConfirmation(memberId) {
  if (!memberId) return;

  const isUsed = state.expenses.some((expense) => (
    expense.payerId === memberId || expense.sharedBy.includes(memberId)
  ));

  if (isUsed) {
    alert("This member is used in an expense. Delete related expenses first.");
    closeRemoveMemberModal();
    return;
  }

  state.members = state.members.filter((member) => member.id !== memberId);
  closeRemoveMemberModal();
  saveAndRender();
}

function getMemberName(memberId) {
  return state.members.find((member) => member.id === memberId)?.name || "Unknown";
}

function totalPaidBy(memberId) {
  if (!memberId) return 0;
  return state.expenses
    .filter((expense) => expense.payerId === memberId)
    .reduce((sum, expense) => sum + expense.amount, 0);
}

function normalizeCity(value) {
  return value.trim().replace(/\s+/g, " ") || "General";
}

function iconForExpense(title) {
  if (/hotel|room|stay/i.test(title)) return "▰";
  if (/taxi|cab|car|metro|train/i.test(title)) return "▣";
  if (/ticket|activity/i.test(title)) return "◆";
  if (/grocery|shop/i.test(title)) return "●";
  return "🍴";
}

function formatDate(value) {
  const date = value ? new Date(value) : new Date();
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatMoney(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(roundMoney(amount));
}

function roundMoney(amount) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

render();
