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
  setMessage,
  loadPublicData
}) {
  const [tradies, setTradies] = useState([]);
  const [selectedTradieId, setSelectedTradieId] = useState("");
const [rating, setRating] = useState("");
const [comment, setComment] = useState("");

  useEffect(() => {
    supabase
      .from("tradesperson_profiles")
      .select("*")
      .then(({ data }) => setTradies(data || []));
  }, []);

  async function submit(event) {
    event.preventDefault();
    
    const form = new FormData(event.currentTarget);

    const { error } = await supabase.from("reviews").insert({
      customer_id: profile.id,
      tradesperson_id: form.get("tradesperson_id"),
      rating: Number(form.get("rating")),
      comment: form.get("comment")
    });

    if (error) {
      setMessage(error.message);
      return;
    }

setMessage("Review added.");
setSelectedTradieId("");
setRating("");
setComment("");
loadPublicData();
}

  return (
    <form className="side-card" onSubmit={submit}>
      <h3>
        <Star size={17} />
        Add a review
      </h3>

<Select
  label="Tradesperson"
  name="tradesperson_id"
  value={selectedTradieId}
  onChange={(event) => setSelectedTradieId(event.target.value)}
  options={tradies.map((tradie) => ({
    label: tradie.business_name,
    value: tradie.id
  }))}
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
    </form>
  );
}