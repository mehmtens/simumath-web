import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase, supabaseEnabled } from "../lib/supabase";

const SEEDS = [
  {
    id: "seed-rlc",
    title: "RLC Sönümlü Geçici Rejim",
    author: "SimuMath Labs",
    course: "Diferansiyel Denklemler",
    module: "ode",
    tags: ["RLC", "devre", "geçici rejim"],
    description:
      "Seri RLC devresinin sönümlü cevabını inceleyen hazır çalışma.",
    hash: "#ode?type=rlc&t=20",
    seed: true,
    likes: 0,
  },
  {
    id: "seed-pendulum",
    title: "Doğrusal Olmayan Sarkaç",
    author: "SimuMath Labs",
    course: "Diferansiyel Denklemler",
    module: "ode",
    tags: ["sarkaç", "nonlinear", "faz portresi"],
    description:
      "Büyük açı davranışını zaman cevabı ve faz portresiyle karşılaştır.",
    hash: "#ode?type=pendulum&t=25",
    seed: true,
    likes: 0,
  },
  {
    id: "seed-matrix",
    title: "Shear ve Özvektör Sezgisi",
    author: "SimuMath Labs",
    course: "Lineer Cebir",
    module: "matrix",
    tags: ["matrix", "shear", "eigen"],
    description:
      "Bir shear dönüşümünde koordinat ızgarası ve özvektör geometrisini keşfet.",
    hash: "#matrix?a=1&b=1&c=0&d=1&vx=1&vy=1",
    seed: true,
    likes: 0,
  },
  {
    id: "seed-fourier",
    title: "Gibbs Olayı",
    author: "SimuMath Labs",
    course: "Sinyaller ve Sistemler",
    module: "fourier",
    tags: ["Fourier", "Gibbs", "square"],
    description:
      "Kare dalga yaklaşımında harmonik sayısının hata ve taşmaya etkisini gözle.",
    hash: "#fourier?wave=square&n=15",
    seed: true,
    likes: 0,
  },
  {
    id: "seed-dfa",
    title: "01 ile Biten Dizgiler",
    author: "SimuMath Labs",
    course: "Biçimsel Diller",
    module: "dfa",
    tags: ["DFA", "binary", "automata"],
    description: "01 ile biten ikili dizgileri kabul eden otomata çalışması.",
    hash: "#dfa",
    seed: true,
    likes: 0,
  },
];
const LOCAL_KEY = "simumath:community-forks:v2";
const LAB_MODULES = ["ode", "matrix", "fourier", "network", "dfa", "hardware"];
function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY)) || [];
  } catch {
    return [];
  }
}
function saveLocal(items) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
}
function parseTags(text) {
  return text
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 8);
}
function moduleFromHash(hash) {
  return (hash || "").replace(/^#/, "").split("?")[0] || "ode";
}
function lastLabHash() {
  const saved = localStorage.getItem("simumath:last-lab-hash");
  if (saved && LAB_MODULES.includes(moduleFromHash(saved))) return saved;
  return "#ode";
}

export default function CommunityTab() {
  const [query, setQuery] = useState("");
  const [course, setCourse] = useState("Tümü");
  const [localItems, setLocalItems] = useState(loadLocal);
  const [remote, setRemote] = useState([]);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(supabaseEnabled);
  const [busy, setBusy] = useState(false);
  const reloadTimer = useRef(null);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [publishOpen, setPublishOpen] = useState(false);
  const [publish, setPublish] = useState(() => ({
    title: "",
    description: "",
    course: "Genel",
    tags: "",
    hash: lastLabHash(),
  }));

  const loadRemote = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const [{ data: sims, error }, { data: likes }, { data: profiles }] =
      await Promise.all([
        supabase
          .from("simulations")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("likes").select("simulation_id,user_id"),
        supabase.from("profiles").select("id,display_name"),
      ]);
    if (error) {
      setMessage(`Community verisi yüklenemedi: ${error.message}`);
      setLoading(false);
      return;
    }
    const likeMap = new Map();
    for (const l of likes || [])
      likeMap.set(
        l.simulation_id,
        (likeMap.get(l.simulation_id) || []).concat(l.user_id),
      );
    const profileMap = new Map(
      (profiles || []).map((p) => [
        p.id,
        p.display_name || "SimuMath kullanıcısı",
      ]),
    );
    setRemote(
      (sims || []).map((s) => ({
        ...s,
        author: profileMap.get(s.owner_id) || "SimuMath kullanıcısı",
        likes: (likeMap.get(s.id) || []).length,
        likedByMe: session?.user?.id
          ? (likeMap.get(s.id) || []).includes(session.user.id)
          : false,
      })),
    );
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") === "community") {
      params.delete("auth");
      const rest = params.toString();
      const cleanUrl =
        window.location.pathname + (rest ? `?${rest}` : "") + "#community";
      window.history.replaceState({}, "", cleanUrl);
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (supabaseEnabled) loadRemote();
  }, [loadRemote]);

  useEffect(() => {
    if (!supabase) return;
    const refreshSoon = () => {
      window.clearTimeout(reloadTimer.current);
      reloadTimer.current = window.setTimeout(loadRemote, 180);
    };
    const channel = supabase
      .channel("community:public")
      .on("postgres_changes", { event: "*", schema: "public", table: "simulations" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "likes" }, refreshSoon)
      .subscribe();
    return () => {
      window.clearTimeout(reloadTimer.current);
      supabase.removeChannel(channel);
    };
  }, [loadRemote]);

  const items = useMemo(
    () => [...remote, ...localItems, ...SEEDS],
    [remote, localItems],
  );
  const courses = ["Tümü", ...new Set(items.map((x) => x.course))];
  const filtered = useMemo(
    () =>
      items.filter(
        (x) =>
          (course === "Tümü" || x.course === course) &&
          `${x.title} ${x.author || ""} ${(x.tags || []).join(" ")} ${x.description || ""}`
            .toLocaleLowerCase("tr-TR")
            .includes(query.toLocaleLowerCase("tr-TR")),
      ),
    [items, query, course],
  );
  const open = (item) => {
    window.location.hash = (item.hash || "#ode").replace(/^#/, "");
  };
  const signIn = async () => {
    if (!supabase || !email.trim()) return;
    setMessage("");
    const redirectTo = `${window.location.origin}${window.location.pathname}?auth=community`;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: redirectTo,
      },
    });
    setMessage(
      error ? error.message : "Giriş bağlantısı e-postana gönderildi.",
    );
  };
  const signOut = async () => {
    await supabase?.auth.signOut();
    setMessage("Oturum kapatıldı.");
  };
  const publishCurrent = async () => {
    if (!supabase || !session?.user)
      return setMessage("Yayınlamak için giriş yap.");
    const hash = publish.hash.startsWith("#")
      ? publish.hash
      : `#${publish.hash}`;
    const module = moduleFromHash(hash);
    if (!LAB_MODULES.includes(module))
      return setMessage("Yayın kaynağı bir laboratuvar route’u olmalı.");
    const payload = {
      owner_id: session.user.id,
      title: publish.title.trim() || `${module.toUpperCase()} Çalışması`,
      description: publish.description.trim(),
      course: publish.course.trim() || "Genel",
      module,
      hash,
      tags: parseTags(publish.tags),
      is_public: true,
    };
    setBusy(true);
    const { error } = await supabase.from("simulations").insert(payload);
    setBusy(false);
    if (error) return setMessage(`Yayınlanamadı: ${error.message}`);
    setMessage("Çalışma topluluğa yayınlandı.");
    setPublishOpen(false);
    setPublish((p) => ({
      ...p,
      title: "",
      description: "",
      tags: "",
      hash: lastLabHash(),
    }));
    await loadRemote();
  };
  const fork = async (item) => {
    if (item.seed || item.local || !supabaseEnabled) {
      const copy = {
        ...item,
        id: `local-${Date.now()}`,
        title: `${item.title} — Fork`,
        author: "Benim Koleksiyonum",
        forked_from: item.id,
        local: true,
        seed: false,
      };
      const next = [copy, ...localItems];
      setLocalItems(next);
      saveLocal(next);
      setMessage("Fork cihazına kaydedildi.");
      return;
    }
    if (!session?.user) return setMessage("Online fork için giriş yap.");
    const { error } = await supabase
      .from("simulations")
      .insert({
        owner_id: session.user.id,
        title: `${item.title} — Fork`,
        description: item.description || "",
        course: item.course || "Genel",
        module: item.module,
        hash: item.hash,
        tags: item.tags || [],
        is_public: true,
        forked_from: item.id,
      });
    if (error) return setMessage(error.message);
    setMessage("Fork topluluğa yayınlandı.");
    await loadRemote();
  };
  const toggleLike = async (item) => {
    if (item.seed || item.local)
      return setMessage(
        "Beğeni yalnız online topluluk çalışmalarında kullanılabilir.",
      );
    if (!session?.user) return setMessage("Beğenmek için giriş yap.");
    setRemote(current => current.map(entry => entry.id === item.id ? { ...entry, likedByMe: !item.likedByMe, likes: Math.max(0, (item.likes || 0) + (item.likedByMe ? -1 : 1)) } : entry));
    const q = supabase.from("likes");
    const { error } = item.likedByMe
      ? await q
          .delete()
          .eq("simulation_id", item.id)
          .eq("user_id", session.user.id)
      : await q.insert({ simulation_id: item.id, user_id: session.user.id });
    if (error) {
      setMessage(`Beğeni güncellenemedi: ${error.message}`);
      return loadRemote();
    }
    await loadRemote();
  };
  const remove = async (item) => {
    if (item.local) {
      const next = localItems.filter((x) => x.id !== item.id);
      setLocalItems(next);
      saveLocal(next);
      return;
    }
    if (!session?.user || item.owner_id !== session.user.id) return;
    const { error } = await supabase
      .from("simulations")
      .delete()
      .eq("id", item.id);
    if (error) return setMessage(error.message);
    await loadRemote();
  };

  return (
    <div className="community-shell">
      <section className="community-head">
        <div>
          <span className="lab-kicker">3.4 · Community Showcase</span>
          <h2>Topluluk Laboratuvarı</h2>
          <p>
            Simülasyon yayınla, diğer kullanıcıların çalışmalarını keşfet, beğen
            ve fork ederek kendi sürümünü oluştur.
          </p>
        </div>
        <div className="community-count">
          <strong>{filtered.length}</strong>
          <span>{loading ? "yükleniyor…" : "çalışma"}</span>
        </div>
      </section>
      {!supabaseEnabled ? (
        <section className="community-note">
          <strong>Supabase yapılandırması bekleniyor</strong>
          <p>
            VITE_SUPABASE_URL ve VITE_SUPABASE_PUBLISHABLE_KEY tanımlanana kadar
            seed galeri ve yerel fork sistemi çalışmaya devam eder.
          </p>
        </section>
      ) : (
        <section className="community-auth">
          {session ? (
            <>
              <div>
                <strong>{session.user.email}</strong>
                <span>Topluluk oturumu açık</span>
              </div>
              <div className="btn-row">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setPublish((p) => ({ ...p, hash: lastLabHash() }));
                    setPublishOpen((v) => !v);
                  }}
                >
                  Çalışma Yayınla
                </button>
                <button className="btn btn-secondary" onClick={signOut}>
                  Çıkış
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <strong>Topluluğa katıl</strong>
                <span>Magic link ile şifresiz giriş.</span>
              </div>
              <div className="community-login">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mail@example.com"
                />
                <button className="btn btn-primary" onClick={signIn}>
                  Giriş Linki Gönder
                </button>
              </div>
            </>
          )}
        </section>
      )}
      {publishOpen && session && (
        <section className="community-publish">
          <h3>Aktif / son laboratuvarı yayınla</h3>
          <label>
            Başlık
            <input
              value={publish.title}
              onChange={(e) =>
                setPublish((p) => ({ ...p, title: e.target.value }))
              }
            />
          </label>
          <label>
            Açıklama
            <textarea
              value={publish.description}
              onChange={(e) =>
                setPublish((p) => ({ ...p, description: e.target.value }))
              }
            />
          </label>
          <label>
            Ders
            <input
              value={publish.course}
              onChange={(e) =>
                setPublish((p) => ({ ...p, course: e.target.value }))
              }
            />
          </label>
          <label>
            Etiketler
            <input
              value={publish.tags}
              onChange={(e) =>
                setPublish((p) => ({ ...p, tags: e.target.value }))
              }
              placeholder="RLC, devre, ODE"
            />
          </label>
          <label>
            Simülasyon route’u
            <input
              value={publish.hash}
              onChange={(e) =>
                setPublish((p) => ({ ...p, hash: e.target.value }))
              }
            />
          </label>
          <div className="btn-row">
            <button className="btn btn-primary" disabled={busy} onClick={publishCurrent}>
              {busy ? "Yayınlanıyor…" : "Topluluğa Yayınla"}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setPublishOpen(false)}
            >
              İptal
            </button>
          </div>
        </section>
      )}
      {message && <div className="result-banner">{message}</div>}
      <section className="community-tools">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Simülasyon, kullanıcı, konu veya etiket ara…"
        />
        <div>
          {courses.map((c) => (
            <button
              key={c}
              className={course === c ? "active" : ""}
              onClick={() => setCourse(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </section>
      <section className="community-grid">
        {filtered.map((item) => (
          <article className="community-card" key={item.id}>
            <div className="community-card-top">
              <span className="route-chip">#{item.module}</span>
              <div>
                {item.seed && <span className="local-badge">SimuMath</span>}
                {item.local && <span className="local-badge">Yerel fork</span>}
                {!item.seed && !item.local && (
                  <span className="online-badge">Online</span>
                )}
              </div>
            </div>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <div className="community-meta">
              <span>{item.author}</span>
              <span>{item.course}</span>
            </div>
            <div className="community-tags">
              {(item.tags || []).map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <div className="btn-row">
              <button className="btn btn-primary" onClick={() => open(item)}>
                Laboratuvarı Aç
              </button>
              <button className="btn btn-secondary" onClick={() => fork(item)}>
                Forkla
              </button>
              {!item.seed && !item.local && (
                <button
                  className="btn btn-secondary"
                  onClick={() => toggleLike(item)}
                >
                  {item.likedByMe ? "♥" : "♡"} {item.likes || 0}
                </button>
              )}
              {(item.local || item.owner_id === session?.user?.id) && (
                <button
                  className="btn btn-secondary"
                  onClick={() => remove(item)}
                >
                  Sil
                </button>
              )}
            </div>
            {item.forked_from && (
              <small>Fork kaynağı: {item.forked_from}</small>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
