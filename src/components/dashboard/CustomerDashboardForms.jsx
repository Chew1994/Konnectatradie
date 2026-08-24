import React, { useEffect, useState } from "react";
import { Home as HomeIcon, Star } from "lucide-react";
import { Input, Select, Textarea } from "../common/FormControls";
import { COUNTIES } from "../../constants";
import { supabase } from "../../lib/supabase";

export function ProfileForm({
  profile,
  setMessage,
  loadProfile
}) {
  async function submit(event) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.get("full_name"),
        phone: form.get("phone"),
        county: form.get("county")
      })
      .eq("id", profile.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Profile saved.");
    loadProfile();
  }

  return (
    <form className="side-card" onSubmit={submit}>
      <h3>
        <HomeIcon size={17} />
        Profile
      </h3>

      <Input
        label="Full name"
        name="full_name"
        defaultValue={profile.full_name || ""}
      />

      <Input
        label="Phone"
        name="phone"
        defaultValue={profile.phone || ""}
      />

      <Select
        label="County"
        name="county"
        defaultValue={profile.county || ""}
        options={COUNTIES}
      />

      <button className="primary">Save</button>
    </form>
  );
}

export function ReviewForm({
  profile,
  jobs = [],
  jobPosts = [],
  setMessage,
  loadPublicData
}) {
  const [tradies, setTradies] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [rating, setRating] = useState("");
  const [submittedReviews, setSubmittedReviews] = useState([]);
  const [showReviewHistory, setShowReviewHistory] = useState(false);
  const [comment, setComment] = useState("");

  const completedBookings = jobs.filter(
    (job) =>
      String(job.customer_id) === String(profile.id) &&
      (job.lifecycle_status || job.status) === "completed"
  );

  const completedMarketplaceJobs = jobPosts.filter(
    (job) =>
      String(job.customer_id) === String(profile.id) &&
      job.status === "completed" &&
      job.accepted_tradesperson_id
  );

  const reviewedJobRequestIds = new Set(
    submittedReviews
      .map((review) => review.job_request_id)
      .filter(Boolean)
      .map(String)
  );

  const reviewedJobPostIds = new Set(
    submittedReviews
      .map((review) => review.job_post_id)
      .filter(Boolean)
      .map(String)
  );

  const reviewableJobs = [
    ...completedBookings
      .filter((job) => !reviewedJobRequestIds.has(String(job.id)))
      .map((job) => ({
        key: `booking:${job.id}`,
        type: "booking",
        id: job.id,
        tradespersonId: job.tradesperson_id,
        title: job.trade || "Direct booking"
      })),
    ...completedMarketplaceJobs
      .filter((job) => !reviewedJobPostIds.has(String(job.id)))
      .map((job) => ({
        key: `marketplace:${job.id}`,
        type: "marketplace",
        id: job.id,
        tradespersonId: job.accepted_tradesperson_id,
        title: job.job_title || job.trade || "Posted job"
      }))
  ];

useEffect(() => {
  supabase
    .from("tradesperson_profiles")
    .select("*")
    .then(({ data }) => setTradies(data || []));

  supabase
    .from("reviews")
    .select("*")
    .eq("customer_id", profile.id)
    .order("created_at", { ascending: false })
    .then(({ data }) => setSubmittedReviews(data || []));
}, [profile.id]);

useEffect(() => {
  const openReviewHistory = () => setShowReviewHistory(true);
  window.addEventListener("kta-open-review-history", openReviewHistory);
  return () => window.removeEventListener("kta-open-review-history", openReviewHistory);
}, []);

  async function submit(event) {
    event.preventDefault();
    
    const form = new FormData(event.currentTarget);
    const reviewTarget = form.get("review_target");

    const selectedJob = reviewableJobs.find(
      (job) => job.key === reviewTarget
    );

    if (!selectedJob?.tradespersonId) {
      setMessage("Choose a completed booking before submitting your review.");
      return;
    }

    const { error } = await supabase.from("reviews").insert({
      job_request_id: selectedJob.type === "booking" ? selectedJob.id : null,
      job_post_id: selectedJob.type === "marketplace" ? selectedJob.id : null,
      customer_id: profile.id,
      tradesperson_id: selectedJob.tradespersonId,
      rating: Number(form.get("rating")),
      comment: form.get("comment")
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Review added.");
    setSelectedBookingId("");
    setRating("");
    setComment("");
    loadPublicData();
    const { data: refreshedReviews } = await supabase
      .from("reviews")
      .select("*")
      .eq("customer_id", profile.id)
      .order("created_at", { ascending: false });

    setSubmittedReviews(refreshedReviews || []);
  }

  return (
    <form id="customer-review-form" className="side-card customer-reviews-card" onSubmit={submit}>
      <h3>
        <Star size={17} />
        Reviews
      </h3>

      <button
        type="button"
        className="secondary review-history-toggle"
        onClick={() => setShowReviewHistory((current) => !current)}
      >
        {showReviewHistory
          ? "Hide my reviews"
          : `View my reviews (${submittedReviews.length})`}
      </button>

      {reviewableJobs.length === 0 ? (
        <p className="review-complete-notice">
          All of your completed jobs have been reviewed. Use “View my reviews” above to see what you submitted.
        </p>
      ) : (
        <>
          <h4 className="review-form-heading">Leave a review</h4>

<Select
  label="Completed job"
  name="review_target"
  value={selectedBookingId}
  onChange={(event) => setSelectedBookingId(event.target.value)}
  options={reviewableJobs.map((job) => {
    const tradie = tradies.find(
      (item) => String(item.id) === String(job.tradespersonId)
    );

    return {
      label: `${job.title} - ${tradie?.business_name || "Tradesperson"}`,
      value: job.key
    };
  })}
  required
/>

<Select
  label="Rating"
  name="rating"
  value={rating}
  onChange={(event) => setRating(event.target.value)}
  options={["5", "4", "3", "2", "1"]}
  required
/>

<Textarea
  label="Comment"
  name="comment"
  value={comment}
  onChange={(event) => setComment(event.target.value)}
  required
/>

      <button className="primary">Submit review</button>
        </>
      )}
      {showReviewHistory && (
        <div className="submitted-reviews-list">
          <div className="submitted-reviews-heading">
<strong>My Reviews ({submittedReviews.length})</strong>
<span>Reviews you've submitted</span>
          </div>

          {submittedReviews.length === 0 ? (
            <p className="muted">
              You have not submitted any reviews yet.
            </p>
          ) : (
            submittedReviews.map((review) => {
              const tradie = tradies.find(
                (item) =>
                  String(item.id) === String(review.tradesperson_id)
              );

              return (
                <article
                  className="submitted-review-card"
                  key={review.id}
                >
                  <div className="submitted-review-header">
                    <strong>
                      {tradie?.business_name || "Tradesperson"}
                    </strong>

                    <span className="submitted-review-stars">
                      {"★".repeat(Number(review.rating || 0))}
                      {"☆".repeat(
                        5 - Number(review.rating || 0)
                      )}
                    </span>
                  </div>

                  <p className="submitted-review-comment">
                    {review.comment}
                  </p>

                  {review.created_at && (
                    <small className="submitted-review-date">
                      {new Date(
                        review.created_at
                      ).toLocaleDateString("en-IE", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      })}
                    </small>
                  )}
                </article>
              );
            })
          )}
        </div>
      )}
    </form>
  );
}
