import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Select } from "../common/FormControls";
import { Empty, Status } from "./JobWorkspaceComponents";
import { COUNTIES, COUNTY_COORDS, TRADES } from "../../constants";

export default function MapView({ profile, tradespeople, jobPosts, setSelectedTradie, setSelectedJobPost, setTab }) {
  const [tradeFilter, setTradeFilter] = useState("");
  const [countyFilter, setCountyFilter] = useState("");
  const [activeCounty, setActiveCounty] = useState("");
  const mapElementRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  const isCustomer = profile?.role === "customer";
  const items = isCustomer
    ? tradespeople.filter((tradie) => (!tradeFilter || tradie.trade === tradeFilter) && (!countyFilter || tradie.county === countyFilter))
    : jobPosts.filter((job) => (!tradeFilter || job.trade === tradeFilter) && (!countyFilter || job.county === countyFilter));

  const grouped = items.reduce((groups, item) => {
    const county = item.county || "Ireland";
    groups[county] = groups[county] || [];
    groups[county].push(item);
    return groups;
  }, {});

  const countiesOnMap = Object.keys(grouped).filter((county) => COUNTY_COORDS[county]);

  useEffect(() => {
    if (!mapElementRef.current || mapInstanceRef.current) return undefined;

    const map = L.map(mapElementRef.current, {
      center: [53.4, -7.9],
      zoom: 7,
      scrollWheelZoom: true
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    mapInstanceRef.current = map;

    const invalidateMapSize = () => {
      if (!mapInstanceRef.current) return;
      mapInstanceRef.current.invalidateSize({ pan: false });
    };

    let secondAnimationFrame = 0;
    const animationFrame = window.requestAnimationFrame(() => {
      invalidateMapSize();
      secondAnimationFrame = window.requestAnimationFrame(invalidateMapSize);
    });
    const resizeTimers = [100, 300, 700].map((delay) => window.setTimeout(invalidateMapSize, delay));
    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(invalidateMapSize)
      : null;

    resizeObserver?.observe(mapElementRef.current);
    if (mapElementRef.current.parentElement) resizeObserver?.observe(mapElementRef.current.parentElement);
    window.addEventListener("resize", invalidateMapSize);
    document.addEventListener("visibilitychange", invalidateMapSize);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.cancelAnimationFrame(secondAnimationFrame);
      resizeTimers.forEach((timer) => window.clearTimeout(timer));
      resizeObserver?.disconnect();
      window.removeEventListener("resize", invalidateMapSize);
      document.removeEventListener("visibilitychange", invalidateMapSize);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const bounds = [];

    countiesOnMap.forEach((county) => {
      const [lat, lng] = COUNTY_COORDS[county];
      const count = grouped[county].length;
      bounds.push([lat, lng]);

      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: "kat-leaflet-pin",
          html: `<span>${count}</span>`,
          iconSize: [38, 38],
          iconAnchor: [19, 38],
          popupAnchor: [0, -34]
        })
      })
        .addTo(map)
        .bindPopup(`<strong>${county}</strong><br/>${count} ${isCustomer ? "tradesperson" : "job"}${count === 1 ? "" : "s"}`)
        .on("click", () => {
          setActiveCounty(county);
          setCountyFilter(county);
        });

      markersRef.current.push(marker);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 9 });
    } else {
      map.setView([53.4, -7.9], 7);
    }
  }, [countiesOnMap.join(","), items.length, isCustomer]);

  const clearFilters = () => {
    setTradeFilter("");
    setCountyFilter("");
    setActiveCounty("");
    mapInstanceRef.current?.setView([53.4, -7.9], 7);
  };

  return <section>
    <div className="action-header map-header">
      <div>
        <span className="label">{isCustomer ? "Customer map" : "Tradesperson job map"}</span>
        <h1>{isCustomer ? "Find tradespeople near you" : "Find jobs near you"}</h1>
        <p>{isCustomer ? "Real map view with county-level pins to protect privacy until a booking is agreed." : "View open customer jobs by county and quote the work that suits you."}</p>
      </div>
      <div className="hero-actions compact-actions">
        <button className="primary" onClick={clearFilters}>Reset map</button>
      </div>
    </div>

    <div className="map-filters">
      <Select label="Trade" value={tradeFilter} onChange={(event) => setTradeFilter(event.target.value)} options={TRADES}/>
      <Select label="County" value={countyFilter} onChange={(event) => setCountyFilter(event.target.value)} options={COUNTIES}/>
    </div>

    <div className="map-layout">
      <div className="real-map-card">
        <div ref={mapElementRef} className="leaflet-map" />
        <div className="map-note">
          <strong>Privacy-safe map:</strong> pins show county areas, not exact addresses.
        </div>
      </div>

      <aside className="map-side">
        <div className="map-side-head">
          <div>
            <h2>{isCustomer ? "Available tradespeople" : "Open jobs"}</h2>
            <p>{countyFilter ? `${countyFilter} · ` : ""}{items.length} result{items.length === 1 ? "" : "s"}</p>
          </div>
          {activeCounty && <span className="chip orange">{activeCounty}</span>}
        </div>

        <div className="map-results">
          {items.length === 0 && <Empty text="No map results match your filters."/>}
          {items.map((item) => isCustomer
            ? <MapTradieCard key={item.id} tradie={item} onOpen={() => { setSelectedTradie(item); setTab("book"); }} />
            : <MapJobCard key={item.id} job={item} onOpen={() => { setSelectedJobPost(item); setTab("job-chat"); }} />
          )}
        </div>
      </aside>
    </div>
  </section>;
}

function MapTradieCard({ tradie, onOpen }) {
  return <article className="map-result-card">
    <div className="card-head">
      <div><h3>{tradie.business_name}</h3><p>{tradie.trade} · {tradie.county}</p></div>
      <Status status={tradie.availability || "Available"} />
    </div>
    <p className="truncate">{tradie.bio || "Approved tradesperson available for local work."}</p>
    <button className="primary small-btn" onClick={onOpen}>Request booking</button>
  </article>;
}

function MapJobCard({ job, onOpen }) {
  return <article className="map-result-card priority">
    <div className="card-head">
      <div><h3>{job.job_title}</h3><p>{job.trade} · {job.county}</p></div>
      <Status status={job.status} />
    </div>
    <p className="truncate">{job.job_description}</p>
    <div className="card-actions">
      <span className="chip">€{job.budget_min || 0} - €{job.budget_max || "open"}</span>
      <button className="primary small-btn" onClick={onOpen}>View / quote</button>
    </div>
  </article>;
}
