let supabaseClient = null;
let currentUser = null;
let profile = null;
let dashboard = null;
let mentorSubmissions = [];
let mentorStudents = [];
let selectedMentorStudentId = null;
let mentorQueueShowAll = false;

const stageTemplates = [
  ["User Persona Assumption", "Memahami kebutuhan pengguna dan membuat asumsi persona awal."],
  ["Idea Analysis", "Menganalisis ide solusi berdasarkan masalah yang ditemukan."],
  ["Solution Concept", "Membuat konsep solusi yang akan dikembangkan."],
  ["Prototype", "Membuat prototype awal untuk memvisualisasikan solusi."],
  ["Testing Plan", "Menyusun rencana testing untuk mengevaluasi prototype."],
  ["Evaluation Plan", "Merencanakan evaluasi hasil dan feedback dari pengguna."],
  ["Final Improvement", "Melengkapi evidence dan finalisasi progress SRL."],
  ["Mentor Review", "Menunggu proses review lanjutan setelah evidence disubmit."],
  ["Final Reflection", "Membuat refleksi akhir dari proses pembelajaran dan progress."]
];


const deadlineEvents = [
  { date: "2026-06-10", title: "SRL 6 Review Check", type: "normal", desc: "Mentor melakukan pengecekan evidence SRL 6." },
  { date: "2026-06-20", title: "SRL 7 Draft Reminder", type: "soon", desc: "Mahasiswa mulai menyiapkan evidence SRL 7." },
  { date: "2026-06-30", title: "SRL 7 Deadline", type: "urgent", desc: "Batas akhir upload evidence SRL 7." },
  { date: "2026-07-05", title: "Mentor Feedback Session", type: "normal", desc: "Mentor memberi feedback untuk evidence yang masuk." },
  { date: "2026-07-10", title: "Final SRL Review", type: "normal", desc: "Review akhir progress SRL." }
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function isConfigured() {
  return SUPABASE_URL && SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes("ISI_") &&
    !SUPABASE_ANON_KEY.includes("ISI_");
}

function initSupabase() {
  if (!isConfigured()) {
    $("#setupScreen").classList.remove("hidden");
    $("#authScreen").classList.add("hidden");
    $("#app").classList.add("hidden");
    return false;
  }

  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  $("#setupScreen").classList.add("hidden");
  return true;
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2800);
}

function showAuth() {
  $("#authScreen").classList.remove("hidden");
  $("#app").classList.add("hidden");
}

function showApp() {
  $("#authScreen").classList.add("hidden");
  $("#app").classList.remove("hidden");
}

function switchAuthTab(tab) {
  $("#loginTab").classList.toggle("active", tab === "login");
  $("#registerTab").classList.toggle("active", tab === "register");
  $("#loginForm").classList.toggle("active", tab === "login");
  $("#registerForm").classList.toggle("active", tab === "register");
}

function showPage(page) {
  $$(".page").forEach((el) => el.classList.remove("active"));
  $(`#page-${page}`)?.classList.add("active");
  $$(".nav-item").forEach((btn) => btn.classList.toggle("active", btn.dataset.page === page));
  $("#sidebar")?.classList.remove("open");

  if (page === "mentor" && !["mentor", "admin"].includes(profile?.role)) {
    toast("Login sebagai mentor untuk membuka panel ini.");
    showPage("dashboard");
  }
}

function requireBinusEmail(email) {
  return String(email || "").trim().toLowerCase().endsWith("@binus.ac.id");
}

async function loadSession() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error || !data.user) {
    currentUser = null;
    profile = null;
    showAuth();
    return;
  }

  currentUser = data.user;
  await loadProfile();
  renderUser();
  showApp();
  await loadDashboard();
}

async function loadProfile() {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) throw error;

  if (data) {
    profile = data;
    return;
  }

  const fallbackName =
    currentUser.user_metadata?.name ||
    currentUser.email?.split("@")[0] ||
    "Student";

  const fallbackRole =
    currentUser.user_metadata?.role === "mentor" ||
    currentUser.user_metadata?.role === "admin"
      ? currentUser.user_metadata.role
      : "student";

  await upsertProfile(
    currentUser.id,
    fallbackName,
    currentUser.email,
    fallbackRole
  );

  if (fallbackRole === "student") {
    await createStagesForUser(currentUser.id);
  }

  const { data: createdProfile, error: createdError } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (createdError) throw createdError;
  if (!createdProfile) throw new Error("Profile gagal dibuat. Coba register ulang.");

  profile = createdProfile;
}

async function login(event) {
  event.preventDefault();

  try {
    const email = $("#loginEmail").value.trim().toLowerCase();
    const password = $("#loginPassword").value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;

    currentUser = data.user;
    await loadProfile();
    renderUser();
    showApp();
    await loadDashboard();
    toast("Login berhasil.");
  } catch (error) {
    toast(error.message);
  }
}

async function register(event) {
  event.preventDefault();

  try {
    const name = $("#registerName").value.trim();
    const email = $("#registerEmail").value.trim().toLowerCase();
    const password = $("#registerPassword").value;
    const role = "student";

    if (!requireBinusEmail(email)) {
      toast("Register student hanya menerima email @binus.ac.id.");
      return;
    }

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { name, role }
      }
    });

    if (error) throw error;

    if (!data.user) {
      toast("Register berhasil. Cek email untuk konfirmasi akun.");
      return;
    }

    await upsertProfile(data.user.id, name, email, role);

    if (role === "student") {
      await createStagesForUser(data.user.id);
    }

    currentUser = data.user;
    await loadProfile();
    renderUser();
    showApp();
    await loadDashboard();
    toast("Register berhasil.");
  } catch (error) {
    toast(error.message);
  }
}

async function upsertProfile(userId, name, email, role) {
  const { error } = await supabaseClient
    .from("profiles")
    .upsert({
      id: userId,
      name,
      email,
      role
    }, { onConflict: "id" });

  if (error) throw error;
}

