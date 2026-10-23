const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const sb = supabase.createClient(RTV.url, RTV.key, { auth: { persistSession: true, autoRefreshToken: true } });
const never = () => new Promise(() => {});
const say = (el, t, ok) => { el.hidden = !t; el.className = "msg " + (ok ? "ok" : "bad"); el.textContent = t || ""; };

// Auth guard + header. Resolves {email, role}; redirects to the sign-in page when not allowed.
async function guard(page) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { location.replace("index.html"); return never(); }
  const { data: role, error } = await sb.rpc("app_role");
  if (error) { say($("#msg"), "Could not verify your access: " + error.message); return never(); }
  if (!role) { await sb.auth.signOut(); location.replace("index.html?denied=1"); return never(); }
  const links = [["dashboard", "Dashboard"], ["transfer", "Transfer Form"], ["movements", "Movement Log"], ["assets", "Assets"]];
  $("#nav").innerHTML = `<img src="img/logo.png" alt="Raising The Village"><nav>${links.map(([p, l]) =>
    `<a href="${p}.html"${p === page ? ' class="on"' : ""}>${l}</a>`).join("")}</nav>` +
    `<span class="who">${esc(session.user.email)} · ${esc(role)}<button class="ghost" id="out">Sign out</button></span>`;
  $("#out").onclick = async () => { await sb.auth.signOut(); location.replace("index.html"); };
  return { email: session.user.email, role };
}

// Fetch every row (PostgREST returns max 1000 per request, so page through).
async function all(table, order) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    let q = sb.from(table).select("*");
    for (const [c, asc] of order) q = q.order(c, { ascending: asc });
    const { data, error } = await q.range(from, from + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000 || out.length >= 50000) return out;
  }
}

function csv(cols, rows, name) {
  const c = v => { v = v == null ? "" : String(v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const t = [cols.map(x => c(x[1])).join(","), ...rows.map(r => cols.map(x => c(r[x[0]])).join(","))].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\ufeff" + t], { type: "text/csv" })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

// Read-only table with search, dropdown filters, paging and CSV export.
// o = { rows, cols:[[key,label,fmt?]], sel:[[key,label]], file }
function view(o) {
  let p = 0, F = [];
  const N = 50, q = $("#q");
  const S = o.sel.map(([k, l]) => {
    const s = $("#f_" + k);
    s.innerHTML = `<option value="">${esc(l)}: all</option>` + [...new Set(o.rows.map(r => r[k]).filter(Boolean))].sort().map(v => `<option>${esc(v)}</option>`).join("");
    s.onchange = () => { p = 0; draw(); };
    return [k, s];
  });
  function draw() {
    const t = q.value.trim().toLowerCase();
    F = o.rows.filter(r => S.every(([k, s]) => !s.value || r[k] === s.value) && (!t || o.cols.some(([k]) => String(r[k] ?? "").toLowerCase().includes(t))));
    const n = F.length, pages = Math.max(1, Math.ceil(n / N));
    p = Math.min(p, pages - 1);
    $("#tbl").innerHTML = `<thead><tr>${o.cols.map(c => `<th>${esc(c[1])}</th>`).join("")}</tr></thead><tbody>` +
      (F.slice(p * N, p * N + N).map(r => `<tr>${o.cols.map(([k, , f]) => `<td>${f ? f(r[k], r) : esc(r[k])}</td>`).join("")}</tr>`).join("") ||
       `<tr><td colspan="${o.cols.length}" class="empty">No matching records</td></tr>`) + "</tbody>";
    $("#pg").innerHTML = `<button class="ghost" id="pv"${p ? "" : " disabled"}>‹ Prev</button><span>${n ? p * N + 1 : 0}–${Math.min(n, p * N + N)} of ${n}</span><button class="ghost" id="nx"${p < pages - 1 ? "" : " disabled"}>Next ›</button>`;
    $("#pv").onclick = () => { p--; draw(); };
    $("#nx").onclick = () => { p++; draw(); };
  }
  q.oninput = () => { p = 0; draw(); };
  $("#csv").onclick = () => csv(o.cols, F, o.file);
  draw();
}
