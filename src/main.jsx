import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Hammer, Search, ShieldCheck, Star, LogOut, ArrowRight, BadgeCheck, Wrench,
  Home as HomeIcon, ClipboardCheck, CheckCircle, XCircle, Clock, MessageCircle,
  Euro, Send, BriefcaseBusiness, PlusCircle, Inbox, AlertTriangle, Zap, Menu,
  X, Info, Bell, BarChart3
} from "lucide-react";
import { Input, Select, Textarea } from "./components/common/FormControls";
import { supabase } from "./lib/supabase";
import {
  ActionHeader, ActionSection, BookingNotificationPanel, DirectBookings, DirectJobCard,
  Empty, EmptyState, JobPostCard, LoadingState, QuoteCard, Stats, Status, StatusFilter,
  filterByStatus, lifecycleStatus
} from "./components/workspace/JobWorkspaceComponents";
import { COUNTIES, STOCK_IMAGES, TRADES } from "./constants";
import { DashboardErrorBoundary, IdentityActionHeader, MessengerPopup, NotificationStrip } from "./components/dashboard/DashboardShellComponents";
import {
  ProfileForm,
  ReviewForm
} from "./components/dashboard/CustomerDashboardForms";
import {
  TradieForm,
  VerificationUpload
} from "./components/dashboard/TradieDashboardForms.jsx";
import "./styles.css";
import "./theme.css";
import SmartOnboardingPanel from "./components/dashboard/SmartOnboardingPanel";
import TradieDashboard from "./components/dashboard/TradieDashboard";
import ConversationsPage from "./components/chat/ConversationsPage";
import TradieAnalyticsPage from "./components/analytics/TradieAnalyticsPage";

const MapView = lazy(() => import("./components/workspace/MapView"));
const LazySearchPage = lazy(() => import("./components/workspace/SearchPage"));
const LazyTradieProfile = lazy(() =>
  import("./components/workspace/TradieProfile")
);

const BOOKING_FEE = 5;

