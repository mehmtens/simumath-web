import { useCallback, useEffect, useState } from "react";
import { supabase, supabaseEnabled } from "../lib/supabase";
import { useSupabaseSession } from "../hooks/useSupabaseSession";
import {
  captureAssignmentState,
  makeRouteGradingSpec,
} from "../lib/assignmentState";

export default function LmsTab() {
  const { session } = useSupabaseSession();
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [title, setTitle] = useState("SimuMath Dersi");
  const [assignmentTitle, setAssignmentTitle] = useState(
    "Canlı laboratuvar ödevi",
  );
  const [selectedCourse, setSelectedCourse] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!supabase || !session?.user) return;
    const [
      { data: courseRows, error: courseError },
      { data: assignmentRows, error: assignmentError },
    ] = await Promise.all([
      supabase
        .from("courses")
        .select("*,course_members!inner(role)")
        .eq("course_members.user_id", session.user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("assignments")
        .select("*,courses(title)")
        .order("created_at", { ascending: false }),
    ]);
    if (courseError || assignmentError)
      return setMessage((courseError || assignmentError).message);
    setCourses(courseRows || []);
    setAssignments(assignmentRows || []);
    const firstInstructorCourse = courseRows?.find((course) =>
      course.course_members?.some((member) => member.role === "instructor"),
    );
    setSelectedCourse((current) =>
      courseRows?.some((course) => course.id === current)
        ? current
        : firstInstructorCourse?.id || "",
    );
  }, [session?.user]);
  useEffect(() => {
    load();
  }, [load]);
  const createCourse = async () => {
    if (!session?.user)
      return setMessage("Ders oluşturmak için önce giriş yap.");
    setBusy(true);
    const { data, error } = await supabase
      .from("courses")
      .insert({ owner_id: session.user.id, title: title.trim() })
      .select()
      .single();
    if (!error) {
      const { error: memberError } = await supabase
        .from("course_members")
        .insert({
          course_id: data.id,
          user_id: session.user.id,
          role: "instructor",
        });
      if (memberError) setMessage(memberError.message);
      else setMessage("Ders ve eğitmen üyeliği oluşturuldu.");
    } else setMessage(error.message);
    setBusy(false);
    await load();
  };
  const createAssignment = async () => {
    if (!selectedCourse) return setMessage("Önce bir ders seç.");
    const hash = localStorage.getItem("simumath:last-lab-hash") || "#ode";
    const module = hash.replace(/^#/, "").split("?")[0];
    setBusy(true);
    const { error } = await supabase
      .from("assignments")
      .insert({
        course_id: selectedCourse,
        created_by: session.user.id,
        title: assignmentTitle.trim(),
        module,
        launch_hash: hash,
        grading_spec: makeRouteGradingSpec(hash),
        max_score: 100,
      });
    setBusy(false);
    setMessage(
      error
        ? error.message
        : "Ödev oluşturuldu; route ve sayısal parametreler notlandırma ölçütüne dönüştürüldü.",
    );
    await load();
  };
  const joinCourse = async () => {
    if (joinCode.trim().length !== 6)
      return setMessage("Ders kodu 6 karakter olmalı.");
    setBusy(true);
    const { data, error } = await supabase
      .rpc("join_course", { requested_code: joinCode.trim().toUpperCase() })
      .single();
    setBusy(false);
    setMessage(error ? error.message : `${data.title} dersine katıldın.`);
    if (!error) setJoinCode("");
    await load();
  };
  const roleForCourse = (courseId) =>
    courses
      .find((course) => course.id === courseId)
      ?.course_members?.find((member) => member.role)?.role;
  const submit = async (assignment) => {
    const state = captureAssignmentState();
    setBusy(true);
    const { data, error } = await supabase
      .rpc("submit_assignment", {
        target_assignment: assignment.id,
        submission_state: state,
      })
      .single();
    setBusy(false);
    setMessage(
      error
        ? error.message
        : `Teslim notlandırıldı: ${data.score}/${assignment.max_score}`,
    );
  };
  if (!supabaseEnabled)
    return (
      <section className="exam-card">
        <span className="lab-kicker">2.4 · LMS / LTI</span>
        <h2>LMS bağlantısı yapılandırılmamış</h2>
        <p>
          Supabase değişkenleri eklendiğinde ders, ödev ve teslim temeli
          etkinleşir.
        </p>
      </section>
    );
  return (
    <div className="exam-shell">
      <section className="exam-head">
        <div>
          <span className="lab-kicker">2.4 · LMS / LTI / Auto-grading</span>
          <h2>Ders ve Ödev Merkezi</h2>
          <p>
            LTI 1.3 launch/AGS entegrasyonuna hazır veri modeli; laboratuvar
            route ve parametrelerinden sunucu tarafında otomatik puan üretir.
          </p>
        </div>
      </section>
      {!session ? (
        <section className="exam-card">
          <h3>Giriş gerekli</h3>
          <p>
            Topluluk sekmesindeki aynı Supabase hesabıyla giriş yaptıktan sonra
            derslerin burada görünür.
          </p>
        </section>
      ) : (
        <>
          <section className="exam-card">
            <h3>Eğitmen araçları</h3>
            <label>
              Ders adı
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <button
              className="btn btn-secondary"
              disabled={busy}
              onClick={createCourse}
            >
              Ders Oluştur
            </button>
            <label>
              Ders
              <select
                value={selectedCourse}
                onChange={(event) => setSelectedCourse(event.target.value)}
              >
                <option value="">Ders seç</option>
                {courses
                  .filter((course) =>
                    course.course_members?.some(
                      (member) => member.role === "instructor",
                    ),
                  )
                  .map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Ödev adı
              <input
                value={assignmentTitle}
                onChange={(event) => setAssignmentTitle(event.target.value)}
              />
            </label>
            <button
              className="btn btn-primary"
              disabled={busy || !selectedCourse}
              onClick={createAssignment}
            >
              Son Laboratuvardan Ödev Oluştur
            </button>
            {selectedCourse && (
              <div className="result-banner">
                Öğrenci katılım kodu: <strong>{courses.find((course) => course.id === selectedCourse)?.join_code}</strong>
              </div>
            )}
          </section>
          <section className="exam-card">
            <h3>Öğrenci katılımı</h3>
            <label>
              6 haneli ders kodu
              <input value={joinCode} maxLength="6" onChange={(event) => setJoinCode(event.target.value.toUpperCase())} />
            </label>
            <button className="btn btn-secondary" disabled={busy} onClick={joinCourse}>Derse Katıl</button>
          </section>
          <section className="community-grid">
            {assignments.map((assignment) => (
              <article className="community-card" key={assignment.id}>
                <span className="route-chip">#{assignment.module}</span>
                <h3>{assignment.title}</h3>
                <p>
                  {assignment.courses?.title} · {assignment.max_score} puan
                </p>
                <div className="btn-row">
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      window.location.hash = assignment.launch_hash.replace(
                        /^#/,
                        "",
                      );
                    }}
                  >
                    Ödevi Aç
                  </button>
                  {roleForCourse(assignment.course_id) === "learner" && (
                    <button className="btn btn-primary" disabled={busy} onClick={() => submit(assignment)}>
                      Mevcut Durumu Teslim Et
                    </button>
                  )}
                </div>
              </article>
            ))}
          </section>
        </>
      )}
      {message && <div className="result-banner">{message}</div>}
    </div>
  );
}
