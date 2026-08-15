import { Router } from "express";
import { allVehicles, refreshVehiclesFromDb } from "./vehicles.js";
import { allTrips, refreshTripsFromDb } from "./trips.js";
import {
  refreshSubscriptionsFromDb,
  platformSubFor,
  fleetSubFor
} from "./subscriptions.js";
import {
  dbRef,
  databaseConfigured,
  safeKey,
  allocateId,
  describeDatabaseError
} from "../lib/firebase.js";

const router = Router();

/// What an agency can write into its books by hand.
///
/// `capital` is money sunk into a bus — the purchase price, body work, the down
/// payment. It is not an expense of the month it was paid in: it is the sum the
/// bus has to earn back, which is why it is counted separately from both.
const KINDS = ["capital", "income", "expense"];

/// What each kind offers, grouped the way an agency actually thinks about its
/// books.
///
/// A travel agency's costs are not all vehicle costs. Running a bus is fuel,
/// tyres and servicing; running the agency that owns it is rent, salaries,
/// electricity and an accountant — and an office that could only file the first
/// kind either left the rest out of its books or filed them under "Other",
/// which is the same as leaving them out once anyone tries to read the report.
///
/// Every category that existed before is still here, spelled exactly as it was.
/// Renaming one would split an agency's history in two: last year's diesel under
/// "Fuel" and this year's under something else, with no report able to add them
/// up.
const CATEGORY_GROUPS = {
  capital: [
    {
      group: "Vehicle",
      items: ["Vehicle purchase", "Down payment", "Body work", "Seats & interior", "Air conditioning"]
    },
    {
      group: "Setting up",
      items: ["Permit & registration", "Office premises", "Office furniture & equipment"]
    },
    { group: "Other", items: ["Other"] }
  ],
  income: [
    {
      group: "Trips",
      items: ["Trip income", "Package tour", "Contract", "Rental"]
    },
    {
      group: "Other earnings",
      items: ["Advertising on bus", "Commission received", "Other"]
    }
  ],
  expense: [
    {
      group: "Running the bus",
      items: ["Fuel", "Maintenance", "Spare parts", "Tyres", "Parking & tolls", "Cleaning & washing"]
    },
    {
      group: "Staff",
      items: [
        "Driver wages",
        "Cleaner & helper wages",
        "Office staff salary",
        "Staff food & allowance",
        "Bonus & incentive"
      ]
    },
    {
      group: "Office & premises",
      items: [
        "Building rent",
        "Electricity & water",
        "Phone & internet",
        "Office supplies",
        "Software & subscriptions"
      ]
    },
    {
      group: "Legal & compliance",
      items: [
        "Insurance",
        "Road tax",
        "Permit renewal",
        "Fitness certificate",
        "Pollution certificate",
        "Fine & penalty"
      ]
    },
    {
      group: "Finance",
      items: ["Loan EMI", "Interest paid", "Bank charges"]
    },
    {
      group: "Other",
      items: ["Marketing & advertising", "Agent commission", "Legal & professional fees", "Other"]
    }
  ]
};

/// The same lists, flattened. Kept because an entry stores a plain category
/// string and every read path compares against one — the grouping is a way to
/// present the choice, not a change to what is recorded.
const CATEGORIES = Object.fromEntries(
  Object.entries(CATEGORY_GROUPS).map(([kind, groups]) => [
    kind,
    groups.flatMap((g) => g.items)
  ])
);

// Manual entries for this process. The database is the store.
let ledger = [];

function ledgerRef(path) {
  return dbRef(path ? `ledger/${path}` : "ledger");
}

function normaliseEntry(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (!KINDS.includes(raw.kind)) return null;
  return {
    id: Number(raw.id) || 0,
    operatorName: raw.operatorName ?? "",
    kind: raw.kind,
    vehicleId: raw.vehicleId === null || raw.vehicleId === undefined ? null : Number(raw.vehicleId),
    amount: Number(raw.amount ?? 0),
    date: raw.date ?? "",
    category: raw.category ?? "Other",
    note: raw.note ?? "",
    createdAt: raw.createdAt ?? ""
  };
}

export async function refreshLedgerFromDb() {
  if (!databaseConfigured) return ledger;
  try {
    const snap = await ledgerRef().get();
    const byAgency = snap.val() || {};
    ledger = Object.values(byAgency)
      .flatMap((entries) => Object.values(entries || {}))
      .map(normaliseEntry)
      .filter(Boolean);
  } catch (e) {
    console.error("Database get ledger error:", e);
  }
  return ledger;
}