function readRoute() {
  const raw = window.location.hash.replace(/^#/, "");
  const [tab = "", routeId = ""] = raw.split("/");
  return { tab, routeId };
}

function routeHash(tab, routeId = "") {
  return ["job-chat", "tradie-profile", "book"].includes(tab) && routeId
    ? `#${tab}/${routeId}`
    : `#${tab}`;
}

async function sendPlatformNotification(payload) {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    await fetch("/.netlify/functions/notify-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.warn("Email notification skipped:", error);
  }
}





function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const initialRoute = useMemo(() => readRoute(), []);
  const [tab, setTab] = useState(() => initialRoute.tab || localStorage.getItem("kta-current-tab") || "home");
  const [selectedJobId, setSelectedJobId] = useState(() => initialRoute.tab === "job-chat" ? initialRoute.routeId : "");
  const [selectedTradieId, setSelectedTradieId] = useState(() => ["tradie-profile", "book"].includes(initialRoute.tab) ? initialRoute.routeId : "");
  const [message, setMessage] = useState("");
  const [accountConfirmOpen, setAccountConfirmOpen] = useState(false);
  const [tradespeople, setTradespeople] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [jobPosts, setJobPosts] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [messages, setMessages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [privateDataLoaded, setPrivateDataLoaded] = useState(false);
  const [selectedTradie, setSelectedTradie] = useState(null);
  const [selectedJobPost, setSelectedJobPost] = useState(null);
  const [filters, setFilters] = useState({ trade: "", county: "" });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);


  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    loadPublicData();
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session?.user) loadProfile(); else setProfile(null); }, [session]);
  useEffect(() => { if (profile) loadPrivateData(); }, [profile]);
  useEffect(() => {
    localStorage.setItem("kta-current-tab", tab);
    const routeId = tab === "job-chat"
      ? selectedJobPost?.id || selectedJobId
      : ["tradie-profile", "book"].includes(tab)
        ? selectedTradie?.id || selectedTradieId
        : "";
    const nextHash = routeHash(tab, routeId);
    if (window.location.hash !== nextHash) window.history.replaceState(null, "", nextHash);
  }, [tab, selectedJobPost?.id, selectedJobId, selectedTradie?.id, selectedTradieId]);

  useEffect(() => {
    if (selectedJobPost?.id) setSelectedJobId(String(selectedJobPost.id));
  }, [selectedJobPost?.id]);

  useEffect(() => {
    if (selectedTradie?.id) setSelectedTradieId(String(selectedTradie.id));
  }, [selectedTradie?.id]);

  useEffect(() => {
    if (tab !== "job-chat" || !selectedJobId || selectedJobPost?.id) return;
    const restoredJob = jobPosts.find((job) => String(job.id) === String(selectedJobId));
    if (restoredJob) setSelectedJobPost(restoredJob);
  }, [tab, selectedJobId, selectedJobPost?.id, jobPosts]);

  useEffect(() => {
    if (!["tradie-profile", "book"].includes(tab) || !selectedTradieId || selectedTradie?.id) return;
    const restoredTradie = tradespeople.find((tradie) => String(tradie.id) === String(selectedTradieId));
    if (restoredTradie) setSelectedTradie(restoredTradie);
  }, [tab, selectedTradieId, selectedTradie?.id, tradespeople]);

  useEffect(() => {
    const handleHashChange = () => {
      const route = readRoute();
      const nextTab = route.tab || "home";
      setTab(nextTab);
      setSelectedJobId(nextTab === "job-chat" ? route.routeId : "");
      setSelectedTradieId(["tradie-profile", "book"].includes(nextTab) ? route.routeId : "");
      if (nextTab !== "job-chat") setSelectedJobPost(null);
      if (!["tradie-profile", "book"].includes(nextTab)) setSelectedTradie(null);
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (!profile?.id) return;

    const refresh = () => loadPrivateData();
    const timer = window.setInterval(refresh, 15000);

    const channel = supabase
      .channel(`kta-live-${profile.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "job_quotes" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "job_messages" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "job_requests" }, () => refresh())
      .subscribe();

    return () => {
      window.clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  async function loadProfile() {
    if (!session?.user) return;

    const user = session.user;
    const metadata = user.user_metadata || {};
    const fallbackProfile = {
      id: user.id,
      email: user.email,
      role: metadata.role || "customer",
      full_name: metadata.full_name || metadata.name || user.email?.split("@")[0] || "New user",
      phone: metadata.phone || "",
      county: metadata.county || ""
    };

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (data && !error) {
      setProfile(data);
      return;
    }

    const { data: created, error: createError } = await supabase
      .from("profiles")
      .upsert(fallbackProfile, { onConflict: "id" })
      .select()
      .maybeSingle();

    if (created && !createError) {
      setProfile(created);
      return;
    }

    // Last-resort safety: never leave the app stuck after auth succeeds.
    setProfile(fallbackProfile);
    setMessage("Profile ready. Please update any missing details in your dashboard.");
  }

  async function loadPublicData() {
    const [people, pics, revs] = await Promise.all([
      supabase.from("tradesperson_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("portfolio_photos").select("*").order("sort_order"),
      supabase.from("reviews").select("*").order("created_at", { ascending: false })
    ]);
    setTradespeople(people.data || []);
    setPortfolio(pics.data || []);
    setReviews(revs.data || []);
  }

  async function loadPrivateData() {
    const [jr, jp, jq, jm, docs] = await Promise.all([
      supabase.from("job_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("job_posts").select("*").order("created_at", { ascending: false }),
      supabase.from("job_quotes").select("*").order("created_at", { ascending: false }),
      supabase.from("job_messages").select("*").order("created_at", { ascending: true }),
      supabase.from("tradesperson_documents").select("*").order("created_at", { ascending: false })
    ]);
    setJobs(jr.data || []);
    setJobPosts(jp.data || []);
    setQuotes(jq.data || []);
    setMessages(jm.data || []);
    setDocuments(docs.data || []);
    setPrivateDataLoaded(true);
  }

  async function signOut() { await supabase.auth.signOut(); setTab("home"); setMessage("Signed out."); }

  function openJobWorkspace(jobPost) {
    if (!jobPost?.id) {
      setMessage("This job could not be opened because its ID is missing.");
      return;
    }

    const jobId = String(jobPost.id);
    setSelectedJobPost(jobPost);
    setSelectedJobId(jobId);
    setTab("job-chat");
    localStorage.setItem("kta-current-tab", "job-chat");
    window.location.hash = routeHash("job-chat", jobId);
    setMobileMenuOpen(false);
  }

  function goTab(nextTab) {
    if (nextTab !== "job-chat") {
      setSelectedJobPost(null);
      setSelectedJobId("");
    }
    if (!["tradie-profile", "book"].includes(nextTab)) {
      setSelectedTradie(null);
      setSelectedTradieId("");
    }
    setTab(nextTab);
    localStorage.setItem("kta-current-tab", nextTab);
    const currentRouteId = readRoute().routeId;
    window.location.hash = routeHash(
      nextTab,
      nextTab === "job-chat"
        ? selectedJobPost?.id || selectedJobId || currentRouteId
        : ["tradie-profile", "book"].includes(nextTab)
          ? selectedTradie?.id || selectedTradieId || currentRouteId
          : ""
    );
    setMobileMenuOpen(false);
  }

  const myTradie = useMemo(() => tradespeople.find(t => t.user_id === profile?.id), [tradespeople, profile]);
  const visibleTradies = useMemo(() => tradespeople.filter((p) => {
    const approved = p.approved === true || p.approval_status === "approved";
    return approved && (filters.trade ? p.trade === filters.trade : true) && (filters.county ? p.county === filters.county : true);
  }), [tradespeople, filters]);
  const openJobPosts = useMemo(() => jobPosts.filter(j => j.status === "open" || j.status === "quote_accepted"), [jobPosts]);
  const photosFor = (id) => portfolio.filter((p) => p.tradesperson_id === id).slice(0, 5);
  const reviewsFor = (id) => reviews.filter((r) => r.tradesperson_id === id);
  const quotesFor = (jobPostId) => quotes.filter(q => q.job_post_id === jobPostId);
  const messagesFor = (jobPostId) => messages.filter(m => m.job_post_id === jobPostId);
  const avgRating = (id) => {
    const list = reviewsFor(id);
    if (!list.length) return "New";
    return (list.reduce((sum, r) => sum + Number(r.rating || 0), 0) / list.length).toFixed(1);
  };
  const goPostJob = () => session ? setTab("post-job") : setTab("auth");

  return <div>
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <header className={`nav ${mobileMenuOpen ? "nav-open" : ""}`}>
      <button className="logo" onClick={() => goTab("home")}><span className="logo-mark"><Hammer size={20}/></span> KonnectATradie</button>

      <button
        className="mobile-menu-btn"
        type="button"
        onClick={() => setMobileMenuOpen((open) => !open)}
        aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={mobileMenuOpen}
        aria-controls="primary-navigation"
      >
        {mobileMenuOpen ? <X size={24}/> : <Menu size={24}/>}
      </button>

      <nav className="nav-links" id="primary-navigation" aria-label="Primary navigation">
        <button onClick={() => goTab("search")}>Find a Tradie</button>
        {session && <button onClick={() => goTab("dashboard")}>Dashboard</button>}
        {session && (
  <button onClick={() => goTab("messages")}>
    <MessageCircle size={16} />
    Messages
  </button>
)}
{session && ["tradesperson", "tradie"].includes(profile?.role) && (
  <button onClick={() => goTab("analytics")}>
    <BarChart3 size={16} />
    Analytics
  </button>
)}
        {session && profile?.role === "customer" && <button onClick={() => goTab("map")}>Map</button>}
        {session && ["tradesperson","tradie"].includes(profile?.role) && <button onClick={() => goTab("jobs-board")}>Jobs Board</button>}
        {session && profile?.role === "customer" && <button onClick={() => goTab("post-job")}>Post a Job</button>}
        {session && ["tradesperson","tradie"].includes(profile?.role) && <button onClick={() => goTab("quotes-sent")}>Quotes Sent</button>}
        {profile?.role === "admin" && <button onClick={() => goTab("admin")}>Admin</button>}
        {session && <button onClick={() => goTab("about")}>About</button>}
        {session ? <button onClick={signOut}><LogOut size={16}/> Sign out</button> : <button className="nav-primary" onClick={() => goTab("auth")}>Login / Sign up</button>}
      </nav>
    </header>
    <SuccessMessagePopup message={message} clearMessage={() => setMessage("")} />
    <AccountConfirmedModal open={accountConfirmOpen} />
    <MessengerPopup profile={profile} messages={messages} jobPosts={jobPosts} setSelectedJobPost={openJobWorkspace} setTab={goTab} />

    {tab === "home" && <Home setTab={setTab} goPostJob={goPostJob} />}
    {message && <div className="toast">{message}</div>}

    <main className="container" id="main-content" tabIndex="-1">
      {session && <NotificationStrip profile={profile} myPosts={jobPosts.filter(j => j.customer_id === profile?.id)} myQuotes={["tradesperson","tradie"].includes(profile?.role) ? quotes.filter(q => q.tradesperson_id === myTradie?.id) : quotes} jobs={jobs} messages={messages} jobPosts={jobPosts} setSelectedJobPost={openJobWorkspace} setTab={goTab} />}
      {tab === "auth" && <Auth setTab={setTab} setMessage={setMessage} setAccountConfirmOpen={setAccountConfirmOpen} />}
      {tab === "about" && <AboutUs setTab={setTab} profile={profile} />}
      {tab === "privacy" && <LegalPage type="privacy" setTab={setTab} />}
      {tab === "terms" && <LegalPage type="terms" setTab={setTab} />}
      {tab === "legal" && <LegalPage type="legal" setTab={setTab} />}
      {tab === "search" && (
  <Suspense
    fallback={
      <LoadingState
        title="Loading tradespeople…"
        text="We are preparing approved profiles and search filters."
      />
    }
  >
    <LazySearchPage
      visibleTradies={visibleTradies}
      filters={filters}
      setFilters={setFilters}
      photosFor={photosFor}
      avgRating={avgRating}
      reviewsFor={reviewsFor}
      setSelectedTradie={setSelectedTradie}
      setTab={setTab}
    />
  </Suspense>
)}
      {tab === "tradie-profile" && selectedTradie && <LazyTradieProfile tradie={selectedTradie} photos={photosFor(selectedTradie.id)} reviews={reviewsFor(selectedTradie.id)} avgRating={avgRating(selectedTradie.id)} setTab={setTab} setSelectedTradie={setSelectedTradie} />}
      {tab === "tradie-profile" && !selectedTradie && selectedTradieId && <LoadingState title="Loading tradesperson…" text="We are restoring the profile you were viewing."/>}
      {tab === "dashboard" && (session ? <DashboardErrorBoundary setTab={goTab}><Dashboard profile={profile} session={session} setMessage={setMessage} loadProfile={loadProfile} loadPublicData={loadPublicData} jobs={jobs} jobPosts={jobPosts} quotes={quotes} reviews={reviews} messages={messages} loadPrivateData={loadPrivateData} documents={documents} myTradie={myTradie} quotesFor={quotesFor} setSelectedJobPost={openJobWorkspace} setTab={goTab} /></DashboardErrorBoundary> : <Auth setTab={goTab} setMessage={setMessage}/>)}
      {tab === "messages" && session && (
  <ConversationsPage
    profile={profile}
    messages={messages}
    jobPosts={jobPosts}
    onOpenConversation={openJobWorkspace}
    onBack={() => goTab("dashboard")}
  />
)}
{tab === "analytics" &&
  session &&
  ["tradesperson", "tradie"].includes(profile?.role) && (
    <TradieAnalyticsPage
      myTradie={myTradie}
      quotes={quotes}
      jobPosts={jobPosts}
      jobs={jobs}
      reviews={reviews}
      messages={messages}
      onBack={() => goTab("dashboard")}
      onViewQuotes={() => goTab("quotes-sent")}
            onOpenJob={openJobWorkspace}
    />
  )}
{tab === "book" && (session
  ? selectedTradie
    ? <Booking selectedTradie={selectedTradie} profile={profile} setMessage={setMessage} loadPrivateData={loadPrivateData} setTab={setTab} />
    : <LoadingState title="Loading booking…" text="We are restoring the tradesperson you selected."/>
  : <Auth setTab={setTab} setMessage={setMessage} returnTab="book" />)}
      {tab === "post-job" && (session ? <PostJob profile={profile} setMessage={setMessage} loadPrivateData={loadPrivateData} setTab={setTab} /> : <Auth setTab={setTab} setMessage={setMessage}/>)}
      {tab === "available-jobs" && ["tradesperson","tradie"].includes(profile?.role) && <AvailableJobs jobPosts={openJobPosts} myTradie={myTradie} profile={profile} setMessage={setMessage} loadPrivateData={loadPrivateData} loadPublicData={loadPublicData} setSelectedJobPost={openJobWorkspace} setTab={setTab} />}
      {tab === "quotes-sent" && ["tradesperson","tradie"].includes(profile?.role) && <QuotesSentPage myTradie={myTradie} quotes={quotes} jobPosts={jobPosts} setMessage={setMessage} loadPrivateData={loadPrivateData} setSelectedJobPost={openJobWorkspace} setTab={setTab} />}
      {tab === "jobs-board" && session && <JobsBoard profile={profile} tradespeople={visibleTradies} jobPosts={openJobPosts} myTradie={myTradie} setSelectedTradie={setSelectedTradie} setSelectedJobPost={openJobWorkspace} setTab={setTab} setMessage={setMessage} loadPrivateData={loadPrivateData} loadPublicData={loadPublicData} />}
      {tab === "map" && session && <Suspense fallback={<LoadingState title="Loading map…" text="We are preparing the interactive map and nearby results."/>}><MapView profile={profile} tradespeople={visibleTradies} jobPosts={openJobPosts} setSelectedTradie={setSelectedTradie} setSelectedJobPost={openJobWorkspace} setTab={setTab} /></Suspense>}
      {tab === "job-chat" && selectedJobPost && <JobChat jobPost={selectedJobPost} profile={profile} messagesFor={messagesFor} quotesFor={quotesFor} tradespeople={tradespeople} reviews={reviews} setMessage={setMessage} loadPrivateData={loadPrivateData} setTab={goTab} />}
      {tab === "job-chat" && !selectedJobPost && selectedJobId && !privateDataLoaded && <LoadingState title="Loading job workspace…" text="We are restoring the job, quotes and conversation from this link."/>}
      {tab === "job-chat" && !selectedJobPost && (privateDataLoaded || !selectedJobId) && <section className="card empty-state"><h2>Job not found</h2><p>This job could not be loaded. Return to your dashboard and open it again.</p><button className="primary" onClick={() => goTab("dashboard")}>Back to dashboard</button></section>}
      {tab === "admin" && profile?.role === "admin" && <Admin tradespeople={tradespeople} documents={documents} setMessage={setMessage} loadPublicData={loadPublicData} loadPrivateData={loadPrivateData} />}
    </main>

    <footer>
      <div className="footer-inner">
        <div>
          <strong>KonnectATradie</strong>
          <p>Connecting customers with reviewed tradespeople across Ireland.</p>
        </div>
        <div className="footer-links">
          <button type="button" onClick={() => setTab("about")}>About</button>
          <button type="button" onClick={() => setTab("privacy")}>Privacy Policy</button>
          <button type="button" onClick={() => setTab("terms")}>Terms & Conditions</button>
          <button type="button" onClick={() => setTab("legal")}>Legal</button>
        </div>
        <p>© 2026 KonnectATradie</p>
      </div>
    </footer>
  </div>;
}


function LegalPage({ type, setTab }) {
  const pages = {
    privacy: {
      label: "Privacy Policy",
      title: "Privacy Policy",
      intro: "This draft page explains how KonnectATradie intends to handle personal information.",
      points: [
        "We collect account details such as name, email, phone, county and account type so users can manage their account.",
        "Customer job posts, quote activity and chat messages are used to help both parties communicate and manage work.",
        "Tradespeople may provide business details, portfolio photos and verification information.",
        "This draft should be reviewed by a solicitor before public launch."
      ]
    },
    terms: {
      label: "Terms & Conditions",
      title: "Terms & Conditions",
      intro: "These draft terms explain the intended relationship between KonnectATradie, customers and tradespeople.",
      points: [
        "KonnectATradie is a marketplace platform that helps customers and tradespeople connect.",
        "Tradespeople are independent service providers responsible for their own work, pricing, insurance and availability.",
        "Customers are responsible for reviewing profiles, quotes and information before agreeing work.",
        "KonnectATradie does not guarantee workmanship, job completion or the outcome of agreements between users.",
        "This draft should be reviewed by a solicitor before public launch."
      ]
    },
    legal: {
      label: "Legal",
      title: "Legal Notice",
      intro: "This draft legal notice helps clarify platform responsibilities.",
      points: [
        "Approved, reviewed or verified profiles mean information has been provided or reviewed through the platform process where applicable.",
        "Verification does not remove the customer’s responsibility to carry out their own checks before hiring.",
        "KonnectATradie is not the employer, contractor or agent of any tradesperson listed on the platform.",
        "Any work agreed is between the customer and the tradesperson.",
        "Professional legal wording should be finalised before public launch."
      ]
    }
  };

  const page = pages[type] || pages.legal;

  return <section className="legal-page">
    <div className="action-header">
      <div>
        <span className="label">{page.label}</span>
        <h1>{page.title}</h1>
        <p>{page.intro}</p>
      </div>
      <div className="hero-actions compact-actions">
        <button className="secondary" onClick={() => setTab("home")}>Back home</button>
      </div>
    </div>

    <div className="legal-card">
      {page.points.map((point, index) => (
        <div className="legal-point" key={index}>
          <strong>{index + 1}</strong>
          <p>{point}</p>
        </div>
      ))}
    </div>
  </section>;
}


function Home({ setTab, goPostJob }) {
  return <section className="homepage-upgrade">
    <div className="hero-v3">
      <div className="hero-v3-copy">
        <div className="eyebrow">Ireland’s trade marketplace</div>
        <h1>Find the right tradesperson, right when you need them</h1>
        <p className="hero-copy">
          KonnectATradie connects customers with trusted, qualified tradespeople across Ireland, delivering a seamless and reliable way to find the right expertise for every job—quickly, confidently, and without compromise.
        </p>
        <p className="hero-support">
          Compare quotes, chat directly, and hire with confidence — all in one place.
        </p>
        <div className="hero-actions">
          <button className="primary big" onClick={() => setTab("search")}>Find a local Tradie <Search size={18}/></button>
          <button className="secondary big" onClick={goPostJob}>Post a Job <ArrowRight size={18}/></button>
        </div>
      </div>

      <div className="hero-v3-panel">
        <div className="hero-v3-image-card">
          <img src={STOCK_IMAGES[0]} alt="Trusted TRADES work" />
          <div className="floating-trust-card">
            <ShieldCheck size={22}/>
            <div>
              <strong>Trust-first marketplace</strong>
              <span>Reviewed profiles, quotes and direct chat.</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="how-it-works">
      <div className="section-intro">
        <h2>A simpler way to get work done</h2>
      </div>

      <div className="how-grid">
        <div className="how-card">
          <div className="how-icon"><PlusCircle size={22}/></div>
          <h3>Post or search</h3>
          <p>Customers can post a job or search for available tradespeople by trade and county.</p>
        </div>
        <div className="how-card">
          <div className="how-icon"><MessageCircle size={22}/></div>
          <h3>Compare and chat</h3>
          <p>Receive quotes, ask questions, and agree the right approach before the job starts.</p>
        </div>
        <div className="how-card">
          <div className="how-icon"><BadgeCheck size={22}/></div>
          <h3>Hire with confidence</h3>
          <p>Use profile checks, reviews and portfolios to help choose the right tradesperson.</p>
        </div>
      </div>
    </div>

    <div className="mission-strip">
      <div>
        <span className="label">Our mission</span>
        <h2>Connecting customers with the right skills, at the right time, for every job.</h2>
      </div>
      <button className="primary" onClick={() => setTab("auth")}>Create account</button>
    </div>
  </section>;
}

function AboutUs({ setTab, profile }) {
  return <section className="about-page">
    <div className="action-header about-hero">
      <div>
        <span className="label">About us</span>
        <h1>About KonnectATradie</h1>
        <p>Connecting customers with trusted, available tradespeople in a smarter, faster and more transparent way.</p>
      </div>
      <div className="hero-actions compact-actions">
        <button className="primary" onClick={() => setTab(["tradesperson","tradie"].includes(profile?.role) ? "available-jobs" : "post-job")}>
          {["tradesperson","tradie"].includes(profile?.role) ? "Find jobs" : "Post a job"}
        </button>
      </div>
    </div>

    <div className="about-grid">
      <div className="about-card about-main-card">
        <div className="about-icon"><Info size={24}/></div>
        <h2>Why we exist</h2>
        <p>
          KonnectATradie was created to solve a simple but frustrating problem — finding the right tradesperson should not be difficult, uncertain, or time-consuming.
        </p>
        <p>
          Instead of endless searching, unanswered calls, or unclear pricing, KonnectATradie allows customers to post jobs, receive quotes, and communicate directly with tradespeople — all in one place.
        </p>
        <p>
          For tradespeople, we provide access to real, local job opportunities without the hassle of chasing leads. You choose the jobs that suit you, set your own price, and build your reputation through your work.
        </p>
      </div>

      <div className="about-card mission-card">
        <div className="about-icon"><ShieldCheck size={24}/></div>
        <h2>Our mission</h2>
        <p>
          To bridge the gap between customers and skilled tradespeople by making it simple, transparent, and reliable to get jobs done.
        </p>
      </div>
    </div>

    <div className="difference-section">
      <div className="section-intro">
        <span className="label">What makes us different</span>
        <h2>Built for trust, not guesswork</h2>
      </div>

      <div className="difference-grid">
        <div className="difference-card"><CheckCircle size={22}/><strong>Direct communication</strong><span>Customers and tradespeople can chat clearly before agreeing the work.</span></div>
        <div className="difference-card"><Euro size={22}/><strong>Transparent quoting</strong><span>Quotes are kept in one place so both sides know where they stand.</span></div>
        <div className="difference-card"><Clock size={22}/><strong>Availability focused</strong><span>Tradespeople can choose jobs that suit their schedule and location.</span></div>
        <div className="difference-card"><Star size={22}/><strong>Reputation building</strong><span>Reviews, portfolio photos and verification help good tradespeople stand out.</span></div>
      </div>
    </div>

    <div className="about-close">
      <h2>Whether you need work done or want to grow your business, KonnectATradie helps connect the right people quickly and confidently.</h2>
    </div>
  </section>;
}


function Auth({
  setTab,
  setMessage,
  setAccountConfirmOpen,
  returnTab = "dashboard"
}) {
  const [mode, setMode] = useState("login");  
  const [signupStep, setSignupStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState("customer");
  const [authBusy, setAuthBusy] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showAccountRecovery, setShowAccountRecovery] = useState(false);
  const [recoveryName, setRecoveryName] = useState("");
  const [recoveryPhone, setRecoveryPhone] = useState("");

  async function submit(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = f.get("email");
    const password = f.get("password");

    setAuthBusy(true);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setAuthBusy(false);

      if (error) return setMessage(error.message);

      setMessage("Logged in.");
      setTab(returnTab);
      return;
    }

    const role = selectedRole || f.get("role") || "customer";
    const fullName = f.get("full_name");
    const phone = f.get("phone");
    const county = f.get("county");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          full_name: fullName,
          phone,
          county
        }
      }
    });

    if (error) {
      setAuthBusy(false);
      return setMessage(error.message);
    }

    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        email,
        role,
        full_name: fullName,
        phone,
        county
      }, { onConflict: "id" });

      setAuthBusy(false);
      setMessage("");
      setAccountConfirmOpen?.(true);
      setTimeout(() => {
        setAccountConfirmOpen?.(false);
        setTab(returnTab);
      }, 1400);
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setSignupStep(1);
    setMessage("");
  }

  async function continueWithGoogle() {
    setAuthBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) {
      setAuthBusy(false);
      setMessage(error.message);
    }
  }

  async function sendPasswordReset() {
    const email = resetEmail.trim();
    if (!email) {
      setMessage("Enter your email above first.");
      return;
    }

    setAuthBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    });
    setAuthBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Password reset email sent. Check your inbox.");
  }

  async function recoverLoginEmail() {
    if (!recoveryName.trim() || !recoveryPhone.trim()) {
      setMessage("Enter the full name and phone number used on the account.");
      return;
    }

    setAuthBusy(true);
    try {
      const response = await fetch("/.netlify/functions/recover-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: recoveryName.trim(),
          phone: recoveryPhone.trim()
        })
      });

      const result = await response.json().catch(() => ({}));
      setMessage(result.message || "If the details match an account, a login reminder has been sent.");
      setShowAccountRecovery(false);
    } catch (error) {
      setMessage("Account recovery could not be sent. Please try again.");
    } finally {
      setAuthBusy(false);
    }
  }

  return <section className="premium-auth-shell">
    <div className="premium-auth-hero">
      <span className="label">KonnectATradie</span>
      <h1>Find the right tradesperson. Fast.</h1>
      <p>Built to connect customers with available, trusted TRADES across Ireland — with quotes, reviews and clear job updates in one place.</p>

      <div className="auth-benefits">
        <div><CheckCircle size={20}/><span>Verified listings and real reviews</span></div>
        <div><MessageCircle size={20}/><span>Quote, chat and track jobs easily</span></div>
        <div><ShieldCheck size={20}/><span>Customer and tradesperson dashboards</span></div>
      </div>

      <div className="auth-proof-card">
        <strong>Launch-ready marketplace flow</strong>
        <span>Customers post jobs. Tradespeople quote. Both sides stay updated.</span>
      </div>
    </div>

    <div className="premium-auth-card">
      <div className="auth-toggle-premium">
        <button type="button" className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")}>Login</button>
        <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => switchMode("signup")}>Create account</button>
      </div>

      {mode === "login" ? <>
        <div className="auth-card-heading">
          <span className="label">Welcome back</span>
          <h2>Login to your account</h2>
          <p>Access your dashboard, quotes, bookings and messages.</p>
        </div>

        <form onSubmit={submit} className="premium-auth-form">
          <Input label="Email" name="email" type="email" required onChange={(e) => setResetEmail(e.target.value)}/>
          <Input label="Password" name="password" type="password" minLength="6" required/>
          <button className="primary full auth-submit" disabled={authBusy}>{authBusy ? "Logging in..." : "Login"}</button>
          <div className="account-recovery-links">
            <button type="button" className="forgot-password-link" disabled={authBusy} onClick={sendPasswordReset}>Forgot password?</button>
            <button type="button" className="forgot-password-link" disabled={authBusy} onClick={() => setShowAccountRecovery(v => !v)}>Forgot login email?</button>
          </div>
          {showAccountRecovery && <div className="account-recovery-box">
            <strong>Recover your login email</strong>
            <p>Enter the name and phone number used when the account was created. A reminder will be sent to the registered email address.</p>
            <Input label="Full name" value={recoveryName} onChange={(e) => setRecoveryName(e.target.value)} autoComplete="name"/>
            <Input label="Phone number" value={recoveryPhone} onChange={(e) => setRecoveryPhone(e.target.value)} autoComplete="tel"/>
            <button type="button" className="secondary full" disabled={authBusy} onClick={recoverLoginEmail}>Send login reminder</button>
          </div>}
          <button type="button" className="secondary full google-btn" disabled={authBusy} onClick={continueWithGoogle}>
            <span className="google-mark">G</span>
            Continue with Google
          </button>
          <p className="auth-trust">🔒 Your data is secure. No spam. No hidden fees.</p>
        </form>

        <button className="text-btn auth-switch-link" onClick={() => switchMode("signup")}>New here? Create an account</button>
      </> : <>
        <div className="auth-card-heading">
          <span className="label">Create account</span>
          <h2>{signupStep === 1 ? "Choose how you’ll use it" : "Set up your details"}</h2>
          <p>{signupStep === 1 ? "Pick the account type that matches what you need today." : "This helps us personalise your dashboard straight away."}</p>
        </div>

        <form onSubmit={submit} className="premium-auth-form">
          {signupStep === 1 && <div className="role-choice-grid">
            <div className="role-selection-hint">
              <strong>Choose your starting point</strong>
              <span>You can still use the rest of the platform after your account is created.</span>
            </div>
            <button type="button" className={`role-choice ${selectedRole === "customer" ? "active" : ""}`} onClick={() => setSelectedRole("customer")}>
              <HomeIcon size={24}/>
              <strong>I need a tradesperson</strong>
              <span>Post jobs, review quotes and book trusted TRADES.</span>
            </button>

            <button type="button" className={`role-choice ${selectedRole === "tradesperson" ? "active" : ""}`} onClick={() => setSelectedRole("tradesperson")}>
              <Hammer size={24}/>
              <strong>I’m a tradesperson</strong>
              <span>Find jobs, send quotes and manage customer requests.</span>
            </button>

            <input type="hidden" name="role" value={selectedRole}/>
            <button type="button" className="primary full auth-submit" onClick={() => setSignupStep(2)}>Continue</button>
          </div>}

          {signupStep === 2 && <>
            <input type="hidden" name="role" value={selectedRole}/>
            <div className="signup-step-pill">{selectedRole === "tradesperson" ? "Tradesperson account" : "Customer account"}</div>
            <Input label="Full name" name="full_name" required/>
            <Input label="Phone" name="phone"/>
            <Select label="County" name="county" options={COUNTIES}/>
            <Input label="Email" name="email" type="email" required/>
            <Input label="Password" name="password" type="password" minLength="6" required/>
            <div className="auth-form-actions">
              <button type="button" className="secondary" onClick={() => setSignupStep(1)}>Back</button>
              <button className="primary" disabled={authBusy}>{authBusy ? "Creating account..." : "Create account"}</button>
            </div>
            <p className="auth-trust">🔒 Your data is secure. No spam. No hidden fees.</p>
          </>}
        </form>

        <button className="text-btn auth-switch-link" onClick={() => switchMode("login")}>Already have an account? Login</button>
      </>}
    </div>
  </section>;
}









function JobsBoard({
  profile,
  tradespeople,
  jobPosts,
  myTradie,
  setSelectedTradie,
  setSelectedJobPost,
  setTab,
  setMessage,
  loadPrivateData,
  loadPublicData
}) {
  return (
    <section>
      <div className="jobs-board-combo">
        <Suspense
          fallback={
            <LoadingState
              title="Loading job map…"
              text="We are preparing the map and available jobs."
            />
          }
        >
          <MapView
            profile={profile}
            tradespeople={tradespeople}
            jobPosts={jobPosts}
            setSelectedTradie={setSelectedTradie}
            setSelectedJobPost={setSelectedJobPost}
            setTab={setTab}
          />
        </Suspense>

        {["tradesperson", "tradie"].includes(profile?.role) && (
          <AvailableJobs
            jobPosts={jobPosts}
            myTradie={myTradie}
            profile={profile}
            setMessage={setMessage}
            loadPrivateData={loadPrivateData}
            loadPublicData={loadPublicData}
            setSelectedJobPost={setSelectedJobPost}
            setTab={setTab}
          />
        )}
      </div>
    </section>
  );
}


function Dashboard({ profile, session, setMessage, loadProfile, loadPublicData, jobs, jobPosts, quotes, reviews, messages, loadPrivateData, documents, myTradie, quotesFor, setSelectedJobPost, setTab }) {
  if (!profile) return <LoadingState title="Setting up your dashboard…" text="We are loading your account, jobs and recent activity."/>;

  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const safeJobPosts = Array.isArray(jobPosts) ? jobPosts : [];
  const safeQuotes = Array.isArray(quotes) ? quotes : [];
  const safeDocuments = Array.isArray(documents) ? documents : [];
  const role = profile?.role || "customer";
  const normalisedRole = role === "tradie" ? "tradesperson" : role;

  if (!normalisedRole) return <div className="panel"><h2>Finishing account setup…</h2><p className="muted">Refresh once if this remains on screen.</p></div>;

  const myPosts = safeJobPosts.filter(j => j?.customer_id === profile.id);
  const myQuotes = safeQuotes.filter(q => q?.tradesperson_id === myTradie?.id);
  const actionBookings = safeJobs.filter(j => lifecycleStatus(j) === "requested");
  const accepted = safeJobs.filter(j => ["accepted", "in_progress", "completed", "reviewed"].includes(lifecycleStatus(j))).length;
  const pendingQuotes = safeQuotes.filter(q => q?.status === "pending").length;
  const safeQuotesFor = typeof quotesFor === "function" ? quotesFor : (() => []);

  return normalisedRole === "customer"
    ? <CustomerDashboard profile={profile} setTab={setTab} posts={myPosts} jobs={safeJobs} reviews={reviews || []} messages={messages || []} quotesFor={safeQuotesFor} setSelectedJobPost={setSelectedJobPost} stats={{action: actionBookings.length, accepted, pendingQuotes}} setMessage={setMessage} loadProfile={loadProfile} loadPublicData={loadPublicData} loadPrivateData={loadPrivateData}/>
    : <DashboardErrorBoundary setTab={setTab}><TradieDashboard profile={profile} userId={session?.user?.id} setTab={setTab} jobs={safeJobs} myQuotes={myQuotes} jobPosts={safeJobPosts} messages={messages || []} myTradie={myTradie} setSelectedJobPost={setSelectedJobPost} stats={{action: actionBookings.length, accepted, quotes: myQuotes.length, pendingQuotes}} setMessage={setMessage} loadProfile={loadProfile} loadPublicData={loadPublicData} loadPrivateData={loadPrivateData} documents={safeDocuments}/></DashboardErrorBoundary>;
}


function scrollToDashboardTitle(titleText) {
  setTimeout(() => {
    const headings = Array.from(document.querySelectorAll(".action-section h2"));
    const targetHeading = headings.find(h => (h.textContent || "").toLowerCase().includes(titleText.toLowerCase()));
    const targetSection = targetHeading?.closest(".action-section");
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, 80);
}

function CustomerDashboard({ profile, setTab, posts, jobs, reviews, messages, quotesFor, setSelectedJobPost, stats, setMessage, loadProfile, loadPublicData, loadPrivateData }) {
  const [bookingFilter, setBookingFilter] = useState("all");
  const [postFilter, setPostFilter] = useState("all");
  const [dashboardFocus, setDashboardFocus] = useState("");

const urgentPosts = posts.filter(
  (p) =>
    p.status === "open" &&
    quotesFor(p.id).some((q) => q.status === "pending")
);

const acceptedPosts = posts.filter(
  (p) => p.status === "quote_accepted"
);

const openQuotePosts = urgentPosts;

  const filteredPosts =
    dashboardFocus === "needs_attention" ? urgentPosts :
    dashboardFocus === "accepted" ? acceptedPosts :
    dashboardFocus === "open_quotes" ? openQuotePosts :
    postFilter === "all" ? posts : posts.filter(p => p.status === postFilter);

  const filteredJobs =
    dashboardFocus === "accepted"
      ? jobs.filter(j => ["accepted", "in_progress", "completed", "reviewed"].includes(lifecycleStatus(j)))
      : filterByStatus(jobs, bookingFilter);

  function applyDashboardFocus(focus) {
    setDashboardFocus(focus);
    if (focus === "needs_attention") {
      setMessage("Showing jobs needing attention.");
      scrollToDashboardTitle("Action required");
    }
    if (focus === "accepted") {
      setMessage("Showing accepted work.");
      scrollToDashboardTitle("Direct bookings");
    }
    if (focus === "open_quotes") {
      setMessage("Showing open quotes.");
      scrollToDashboardTitle("Posted jobs");
    }
  }

  function clearDashboardFocus() {
    setDashboardFocus("");
    setMessage("Showing full dashboard.");
  }

  return <section>
    <IdentityActionHeader
      label="Dashboard"
      title={`${profile?.full_name || profile?.email || "Customer"} – Dashboard`}
      subtitle="Your jobs, bookings and quotes in one place."
      primary="Post a Job"
      secondary="Map"
      onPrimary={() => setTab("post-job")}
      onSecondary={() => setTab("map")}
      avatarText={profile?.full_name || profile?.email}
      badge={{ text: "Customer account", variant: "customer" }}
    />
    <p className="hint dashboard-hint">Welcome back — start with anything marked needs attention, then review open quotes and accepted work.</p>
    <SmartOnboardingPanel
  profile={profile}
  customerJobs={posts}
  setTab={setTab}
/>
    <Stats
      activeKey={dashboardFocus}
      items={[
  [
    "Needs attention",
    urgentPosts.length,
    <AlertTriangle />,
    () => applyDashboardFocus("needs_attention"),
    "needs_attention"
  ],
  [
    "Accepted",
    acceptedPosts.length,
    <CheckCircle />,
    () => applyDashboardFocus("accepted"),
    "accepted"
  ],
  [
    "Open quotes",
    openQuotePosts.length,
    <Euro />,
    () => applyDashboardFocus("open_quotes"),
    "open_quotes"
  ]
]}
    />
    {dashboardFocus && <div className="active-filter-strip"><span>Filtered: {dashboardFocus === "needs_attention" ? "Needs attention" : dashboardFocus === "accepted" ? "Accepted" : "Open quotes"}</span><button className="secondary small-btn" onClick={clearDashboardFocus}>Clear filter</button></div>}
    <div className="action-layout">
      <div className="main-feed">
        <BookingNotificationPanel jobs={jobs} role="customer"/>
        <ActionSection icon={<Zap/>} title="Action required" subtitle="Things you should look at first.">
          {urgentPosts.length === 0 && <EmptyState
            title="You're all caught up"
            text="There are no urgent quote decisions or booking updates waiting for you."
          />}
          {urgentPosts.map(p => <JobPostCard key={p.id} job={p} priority quotesCount={quotesFor(p.id).length} onOpen={() => {setSelectedJobPost(p); setTab("job-chat");}} />)}
        </ActionSection>
        <ActionSection icon={<BriefcaseBusiness/>} title="Posted jobs" subtitle="Track quotes and conversations." filter={<StatusFilter value={postFilter} onChange={setPostFilter} options={[["all","All posted jobs"],["open","Open"],["quote_accepted","Quote accepted"],["completed","Completed"]]}/>}>
          {filteredPosts.length === 0 && (
            posts.length === 0
              ? <EmptyState
                  title="No jobs posted yet"
                  text="Post your first job to start receiving quotes from local tradespeople."
                  actionText="Post a Job"
                  onAction={() => setTab("post-job")}
                />
              : <EmptyState
                  title="No jobs match this filter"
                  text="Try another status or clear the dashboard filter to see all posted jobs."
                  actionText="Show all jobs"
                  onAction={() => { setPostFilter("all"); clearDashboardFocus(); }}
                />
          )}
          {filteredPosts.map(p => <JobPostCard key={p.id} job={p} quotesCount={quotesFor(p.id).length} onOpen={() => {setSelectedJobPost(p); setTab("job-chat");}} />)}
        </ActionSection>
        <DirectBookings jobs={filteredJobs} filter={bookingFilter} setFilter={setBookingFilter} reviews={reviews} messages={messages} profileId={profile.id} setMessage={setMessage} loadPrivateData={loadPrivateData}/>
      </div>
      <aside className="side-rail">
        <ProfileForm profile={profile} setMessage={setMessage} loadProfile={loadProfile}/>
        <ReviewForm
          profile={profile}
          jobs={jobs}
          jobPosts={posts}
          setMessage={setMessage}
          loadPublicData={loadPublicData}
        />
      </aside>
    </div>
  </section>;
}

function SmartActionNotice({ type = "success", title, text }) {
  return (
    <div className={`smart-notice smart-${type}`}>
      <strong>{title}</strong>
      {text && <span>{text}</span>}
    </div>
  );
}


function AccountConfirmedModal({ open }) {
  if (!open) return null;

  return (
    <div className="account-confirm-overlay" role="status" aria-live="polite" aria-atomic="true">
      <div className="account-confirm-modal">
        <div className="account-confirm-check"><CheckCircle size={42}/></div>
        <h2>Account confirmed</h2>
        <p>Your profile is ready. Taking you to your dashboard…</p>
      </div>
    </div>
  );
}


function SuccessMessagePopup({ message, clearMessage }) {
  const popupMessages = {
    "Profile saved.": "Changes saved",
    "Review added.": "Thanks for your review",
    "Business listing saved.": "Business listing saved",
    "Booking request sent. The tradesperson has been notified.": "Booking request sent",
    "Job posted. Tradespeople can now quote.": "Job posted",
    "Quote sent. The customer can accept or decline it.": "Quote sent",
    "Quote accepted. The tradesperson has been notified.": "Quote accepted",
    "Quote declined. You can continue reviewing other quotes.": "Quote declined",
    "Quote rescinded.": "Quote rescinded",
    "Quote removed.": "Quote removed",
    "Message sent.": "Message sent",
    "Listing approved.": "Listing approved",
    "Listing rejected.": "Listing rejected",
    "Verification approved.": "Verification approved",
    "Verification rejected.": "Verification rejected",
    "Document uploaded for review.": "Document uploaded",
    "Portfolio photo uploaded.": "Photo uploaded",
    "Photo removed.": "Photo removed",
    "Booking accepted.": "Booking accepted",
    "Booking declined.": "Booking declined",
    "Job started.": "Job started",
    "Job completed.": "Job completed",
    "Account created.": "Account confirmed",
    "Logged in.": "Logged in",
    "Signed out.": "Signed out",
    "Profile ready.": "Profile ready",
    "Account created. Loading your dashboard...": "Account confirmed"
  };

  const exactTitle = popupMessages[message];

  const dynamicTitle =
    exactTitle ||
    (typeof message === "string" && message.toLowerCase().includes("approved") ? "Approved" : "") ||
    (typeof message === "string" && message.toLowerCase().includes("rejected") ? "Rejected" : "") ||
    (typeof message === "string" && message.toLowerCase().includes("saved") ? "Changes saved" : "") ||
    (typeof message === "string" && message.toLowerCase().includes("sent") ? "Sent" : "") ||
    (typeof message === "string" && message.toLowerCase().includes("uploaded") ? "Uploaded" : "") ||
    (typeof message === "string" && message.toLowerCase().includes("removed") ? "Removed" : "") ||
    (typeof message === "string" && message.toLowerCase().includes("accepted") ? "Accepted" : "") ||
    (typeof message === "string" && message.toLowerCase().includes("declined") ? "Declined" : "") ||
    (typeof message === "string" && message.toLowerCase().includes("completed") ? "Completed" : "");

  // Do not show success modal for actual error messages.
  const looksLikeError =
    typeof message === "string" &&
    (
      message.toLowerCase().includes("violates") ||
      message.toLowerCase().includes("error") ||
      message.toLowerCase().includes("failed") ||
      message.toLowerCase().includes("could not") ||
      message.toLowerCase().includes("invalid") ||
      message.toLowerCase().includes("permission") ||
      message.toLowerCase().includes("constraint")
    );

  const title = looksLikeError ? "" : dynamicTitle;

  useEffect(() => {
    if (!title) return;
    const timer = setTimeout(() => clearMessage?.(), 1700);
    return () => clearTimeout(timer);
  }, [title, clearMessage]);

  if (!title) return null;

  return (
    <div className="success-popup-overlay" role="status" aria-live="polite" aria-atomic="true">
      <div className="success-popup-box">
        <div className="success-popup-check"><CheckCircle size={42}/></div>
        <h2>{title}</h2>
        <p>{message && message !== title ? message : "Action completed successfully."}</p>
      </div>
    </div>
  );
}

function PostJob({ profile, setMessage, loadPrivateData, setTab }) {
  async function submit(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.from("job_posts").insert({ customer_id: profile.id, customer_email: profile.email, customer_name: profile.full_name, customer_phone: profile.phone, trade: f.get("trade"), county: f.get("county"), job_title: f.get("job_title"), job_description: f.get("job_description"), budget_min: Number(f.get("budget_min") || 0), budget_max: Number(f.get("budget_max") || 0), urgency: f.get("urgency"), preferred_date: f.get("preferred_date") || null, status: "open" });
    if (error) return setMessage(error.message);
    setMessage("Job posted. Tradespeople can now quote and chat.");
    loadPrivateData(); setTab("dashboard");
  }
  return <section className="panel narrow"><h2>Post a Job</h2><p className="muted">Describe what you need done. Tradespeople can quote and message you.</p><form onSubmit={submit}><Input label="Job title" name="job_title" required/><Select label="Trade needed" name="trade" options={TRADES} required/><Select label="County" name="county" options={COUNTIES} required/><Textarea label="Job description" name="job_description" required/><div className="two-col"><Input label="Budget min (€)" name="budget_min" type="number"/><Input label="Budget max (€)" name="budget_max" type="number"/></div><Select label="Urgency" name="urgency" options={["ASAP","This week","This month","Flexible"]}/><Input label="Preferred date" name="preferred_date" type="date"/><button className="primary full">Post job</button></form></section>;
}


function QuotesSentPage({ myTradie, quotes = [], jobPosts = [], setMessage, loadPrivateData, setSelectedJobPost, setTab }) {
  const [quoteFilter, setQuoteFilter] = useState("active");
  const [updatingId, setUpdatingId] = useState(null);

  const safeQuotes = Array.isArray(quotes) ? quotes : [];
  const safePosts = Array.isArray(jobPosts) ? jobPosts : [];

  const myQuotes = myTradie && myTradie.id
    ? safeQuotes.filter((q) => q && q.tradesperson_id === myTradie.id)
    : [];

  const activeQuotes = myQuotes.filter((q) => ["pending", "accepted"].includes(q.status || "pending"));
  const filteredQuotes =
    quoteFilter === "active"
      ? activeQuotes
      : quoteFilter === "all"
        ? myQuotes
        : myQuotes.filter((q) => (q.status || "pending") === quoteFilter);

const totalQuotes = myQuotes.length;

const pendingQuotes = myQuotes.filter(
  (q) => q.status === "pending"
).length;

const acceptedQuotes = myQuotes.filter(
  (q) => ["accepted", "completed"].includes(q.status)
).length;

const declinedQuotes = myQuotes.filter(
  (q) => q.status === "declined"
).length;

const rescindedQuotes = myQuotes.filter(
  (q) => q.status === "rescinded"
).length;

const cancelledQuotes = myQuotes.filter(
  (q) => q.status === "cancelled"
).length;

const closedLostQuotes =
  declinedQuotes +
  rescindedQuotes +
  cancelledQuotes;

const decidedQuotes =
  acceptedQuotes +
  closedLostQuotes;

const successRate =
  decidedQuotes > 0
    ? Math.round(
        (acceptedQuotes / decidedQuotes) * 100
      )
    : 0;
  const maxChart = Math.max(totalQuotes, pendingQuotes, acceptedQuotes, declinedQuotes, rescindedQuotes, 1);

  async function rescindQuote(quote) {
    if (!quote || !quote.id) {
      setMessage("Could not find that quote.");
      return;
    }

    const isAccepted = quote.status === "accepted";
    const confirmed = window.confirm(
      isAccepted
        ? "Cancel this accepted job? Use this if the customer is not proceeding after discussion."
        : "Rescind this quote? The customer will no longer be able to accept it."
    );
    if (!confirmed) return;

    setUpdatingId(quote.id);
    const nextStatus = isAccepted ? "cancelled" : "rescinded";
    const { error: quoteError } = await supabase.from("job_quotes").update({ status: nextStatus }).eq("id", quote.id);

    let postError = null;
    if (isAccepted && quote.job_post_id && !quoteError) {
      const result = await supabase.from("job_posts").update({ status: "open", accepted_quote_id: null, accepted_tradesperson_id: null }).eq("id", quote.job_post_id);
      postError = result.error;
    }

    setUpdatingId(null);

    if (quoteError || postError) {
      setMessage((quoteError || postError).message);
      return;
    }

    setMessage(isAccepted ? "Job cancelled. The customer can now choose another quote." : "Quote rescinded.");
    loadPrivateData();
  }

  async function binQuote(quote) {
    if (!quote || !quote.id) {
      setMessage("Could not find that quote.");
      return;
    }

    const confirmed = window.confirm("Bin this quote? This removes it from your Quotes Sent list.");
    if (!confirmed) return;

    setUpdatingId(quote.id);
    const { error } = await supabase.from("job_quotes").delete().eq("id", quote.id);
    setUpdatingId(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Quote removed.");
    loadPrivateData();
  }

  function openChat(post) {
    if (!post) {
      setMessage("This quote is missing its related job post.");
      return;
    }
    setSelectedJobPost(post);
    setTab("job-chat");
  }

  return (
    <section>
      <div className="action-header">
        <div>
          <span className="label">Quotes sent</span>
          <h1>Quotes Sent</h1>
          <p>Track active quotes, success rate, and clean up rejected quotes.</p>
        </div>
        <div className="hero-actions compact-actions">
          <button className="primary" onClick={() => setTab("jobs-board")}>Find more jobs</button>
        </div>
      </div>

      {!myTradie && (
        <SmartActionNotice
          type="info"
          title="Business profile needed"
          text="Save your business profile before sending quotes."
        />
      )}

      <section className="quote-analytics-card">
        <div className="quote-analytics-head">
          <div>
            <h2>Quote analytics</h2>
            <p>Active quotes are shown by default. Declined and rescinded quotes stay hidden unless selected.</p>
          </div>
<div
  className="success-ring"
  style={{ "--success-rate": `${successRate}%` }}
>
            <strong>{successRate}%</strong>
            <span>success</span>
          </div>
        </div>

<div className="quote-metric-grid">
  <div>
    <strong>{totalQuotes}</strong>
    <span>Total quotes</span>
  </div>

  <div>
    <strong>{pendingQuotes}</strong>
    <span>Pending</span>
  </div>

  <div>
    <strong>{acceptedQuotes}</strong>
    <span>Won</span>
  </div>

  <div>
    <strong>{closedLostQuotes}</strong>
    <span>Closed / lost</span>
  </div>
</div>

        <div className="quote-bars">
          <QuoteBar label="Sent" value={totalQuotes} max={maxChart} />
          <QuoteBar label="Pending" value={pendingQuotes} max={maxChart} />
          <QuoteBar label="Accepted" value={acceptedQuotes} max={maxChart} />
          <QuoteBar label="Declined" value={declinedQuotes} max={maxChart} />
          <QuoteBar label="Rescinded" value={rescindedQuotes} max={maxChart} />
          <QuoteBar label="Cancelled" value={cancelledQuotes} max={maxChart} />
        </div>
      </section>

      <section className="action-section">
        <div className="section-title">
          <div className="section-title-left">
            <div className="section-ico"><Euro /></div>
            <div>
              <h2>Quotes</h2>
              <p>Filter, rescind, or bin quotes.</p>
            </div>
          </div>

          <div className="section-filter">
            <label className="filter-select">
              <span>Show</span>
              <select value={quoteFilter} onChange={(event) => setQuoteFilter(event.target.value)}>
                <option value="active">Active quotes</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
                <option value="rescinded">Rescinded</option>
                <option value="cancelled">Cancelled</option>
                <option value="all">All quotes</option>
              </select>
            </label>
          </div>
        </div>

        <div className="quotes-grid-clean">
          {filteredQuotes.length === 0 && (
            <Empty text={myQuotes.length === 0 ? "No quotes sent yet. Go to Available Jobs to send your first quote." : "No quotes match this filter."} />
          )}

          {filteredQuotes.map((quote) => {
            const status = quote.status || "pending";
            const post = safePosts.find((item) => item && item.id === quote.job_post_id);
            const isUpdating = updatingId === quote.id;
            const canBin = status === "declined" || status === "rescinded" || status === "cancelled";

            return (
              <article className={`tight-card quote-management-card quote-summary-${status}`} key={quote.id}>
                <div className="card-head">
                  <div>
                    <h3>{post ? post.job_title : "Job details unavailable"}</h3>
                    <p>{post ? post.trade : "Trade"} · {post ? post.county : "Ireland"}</p>
                  </div>
                  <Status status={status} />
                </div>

                <strong className="price">€{quote.price_eur || 0}</strong>
                <p className="truncate">{quote.note || "No quote note added."}</p>

                {status === "pending" && (
                  <SmartActionNotice type="info" title="Waiting for customer" text="You can rescind this quote if you no longer want it available." />
                )}
                {status === "accepted" && (
                  <SmartActionNotice title="Accepted ✓" text="Customer accepted this quote. Open chat to arrange next steps." />
                )}
                {status === "declined" && (
                  <SmartActionNotice type="danger" title="Declined" text="Customer declined this quote. You can bin it to remove clutter." />
                )}
                {status === "rescinded" && (
                  <SmartActionNotice type="danger" title="Rescinded" text="You withdrew this quote. You can bin it to remove clutter." />
                )}
                {status === "cancelled" && (
                  <SmartActionNotice type="danger" title="Cancelled" text="This accepted job was cancelled after discussion. You can bin it to remove clutter." />
                )}

                <div className="button-row">
                  <button className="secondary small-btn" onClick={() => openChat(post)}>Open chat</button>
                  {["pending", "accepted"].includes(status) && (
                    <button className="danger small-btn" disabled={isUpdating} onClick={() => rescindQuote(quote)}>
                      {isUpdating ? (status === "accepted" ? "Cancelling..." : "Rescinding...") : (status === "accepted" ? "Cancel job" : "Rescind quote")}
                    </button>
                  )}
                  {canBin && (
                    <button className="danger small-btn bin-btn" disabled={isUpdating} onClick={() => binQuote(quote)}>
                      {isUpdating ? "Removing..." : "Bin quote"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}

function QuoteBar({ label, value, max }) {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 4;

  return (
    <div className="quote-bar-row">
      <div className="quote-bar-label">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="quote-bar-track">
        <div className={`quote-bar-fill quote-bar-${label.toLowerCase()}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}


function AvailableJobs({ jobPosts, myTradie, profile, setMessage, loadPrivateData, loadPublicData, setSelectedJobPost, setTab }) {
  const [quoteSubmittingId, setQuoteSubmittingId] = useState(null);
  const [tradeFilter, setTradeFilter] = useState(myTradie?.trade || "");
  const [countyFilter, setCountyFilter] = useState("");

  useEffect(() => {
    if (myTradie?.trade && !tradeFilter) setTradeFilter(myTradie.trade);
  }, [myTradie]);

  const filteredJobs = jobPosts.filter((job) => {
    const tradeMatch = tradeFilter ? job.trade === tradeFilter : true;
    const countyMatch = countyFilter ? job.county === countyFilter : true;
    return tradeMatch && countyMatch;
  });

  const suggestedJobs = jobPosts
    .filter((job) => myTradie?.trade ? job.trade === myTradie.trade : true)
    .slice(0, 3);

  async function findTradieProfile() {
    if (myTradie?.id) return myTradie;
    if (!profile?.id) return null;

    const { data, error } = await supabase
      .from("tradesperson_profiles")
      .select("*")
      .eq("user_id", profile.id)
      .maybeSingle();

    if (error) {
      setMessage(error.message);
      return null;
    }

    return data || null;
  }

  async function quote(e, jobPostId) {
    e.preventDefault();
    const form = e.currentTarget;
    setQuoteSubmittingId(jobPostId);

    try {
      const tradieProfile = await findTradieProfile();

      if (!tradieProfile?.id) {
        setMessage("Create your tradesperson profile first.");
        return;
      }

      const f = new FormData(form);

      const insertPromise = supabase.from("job_quotes").insert({
        job_post_id: jobPostId,
        tradesperson_id: tradieProfile.id,
        price_eur: Number(f.get("price_eur")),
        note: f.get("note"),
        status: "pending"
      }).select("id").single();

      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ error: { message: "Quote send timed out. Please check your connection and try again." } }), 12000)
      );

      const { data: createdQuote, error } = await Promise.race([insertPromise, timeoutPromise]);

      if (error) {
        setMessage(error.message || "Quote could not be sent.");
        return;
      }

      sendPlatformNotification({
        event: "quote_received",
        jobPostId,
        quoteId: createdQuote?.id,
        senderUserId: profile?.id
      });

      setMessage("Quote sent. The customer has been notified.");
      form.reset();
      setTab("quotes-sent");

      loadPrivateData?.();
      loadPublicData?.();
    } catch (err) {
      setMessage(err?.message || "Quote could not be sent.");
    } finally {
      setQuoteSubmittingId(null);
    }
  }

  function clearJobFilters() {
    setTradeFilter("");
    setCountyFilter("");
    setMessage("Showing all available jobs.");
  }

  function JobQuoteCard({ j }) {
    return <article className="tight-card available-job-card" key={j.id}>
      <div className="card-head">
        <div>
          <h3>{j.job_title}</h3>
          <p>{j.trade} · {j.county}</p>
        </div>
        <Status status={j.status}/>
      </div>

      <p>{j.job_description}</p>
      <p><strong>Budget:</strong> €{j.budget_min || 0} - €{j.budget_max || "open"}</p>

      <div className="job-card-actions">
        <button className="secondary small-btn" onClick={() => {setSelectedJobPost(j); setTab("job-chat");}}>Open chat</button>
      </div>

      <form onSubmit={(e) => quote(e, j.id)} className="quote-form">
        <Input label="Your quote (€)" name="price_eur" type="number" required/>
        <Textarea label="Quote note" name="note"/>
        <button className="primary full" disabled={quoteSubmittingId === j.id}>{quoteSubmittingId === j.id ? "Sending quote..." : "Send quote"}</button>
      </form>
    </article>;
  }

  return <section>
    <div className="action-header">
      <div>
        <span className="label">Jobs board</span>
        <h1>Available Jobs</h1>
        <p>Filter by trade and county, then quote on live customer jobs. Your own trade is selected by default when available.</p>
      </div>
    </div>

    <div className="jobs-filter-panel">
      <div>
        <label>Trade</label>
        <select value={tradeFilter} onChange={(e) => setTradeFilter(e.target.value)}>
          <option value="">All TRADES</option>
          {TRADES.map((trade) => <option key={trade} value={trade}>{trade}</option>)}
        </select>
      </div>

      <div>
        <label>County</label>
        <select value={countyFilter} onChange={(e) => setCountyFilter(e.target.value)}>
          <option value="">All COUNTIES</option>
          {COUNTIES.map((county) => <option key={county} value={county}>{county}</option>)}
        </select>
      </div>

      <button className="secondary small-btn" onClick={clearJobFilters}>Clear filters</button>
    </div>

    <div className="jobs-board-summary">
      <div><strong>{filteredJobs.length}</strong><span>Matching jobs</span></div>
      <div><strong>{jobPosts.length}</strong><span>Total open jobs</span></div>
      <div><strong>{tradeFilter || "All TRADES"}</strong><span>Current trade filter</span></div>
    </div>

    {filteredJobs.length === 0 && jobPosts.length > 0 && <div className="smart-empty-board">
      <h3>No exact matches for these filters</h3>
      <p>There are still open jobs available. Clear filters or check suggested jobs below.</p>
      <button className="primary small-btn" onClick={clearJobFilters}>Show all available jobs</button>
    </div>}

    {jobPosts.length === 0 && <EmptyState title="No available jobs yet" text="New customer jobs will appear here as soon as they are posted."/>}

    {filteredJobs.length > 0 && <div className="cards">
      {filteredJobs.map(j => <JobQuoteCard key={j.id} j={j}/>)}
    </div>}

    {filteredJobs.length === 0 && suggestedJobs.length > 0 && <div className="suggested-jobs-block">
      <div className="section-title">
        <div className="section-title-left">
          <div className="section-ico"><BriefcaseBusiness size={18}/></div>
          <div>
            <h2>Suggested open jobs</h2>
            <p>Showing a few open jobs so the board never feels empty.</p>
          </div>
        </div>
      </div>
      <div className="cards">
        {suggestedJobs.map(j => <JobQuoteCard key={j.id} j={j}/>)}
      </div>
    </div>}
  </section>;
}