async function createStagesForUser(userId) {
  const rows = stageTemplates.map(([title, description], index) => ({
    user_id: userId,
    stage_number: index + 1,
    title,
    description,
    status: index === 6 ? "In Progress" : "Not Started"
  }));

  const { error } = await supabaseClient
    .from("stages")
    .upsert(rows, { onConflict: "user_id,stage_number" });

  if (error) throw error;

  await addActivity(userId, "system", "Account created", "SRL stages have been initialized");
}

async function logout() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  profile = null;
  dashboard = null;
  showAuth();
  toast("Logout berhasil.");
}

function renderUser() {
  $("#topName").textContent = profile.name;
  $("#topEmail").textContent = profile.email;
  $("#rolePill").textContent = profile.role;
  $("#settingsName").textContent = profile.name;
  $("#settingsEmail").textContent = profile.email;
  $("#settingsRole").textContent = profile.role;

  const isStudent = profile.role === "student";
  const isMentor = ["mentor", "admin"].includes(profile.role);

  $$(".student-only").forEach((el) => el.classList.toggle("hidden", !isStudent));
  $$(".mentor-only").forEach((el) => el.classList.toggle("hidden", !isMentor));
  $("#mentorDashboardHint").classList.toggle("hidden", !isMentor);
  $("#miniTitle").textContent = isMentor ? "Mentor Mode" : "Student Mode";
  $("#miniDesc").textContent = isMentor ? "Review submission mahasiswa dari Mentor Panel." : "Upload evidence dan pantau progress SRL.";
}

async function loadDashboard() {
  if (["mentor", "admin"].includes(profile.role)) {
    await loadMentorPanel();
    renderMentorHomeDashboard();
    showPage("dashboard");
    return;
  }

  const [{ data: stages, error: stagesError }, { data: submissions, error: subError }, { data: activities, error: actError }] = await Promise.all([
    supabaseClient.from("stages").select("*").eq("user_id", currentUser.id).order("stage_number"),
    supabaseClient.from("submissions").select("*, stages(stage_number, title)").eq("user_id", currentUser.id).order("created_at", { ascending: false }),
    supabaseClient.from("activities").select("*").eq("user_id", currentUser.id).order("created_at", { ascending: false }).limit(20)
  ]);

  if (stagesError) throw stagesError;
  if (subError) throw subError;
  if (actError) throw actError;

  if (!stages || stages.length === 0) {
    await createStagesForUser(currentUser.id);
    return loadDashboard();
  }

  dashboard = {
    stages,
    submissions: submissions || [],
    activities: activities || [],
    counts: {
      approved: stages.filter((s) => s.status === "Approved").length,
      inReview: stages.filter((s) => s.status === "In Review").length,
      inProgress: stages.filter((s) => s.status === "In Progress").length,
      revision: stages.filter((s) => s.status === "Revision Needed").length,
      notStarted: stages.filter((s) => s.status === "Not Started").length
    }
  };

  renderDashboard();
  showPage("dashboard");
}

function renderDashboard() {
  if (!dashboard) return;

  const { counts, stages, submissions, activities } = dashboard;
  const total = stages.length || 9;
  const percent = Math.round((counts.approved / total) * 100);

  $("#approvedCount").textContent = counts.approved;
  $("#progressCount").textContent = counts.inProgress;
  $("#reviewCount").textContent = counts.inReview;
  $("#revisionCount").textContent = counts.revision;
  $("#notStartedCount").textContent = counts.notStarted;
  $("#donutText").textContent = `${counts.approved}/${total}`;
  $("#donut").style.setProperty("--value", `${percent}%`);
  $("#barFill").style.width = `${percent}%`;

  $("#motivation").textContent =
    counts.revision > 0 ? "Ada evidence yang perlu revisi. Perbaiki lalu submit ulang." :
    counts.inReview > 0 ? "Evidence sedang direview mentor. Tunggu feedback selanjutnya." :
    counts.approved >= 9 ? "Semua SRL sudah approved." :
    "Lanjutkan progress SRL dan upload evidence berikutnya.";

  $("#stageList").innerHTML = stages.map((s) => `
    <div class="stage-box">
      <div class="stage-icon ${badgeColor(s.status)}">${statusIcon(s.status)}</div>
      <b>SRL ${s.stage_number}</b>
      <span>${s.status}</span>
    </div>
  `).join("");

  $("#activityList").innerHTML = activities.length ? activities.map((a) => `
    <div class="row">
      <div class="badge ${activityColor(a.type)}">${activityIcon(a.type)}</div>
      <div>
        <b>${a.title}</b>
        <small>${a.subtitle || ""}</small>
      </div>
      <small>${formatDate(a.created_at)}</small>
    </div>
  `).join("") : `<p>Belum ada aktivitas.</p>`;

  $("#progressGrid").innerHTML = stages.map((s) => stageCard(s)).join("");
  $("#reviewList").innerHTML = stages.map((s) => reviewRow(s)).join("");
  $("#submissionList").innerHTML = submissions.length ? submissions.map((s) => submissionRow(s)).join("") : `<p>Belum ada submission.</p>`;

  $("#uploadStage").innerHTML = stages.map((s) => `
    <option value="${s.stage_number}">SRL ${s.stage_number} - ${s.title}</option>
  `).join("");

  renderStudentAdvancedDashboard();
  renderUploadGuidance();
  renderReviewSummary();
}


function getNextDeadline() {
  const now = new Date();
  const upcoming = deadlineEvents
    .map((event) => ({ ...event, dateObj: new Date(event.date + "T00:00:00") }))
    .filter((event) => event.dateObj >= now)
    .sort((a, b) => a.dateObj - b.dateObj);
  return upcoming[0] || deadlineEvents[0];
}