/// YYYY-MM for a date string, or "" when it cannot be read.
function monthOf(iso) {
  const value = String(iso || "").trim();
  return /^\d{4}-\d{2}/.test(value) ? value.slice(0, 7) : "";
}

function monthLabel(key) {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const [year, month] = String(key).split("-");
  const index = Number(month) - 1;
  return months[index] ? `${months[index]} ${year}` : String(key);
}

function forOperator(operatorName) {
  const key = String(operatorName).trim().toLowerCase();
  return ledger.filter((e) => String(e.operatorName).trim().toLowerCase() === key);
}

/// How a bus is doing, in four bands.
///
/// Margin alone would call a bus that has never earned back a rupee of its
/// purchase price "excellent" on the strength of one good month, so a bus still
/// deep in the hole cannot rank above Average however profitable the month was.
function performanceBand({ income, expense, capital, recoveredPct }) {
  const profit = income - expense;
  if (income <= 0 && expense <= 0) return "No data";
  if (profit <= 0) return "Loss";

  const margin = income > 0 ? (profit / income) * 100 : 0;
  const youngAsset = capital > 0 && recoveredPct < 25;

  if (margin >= 40 && !youngAsset) return "Excellent";
  if (margin >= 20) return "Good";
  return "Average";
}

// ─── Entries ───────────────────────────────────────────────

// GET /api/accounts/categories - what the forms offer
//
// `categories` is the flat list every existing caller already reads; `groups`
// carries the same items with their headings, for a form that wants to show
// them grouped. Serving both means a portal that has not been rebuilt keeps
// working unchanged.
router.get("/categories", (req, res) => {
  res.json({ kinds: KINDS, categories: CATEGORIES, groups: CATEGORY_GROUPS });
});

// GET /api/accounts/entries?operatorName=...
router.get("/entries", async (req, res) => {
  const { operatorName } = req.query;
  if (!operatorName) {
    return res.status(400).json({ error: "operatorName query param is required" });
  }

  await refreshLedgerFromDb();
  const entries = forOperator(operatorName).sort((a, b) =>
    String(b.date).localeCompare(String(a.date))
  );
  res.json(entries);
});

// POST /api/accounts/entries - write capital, income or an expense into the books
router.post("/entries", async (req, res) => {
  const { operatorName, kind, vehicleId, amount, date, category, note } = req.body;

  if (!operatorName) {
    return res.status(400).json({ error: "operatorName is required" });
  }
  if (!KINDS.includes(kind)) {
    return res.status(400).json({ error: `kind must be one of: ${KINDS.join(", ")}` });
  }

  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    return res.status(400).json({ error: "amount must be a number greater than zero" });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) {
    return res.status(400).json({ error: "date must be in YYYY-MM-DD format" });
  }

  await refreshVehiclesFromDb();
  await refreshLedgerFromDb();

  // Capital is money spent on a particular bus, so it has to name one — an
  // agency-wide "capital" figure could never be recovered against anything.
  let busId = null;
  if (vehicleId !== undefined && vehicleId !== null && vehicleId !== "") {
    busId = Number(vehicleId);
    const vehicle = allVehicles().find((v) => v.id === busId);
    if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
    if (
      String(vehicle.operatorName).trim().toLowerCase() !==
      String(operatorName).trim().toLowerCase()
    ) {
      return res.status(403).json({ error: "That vehicle belongs to another agency" });
    }
  } else if (kind === "capital") {
    return res.status(400).json({ error: "Capital has to be recorded against a vehicle" });
  }

  let id;
  try {
    const known = Math.max(0, ...ledger.map((e) => Number(e.id) || 0));
    id = databaseConfigured ? await allocateId("ledger", known) : known + 1;
  } catch (e) {
    console.error("Ledger id allocation error:", e);
    return res.status(503).json({ error: "Could not save this entry. Please try again." });
  }

  const entry = {
    id,
    operatorName: String(operatorName).trim(),
    kind,
    vehicleId: busId,
    amount: value,
    date: String(date).trim(),
    category: String(category || CATEGORIES[kind][0]).trim(),
    note: String(note || "").trim(),
    createdAt: new Date().toISOString()
  };

  ledger.push(entry);

  if (databaseConfigured) {
    try {
      await ledgerRef(`${safeKey(entry.operatorName)}/${entry.id}`).set(entry);
    } catch (e) {
      console.error("Database save ledger entry error:", e);
      ledger = ledger.filter((x) => x.id !== entry.id);
      const described = describeDatabaseError(e);
      return res.status(described?.status || 503).json({
        error: described?.message || `Could not save this entry: ${e.message}`
      });
    }
  }

  res.status(201).json(entry);
});

