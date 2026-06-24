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
});

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

// --- Live shared list (public read) + client-side search ---
let allEntries = []; // latest snapshot data, newest first

function matchesSearch(d, term) {
  if (!term) return true;
  return [d.fact, d.person, d.gdgCommunity, d.submittedBy]
    .some((v) => (v || "").toLowerCase().includes(term));
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
      `<p class="meta">👤 <span class="person">${esc(d.person)}</span>${by} ${gdg}</p>`;
    listEl.appendChild(li);
  }
}

searchEl.addEventListener("input", render);

const q = query(entries, orderBy("createdAt", "desc"));
onSnapshot(
  q,
  (snap) => {
    allEntries = snap.docs.map((doc) => doc.data());
    render();
  },
  (err) => {
    console.error(err);
    setStatus("Live updates failed: " + err.message, "err");
  }
);
