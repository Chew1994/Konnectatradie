import React, { useEffect, useState } from "react";
import { ShieldCheck, Wrench } from "lucide-react";
import { Input, Select, Textarea } from "../common/FormControls";
import {
  Empty,
  Status
} from "../workspace/JobWorkspaceComponents";
import { COUNTIES, TRADES } from "../../constants";
import { supabase } from "../../lib/supabase";

export function TradieForm({
  userId,
  setMessage,
  loadPublicData
}) {
  const [tradie, setTradie] = useState(null);
  const [photos, setPhotos] = useState([]);

useEffect(() => {
  if (userId) {
    load();
  }
}, [userId]);

  async function load() {
    const { data } = await supabase
      .from("tradesperson_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    setTradie(data);

    if (data) {
      const { data: pics } = await supabase
        .from("portfolio_photos")
        .select("*")
        .eq("tradesperson_id", data.id)
        .order("sort_order");

      setPhotos(pics || []);
    }
  }

  async function submit(event) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    const payload = {
      user_id: userId,
      business_name: form.get("business_name"),
      contact_name: form.get("contact_name"),
      phone: form.get("phone"),
      trade: form.get("trade"),
      county: form.get("county"),
      service_area: form.get("service_area"),
      availability: form.get("availability"),
      bio: form.get("bio"),
      licence_number: form.get("licence_number"),
      insurance_expiry: form.get("insurance_expiry") || null,
      public_liability_insurance:
        form.get("public_liability_insurance") === "on",
      approval_status: tradie?.approval_status || "pending",
      approved: tradie?.approved || false,
      verification_status:
        tradie?.verification_status || "pending"
    };

    let savedTradie = tradie;

    if (tradie) {
      const { data, error } = await supabase
        .from("tradesperson_profiles")
        .update(payload)
        .eq("id", tradie.id)
        .select()
        .single();

      if (error) {
        setMessage(error.message);
        return;
      }

      savedTradie = data;
    } else {
      const { data, error } = await supabase
        .from("tradesperson_profiles")
        .insert(payload)
        .select()
        .single();

      if (error) {
        setMessage(error.message);
        return;
      }

      savedTradie = data;
    }

    const files = Array.from(
      form.getAll("portfolio_photos")
    ).filter((file) => file && file.size > 0);

    const remaining = Math.max(0, 5 - photos.length);
    const toUpload = files.slice(0, remaining);

    for (let index = 0; index < toUpload.length; index += 1) {
      const file = toUpload[index];
      const path =
        `${savedTradie.id}/${Date.now()}-${index}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("portfolio")
        .upload(path, file, { upsert: false });

      if (uploadError) {
        setMessage(uploadError.message);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("portfolio")
        .getPublicUrl(path);

      await supabase.from("portfolio_photos").insert({
        tradesperson_id: savedTradie.id,
        image_url: urlData.publicUrl,
        sort_order: photos.length + index + 1
      });
    }

    if (files.length > remaining) {
      setMessage(
        `Business saved. Only ${remaining} portfolio photo${
          remaining === 1 ? "" : "s"
        } uploaded because the max is 5.`
      );
    } else {
      setMessage("Business profile and portfolio saved.");
    }

    await load();
    await loadPublicData();
  }

  async function deletePhoto(photo) {
    const { error } = await supabase
      .from("portfolio_photos")
      .delete()
      .eq("id", photo.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Photo removed.");
    await load();
    await loadPublicData();
  }

  return (
<form
  key={tradie?.id || "new-tradie"}
  className="side-card"
  onSubmit={submit}
>

      <p>
        Status:{" "}
        <span className="chip orange">
          {tradie?.approved ? "approved" : "pending approval"}
        </span>
      </p>

      <p>
        Verification:{" "}
        <span
          className={`chip ${
            tradie?.verification_status === "verified"
              ? "verified-chip"
              : "orange"
          }`}
        >
          {tradie?.verification_status || "pending"}
        </span>
      </p>

      <Input
        label="Business name"
        name="business_name"
        defaultValue={tradie?.business_name || ""}
        required
      />

      <Input
        label="Contact name"
        name="contact_name"
        defaultValue={tradie?.contact_name || ""}
      />

      <Input
        label="Phone"
        name="phone"
        defaultValue={tradie?.phone || ""}
      />

      <Select
        label="Trade"
        name="trade"
        defaultValue={tradie?.trade || ""}
        options={TRADES}
        required
      />

      <Select
        label="County"
        name="county"
        defaultValue={tradie?.county || ""}
        options={COUNTIES}
        required
      />

      <Input
        label="Service area"
        name="service_area"
        defaultValue={tradie?.service_area || ""}
      />

      <Select
        label="Availability"
        name="availability"
        defaultValue={tradie?.availability || "Available"}
        options={["Available", "Busy", "Unavailable"]}
      />

      <Input
        label="Licence / registration number"
        name="licence_number"
        defaultValue={tradie?.licence_number || ""}
      />

      <Input
        label="Insurance expiry date"
        name="insurance_expiry"
        type="date"
        defaultValue={tradie?.insurance_expiry || ""}
      />

      <label className="check-row">
        <input
          type="checkbox"
          name="public_liability_insurance"
          defaultChecked={
            !!tradie?.public_liability_insurance
          }
        />
        Public liability insurance held
      </label>

      <Textarea
        label="Bio"
        name="bio"
        defaultValue={tradie?.bio || ""}
      />

      <div className="portfolio-upload">
        <h4>Portfolio photos ({photos.length}/5)</h4>
        <p>Upload up to 5 examples of previous work.</p>

        <input
          name="portfolio_photos"
          type="file"
          accept="image/*"
          multiple
          disabled={photos.length >= 5}
        />

        <div className="portfolio-grid">
          {photos.map((photo) => (
            <div className="portfolio-thumb" key={photo.id}>
              <img
                src={photo.image_url}
                alt="Portfolio work"
              />

              <button
                type="button"
                onClick={() => deletePhoto(photo)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

<button className="primary">
  {tradie
    ? "Edit business listing"
    : "Save business listing"}
</button>
    </form>
  );
}

export function VerificationUpload({
  userId,
  tradie,
  documents,
  setMessage,
  loadPrivateData,
  loadPublicData
}) {
  const docs = documents.filter(
    (document) => document.user_id === userId
  );

  async function uploadDoc(event) {
    event.preventDefault();

    if (!tradie) {
      setMessage(
        "Save your business profile before uploading verification documents."
      );
      return;
    }

    const form = new FormData(event.currentTarget);
    const file = form.get("document_file");
    const documentType = form.get("document_type");

    if (!file || file.size === 0) {
      setMessage("Choose a document to upload.");
      return;
    }

    const path = `${tradie.id}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("verification-documents")
      .upload(path, file, { upsert: false });

    if (uploadError) {
      setMessage(uploadError.message);
      return;
    }

    const { error } = await supabase
      .from("tradesperson_documents")
      .insert({
        tradesperson_id: tradie.id,
        user_id: userId,
        document_type: documentType,
        document_name: file.name,
        file_url: path,
        verification_status: "pending"
      });

    if (error) {
      setMessage(error.message);
      return;
    }

    await supabase
      .from("tradesperson_profiles")
      .update({ verification_status: "pending" })
      .eq("id", tradie.id);

    setMessage(
      "Verification document uploaded for admin review."
    );

    event.currentTarget.reset();
    loadPrivateData();
    loadPublicData();
  }

  return (
    <section className="side-card">
      <h3>
        <ShieldCheck size={17} />
        Verification Documents
      </h3>

      <p className="muted">
        Upload certs, insurance, ID or vetting files. Admin
        reviews these before marking you verified.
      </p>

      <form onSubmit={uploadDoc}>
        <Select
          label="Document type"
          name="document_type"
          options={[
            "Public liability insurance",
            "Trade certificate",
            "Safe Electric / RGI licence",
            "ID / vetting document",
            "Other"
          ]}
          required
        />

        <label className="field">
          <span>Upload document</span>
          <input
            name="document_file"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            required
          />
        </label>

        <button className="primary full">
          Upload document
        </button>
      </form>

      <div className="doc-list">
        {docs.length === 0 && (
          <Empty text="No verification documents uploaded yet." />
        )}

        {docs.map((document) => (
          <div className="doc-row" key={document.id}>
            <div>
              <strong>{document.document_type}</strong>
              <p>{document.document_name}</p>
            </div>

            <Status status={document.verification_status} />
          </div>
        ))}
      </div>
    </section>
  );
}