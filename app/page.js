"use client";

import { useMemo, useState } from "react";
import "./globals.css";
import data from "../data/artists.json";

const X0 = 90, X1 = 860, Y = { Florence: 165, Siena: 405 };
const minYear = 1275, maxYear = 1410;
const xForYear = (y) => X0 + ((y - minYear) / (maxYear - minYear)) * (X1 - X0);

function nodePosition(a, indexInSchool) {
  const mid = ((a.active_start || minYear) + (a.active_end || a.active_start || minYear)) / 2;
  const offsets = [-42, 34, -5, 48, -30, 15];
  return { x: xForYear(mid), y: Y[a.school] + offsets[indexInSchool % offsets.length] };
}

function activityRegion(a, item) {
  const x = xForYear(item.year || ((a.active_start + a.active_end) / 2));
  const targetSchool = item.place === "Florence" ? "Florence" :
                       item.place === "Siena" ? "Siena" :
                       a.school;
  let y = Y[targetSchool];
  // External centers are placed near the chronology but offset vertically;
  // this is deliberately schematic, not a map.
  if (!["Florence","Siena"].includes(item.place)) y += a.school === "Florence" ? 85 : -85;
  return { x, y, rx: 88, ry: 58 };
}

export default function Home() {
  const [selected, setSelected] = useState(null);

  const positions = useMemo(() => {
    const result = {};
    const counts = { Florence: 0, Siena: 0 };
    data.artists.forEach(a => {
      const i = counts[a.school] || 0;
      result[a.id] = nodePosition(a, i);
      counts[a.school] = i + 1;
    });
    return result;
  }, []);

  const artist = data.artists.find(a => a.id === selected);

  return (
    <main className="page">
      <div className="header">
        <div>
          <h1>Trecento Network</h1>
          <p>School, chronology, artistic relationships, and documented activity.</p>
        </div>
        <button className="reset" onClick={() => setSelected(null)}>Reset</button>
      </div>

      <div className="legend">
        <span>━━▶ pupil / workshop</span>
        <span>– –▶ collaborator / direct influence</span>
        <span>····▶ general influence</span>
        <span>translucent field = activity overlay</span>
      </div>

      <div className="shell">
        <div className="network-wrap">
          <svg viewBox="0 0 930 590" aria-label="Trecento artist network">
            <rect className="school-band" x="30" y="55" width="865" height="215" rx="22"/>
            <rect className="school-band" x="30" y="300" width="865" height="215" rx="22"/>
            <text className="school-label" x="55" y="82">Florentine school</text>
            <text className="school-label" x="55" y="327">Sienese school</text>

            {[1290,1320,1350,1380,1410].map(year => (
              <g key={year}>
                <line x1={xForYear(year)} y1="542" x2={xForYear(year)} y2="550" stroke="#aaa"/>
                <text x={xForYear(year)-13} y="570" fontSize="11" fill="#776f65">{year}</text>
              </g>
            ))}
            <line x1="82" y1="546" x2="865" y2="546" stroke="#cfc6b9"/>

            {data.relationships.map((r, i) => {
              const p1 = positions[r.from], p2 = positions[r.to];
              if (!p1 || !p2) return null;
              const cls = `edge ${r.style === "dashed" ? "dashed" : r.style === "dotted" ? "dotted" : ""} ${selected ? "faded" : ""}`;
              return <line key={i} className={cls} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}/>;
            })}

            {artist?.activity?.filter(x => x.place !== artist.school).map((item, i) => {
              const r = activityRegion(artist, item);
              return (
                <g key={`${item.place}-${i}`}>
                  <ellipse className="activity-field" cx={r.x} cy={r.y} rx={r.rx} ry={r.ry}/>
                  <text className="activity-label" textAnchor="middle" x={r.x} y={r.y-4}>
                    {artist.short_name} — {item.place}
                  </text>
                  <text className="activity-sub" textAnchor="middle" x={r.x} y={r.y+13}>{item.date_label}</text>
                </g>
              );
            })}

            {data.artists.map(a => {
              const p = positions[a.id];
              const isSelected = selected === a.id;
              return (
                <g
                  key={a.id}
                  className={`node ${selected && !isSelected ? "faded" : ""}`}
                  transform={`translate(${p.x} ${p.y})`}
                  onClick={() => setSelected(a.id)}
                >
                  <circle r={isSelected ? 34 : 29} stroke={a.school === "Florence" ? "var(--florence)" : "var(--siena)"}/>
                  <text textAnchor="middle" y="-2" fontSize="10" fontWeight="bold">{a.short_name.split(" ")[0].toUpperCase()}</text>
                  {a.short_name.split(" ").length > 1 &&
                    <text textAnchor="middle" y="11" fontSize="9">{a.short_name.split(" ").slice(1).join(" ")}</text>}
                </g>
              );
            })}
          </svg>
          <p className="note">Chronology and school determine node placement. Activity overlays are schematic fields placed over the relevant school/period, not geographic maps.</p>
        </div>

        <aside className="sidebar">
          {!artist ? (
            <>
              <h2>Select an artist</h2>
              <p className="meta">Click a circle to inspect activity, Wikipedia routing, and Commons thumbnails.</p>
              <p className="note">The committed seed data is intentionally provisional. Run the importer to populate external identifiers, Wikipedia routing, and Wikimedia Commons media automatically.</p>
            </>
          ) : (
            <>
              <h2>{artist.name}</h2>
              <div className="meta">{artist.school} · active approx. {artist.active_start}–{artist.active_end}</div>

              <div className="section">
                <h3>Activity</h3>
                {artist.activity?.length ? artist.activity.map((x,i) =>
                  <div className="activity-row" key={i}>
                    <b>{x.place}</b><br/>
                    <span className="meta">{x.date_label}</span>
                  </div>
                ) : <p className="note">No activity records imported yet.</p>}
              </div>

              {!!artist.commons_images?.length && (
                <div className="section">
                  <h3>Wikimedia Commons</h3>
                  <div className="thumbs">
                    {artist.commons_images.slice(0,6).map((im,i) =>
                      <a className="thumb" key={i} href={im.description_url || "#"} target="_blank" rel="noreferrer">
                        <img src={im.thumb_url} alt={im.title || `${artist.name} image`} />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {artist.wikipedia?.url && (
                <a className="wiki-link" href={artist.wikipedia.url} target="_blank" rel="noreferrer">
                  Wikipedia ({artist.wikipedia.language === "en" ? "English" : "Italian"})
                </a>
              )}
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
