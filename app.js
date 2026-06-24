import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const form = document.getElementById("entry-form");
const factEl = document.getElementById("fact");
const personEl = document.getElementById("person");
const byEl = document.getElementById("submittedBy");
const exactEl = document.getElementById("exactMatch");
const btn = document.getElementById("submit-btn");
const statusEl = document.getElementById("status");
const listEl = document.getElementById("entries");
const emptyEl = document.getElementById("empty");
const countEl = document.getElementById("count");

function setStatus(msg, kind) {
  statusEl.textContent = msg;
  statusEl.className = "status" + (kind ? " " + kind : "");
}

if (!firebaseConfig || firebaseConfig.apiKey === "REPLACE_ME") {
  setStatus("Firebase not configured yet — fill in firebase-config.js.", "err");
  btn.disabled = true;
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const entries = collection(db, "entries");

// Submit a new fun fact
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fact = factEl.value.trim();
  const person = personEl.value.trim();
  const submittedBy = byEl.value.trim();
  const exactMatch = exactEl.checked;
  if (!fact || !person) return;

  btn.disabled = true;
  setStatus("Saving…");
  try {
    await addDoc(entries, {
      fact,
      person,
      submittedBy: submittedBy || null,
      exactMatch,
      createdAt: serverTimestamp(),
    });
    factEl.value = "";
    personEl.value = "";
    exactEl.checked = false;
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

// Live shared list — newest first
const q = query(entries, orderBy("createdAt", "desc"));
onSnapshot(
  q,
  (snap) => {
    listEl.innerHTML = "";
    countEl.textContent = snap.size;
    emptyEl.classList.toggle("hidden", snap.size > 0);
    snap.forEach((doc) => {
      const d = doc.data();
      const by = d.submittedBy ? ` · added by ${esc(d.submittedBy)}` : "";
      const badge = d.exactMatch
        ? `<span class="badge exact">✓ verbatim from card</span>`
        : `<span class="badge reworded">≈ reworded</span>`;
      const li = document.createElement("li");
      li.className = "entry" + (d.exactMatch ? " is-exact" : "");
      li.innerHTML =
        `<p class="fact">${esc(d.fact)} ${badge}</p>` +
        `<p class="meta">👤 <span class="person">${esc(d.person)}</span>${by}</p>`;
      listEl.appendChild(li);
    });
  },
  (err) => {
    console.error(err);
    setStatus("Live updates failed: " + err.message, "err");
  }
);
