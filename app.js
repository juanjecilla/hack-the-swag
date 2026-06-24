import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const form = document.getElementById("entry-form");
const factEl = document.getElementById("fact");
const personEl = document.getElementById("person");
const gdgEl = document.getElementById("gdgCommunity");
const byEl = document.getElementById("submittedBy");
const exactEl = document.getElementById("exactMatch");
const btn = document.getElementById("submit-btn");
const statusEl = document.getElementById("status");
const dupWarnEl = document.getElementById("dupwarn");
const listEl = document.getElementById("entries");
const emptyEl = document.getElementById("empty");
const countEl = document.getElementById("count");
const searchEl = document.getElementById("search");

const signinBtn = document.getElementById("signin-btn");
const signoutBtn = document.getElementById("signout-btn");
const signedOutEl = document.getElementById("signed-out");
const signedInEl = document.getElementById("signed-in");
const userNameEl = document.getElementById("user-name");

function setStatus(msg, kind) {
  statusEl.textContent = msg;
  statusEl.className = "status" + (kind ? " " + kind : "");
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const entries = collection(db, "entries");
const provider = new GoogleAuthProvider();

let currentUser = null;
let nameTouched = false; // user manually edited their name

// --- Auth ---
signinBtn.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    console.error(err);
    setStatus("Sign-in failed: " + (err.code || err.message), "err");
  }
});

signoutBtn.addEventListener("click", () => signOut(auth));

byEl.addEventListener("input", () => {
  nameTouched = true;
});

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  const signedIn = !!user;
  signedOutEl.classList.toggle("hidden", signedIn);
  signedInEl.classList.toggle("hidden", !signedIn);
  form.classList.toggle("locked", !signedIn);

  // Form usable only when signed in
  [factEl, personEl, gdgEl, byEl, exactEl, btn].forEach((el) => {
    el.disabled = !signedIn;
  });

  if (signedIn) {
    userNameEl.textContent = user.displayName || user.email || "you";
    // Default the name from the Google account (unless user typed their own)
    if (!nameTouched && !byEl.value) {
      byEl.value = user.displayName || "";
    }
    setStatus("");
  } else {
    nameTouched = false;
    byEl.value = "";
  }
  // Re-evaluate which flags belong to the (now changed) user
  if (typeof recomputeFlags === "function") recomputeFlags();
});

// --- Duplicate detection (client-side, over the in-memory entries) ---
const normalize = (t) =>
  (t || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

const wordSet = (t) =>
  new Set(normalize(t).split(" ").filter((w) => w.length > 2));

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  const inter = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return inter / union;
}

// Returns { type: "exact" | "near", match } or null.
function findDuplicate(fact, person) {
  const nFact = normalize(fact);
  const nPerson = normalize(person);
  if (!nFact || !nPerson) return null;
  const factTokens = wordSet(fact);
  for (const d of allEntries) {
    if (normalize(d.person) !== nPerson) continue;
    if (normalize(d.fact) === nFact) return { type: "exact", match: d };
    if (jaccard(factTokens, wordSet(d.fact)) >= 0.6)
      return { type: "near", match: d };
  }
  return null;
}

function checkDuplicate() {
  const dup = findDuplicate(factEl.value, personEl.value);
  if (!dup) {
    dupWarnEl.textContent = "";
    dupWarnEl.className = "dupwarn";
    return null;
  }
  if (dup.type === "exact") {
    dupWarnEl.textContent = `⛔ Duplicate: this exact fact about ${dup.match.person} is already on the wall.`;
    dupWarnEl.className = "dupwarn exact";
  } else {
    dupWarnEl.textContent = `⚠️ Looks similar to an existing fact about ${dup.match.person}: “${dup.match.fact}”. You can still add it.`;
    dupWarnEl.className = "dupwarn near";
  }
  return dup;
}

factEl.addEventListener("input", checkDuplicate);
personEl.addEventListener("input", checkDuplicate);

// --- Submit ---
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) {
    setStatus("Please sign in with Google first.", "err");
    return;
  }
  const fact = factEl.value.trim();
  const person = personEl.value.trim();
  const gdgCommunity = gdgEl.value.trim();
  const submittedBy = byEl.value.trim() || currentUser.displayName || "";
  const exactMatch = exactEl.checked;
  if (!fact || !person || !gdgCommunity) return;

  // Block exact duplicates; near-duplicates are warned but allowed.
  const dup = findDuplicate(fact, person);
  if (dup && dup.type === "exact") {
    checkDuplicate();
    setStatus("Already on the wall — not adding a duplicate.", "err");
    return;
  }

  btn.disabled = true;
  setStatus("Saving…");
  try {
    await addDoc(entries, {
      fact,
      person,
      gdgCommunity,
      submittedBy,
      submittedByUid: currentUser.uid,
      submittedByEmail: currentUser.email || null,
      exactMatch,
      createdAt: serverTimestamp(),
    });
    factEl.value = "";
    personEl.value = "";
    exactEl.checked = false;
    dupWarnEl.textContent = "";
    dupWarnEl.className = "dupwarn";
    factEl.focus();
    setStatus("Added! 🎉", "ok");
    setTimeout(() => setStatus(""), 2000);
  } catch (err) {
    console.error(err);
    setStatus("Could not save: " + err.message, "err");
  } finally {
    btn.disabled = false;
  }
});