// DELETE /api/accounts/entries/:id?operatorName=...
router.delete("/entries/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { operatorName } = req.query;
  if (!operatorName) {
    return res.status(400).json({ error: "operatorName query param is required" });
  }

  await refreshLedgerFromDb();
  const entry = ledger.find((e) => e.id === id);
  if (!entry) return res.status(404).json({ error: "Entry not found" });
  if (
    String(entry.operatorName).trim().toLowerCase() !==
    String(operatorName).trim().toLowerCase()
  ) {
    return res.status(403).json({ error: "That entry belongs to another agency" });
  }

  ledger = ledger.filter((e) => e.id !== id);

  if (databaseConfigured) {
    try {
      await ledgerRef(`${safeKey(entry.operatorName)}/${id}`).remove();
    } catch (e) {
      console.error("Database delete ledger entry error:", e);
    }
  }

  res.status(204).end();
});

// ─── The books ─────────────────────────────────────────────

// GET /api/accounts?operatorName=...&month=YYYY-MM
router.get("/", async (req, res) => {
  const { operatorName, month } = req.query;
  if (!operatorName) {
    return res.status(400).json({ error: "operatorName query param is required" });
  }

  await refreshVehiclesFromDb();
  await refreshTripsFromDb();
  await refreshSubscriptionsFromDb();
  await refreshLedgerFromDb();

  const key = String(operatorName).trim().toLowerCase();
  const fleet = allVehicles().filter(
    (v) => String(v.operatorName).trim().toLowerCase() === key
  );
  const fleetIds = new Set(fleet.map((v) => v.id));

  const mine = allTrips().filter((t) => fleetIds.has(Number(t.vehicleId)));
  const orders = mine.filter((t) => t.kind === "diary");
  const appBookings = mine.filter((t) => t.kind === "booking");

  const entries = forOperator(operatorName);
  const capitalEntries = entries.filter((e) => e.kind === "capital");
  const manualIncome = entries.filter((e) => e.kind === "income");
  const expenses = entries.filter((e) => e.kind === "expense");

  // Every month that has anything in it, newest first.
  const months = [
    ...new Set(
      [
        ...orders.map((o) => monthOf(o.departureDate)),
        ...manualIncome.map((e) => monthOf(e.date)),
        ...expenses.map((e) => monthOf(e.date))
      ].filter(Boolean)
    )
  ].sort().reverse();

  const selected =
    month && months.includes(month)
      ? month
      : months[0] || monthOf(new Date().toISOString());

  const sum = (list) => list.reduce((n, x) => n + Number(x.amount || x.fare || 0), 0);
  const inMonth = (list, field) =>
    list.filter((x) => monthOf(x[field]) === selected);

  const monthOrders = inMonth(orders, "departureDate");
  const monthManualIncome = inMonth(manualIncome, "date");
  const monthExpenses = inMonth(expenses, "date");

  const tripIncome = sum(monthOrders);
  const otherIncome = sum(monthManualIncome);
  const income = tripIncome + otherIncome;
  const expense = sum(monthExpenses);
  const profit = income - expense;

  const platform = platformSubFor(operatorName);
  const fleetPlan = fleetSubFor(operatorName);
  const paidToTripnix = Number(platform?.amount || 0) + Number(fleetPlan?.amount || 0);

  // Lifetime, for capital recovery: a bus earns its purchase price back over
  // years, so measuring that against one month would call every bus a failure.
  const lifetimeIncomeFor = (vehicleId) =>
    sum(orders.filter((o) => Number(o.vehicleId) === vehicleId)) +
    sum(manualIncome.filter((e) => e.vehicleId === vehicleId));
  const lifetimeExpenseFor = (vehicleId) =>
    sum(expenses.filter((e) => e.vehicleId === vehicleId));

  const perVehicle = fleet
    .map((v) => {
      const capital = sum(capitalEntries.filter((e) => e.vehicleId === v.id));
      const lifeIncome = lifetimeIncomeFor(v.id);
      const lifeExpense = lifetimeExpenseFor(v.id);
      const lifeProfit = lifeIncome - lifeExpense;
      const recoveredPct = capital > 0 ? Math.max(0, (lifeProfit / capital) * 100) : null;

      const monthIncome =
        sum(monthOrders.filter((o) => Number(o.vehicleId) === v.id)) +
        sum(monthManualIncome.filter((e) => e.vehicleId === v.id));
      const monthExpense = sum(monthExpenses.filter((e) => e.vehicleId === v.id));

      return {
        vehicleId: v.id,
        vehicleName: v.name,
        vehicleNumber: v.vehicleNumber,
        capital,
        income: monthIncome,
        expense: monthExpense,
        profit: monthIncome - monthExpense,
        orders: monthOrders.filter((o) => Number(o.vehicleId) === v.id).length,
        lifetime: {
          income: lifeIncome,
          expense: lifeExpense,
          profit: lifeProfit,
          recoveredPct: recoveredPct === null ? null : Math.round(recoveredPct * 10) / 10,
          // What is left of the purchase price to earn back.
          outstanding: capital > 0 ? Math.max(0, capital - lifeProfit) : 0
        },
        band: performanceBand({
          income: lifeIncome,
          expense: lifeExpense,
          capital,
          recoveredPct: recoveredPct ?? 100
        })
      };
    })
    .sort((a, b) => b.profit - a.profit);

  // A running series for the charts, oldest first so a trend reads left to
  // right the way a reader expects.
  const series = [...months]
    .sort()
    .map((m) => {
      const i =
        sum(orders.filter((o) => monthOf(o.departureDate) === m)) +
        sum(manualIncome.filter((e) => monthOf(e.date) === m));
      const x = sum(expenses.filter((e) => monthOf(e.date) === m));
      return { month: m, label: monthLabel(m), income: i, expense: x, profit: i - x };
    });

  const totalCapital = sum(capitalEntries);
  const lifetimeProfit = perVehicle.reduce((n, v) => n + v.lifetime.profit, 0);

  res.json({
    operatorName,
    month: selected,
    monthLabel: monthLabel(selected),
    availableMonths: months.map((m) => ({ value: m, label: monthLabel(m) })),

    capital: {
      total: totalCapital,
      recovered: Math.max(0, lifetimeProfit),
      recoveredPct:
        totalCapital > 0
          ? Math.round(Math.max(0, (lifetimeProfit / totalCapital) * 100) * 10) / 10
          : null,
      outstanding: totalCapital > 0 ? Math.max(0, totalCapital - lifetimeProfit) : 0,
      entries: capitalEntries.length
    },

    income: {
      trips: tripIncome,
      other: otherIncome,
      total: income,
      orders: monthOrders.length,
      // Counted, never valued: travellers book without a rate.
      appBookings: appBookings.filter((b) => monthOf(b.departureDate) === selected).length
    },

    expense: {
      total: expense,
      // What the money went on, biggest first.
      byCategory: Object.entries(
        monthExpenses.reduce((acc, e) => {
          acc[e.category] = (acc[e.category] || 0) + Number(e.amount || 0);
          return acc;
        }, {})
      )
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount)
    },

    profit,
    margin: income > 0 ? Math.round((profit / income) * 1000) / 10 : 0,

    paidToTripnix: {
      platform: Number(platform?.amount || 0),
      platformPlan: platform?.planName || null,
      fleet: Number(fleetPlan?.amount || 0),
      fleetPlan: fleetPlan?.tierLabel || null,
      total: paidToTripnix
    },

    series,
    perVehicle,

    entries: {
      orders: monthOrders
        .map((o) => ({
          id: o.id,
          source: "diary",
          vehicleId: o.vehicleId,
          vehicleName: o.vehicleName,
          label: o.customerName || "Customer",
          detail: o.place || "",
          date: o.departureDate,
          amount: Number(o.fare || 0)
        }))
        .sort((a, b) => String(a.date).localeCompare(String(b.date))),
      manual: [...monthManualIncome, ...monthExpenses]
        .map((e) => ({
          id: e.id,
          source: e.kind,
          vehicleId: e.vehicleId,
          vehicleName:
            fleet.find((v) => v.id === e.vehicleId)?.name || "Whole agency",
          label: e.category,
          detail: e.note,
          date: e.date,
          amount: e.amount
        }))
        .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    }
  });
});

export default router;
