import React from "react";
import {
  BriefcaseBusiness,
  Euro,
  Hammer,
  PlusCircle,
  Search
} from "lucide-react";

function MapPinFallback() {
  return <span className="map-pin-fallback">📍</span>;
}

export default function SmartOnboardingPanel({
  profile,
  myTradie,
  customerJobs = [],
  setTab
}) {
  const isTradesperson = ["tradesperson", "tradie"].includes(profile?.role);
  const displayName = profile?.full_name || profile?.email || "there";
  const hasPostedJobs = customerJobs.length > 0;

  if (!profile) return null;

  return (
    <section className="smart-onboarding-panel">
      <div className="smart-onboarding-head">
        <span className="label">Quick start</span>
        <h2>Welcome, {displayName} 👋</h2>
        <p>
          {isTradesperson
            ? "Finish your setup and start winning jobs faster."
            : "Start with the fastest path to getting your job sorted."}
        </p>
      </div>

      <div className="smart-onboarding-grid">
        {!isTradesperson && (
          <>
            <button
              className="smart-onboarding-card highlight"
              onClick={() => setTab("post-job")}
            >
              <PlusCircle size={24} />
              <strong>
                {hasPostedJobs ? "Post another job" : "Post your first job"}
              </strong>
              <span>Get quotes from available tradespeople.</span>
            </button>

            <button
              className="smart-onboarding-card"
              onClick={() => setTab("map")}
            >
              <Search size={24} />
              <strong>Find a tradesperson</strong>
              <span>Browse profiles, reviews and portfolio photos.</span>
            </button>

            <button
              className="smart-onboarding-card"
              onClick={() => setTab("map")}
            >
              <MapPinFallback />
              <strong>Open map view</strong>
              <span>See available tradespeople near your area.</span>
            </button>
          </>
        )}

        {isTradesperson && (
          <>
            <button
              className={`smart-onboarding-card ${
                !myTradie ? "highlight" : ""
              }`}
              onClick={() => setTab("dashboard")}
            >
              <Hammer size={24} />
              <strong>
                {myTradie
                  ? "Update business profile"
                  : "Complete business profile"}
              </strong>
              <span>Add trade, county, certs and portfolio photos.</span>
            </button>

            <button
              className="smart-onboarding-card highlight"
              onClick={() => setTab("jobs-board")}
            >
              <BriefcaseBusiness size={24} />
              <strong>View available jobs</strong>
              <span>Filter by your trade and send quotes.</span>
            </button>

            <button
              className="smart-onboarding-card"
              onClick={() => setTab("quotes-sent")}
            >
              <Euro size={24} />
              <strong>Quotes sent</strong>
              <span>Track accepted, pending and cancelled quotes.</span>
            </button>
          </>
        )}
      </div>
    </section>
  );
}