// Escape user text before injecting into the DOM
function esc(s) {
  const d = document.createElement("div");
  d.textContent = s == null ? "" : String(s);
  return d.innerHTML;
}

// --- Community flags (duplicate / wrong) ---
const flags = collection(db, "flags");
const FLAG_TYPES = { duplicate: "🔁 Duplicate", wrong: "🚩 Wrong" };
const flagCounts = new Map(); // entryId -> { duplicate: n, wrong: n }
const myFlags = new Set(); // `${entryId}__${type}` flagged by current user

function flagId(entryId, type) {
  return `${entryId}__${currentUser.uid}__${type}`;
}

async function toggleFlag(entryId, type) {
  if (!currentUser) {
    setStatus("Sign in with Google to flag entries.", "err");
    return;
  }
  const key = `${entryId}__${type}`;
  const ref = doc(flags, flagId(entryId, type));
  try {
    if (myFlags.has(key)) {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, {
        entryId,
        type,
        uid: currentUser.uid,
        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.error(err);
    setStatus("Could not update flag: " + err.message, "err");
  }
}

// Click handling for the flag buttons (event delegation)
listEl.addEventListener("click", (e) => {
  const b = e.target.closest("button.flag-btn");
  if (b) toggleFlag(b.dataset.id, b.dataset.type);
});

// --- Live shared list (public read) + client-side search ---
let allEntries = []; // latest snapshot data (with id), newest first

function matchesSearch(d, term) {
  if (!term) return true;
  return [d.fact, d.person, d.gdgCommunity, d.submittedBy]
    .some((v) => (v || "").toLowerCase().includes(term));
}

function flagButtons(entryId) {
  return Object.entries(FLAG_TYPES)
    .map(([type, label]) => {
      const c = (flagCounts.get(entryId) || {})[type] || 0;
      const mine = myFlags.has(`${entryId}__${type}`);
      const count = c ? ` <span class="fcount">${c}</span>` : "";
      return `<button type="button" class="flag-btn ${type}${mine ? " active" : ""}" data-id="${entryId}" data-type="${type}" aria-pressed="${mine}">${label}${count}</button>`;
    })
    .join("");
}

function render() {
  const term = searchEl.value.trim().toLowerCase();
  const shown = allEntries.filter((d) => matchesSearch(d, term));

  listEl.innerHTML = "";
  countEl.textContent = shown.length;
  emptyEl.classList.toggle("hidden", shown.length > 0);
  emptyEl.textContent =
    allEntries.length === 0
      ? "No fun facts yet — be the first! ✨"
      : "No matches for your search. 🔍";

  for (const d of shown) {
    const by = d.submittedBy ? ` · added by ${esc(d.submittedBy)}` : "";
    const gdg = d.gdgCommunity
      ? `<span class="badge gdg">📍 ${esc(d.gdgCommunity)}</span>`
      : "";
    const badge = d.exactMatch
      ? `<span class="badge exact">✓ verbatim from card</span>`
      : `<span class="badge reworded">≈ reworded</span>`;
    const li = document.createElement("li");
    li.className = "entry" + (d.exactMatch ? " is-exact" : "");
    li.innerHTML =
      `<p class="fact">${esc(d.fact)} ${badge}</p>` +
      `<p class="meta">👤 <span class="person">${esc(d.person)}</span>${by} ${gdg}</p>` +
      `<div class="flags">${flagButtons(d.id)}</div>`;
    listEl.appendChild(li);
  }
}

searchEl.addEventListener("input", render);

const q = query(entries, orderBy("createdAt", "desc"));
onSnapshot(
  q,
  (snap) => {
    allEntries = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    render();
  },
  (err) => {
    console.error(err);
    setStatus("Live updates failed: " + err.message, "err");
  }
);

// Live aggregation of flags across all users
let allFlags = [];

function recomputeFlags() {
  flagCounts.clear();
  myFlags.clear();
  for (const f of allFlags) {
    if (!f.entryId || !f.type) continue;
    const c = flagCounts.get(f.entryId) || { duplicate: 0, wrong: 0 };
    c[f.type] = (c[f.type] || 0) + 1;
    flagCounts.set(f.entryId, c);
    if (currentUser && f.uid === currentUser.uid) {
      myFlags.add(`${f.entryId}__${f.type}`);
    }
  }
  render();
}

onSnapshot(flags, (snap) => {
  allFlags = snap.docs.map((d) => d.data());
  recomputeFlags();
});