function renderStudentAdvancedDashboard() {
  if (!dashboard || !profile) return;
  const { counts, stages, submissions } = dashboard;
  const total = stages.length || 9;
  const percent = Math.round((counts.approved / total) * 100);
  const nextDeadline = getNextDeadline();

  $("#studentGreeting").textContent = `Halo, ${profile.name}`;
  $("#studentSummaryText").textContent = `Progress kamu ${percent}% dengan ${counts.approved}/${total} SRL approved. ${counts.inReview} evidence sedang direview dan ${counts.revision} butuh revisi.`;

  const revisionStages = stages.filter((stage) => stage.status === "Revision Needed");
  const reviewStages = stages.filter((stage) => stage.status === "In Review");
  const nextStage = stages.find((stage) => ["Not Started", "In Progress"].includes(stage.status));

  const actions = [];
  if (revisionStages.length) {
    actions.push(...revisionStages.slice(0, 3).map((stage) => ({
      type: "urgent",
      title: `Perbaiki SRL ${stage.stage_number}`,
      desc: stage.feedback || "Mentor meminta revisi. Buka Review & Feedback lalu upload ulang evidence yang lebih lengkap."
    })));
  }
  if (reviewStages.length) {
    actions.push({
      type: "review",
      title: `${reviewStages.length} evidence menunggu review`,
      desc: "Evidence sudah masuk ke mentor. Siapkan dokumen tambahan jika nanti diminta revisi."
    });
  }
  if (nextStage) {
    actions.push({
      type: "",
      title: `Lanjutkan SRL ${nextStage.stage_number}`,
      desc: `${nextStage.title}. Upload evidence agar progress bergerak ke tahap review.`
    });
  }
  if (!actions.length) {
    actions.push({ type: "success", title: "Semua aman", desc: "Tidak ada revisi atau pending action yang mendesak saat ini." });
  }

  $("#studentNextActions").innerHTML = `
    <div class="insight-list">
      ${actions.slice(0, 4).map((item) => `
        <div class="insight-item ${item.type}">
          <b>${item.title}</b>
          <small>${item.desc}</small>
        </div>
      `).join("")}
    </div>
  `;

  $("#studentChecklist").innerHTML = `
    <div>
      ${stages.map((stage) => `
        <div class="checklist-row">
          <div class="check-dot ${badgeColor(stage.status)}">${statusIcon(stage.status)}</div>
          <div>
            <b>SRL ${stage.stage_number}: ${stage.title}</b>
            <small>${stage.status}${stage.file_name ? ` • ${stage.file_name}` : " • Belum ada file"}</small>
          </div>
          <span class="status ${statusClass(stage.status)}">${stage.status}</span>
        </div>
      `).join("")}
    </div>
  `;

  $("#studentDeadlineSnapshot").innerHTML = `
    <div class="insight-list">
      <div class="insight-item ${nextDeadline.type === "urgent" ? "urgent" : nextDeadline.type === "soon" ? "review" : ""}">
        <b>${formatDeadlineDate(nextDeadline.date)}</b>
        <small>${nextDeadline.title}<br>${nextDeadline.desc}</small>
      </div>
      <div class="insight-item">
        <b>Submission Count</b>
        <small>${submissions.length} evidence pernah dikirim. Gunakan judul file yang jelas agar mentor mudah mengecek.</small>
      </div>
      <div class="insight-item">
        <b>Progress Health</b>
        <small>${percent >= 75 ? "Progress sangat baik." : percent >= 40 ? "Progress cukup, lanjutkan upload evidence." : "Progress masih awal, prioritaskan SRL berikutnya."}</small>
      </div>
    </div>
  `;
}

function buildStudentReportText() {
  if (!dashboard || !profile) return "Belum ada data student.";
  const { counts, stages, submissions } = dashboard;
  const total = stages.length || 9;
  const percent = Math.round((counts.approved / total) * 100);
  const lines = [
    `MONEVSRL STUDENT REPORT`,
    `Name: ${profile.name}`,
    `Email: ${profile.email}`,
    `Progress: ${percent}% (${counts.approved}/${total} approved)`,
    `In Review: ${counts.inReview}`,
    `Revision Needed: ${counts.revision}`,
    `Total Submissions: ${submissions.length}`,
    ``,
    `Stage Detail:`
  ];
  stages.forEach((stage) => {
    lines.push(`- SRL ${stage.stage_number}: ${stage.title} | ${stage.status} | ${stage.file_name || "No file"}`);
  });
  return lines.join("\n");
}

function renderUploadGuidance() {
  if (!dashboard) return;
  const stage = dashboard.stages.find((item) => ["Revision Needed", "In Progress", "Not Started"].includes(item.status)) || dashboard.stages[0];
  $("#uploadSmartNote").textContent = stage
    ? `Rekomendasi: prioritaskan SRL ${stage.stage_number} - ${stage.title}. Status saat ini: ${stage.status}.`
    : "Semua SRL sudah memiliki progress. Upload evidence tambahan hanya jika mentor meminta revisi.";

  $("#evidenceGuide").innerHTML = `
    <div class="guide-grid">
      <div class="guide-item"><i>1</i><div><b>Nama file jelas</b><small>Gunakan format seperti SRL7_Final_Report_Nama.pdf.</small></div></div>
      <div class="guide-item"><i>2</i><div><b>Isi evidence lengkap</b><small>Pastikan file menunjukkan proses, hasil, dan bukti pengerjaan.</small></div></div>
      <div class="guide-item"><i>3</i><div><b>Tambahkan notes</b><small>Jelaskan singkat konteks evidence agar mentor cepat memahami.</small></div></div>
      <div class="guide-item"><i>4</i><div><b>Cek feedback</b><small>Jika status Revision Needed, baca feedback sebelum upload ulang.</small></div></div>
    </div>
  `;
}

function renderReviewSummary() {
  if (!dashboard) return;
  const { counts, stages } = dashboard;
  const latestFeedback = stages.filter((stage) => stage.feedback).slice(-3).reverse();
  $("#reviewSummary").innerHTML = `
    <div class="insight-list">
      <div class="insight-item success"><b>${counts.approved} Approved</b><small>Evidence yang sudah diterima mentor.</small></div>
      <div class="insight-item review"><b>${counts.inReview} In Review</b><small>Evidence yang masih menunggu keputusan mentor.</small></div>
      <div class="insight-item urgent"><b>${counts.revision} Revision Needed</b><small>Evidence yang perlu diperbaiki.</small></div>
      ${latestFeedback.length ? latestFeedback.map((stage) => `<div class="insight-item"><b>SRL ${stage.stage_number} Feedback</b><small>${stage.feedback}</small></div>`).join("") : `<div class="insight-item"><b>Belum ada feedback</b><small>Feedback mentor akan muncul setelah evidence direview.</small></div>`}
    </div>
  `;
}