function JobChat({ jobPost, profile, messagesFor, quotesFor, tradespeople, reviews = [], setMessage, loadPrivateData, setTab }) {
  const [quoteActionId, setQuoteActionId] = useState(null);
  const [messageSending, setMessageSending] = useState(false);
  const [quoteFilter, setQuoteFilter] = useState("active");
  const [recentlyAcceptedQuote, setRecentlyAcceptedQuote] = useState(null);
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);
  const [recentlySubmittedQuote, setRecentlySubmittedQuote] = useState(null);
  const [quoteStatusOverrides, setQuoteStatusOverrides] = useState({});

async function submitQuote(e) {
  e.preventDefault();

  if (profile.role === "customer") return;

  const form = e.currentTarget;
  const formData = new FormData(form);
  const price = Number(formData.get("price_eur"));
  const note = String(formData.get("note") || "").trim();

  if (!Number.isFinite(price) || price <= 0) {
    setMessage("Enter a valid quote amount.");
    return;
  }

  setQuoteSubmitting(true);

  try {
    const { data: tradieProfile, error: profileError } = await supabase
      .from("tradesperson_profiles")
      .select("id")
      .eq("user_id", profile.id)
      .maybeSingle();

    if (profileError) {
      setMessage(profileError.message);
      return;
    }

    if (!tradieProfile?.id) {
      setMessage("Create your tradesperson profile before sending a quote.");
      return;
    }

    const { data: createdQuote, error: quoteError } = await supabase
      .from("job_quotes")
      .insert({
        job_post_id: jobPost.id,
        tradesperson_id: tradieProfile.id,
        price_eur: price,
        note,
        status: "pending"
      })
      .select(
        "id, job_post_id, tradesperson_id, price_eur, note, status, created_at"
      )
      .single();

    if (quoteError) {
      setMessage(quoteError.message || "Quote could not be sent.");
      return;
    }

    sendPlatformNotification({
      event: "quote_received",
      jobPostId: jobPost.id,
      quoteId: createdQuote?.id,
      senderUserId: profile.id
    });

    setRecentlySubmittedQuote(createdQuote);
    form.reset();
    setQuoteFilter("active");
    setMessage("Quote sent. The customer has been notified.");
    await loadPrivateData();

  } catch (error) {
    setMessage(error?.message || "Quote could not be sent.");
  } finally {
    setQuoteSubmitting(false);
  }
}


  async function sendMessage(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const msg = String(formData.get("message") || "").trim();
    if (!msg) return;

    setMessageSending(true);
    const { error } = await supabase
      .from("job_messages")
      .insert({
        job_post_id: jobPost.id,
        sender_id: profile.id,
        message: msg
      });
    setMessageSending(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    const accepted = quotesFor(jobPost.id).find((q) => q.status === "accepted");
    const tradie = accepted
      ? tradespeople.find((t) => t.id === accepted.tradesperson_id)
      : null;
    const recipientUserId =
      profile.role === "customer" ? tradie?.user_id : jobPost.customer_id;

    sendPlatformNotification({
      event: "message_received",
      jobPostId: jobPost.id,
      senderUserId: profile.id,
      recipientUserId,
      messageText: msg
    });

    setMessage("Message sent.");
    form.reset();
    await loadPrivateData();
  }

  async function acceptQuote(q) {
    if (!q?.id || profile.role !== "customer") return;

    const tradieName =
      tradespeople.find((tradie) => tradie.id === q.tradesperson_id)?.business_name ||
      "this tradesperson";

    const confirmed = window.confirm(
      `Accept the €${q.price_eur} quote from ${tradieName}? This will confirm them for the job.`
    );

    if (!confirmed) return;

    setQuoteActionId(q.id);

    try {
      const { error: acceptError } = await supabase.rpc("accept_job_quote", {
        p_quote_id: q.id
      });

      if (acceptError) {
        setMessage(acceptError.message);
        return;
      }

      const accepted = { ...q, status: "accepted" };

      setQuoteStatusOverrides((current) => ({
        ...current,
        [q.id]: "accepted"
      }));

      setRecentlyAcceptedQuote(accepted);
      setQuoteFilter("accepted");

      sendPlatformNotification({
        event: "quote_accepted",
        jobPostId: jobPost.id,
        quoteId: q.id,
        senderUserId: profile.id
      });

      setMessage(
        "Quote accepted. The tradesperson has been notified and chat is now open."
      );

      await loadPrivateData();

      setTimeout(() => {
        document
          .getElementById("confirmed-job-chat-panel")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    } catch (error) {
      setMessage(error?.message || "Quote could not be accepted.");
    } finally {
      setQuoteActionId(null);
    }
  }

  async function declineQuote(q) {
    if (!q?.id || profile.role !== "customer") return;

    const tradieName =
      tradespeople.find((tradie) => tradie.id === q.tradesperson_id)?.business_name ||
      "this tradesperson";

    const confirmed = window.confirm(
      `Decline the €${q.price_eur} quote from ${tradieName}? It will move out of your active quotes.`
    );

    if (!confirmed) return;

    setQuoteActionId(q.id);

    try {
      const { error } = await supabase
        .from("job_quotes")
        .update({ status: "declined" })
        .eq("id", q.id);

      if (error) {
        setMessage(error.message);
        return;
      }

      setQuoteStatusOverrides((current) => ({
        ...current,
        [q.id]: "declined"
      }));

      if (recentlyAcceptedQuote?.id === q.id) {
        setRecentlyAcceptedQuote(null);
      }

      setQuoteFilter("active");
      setMessage("Quote declined. You can continue reviewing other quotes.");
      await loadPrivateData();
    } catch (error) {
      setMessage(error?.message || "Quote could not be declined.");
    } finally {
      setQuoteActionId(null);
    }
  }

  async function cancelAcceptedQuote(q) {
    if (!q?.id) return;

    const isCustomer = profile.role === "customer";

    const confirmed = window.confirm(
      isCustomer
        ? "Cancel this accepted job? You can still accept another quote afterwards."
        : "Cancel this accepted job? Use this if the customer is not proceeding after discussion."
    );

    if (!confirmed) return;

    setQuoteActionId(q.id);

    try {
const { error: cancelError } = await supabase.rpc(
  "cancel_accepted_job_quote",
  {
    p_quote_id: q.id
  }
);

if (cancelError) {
  setMessage(cancelError.message);
  return;
}

      setQuoteStatusOverrides((current) => ({
        ...current,
        [q.id]: "cancelled"
      }));

      setRecentlyAcceptedQuote(null);
      setQuoteFilter("active");

      setMessage(
        isCustomer
          ? "Job cancelled. You can now accept another quote."
          : "Job cancelled. The customer can now choose another quote."
      );

      await loadPrivateData();
    } catch (error) {
      setMessage(error?.message || "The accepted job could not be cancelled.");
    } finally {
      setQuoteActionId(null);
    }
  }

  const loadedQuotes = quotesFor(jobPost.id) || [];

  const quoteCandidates =
    recentlySubmittedQuote &&
    !loadedQuotes.some((quote) => quote.id === recentlySubmittedQuote.id)
      ? [...loadedQuotes, recentlySubmittedQuote]
      : loadedQuotes;

  const qlist = quoteCandidates.map((quote) => {
    const overriddenStatus = quoteStatusOverrides[quote.id];

    return overriddenStatus
      ? { ...quote, status: overriddenStatus }
      : quote;
  });

const pendingQuotes = qlist.filter(
  (q) => q.status === "pending"
);

const acceptedQuotes = qlist.filter(
  (q) => q.status === "accepted"
);

const completedQuotes = qlist.filter(
  (q) => q.status === "completed"
);

const declinedQuotes = qlist.filter(
  (q) =>
    q.status === "declined" ||
    q.status === "rescinded" ||
    q.status === "cancelled"
);

const activeQuotes = qlist.filter(
  (q) =>
    q.status === "pending" ||
    q.status === "accepted"
);

const acceptedQuote =
  recentlyAcceptedQuote ||
  acceptedQuotes[0] ||
  null;

const completedQuote =
  completedQuotes[0] ||
  null;

const winningQuote =
  acceptedQuote ||
  completedQuote ||
  null;

const acceptedTradie = winningQuote
  ? tradespeople.find(
      (t) => t.id === winningQuote.tradesperson_id
    )
  : null;

const acceptedTradieName =
  acceptedTradie?.business_name ||
  acceptedTradie?.contact_name ||
  "Tradesperson";

const filteredQuotes =
  quoteFilter === "active"
    ? activeQuotes
    : quoteFilter === "pending"
      ? pendingQuotes
      : quoteFilter === "accepted"
        ? [...acceptedQuotes, ...completedQuotes]
        : quoteFilter === "declined"
          ? declinedQuotes
          : qlist;

const currentTradie = tradespeople.find(
  (tradie) => tradie.user_id === profile.id
);

const currentTradieId =
  currentTradie?.id ||
  recentlySubmittedQuote?.tradesperson_id ||
  null;

const myQuotes = currentTradieId
  ? qlist.filter(
      (quote) =>
        quote.tradesperson_id === currentTradieId
    )
  : [];

const myActiveQuote =
  myQuotes.find(
    (quote) =>
      quote.status === "pending" ||
      quote.status === "accepted" ||
      quote.status === "completed"
  ) || null;

const isCustomer =
  profile.role === "customer";

const isCompletedJob =
  jobPost.status === "completed";
const hasCustomerReview = isCustomer && reviews.some(
  (review) =>
    String(review.customer_id) === String(profile.id) &&
    String(review.job_post_id) === String(jobPost.id)
);
const messageList = messagesFor(jobPost.id) || [];

function messageSenderLabel(message) {
  if (message.sender_id === profile.id) return "You";
  return isCustomer ? acceptedTradieName : "Customer";
}

function scrollToWorkspaceSection(sectionId) {
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

const nextAction = isCompletedJob
  ? {
      eyebrow: "Job completed",
      title: "This job has been completed",
      text: isCustomer
        ? hasCustomerReview
          ? "Your review has been submitted. You can view it from the Reviews panel on your dashboard."
          : "The completed quote remains available, and you can now review your tradesperson."
        : "The completed quote and conversation remain available for your records.",
      button: isCustomer ? (hasCustomerReview ? "View my review" : "Leave a review") : "View conversation",
      target: isCustomer ? null : "workspace-conversation"
    }
  : isCustomer
    ? acceptedQuote
      ? {
          eyebrow: "Your next step",
          title: "Arrange the job with your tradesperson",
          text: "Confirm the date, access and final details in the job conversation.",
          button: "Open job chat",
          target: "workspace-conversation"
        }
      : qlist.length > 0
        ? {
            eyebrow: "Your next step",
            title: "Compare your quotes",
            text: "Review the prices and messages, then accept the quote that suits you best.",
            button: "Review quotes",
            target: "workspace-quotes"
          }
        : {
            eyebrow: "Current status",
            title: "Waiting for tradespeople to quote",
            text: "Your job is live. New quotes will appear here as soon as they arrive.",
            button: "View job details",
            target: "workspace-job-details"
          }
    : myActiveQuote
      ? {
          eyebrow:
            myActiveQuote.status === "completed"
              ? "Job completed"
              : "Your next step",
          title:
            myActiveQuote.status === "completed"
              ? "This job has been completed"
              : myActiveQuote.status === "accepted"
                ? "Arrange the job details"
                : "Stay available for questions",
          text:
            myActiveQuote.status === "completed"
              ? "Your completed quote remains available as part of the job record."
              : myActiveQuote.status === "accepted"
                ? "Use the conversation to agree the date, access and final details."
                : "The customer is reviewing your quote. You can answer questions in the conversation.",
          button: "Open conversation",
          target: "workspace-conversation"
        }
      : {
          eyebrow: "Your next step",
          title: "Send a clear quote",
          text: "Add your price and a short message explaining what is included.",
          button: "Create quote",
          target: "workspace-quote-composer"
        };

  return <section>
    <div className="action-header">
      <div>
        <span className="label">Job conversation</span>
        <h1>{jobPost.job_title}</h1>
        <p>{jobPost.trade} · {jobPost.county}</p>
      </div>
    </div>


    <div className="workspace-next-action" role="status">
      <div className="workspace-next-action-icon">
        {acceptedQuote ? <CheckCircle size={22}/> : <ArrowRight size={22}/>}
      </div>
      <div className="workspace-next-action-copy">
        <span className="label">{nextAction.eyebrow}</span>
        <h2>{nextAction.title}</h2>
        <p>{nextAction.text}</p>
      </div>
      <button
        type="button"
        className="primary"
        onClick={() => {
          if (isCompletedJob && isCustomer) {
            setTab("dashboard");
            setTimeout(() => {
              document
                .getElementById("customer-review-form")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
              if (hasCustomerReview) {
                window.dispatchEvent(new Event("kta-open-review-history"));
              }
            }, 120);
            return;
          }

          scrollToWorkspaceSection(nextAction.target);
        }}
      >
        {nextAction.button}
      </button>
    </div>

    <div className="job-workspace-overview">
  <div id="workspace-job-details" className="side-card job-workspace-details">
    <span className="label">Job details</span>
    <h2>{jobPost.job_title}</h2>

    <div className="job-workspace-meta">
      <span><strong>Trade:</strong> {jobPost.trade}</span>
      <span><strong>County:</strong> {jobPost.county}</span>
      <span>
        <strong>Budget:</strong>{" "}
        €{jobPost.budget_min || 0} – €{jobPost.budget_max || "Open"}
      </span>
      <span><strong>Status:</strong> {jobPost.status}</span>
    </div>

    <p>{jobPost.job_description}</p>
  </div>

  {!isCustomer && (
    <div id="workspace-quote-composer" className="side-card job-workspace-quote-composer">
      <span className="label">
        {myActiveQuote ? "Your current quote" : "Send your quote"}
      </span>

      {myActiveQuote ? (
        <>
          <div className="workspace-current-quote">
            <strong>€{myActiveQuote.price_eur}</strong>
            <Status status={myActiveQuote.status} />
          </div>

          {myActiveQuote.note && <p>{myActiveQuote.note}</p>}

<SmartActionNotice
  type="info"
  title={
    myActiveQuote.status === "completed"
      ? "Job completed"
      : myActiveQuote.status === "accepted"
        ? "Quote accepted"
        : "Waiting for customer"
  }
  text={
    myActiveQuote.status === "completed"
      ? "This quote is retained as part of the completed job record."
      : myActiveQuote.status === "accepted"
        ? "Use the conversation below to arrange the job."
        : "Your quote has been sent. Quote revisions will be added in the next stage."
  }
/>
        </>
      ) : (
        <form onSubmit={submitQuote} className="quote-form">
          <Input
            label="Your quote (€)"
            name="price_eur"
            type="number"
            required
          />

          <Textarea
            label="Quote message"
            name="note"
          />

          <button
            className="primary full"
            disabled={quoteSubmitting}
          >
            {quoteSubmitting ? "Sending quote..." : "Send quote"}
          </button>
        </form>
      )}
    </div>
  )}
</div>

    {acceptedQuote && <div id="confirmed-job-chat-panel" className="confirmed-job-panel">
      <div>
        <span className="label">Job confirmed</span>
        <h2>{acceptedTradieName} accepted for this job</h2>
        <p>Your quote is confirmed at <strong>€{acceptedQuote.price_eur}</strong>. Use chat below to agree timing, access, materials and final details.</p>
      </div>

      <div className="confirmed-contact-card">
        <strong>Tradesperson contact</strong>
        <span>{acceptedTradieName}</span>
        {acceptedTradie?.phone && <a href={`tel:${acceptedTradie.phone}`}>{acceptedTradie.phone}</a>}
        {acceptedTradie?.county && <span>{acceptedTradie.trade} · {acceptedTradie.county}</span>}
      </div>

      <div className="next-step-grid">
        <div><CheckCircle size={18}/><span>Quote accepted</span></div>
        <div><MessageCircle size={18}/><span>Arrange details in chat</span></div>
        <div><ClipboardCheck size={18}/><span>Tradesperson marks complete when finished</span></div>
      </div>

      <div className="confirmed-job-actions">
        <button className="danger small-btn" disabled={quoteActionId === acceptedQuote.id} onClick={() => cancelAcceptedQuote(acceptedQuote)}>
          {quoteActionId === acceptedQuote.id ? "Cancelling..." : "Cancel job"}
        </button>
      </div>
    </div>}

    <div className="job-workspace-main">
  {isCustomer && (
    <div id="workspace-quotes" className="side-card workspace-quotes-panel">
      <div className="quote-panel-head">
        <div>
          <span className="label">Quote management</span>
          <h3>Quotes received</h3>
          <p>
            Compare active quotes and choose the tradesperson you would
            like to hire.
          </p>
        </div>

        <label className="filter-select compact-filter">
          <span>Show</span>

          <select
            value={quoteFilter}
            onChange={(e) => setQuoteFilter(e.target.value)}
          >
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined/closed</option>
            <option value="all">All quotes</option>
          </select>
        </label>
      </div>

      {filteredQuotes.length === 0 && (
        <Empty
          text={
            qlist.length === 0
              ? "No quotes have been received yet."
              : "No quotes match this filter."
          }
        />
      )}

      <div className="customer-quotes-list">
        {filteredQuotes.map((q) => {
          const acting = quoteActionId === q.id;

          const tradieName =
            tradespeople.find(
              (tradie) => tradie.id === q.tradesperson_id
            )?.business_name || "Tradesperson";

          return (
            <div
              className={`quote-card customer-quote-card quote-card-${q.status}`}
              key={q.id}
            >
              <div className="card-head">
                <div>
                  <strong>{tradieName}</strong>

                  <p className="price">
                    {"\u20AC"}
                    {q.price_eur}
                  </p>
                </div>

                <Status status={q.status} />
              </div>

              {q.note && <p>{q.note}</p>}

              {q.status === "pending" && (
                <>
                  <div className="quote-decision-guide">
                    <strong>Decision needed</strong>
                    <span>Review the price and message before choosing this tradesperson.</span>
                  </div>

                  <div className="quote-actions quote-decision-actions">
                    <button
                      className="primary small-btn"
                      disabled={acting}
                      onClick={() => acceptQuote(q)}
                    >
                      {acting ? "Updating..." : `Accept €${q.price_eur} quote`}
                    </button>

                    <button
                      className="quote-decline-btn small-btn"
                      disabled={acting}
                      onClick={() => declineQuote(q)}
                    >
                      {acting ? "Updating..." : "Decline"}
                    </button>
                  </div>
                </>
              )}

              {q.status === "accepted" && (
                <>
                  <SmartActionNotice
                    title="Quote accepted"
                    text="This tradesperson is confirmed. Use the conversation to arrange the job."
                  />

                  <div className="quote-actions">
                    <button
                      className="danger small-btn"
                      disabled={acting}
                      onClick={() => cancelAcceptedQuote(q)}
                    >
                      {acting ? "Cancelling..." : "Cancel job"}
                    </button>
                  </div>
                </>
              )}

              {q.status === "declined" && (
                <SmartActionNotice
                  type="danger"
                  title="Quote declined"
                  text="This quote is closed and hidden from the active view."
                />
              )}

              {q.status === "rescinded" && (
                <SmartActionNotice
                  type="danger"
                  title="Quote withdrawn"
                  text="The tradesperson withdrew this quote."
                />
              )}

              {q.status === "cancelled" && (
                <SmartActionNotice
                  type="danger"
                  title="Job cancelled"
                  text="This accepted job was cancelled after discussion."
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  )}

  <div className="workspace-conversation-layout">
    <div id="workspace-conversation" className="side-card workspace-conversation">
      <div className="workspace-section-head">
  <div>
    <span className="label">Conversation</span>
    <h3>
      {isCompletedJob
        ? "Completed job conversation"
        : acceptedQuote
          ? "Job chat"
          : "Questions and messages"}
    </h3>
  </div>

  <Status
    status={
      isCompletedJob
        ? "completed"
        : acceptedQuote
          ? "quote_accepted"
          : jobPost.status
    }
  />
</div>

<div className="chat-guidance">
  <strong>
    {isCompletedJob
      ? "Job completed"
      : acceptedQuote
        ? "Arrange the job details"
        : "Discuss the job"}
  </strong>

  <span>
    {isCompletedJob
      ? "This conversation is retained as part of the completed job record."
      : acceptedQuote
        ? "Confirm the date, time, access arrangements and payment expectations before work starts."
        : "Ask questions and clarify the scope before a quote is accepted."}
  </span>
</div>

{!isCompletedJob && (
  <div className="quick-chat-prompts">
        <button
          type="button"
          onClick={(e) => {
            const input = e.currentTarget
              .closest(".workspace-conversation")
              ?.querySelector("input[name='message']");

            if (input) {
              input.value =
                "Hi, can we confirm the best time and date for this job?";
              input.focus();
            }
          }}
        >
          Confirm time/date
        </button>

        <button
          type="button"
          onClick={(e) => {
            const input = e.currentTarget
              .closest(".workspace-conversation")
              ?.querySelector("input[name='message']");

            if (input) {
              input.value = "Can you confirm what is included in the price?";
              input.focus();
            }
          }}
        >
          Confirm price
        </button>

        <button
          type="button"
          onClick={(e) => {
            const input = e.currentTarget
              .closest(".workspace-conversation")
              ?.querySelector("input[name='message']");

            if (input) {
              input.value = "Thanks, that works for me.";
              input.focus();
            }
          }}
        >
          Thanks
        </button>
      </div>
      )}

      <div className="messages workspace-messages" aria-live="polite">
        {messageList.length === 0 && (
          <div className="chat-empty">
            <MessageCircle size={28} />
            <strong>No messages yet</strong>
            <span>Send the first message to begin discussing this job.</span>
          </div>
        )}

        {messageList.map((m) => {
          const mine = m.sender_id === profile.id;

          return (
            <div className={`workspace-message-row ${mine ? "mine" : ""}`} key={m.id}>
              <div className="workspace-message-sender">{messageSenderLabel(m)}</div>
              <div className={`msg ${mine ? "mine" : ""}`}>
                <span>{m.message}</span>
                {m.created_at && (
                  <small>
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </small>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={sendMessage} className="message-form workspace-message-form">
        <input
          name="message"
          placeholder="Write a message..."
          autoComplete="off"
          maxLength={2000}
          required
        />

        <button
          className="primary"
          disabled={messageSending}
          aria-label="Send message"
        >
          {messageSending ? "..." : <Send size={18} />}
        </button>
      </form>
    </div>

    <aside className="side-card workspace-timeline">
      <div className="workspace-section-head">
        <div>
          <span className="label">Progress</span>
          <h3>Job timeline</h3>
        </div>
      </div>

      <div className="workspace-timeline-list">
        <div className="workspace-timeline-item complete">
          <span className="workspace-timeline-marker" />

          <div>
            <strong>Job posted</strong>
            <span>
              {jobPost.created_at
                ? new Date(jobPost.created_at).toLocaleString()
                : "Job is live"}
            </span>
          </div>
        </div>

        <div
          className={`workspace-timeline-item ${
            qlist.length > 0 ? "complete" : "current"
          }`}
        >
          <span className="workspace-timeline-marker" />

          <div>
            <strong>Quotes received</strong>
            <span>
              {qlist.length > 0
                ? `${qlist.length} quote${qlist.length === 1 ? "" : "s"} received`
                : "Waiting for the first quote"}
            </span>
          </div>
        </div>

<div
  className={`workspace-timeline-item ${
    winningQuote
      ? "complete"
      : qlist.length > 0
        ? "current"
        : ""
  }`}
>
  <span className="workspace-timeline-marker" />

  <div>
    <strong>Quote accepted</strong>
    <span>
      {winningQuote
        ? "A tradesperson was selected"
        : "No quote has been accepted yet"}
    </span>
  </div>
</div>

<div
  className={`workspace-timeline-item ${
    isCompletedJob
      ? "complete"
      : acceptedQuote
        ? "current"
        : ""
  }`}
>
  <span className="workspace-timeline-marker" />

  <div>
    <strong>
      {isCompletedJob ? "Job completed" : "Job arranged"}
    </strong>
    <span>
      {isCompletedJob
        ? "Work has been marked complete"
        : acceptedQuote
          ? "Confirm the final details in the conversation"
          : "Available after accepting a quote"}
    </span>
  </div>
</div>
      </div>
    </aside>
  </div>
</div>
  </section>;
}

function Booking({ selectedTradie, profile, setMessage, loadPrivateData, setTab }) {
  async function submit(e) {
    e.preventDefault();
    if (!selectedTradie) return setMessage("Choose a tradesperson first.");
    const f = new FormData(e.currentTarget);
    const expires = new Date(); expires.setDate(expires.getDate() + 7);
    const { data: createdRequest, error } = await supabase.from("job_requests").insert({ customer_id: profile.id, customer_email: profile.email, customer_name: profile.full_name, customer_phone: profile.phone, tradesperson_id: selectedTradie.id, trade: selectedTradie.trade, county: f.get("county"), job_description: f.get("job_description"), deposit_amount_eur: 0, deposit_status: "not_paid", status: "requested", lifecycle_status: "requested", requested_at: new Date().toISOString(), expires_at: expires.toISOString(), job_type: "direct_request" }).select("id").single();
    if (error) return setMessage(error.message);
    sendPlatformNotification({ event: "booking_request", jobRequestId: createdRequest?.id, recipientTradieProfileId: selectedTradie.id, senderUserId: profile.id });
    setMessage("Booking request sent. The tradesperson has been notified.");
    loadPrivateData(); setTab("dashboard");
  }
  return <section className="panel narrow"><h2>Request booking</h2><p className="muted">No booking fee is charged during launch. Send your request and track updates from your dashboard.</p><form onSubmit={submit}><Select label="County" name="county" options={COUNTIES} defaultValue={profile?.county || ""}/><Textarea label="Describe the job" name="job_description" required/><button className="primary full">Send booking request</button></form></section>;
}

function Admin({ tradespeople, documents, setMessage, loadPublicData, loadPrivateData }) {
  async function approve(id, yes) {
    const { error } = await supabase.from("tradesperson_profiles").update({
      approved: yes,
      approval_status: yes ? "approved" : "rejected"
    }).eq("id", id);

    if (error) setMessage(error.message);
    else { setMessage(yes ? "Approved." : "Rejected."); loadPublicData(); }
  }

  async function verifyTradie(tradieId, status) {
    const updates = {
      verification_status: status,
      verified_at: status === "verified" ? new Date().toISOString() : null
    };

    const { error } = await supabase.from("tradesperson_profiles").update(updates).eq("id", tradieId);
    if (error) return setMessage(error.message);

    await supabase.from("tradesperson_documents").update({
      verification_status: status,
      reviewed_at: new Date().toISOString()
    }).eq("tradesperson_id", tradieId);

    setMessage(`Tradesperson marked ${status}.`);
    loadPublicData();
    loadPrivateData();
  }

  return <section>
    <div className="page-title">
      <h1>Admin trust centre</h1>
      <p>Approve listings and verify documents before tradespeople appear trusted.</p>
    </div>

    <div className="cards">
      {tradespeople.map(t => {
        const docs = documents.filter(d => d.tradesperson_id === t.id);
        return <div className="tight-card admin-trust-card" key={t.id}>
          <div className="card-head">
            <div>
              <h3>{t.business_name}</h3>
              <p>{t.trade} · {t.county}</p>
            </div>
            <div className="admin-badges">
              <Status status={t.approved ? "approved" : "pending"}/>
              <Status status={t.verification_status || "pending"}/>
            </div>
          </div>

          <div className="trust-meta">
            <p><strong>Licence:</strong> {t.licence_number || "Not provided"}</p>
            <p><strong>Insurance expiry:</strong> {t.insurance_expiry || "Not provided"}</p>
            <p><strong>Public liability:</strong> {t.public_liability_insurance ? "Yes" : "Not confirmed"}</p>
          </div>

          <div className="admin-docs">
            <h4>Documents ({docs.length})</h4>
            {docs.length === 0 && <Empty text="No documents uploaded."/>}
            {docs.map(doc => <div className="doc-row" key={doc.id}>
              <div>
                <strong>{doc.document_type}</strong>
                <p>{doc.document_name}</p>
              </div>
              <a className="secondary small-btn" href={doc.file_url} target="_blank" rel="noreferrer">View</a>
            </div>)}
          </div>

          <div className="button-row">
            <button className="primary" onClick={()=>approve(t.id,true)}>Approve listing</button>
            <button className="danger" onClick={()=>approve(t.id,false)}>Reject listing</button>
          </div>

          <div className="button-row">
            <button className="primary" onClick={()=>verifyTradie(t.id,"verified")}>Mark verified</button>
            <button className="secondary" onClick={()=>verifyTradie(t.id,"rejected")}>Reject verification</button>
          </div>
        </div>;
      })}
    </div>
  </section>;
}


createRoot(document.getElementById("root")).render(<App />);
