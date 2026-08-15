(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))n(o);new MutationObserver(o=>{for(const r of o)if(r.type==="childList")for(const i of r.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&n(i)}).observe(document,{childList:!0,subtree:!0});function a(o){const r={};return o.integrity&&(r.integrity=o.integrity),o.referrerPolicy&&(r.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?r.credentials="include":o.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(o){if(o.ep)return;o.ep=!0;const r=a(o);fetch(o.href,r)}})();const we="tripnix-fleet-map-styles";function G(e){return e?String(e.place||e.placeName||e.label||"").trim():""}function pe(e){if(!e)return"";const t=String(e.fromPlace||"").trim(),a=String(e.toPlace||"").trim();return!t&&!a?"":t?a?`${t} → ${a}`:`From ${t}`:`To ${a}`}let F=null;function ke(){var e;return(e=window.L)!=null&&e.map?Promise.resolve(window.L):F||(F=new Promise((t,a)=>{if(!document.getElementById("leaflet-css")){const o=document.createElement("link");o.id="leaflet-css",o.rel="stylesheet",o.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",document.head.appendChild(o)}const n=document.createElement("script");n.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",n.async=!0,n.onload=()=>{var o;return(o=window.L)!=null&&o.map?t(window.L):a(new Error("Leaflet loaded but unavailable"))},n.onerror=()=>a(new Error("Could not load the map library")),document.head.appendChild(n)}).catch(t=>{throw F=null,t}),F)}function oe(e,t,a,n){var o;return e.divIcon({className:"fmap-pin-wrap",iconSize:[40,54],iconAnchor:[20,20],popupAnchor:[0,-20],html:`
      <div class="fmap-pin${n?" is-sample":""}">
        <img src="${re(a,(o=t.location)==null?void 0:o.heading)}" alt="" width="38" height="38">
        <span>${C(t.subtitle||t.name)}</span>
      </div>`})}async function te(e,t,a,{noteEl:n,compact:o,sample:r}){let i;try{i=await ke()}catch(m){return console.warn("[fleet-map]",m.message),!1}let s=A.get(e);if(!s||!e.querySelector(".fmap-canvas")){e.innerHTML=`
      <div class="fmap fmap-live${o?" is-compact":""}">
        <div class="fmap-canvas"></div>
      </div>
      <div class="fmap-legend"></div>`;const m=i.map(e.querySelector(".fmap-canvas"),{zoomControl:!0,attributionControl:!0,scrollWheelZoom:!1});m.attributionControl.setPrefix(!1),m.on("click",()=>m.scrollWheelZoom.enable()),m.on("mouseout",()=>m.scrollWheelZoom.disable()),i.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",{maxZoom:19,attribution:"&copy; OpenStreetMap &copy; CARTO"}).addTo(m),s={map:m,markers:new Map,L:i},A.set(e,s)}const d=new Set,u=[];for(const m of a){const p=m.location,f=p.live?"#0ca30c":"#fab219";d.add(m.id),u.push([p.lat,p.lng]);const g=G(p),b=pe(p),k=`
      <strong>${C(m.name)}</strong><br>
      ${C(m.subtitle||"")} · ${p.live?"Live now":p.ageMinutes+" min ago"}<br>
      <small>${g?C(g):"Place name not available"}</small>
      ${p.driverName?"<br><small>Driver: "+C(p.driverName)+"</small>":""}
      ${b?"<br><small>"+C(b)+"</small>":""}
      ${p.speedKph?"<br>"+Math.round(p.speedKph)+" km/h":""}
      ${r?"<br><em>Sample position</em>":""}`;let w=s.markers.get(m.id);w?(w.setLatLng([p.lat,p.lng]),w.setIcon(oe(s.L,m,f,r)),w.setPopupContent(k)):(w=s.L.marker([p.lat,p.lng],{icon:oe(s.L,m,f,r)}).addTo(s.map).bindPopup(k),s.markers.set(m.id,w))}for(const[m,p]of s.markers)d.has(m)||(p.remove(),s.markers.delete(m));!s.framed&&u.length&&(u.length===1?s.map.setView(u[0],12):s.map.fitBounds(u,{padding:o?[30,30]:[55,55]}),s.framed=!0),setTimeout(()=>s.map.invalidateSize(),60);const h=t.total-a.length;return e.querySelector(".fmap-legend").innerHTML=r?`<span><i style="background:#fab219"></i>Sample data</span>
       <span class="fmap-note">Tap a bus for its detail</span>`:`<span><i style="background:#0ca30c"></i>Live</span>
       <span><i style="background:#fab219"></i>Last seen earlier</span>
       ${h?`<span><i style="background:#94a3b8"></i>${h} not reporting</span>`:""}
       <span class="fmap-note">Tap a bus for its detail</span>`,n&&(n.textContent=r?`Sample positions · ${a.length} bus${a.length===1?"":"es"} shown`:`${t.reporting} of ${t.total} reporting`),!0}function We(e){const t=(e==null?void 0:e.vehicles)||[];return t.filter(n=>n.location).length?{vehicles:t,sample:!1}:t.length?{vehicles:Le(t),sample:!0}:{vehicles:t,sample:!1}}async function Ge(e,t,{sample:a=!1}={}){if(!e)return!1;Ce();const n=t==null?void 0:t.location;if(!n)return e.innerHTML='<div class="fmap-mini is-empty"><span>No position yet</span></div>',!1;let o;try{o=await ke()}catch{return e.innerHTML='<div class="fmap-mini is-empty"><span>Map unavailable</span></div>',!1}const r=A.get(e);if(r)return r.marker.setLatLng([n.lat,n.lng]),r.map.setView([n.lat,n.lng],r.map.getZoom()),setTimeout(()=>r.map.invalidateSize(),50),!0;e.innerHTML='<div class="fmap-mini"><div class="fmap-mini-canvas"></div></div>';const i=o.map(e.querySelector(".fmap-mini-canvas"),{zoomControl:!1,attributionControl:!1,dragging:!1,scrollWheelZoom:!1,doubleClickZoom:!1,boxZoom:!1,keyboard:!1,touchZoom:!1}).setView([n.lat,n.lng],11);o.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",{maxZoom:19}).addTo(i);const s=o.marker([n.lat,n.lng],{icon:oe(o,t,n.live?"#0ca30c":"#fab219",a),interactive:!1}).addTo(i);return A.set(e,{map:i,marker:s}),setTimeout(()=>i.invalidateSize(),50),!0}let O=null;function Ke(e){var t;return(t=window.google)!=null&&t.maps?Promise.resolve(window.google.maps):O||(O=new Promise((a,n)=>{const o=document.createElement("script");o.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(e)}&loading=async&v=weekly`,o.async=!0,o.onload=()=>{var r;return(r=window.google)!=null&&r.maps?a(window.google.maps):n(new Error("Maps API loaded but unavailable"))},o.onerror=()=>n(new Error("Could not load Google Maps — check the API key and its referrer restrictions")),document.head.appendChild(o)}).catch(a=>{throw O=null,a}),O)}function re(e,t=0){const n=`
    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
      <g transform="rotate(${Number.isFinite(t)?t:0} 22 22)">
        <circle cx="22" cy="22" r="15" fill="#ffffff" opacity="0.92"/>
        <circle cx="22" cy="22" r="15" fill="none" stroke="${e}" stroke-width="2.5"/>
        <path d="M22 10 L30.5 30 L22 25 L13.5 30 Z" fill="${e}"
              stroke="#0b1220" stroke-width="0.9" stroke-linejoin="round"/>
      </g>
    </svg>`;return"data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(n.trim())}const A=new WeakMap,Je={lat:9.9312,lng:76.2673,zoom:9},$e=[{label:"Kochi",lat:9.9312,lng:76.2673},{label:"Munnar",lat:10.0889,lng:77.0595},{label:"Thrissur",lat:10.5276,lng:76.2144},{label:"Alappuzha",lat:9.4981,lng:76.3388},{label:"Kottayam",lat:9.5916,lng:76.5222},{label:"Palakkad",lat:10.7867,lng:76.6548},{label:"Kozhikode",lat:11.2588,lng:75.7804},{label:"Thekkady",lat:9.5939,lng:77.16},{label:"Kollam",lat:8.8932,lng:76.6141},{label:"Wayanad",lat:11.6854,lng:76.132}];function Ze(e){const t=String(e??"");let a=0;for(let n=0;n<t.length;n++)a=a*31+t.charCodeAt(n)|0;return Math.abs(a)}function Le(e){return e.map((t,a)=>{const n=$e[(Ze(t.id)+a)%$e.length];return{...t,location:{lat:n.lat,lng:n.lng,place:n.label,placeName:n.label,label:n.label,live:a%3!==2,ageMinutes:a%3===2?40+a*7:0,speedKph:a%3===2?0:30+a*9,sample:!0}}})}function Ce(){if(document.getElementById(we))return;const e=document.createElement("style");e.id=we,e.textContent=`
    .fmap { position: relative; border-radius: 14px; overflow: hidden;
            border: 1px solid rgba(255,255,255,0.12); }
    .fmap svg { display: block; width: 100%; height: auto; }

    /* Google Maps needs a laid-out box with a real height — given none it
       renders as a zero-height strip and looks broken. */
    .fmap-live .fmap-canvas { width: 100%; height: 420px; background: #eef1f5; }
    .fmap-live.is-compact .fmap-canvas { height: 260px; }
    @media (max-width: 620px) {
      .fmap-live .fmap-canvas { height: 300px; }
      .fmap-live.is-compact .fmap-canvas { height: 220px; }
    }
    /* The info window is Google's own white card; keep its close button visible
       against it rather than inheriting the portal's light-on-dark text. */
    .fmap-live .gm-style-iw button span { background-color: #475569 !important; }

    /* The keyless embed. Same box as the JS API map so switching a key on does
       not change the layout around it. */
    .fmap-embed { display: block; width: 100%; height: 420px; border: 0; }
    .fmap-live.is-compact .fmap-embed { height: 260px; }
    @media (max-width: 620px) {
      .fmap-embed { height: 300px; }
      .fmap-live.is-compact .fmap-embed { height: 220px; }
    }

    /* One bus per embed, so the fleet is a row to choose from. */
    .fmap-chips { display: flex; gap: 7px; flex-wrap: wrap; margin-bottom: 10px; }
    .fmap-chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 5px 11px; border-radius: 20px; cursor: pointer;
      background: rgba(255,255,255,0.05); color: #cbd5e1;
      border: 1px solid rgba(255,255,255,0.14);
      font-size: 11.5px; font-weight: 700; font-family: inherit;
      transition: background 0.15s, border-color 0.15s;
    }
    .fmap-chip:hover { background: rgba(255,255,255,0.1); }
    .fmap-chip.is-on { background: #e53935; border-color: #e53935; color: #fff; }
    .fmap-chip i { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
    .fmap-chip span { opacity: 0.7; font-weight: 600; }
    .fmap-chip.is-on span { opacity: 0.85; }

    .fmap-open { margin-left: auto; color: #93c5fd; text-decoration: none; }
    .fmap-open:hover { text-decoration: underline; }

    /* Every bus marked at once: the badge with its number under it, so the map
       is readable without clicking each one. */
    .fmap-pin-wrap { background: none !important; border: 0 !important; }
    .fmap-pin { display: flex; flex-direction: column; align-items: center; gap: 1px; }
    .fmap-pin img { display: block; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.5)); }
    /* White chip on the day tiles: a dark one sat on light streets like a hole
       punched in the map. */
    .fmap-pin span {
      font-size: 10px; font-weight: 800; color: #0f172a; white-space: nowrap;
      background: rgba(255,255,255,0.94); padding: 1px 6px; border-radius: 20px;
      border: 1px solid rgba(15,23,42,0.18);
      box-shadow: 0 1px 3px rgba(15,23,42,0.25);
    }
    .fmap-pin.is-sample img { opacity: 0.9; }

    /* A thumbnail beside each row in the positions list. */
    .fmap-mini {
      width: 190px; height: 108px; border-radius: 10px; overflow: hidden;
      border: 1px solid rgba(255,255,255,0.14); background: #eef1f5; flex-shrink: 0;
    }
    .fmap-mini-canvas { width: 100%; height: 100%; }
    .fmap-mini .leaflet-container { background: #eef1f5; }
    .fmap-mini.is-empty { display: flex; align-items: center; justify-content: center; }
    .fmap-mini.is-empty span { font-size: 10.5px; color: #64748b; }
    /* The number under the pin is unreadable at thumbnail scale. */
    .fmap-mini .fmap-pin span { display: none; }
    .fmap-mini .fmap-pin img { width: 26px; height: 33px; }
    @media (max-width: 620px) { .fmap-mini { width: 100%; height: 130px; } }

    /* Leaflet's chrome, on a day map. Dark controls on light tiles would read
       as a rendering fault, so every piece follows the map rather than the
       portal around it. */
    .fmap-live .leaflet-container { background: #eef1f5; font-family: inherit; }
    /* OpenStreetMap and CARTO require attribution, so it stays — muted grey on
       the light tiles rather than a bright blue link. */
    .fmap-live .leaflet-control-attribution {
      background: rgba(255,255,255,0.72); color: #64748b; font-size: 8.5px;
      padding: 0 5px; line-height: 1.5;
    }
    .fmap-live .leaflet-control-attribution a { color: #64748b; text-decoration: none; }
    .fmap-live .leaflet-control-attribution a:hover { color: #334155; }
    .fmap-live .leaflet-popup-content-wrapper,
    .fmap-live .leaflet-popup-tip { background: #ffffff; color: #0f172a; }
    .fmap-live .leaflet-popup-content { font-size: 12px; line-height: 1.5; margin: 10px 12px; }
    .fmap-live .leaflet-popup-content small { color: #64748b; }
    .fmap-live .leaflet-bar a {
      background: #ffffff; color: #1f2937; border-bottom-color: rgba(15,23,42,0.14);
    }
    .fmap-live .leaflet-bar a:hover { background: #eef1f5; }

    /* Sits along the bottom rather than over the middle, so the map stays
       usable — an operator can pan to their routes while waiting. */
    .fmap-banner {
      position: absolute; left: 10px; right: 10px; bottom: 10px;
      display: flex; align-items: flex-start; gap: 10px;
      padding: 11px 13px; border-radius: 12px;
      background: rgba(9,15,28,0.88); border: 1px solid rgba(255,255,255,0.14);
      backdrop-filter: blur(3px); pointer-events: none;
    }
    /* Amber, because sample positions are a caution, not information. */
    .fmap-banner.is-sample {
      background: rgba(120,72,10,0.92); border-color: rgba(250,178,25,0.5);
    }
    .fmap-banner.is-sample strong { color: #fde68a; }
    .fmap-banner.is-sample div span { color: #fcd9a0; }

    .fmap-banner > span { font-size: 18px; line-height: 1.2; }
    .fmap-banner strong { display: block; font-size: 13px; font-weight: 800; color: #f8fafc; }
    .fmap-banner div span { font-size: 11.5px; color: #94a3b8; line-height: 1.45; }
    .fmap-label { font-size: 2.5px; font-weight: 800; fill: #f8fafc;
                  paint-order: stroke; stroke: rgba(9,15,28,0.9); stroke-width: 1px; }
    .fmap-sub { font-size: 1.9px; font-weight: 600; fill: #cbd5e1;
                paint-order: stroke; stroke: rgba(9,15,28,0.9); stroke-width: 0.9px; }
    .fmap-n { font-size: 2.4px; font-weight: 800; fill: #e2e8f0; }
    .fmap-bus { cursor: default; }
    .fmap-bus:hover .fmap-label { fill: #fff; }

    .fmap-scale { position: absolute; left: 10px; bottom: 9px;
                  display: flex; align-items: center; gap: 7px;
                  font-size: 10px; color: #cbd5e1;
                  background: rgba(9,15,28,0.72); padding: 3px 9px; border-radius: 20px; }
    .fmap-scale i { width: 28px; height: 5px; border: 1px solid #cbd5e1;
                    border-top: none; opacity: 0.85; display: block; }

    .fmap-empty { position: absolute; inset: 0; display: flex; flex-direction: column;
                  align-items: center; justify-content: center; text-align: center;
                  gap: 5px; padding: 24px; }
    .fmap-empty b { font-size: 14px; font-weight: 800; color: #f8fafc; }
    .fmap-empty span { font-size: 11.5px; color: #94a3b8; line-height: 1.5; max-width: 320px; }
    .fmap-empty-icon { font-size: 28px; }

    .fmap-legend { display: flex; gap: 15px; flex-wrap: wrap; align-items: center;
                   margin-top: 11px; font-size: 11.5px; color: #94a3b8; }
    .fmap-legend i { width: 9px; height: 9px; border-radius: 50%;
                     display: inline-block; margin-right: 6px; vertical-align: -1px; }
    .fmap-note { margin-left: auto; font-style: italic; opacity: 0.75; }
  `,document.head.appendChild(e)}function C(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function Xe(e,t,{noteEl:a,compact:n}){const{lat:o,lng:r,zoom:i}=Je,s=`https://www.google.com/maps?q=${o},${r}&hl=en&z=${i}&output=embed`;a&&(a.textContent=t.total?"No bus has reported a position yet":""),e.innerHTML=`
    <div class="fmap fmap-live${n?" is-compact":""}">
      <iframe class="fmap-embed" src="${s}" title="Map, awaiting the first position"
              loading="lazy" allowfullscreen
              referrerpolicy="no-referrer-when-downgrade"></iframe>
      <div class="fmap-banner">
        <span>📡</span>
        <div>
          <strong>Waiting for the first position</strong>
          <span>${t.total?`${t.total} bus${t.total===1?"":"es"} on the books, none reporting yet — they appear here the moment a driver shares a position.`:"No buses in the fleet yet."}</span>
        </div>
      </div>
    </div>`}function q(e,t,a,{noteEl:n,compact:o,sample:r=!1}){const i=e.dataset.fleetMapBus,s=a.find(p=>String(p.id)===i)||a.find(p=>p.location.live)||a[0];e.dataset.fleetMapBus=String(s.id);const d=s.location,u=`https://www.google.com/maps?q=${d.lat},${d.lng}&hl=en&z=${o?13:14}&output=embed`,h=a.map(p=>{const f=p.id===s.id,g=p.location.live;return`
      <button type="button" class="fmap-chip${f?" is-on":""}"
              data-fleet-map-bus="${p.id}">
        <i style="background:${g?"#0ca30c":"#fab219"}"></i>
        ${C(p.subtitle||p.name)}
        <span>${g?"live":p.location.ageMinutes+"m"}</span>
      </button>`}).join(""),m=t.total-a.length;if(e.innerHTML=`
    ${a.length>1?`<div class="fmap-chips">${h}</div>`:""}
    <div class="fmap fmap-live${o?" is-compact":""}">
      <iframe class="fmap-embed" src="${u}" title="Map of ${C(s.name)}"
              loading="lazy" allowfullscreen
              referrerpolicy="no-referrer-when-downgrade"></iframe>
      ${r?`
        <div class="fmap-banner is-sample">
          <span>🧭</span>
          <div>
            <strong>Sample positions — no tracker connected</strong>
            <span>This is how tracking will look. These are not where your buses
                  are; real positions replace them the moment a tracker posts a fix.</span>
          </div>
        </div>`:""}
    </div>
    <div class="fmap-legend">
      ${r?'<span><i style="background:#fab219"></i>Sample data</span>':`<span><i style="background:#0ca30c"></i>Live</span>
           <span><i style="background:#fab219"></i>Last seen earlier</span>
           ${m?`<span><i style="background:#94a3b8"></i>${m} not reporting</span>`:""}`}
      <a class="fmap-open" target="_blank" rel="noopener"
         href="https://www.google.com/maps/search/?api=1&query=${d.lat},${d.lng}">
        Open in Google Maps ↗</a>
    </div>`,e.querySelectorAll("[data-fleet-map-bus]").forEach(p=>p.addEventListener("click",()=>{e.dataset.fleetMapBus=p.dataset.fleetMapBus,q(e,t,a,{noteEl:n,compact:o,sample:r})})),n){const p=G(d);n.textContent=r?`Sample positions · showing ${s.subtitle||s.name}${p?" near "+p:""}`:`${t.reporting} of ${t.total} reporting · showing ${s.subtitle||s.name}${p?" near "+p:""}`}}async function Qe(e,t,a,{noteEl:n,compact:o,apiKey:r}){let i;try{i=await Ke(r)}catch(f){return console.warn("[fleet-map]",f.message),!1}let s=A.get(e);if(!s){e.innerHTML=`<div class="fmap fmap-live${o?" is-compact":""}"><div class="fmap-canvas"></div></div>`;const f=e.querySelector(".fmap-canvas");s={map:new i.Map(f,{center:{lat:a[0].location.lat,lng:a[0].location.lng},zoom:12,mapTypeControl:!o,streetViewControl:!1,fullscreenControl:!o,zoomControl:!0,backgroundColor:"#eef1f5",gestureHandling:"cooperative"}),markers:new Map,info:new i.InfoWindow},A.set(e,s)}const d=new Set,u=new i.LatLngBounds;for(const f of a){const g=f.location,b=g.live?"#0ca30c":"#fab219",k={lat:g.lat,lng:g.lng};u.extend(k),d.add(f.id);const w=f.subtitle||f.name,L=G(g),T=`${g.live?"Live now":g.ageMinutes+" min ago"}${L?" · "+C(L):""}${g.speedKph?" · "+Math.round(g.speedKph)+" km/h":""}`;let E=s.markers.get(f.id);E?(E.setPosition(k),E.setIcon({url:re(b,g.heading),scaledSize:new i.Size(38,38),anchor:new i.Point(19,19)})):(E=new i.Marker({map:s.map,position:k,title:`${f.name} · ${T.replace(/<[^>]*>/g,"")}`,icon:{url:re(b,g.heading),scaledSize:new i.Size(38,38),anchor:new i.Point(19,19)},zIndex:g.live?2:1}),s.markers.set(f.id,E)),E.addListener("click",()=>{const N=pe(g);s.info.setContent(`<div style="font-family:system-ui;color:#0b1220;min-width:150px">
           <strong style="font-size:13px">${C(f.name)}</strong><br>
           <span style="font-size:11px;color:#475569">${C(w)} · ${T}</span><br>
           <span style="font-size:10.5px;color:#64748b">${L?C(L):"Place name not available"}</span>
           ${g.driverName?'<br><span style="font-size:10.5px;color:#64748b">Driver: '+C(g.driverName)+"</span>":""}
           ${N?'<br><span style="font-size:10.5px;color:#64748b">'+C(N)+"</span>":""}
         </div>`),s.info.open({map:s.map,anchor:E})})}for(const[f,g]of s.markers)d.has(f)||(g.setMap(null),s.markers.delete(f));s.framed||(a.length===1?(s.map.setCenter(u.getCenter()),s.map.setZoom(13)):s.map.fitBounds(u,o?24:48),s.framed=!0),n&&(n.textContent=`${t.reporting} of ${t.total} reporting · live map`);const h=t.total-a.length,m=e.querySelector(".fmap-legend"),p=`
    <span><i style="background:#0ca30c"></i>Live</span>
    <span><i style="background:#fab219"></i>Last seen earlier</span>
    ${h?`<span><i style="background:#94a3b8"></i>${h} not reporting</span>`:""}
    <span class="fmap-note">Tap a bus for its detail</span>`;return m?m.innerHTML=p:e.insertAdjacentHTML("beforeend",`<div class="fmap-legend">${p}</div>`),!0}function et(e,t,{noteEl:a=null,compact:n=!1,apiKey:o=""}={}){if(!e)return;Ce();const r=((t==null?void 0:t.vehicles)||[]).filter(i=>i.location);if(!r.length){A.delete(e);const i=(t==null?void 0:t.vehicles)||[];if(!i.length){delete e.dataset.fleetMapBus,Xe(e,t,{noteEl:a,compact:n});return}const s=Le(i),d={...t,reporting:0,total:i.length};te(e,d,s,{noteEl:a,compact:n,sample:!0}).then(u=>{u||q(e,d,s,{noteEl:a,compact:n,sample:!0})});return}if(o){Qe(e,t,r,{noteEl:a,compact:n,apiKey:o}).then(i=>{if(!i)return te(e,t,r,{noteEl:a,compact:n,sample:!1}).then(s=>{s||q(e,t,r,{noteEl:a,compact:n})})});return}te(e,t,r,{noteEl:a,compact:n,sample:!1}).then(i=>{i||q(e,t,r,{noteEl:a,compact:n})})}const v=window.location.origin.includes("3005")?"http://localhost:3000/api":window.location.origin+"/api";let l={currentUser:JSON.parse(sessionStorage.getItem("tripnix_user")||"null"),vehicles:[],bookings:[],admins:[],plans:null,subscription:null,accounts:null,accountCategories:null,tracking:null,agencySubs:[],trips:[],activeTab:"dashboard",fleetFilter:"All",searchQuery:"",editingVehicleId:null,vehicleFormImages:[],vehicleFormVideos:[],diaryVehicleId:null,diary:null};const Se=document.getElementById("login-screen"),Te=document.getElementById("app-layout"),De=document.getElementById("login-form"),ne=document.getElementById("login-error"),tt=document.getElementById("logout-btn"),Ne=document.querySelectorAll(".nav-item"),nt=document.querySelectorAll(".tab-page"),Ee=document.getElementById("nav-admins"),at=document.getElementById("page-title"),ot=document.getElementById("page-subtitle"),xe=document.getElementById("pending-badge"),rt=document.getElementById("refresh-btn"),ie=document.getElementById("add-vehicle-header-btn"),Me=document.getElementById("vehicle-modal"),it=document.getElementById("modal-title"),st=document.getElementById("modal-close-btn"),lt=document.getElementById("modal-cancel-btn"),Ae=document.getElementById("vehicle-form"),se=document.getElementById("create-admin-form");document.addEventListener("DOMContentLoaded",()=>{yt(),Lt(),dt(),ct()});function dt(){const e=document.getElementById("register-link");e&&(e.href=window.location.origin.includes("3005")?"http://localhost:3000/":window.location.origin+"/")}function ct(){l.currentUser?Fe():Pe()}function Pe(){Se.classList.remove("hidden"),Te.classList.add("hidden")}function Fe(){Se.classList.add("hidden"),Te.classList.remove("hidden"),pt(),D()}function pt(){const e=l.currentUser;if(!e)return;const t=e.operatorName||"Travel Agency",a=e.username||"admin",n=t.charAt(0).toUpperCase(),o=document.getElementById("agency-identity-block");o&&o.classList.remove("hidden"),document.getElementById("agency-avatar-letter").textContent=n,document.getElementById("agency-name-display").textContent=t,document.getElementById("agency-username-display").textContent="@"+a;const r=document.getElementById("profile-logout-row");r&&r.classList.remove("hidden"),document.getElementById("profile-mini-avatar").textContent=n,document.getElementById("profile-mini-name").textContent=t,document.getElementById("profile-mini-username").textContent="@"+a;const i=document.getElementById("hero-agency-name");i&&(i.textContent=t),e.role==="superadmin"?Ee.classList.remove("hidden"):(Ee.classList.add("hidden"),l.activeTab==="admins"&&me("dashboard"))}async function mt(e){e.preventDefault(),ne.classList.add("hidden");const t=document.getElementById("login-username").value.trim(),a=document.getElementById("login-password").value.trim(),n=document.getElementById("login-submit-btn");n.textContent="Signing in…",n.disabled=!0;try{const o=await fetch(`${v}/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:t,password:a})});let r=null;try{r=await o.json()}catch{r=null}if(!o.ok)throw new Error((r==null?void 0:r.error)||"Invalid username or password");if(!r)throw new Error("Invalid response from backend server");l.currentUser=r,sessionStorage.setItem("tripnix_user",JSON.stringify(r)),De.reset(),Fe()}catch(o){ne.textContent="⚠️ "+o.message,ne.classList.remove("hidden")}finally{n.textContent="Sign In",n.disabled=!1}}function ut(){ue(),l.currentUser=null,l.vehicles=[],l.bookings=[],l.admins=[],l.tracking=null,sessionStorage.removeItem("tripnix_user");const e=document.getElementById("agency-identity-block"),t=document.getElementById("profile-logout-row");e&&e.classList.add("hidden"),t&&t.classList.add("hidden"),document.getElementById("agency-avatar-letter").textContent="",document.getElementById("agency-name-display").textContent="",document.getElementById("agency-username-display").textContent="",document.getElementById("profile-mini-avatar").textContent="",document.getElementById("profile-mini-name").textContent="",document.getElementById("profile-mini-username").textContent="",Pe()}function gt(){const e=document.getElementById("sidebar"),t=document.getElementById("sidebar-overlay");if(!e||!t)return;e.classList.contains("active")?_():ft()}function ft(){const e=document.getElementById("sidebar"),t=document.getElementById("sidebar-overlay");e&&e.classList.add("active"),t&&t.classList.add("active")}function _(){const e=document.getElementById("sidebar"),t=document.getElementById("sidebar-overlay");e&&e.classList.remove("active"),t&&t.classList.remove("active")}function yt(){Ne.forEach(e=>{e.addEventListener("click",()=>{me(e.getAttribute("data-tab"))})})}function me(e){l.activeTab=e,_(),Ne.forEach(a=>{a.classList.toggle("active",a.getAttribute("data-tab")===e)}),nt.forEach(a=>{a.classList.toggle("active",a.id===`tab-${e}`)});const t={dashboard:["Dashboard Overview","Real-time bus schedules and fleet operations"],fleet:["Fleet Management","Add buses, edit details, and post available dates"],bookings:["Customer Bookings","Review and manage booking requests"],trips:["Trips","Post trips that appear in the traveller app story bar"],schedule:["Bus Diary","The running schedule for each bus in your fleet"],accounts:["Accounts","What the diary earned, against what you have paid Tripnix"],gps:["Location","Where every bus last reported from"],subscription:["Subscription & Plans","Platform membership and the fleet plan"],admins:["Manage Travel Owners","Create and manage Travel Owner login credentials"]};t[e]&&(at.textContent=t[e][0],ot.textContent=t[e][1]),e==="admins"&&Q(),e==="subscription"&&X(),e==="trips"&&Z(),e==="schedule"&&ge(),e==="accounts"&&K(),e==="gps"?Bt():ue()}async function K(e){var a;const t=(a=l.currentUser)==null?void 0:a.operatorName;if(t)try{const n=e?`&month=${encodeURIComponent(e)}`:"",o=await fetch(`${v}/accounts?operatorName=${encodeURIComponent(t)}${n}`);if(!o.ok)throw new Error("Could not load accounts");if(l.accounts=await o.json(),!l.accountCategories){const r=await fetch(`${v}/accounts/categories`);r.ok&&(l.accountCategories=await r.json())}xt()}catch(n){document.getElementById("acc-breakdown").innerHTML=`<p class="diary-empty">❌ ${c(n.message)}</p>`}}async function ht(){var e;if(!l.vehicles.length)return alert("❌ Add a bus to your fleet first.");if(!l.accountCategories)try{const t=await fetch(`${v}/accounts/categories`);t.ok&&(l.accountCategories=await t.json())}catch{}document.getElementById("acc-entry-date").value=new Date().toISOString().slice(0,10),document.getElementById("acc-entry-amount").value="",document.getElementById("acc-entry-note").value="",He(((e=document.querySelector('input[name="acc-kind"]:checked'))==null?void 0:e.value)||"income"),document.getElementById("acc-entry-modal").classList.remove("hidden"),document.getElementById("acc-entry-amount").focus()}function le(){document.getElementById("acc-entry-modal").classList.add("hidden"),document.getElementById("acc-entry-form").reset()}const Ie=240;function Be(e,{groups:t,flat:a,value:n,placeholder:o="Select…"}){var d;const r=document.getElementById(e);if(!r)return;const i=Array.isArray(t)&&t.length?t.flatMap(u=>(u.items||[]).map(h=>typeof h=="string"?{value:h,label:h}:h)):(a||[]).map(u=>typeof u=="string"?{value:u,label:u}:u),s=i.some(u=>u.value===n)?n:((d=i[0])==null?void 0:d.value)??"";r.dataset.placeholder=o,r._ddItems=i,r._ddGroups=Array.isArray(t)&&t.length?t:null,r.innerHTML=`
    <button type="button" class="dd-trigger" aria-haspopup="listbox" aria-expanded="false">
      <span class="dd-label"></span>
      <span class="dd-caret" aria-hidden="true">▾</span>
    </button>
    <div class="dd-panel" role="listbox" hidden></div>`,r.querySelector(".dd-trigger").addEventListener("click",u=>{u.stopPropagation(),$t(e)}),Oe(e,s)}function vt(e){return document.getElementById(e.replace(/-dd$/,""))}function Oe(e,t){const a=document.getElementById(e);if(!a)return;const n=(a._ddItems||[]).find(i=>i.value===t);a.dataset.value=n?n.value:"";const o=a.querySelector(".dd-label");o&&(o.textContent=n?n.label:a.dataset.placeholder||"Select…",o.classList.toggle("is-placeholder",!n));const r=vt(e);r&&(r.value=n?n.value:"")}function bt(e){const t=e.dataset.value,a=o=>`
    <button type="button" role="option" class="dd-option${o.value===t?" is-on":""}"
            data-dd-value="${c(o.value)}" aria-selected="${o.value===t}">
      ${c(o.label)}
    </button>`,n=e.querySelector(".dd-panel");n.innerHTML=e._ddGroups?e._ddGroups.map(o=>`
        <div class="dd-group-label">${c(o.group)}</div>
        ${(o.items||[]).map(r=>a(typeof r=="string"?{value:r,label:r}:r)).join("")}`).join(""):(e._ddItems||[]).map(a).join(""),n.querySelectorAll("[data-dd-value]").forEach(o=>o.addEventListener("click",r=>{r.stopPropagation(),Oe(e.id,o.dataset.ddValue),J()}))}function wt(e){const t=e.querySelector(".dd-panel"),a=e.querySelector(".dd-trigger"),o=(e.closest(".modal-card")||document.documentElement).getBoundingClientRect(),r=a.getBoundingClientRect(),i=o.bottom-r.bottom-12,s=r.top-o.top-12,d=i<Math.min(Ie,160)&&s>i;t.style.maxHeight=Math.max(120,Math.min(Ie,d?s:i))+"px",e.classList.toggle("opens-up",d)}function $t(e){var o;const t=document.getElementById(e),a=t==null?void 0:t.querySelector(".dd-panel");if(!a)return;const n=!a.hidden;J(),!n&&(bt(t),a.hidden=!1,t.classList.add("is-open"),t.querySelector(".dd-trigger").setAttribute("aria-expanded","true"),wt(t),(o=a.querySelector(".dd-option.is-on"))==null||o.scrollIntoView({block:"nearest"}))}function J(){document.querySelectorAll(".dd").forEach(e=>{var a;const t=e.querySelector(".dd-panel");t&&(t.hidden=!0),e.classList.remove("is-open","opens-up"),(a=e.querySelector(".dd-trigger"))==null||a.setAttribute("aria-expanded","false")})}document.addEventListener("click",J);document.addEventListener("keydown",e=>{e.key==="Escape"&&J()});function He(e){var n,o,r,i;const t=l.accountCategories;Be("acc-entry-category-dd",{groups:(n=t==null?void 0:t.groups)==null?void 0:n[e],flat:(o=t==null?void 0:t.categories)==null?void 0:o[e],value:(r=document.getElementById("acc-entry-category"))==null?void 0:r.value,placeholder:"Choose a category"});const a=l.vehicles.map(s=>({value:String(s.id),label:`${s.name} · ${s.vehicleNumber||"—"}`}));Be("acc-entry-vehicle-dd",{flat:e==="capital"?a:[{value:"",label:"Whole agency"},...a],value:(i=document.getElementById("acc-entry-vehicle"))==null?void 0:i.value,placeholder:e==="capital"?"Choose a bus":"Whole agency"}),document.getElementById("acc-entry-vehicle-req").textContent=e==="capital"?"*":"",document.getElementById("acc-entry-hint").textContent=e==="capital"?"What the bus cost to buy. Recorded once, not as a monthly expense — it is the sum the bus has to earn back.":e==="income"?"Money in that is not already a diary order — a private contract, a rental, anything else.":"Money out — running the bus, staff, office rent, compliance, finance. Leave the bus blank for costs that cover the whole agency."}async function Et(e){e.preventDefault();const t=document.getElementById("acc-entry-save"),a=t.textContent;t.disabled=!0,t.textContent="Saving…";try{const n=await fetch(`${v}/accounts/entries`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({operatorName:l.currentUser.operatorName,kind:document.querySelector('input[name="acc-kind"]:checked').value,vehicleId:document.getElementById("acc-entry-vehicle").value||null,amount:document.getElementById("acc-entry-amount").value,date:document.getElementById("acc-entry-date").value,category:document.getElementById("acc-entry-category").value,note:document.getElementById("acc-entry-note").value.trim()})}),o=await n.json().catch(()=>null);if(!n.ok)throw new Error((o==null?void 0:o.error)||"Could not save this entry");le(),await K(String(o.date).slice(0,7))}catch(n){alert("❌ "+n.message)}finally{t.disabled=!1,t.textContent=a}}window.removeAccEntry=async function(e){var t;if(confirm("Remove this entry from the books?"))try{if(!(await fetch(`${v}/accounts/entries/${e}?operatorName=${encodeURIComponent(l.currentUser.operatorName)}`,{method:"DELETE"})).ok)throw new Error("Could not remove this entry");await K((t=l.accounts)==null?void 0:t.month)}catch(a){alert("❌ "+a.message)}};function xt(){const e=l.accounts;if(!e)return;const t=document.getElementById("acc-month");t&&document.activeElement!==t&&(t.innerHTML=e.availableMonths.length?e.availableMonths.map(n=>`<option value="${n.value}" ${n.value===e.month?"selected":""}>${c(n.label)}</option>`).join(""):`<option>${c(e.monthLabel)}</option>`),document.getElementById("acc-stats").innerHTML=`
    <div class="stat-card"><span class="stat-icon">📥</span><div><strong>${y(e.income.total)}</strong><span>Money in</span></div></div>
    <div class="stat-card"><span class="stat-icon">📤</span><div><strong>${y(e.expense.total)}</strong><span>Money out</span></div></div>
    <div class="stat-card"><span class="stat-icon">${e.profit<0?"📉":"📈"}</span><div><strong>${y(e.profit)}</strong><span>Profit · ${e.margin}%</span></div></div>
    <div class="stat-card"><span class="stat-icon">📕</span><div><strong>${e.income.orders}</strong><span>Orders</span></div></div>`,document.getElementById("acc-breakdown").innerHTML=`
    <div class="diary-row"><div class="diary-row-main">Diary fares (${e.income.orders})</div><strong>${y(e.income.trips)}</strong></div>
    <div class="diary-row"><div class="diary-row-main">Other income</div><strong>${y(e.income.other)}</strong></div>
    <div class="diary-row"><div class="diary-row-main">App bookings (${e.income.appBookings})</div><span style="color:var(--text-muted);font-style:italic;">no fare recorded</span></div>
    <div class="diary-row"><div class="diary-row-main">Expenses</div><strong>− ${y(e.expense.total)}</strong></div>
    <div class="diary-row" style="border-bottom:none;padding-top:14px;">
      <div class="diary-row-main"><strong>${c(e.monthLabel)} profit</strong></div>
      <strong style="font-size:20px;color:${e.profit<0?"var(--accent-red)":"var(--accent-green)"};">${y(e.profit)}</strong>
    </div>
    ${e.expense.byCategory.length?`
      <p class="panel-header-note" style="margin-top:14px;">Spent on:
        ${e.expense.byCategory.map(n=>`${c(n.category)} ${y(n.amount)}`).join(" · ")}
      </p>`:""}
    <p class="panel-header-note" style="margin-top:10px;line-height:1.6;">
      Diary fares come from the Bus Diary automatically. App bookings carry no fare — travellers
      book without a rate, so nothing is invented for them. Capital and expenses are managed by
      the owner in the Owner Portal.
    </p>`,document.getElementById("acc-vehicles").innerHTML=e.perVehicle.length?e.perVehicle.map(n=>`
        <div class="diary-row">
          <div class="diary-row-main">
            <strong>${c(n.vehicleName)}</strong>
            <div class="diary-row-who">${n.orders} order${n.orders===1?"":"s"} · in ${y(n.income)} · out ${y(n.expense)}</div>
          </div>
          <strong style="color:${n.profit<0?"var(--accent-red)":"inherit"};">${y(n.profit)}</strong>
        </div>`).join(""):'<p class="diary-empty">No buses yet.</p>';const a=[...e.entries.orders.map(n=>({...n,kindLabel:"Diary fare",sign:"+"})),...e.entries.manual.map(n=>({...n,kindLabel:n.source==="income"?"Income":"Expense",sign:n.source==="expense"?"−":"+"}))].sort((n,o)=>String(n.date).localeCompare(String(o.date)));document.getElementById("acc-entries").innerHTML=a.length?a.map(n=>`
        <div class="diary-row">
          <div class="diary-row-main">
            <strong>${c(n.label)}</strong>
            <div class="diary-row-who">
              ${c(n.kindLabel)} · ${c(n.vehicleName||"Whole agency")} ·
              ${B(n.date)}${n.detail?" · "+c(n.detail):""}
            </div>
          </div>
          <div class="diary-row-status">
            <strong style="color:${n.sign==="−"?"var(--accent-red)":"inherit"};">${n.sign}${y(n.amount)}</strong>
            ${n.source==="diary"?"":`<div class="diary-row-actions">
                   <button class="btn btn-secondary btn-sm" style="color:var(--accent-red);"
                           onclick="removeAccEntry(${n.id})">🗑️</button>
                 </div>`}
          </div>
        </div>`).join(""):'<p class="diary-empty">Nothing recorded for this month yet. Use ➕ Add entry to record fuel, wages, servicing or extra income.</p>'}const It=2e4;let H=null;function Bt(){ue(),de(),H=setInterval(()=>{document.hidden||de()},It)}function ue(){H&&clearInterval(H),H=null}document.addEventListener("visibilitychange",()=>{!document.hidden&&H&&de()});async function de(){var t;const e=(t=l.currentUser)==null?void 0:t.operatorName;if(e)try{if(l.mapsApiKey===void 0){const n=await fetch(`${v}/tracking/config`).catch(()=>null),o=n!=null&&n.ok?await n.json():null;l.mapsApiKey=(o==null?void 0:o.mapsApiKey)||""}const a=await fetch(`${v}/tracking?operatorName=${encodeURIComponent(e)}`);if(!a.ok)throw new Error("Could not load tracking");l.tracking=await a.json(),kt()}catch(a){if(l.tracking)return;document.getElementById("gps-list").innerHTML=`<p class="diary-empty">❌ ${c(a.message)}</p>`}}function kt(){const e=l.tracking;if(!e)return;const{vehicles:t,sample:a}=We(e);et(document.getElementById("gps-map"),e,{noteEl:document.getElementById("gps-map-note"),apiKey:l.mapsApiKey}),document.getElementById("gps-note").textContent=a?`Sample positions · live for ${e.staleAfterMinutes} minutes after the last fix`:`${e.reporting} of ${e.total} reporting · live for ${e.staleAfterMinutes} minutes after the last fix`,document.getElementById("gps-list").innerHTML=t.length?t.map(n=>{const o=n.location,r=a?'<span class="badge-status cancelled">SAMPLE</span>':o?o.live?'<span class="badge-status confirmed">LIVE</span>':`<span class="badge-status cancelled">${o.ageMinutes} MIN AGO</span>`:'<span class="badge-status pending">NO SIGNAL</span>',i=G(o),s=o?`${i?c(i):"Position received, place name not available"}${o.speedKph?" · "+Math.round(o.speedKph)+" km/h":""}`:"This bus has never reported a position",d=pe(o),u=[o!=null&&o.driverName?"Driver: "+c(o.driverName):"",d?c(d):""].filter(Boolean).join(" · "),h=u?`<div class="diary-row-who">${u}</div>`:"",m=o?` · <a href="https://www.google.com/maps?q=${o.lat},${o.lng}" target="_blank" rel="noopener">Open map ↗</a>`:"";return`
          <div class="diary-row gps-row">
            <div class="diary-row-main">
              <strong>${c(n.name)}</strong>
              <code class="vehicle-number">${c(n.subtitle||"—")}</code>
              <div class="diary-row-who">${s}${m}</div>
              ${h}
              <div class="diary-row-status">${r}</div>
            </div>
            <div class="row-map" data-bus-map="${n.id}"></div>
          </div>`}).join(""):'<p class="diary-empty">No buses in the fleet yet.</p>';for(const n of t)Ge(document.querySelector(`[data-bus-map="${n.id}"]`),n,{sample:a})}function Lt(){var e,t,a,n,o,r,i,s,d,u,h,m,p,f,g,b,k,w,L,T,E,N,ve,be;De.addEventListener("submit",mt),tt.addEventListener("click",ut),(e=document.getElementById("sidebar-toggle-btn"))==null||e.addEventListener("click",gt),(t=document.getElementById("sidebar-overlay"))==null||t.addEventListener("click",_),(a=document.getElementById("sidebar-close-btn"))==null||a.addEventListener("click",_),rt.addEventListener("click",D),ie.addEventListener("click",()=>{if(l.subscription&&!he()){alert(`🔒 Your agency is not registered yet.

The yearly platform fee is paid on the Tripnix site. See the Subscription page for the link.`),me("subscription");return}Ye()}),st.addEventListener("click",W),lt.addEventListener("click",W),(n=document.getElementById("diary-add-btn"))==null||n.addEventListener("click",()=>fe()),(o=document.getElementById("diary-modal-close"))==null||o.addEventListener("click",ce),(r=document.getElementById("diary-modal-cancel"))==null||r.addEventListener("click",ce),(i=document.getElementById("diary-form"))==null||i.addEventListener("submit",Ft),(s=document.getElementById("acc-month"))==null||s.addEventListener("change",x=>K(x.target.value)),(d=document.getElementById("acc-add-btn"))==null||d.addEventListener("click",ht),(u=document.getElementById("acc-entry-close"))==null||u.addEventListener("click",le),(h=document.getElementById("acc-entry-cancel"))==null||h.addEventListener("click",le),(m=document.getElementById("acc-entry-form"))==null||m.addEventListener("submit",Et),document.querySelectorAll('input[name="acc-kind"]').forEach(x=>x.addEventListener("change",M=>He(M.target.value))),(p=document.getElementById("diary-from"))==null||p.addEventListener("change",x=>{const M=document.getElementById("diary-to");M&&(!M.value||M.value<x.target.value)&&(M.value=x.target.value)}),document.querySelectorAll(".filter-chips .chip[data-filter]").forEach(x=>{x.addEventListener("click",()=>{document.querySelectorAll(".filter-chips .chip[data-filter]").forEach(M=>M.classList.remove("active")),x.classList.add("active"),l.fleetFilter=x.getAttribute("data-filter"),l.seatFilter="All",renderFleetSeatFilterChips(),U()})}),document.getElementById("fleet-search").addEventListener("input",x=>{l.searchQuery=x.target.value,U()}),(f=document.getElementById("vehicle-number"))==null||f.addEventListener("input",x=>{x.target.value=x.target.value.toUpperCase()}),Ae.addEventListener("submit",nn),(g=document.getElementById("upload-images-btn"))==null||g.addEventListener("click",()=>{var x;(x=document.getElementById("vehicle-images-input"))==null||x.click()}),(b=document.getElementById("upload-videos-btn"))==null||b.addEventListener("click",()=>{var x;(x=document.getElementById("vehicle-videos-input"))==null||x.click()}),(k=document.getElementById("vehicle-images-input"))==null||k.addEventListener("change",Tt),(w=document.getElementById("vehicle-videos-input"))==null||w.addEventListener("change",Dt),(L=document.getElementById("vehicle-type"))==null||L.addEventListener("change",j),(T=document.getElementById("vehicle-capacity"))==null||T.addEventListener("input",j),se&&se.addEventListener("submit",Kt),(E=document.getElementById("pricing-form"))==null||E.addEventListener("submit",Gt),(N=document.getElementById("trip-form"))==null||N.addEventListener("submit",jt),(ve=document.getElementById("trip-image-btn"))==null||ve.addEventListener("click",()=>{var x;(x=document.getElementById("trip-image-input"))==null||x.click()}),(be=document.getElementById("trip-image-input"))==null||be.addEventListener("change",Ot),Ct()}function Ct(){const e=document.getElementById("vehicle-type-dropdown"),t=document.getElementById("vehicle-type-trigger"),a=document.getElementById("vehicle-type-menu"),n=document.getElementById("vehicle-type"),o=document.getElementById("selected-type-icon"),r=document.getElementById("selected-type-text"),i=a==null?void 0:a.querySelectorAll(".custom-dropdown-item");if(!t||!a||!n)return;const s={Bus:"🚌",Traveller:"🚐",Car:"🚗"},d={Bus:[{label:"12 Seats",value:12},{label:"22 Seats",value:22},{label:"36 Seats",value:36},{label:"49 Seats",value:49},{label:"Above 49 Seats",value:50,isAbove:!0}],Traveller:[{label:"12 Seats",value:12},{label:"14 Seats",value:14},{label:"16 Seats",value:16},{label:"18 Seats",value:18}],Car:[{label:"4 Seats",value:4},{label:"7 Seats",value:7},{label:"8 Seats",value:8}]};function u(m){var w;const p=document.getElementById("vehicle-seat-options"),f=document.getElementById("vehicle-capacity");if(!p||!f)return;const g=m||((w=document.getElementById("vehicle-type"))==null?void 0:w.value)||"Bus",b=d[g]||d.Bus,k=Number(f.value)||0;p.innerHTML=b.map(L=>`
      <button type="button" class="seat-option-pill${(L.isAbove?k>49:k===L.value)?" active":""}"
              onclick="selectVehicleSeatPill(${L.value}, ${L.isAbove?"true":"false"})">
        ${c(L.label)}
      </button>`).join("")}window.selectVehicleSeatPill=function(m,p){const f=document.getElementById("vehicle-capacity");f&&(f.value=m,u(),j())};function h(){const m=document.getElementById("seat-filter-chips");if(!m)return;const p=l.fleetFilter,f=d[p];if(!f||!f.length){m.innerHTML="",l.seatFilter="All";return}m.innerHTML=`
    <button type="button" class="chip${l.seatFilter==="All"?" active":""}" onclick="setFleetSeatFilter('All')">All Seats</button>
    ${f.map(g=>{const b=g.isAbove?"above49":String(g.value);return`
        <button type="button" class="chip${l.seatFilter===b?" active":""}" onclick="setFleetSeatFilter('${b}')">
          ${c(g.label)}
        </button>`}).join("")}
  `}window.setFleetSeatFilter=function(m){l.seatFilter=m,h(),U()},window.syncCustomTypeDropdown=function(m){const p=m||n.value||"Bus";n.value=p,o&&(o.textContent=s[p]||"🚌"),r&&(r.textContent=p),i==null||i.forEach(f=>{f.classList.toggle("selected",f.dataset.value===p)}),u(p),j()},t.addEventListener("click",m=>{m.stopPropagation(),e.classList.contains("open")?ae():St()}),i==null||i.forEach(m=>{m.addEventListener("click",p=>{p.stopPropagation();const f=m.dataset.value;window.syncCustomTypeDropdown(f),ae()})}),document.addEventListener("click",m=>{e&&!e.contains(m.target)&&ae()})}function St(){const e=document.getElementById("vehicle-type-dropdown"),t=document.getElementById("vehicle-type-menu");e==null||e.classList.add("open"),t==null||t.classList.remove("hidden")}function ae(){const e=document.getElementById("vehicle-type-dropdown"),t=document.getElementById("vehicle-type-menu");e==null||e.classList.remove("open"),t==null||t.classList.add("hidden")}async function Ue(e,t){let a;try{a=await(await fetch(`${v}/uploads/config`)).json()}catch{throw new Error(`Could not reach the API at ${v}. Is the backend server running?`)}if(!a.configured)throw new Error("R2 storage is not configured on the server yet.");const n=a.maxDirectUploadBytes||4194304;if(e.size<=n){const s=new FormData;s.append("files",e);let d;try{d=await fetch(`${v}/uploads?folder=${encodeURIComponent(t)}`,{method:"POST",body:s})}catch{throw new Error(`Upload of "${e.name}" (${Y(e.size)}) was cut off before it finished. Check that the backend is still running, then try again.`)}const u=await d.json().catch(()=>null);if(!d.ok)throw new Error((u==null?void 0:u.error)||`Upload failed (${d.status})`);return u.urls[0]}const o=await fetch(`${v}/uploads/presign`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fileName:e.name,contentType:e.type,folder:t})}),r=await o.json().catch(()=>null);if(!o.ok)throw new Error((r==null?void 0:r.error)||"Could not presign upload");let i;try{i=await fetch(r.uploadUrl,{method:"PUT",headers:{"Content-Type":e.type},body:e})}catch{throw new Error(`"${e.name}" is ${Y(e.size)}, above this server's ${Y(n)} direct-upload limit, so the browser must send it to Cloudflare R2 itself — and R2 refused the connection.

Add ${window.location.origin} to the bucket's CORS policy in the Cloudflare dashboard (R2 → tripnix → Settings → CORS), or upload a smaller file.`)}if(!i.ok)throw new Error(`Direct upload to R2 failed (${i.status}).`);return r.url}function Y(e){return Number.isFinite(e)?e>=1048576?`${(e/1048576).toFixed(1)} MB`:`${Math.max(1,Math.round(e/1024))} KB`:"—"}async function je(e,t,a){const n=Array.from(e.target.files||[]);if(!n.length)return;const o=document.getElementById("media-upload-status"),r=i=>{o&&(o.textContent=i)};try{for(let i=0;i<n.length;i++){const s=n[i];r(`Uploading ${i+1} of ${n.length} — ${s.name} (${Y(s.size)})…`);const d=await Ue(s,t);l[a].push(d),V()}r("")}catch(i){r(""),alert("❌ "+i.message)}finally{e.target.value=""}}function Tt(e){return je(e,"vehicles/images","vehicleFormImages")}function Dt(e){return je(e,"vehicles/videos","vehicleFormVideos")}function V(){const e=document.getElementById("images-preview-grid"),t=document.getElementById("videos-preview-grid");e&&(e.innerHTML=l.vehicleFormImages.map((a,n)=>`
      <div class="media-preview-item">
        <img src="${c(a)}" alt="Vehicle image ${n+1}" />
        <button type="button" class="media-preview-remove" onclick="removeFormImage(${n})" title="Remove image">&times;</button>
      </div>
    `).join("")),t&&(t.innerHTML=l.vehicleFormVideos.map((a,n)=>`
      <div class="media-preview-item">
        <video src="${c(a)}" muted preload="metadata"></video>
        <button type="button" class="media-preview-remove" onclick="removeFormVideo(${n})" title="Remove video">&times;</button>
      </div>
    `).join(""))}window.removeFormImage=function(e){l.vehicleFormImages.splice(e,1),V()};window.removeFormVideo=function(e){l.vehicleFormVideos.splice(e,1),V()};async function D(){var e;try{const[t,a]=await Promise.all([fetch(`${v}/vehicles`),fetch(`${v}/bookings`)]);if(!t.ok||!a.ok)throw new Error("API error");const n=await t.json(),o=await a.json();if(l.currentUser&&l.currentUser.role!=="superadmin"){const r=l.currentUser.operatorName.toLowerCase();l.vehicles=n.filter(i=>i.operatorName.toLowerCase()===r),l.bookings=o.filter(i=>i.operatorName&&i.operatorName.toLowerCase()===r)}else l.vehicles=n,l.bookings=o;Zt(),U(),Xt(),await X(),await Z(),((e=l.currentUser)==null?void 0:e.role)==="superadmin"&&await Q()}catch(t){console.error("Load error:",t),alert("Cannot connect to backend (http://localhost:3000). Please start the backend first.")}}async function ge(){var t,a,n;await D();const e=document.getElementById("diary-list");e&&(e.innerHTML='<p class="diary-empty">Loading agency diary…</p>');try{const o=((t=l.currentUser)==null?void 0:t.operatorName)||"",r=await fetch(`${v}/trips/agency-diary?operatorName=${encodeURIComponent(o)}`);if(!r.ok)throw new Error("Could not load agency diary");l.agencyDiaryData=await r.json();const i=((a=l.agencyDiaryData)==null?void 0:a.entries)||[],s=new Set;i.forEach(d=>{if(d.status==="Completed"||!d.departureDate||!d.arrivalDate)return;let u=new Date(`${d.departureDate}T00:00:00`);const h=new Date(`${d.arrivalDate}T00:00:00`);for(;u<=h;)s.add(u.toISOString().slice(0,10)),u.setDate(u.getDate()+1)}),l.diary={entries:i,latestTrip:((n=l.agencyDiaryData)==null?void 0:n.latestTrip)||null,bookedDates:Array.from(s)}}catch(o){l.diary=null,e&&(e.innerHTML=`<p class="diary-empty">❌ ${c(o.message)}</p>`);return}Nt()}function Nt(){Mt(),At(),Pt()}function Mt(){var n;const e=document.getElementById("latest-diary-trip-container");if(!e)return;const t=(n=l.diary)==null?void 0:n.latestTrip;if(!t){e.innerHTML=`
      <div class="latest-diary-card" style="background: rgba(30, 41, 59, 0.6); border-color: rgba(255, 255, 255, 0.1);">
        <div class="latest-diary-header">
          <div class="latest-diary-badge" style="color: #94a3b8; background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1);">
            🌟 LATEST AGENCY DIARY TRIP
          </div>
        </div>
        <p style="color: var(--text-muted); margin: 0; font-size: 14px;">
          No agency diary trips recorded yet. Click <strong>➕ Add Entry</strong> to record your first order.
        </p>
      </div>`;return}const a=t.status==="On Trip"?"confirmed":t.status==="Completed"?"cancelled":"pending";e.innerHTML=`
    <div class="latest-diary-card">
      <div class="latest-diary-header">
        <div class="latest-diary-badge">🌟 LATEST AGENCY DIARY TRIP</div>
        <span class="badge-status ${a}">${c(t.status)}</span>
      </div>
      <div class="latest-diary-body">
        <div class="latest-diary-main">
          <div class="latest-diary-place">📕 ${c(t.place||"Agency Order")}</div>
          <div class="latest-diary-customer">
            👤 <strong>${c(t.customerName||"Customer")}</strong>
            ${t.customerPhone?` · <a href="tel:${c(t.customerPhone)}">📞 ${c(t.customerPhone)}</a>`:""}
          </div>
          ${t.note?`<div class="latest-diary-note">📝 ${c(t.note)}</div>`:""}
        </div>
        <div class="latest-diary-meta">
          <div class="latest-diary-dates">
            <span class="meta-label">SCHEDULED DATES</span>
            <strong>${B(t.departureDate)} → ${B(t.arrivalDate)}</strong>
            <small>(${t.durationDays} day${t.durationDays===1?"":"s"})</small>
          </div>
          <div class="latest-diary-fare">
            <span class="meta-label">AGREED FARE</span>
            <strong class="fare-amount">${y(t.fare)}</strong>
          </div>
        </div>
      </div>
    </div>`}function At(){const e=document.getElementById("diary-list"),t=document.getElementById("diary-summary");if(!e)return;const a=l.diary;if(!a){e.innerHTML="",t&&(t.innerHTML="");return}const n=a.entries.filter(i=>i.status!=="Completed"),o=a.entries.filter(i=>i.kind==="diary"),r=o.reduce((i,s)=>i+Number(s.fare||0),0);if(t&&(t.innerHTML=`
      <div class="diary-stat"><strong>${n.length}</strong><span>Active / Scheduled</span></div>
      <div class="diary-stat"><strong>${a.bookedDates.length}</strong><span>Days Booked</span></div>
      <div class="diary-stat"><strong>${o.length}</strong><span>Diary Orders</span></div>
      <div class="diary-stat"><strong>${y(r)}</strong><span>Total Fares</span></div>`),!a.entries.length){e.innerHTML='<p class="diary-empty">No orders in your agency diary yet. Use ➕ Add Entry to write an order, or tap a date on the calendar.</p>';return}e.innerHTML=a.entries.map(i=>{const s=i.status==="On Trip"?"confirmed":i.status==="Completed"?"cancelled":"pending",d=i.kind==="diary",u=i.customerPhone?` · <a href="tel:${c(i.customerPhone)}">${c(i.customerPhone)}</a>`:"";let h="";d||i.kind==="booking"?h=`<div class="diary-row-who">👤 ${c(i.customerName||"Customer")}${u}${i.fare?` · <strong>${y(i.fare)}</strong>`:""}</div>`:i.note&&(h=`<div class="diary-row-who">${c(i.note)}</div>`),d&&i.note&&(h+=`<div class="diary-row-who" style="color:var(--text-muted);">📝 ${c(i.note)}</div>`);const m=d?"📕 "+c(i.place||"Agency Order"):i.kind==="booking"?"📑 Customer booking":"🗺️ "+c(i.place||"Trip"),p=d?`<div class="diary-row-actions">
           <button class="btn btn-secondary btn-sm" onclick="editDiaryEntry(${i.id})">✏️ Edit</button>
           <button class="btn btn-secondary btn-sm" style="color:var(--accent-red);" onclick="deleteDiaryEntry(${i.id})">🗑️ Delete</button>
         </div>`:"";return`
      <div class="diary-row">
        <div class="diary-row-dates">
          <strong>${B(i.departureDate)}</strong>
          <span>→ ${B(i.arrivalDate)}</span>
          <small>${i.durationDays} day${i.durationDays===1?"":"s"}</small>
        </div>
        <div class="diary-row-main">
          <div class="diary-row-place">${m}</div>
          ${h}
        </div>
        <div class="diary-row-status">
          <span class="badge-status ${s}">${c(i.status)}</span>
          ${p}
        </div>
      </div>`}).join("")}function Pt(){const e=document.getElementById("diary-calendar");if(!e)return;const t=l.diary;if(!t){e.innerHTML="";return}const a=new Set(t.bookedDates),n=new Date,o=[0,1].map(r=>new Date(n.getFullYear(),n.getMonth()+r,1));e.innerHTML=o.map(r=>{const i=r.toLocaleDateString(void 0,{month:"long",year:"numeric"}),s=new Date(r.getFullYear(),r.getMonth()+1,0).getDate(),d=(r.getDay()+6)%7,u=m=>(t.entries||[]).filter(p=>p.status!=="Completed"&&m>=p.departureDate&&m<=p.arrivalDate).map(p=>`${p.customerName||"Booked"}${p.place?" — "+p.place:""}`).join(" | "),h=[];for(let m=0;m<d;m++)h.push('<span class="diary-day is-blank"></span>');for(let m=1;m<=s;m++){const p=`${r.getFullYear()}-${String(r.getMonth()+1).padStart(2,"0")}-${String(m).padStart(2,"0")}`,f=a.has(p),g=f?`${p} — ${u(p)}`:`${p} — free, tap to write an order`;h.push(`<span class="diary-day${f?" is-booked":""}" title="${c(g)}"${f?"":` role="button" onclick="openDiaryModalForDate('${p}')"`}>${m}</span>`)}return`
      <div class="diary-month">
        <div class="diary-month-label">${c(i)}</div>
        <div class="diary-weekdays"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
        <div class="diary-grid">${h.join("")}</div>
      </div>`}).join("")}function fe(e=null,t=null){const a=document.getElementById("diary-modal");if(!a)return;document.getElementById("diary-modal-title").textContent=e?"Edit Diary Entry":"New Diary Entry";const n=document.getElementById("diary-modal-bus");n&&(n.textContent="📕 Agency Travel Order"),document.getElementById("diary-entry-id").value=(e==null?void 0:e.id)??"",document.getElementById("diary-customer").value=(e==null?void 0:e.customerName)??"",document.getElementById("diary-phone").value=(e==null?void 0:e.customerPhone)??"",document.getElementById("diary-place").value=(e==null?void 0:e.place)??"",document.getElementById("diary-from").value=(e==null?void 0:e.departureDate)??t??"",document.getElementById("diary-to").value=(e==null?void 0:e.arrivalDate)??t??"",document.getElementById("diary-fare").value=e!=null&&e.fare?String(e.fare):"",document.getElementById("diary-note").value=(e==null?void 0:e.note)??"",document.getElementById("diary-save-btn").textContent=e?"Update Entry":"Save Entry",a.classList.remove("hidden"),document.getElementById("diary-customer").focus()}function ce(){var e,t;(e=document.getElementById("diary-modal"))==null||e.classList.add("hidden"),(t=document.getElementById("diary-form"))==null||t.reset()}window.openDiaryModalForDate=function(e){fe(null,e)};window.editDiaryEntry=function(e){var a;const t=(((a=l.diary)==null?void 0:a.entries)||[]).find(n=>n.id===e);t&&fe(t)};window.deleteDiaryEntry=async function(e){var a;const t=(((a=l.diary)==null?void 0:a.entries)||[]).find(n=>n.id===e);if(t&&confirm(`Remove ${t.customerName||"this entry"} (${B(t.departureDate)} → ${B(t.arrivalDate)}) from the agency diary?`))try{if(!(await fetch(`${v}/trips/${e}`,{method:"DELETE"})).ok)throw new Error("Could not remove this entry");await ge()}catch(n){alert("❌ "+n.message)}};async function Ft(e){var r;e.preventDefault();const t=document.getElementById("diary-entry-id").value,a={operatorName:(r=l.currentUser)==null?void 0:r.operatorName,customerName:document.getElementById("diary-customer").value.trim(),customerPhone:document.getElementById("diary-phone").value.trim(),place:document.getElementById("diary-place").value.trim(),departureDate:document.getElementById("diary-from").value,arrivalDate:document.getElementById("diary-to").value,fare:document.getElementById("diary-fare").value,note:document.getElementById("diary-note").value.trim()},n=document.getElementById("diary-save-btn"),o=n.textContent;n.disabled=!0,n.textContent="Saving…";try{const i=await fetch(t?`${v}/trips/diary/${t}`:`${v}/trips/diary`,{method:t?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(a)}),s=await i.json().catch(()=>null);if(!i.ok)throw new Error((s==null?void 0:s.error)||"Could not save this entry");ce(),await ge()}catch(i){alert("❌ "+i.message)}finally{n.disabled=!1,n.textContent=o}}async function Z(){var t;const e=(t=l.currentUser)==null?void 0:t.operatorName;if(e)try{const a=l.currentUser.role==="superadmin"?`${v}/trips`:`${v}/trips?operatorName=${encodeURIComponent(e)}`,n=await fetch(a);if(!n.ok)throw new Error("Failed to load trips");l.trips=await n.json(),Ve(),Ut()}catch(a){console.error("Trips load error:",a)}}function Ve(){const e=document.getElementById("trip-vehicle");if(!e)return;if(!l.vehicles.length){e.innerHTML='<option value="">No vehicles in your fleet yet</option>';return}const t=ye(),a=e.value;e.innerHTML=l.vehicles.map(n=>`
    <option value="${n.id}" ${t?"":"disabled"}>
      ${c(n.name)} · ${c(n.vehicleNumber||"—")}${t?"":"  (fleet fee not paid)"}
    </option>`).join(""),a&&(e.value=a)}async function Ot(e){const t=(e.target.files||[])[0];if(!t)return;const a=document.getElementById("trip-image-status"),n=a==null?void 0:a.textContent;a&&(a.textContent="Uploading to R2…");try{const o=await Ue(t,"trips");document.getElementById("trip-image").value=o,Re(),a&&(a.textContent="Uploaded ✓")}catch(o){a&&(a.textContent=n||""),alert("❌ "+o.message)}finally{e.target.value=""}}function Re(){const e=document.getElementById("trip-image-preview"),t=document.getElementById("trip-image").value.trim();e&&(e.innerHTML=t?`<img src="${c(t)}" alt="Trip image preview" onerror="this.style.display='none'" />`:"")}function Ht(e){return e==="On Trip"?"confirmed":e==="Completed"?"cancelled":"pending"}function Ut(){const e=document.getElementById("trips-tbody"),t=document.getElementById("trips-count-note");if(!e)return;if(!l.trips.length){e.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">No trips posted yet.</td></tr>',t&&(t.textContent="");return}const a=l.trips.filter(n=>n.busListed&&n.status!=="Completed").length;t&&(t.textContent=`${a} of ${l.trips.length} showing in the app`),e.innerHTML=l.trips.map(n=>`
    <tr>
      <td>
        <strong>${c(n.place)}</strong><br>
        <small style="color:var(--text-muted);">${n.durationDays} day${n.durationDays===1?"":"s"}${n.note?" · "+c(n.note):""}</small>
      </td>
      <td>
        ${c(n.vehicleName||"—")}<br>
        <code class="vehicle-number">${c(n.vehicleNumber||"—")}</code>
      </td>
      <td>${B(n.departureDate)}</td>
      <td>${B(n.arrivalDate)}</td>
      <td>
        <span class="badge-status ${Ht(n.status)}">${c(n.status)}</span>
        ${n.busListed?"":'<br><small style="color:var(--accent-red);">bus not subscribed</small>'}
      </td>
      <td>
        <button class="btn btn-secondary btn-sm" style="color:var(--accent-red);" onclick="deleteTrip(${n.id})">🗑️ Delete</button>
      </td>
    </tr>`).join("")}async function jt(e){e.preventDefault();const t=document.getElementById("trip-vehicle").value;if(!t)return alert("❌ Add a subscribed vehicle to your fleet first.");const a={operatorName:l.currentUser.operatorName,vehicleId:Number(t),place:document.getElementById("trip-place").value.trim(),departureDate:document.getElementById("trip-departure").value,arrivalDate:document.getElementById("trip-arrival").value,imageUrl:document.getElementById("trip-image").value.trim(),note:document.getElementById("trip-note").value.trim()};try{const n=await fetch(`${v}/trips`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(a)}),o=await n.json().catch(()=>null);if(!n.ok)throw new Error((o==null?void 0:o.error)||"Failed to post trip");document.getElementById("trip-form").reset(),Re(),await Z(),alert(`✅ Trip to ${o.place} posted!

Bus: ${o.vehicleName} (${o.vehicleNumber})
Departs: ${B(o.departureDate)}
Arrives: ${B(o.arrivalDate)}
Status: ${o.status}`)}catch(n){alert("❌ "+n.message)}}window.deleteTrip=async function(e){if(confirm("Remove this trip from the traveller app?"))try{if(!(await fetch(`${v}/trips/${e}`,{method:"DELETE"})).ok)throw new Error("Failed to delete trip");await Z()}catch(t){alert("❌ "+t.message)}};async function X(){var t;const e=(t=l.currentUser)==null?void 0:t.operatorName;if(e)try{const[a,n]=await Promise.all([fetch(`${v}/subscriptions/plans`),fetch(`${v}/subscriptions?operatorName=${encodeURIComponent(e)}`)]);if(!a.ok||!n.ok)throw new Error("Failed to load subscription data");if(l.plans=await a.json(),l.subscription=await n.json(),l.currentUser.role==="superadmin"){const o=await fetch(`${v}/subscriptions/overview`);o.ok&&(l.agencySubs=await o.json())}Vt()}catch(a){console.error("Subscription load error:",a)}}function y(e){var n;const t=((n=l.plans)==null?void 0:n.currencySymbol)||"₹",a=Number(e||0);return(a<0?"-":"")+t+Math.abs(a).toLocaleString("en-IN")}function B(e){return e?new Date(e).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}):"—"}function R(e){var n;const t=((n=l.plans)==null?void 0:n.fleetTiers)||[],a=Math.max(1,Number(e)||0);return t.find(o=>a>=o.minVehicles&&(o.maxVehicles===null||a<=o.maxVehicles))||t[t.length-1]||null}function I(){return l.vehicles.length}function z(){var e;return((e=l.subscription)==null?void 0:e.fleet)||null}function ye(){var e;return((e=z())==null?void 0:e.status)==="active"}function ze({title:e,lead:t,planName:a,planSub:n,planPrice:o,lines:r=[],total:i,note:s,actionLabel:d}){return new Promise(u=>{const h=document.getElementById("payment-modal");if(!h)return u(!0);document.getElementById("payment-title").textContent=e,document.getElementById("payment-lead").textContent=t||"",document.getElementById("payment-plan").innerHTML=`
      <div>
        <span class="pay-plan-name">${c(a)}</span>
        <span class="pay-plan-sub">${c(n||"")}</span>
      </div>
      <div>
        <span class="pay-plan-price">${o}</span>
        <span class="pay-plan-period">per ${c(S())}</span>
      </div>`,document.getElementById("payment-lines").innerHTML=r.map(b=>`<div><dt>${c(b.label)}</dt><dd>${b.value}</dd></div>`).join(""),document.getElementById("payment-total").textContent=i,document.getElementById("payment-note").textContent=s||"No card is charged yet — the payment gateway is being connected. Confirming records this payment against your agency.";const m=document.getElementById("payment-confirm");m.textContent=d||"Pay & Continue";const p=b=>{h.classList.add("hidden"),m.removeEventListener("click",f),document.getElementById("payment-cancel").removeEventListener("click",g),document.getElementById("payment-close").removeEventListener("click",g),u(b)},f=()=>p(!0),g=()=>p(!1);m.addEventListener("click",f),document.getElementById("payment-cancel").addEventListener("click",g),document.getElementById("payment-close").addEventListener("click",g),h.classList.remove("hidden")})}function P({icon:e="✅",title:t,lead:a,lines:n=[],actionLabel:o="Done"}){return new Promise(r=>{const i=document.getElementById("notice-modal");if(!i)return alert(`${t}

${a||""}`),r();document.getElementById("notice-icon").textContent=e,document.getElementById("notice-title").textContent=t,document.getElementById("notice-lead").textContent=a||"",document.getElementById("notice-lines").innerHTML=n.map(u=>`<div><dt>${c(u.label)}</dt><dd>${u.value}</dd></div>`).join("");const s=document.getElementById("notice-ok");s.textContent=o;const d=()=>{i.classList.add("hidden"),s.removeEventListener("click",d),r()};s.addEventListener("click",d),i.classList.remove("hidden")})}function qe(){const e=R(I()+1);if(!e)return null;const t=z();return!t||t.status!=="active"?{tier:e,charge:e.price,upgrade:!1}:t.tierId===e.tierId?{tier:e,charge:0,upgrade:!1}:{tier:e,charge:Math.max(0,e.price-(t.price||0)),upgrade:!0}}function S(){var e;return((e=l.plans)==null?void 0:e.billingPeriod)||"month"}function he(){var e,t;return((t=(e=l.subscription)==null?void 0:e.platform)==null?void 0:t.status)==="active"}function Vt(){l.plans&&(Rt(),qt(),zt(),Yt(),_t(),Wt())}function Rt(){var g;const e=l.plans.platform,t=(g=l.subscription)==null?void 0:g.platform,a=he(),n=window.location.origin.includes("3005")?"http://localhost:3000/":window.location.origin+"/";document.getElementById("membership-title").textContent=e.name;const o=e.plans||[],r=o.find(b=>b.id===(t==null?void 0:t.planId)),i=o.reduce((b,k)=>b&&b.price<=k.price?b:k,o[0]),s=r||i;document.getElementById("membership-price").textContent=s?`${y(s.price)} / ${s.period}`:y(e.price);const d=document.querySelector(".membership-price-label");d&&(d.textContent=r?"Your platform plan":"Platform fee from"),document.getElementById("membership-benefits").innerHTML=e.features.map(b=>`<li>${c(b)}</li>`).join("");const u=document.getElementById("membership-badge"),h=document.getElementById("membership-card"),m=document.getElementById("membership-status-line"),p=document.getElementById("membership-managed-note");h.classList.toggle("is-active",a),document.getElementById("membership-start").textContent=B(t==null?void 0:t.startsAt),document.getElementById("membership-expiry").textContent=B(t==null?void 0:t.expiresAt),document.getElementById("membership-remaining").textContent=t&&a?`${t.daysLeft} days`:"—",document.getElementById("membership-paid").textContent=t?y(t.amount):"—",a?(u.className="badge-status confirmed",u.textContent="ACTIVE",m.textContent=`${l.subscription.operatorName} is registered. You can add vehicles and browse other agencies' fleets.`,p.innerHTML=`🔒 Managed on the Tripnix site — renew at <a href="${n}" target="_blank" rel="noopener">${n}</a> before it expires.`):t?(u.className="badge-status cancelled",u.textContent="EXPIRED",m.textContent="Your membership has lapsed, so your fleet is hidden from travellers.",p.innerHTML=`⚠️ Renew on the Tripnix site to go live again: <a href="${n}" target="_blank" rel="noopener">${n}</a>`):(u.className="badge-status pending",u.textContent="NOT REGISTERED",m.textContent=e.tagline,p.innerHTML=`⚠️ Pay the platform fee on the Tripnix site to activate your agency: <a href="${n}" target="_blank" rel="noopener">${n}</a>`);const f=document.getElementById("subscription-badge");f&&(f.style.display=a?"none":"inline-block")}function zt(){var n;const e=l.plans?document.getElementById("plan-grid"):null;if(!e)return;const t=l.plans.fleetTiers||[];if(!t.length){e.innerHTML='<p class="plan-empty">No fleet plan configured.</p>';return}const a=(n=R(I()))==null?void 0:n.id;e.innerHTML=`
    <div class="plan-cards">
      ${t.map(o=>`
        <div class="plan-card${o.id===a&&I()>0?" is-current":""}">
          <span class="plan-card-tier">🚍 ${c(o.label)}</span>
          <span class="plan-card-seats">${o.maxVehicles===null?`${o.minVehicles} or more vehicles`:`${o.minVehicles}–${o.maxVehicles} vehicles, one fee`}</span>
          <div class="plan-card-price">${y(o.price)}</div>
          <span class="plan-card-period">whole fleet / ${S()}</span>
        </div>`).join("")}
    </div>`}function qt(){var n,o,r,i;const e=document.getElementById("platform-plan-options");if(!e)return;const t=((o=(n=l.plans)==null?void 0:n.platform)==null?void 0:o.plans)||[];if(!t.length){e.innerHTML="";return}const a=(i=(r=l.subscription)==null?void 0:r.platform)==null?void 0:i.planId;e.innerHTML=t.map(s=>`
    <div class="platform-plan${s.id===a?" is-current":""}">
      <div class="platform-plan-head">
        <span class="platform-plan-label">${c(s.label)}</span>
        <span class="platform-plan-price">${y(s.price)}</span>
      </div>
      <span class="platform-plan-note">
        ${s.id===a?"Your current plan":s.note?c(s.note):`Billed every ${c(s.period)}`}
      </span>
    </div>`).join("")}function Yt(){const e=document.getElementById("listings-tbody"),t=document.getElementById("listing-total-note");if(!e)return;if(!l.vehicles.length){e.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">No vehicles in your fleet yet.</td></tr>',t.textContent="";return}const a=z(),n=ye(),o=R(I()),r=n?'<span class="badge-status confirmed">LISTED</span>':a?'<span class="badge-status cancelled">EXPIRED</span>':'<span class="badge-status pending">UNPAID</span>';e.innerHTML=l.vehicles.map(d=>`
    <tr>
      <td><strong>${c(d.name)}</strong></td>
      <td><code class="vehicle-number">${c(d.vehicleNumber||"—")}</code></td>
      <td>${c(d.type)}</td>
      <td>${d.capacity}</td>
      <td><small style="color:var(--text-muted);">covered by fleet plan</small></td>
      <td>${r}</td>
      <td><small style="color:var(--text-muted);">—</small></td>
    </tr>`).join("");const i=o?c(o.label):"—",s=o?y(o.price):"—";n?t.innerHTML=`${I()} vehicle${I()===1?"":"s"} on the <strong>${i}</strong> plan (${s}/${S()}) · renews ${B(a.expiresAt)} · ${a.daysLeft} days left <button class="btn btn-secondary btn-sm" style="margin-left:10px;" onclick="payFleetFee()">🔄 Renew ${s}</button>`:t.innerHTML=`Your fleet of ${I()} needs the <strong>${i}</strong> plan (${s}/${S()}). Your vehicles stay hidden from travellers until it is paid. <button class="btn btn-primary btn-sm" style="margin-left:10px;" onclick="payFleetFee()">💳 Pay ${s}</button>`}function _t(){var i;const e=document.getElementById("superadmin-subscription-panels");if(!e)return;if(((i=l.currentUser)==null?void 0:i.role)!=="superadmin"){e.classList.add("hidden");return}e.classList.remove("hidden");const t=(l.plans.platform.plans||[])[0],a=document.getElementById("price-platform");a&&document.activeElement!==a&&(a.value=t?t.price:l.plans.platform.price);const n=document.getElementById("price-platform-label");n&&t&&(n.textContent=`Platform membership (per ${t.period})`);const o=document.getElementById("tier-price-inputs");o.dataset.built||(o.innerHTML=(l.plans.fleetTiers||[]).map(s=>`
      <div class="form-group">
        <label for="price-${s.id}">${c(s.label)} <small style="color:var(--text-muted);">(whole fleet / ${S()})</small></label>
        <input type="number" id="price-${s.id}" data-tier-id="${s.id}" min="0" step="1" required />
      </div>`).join(""),o.dataset.built="true"),(l.plans.fleetTiers||[]).forEach(s=>{const d=document.getElementById(`price-${s.id}`);d&&document.activeElement!==d&&(d.value=s.price)});const r=document.getElementById("agency-subs-tbody");if(!l.agencySubs.length){r.innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">No agency has subscribed yet.</td></tr>';return}r.innerHTML=l.agencySubs.map(s=>`
    <tr>
      <td><strong>${c(s.operatorName)}</strong></td>
      <td>${s.platform?`<span class="badge-status ${s.platform.status==="active"?"confirmed":"cancelled"}">${s.platform.status.toUpperCase()}</span>`:'<span class="badge-status pending">NONE</span>'}</td>
      <td>${s.platform?B(s.platform.expiresAt):"—"}</td>
      <td>${s.fleet?`${c(s.fleet.tierLabel)} · ${s.vehicleCount} vehicle${s.vehicleCount===1?"":"s"}<br><span class="badge-status ${s.fleet.status==="active"?"confirmed":"cancelled"}">${s.fleet.status.toUpperCase()}</span>`:'<span class="badge-status pending">NO FLEET PLAN</span>'}</td>
      <td><strong>${y(s.totalPaid)}</strong></td>
    </tr>`).join("")}function Wt(){const e=he();ie.title=e?"Add a vehicle to your fleet":"Pay the platform fee first to start adding vehicles",ie.classList.toggle("btn-locked",!e)}window.payFleetFee=async function(){var o,r;const e=(o=l.currentUser)==null?void 0:o.operatorName;if(!e)return;const t=R(I());if(!t)return alert("❌ No fleet plan is configured.");const a=ye();if(await ze({title:a?"Renew Fleet Plan":"Confirm Payment",lead:a?`Extends your fleet plan by another ${S()} from its current expiry.`:"One fee covers every vehicle you run — priced by how many that is.",planName:`${t.label} fleet plan`,planSub:`Covers all ${I()} of your vehicle${I()===1?"":"s"}`,planPrice:y(t.price),lines:[{label:"Plan price",value:`${y(t.price)} / ${S()}`},{label:"Vehicles covered",value:String(I())},...a?[{label:"Extends from",value:B((r=z())==null?void 0:r.expiresAt)}]:[]],total:y(t.price),actionLabel:a?`Renew · ${y(t.price)}`:`Pay ${y(t.price)}`}))try{const i=await fetch(`${v}/subscriptions/fleet`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({operatorName:e,vehicleCount:I()})}),s=await i.json();if(!i.ok)throw new Error((s==null?void 0:s.error)||"Payment failed");await X(),U(),Ve(),await P({icon:a?"🔄":"🎉",title:a?"Fleet plan renewed":"Your fleet is listed!",lead:a?"Your vehicles stay visible to travellers for another period.":"Every vehicle in your fleet is now visible to travellers.",lines:[{label:"Fleet plan",value:c(s.tierLabel)},{label:"Vehicles covered",value:String(I())},{label:"Paid now",value:y(t.price)},{label:"Covered until",value:B(s.expiresAt)}]})}catch(i){alert("❌ "+i.message)}};async function Gt(e){e.preventDefault();const t=Number(document.getElementById("price-platform").value),a=[...document.querySelectorAll("#tier-price-inputs input[data-tier-id]")].map(n=>({id:n.dataset.tierId,price:Number(n.value)}));try{const n=await fetch(`${v}/subscriptions/plans`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({platformPrice:t,fleetTiers:a})}),o=await n.json();if(!n.ok)throw new Error((o==null?void 0:o.error)||"Failed to save pricing");await X(),alert("✅ Plan pricing updated.")}catch(n){alert("❌ "+n.message)}}async function Q(){var e;if(((e=l.currentUser)==null?void 0:e.role)==="superadmin")try{const t=await fetch(`${v}/auth/admins`);if(!t.ok)throw new Error("Failed");l.admins=await t.json(),Jt()}catch(t){console.error("Admins load error:",t)}}async function Kt(e){e.preventDefault();const t=document.getElementById("admin-username").value.trim(),a=document.getElementById("admin-password").value.trim(),n=document.getElementById("admin-operator").value.trim(),o=document.getElementById("admin-phone").value.trim();try{const r=await fetch(`${v}/auth/admins`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:t,password:a,operatorName:n,phone:o})});let i=null;try{i=await r.json()}catch{i=null}if(!r.ok)throw new Error((i==null?void 0:i.error)||"Failed to create account");se.reset(),await Q(),alert(`✅ Account created!

Travel Agency: ${n}
Username: ${t}
Password: ${a}

Share these credentials with the travel owner.`)}catch(r){alert("❌ "+r.message)}}function Jt(){const e=document.getElementById("admins-table-tbody");if(e){if(!l.admins.length){e.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">No travel owner accounts yet.</td></tr>';return}e.innerHTML=l.admins.map(t=>`
    <tr>
      <td>#${t.id}</td>
      <td><strong>${c(t.username)}</strong></td>
      <td><code style="background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;">${c(t.password)}</code></td>
      <td>${c(t.operatorName)}</td>
      <td>${t.phone?c(t.phone):'<span style="color:var(--text-muted);">—</span>'}</td>
      <td><span class="badge-status ${t.role==="superadmin"?"confirmed":"pending"}">${t.role==="superadmin"?"Developer":"Travel Owner"}</span></td>
      <td>
        ${t.role!=="superadmin"?`<button class="btn btn-secondary btn-sm" style="color:var(--accent-red);" onclick="deleteAdmin(${t.id})">🗑️ Delete</button>`:"—"}
      </td>
    </tr>`).join("")}}window.deleteAdmin=async function(e){if(confirm("Delete this travel owner account?"))try{if(!(await fetch(`${v}/auth/admins/${e}`,{method:"DELETE"})).ok)throw new Error("Failed to delete");await Q()}catch(t){alert("❌ "+t.message)}};function Zt(){let e=0,t=0;l.bookings.forEach(d=>{d.status==="Confirmed"?e++:d.status==="Pending"&&t++});const a=new Set;l.vehicles.forEach(d=>(d.availableDates||[]).forEach(u=>a.add(u))),document.getElementById("stat-fleet").textContent=`${l.vehicles.length} Units`,document.getElementById("stat-schedules").textContent=`${a.size} Days`,document.getElementById("stat-confirmed").textContent=e,document.getElementById("stat-pending").textContent=t,xe.textContent=t,xe.style.display=t>0?"inline-block":"none";const n=l.vehicles.filter(d=>d.type==="Bus").length,o=l.vehicles.filter(d=>d.type==="Traveller").length,r=l.vehicles.filter(d=>d.type==="Car").length;document.getElementById("bus-count").textContent=n,document.getElementById("bus-count-desc").textContent=`${n} buses in fleet`,document.getElementById("traveller-count").textContent=o,document.getElementById("traveller-count-desc").textContent=`${o} travellers in fleet`,document.getElementById("car-count").textContent=r,document.getElementById("car-count-desc").textContent=`${r} cars in fleet`;const i=document.getElementById("recent-bookings-tbody"),s=[...l.bookings].reverse().slice(0,5);i.innerHTML=s.length===0?'<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">No bookings yet</td></tr>':s.map(d=>`
      <tr>
        <td><strong>${c(d.vehicleName)}</strong></td>
        <td>${c(d.userName)}</td>
        <td>${d.startDate} → ${d.endDate}</td>
        <td><span class="badge-status ${d.status.toLowerCase()}">${d.status}</span></td>
      </tr>`).join("")}function U(){const e=document.getElementById("vehicles-grid");if(!e)return;const t=l.vehicles.filter(a=>{const n=l.fleetFilter==="All"||a.type===l.fleetFilter;let o=!0;if(l.seatFilter&&l.seatFilter!=="All"){const s=Number(a.capacity)||0;l.seatFilter==="above49"?o=s>49:o=s===Number(l.seatFilter)}const r=l.searchQuery.trim().toLowerCase(),i=!r||a.name.toLowerCase().includes(r)||a.operatorName.toLowerCase().includes(r);return n&&o&&i});if(!t.length){e.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--text-muted);">No vehicles found.</div>';return}e.innerHTML=t.map(a=>{const n=a.availableDates||[],o=n.length?n.map(i=>`<span class="date-pill">${i}</span>`).join(""):'<span style="font-size:11px;color:var(--text-muted);">No dates posted yet</span>',r=a.onHold?_e(a.heldSince):0;return`
    <div class="vehicle-admin-card${a.onHold?" is-held":""}">
      <div class="card-image">
        ${(a.imageUrls||[])[0]?`<img src="${(a.imageUrls||[])[0]}" alt="${c(a.name)}" />`:'<div class="card-image-empty">No photo uploaded</div>'}
        <span class="card-badge">${a.type.toUpperCase()}</span>
        ${a.onHold?'<span class="card-hold-badge">⏸️ ON HOLD</span>':""}
      </div>
      <div class="card-body">
        <h4 class="card-title">${c(a.name)}</h4>
        <p class="card-operator">
          <code class="vehicle-number">${c(a.vehicleNumber||"—")}</code>
          &nbsp;·&nbsp; ${c(a.operatorName)}
        </p>
        ${a.onHold?`
          <div class="hold-note">
            <strong>Off the app for ${r} day${r===1?"":"s"}</strong>
            <span>${a.holdReason?c(a.holdReason)+" · ":""}since ${B(a.heldSince)}</span>
            <span>These days are added back to your plan when you resume it.</span>
          </div>`:""}
        <div class="card-specs">
          <span>👥 ${a.capacity} Seats</span>
          <span title="Worked out from this vehicle's ${a.ratedOn||0} amenit${a.ratedOn===1?"y":"ies"} — tick more in Edit to raise it">
            ⭐ ${(a.rating??3).toFixed(1)} · ${c(a.ratingLabel||"Standard")}
          </span>
        </div>
        <div class="rating-basis">
          ${(a.features||[]).length?(a.features||[]).map(i=>`<span class="feature-pill">${c(i)}</span>`).join(""):'<span class="feature-empty">No amenities ticked — add some in Edit to raise the rating</span>'}
        </div>
        <div style="margin-top:10px;">
          <span style="font-size:11px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">📅 Available Showcase Dates:</span>
          <div class="date-pills">${o}</div>
        </div>
        <div class="card-footer" style="margin-top:14px;">
          <div class="card-actions" style="margin-left:auto;">
            ${a.onHold?`<button class="btn btn-primary btn-sm" onclick="resumeVehicle(${a.id})">▶️ Resume</button>`:`<button class="btn btn-secondary btn-sm" onclick="holdVehicle(${a.id})">⏸️ Hold</button>`}
            <button class="btn btn-secondary btn-sm" onclick="editVehicle(${a.id})">✏️ Edit</button>
            <button class="btn btn-secondary btn-sm" style="color:var(--accent-red);" onclick="deleteVehicle(${a.id})">🗑️ Delete</button>
          </div>
        </div>
      </div>
    </div>`}).join("")}function Xt(){const e=document.getElementById("all-bookings-tbody"),t=[...l.bookings].reverse();e.innerHTML=t.length?t.map(a=>`
      <tr>
        <td>#${a.id}</td>
        <td><strong>${c(a.vehicleName)}</strong></td>
        <td>${c(a.userName)}</td>
        <td>${c(a.userPhone)}</td>
        <td>${a.startDate} → ${a.endDate}</td>
        <td><span class="badge-status ${a.status.toLowerCase()}">${a.status}</span></td>
        <td>${a.status==="Pending"?`
          <button class="btn btn-action-confirm" onclick="updateBookingStatus(${a.id}, 'Confirmed')">Confirm</button>
          <button class="btn btn-action-cancel" onclick="updateBookingStatus(${a.id}, 'Cancelled')">Cancel</button>`:"—"}
        </td>
      </tr>`).join(""):'<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:32px;">No bookings found.</td></tr>'}let $=null;function Qt(){const e=document.getElementById("vehicle-dates");e&&typeof flatpickr<"u"&&!$&&($=flatpickr(e,{mode:"multiple",dateFormat:"Y-m-d",conjunction:", ",theme:"dark",monthSelectorType:"dropdown",onChange:t=>{ee(t)}}),tn())}function ee(e){const t=document.getElementById("selected-date-chips"),a=document.getElementById("selected-dates-count");if(!t)return;const n=(e||[]).map(o=>{if(o instanceof Date){const r=o.getFullYear(),i=String(o.getMonth()+1).padStart(2,"0"),s=String(o.getDate()).padStart(2,"0");return`${r}-${i}-${s}`}return String(o).trim()}).filter(Boolean).sort();if(a&&(a.textContent=`${n.length} date${n.length===1?"":"s"} selected`),n.length===0){t.innerHTML='<span class="no-dates-text">No dates selected yet. Click input or presets above to select dates.</span>';return}t.innerHTML=n.map(o=>`
    <span class="selected-date-chip">
      <span class="chip-date">📅 ${o}</span>
      <button type="button" class="chip-remove" data-date="${o}" title="Remove date">&times;</button>
    </span>
  `).join(""),t.querySelectorAll(".chip-remove").forEach(o=>{o.addEventListener("click",r=>{r.stopPropagation();const i=o.getAttribute("data-date");en(i)})})}function en(e){if(!$)return;const a=$.selectedDates.filter(n=>{const o=n.getFullYear(),r=String(n.getMonth()+1).padStart(2,"0"),i=String(n.getDate()).padStart(2,"0");return`${o}-${r}-${i}`!==e});$.setDate(a,!0)}function tn(){var e,t,a,n,o;(e=document.getElementById("preset-today"))==null||e.addEventListener("click",()=>{const r=new Date;$==null||$.setDate([r],!0)}),(t=document.getElementById("preset-next-7"))==null||t.addEventListener("click",()=>{const r=[],i=new Date;for(let s=0;s<7;s++){const d=new Date(i);d.setDate(i.getDate()+s),r.push(d)}$==null||$.setDate(r,!0)}),(a=document.getElementById("preset-next-14"))==null||a.addEventListener("click",()=>{const r=[],i=new Date;for(let s=0;s<14;s++){const d=new Date(i);d.setDate(i.getDate()+s),r.push(d)}$==null||$.setDate(r,!0)}),(n=document.getElementById("preset-clear"))==null||n.addEventListener("click",()=>{$==null||$.clear(),ee([])}),(o=document.getElementById("open-calendar-btn"))==null||o.addEventListener("click",()=>{$==null||$.open()})}function Ye(e=null){var i;l.editingVehicleId=(e==null?void 0:e.id)??null,it.textContent=e?"Edit Vehicle":"Add New Vehicle";const t=document.getElementById("modal-save-btn");t&&(t.textContent=e?"Update Vehicle":"Add Vehicle");const a=((i=l.currentUser)==null?void 0:i.operatorName)??"",n=(e==null?void 0:e.type)??"Bus";document.getElementById("vehicle-id").value=(e==null?void 0:e.id)??"",document.getElementById("vehicle-type").value=n,document.getElementById("vehicle-operator").value=(e==null?void 0:e.operatorName)??a,document.getElementById("vehicle-name").value=(e==null?void 0:e.name)??"",document.getElementById("vehicle-number").value=(e==null?void 0:e.vehicleNumber)??"",document.getElementById("vehicle-capacity").value=(e==null?void 0:e.capacity)??36,document.getElementById("vehicle-description").value=(e==null?void 0:e.description)??"",document.getElementById("vehicle-instagram").value=(e==null?void 0:e.instagramUrl)??"",window.syncCustomTypeDropdown&&window.syncCustomTypeDropdown(n),l.vehicleFormImages=Array.isArray(e==null?void 0:e.imageUrls)?[...e.imageUrls]:[],l.vehicleFormVideos=Array.isArray(e==null?void 0:e.videoUrls)?[...e.videoUrls]:[],V();const o=(e==null?void 0:e.features)??["AC","WiFi"];document.querySelectorAll(".features-checkboxes input").forEach(s=>{s.checked=o.includes(s.value)}),Qt();const r=(e==null?void 0:e.availableDates)??[];$?($.setDate(r,!1),ee($.selectedDates)):document.getElementById("vehicle-dates").value=r.join(", "),j(),Me.classList.remove("hidden")}function j(){const e=document.getElementById("vehicle-sub-panel");if(!e||!l.plans)return;const t=!!l.editingVehicleId,a=document.getElementById("vehicle-sub-tier-label"),n=document.getElementById("vehicle-sub-tier-seats"),o=document.getElementById("vehicle-sub-price"),r=document.getElementById("vehicle-sub-note"),i=document.getElementById("modal-save-btn");if(t){const d=z(),u=R(I());e.classList.remove("is-invalid"),i.disabled=!1,a.textContent=u?`${u.label} fleet plan`:"Fleet plan",n.textContent=`${I()} vehicle${I()===1?"":"s"} covered`,o.textContent=u?`${y(u.price)}/${S()}`:"—",r.textContent=(d==null?void 0:d.status)==="active"?`Covered until ${B(d.expiresAt)}. Updating these details does not change the fee.`:"Updating these details does not change the fee. Pay it from the Subscription page.",i.textContent="Update Vehicle";return}const s=qe();if(!s){e.classList.add("is-invalid"),a.textContent="No fleet plan configured",n.textContent="",o.textContent="—",r.textContent="No fleet plan is configured. Ask the Super Admin to set one on the Subscription page.",i.textContent="Add Vehicle",i.disabled=!0;return}e.classList.remove("is-invalid"),i.disabled=!1,a.textContent=`${s.tier.label} fleet plan`,n.textContent=`This would be vehicle #${I()+1}`,o.textContent=`${y(s.tier.price)}/${S()}`,s.charge===0?r.textContent=`Your ${s.tier.label} plan (${y(s.tier.price)}/${S()}) already covers this vehicle — nothing more to pay. It goes live in the app straight after.`:s.upgrade?r.textContent=`This vehicle moves your fleet onto the ${s.tier.label} plan at ${y(s.tier.price)}/${S()}. You have already paid ${y(s.tier.price-s.charge)} of it, so ${y(s.charge)} is payable now and your renewal date does not change.`:r.textContent=`Adding this vehicle starts your ${s.tier.label} plan at ${y(s.tier.price)} for one ${S()}, covering every vehicle you add inside that band.`,i.textContent=s.charge>0?`Add Vehicle · ${y(s.charge)}`:"Add Vehicle"}function W(){$&&$.clear(),ee([]),l.vehicleFormImages=[],l.vehicleFormVideos=[],V(),window.syncCustomTypeDropdown&&window.syncCustomTypeDropdown("Bus"),Me.classList.add("hidden"),Ae.reset()}async function nn(e){e.preventDefault();const t=l.editingVehicleId,a=document.getElementById("vehicle-name").value.trim(),n=document.getElementById("vehicle-number").value.trim().toUpperCase(),o=document.getElementById("vehicle-type").value,r=document.getElementById("vehicle-operator").value.trim(),i=Number(document.getElementById("vehicle-capacity").value),s=document.getElementById("vehicle-description").value.trim(),d=document.getElementById("vehicle-instagram").value.trim();let u=[];$&&$.selectedDates.length>0?u=$.selectedDates.map(w=>{const L=w.getFullYear(),T=String(w.getMonth()+1).padStart(2,"0"),E=String(w.getDate()).padStart(2,"0");return`${L}-${T}-${E}`}).sort():u=document.getElementById("vehicle-dates").value.split(",").map(w=>w.trim()).filter(Boolean);const h=l.vehicleFormImages,m=l.vehicleFormVideos,p=[...document.querySelectorAll(".features-checkboxes input:checked")].map(w=>w.value),f={name:a,type:o,vehicleNumber:n,operatorName:r,capacity:i,description:s,instagramUrl:d,availableDates:u,imageUrls:h,videoUrls:m,features:p},g=t?null:qe();if(!t&&!g)return alert("❌ No fleet plan is configured, so this vehicle cannot be listed yet.");if(g&&g.charge>0){const w=g.tier.price-g.charge;if(!await ze({title:g.upgrade?"Upgrade Fleet Plan":"Confirm Payment",lead:g.upgrade?`Adding ${a} takes your fleet to ${I()+1} vehicles, which moves you onto the ${g.tier.label} plan.`:`Adding ${a} starts your fleet plan. One fee covers every vehicle in the band.`,planName:`${g.tier.label} fleet plan`,planSub:`Covers ${I()+1} vehicle${I()+1===1?"":"s"}`,planPrice:y(g.tier.price),lines:[{label:"Plan price",value:`${y(g.tier.price)} / ${S()}`},...w>0?[{label:"Already paid this period",value:`− ${y(w)}`}]:[],{label:"Billing period",value:S()}],total:y(g.charge),actionLabel:`Pay ${y(g.charge)} & Add`}))return}const b=document.getElementById("modal-save-btn"),k=b.textContent;b.disabled=!0,b.textContent="Saving…";try{const w=t?`${v}/vehicles/${t}`:`${v}/vehicles`,T=await fetch(w,{method:t?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(f)});let E=null;try{E=await T.json()}catch{E=null}if(!T.ok)throw new Error((E==null?void 0:E.error)||"Failed to save vehicle");if(t)return W(),await D(),P({icon:"✏️",title:`${a} updated`,lead:"The details are saved. Your fleet plan and renewal date are unchanged."});if(W(),await D(),!E.fleet)return P({icon:"⚠️",title:`${a} saved, but not listed`,lead:E.listingWarning||"The fleet fee could not be charged, so your vehicles are not visible to travellers yet. Pay it from the Subscription page.",actionLabel:"Got it"});const N=Number(E.fleet.charge||0);return P({icon:"🎉",title:`${a} is live in the app!`,lead:`Travellers can now see it. Your fleet plan covers every vehicle in the ${E.fleet.tierLabel} band.`,lines:[{label:"Fleet plan",value:c(E.fleet.tierLabel)},{label:"Vehicles covered",value:String(E.fleet.vehicleCount??I())},{label:"Paid now",value:N>0?y(N)+(E.fleet.upgraded?" (upgrade)":""):"Nothing — already covered"},{label:"Covered until",value:B(E.fleet.expiresAt)}]})}catch(w){alert("❌ "+w.message)}finally{b.disabled=!1,b.textContent=k}}window.editVehicle=function(e){const t=l.vehicles.find(a=>a.id===e);t&&Ye(t)};function _e(e){const t=new Date(`${e}T00:00:00`);if(Number.isNaN(t.getTime()))return 0;const a=Date.UTC(t.getFullYear(),t.getMonth(),t.getDate()),n=new Date,o=Date.UTC(n.getFullYear(),n.getMonth(),n.getDate());return Math.max(1,Math.round((o-a)/864e5)+1)}window.holdVehicle=async function(e){const t=l.vehicles.find(n=>n.id===e);if(!t)return;const a=prompt(`Hold "${t.name}" off the app?

It stays in your fleet but travellers stop seeing it, and it cannot be given a trip. Every day it is held is added back to your fleet plan when you resume it.

Why is it off the road? (optional)`,"Workshop / maintenance");if(a!==null)try{const n=await fetch(`${v}/vehicles/${e}/hold`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({operatorName:t.operatorName,reason:a})}),o=await n.json().catch(()=>null);if(!n.ok)throw new Error((o==null?void 0:o.error)||"Could not hold this vehicle");await D(),await P({icon:"⏸️",title:`${t.name} is on hold`,lead:"Travellers can no longer see it. Resume it when it is back on the road and the days it sat out will be added to your fleet plan."})}catch(n){alert("❌ "+n.message)}};window.resumeVehicle=async function(e){const t=l.vehicles.find(n=>n.id===e);if(!t)return;const a=_e(t.heldSince);if(confirm(`Put "${t.name}" back on the app?

It has been on hold for ${a} day${a===1?"":"s"}. Those days will be added to your fleet plan's expiry.`))try{const n=await fetch(`${v}/vehicles/${e}/resume`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({operatorName:t.operatorName})}),o=await n.json().catch(()=>null);if(!n.ok)throw new Error((o==null?void 0:o.error)||"Could not resume this vehicle");await D();const r=o.hold||{},i=r.creditedDays===r.days?`It was off the app for ${r.days} day${r.days===1?"":"s"}, and your fleet plan has been extended by the same.`:r.creditedDays>0?`It was off the app for ${r.days} days. ${r.creditedDays} were added to your plan — the rest overlapped another bus's hold and had already been credited.`:`It was off the app for ${r.days} day${r.days===1?"":"s"}, all of which overlapped another bus's hold and had already been added to your plan.`;await P({icon:"▶️",title:`${t.name} is back on the app`,lead:i,lines:r.fleetExpiresAt?[{label:"Fleet plan now runs until",value:B(r.fleetExpiresAt)}]:[]})}catch(n){alert("❌ "+n.message)}};window.deleteVehicle=async function(e){if(confirm("Delete this vehicle from your fleet?"))try{if(!(await fetch(`${v}/vehicles/${e}`,{method:"DELETE"})).ok)throw new Error("Failed");await D()}catch(t){alert("❌ "+t.message)}};window.updateBookingStatus=async function(e,t){try{if(!(await fetch(`${v}/bookings/${e}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:t})})).ok)throw new Error("Failed");await D()}catch(a){alert("❌ "+a.message)}};function c(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}