function stageCard(s) {
  const file = s.file_url
    ? `<a class="file-link" href="${s.file_url}" target="_blank">${s.file_name || "Open file"}</a>`
    : (s.file_name || "Belum ada file");

  return `
    <article class="card srl-card">
      <div class="stage-icon ${badgeColor(s.status)}">${statusIcon(s.status)}</div>
      <h2>SRL ${s.stage_number}: ${s.title}</h2>
      <p>${s.description}</p>
      <p><b>Status:</b> <span class="status ${statusClass(s.status)}">${s.status}</span></p>
      <p><b>File:</b> ${file}</p>
      ${s.feedback ? `<div class="feedback"><b>Mentor Feedback:</b><br>${s.feedback}</div>` : ""}
    </article>
  `;
}

function reviewRow(s) {
  const file = s.file_url
    ? `<a class="file-link" href="${s.file_url}" target="_blank">${s.file_name || "Open file"}</a>`
    : (s.file_name || "No evidence uploaded");

  return `
    <div class="row">
      <div class="badge ${badgeColor(s.status)}">${s.stage_number}</div>
      <div>
        <b>SRL ${s.stage_number}: ${s.title}</b>
        <small>${file} • Updated: ${formatDate(s.updated_at)}</small>
        ${s.feedback ? `<div class="feedback"><b>Feedback:</b><br>${s.feedback}</div>` : ""}
      </div>
      <span class="status ${statusClass(s.status)}">${s.status}</span>
    </div>
  `;
}

function submissionRow(s) {
  const link = s.file_url ? `<a class="file-link" href="${s.file_url}" target="_blank">${s.file_name || "Open file"}</a>` : (s.file_name || "No file");
  return `
    <div class="row">
      <div class="badge orange">${s.stages?.stage_number || "-"}</div>
      <div>
        <b>${s.title}</b>
        <small>${link} • ${s.notes || "No notes"}</small>
      </div>
      <span class="status ${statusClass(s.status)}">${s.status}</span>
    </div>
  `;
}

