import React from "react";
import { BadgeCheck, Star } from "lucide-react";
import { Select } from "../common/FormControls";
import { Empty } from "./JobWorkspaceComponents";
import { COUNTIES, STOCK_IMAGES, TRADES } from "../../constants";

export default function SearchPage({
  visibleTradies,
  filters,
  setFilters,
  photosFor,
  avgRating,
  reviewsFor,
  setSelectedTradie,
  setTab
}) {
  return (
    <section>
      <div className="page-title">
        <h1>Find a local Tradie</h1>
        <p>
          Search approved tradespeople by trade and county. Check reviews,
          portfolios and availability before sending a request.
        </p>
      </div>

      <div className="filters">
        <Select
          label="Trade"
          value={filters.trade}
          onChange={(event) =>
            setFilters({ ...filters, trade: event.target.value })
          }
          options={TRADES}
        />

        <Select
          label="County"
          value={filters.county}
          onChange={(event) =>
            setFilters({ ...filters, county: event.target.value })
          }
          options={COUNTIES}
        />
      </div>

      <div className="cards">
        {visibleTradies.length === 0 && (
          <Empty text="No approved tradies match yet." />
        )}

        {visibleTradies.map((tradie) => {
          const reviewCount = reviewsFor(tradie.id).length;
          const rating = avgRating(tradie.id);
          const photos = photosFor(tradie.id);
          const verified = tradie.verification_status === "verified";

          function openProfile() {
            setSelectedTradie(tradie);
            setTab("tradie-profile");
          }

          return (
            <article
              className="tradie-card enhanced-tradie-card clickable-tradie-card"
              key={tradie.id}
              role="button"
              tabIndex={0}
              onClick={openProfile}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openProfile();
                }
              }}
            >
              <div className="card-cover">
                <img
                  src={photos[0]?.image_url || STOCK_IMAGES[1]}
                  alt="Work"
                />

                <span
                  className={`approved-badge ${
                    verified ? "verified-public-badge" : ""
                  }`}
                >
                  <BadgeCheck size={15} />
                  {verified ? "Verified" : "Approved"}
                </span>
              </div>

              <div className="tradie-body">
                <div className="card-head">
                  <div>
                    <h3>{tradie.business_name}</h3>
                    <p>
                      {tradie.trade} · {tradie.county}
                    </p>
                  </div>

                  <span className="rating strong-rating">
                    <Star size={15} />
                    {rating}
                  </span>
                </div>

                <div className="review-micro-row">
                  <span>
                    {reviewCount} review{reviewCount === 1 ? "" : "s"}
                  </span>
                  <span>·</span>
                  <span>{photos.length}/5 photos</span>

                  {verified && (
                    <>
                      <span>·</span>
                      <span>Verified profile</span>
                    </>
                  )}
                </div>

                <p className="bio">
                  {tradie.bio ||
                    "Approved tradesperson available for local work."}
                </p>

                <div className="card-click-hint">
                  Click card to view profile, reviews and booking options
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
