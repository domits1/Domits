import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAccessToken } from "../../services/getAccessToken";
import ClipLoader from "react-spinners/ClipLoader";

const PROPERTY_API_BASE = "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property";

export default function HostProperty() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const propertyId = params.get("ID");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    description: "",
  });

  useEffect(() => {
    const fetchProperty = async () => {
      if (!propertyId) {
        setError("Missing property ID.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `${PROPERTY_API_BASE}/hostDashboard/single?property=${encodeURIComponent(propertyId)}`,
          {
            method: "GET",
            headers: {
              Authorization: getAccessToken(),
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch property.");
        }

        const data = await response.json();
        const property = data?.property || {};
        setForm({
          title: property.title || "",
          subtitle: property.subtitle || "",
          description: property.description || "",
        });
      } catch (err) {
        console.error(err);
        setError("Could not load property details.");
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [propertyId]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveOverview = async () => {
    const normalizedTitle = form.title.trim();
    const normalizedSubtitle = form.subtitle.trim();
    const normalizedDescription = form.description.trim();

    if (!normalizedTitle || !normalizedDescription) {
      alert("Title and description cannot be empty.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${PROPERTY_API_BASE}/overview`, {
        method: "PATCH",
        headers: {
          Authorization: getAccessToken(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          propertyId,
          title: normalizedTitle,
          subtitle: normalizedSubtitle,
          description: normalizedDescription,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save property overview.");
      }

      setForm({
        title: normalizedTitle,
        subtitle: normalizedSubtitle,
        description: normalizedDescription,
      });
      alert("Property updated successfully.");
    } catch (err) {
      console.error(err);
      setError("Saving failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="page-Host">
        <p className="page-Host-title">Edit listing</p>
        <div className="page-Host-content">
          <section className="host-pc-dashboard" style={{ width: "100%", maxWidth: "820px" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                minHeight: "220px",
              }}
            >
              <ClipLoader size={80} color="#0D9813" loading />
              <p>Loading property...</p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="page-Host">
      <p className="page-Host-title">Edit listing</p>
      <div className="page-Host-content">
        <section className="host-pc-dashboard" style={{ width: "100%", maxWidth: "820px" }}>
          <div style={{ display: "grid", gap: "16px" }}>
            <div>
              <label htmlFor="property-title">Title</label>
              <input
                id="property-title"
                type="text"
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                style={{ width: "100%", padding: "10px", marginTop: "6px" }}
              />
            </div>

            <div>
              <label htmlFor="property-subtitle">Subtitle</label>
              <input
                id="property-subtitle"
                type="text"
                value={form.subtitle}
                onChange={(event) => updateField("subtitle", event.target.value)}
                style={{ width: "100%", padding: "10px", marginTop: "6px" }}
              />
            </div>

            <div>
              <label htmlFor="property-description">Description</label>
              <textarea
                id="property-description"
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                rows={10}
                style={{ width: "100%", padding: "10px", marginTop: "6px", resize: "vertical" }}
              />
            </div>

            {error && <p style={{ color: "#b42318" }}>{error}</p>}

            <div style={{ display: "flex", gap: "12px" }}>
              <button className="greenBtn" onClick={() => navigate("/hostdashboard/listings")} disabled={saving}>
                Back to listings
              </button>
              <button className="greenBtn" onClick={saveOverview} disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