async function uploadEvidence(event) {
  event.preventDefault();

  try {
    const stageNumber = Number($("#uploadStage").value);
    const title = $("#uploadTitle").value.trim();
    const notes = $("#uploadNotes").value.trim();
    const file = $("#uploadFile").files[0];

    if (!file) return toast("Pilih file evidence terlebih dahulu.");

    const stage = dashboard.stages.find((s) => s.stage_number === stageNumber);
    if (!stage) return toast("Stage tidak ditemukan.");

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${currentUser.id}/srl-${stageNumber}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabaseClient.storage
      .from(EVIDENCE_BUCKET)
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: publicData } = supabaseClient.storage
      .from(EVIDENCE_BUCKET)
      .getPublicUrl(filePath);

    const fileUrl = publicData.publicUrl;

    const { error: submissionError } = await supabaseClient.from("submissions").insert({
      user_id: currentUser.id,
      stage_id: stage.id,
      title,
      notes,
      file_name: file.name,
      file_path: filePath,
      file_url: fileUrl,
      status: "In Review"
    });

    if (submissionError) throw submissionError;

    const { error: stageError } = await supabaseClient
      .from("stages")
      .update({
        status: "In Review",
        file_name: file.name,
        file_path: filePath,
        file_url: fileUrl,
        feedback: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", stage.id);

    if (stageError) throw stageError;

    await addActivity(currentUser.id, "upload", `Evidence SRL ${stageNumber} uploaded`, file.name);

    $("#uploadForm").reset();
    await loadDashboard();
    showPage("review");
    toast("Evidence berhasil diupload dan masuk In Review.");
  } catch (error) {
    toast(error.message);
  }
}

async function addActivity(userId, type, title, subtitle) {
  const { error } = await supabaseClient.from("activities").insert({
    user_id: userId,
    type,
    title,
    subtitle
  });

  if (error) throw error;
}


function buildMentorStudentDataset(profilesRows, stagesRows, submissionRows) {
  const stageMap = new Map();
  const submissionMap = new Map();

  (stagesRows || []).forEach((stage) => {
    if (!stageMap.has(stage.user_id)) stageMap.set(stage.user_id, []);
    stageMap.get(stage.user_id).push(stage);
  });

  (submissionRows || []).forEach((submission) => {
    if (!submissionMap.has(submission.user_id)) submissionMap.set(submission.user_id, []);
    submissionMap.get(submission.user_id).push(submission);
  });

  return (profilesRows || []).map((student) => {
    const stages = (stageMap.get(student.id) || []).sort((a, b) => a.stage_number - b.stage_number);
    const submissions = submissionMap.get(student.id) || [];

    const counts = {
      approved: stages.filter((s) => s.status === "Approved").length,
      inReview: stages.filter((s) => s.status === "In Review").length,
      inProgress: stages.filter((s) => s.status === "In Progress").length,
      revision: stages.filter((s) => s.status === "Revision Needed").length,
      notStarted: stages.filter((s) => s.status === "Not Started").length
    };

    const progressPercent = stages.length ? Math.round((counts.approved / stages.length) * 100) : 0;

    return {
      ...student,
      stages,
      submissions,
      counts,
      progressPercent,
      pendingReviews: counts.inReview,
      activityScore: submissions.length * 3 + counts.inReview * 2 + counts.approved
    };
  });
}

function getFilteredMentorStudents() {
  const keyword = ($("#mentorStudentSearch")?.value || "").trim().toLowerCase();
  const filter = $("#mentorStatusFilter")?.value || "all";
  const sort = $("#mentorSortSelect")?.value || "active";

  let result = mentorStudents.filter((student) => {
    const match = !keyword || student.name.toLowerCase().includes(keyword) || student.email.toLowerCase().includes(keyword);
    if (!match) return false;
    if (filter === "needsReview") return student.counts.inReview > 0;
    if (filter === "revision") return student.counts.revision > 0;
    if (filter === "noSubmission") return student.submissions.length === 0;
    if (filter === "approved") return student.counts.approved > 0;
    return true;
  });

  result.sort((a, b) => {
    if (sort === "pending") return b.pendingReviews - a.pendingReviews || a.name.localeCompare(b.name);
    if (sort === "progressDesc") return b.progressPercent - a.progressPercent || a.name.localeCompare(b.name);
    if (sort === "progressAsc") return a.progressPercent - b.progressPercent || a.name.localeCompare(b.name);
    if (sort === "name") return a.name.localeCompare(b.name);
    return b.activityScore - a.activityScore || a.name.localeCompare(b.name);
  });

  return result;
}

function getSelectedMentorStudent() {
  return mentorStudents.find((student) => student.id === selectedMentorStudentId) || null;
}

function getMentorNumbers() {
  return {
    totalStudents: mentorStudents.length,
    totalSubmissions: mentorSubmissions.length,
    pendingReviews: mentorSubmissions.filter((item) => (item.stages?.status || item.status) === "In Review").length,
    revisionCount: mentorStudents.reduce((sum, s) => sum + s.counts.revision, 0),
    approvedStages: mentorStudents.reduce((sum, s) => sum + s.counts.approved, 0),
    noSubmitCount: mentorStudents.filter((s) => s.submissions.length === 0).length
  };
}

function renderMentorHomeDashboard() {
  const nums = getMentorNumbers();

  $("#mentorHomeStats").innerHTML = `
    <div class="home-stat"><span>Total Students</span><strong>${nums.totalStudents}</strong><small>Mahasiswa terdaftar</small></div>
    <div class="home-stat"><span>Pending Review</span><strong>${nums.pendingReviews}</strong><small>Evidence menunggu mentor</small></div>
    <div class="home-stat"><span>Approved Stages</span><strong>${nums.approvedStages}</strong><small>Total SRL approved</small></div>
    <div class="home-stat"><span>No Submission</span><strong>${nums.noSubmitCount}</strong><small>Mahasiswa belum submit</small></div>
  `;

  const chartStudents = [...mentorStudents].sort((a, b) => b.progressPercent - a.progressPercent).slice(0, 7);
  $("#mentorHomeChart").innerHTML = chartStudents.length ? `
    <div class="compact-report-list">
      ${chartStudents.map((s) => `
        <div class="report-line">
          <div class="report-name"><strong>${s.name}</strong><small>${s.email}</small></div>
          <div class="report-track"><i style="width:${s.progressPercent}%"></i></div>
          <div class="report-value">${s.progressPercent}%</div>
        </div>
      `).join("")}
    </div>
  ` : `<div class="empty-state">Belum ada student. Buat akun student untuk mengisi laporan.</div>`;

  const actions = mentorSubmissions.filter((x) => ["In Review", "Revision Needed"].includes(x.stages?.status || x.status)).slice(0, 6);
  $("#mentorHomeActions").innerHTML = actions.length ? `
    <div class="action-list">
      ${actions.map((x) => `
        <div class="action-item">
          <b>${x.profiles?.name || "Student"} - SRL ${x.stages?.stage_number || "-"}</b>
          <small>${x.stages?.status || x.status} • ${x.title}</small>
        </div>
      `).join("")}
    </div>
  ` : `<div class="empty-state">Tidak ada review mendesak saat ini.</div>`;

  $("#mentorHomeDeadlines").innerHTML = renderDeadlineListHTML(3);
}


function renderMentorInsights() {
  if (!mentorStudents.length) {
    $("#mentorInsights").innerHTML = `<div class="empty-state">Belum ada data mahasiswa. Buat akun student dan upload evidence agar insight muncul.</div>`;
    return;
  }
  const nums = getMentorNumbers();
  const avgProgress = Math.round(mentorStudents.reduce((sum, student) => sum + student.progressPercent, 0) / mentorStudents.length);
  const mostActive = [...mentorStudents].sort((a, b) => b.activityScore - a.activityScore)[0];
  const mostPending = [...mentorStudents].sort((a, b) => b.pendingReviews - a.pendingReviews)[0];

  $("#mentorInsights").innerHTML = `
    <div class="mentor-insight-grid">
      <div class="mentor-insight-card"><span>Average Progress</span><strong>${avgProgress}%</strong><small>Rata-rata SRL approved seluruh mahasiswa.</small></div>
      <div class="mentor-insight-card"><span>Most Active</span><strong>${mostActive?.name || "-"}</strong><small>${mostActive?.submissions.length || 0} submissions</small></div>
      <div class="mentor-insight-card"><span>Need Attention</span><strong>${mostPending?.name || "-"}</strong><small>${mostPending?.pendingReviews || 0} pending review</small></div>
    </div>
  `;
}

function buildMentorReportText() {
  const nums = getMentorNumbers();
  const lines = [
    "MONEVSRL MENTOR CLASS REPORT",
    `Total Students: ${nums.totalStudents}`,
    `Total Submissions: ${nums.totalSubmissions}`,
    `Pending Review: ${nums.pendingReviews}`,
    `Revision Needed: ${nums.revisionCount}`,
    `Approved Stages: ${nums.approvedStages}`,
    `No Submission: ${nums.noSubmitCount}`,
    "",
    "Student Detail:"
  ];
  mentorStudents.forEach((student) => {
    lines.push(`- ${student.name} (${student.email}) | Progress ${student.progressPercent}% | Approved ${student.counts.approved}/9 | Review ${student.counts.inReview} | Revision ${student.counts.revision} | Submissions ${student.submissions.length}`);
  });
  return lines.join("\n");
}

function downloadMentorCsv() {
  const header = ["Name", "Email", "Progress", "Approved", "In Review", "Revision", "Not Started", "Submissions"];
  const rows = mentorStudents.map((student) => [
    student.name,
    student.email,
    `${student.progressPercent}%`,
    student.counts.approved,
    student.counts.inReview,
    student.counts.revision,
    student.counts.notStarted,
    student.submissions.length
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "monevsrl-mentor-report.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function renderMentorStats() {
  const nums = getMentorNumbers();
  $("#mentorStats").innerHTML = `
    <div class="home-stat"><span>Total Students</span><strong>${nums.totalStudents}</strong><small>Mahasiswa terdaftar</small></div>
    <div class="home-stat"><span>Pending Review</span><strong>${nums.pendingReviews}</strong><small>Evidence menunggu keputusan</small></div>
    <div class="home-stat"><span>Revision Needed</span><strong>${nums.revisionCount}</strong><small>Perlu perbaikan</small></div>
    <div class="home-stat"><span>No Submission</span><strong>${nums.noSubmitCount}</strong><small>Belum submit evidence</small></div>
  `;

  $("#mentorEmptyNotice").innerHTML = nums.totalStudents ? "" : `
    <div class="mentor-empty-banner">
      <h2>Dashboard masih kosong</h2>
      <p>Belum ada akun student yang terdaftar. Buat akun student lalu upload evidence agar laporan mentor terisi.</p>
      <ul>
        <li>Register student: student1@binus.ac.id</li>
        <li>Upload evidence dari akun student</li>
        <li>Login kembali sebagai mentor</li>
      </ul>
    </div>
  `;
}

function renderMentorStudentList() {
  const filtered = getFilteredMentorStudents();
  if (!filtered.length) {
    $("#mentorStudentList").innerHTML = `<div class="empty-state">Tidak ada mahasiswa yang cocok dengan filter.</div>`;
    return;
  }

  if (!filtered.some((s) => s.id === selectedMentorStudentId)) selectedMentorStudentId = filtered[0].id;

  $("#mentorStudentList").innerHTML = `
    <div class="student-list">
      ${filtered.map((s) => `
        <div class="student-item ${s.id === selectedMentorStudentId ? "active" : ""}" data-student-id="${s.id}">
          <div class="student-top">
            <div><strong>${s.name}</strong><small>${s.email}</small></div>
            <div class="student-chip">${s.progressPercent}%</div>
          </div>
          <div class="student-progress-line"><i style="width:${s.progressPercent}%"></i></div>
          <div class="student-meta">
            <span>Approved <b>${s.counts.approved}/9</b></span>
            <span>Submits <b>${s.submissions.length}</b></span>
          </div>
          ${s.counts.inReview ? `<div class="student-alert pending">Pending review: ${s.counts.inReview}</div>` : ""}
          ${s.counts.revision ? `<div class="student-alert revision">Revision: ${s.counts.revision}</div>` : ""}
          ${!s.submissions.length ? `<div class="student-alert quiet">No submission yet</div>` : ""}
        </div>
      `).join("")}
    </div>
  `;

  $$("#mentorStudentList .student-item").forEach((item) => {
    item.addEventListener("click", () => {
      selectedMentorStudentId = item.dataset.studentId;
      mentorQueueShowAll = false;
      renderMentorStudentList();
      renderMentorStudentDetail();
      renderMentorSubmissionQueue(false);
      populateMentorReviewSelect();
    });
  });
}

function renderMentorStudentDetail() {
  const s = getSelectedMentorStudent();
  if (!s) {
    $("#mentorStudentDetail").innerHTML = `<div class="empty-state">Pilih mahasiswa untuk melihat detail.</div>`;
    return;
  }

  $("#mentorStudentDetail").innerHTML = `
    <div class="mentor-detail-header">
      <div><h2>${s.name}</h2><p class="mentor-detail-email">${s.email}</p></div>
      <div class="student-chip">${s.progressPercent}% Completed</div>
    </div>

    <div class="mentor-detail-grid">
      <div class="mini-stat"><span>Approved</span><strong>${s.counts.approved}</strong></div>
      <div class="mini-stat"><span>In Review</span><strong>${s.counts.inReview}</strong></div>
      <div class="mini-stat"><span>Revision</span><strong>${s.counts.revision}</strong></div>
      <div class="mini-stat"><span>Submissions</span><strong>${s.submissions.length}</strong></div>
    </div>

    <div class="mentor-progress-bar"><i style="width:${s.progressPercent}%"></i></div>

    <div class="compact-stage-row">
      ${s.stages.map((stage) => `<div title="SRL ${stage.stage_number}: ${stage.status}" class="compact-stage-dot ${badgeColor(stage.status)}">${stage.stage_number}</div>`).join("")}
    </div>
  `;
}

function renderMentorSubmissionQueue(showAll = mentorQueueShowAll) {
  mentorQueueShowAll = showAll;
  const s = getSelectedMentorStudent();
  const source = showAll || !s ? mentorSubmissions : mentorSubmissions.filter((x) => x.user_id === s.id);

  $("#mentorSubmissionList").innerHTML = source.length ? source.map((x) => {
    const link = x.file_url ? `<a class="file-link" href="${x.file_url}" target="_blank">${x.file_name || "Open file"}</a>` : (x.file_name || "No file");
    const status = x.stages?.status || x.status || "In Review";
    return `
      <div class="row">
        <div class="badge ${badgeColor(status)}">${x.stages?.stage_number || "-"}</div>
        <div>
          <b>${x.profiles?.name || "Student"} - SRL ${x.stages?.stage_number || "-"}: ${x.stages?.title || ""}</b>
          <small>${x.profiles?.email || ""}<br>${link}<br>${x.notes || ""}</small>
          ${x.stages?.feedback ? `<div class="feedback">${x.stages.feedback}</div>` : ""}
          <div class="quick-actions">
            <button class="quick-btn approve" type="button" data-quick-review="${x.stage_id}" data-status="Approved">Approve</button>
            <button class="quick-btn revision" type="button" data-quick-review="${x.stage_id}" data-status="Revision Needed">Revision</button>
            <button class="quick-btn review" type="button" data-pick-review="${x.stage_id}">Write Feedback</button>
          </div>
        </div>
        <span class="status ${statusClass(status)}">${status}</span>
      </div>
    `;
  }).join("") : `<div class="empty-state">Belum ada submission untuk mahasiswa ini.</div>`;

  $$("[data-quick-review]").forEach((btn) => btn.addEventListener("click", async () => {
    await quickReviewStage(btn.dataset.quickReview, btn.dataset.status);
  }));
  $$("[data-pick-review]").forEach((btn) => btn.addEventListener("click", () => {
    $("#mentorSubmissionSelect").value = btn.dataset.pickReview;
    $("#mentorFeedback").focus();
  }));
}

function renderMentorNoSubmitCard() {
  const noSubmit = mentorStudents.filter((s) => !s.submissions.length);
  $("#mentorNoSubmitCard").innerHTML = noSubmit.length ? `
    <div class="no-submit-list">
      ${noSubmit.map((s) => `<div class="no-submit-item"><b>${s.name}</b><small>${s.email}</small></div>`).join("")}
    </div>
  ` : `<div class="empty-state">Semua mahasiswa sudah pernah submit.</div>`;
}

function renderMentorApprovalHistory() {
  const history = mentorSubmissions.filter((x) => ["Approved", "Revision Needed"].includes(x.status) || ["Approved", "Revision Needed"].includes(x.stages?.status)).slice(0, 12);
  $("#mentorApprovalHistory").innerHTML = history.length ? `
    <div class="history-table">
      ${history.map((x) => {
        const status = x.stages?.status || x.status;
        return `<div class="history-row"><div><b>${x.profiles?.name || "Student"} - SRL ${x.stages?.stage_number || "-"}</b><small>${x.title}<br>${x.stages?.feedback || "No feedback"}</small></div><span class="status ${statusClass(status)}">${status}</span></div>`;
      }).join("")}
    </div>
  ` : `<div class="empty-state">Belum ada approval history.</div>`;
}

function populateMentorReviewSelect() {
  const s = getSelectedMentorStudent();
  const source = s ? mentorSubmissions.filter((x) => x.user_id === s.id) : mentorSubmissions;
  $("#mentorSubmissionSelect").innerHTML = source.length ? source.map((x) => `
    <option value="${x.stage_id}">${x.profiles?.name || "Student"} - SRL ${x.stages?.stage_number || "-"} - ${x.stages?.title || ""}</option>
  `).join("") : `<option value="">No submission</option>`;
}

async function applyMentorReview(stageId, status, feedback, selected) {
  const { error: stageError } = await supabaseClient
    .from("stages")
    .update({ status, feedback, reviewed_by: currentUser.id, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", stageId);
  if (stageError) throw stageError;

  const { error: submissionError } = await supabaseClient.from("submissions").update({ status }).eq("stage_id", stageId);
  if (submissionError) throw submissionError;

  await addActivity(selected.user_id, status === "Approved" ? "approved" : status === "Revision Needed" ? "revision" : "review", `Mentor updated SRL ${selected.stages?.stage_number || ""}`, `${status}: ${feedback}`);
}

async function quickReviewStage(stageId, status) {
  const selected = mentorSubmissions.find((x) => String(x.stage_id) === String(stageId));
  if (!selected) return toast("Submission tidak ditemukan.");
  const feedback = status === "Approved" ? "Approved by mentor. Evidence sudah sesuai." : "Revision needed. Silakan perbaiki evidence sesuai arahan mentor.";
  try {
    await applyMentorReview(stageId, status, feedback, selected);
    await loadMentorPanel();
    renderMentorHomeDashboard();
    toast(`Quick action berhasil: ${status}`);
  } catch (error) {
    toast(error.message);
  }
}

async function loadMentorPanel() {
  const [
    { data: profileRows, error: profileError },
    { data: stageRows, error: stageError },
    { data: submissionRows, error: submissionError }
  ] = await Promise.all([
    supabaseClient.from("profiles").select("id, name, email, role").eq("role", "student").order("name"),
    supabaseClient.from("stages").select("*").order("stage_number"),
    supabaseClient.from("submissions").select("*, profiles(name, email), stages(id, stage_number, title, status, feedback)").order("created_at", { ascending: false })
  ]);

  if (profileError) throw profileError;
  if (stageError) throw stageError;
  if (submissionError) throw submissionError;

  mentorSubmissions = submissionRows || [];
  mentorStudents = buildMentorStudentDataset(profileRows || [], stageRows || [], mentorSubmissions);

  const filtered = getFilteredMentorStudents();
  if (!selectedMentorStudentId && filtered.length) selectedMentorStudentId = filtered[0].id;
  if (selectedMentorStudentId && !mentorStudents.some((s) => s.id === selectedMentorStudentId)) selectedMentorStudentId = filtered[0]?.id || null;

  renderMentorStats();
  renderMentorInsights();
  renderMentorStudentList();
  renderMentorStudentDetail();
  renderMentorSubmissionQueue(false);
  renderMentorNoSubmitCard();
  renderMentorApprovalHistory();
  populateMentorReviewSelect();
}

async function saveMentorReview(event) {
  event.preventDefault();

  try {
    const stageId = $("#mentorSubmissionSelect").value;
    const status = $("#mentorStatus").value;
    const feedback = $("#mentorFeedback").value.trim();

    if (!stageId) return toast("Belum ada submission untuk direview.");

    const selected = mentorSubmissions.find((s) => String(s.stage_id) === String(stageId));
    if (!selected) return toast("Submission tidak ditemukan.");

    await applyMentorReview(stageId, status, feedback, selected);

    $("#mentorReviewForm").reset();
    await loadMentorPanel();
    renderMentorHomeDashboard();
    toast("Review mentor berhasil disimpan.");
  } catch (error) {
    toast(error.message);
  }
}

function statusClass(status) {
  return String(status || "").replaceAll(" ", "");
}

function badgeColor(status) {
  if (status === "Approved") return "green";
  if (status === "In Review") return "orange";
  if (status === "In Progress") return "blue";
  if (status === "Revision Needed") return "red";
  return "gray";
}

function statusIcon(status) {
  if (status === "Approved") return "✓";
  if (status === "In Review") return "◌";
  if (status === "In Progress") return "◔";
  if (status === "Revision Needed") return "!";
  return "○";
}

function activityColor(type) {
  if (type === "approved") return "green";
  if (type === "review" || type === "upload") return "orange";
  if (type === "revision") return "red";
  return "blue";
}

function activityIcon(type) {
  if (type === "approved") return "✓";
  if (type === "upload") return "⇧";
  if (type === "revision") return "!";
  return "◌";
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function renderDeadlineListHTML(limit = null) {
  const items = limit ? deadlineEvents.slice(0, limit) : deadlineEvents;
  return `
    <div class="deadline-list">
      ${items.map((event) => `
        <div class="deadline-item ${event.type}">
          <div class="deadline-date">
            <div>
              <b>${formatDeadlineDate(event.date)}</b>
              <small>${event.title}<br>${event.desc}</small>
            </div>
            <span>${event.type === "urgent" ? "Urgent" : event.type === "soon" ? "Soon" : "Info"}</span>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function formatDeadlineDate(value) {
  const date = new Date(value + "T00:00:00");
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function renderCalendar() {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const eventDayMap = new Map(deadlineEvents.map((event) => [Number(event.date.split("-")[2]), event]));

  let html = dayNames.map((d) => `<div class="day-name">${d}</div>`).join("");
  html += "<div></div>";
  for (let day = 1; day <= 30; day++) {
    const event = eventDayMap.get(day);
    html += `<div title="${event ? event.title : ""}" class="day ${day === 30 ? "deadline" : ""} ${event ? "has-event" : ""}">${day}</div>`;
  }
  $("#calendar").innerHTML = html;
  $("#deadlineList").innerHTML = renderDeadlineListHTML();
  $("#deadlineDetailBoard").innerHTML = `
    <div class="deadline-detail-grid">
      ${deadlineEvents.map((event) => `
        <div class="deadline-detail ${event.type}">
          <b>${formatDeadlineDate(event.date)} - ${event.title}</b>
          <small>${event.desc}<br><br><b>Preparation:</b> Siapkan file evidence, cek feedback sebelumnya, dan upload sebelum deadline.</small>
        </div>
      `).join("")}
    </div>
  `;
}

function bindEvents() {
  $("#loginTab").addEventListener("click", () => switchAuthTab("login"));
  $("#registerTab").addEventListener("click", () => switchAuthTab("register"));
  $("#loginForm").addEventListener("submit", login);
  $("#registerForm").addEventListener("submit", register);
  $("#logoutBtn").addEventListener("click", logout);
  $("#uploadForm").addEventListener("submit", uploadEvidence);
  $("#mentorReviewForm").addEventListener("submit", saveMentorReview);

  $("#registerRole")?.addEventListener("change", () => {
    const mentorCodeWrap = $("#mentorCodeWrap");
    if (mentorCodeWrap) {
      mentorCodeWrap.classList.toggle("hidden", $("#registerRole").value !== "mentor");
    }
  });

  $$(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => showPage(btn.dataset.page));
  });

  $$("[data-go]").forEach((btn) => {
    btn.addEventListener("click", () => showPage(btn.dataset.go));
  });

  $("#hamburger").addEventListener("click", () => $("#sidebar").classList.toggle("open"));

  $("#copyStudentReportBtn")?.addEventListener("click", async () => {
    await navigator.clipboard.writeText(buildStudentReportText());
    toast("Student report berhasil dicopy.");
  });

  $("#copyMentorReportBtn")?.addEventListener("click", async () => {
    await navigator.clipboard.writeText(buildMentorReportText());
    toast("Class report berhasil dicopy.");
  });

  $("#downloadMentorCsvBtn")?.addEventListener("click", () => {
    downloadMentorCsv();
    toast("CSV report didownload.");
  });

  $("#mentorStudentSearch")?.addEventListener("input", () => {
    renderMentorStudentList();
    renderMentorStudentDetail();
    renderMentorSubmissionQueue(false);
    populateMentorReviewSelect();
  });

  $("#mentorStatusFilter")?.addEventListener("change", () => {
    selectedMentorStudentId = null;
    renderMentorStudentList();
    renderMentorStudentDetail();
    renderMentorSubmissionQueue(false);
    populateMentorReviewSelect();
  });

  $("#mentorSortSelect")?.addEventListener("change", () => {
    renderMentorStudentList();
    renderMentorStudentDetail();
    renderMentorSubmissionQueue(false);
    populateMentorReviewSelect();
  });

  $("#mentorShowAllBtn")?.addEventListener("click", () => {
    renderMentorSubmissionQueue(true);
  });

  $("#mentorRefreshBtn")?.addEventListener("click", async () => {
    await loadMentorPanel();
    renderMentorHomeDashboard();
    toast("Mentor dashboard diperbarui.");
  });

  $$(".review-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".review-tab").forEach((item) => item.classList.remove("active"));
      $$(".review-tab-panel").forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      const target = tab.dataset.reviewTab;
      if (target === "queue") $("#reviewTabQueue")?.classList.add("active");
      if (target === "history") $("#reviewTabHistory")?.classList.add("active");
      if (target === "silent") $("#reviewTabSilent")?.classList.add("active");
    });
  });
}

async function start() {
  try {
    if (!initSupabase()) return;
    bindEvents();
    renderCalendar();
    await loadSession();

    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) return;
      currentUser = session.user;
    });
  } catch (error) {
    console.error(error);
    document.getElementById("setupScreen")?.classList.add("hidden");
    document.getElementById("app")?.classList.add("hidden");
    document.getElementById("authScreen")?.classList.remove("hidden");
    toast(error.message || "Terjadi error saat memuat aplikasi.");
  }
}

start();
