import { useEffect, useRef, useState } from "react";
import { supabase, supabaseEnabled } from "../lib/supabase";
import { useSupabaseSession } from "../hooks/useSupabaseSession";

const ROOM_KEY = "simumath:collaboration-room:v1";
const displayName = (session) =>
  session?.user?.user_metadata?.display_name ||
  session?.user?.email?.split("@")[0] ||
  "Katılımcı";

export default function CollaborationDock() {
  const { session } = useSupabaseSession();
  const [room, setRoom] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(ROOM_KEY));
    } catch {
      return null;
    }
  });
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("Canlı SimuMath Oturumu");
  const [people, setPeople] = useState([]);
  const [message, setMessage] = useState("");
  const applyingRemote = useRef(false);
  useEffect(() => {
    if (!supabase || !session?.user || !room?.id) return;
    const channel = supabase.channel(`room:${room.id}`, {
      config: { private: true, presence: { key: session.user.id } },
    });
    channel
      .on("presence", { event: "sync" }, () =>
        setPeople(
          Object.values(channel.presenceState())
            .flat()
            .map((person) => person.name)
            .filter(Boolean),
        ),
      )
      .on("broadcast", { event: "lab-state" }, ({ payload }) => {
        if (!payload?.hash || payload.sender === session.user.id) return;
        applyingRemote.current = true;
        window.location.hash = payload.hash.replace(/^#/, "");
        window.setTimeout(() => {
          applyingRemote.current = false;
        }, 0);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            name: displayName(session),
            joinedAt: new Date().toISOString(),
          });
          setMessage("Canlı oda bağlı. Laboratuvar değişiklikleri senkronize.");
        }
      });
    const sendHash = () => {
      if (applyingRemote.current) return;
      channel.send({
        type: "broadcast",
        event: "lab-state",
        payload: { hash: window.location.hash, sender: session.user.id },
      });
      if (room.owner_id === session.user.id)
        supabase
          .from("collaboration_rooms")
          .update({
            current_hash: window.location.hash,
            updated_at: new Date().toISOString(),
          })
          .eq("id", room.id);
    };
    window.addEventListener("hashchange", sendHash);
    return () => {
      window.removeEventListener("hashchange", sendHash);
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [room?.id, room?.owner_id, session]);
  const remember = (next) => {
    setRoom(next);
    if (next) sessionStorage.setItem(ROOM_KEY, JSON.stringify(next));
    else sessionStorage.removeItem(ROOM_KEY);
  };
  const createRoom = async () => {
    if (!session?.user)
      return setMessage("Canlı oda için önce Topluluk sekmesinden giriş yap.");
    const { data, error } = await supabase
      .rpc("create_collaboration_room", {
        room_title: title.trim(),
        initial_hash: window.location.hash || "#ode",
      })
      .single();
    if (error) return setMessage(error.message);
    remember(data);
  };
  const joinRoom = async () => {
    if (!session?.user)
      return setMessage("Odaya katılmak için önce giriş yap.");
    const { data, error } = await supabase
      .rpc("join_collaboration_room", {
        requested_code: code.trim().toUpperCase(),
      })
      .single();
    if (error) return setMessage(error.message);
    remember(data);
    window.location.hash = data.current_hash.replace(/^#/, "");
  };
  const leaveRoom = async () => {
    if (room && session?.user && room.owner_id !== session.user.id)
      await supabase
        .from("collaboration_members")
        .delete()
        .eq("room_id", room.id)
        .eq("user_id", session.user.id);
    remember(null);
    setPeople([]);
    setMessage("Canlı odadan ayrıldın.");
  };
  if (!supabaseEnabled) return null;
  return (
    <section className="collaboration-dock">
      <div>
        <span className="lab-kicker">2.1 · Realtime Collaboration</span>
        <strong>{room ? room.title : "Birlikte çalış"}</strong>
        <p>
          {room
            ? `${people.length || 1} katılımcı çevrimiçi · Oda kodu ${room.join_code}`
            : "Aynı laboratuvar durumunu güvenli bir canlı odada paylaş."}
        </p>
      </div>
      {room ? (
        <div className="btn-row">
          <button
            className="btn btn-secondary"
            onClick={() => navigator.clipboard.writeText(room.join_code)}
          >
            Kodu Kopyala
          </button>
          <button className="btn btn-secondary" onClick={leaveRoom}>
            Odadan Ayrıl
          </button>
        </div>
      ) : (
        <div className="collaboration-actions">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-label="Oda başlığı"
          />
          <button className="btn btn-primary" onClick={createRoom}>
            Oda Aç
          </button>
          <input
            value={code}
            maxLength="6"
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="6 haneli kod"
            aria-label="Oda kodu"
          />
          <button className="btn btn-secondary" onClick={joinRoom}>
            Katıl
          </button>
        </div>
      )}
      {message && <small>{message}</small>}
    </section>
  );
}
