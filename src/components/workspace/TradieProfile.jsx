import React, { useEffect, useState } from "react";
import { BadgeCheck, Star } from "lucide-react";
import { Empty } from "./JobWorkspaceComponents";

export default function TradieProfile({
  tradie,
  photos,
  reviews,
  avgRating,
  setTab,
  setSelectedTradie
}) {
  const [activePhotoIndex, setActivePhotoIndex] = useState(null);
  const reviewCount = reviews.length;
  const verified = tradie.verification_status === "verified";
  const sortedReviews = [...reviews].sort(
    (a, b) =>
      new Date(b.created_at || 0) - new Date(a.created_at || 0)
  );

  useEffect(() => {
    if (activePhotoIndex === null) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") setActivePhotoIndex(null);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePhotoIndex]);

  function openBooking() {
    setSelectedTradie(tradie);
    setTab("book");
  }

  return (
    <section className="tradie-profile-page">
      <div className="action-header tradie-profile-hero">
        <div>
          <span className="label">Tradesperson profile</span>
          <h1>{tradie.business_name}</h1>
          <p>
            {tradie.trade} · {tradie.county}
            {tradie.service_area ? ` · ${tradie.service_area}` : ""}
          </p>
        </div>

        <div className="hero-actions compact-actions">
          <button
            className="secondary"
            onClick={() => setTab("search")}
          >
            Back to search
          </button>

          <button className="primary" onClick={openBooking}>
            Request booking
          </button>
        </div>
      </div>

      <div className="profile-trust-grid">
        <div className="trust-score-card">
          <div className="big-rating">
            <Star size={30} />
            {avgRating}
          </div>
          <p>
            {reviewCount} customer review
            {reviewCount === 1 ? "" : "s"}
          </p>
        </div>

        <div className="trust-score-card">
          <div className="big-rating">
            <BadgeCheck size={30} />
            {verified ? "Verified" : "Approved"}
          </div>
          <p>
            {verified
              ? "Documents reviewed by admin"
              : "Approved listing"}
          </p>
        </div>

        <div className="trust-score-card">
          <div className="big-rating">{photos.length}/5</div>
          <p>Portfolio photos</p>
        </div>
      </div>

      <div className="profile-trust-badges trust-badges">
        <span className="badge gold">
          ⭐ {avgRating} rating
        </span>

        <span className="badge green">
          ✔ {verified ? "Verified profile" : "Approved listing"}
        </span>

        <span className="badge blue">
          📸 {photos.length}/5 portfolio photos
        </span>

        <span className="badge">
          💬 {reviewCount} review{reviewCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="profile-layout">
        <div className="profile-main">
          <section className="profile-panel">
            <h2>About this tradesperson</h2>
            <p>{tradie.bio || "No business bio added yet."}</p>

            <div className="profile-detail-grid">
              <div>
                <strong>Trade</strong>
                <span>{tradie.trade || "Not provided"}</span>
              </div>

              <div>
                <strong>County</strong>
                <span>{tradie.county || "Not provided"}</span>
              </div>

              <div>
                <strong>Availability</strong>
                <span>{tradie.availability || "Not provided"}</span>
              </div>

              <div>
                <strong>Licence</strong>
                <span>{tradie.licence_number || "Not provided"}</span>
              </div>
            </div>
          </section>

          <section className="profile-panel">
            <div className="profile-section-head">
              <div>
                <h2>Previous work</h2>
                <p>Portfolio images uploaded by the tradesperson.</p>
              </div>
            </div>

            {photos.length === 0 && (
              <Empty text="No portfolio photos added yet." />
            )}

            <div className="public-portfolio-grid">
              {photos.map((photo, index) => (
                <button
                  className="portfolio-gallery-button"
                  key={photo.id}
                  onClick={() => setActivePhotoIndex(index)}
                >
                  <img
                    src={photo.image_url}
                    alt="Previous work"
                  />
                </button>
              ))}
            </div>
          </section>

          <section className="profile-panel reviews-panel">
            <div className="profile-section-head">
              <div>
                <h2>Customer reviews</h2>
                <p>
                  Real feedback from customers who used this
                  tradesperson.
                </p>
              </div>

              <span className="rating profile-rating-pill">
                <Star size={15} />
                {avgRating}
              </span>
            </div>

            {sortedReviews.length === 0 && (
              <Empty text="No reviews yet. This tradesperson is ready to build their reputation." />
            )}

            <div className="reviews-list">
              {sortedReviews.map((review) => (
                <article className="review-card" key={review.id}>
                  <div className="review-head">
                    <div>
                      <strong>
                        {review.customer_name || "Verified Customer"}
                      </strong>
                      <span>
                        {formatReviewDate(review.created_at)}
                      </span>
                    </div>

                    <div className="review-stars">
                      {renderStars(review.rating)}
                    </div>
                  </div>

                  <p>{review.comment}</p>

                  {review.tradesperson_response && (
                    <div className="public-review-response">
                      <strong>Response from {tradie.business_name}</strong>
                      <p>{review.tradesperson_response}</p>
                      {review.tradesperson_responded_at && (
                        <time dateTime={review.tradesperson_responded_at}>
                          {formatReviewDate(review.tradesperson_responded_at)}
                        </time>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="profile-side">
          <section className="profile-panel sticky-profile-card">
            <h2>Ready to connect?</h2>
            <p>
              Send a request and discuss the job directly with this
              tradesperson.
            </p>

            <button className="primary full" onClick={openBooking}>
              Request booking
            </button>

            <button
              className="secondary full"
              onClick={() => setTab("search")}
            >
              Back to search
            </button>
          </section>
        </aside>
      </div>

      {activePhotoIndex !== null && photos[activePhotoIndex] && (
        <div
          className="customer-photo-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Portfolio photo viewer"
        >
          <button
            className="gallery-close"
            onClick={() => setActivePhotoIndex(null)}
            aria-label="Close photo gallery"
          >
            ×
          </button>

          {photos.length > 1 && (
            <button
              className="gallery-nav gallery-prev"
              onClick={() =>
                setActivePhotoIndex(
                  (activePhotoIndex - 1 + photos.length) %
                    photos.length
                )
              }
              aria-label="Previous photo"
            >
              ‹
            </button>
          )}

          <img
            src={photos[activePhotoIndex].image_url}
            alt="Tradesperson previous work preview"
          />

          {photos.length > 1 && (
            <button
              className="gallery-nav gallery-next"
              onClick={() =>
                setActivePhotoIndex(
                  (activePhotoIndex + 1) % photos.length
                )
              }
              aria-label="Next photo"
            >
              ›
            </button>
          )}

          <div className="gallery-counter">
            {activePhotoIndex + 1} / {photos.length}
          </div>
        </div>
      )}
    </section>
  );
}

function renderStars(rating) {
  const value = Math.max(
    0,
    Math.min(5, Number(rating || 0))
  );

  return (
    "★★★★★".slice(0, value) +
    "☆☆☆☆☆".slice(0, 5 - value)
  );
}

function formatReviewDate(dateValue) {
  if (!dateValue) return "";

  try {
    return new Date(dateValue).toLocaleDateString("en-IE", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  } catch {
    return "";
  }
}
