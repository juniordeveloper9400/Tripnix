(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))n(o);new MutationObserver(o=>{for(const i of o)if(i.type==="childList")for(const r of i.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&n(r)}).observe(document,{childList:!0,subtree:!0});function a(o){const i={};return o.integrity&&(i.integrity=o.integrity),o.referrerPolicy&&(i.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?i.credentials="include":o.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function n(o){if(o.ep)return;o.ep=!0;const i=a(o);fetch(o.href,i)}})();const ge="tripnix-fleet-map-styles";let P=null;function ve(){var e;return(e=window.L)!=null&&e.map?Promise.resolve(window.L):P||(P=new Promise((t,a)=>{if(!document.getElementById("leaflet-css")){const o=document.createElement("link");o.id="leaflet-css",o.rel="stylesheet",o.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",document.head.appendChild(o)}const n=document.createElement("script");n.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",n.async=!0,n.onload=()=>{var o;return(o=window.L)!=null&&o.map?t(window.L):a(new Error("Leaflet loaded but unavailable"))},n.onerror=()=>a(new Error("Could not load the map library")),document.head.appendChild(n)}).catch(t=>{throw P=null,t}),P)}function te(e,t,a,n){return e.divIcon({className:"fmap-pin-wrap",iconSize:[40,52],iconAnchor:[20,46],popupAnchor:[0,-44],html:`
      <div class="fmap-pin${n?" is-sample":""}">
        <img src="${ne(a)}" alt="" width="34" height="43">
        <span>${S(t.vehicleNumber||t.vehicleName)}</span>
      </div>`})}async function Q(e,t,a,{noteEl:n,compact:o,sample:i}){let r;try{r=await ve()}catch(p){return console.warn("[fleet-map]",p.message),!1}let s=M.get(e);if(!s||!e.querySelector(".fmap-canvas")){e.innerHTML=`
      <div class="fmap fmap-live${o?" is-compact":""}">
        <div class="fmap-canvas"></div>
      </div>
      <div class="fmap-legend"></div>`;const p=r.map(e.querySelector(".fmap-canvas"),{zoomControl:!0,attributionControl:!0,scrollWheelZoom:!1});p.attributionControl.setPrefix(!1),p.on("click",()=>p.scrollWheelZoom.enable()),p.on("mouseout",()=>p.scrollWheelZoom.disable()),r.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",{maxZoom:19,attribution:"&copy; OpenStreetMap &copy; CARTO"}).addTo(p),s={map:p,markers:new Map,L:r},M.set(e,s)}const d=new Set,u=[];for(const p of a){const m=p.location,f=m.live?"#0ca30c":"#fab219";d.add(p.vehicleId),u.push([m.lat,m.lng]);const g=`
      <strong>${S(p.vehicleName)}</strong><br>
      ${S(p.vehicleNumber||"")} · ${m.live?"Live now":m.ageMinutes+" min ago"}<br>
      ${m.label?S(m.label)+"<br>":""}
      ${m.speedKph?Math.round(m.speedKph)+" km/h<br>":""}
      <small>${m.lat.toFixed(5)}, ${m.lng.toFixed(5)}</small>
      ${i?"<br><em>Sample position</em>":""}`;let h=s.markers.get(p.vehicleId);h?(h.setLatLng([m.lat,m.lng]),h.setIcon(te(s.L,p,f,i)),h.setPopupContent(g)):(h=s.L.marker([m.lat,m.lng],{icon:te(s.L,p,f,i)}).addTo(s.map).bindPopup(g),s.markers.set(p.vehicleId,h))}for(const[p,m]of s.markers)d.has(p)||(m.remove(),s.markers.delete(p));!s.framed&&u.length&&(u.length===1?s.map.setView(u[0],12):s.map.fitBounds(u,{padding:o?[30,30]:[55,55]}),s.framed=!0),setTimeout(()=>s.map.invalidateSize(),60);const b=t.total-a.length;return e.querySelector(".fmap-legend").innerHTML=i?`<span><i style="background:#fab219"></i>Sample data</span>
       <span class="fmap-note">Tap a bus for its detail</span>`:`<span><i style="background:#0ca30c"></i>Live</span>
       <span><i style="background:#fab219"></i>Last seen earlier</span>
       ${b?`<span><i style="background:#94a3b8"></i>${b} not reporting</span>`:""}
       <span class="fmap-note">Tap a bus for its detail</span>`,n&&(n.textContent=i?`Sample positions · ${a.length} bus${a.length===1?"":"es"} shown`:`${t.reporting} of ${t.total} reporting`),!0}function He(e){const t=(e==null?void 0:e.vehicles)||[];return t.filter(n=>n.location).length?{vehicles:t,sample:!1}:t.length?{vehicles:be(t),sample:!0}:{vehicles:t,sample:!1}}async function Ue(e,t,{sample:a=!1}={}){if(!e)return!1;we();const n=t==null?void 0:t.location;if(!n)return e.innerHTML='<div class="fmap-mini is-empty"><span>No position yet</span></div>',!1;let o;try{o=await ve()}catch{return e.innerHTML='<div class="fmap-mini is-empty"><span>Map unavailable</span></div>',!1}const i=M.get(e);if(i)return i.marker.setLatLng([n.lat,n.lng]),i.map.setView([n.lat,n.lng],i.map.getZoom()),setTimeout(()=>i.map.invalidateSize(),50),!0;e.innerHTML='<div class="fmap-mini"><div class="fmap-mini-canvas"></div></div>';const r=o.map(e.querySelector(".fmap-mini-canvas"),{zoomControl:!1,attributionControl:!1,dragging:!1,scrollWheelZoom:!1,doubleClickZoom:!1,boxZoom:!1,keyboard:!1,touchZoom:!1}).setView([n.lat,n.lng],11);o.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",{maxZoom:19}).addTo(r);const s=o.marker([n.lat,n.lng],{icon:te(o,t,n.live?"#0ca30c":"#fab219",a),interactive:!1}).addTo(r);return M.set(e,{map:r,marker:s}),setTimeout(()=>r.invalidateSize(),50),!0}let O=null;function je(e){var t;return(t=window.google)!=null&&t.maps?Promise.resolve(window.google.maps):O||(O=new Promise((a,n)=>{const o=document.createElement("script");o.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(e)}&loading=async&v=weekly`,o.async=!0,o.onload=()=>{var i;return(i=window.google)!=null&&i.maps?a(window.google.maps):n(new Error("Maps API loaded but unavailable"))},o.onerror=()=>n(new Error("Could not load Google Maps — check the API key and its referrer restrictions")),document.head.appendChild(o)}).catch(a=>{throw O=null,a}),O)}function ne(e){const t=`
    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="56" viewBox="0 0 44 56">
      <path d="M22,54 L13,38 h18 z" fill="${e}"/>
      <circle cx="22" cy="21" r="18" fill="${e}" stroke="#0b1220" stroke-width="2.5"/>
      <rect x="13" y="11" width="18" height="16" rx="3" fill="#ffffff"/>
      <rect x="15.2" y="13" width="13.6" height="6" rx="1.4" fill="${e}"/>
      <rect x="15.2" y="20.6" width="13.6" height="2" rx="0.9" fill="${e}" opacity="0.45"/>
      <circle cx="17" cy="28.4" r="2.3" fill="#0b1220"/>
      <circle cx="27" cy="28.4" r="2.3" fill="#0b1220"/>
    </svg>`;return"data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(t.trim())}const M=new WeakMap,Ve={lat:9.9312,lng:76.2673,zoom:9},fe=[{label:"Kochi",lat:9.9312,lng:76.2673},{label:"Munnar",lat:10.0889,lng:77.0595},{label:"Thrissur",lat:10.5276,lng:76.2144},{label:"Alappuzha",lat:9.4981,lng:76.3388},{label:"Kottayam",lat:9.5916,lng:76.5222},{label:"Palakkad",lat:10.7867,lng:76.6548},{label:"Kozhikode",lat:11.2588,lng:75.7804},{label:"Thekkady",lat:9.5939,lng:77.16},{label:"Kollam",lat:8.8932,lng:76.6141},{label:"Wayanad",lat:11.6854,lng:76.132}];function be(e){return e.map((t,a)=>{const n=fe[(Number(t.vehicleId)+a)%fe.length];return{...t,location:{lat:n.lat,lng:n.lng,label:n.label,live:a%3!==2,ageMinutes:a%3===2?40+a*7:0,speedKph:a%3===2?0:30+a*9,sample:!0}}})}function we(){if(document.getElementById(ge))return;const e=document.createElement("style");e.id=ge,e.textContent=`
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
  `,document.head.appendChild(e)}function S(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function Re(e,t,{noteEl:a,compact:n}){const{lat:o,lng:i,zoom:r}=Ve,s=`https://www.google.com/maps?q=${o},${i}&hl=en&z=${r}&output=embed`;a&&(a.textContent=t.total?"No bus has reported a position yet":""),e.innerHTML=`
    <div class="fmap fmap-live${n?" is-compact":""}">
      <iframe class="fmap-embed" src="${s}" title="Map, awaiting the first position"
              loading="lazy" allowfullscreen
              referrerpolicy="no-referrer-when-downgrade"></iframe>
      <div class="fmap-banner">
        <span>📡</span>
        <div>
          <strong>Waiting for the first position</strong>
          <span>${t.total?`${t.total} bus${t.total===1?"":"es"} on the books, none reporting yet — they appear here the moment a tracker posts a fix.`:"No buses in the fleet yet."}</span>
        </div>
      </div>
    </div>`}function z(e,t,a,{noteEl:n,compact:o,sample:i=!1}){const r=Number(e.dataset.fleetMapBus),s=a.find(m=>m.vehicleId===r)||a.find(m=>m.location.live)||a[0];e.dataset.fleetMapBus=String(s.vehicleId);const d=s.location,u=`https://www.google.com/maps?q=${d.lat},${d.lng}&hl=en&z=${o?13:14}&output=embed`,b=a.map(m=>{const f=m.vehicleId===s.vehicleId,g=m.location.live;return`
      <button type="button" class="fmap-chip${f?" is-on":""}"
              data-fleet-map-bus="${m.vehicleId}">
        <i style="background:${g?"#0ca30c":"#fab219"}"></i>
        ${S(m.vehicleNumber||m.vehicleName)}
        <span>${g?"live":m.location.ageMinutes+"m"}</span>
      </button>`}).join(""),p=t.total-a.length;e.innerHTML=`
    ${a.length>1?`<div class="fmap-chips">${b}</div>`:""}
    <div class="fmap fmap-live${o?" is-compact":""}">
      <iframe class="fmap-embed" src="${u}" title="Map of ${S(s.vehicleName)}"
              loading="lazy" allowfullscreen
              referrerpolicy="no-referrer-when-downgrade"></iframe>
      ${i?`
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
      ${i?'<span><i style="background:#fab219"></i>Sample data</span>':`<span><i style="background:#0ca30c"></i>Live</span>
           <span><i style="background:#fab219"></i>Last seen earlier</span>
           ${p?`<span><i style="background:#94a3b8"></i>${p} not reporting</span>`:""}`}
      <a class="fmap-open" target="_blank" rel="noopener"
         href="https://www.google.com/maps/search/?api=1&query=${d.lat},${d.lng}">
        Open in Google Maps ↗</a>
    </div>`,e.querySelectorAll("[data-fleet-map-bus]").forEach(m=>m.addEventListener("click",()=>{e.dataset.fleetMapBus=m.dataset.fleetMapBus,z(e,t,a,{noteEl:n,compact:o,sample:i})})),n&&(n.textContent=i?`Sample positions · showing ${s.vehicleNumber||s.vehicleName} near ${d.label}`:`${t.reporting} of ${t.total} reporting · showing ${s.vehicleNumber||s.vehicleName}${d.label?" near "+d.label:""}`)}async function ze(e,t,a,{noteEl:n,compact:o,apiKey:i}){let r;try{r=await je(i)}catch(f){return console.warn("[fleet-map]",f.message),!1}let s=M.get(e);if(!s){e.innerHTML=`<div class="fmap fmap-live${o?" is-compact":""}"><div class="fmap-canvas"></div></div>`;const f=e.querySelector(".fmap-canvas");s={map:new r.Map(f,{center:{lat:a[0].location.lat,lng:a[0].location.lng},zoom:12,mapTypeControl:!o,streetViewControl:!1,fullscreenControl:!o,zoomControl:!0,backgroundColor:"#eef1f5",gestureHandling:"cooperative"}),markers:new Map,info:new r.InfoWindow},M.set(e,s)}const d=new Set,u=new r.LatLngBounds;for(const f of a){const g=f.location,h=g.live?"#0ca30c":"#fab219",L={lat:g.lat,lng:g.lng};u.extend(L),d.add(f.vehicleId);const E=f.vehicleNumber||f.vehicleName,C=`${g.live?"Live now":g.ageMinutes+" min ago"}${g.label?" · "+S(g.label):""}${g.speedKph?" · "+Math.round(g.speedKph)+" km/h":""}`;let k=s.markers.get(f.vehicleId);k?(k.setPosition(L),k.setIcon({url:ne(h),scaledSize:new r.Size(34,43),anchor:new r.Point(17,43)})):(k=new r.Marker({map:s.map,position:L,title:`${f.vehicleName} · ${C.replace(/<[^>]*>/g,"")}`,icon:{url:ne(h),scaledSize:new r.Size(34,43),anchor:new r.Point(17,43)},zIndex:g.live?2:1}),s.markers.set(f.vehicleId,k)),k.addListener("click",()=>{s.info.setContent(`<div style="font-family:system-ui;color:#0b1220;min-width:150px">
           <strong style="font-size:13px">${S(f.vehicleName)}</strong><br>
           <span style="font-size:11px;color:#475569">${S(E)} · ${C}</span><br>
           <span style="font-size:10.5px;color:#64748b">${g.lat.toFixed(5)}, ${g.lng.toFixed(5)}</span>
         </div>`),s.info.open({map:s.map,anchor:k})})}for(const[f,g]of s.markers)d.has(f)||(g.setMap(null),s.markers.delete(f));s.framed||(a.length===1?(s.map.setCenter(u.getCenter()),s.map.setZoom(13)):s.map.fitBounds(u,o?24:48),s.framed=!0),n&&(n.textContent=`${t.reporting} of ${t.total} reporting · live map`);const b=t.total-a.length,p=e.querySelector(".fmap-legend"),m=`
    <span><i style="background:#0ca30c"></i>Live</span>
    <span><i style="background:#fab219"></i>Last seen earlier</span>
    ${b?`<span><i style="background:#94a3b8"></i>${b} not reporting</span>`:""}
    <span class="fmap-note">Tap a bus for its detail</span>`;return p?p.innerHTML=m:e.insertAdjacentHTML("beforeend",`<div class="fmap-legend">${m}</div>`),!0}function qe(e,t,{noteEl:a=null,compact:n=!1,apiKey:o=""}={}){if(!e)return;we();const i=((t==null?void 0:t.vehicles)||[]).filter(r=>r.location);if(!i.length){M.delete(e);const r=(t==null?void 0:t.vehicles)||[];if(!r.length){delete e.dataset.fleetMapBus,Re(e,t,{noteEl:a,compact:n});return}const s=be(r),d={...t,reporting:0,total:r.length};Q(e,d,s,{noteEl:a,compact:n,sample:!0}).then(u=>{u||z(e,d,s,{noteEl:a,compact:n,sample:!0})});return}if(o){ze(e,t,i,{noteEl:a,compact:n,apiKey:o}).then(r=>{if(!r)return Q(e,t,i,{noteEl:a,compact:n,sample:!1}).then(s=>{s||z(e,t,i,{noteEl:a,compact:n})})});return}Q(e,t,i,{noteEl:a,compact:n,sample:!1}).then(r=>{r||z(e,t,i,{noteEl:a,compact:n})})}const v=window.location.origin.includes("3005")?"http://localhost:3000/api":window.location.origin+"/api";let l={currentUser:JSON.parse(sessionStorage.getItem("tripnix_user")||"null"),vehicles:[],bookings:[],admins:[],plans:null,subscription:null,accounts:null,accountCategories:null,tracking:null,agencySubs:[],trips:[],activeTab:"dashboard",fleetFilter:"All",searchQuery:"",editingVehicleId:null,vehicleFormImages:[],vehicleFormVideos:[],diaryVehicleId:null,diary:null};const $e=document.getElementById("login-screen"),Ee=document.getElementById("app-layout"),xe=document.getElementById("login-form"),X=document.getElementById("login-error"),Ye=document.getElementById("logout-btn"),Ie=document.querySelectorAll(".nav-item"),We=document.querySelectorAll(".tab-page"),ye=document.getElementById("nav-admins"),Ge=document.getElementById("page-title"),Ke=document.getElementById("page-subtitle"),he=document.getElementById("pending-badge"),_e=document.getElementById("refresh-btn"),ae=document.getElementById("add-vehicle-header-btn"),Be=document.getElementById("vehicle-modal"),Je=document.getElementById("modal-title"),Ze=document.getElementById("modal-close-btn"),Qe=document.getElementById("modal-cancel-btn"),ke=document.getElementById("vehicle-form"),oe=document.getElementById("create-admin-form");document.addEventListener("DOMContentLoaded",()=>{it(),pt(),Xe(),et()});function Xe(){const e=document.getElementById("register-link");e&&(e.href=window.location.origin.includes("3005")?"http://localhost:3000/":window.location.origin+"/")}function et(){l.currentUser?Ce():Le()}function Le(){$e.classList.remove("hidden"),Ee.classList.add("hidden")}function Ce(){$e.classList.add("hidden"),Ee.classList.remove("hidden"),tt(),D()}function tt(){const e=l.currentUser;if(!e)return;const t=e.operatorName||"Travel Agency",a=e.username||"admin",n=t.charAt(0).toUpperCase(),o=document.getElementById("agency-identity-block");o&&o.classList.remove("hidden"),document.getElementById("agency-avatar-letter").textContent=n,document.getElementById("agency-name-display").textContent=t,document.getElementById("agency-username-display").textContent="@"+a;const i=document.getElementById("profile-logout-row");i&&i.classList.remove("hidden"),document.getElementById("profile-mini-avatar").textContent=n,document.getElementById("profile-mini-name").textContent=t,document.getElementById("profile-mini-username").textContent="@"+a;const r=document.getElementById("hero-agency-name");r&&(r.textContent=t),e.role==="superadmin"?ye.classList.remove("hidden"):(ye.classList.add("hidden"),l.activeTab==="admins"&&se("dashboard"))}async function nt(e){e.preventDefault(),X.classList.add("hidden");const t=document.getElementById("login-username").value.trim(),a=document.getElementById("login-password").value.trim(),n=document.getElementById("login-submit-btn");n.textContent="Signing in…",n.disabled=!0;try{const o=await fetch(`${v}/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:t,password:a})});let i=null;try{i=await o.json()}catch{i=null}if(!o.ok)throw new Error((i==null?void 0:i.error)||"Invalid username or password");if(!i)throw new Error("Invalid response from backend server");l.currentUser=i,sessionStorage.setItem("tripnix_user",JSON.stringify(i)),xe.reset(),Ce()}catch(o){X.textContent="⚠️ "+o.message,X.classList.remove("hidden")}finally{n.textContent="Sign In",n.disabled=!1}}function at(){l.currentUser=null,l.vehicles=[],l.bookings=[],l.admins=[],sessionStorage.removeItem("tripnix_user");const e=document.getElementById("agency-identity-block"),t=document.getElementById("profile-logout-row");e&&e.classList.add("hidden"),t&&t.classList.add("hidden"),document.getElementById("agency-avatar-letter").textContent="",document.getElementById("agency-name-display").textContent="",document.getElementById("agency-username-display").textContent="",document.getElementById("profile-mini-avatar").textContent="",document.getElementById("profile-mini-name").textContent="",document.getElementById("profile-mini-username").textContent="",Le()}function ot(){const e=document.getElementById("sidebar"),t=document.getElementById("sidebar-overlay");if(!e||!t)return;e.classList.contains("active")?Y():rt()}function rt(){const e=document.getElementById("sidebar"),t=document.getElementById("sidebar-overlay");e&&e.classList.add("active"),t&&t.classList.add("active")}function Y(){const e=document.getElementById("sidebar"),t=document.getElementById("sidebar-overlay");e&&e.classList.remove("active"),t&&t.classList.remove("active")}function it(){Ie.forEach(e=>{e.addEventListener("click",()=>{se(e.getAttribute("data-tab"))})})}function se(e){l.activeTab=e,Y(),Ie.forEach(a=>{a.classList.toggle("active",a.getAttribute("data-tab")===e)}),We.forEach(a=>{a.classList.toggle("active",a.id===`tab-${e}`)});const t={dashboard:["Dashboard Overview","Real-time bus schedules and fleet operations"],fleet:["Fleet Management","Add buses, edit details, and post available dates"],bookings:["Customer Bookings","Review and manage booking requests"],trips:["Trips","Post trips that appear in the traveller app story bar"],schedule:["Bus Diary","The running schedule for each bus in your fleet"],accounts:["Accounts","What the diary earned, against what you have paid Tripnix"],gps:["GPS Tracking","Where every bus last reported from"],subscription:["Subscription & Plans","Platform membership and the fleet plan"],admins:["Manage Travel Owners","Create and manage Travel Owner login credentials"]};t[e]&&(Ge.textContent=t[e][0],Ke.textContent=t[e][1]),e==="admins"&&J(),e==="subscription"&&_(),e==="trips"&&K(),e==="schedule"&&le(),e==="accounts"&&G(),e==="gps"&&ct()}async function G(e){var a;const t=(a=l.currentUser)==null?void 0:a.operatorName;if(t)try{const n=e?`&month=${encodeURIComponent(e)}`:"",o=await fetch(`${v}/accounts?operatorName=${encodeURIComponent(t)}${n}`);if(!o.ok)throw new Error("Could not load accounts");if(l.accounts=await o.json(),!l.accountCategories){const i=await fetch(`${v}/accounts/categories`);i.ok&&(l.accountCategories=await i.json())}dt()}catch(n){document.getElementById("acc-breakdown").innerHTML=`<p class="diary-empty">❌ ${c(n.message)}</p>`}}function st(){var e;if(!l.vehicles.length)return alert("❌ Add a bus to your fleet first.");document.getElementById("acc-entry-date").value=new Date().toISOString().slice(0,10),document.getElementById("acc-entry-amount").value="",document.getElementById("acc-entry-note").value="",Te(((e=document.querySelector('input[name="acc-kind"]:checked'))==null?void 0:e.value)||"income"),document.getElementById("acc-entry-modal").classList.remove("hidden"),document.getElementById("acc-entry-amount").focus()}function re(){document.getElementById("acc-entry-modal").classList.add("hidden"),document.getElementById("acc-entry-form").reset()}function Te(e){var n,o;const t=((o=(n=l.accountCategories)==null?void 0:n.categories)==null?void 0:o[e])||[];document.getElementById("acc-entry-category").innerHTML=t.map(i=>`<option>${c(i)}</option>`).join("");const a=l.vehicles.map(i=>`<option value="${i.id}">${c(i.name)} · ${c(i.vehicleNumber||"—")}</option>`);document.getElementById("acc-entry-vehicle").innerHTML=e==="capital"?a.join(""):'<option value="">Whole agency</option>'+a.join(""),document.getElementById("acc-entry-vehicle-req").textContent=e==="capital"?"*":"",document.getElementById("acc-entry-hint").textContent=e==="capital"?"What the bus cost to buy. Recorded once, not as a monthly expense — it is the sum the bus has to earn back.":e==="income"?"Money in that is not already a diary order — a private contract, a rental, anything else.":"Money out: fuel, driver wages, servicing, insurance, an EMI. Leave the bus blank for costs that cover the whole agency."}async function lt(e){e.preventDefault();const t=document.getElementById("acc-entry-save"),a=t.textContent;t.disabled=!0,t.textContent="Saving…";try{const n=await fetch(`${v}/accounts/entries`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({operatorName:l.currentUser.operatorName,kind:document.querySelector('input[name="acc-kind"]:checked').value,vehicleId:document.getElementById("acc-entry-vehicle").value||null,amount:document.getElementById("acc-entry-amount").value,date:document.getElementById("acc-entry-date").value,category:document.getElementById("acc-entry-category").value,note:document.getElementById("acc-entry-note").value.trim()})}),o=await n.json().catch(()=>null);if(!n.ok)throw new Error((o==null?void 0:o.error)||"Could not save this entry");re(),await G(String(o.date).slice(0,7))}catch(n){alert("❌ "+n.message)}finally{t.disabled=!1,t.textContent=a}}window.removeAccEntry=async function(e){var t;if(confirm("Remove this entry from the books?"))try{if(!(await fetch(`${v}/accounts/entries/${e}?operatorName=${encodeURIComponent(l.currentUser.operatorName)}`,{method:"DELETE"})).ok)throw new Error("Could not remove this entry");await G((t=l.accounts)==null?void 0:t.month)}catch(a){alert("❌ "+a.message)}};function dt(){const e=l.accounts;if(!e)return;const t=document.getElementById("acc-month");t&&document.activeElement!==t&&(t.innerHTML=e.availableMonths.length?e.availableMonths.map(n=>`<option value="${n.value}" ${n.value===e.month?"selected":""}>${c(n.label)}</option>`).join(""):`<option>${c(e.monthLabel)}</option>`),document.getElementById("acc-stats").innerHTML=`
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
              ${I(n.date)}${n.detail?" · "+c(n.detail):""}
            </div>
          </div>
          <div class="diary-row-status">
            <strong style="color:${n.sign==="−"?"var(--accent-red)":"inherit"};">${n.sign}${y(n.amount)}</strong>
            ${n.source==="diary"?"":`<div class="diary-row-actions">
                   <button class="btn btn-secondary btn-sm" style="color:var(--accent-red);"
                           onclick="removeAccEntry(${n.id})">🗑️</button>
                 </div>`}
          </div>
        </div>`).join(""):'<p class="diary-empty">Nothing recorded for this month yet. Use ➕ Add entry to record fuel, wages, servicing or extra income.</p>'}async function ct(){var t;const e=(t=l.currentUser)==null?void 0:t.operatorName;if(e)try{if(l.mapsApiKey===void 0){const n=await fetch(`${v}/tracking/config`).catch(()=>null),o=n!=null&&n.ok?await n.json():null;l.mapsApiKey=(o==null?void 0:o.mapsApiKey)||""}const a=await fetch(`${v}/tracking?operatorName=${encodeURIComponent(e)}`);if(!a.ok)throw new Error("Could not load tracking");l.tracking=await a.json(),mt()}catch(a){document.getElementById("gps-list").innerHTML=`<p class="diary-empty">❌ ${c(a.message)}</p>`}}function mt(){const e=l.tracking;if(!e)return;const{vehicles:t,sample:a}=He(e);qe(document.getElementById("gps-map"),e,{noteEl:document.getElementById("gps-map-note"),apiKey:l.mapsApiKey}),document.getElementById("gps-note").textContent=a?`Sample positions · live for ${e.staleAfterMinutes} minutes after the last fix`:`${e.reporting} of ${e.total} reporting · live for ${e.staleAfterMinutes} minutes after the last fix`,document.getElementById("gps-list").innerHTML=t.length?t.map(n=>{const o=n.location,i=a?'<span class="badge-status cancelled">SAMPLE</span>':o?o.live?'<span class="badge-status confirmed">LIVE</span>':`<span class="badge-status cancelled">${o.ageMinutes} MIN AGO</span>`:'<span class="badge-status pending">NO SIGNAL</span>',r=o?`${o.label?c(o.label)+" · ":""}${o.lat.toFixed(5)}, ${o.lng.toFixed(5)}${o.speedKph?" · "+Math.round(o.speedKph)+" km/h":""}`:"This bus has never reported a position",s=o?` · <a href="https://www.google.com/maps?q=${o.lat},${o.lng}" target="_blank" rel="noopener">Open map ↗</a>`:"";return`
          <div class="diary-row gps-row">
            <div class="diary-row-main">
              <strong>${c(n.vehicleName)}</strong>
              <code class="vehicle-number">${c(n.vehicleNumber||"—")}</code>
              <div class="diary-row-who">${r}${s}</div>
              <div class="diary-row-status">${i}</div>
            </div>
            <div class="row-map" data-bus-map="${n.vehicleId}"></div>
          </div>`}).join(""):'<p class="diary-empty">No buses in the fleet yet.</p>';for(const n of t)Ue(document.querySelector(`[data-bus-map="${n.vehicleId}"]`),n,{sample:a})}function pt(){var e,t,a,n,o,i,r,s,d,u,b,p,m,f,g,h,L,E,C,k,B,F,pe,ue;xe.addEventListener("submit",nt),Ye.addEventListener("click",at),(e=document.getElementById("sidebar-toggle-btn"))==null||e.addEventListener("click",ot),(t=document.getElementById("sidebar-overlay"))==null||t.addEventListener("click",Y),(a=document.getElementById("sidebar-close-btn"))==null||a.addEventListener("click",Y),_e.addEventListener("click",D),ae.addEventListener("click",()=>{if(l.subscription&&!me()){alert(`🔒 Your agency is not registered yet.

The yearly platform fee is paid on the Tripnix site. See the Subscription page for the link.`),se("subscription");return}Pe()}),Ze.addEventListener("click",W),Qe.addEventListener("click",W),(n=document.getElementById("diary-add-btn"))==null||n.addEventListener("click",()=>de()),(o=document.getElementById("diary-modal-close"))==null||o.addEventListener("click",ie),(i=document.getElementById("diary-modal-cancel"))==null||i.addEventListener("click",ie),(r=document.getElementById("diary-form"))==null||r.addEventListener("submit",$t),(s=document.getElementById("acc-month"))==null||s.addEventListener("change",$=>G($.target.value)),(d=document.getElementById("acc-add-btn"))==null||d.addEventListener("click",st),(u=document.getElementById("acc-entry-close"))==null||u.addEventListener("click",re),(b=document.getElementById("acc-entry-cancel"))==null||b.addEventListener("click",re),(p=document.getElementById("acc-entry-form"))==null||p.addEventListener("submit",lt),document.querySelectorAll('input[name="acc-kind"]').forEach($=>$.addEventListener("change",N=>Te(N.target.value))),(m=document.getElementById("diary-from"))==null||m.addEventListener("change",$=>{const N=document.getElementById("diary-to");N&&(!N.value||N.value<$.target.value)&&(N.value=$.target.value)}),document.querySelectorAll(".filter-chips .chip[data-filter]").forEach($=>{$.addEventListener("click",()=>{document.querySelectorAll(".filter-chips .chip[data-filter]").forEach(N=>N.classList.remove("active")),$.classList.add("active"),l.fleetFilter=$.getAttribute("data-filter"),l.seatFilter="All",renderFleetSeatFilterChips(),H()})}),document.getElementById("fleet-search").addEventListener("input",$=>{l.searchQuery=$.target.value,H()}),(f=document.getElementById("vehicle-number"))==null||f.addEventListener("input",$=>{$.target.value=$.target.value.toUpperCase()}),ke.addEventListener("submit",Vt),(g=document.getElementById("upload-images-btn"))==null||g.addEventListener("click",()=>{var $;($=document.getElementById("vehicle-images-input"))==null||$.click()}),(h=document.getElementById("upload-videos-btn"))==null||h.addEventListener("click",()=>{var $;($=document.getElementById("vehicle-videos-input"))==null||$.click()}),(L=document.getElementById("vehicle-images-input"))==null||L.addEventListener("change",ft),(E=document.getElementById("vehicle-videos-input"))==null||E.addEventListener("change",yt),(C=document.getElementById("vehicle-type"))==null||C.addEventListener("change",U),(k=document.getElementById("vehicle-capacity"))==null||k.addEventListener("input",U),oe&&oe.addEventListener("submit",At),(B=document.getElementById("pricing-form"))==null||B.addEventListener("submit",Mt),(F=document.getElementById("trip-form"))==null||F.addEventListener("submit",Bt),(pe=document.getElementById("trip-image-btn"))==null||pe.addEventListener("click",()=>{var $;($=document.getElementById("trip-image-input"))==null||$.click()}),(ue=document.getElementById("trip-image-input"))==null||ue.addEventListener("change",Et),ut()}function ut(){const e=document.getElementById("vehicle-type-dropdown"),t=document.getElementById("vehicle-type-trigger"),a=document.getElementById("vehicle-type-menu"),n=document.getElementById("vehicle-type"),o=document.getElementById("selected-type-icon"),i=document.getElementById("selected-type-text"),r=a==null?void 0:a.querySelectorAll(".custom-dropdown-item");if(!t||!a||!n)return;const s={Bus:"🚌",Traveller:"🚐",Car:"🚗"},d={Bus:[{label:"12 Seats",value:12},{label:"22 Seats",value:22},{label:"36 Seats",value:36},{label:"49 Seats",value:49},{label:"Above 49 Seats",value:50,isAbove:!0}],Traveller:[{label:"12 Seats",value:12},{label:"14 Seats",value:14},{label:"16 Seats",value:16},{label:"18 Seats",value:18}],Car:[{label:"4 Seats",value:4},{label:"7 Seats",value:7},{label:"8 Seats",value:8}]};function u(p){var E;const m=document.getElementById("vehicle-seat-options"),f=document.getElementById("vehicle-capacity");if(!m||!f)return;const g=p||((E=document.getElementById("vehicle-type"))==null?void 0:E.value)||"Bus",h=d[g]||d.Bus,L=Number(f.value)||0;m.innerHTML=h.map(C=>`
      <button type="button" class="seat-option-pill${(C.isAbove?L>49:L===C.value)?" active":""}"
              onclick="selectVehicleSeatPill(${C.value}, ${C.isAbove?"true":"false"})">
        ${c(C.label)}
      </button>`).join("")}window.selectVehicleSeatPill=function(p,m){const f=document.getElementById("vehicle-capacity");f&&(f.value=p,u(),U())};function b(){const p=document.getElementById("seat-filter-chips");if(!p)return;const m=l.fleetFilter,f=d[m];if(!f||!f.length){p.innerHTML="",l.seatFilter="All";return}p.innerHTML=`
    <button type="button" class="chip${l.seatFilter==="All"?" active":""}" onclick="setFleetSeatFilter('All')">All Seats</button>
    ${f.map(g=>{const h=g.isAbove?"above49":String(g.value);return`
        <button type="button" class="chip${l.seatFilter===h?" active":""}" onclick="setFleetSeatFilter('${h}')">
          ${c(g.label)}
        </button>`}).join("")}
  `}window.setFleetSeatFilter=function(p){l.seatFilter=p,b(),H()},window.syncCustomTypeDropdown=function(p){const m=p||n.value||"Bus";n.value=m,o&&(o.textContent=s[m]||"🚌"),i&&(i.textContent=m),r==null||r.forEach(f=>{f.classList.toggle("selected",f.dataset.value===m)}),u(m),U()},t.addEventListener("click",p=>{p.stopPropagation(),e.classList.contains("open")?ee():gt()}),r==null||r.forEach(p=>{p.addEventListener("click",m=>{m.stopPropagation();const f=p.dataset.value;window.syncCustomTypeDropdown(f),ee()})}),document.addEventListener("click",p=>{e&&!e.contains(p.target)&&ee()})}function gt(){const e=document.getElementById("vehicle-type-dropdown"),t=document.getElementById("vehicle-type-menu");e==null||e.classList.add("open"),t==null||t.classList.remove("hidden")}function ee(){const e=document.getElementById("vehicle-type-dropdown"),t=document.getElementById("vehicle-type-menu");e==null||e.classList.remove("open"),t==null||t.classList.add("hidden")}async function Se(e,t){let a;try{a=await(await fetch(`${v}/uploads/config`)).json()}catch{throw new Error(`Could not reach the API at ${v}. Is the backend server running?`)}if(!a.configured)throw new Error("R2 storage is not configured on the server yet.");const n=a.maxDirectUploadBytes||4194304;if(e.size<=n){const s=new FormData;s.append("files",e);let d;try{d=await fetch(`${v}/uploads?folder=${encodeURIComponent(t)}`,{method:"POST",body:s})}catch{throw new Error(`Upload of "${e.name}" (${q(e.size)}) was cut off before it finished. Check that the backend is still running, then try again.`)}const u=await d.json().catch(()=>null);if(!d.ok)throw new Error((u==null?void 0:u.error)||`Upload failed (${d.status})`);return u.urls[0]}const o=await fetch(`${v}/uploads/presign`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fileName:e.name,contentType:e.type,folder:t})}),i=await o.json().catch(()=>null);if(!o.ok)throw new Error((i==null?void 0:i.error)||"Could not presign upload");let r;try{r=await fetch(i.uploadUrl,{method:"PUT",headers:{"Content-Type":e.type},body:e})}catch{throw new Error(`"${e.name}" is ${q(e.size)}, above this server's ${q(n)} direct-upload limit, so the browser must send it to Cloudflare R2 itself — and R2 refused the connection.

Add ${window.location.origin} to the bucket's CORS policy in the Cloudflare dashboard (R2 → tripnix → Settings → CORS), or upload a smaller file.`)}if(!r.ok)throw new Error(`Direct upload to R2 failed (${r.status}).`);return i.url}function q(e){return Number.isFinite(e)?e>=1048576?`${(e/1048576).toFixed(1)} MB`:`${Math.max(1,Math.round(e/1024))} KB`:"—"}async function De(e,t,a){const n=Array.from(e.target.files||[]);if(!n.length)return;const o=document.getElementById("media-upload-status"),i=r=>{o&&(o.textContent=r)};try{for(let r=0;r<n.length;r++){const s=n[r];i(`Uploading ${r+1} of ${n.length} — ${s.name} (${q(s.size)})…`);const d=await Se(s,t);l[a].push(d),j()}i("")}catch(r){i(""),alert("❌ "+r.message)}finally{e.target.value=""}}function ft(e){return De(e,"vehicles/images","vehicleFormImages")}function yt(e){return De(e,"vehicles/videos","vehicleFormVideos")}function j(){const e=document.getElementById("images-preview-grid"),t=document.getElementById("videos-preview-grid");e&&(e.innerHTML=l.vehicleFormImages.map((a,n)=>`
      <div class="media-preview-item">
        <img src="${c(a)}" alt="Vehicle image ${n+1}" />
        <button type="button" class="media-preview-remove" onclick="removeFormImage(${n})" title="Remove image">&times;</button>
      </div>
    `).join("")),t&&(t.innerHTML=l.vehicleFormVideos.map((a,n)=>`
      <div class="media-preview-item">
        <video src="${c(a)}" muted preload="metadata"></video>
        <button type="button" class="media-preview-remove" onclick="removeFormVideo(${n})" title="Remove video">&times;</button>
      </div>
    `).join(""))}window.removeFormImage=function(e){l.vehicleFormImages.splice(e,1),j()};window.removeFormVideo=function(e){l.vehicleFormVideos.splice(e,1),j()};async function D(){var e;try{const[t,a]=await Promise.all([fetch(`${v}/vehicles`),fetch(`${v}/bookings`)]);if(!t.ok||!a.ok)throw new Error("API error");const n=await t.json(),o=await a.json();if(l.currentUser&&l.currentUser.role!=="superadmin"){const i=l.currentUser.operatorName.toLowerCase();l.vehicles=n.filter(r=>r.operatorName.toLowerCase()===i),l.bookings=o.filter(r=>r.operatorName&&r.operatorName.toLowerCase()===i)}else l.vehicles=n,l.bookings=o;Pt(),H(),Ot(),await _(),await K(),((e=l.currentUser)==null?void 0:e.role)==="superadmin"&&await J()}catch(t){console.error("Load error:",t),alert("Cannot connect to backend (http://localhost:3000). Please start the backend first.")}}async function le(){var t,a,n;await D();const e=document.getElementById("diary-list");e&&(e.innerHTML='<p class="diary-empty">Loading agency diary…</p>');try{const o=((t=l.currentUser)==null?void 0:t.operatorName)||"",i=await fetch(`${v}/trips/agency-diary?operatorName=${encodeURIComponent(o)}`);if(!i.ok)throw new Error("Could not load agency diary");l.agencyDiaryData=await i.json();const r=((a=l.agencyDiaryData)==null?void 0:a.entries)||[],s=new Set;r.forEach(d=>{if(d.status==="Completed"||!d.departureDate||!d.arrivalDate)return;let u=new Date(`${d.departureDate}T00:00:00`);const b=new Date(`${d.arrivalDate}T00:00:00`);for(;u<=b;)s.add(u.toISOString().slice(0,10)),u.setDate(u.getDate()+1)}),l.diary={entries:r,latestTrip:((n=l.agencyDiaryData)==null?void 0:n.latestTrip)||null,bookedDates:Array.from(s)}}catch(o){l.diary=null,e&&(e.innerHTML=`<p class="diary-empty">❌ ${c(o.message)}</p>`);return}ht()}function ht(){vt(),bt(),wt()}function vt(){var n;const e=document.getElementById("latest-diary-trip-container");if(!e)return;const t=(n=l.diary)==null?void 0:n.latestTrip;if(!t){e.innerHTML=`
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
            <strong>${I(t.departureDate)} → ${I(t.arrivalDate)}</strong>
            <small>(${t.durationDays} day${t.durationDays===1?"":"s"})</small>
          </div>
          <div class="latest-diary-fare">
            <span class="meta-label">AGREED FARE</span>
            <strong class="fare-amount">${y(t.fare)}</strong>
          </div>
        </div>
      </div>
    </div>`}function bt(){const e=document.getElementById("diary-list"),t=document.getElementById("diary-summary");if(!e)return;const a=l.diary;if(!a){e.innerHTML="",t&&(t.innerHTML="");return}const n=a.entries.filter(r=>r.status!=="Completed"),o=a.entries.filter(r=>r.kind==="diary"),i=o.reduce((r,s)=>r+Number(s.fare||0),0);if(t&&(t.innerHTML=`
      <div class="diary-stat"><strong>${n.length}</strong><span>Active / Scheduled</span></div>
      <div class="diary-stat"><strong>${a.bookedDates.length}</strong><span>Days Booked</span></div>
      <div class="diary-stat"><strong>${o.length}</strong><span>Diary Orders</span></div>
      <div class="diary-stat"><strong>${y(i)}</strong><span>Total Fares</span></div>`),!a.entries.length){e.innerHTML='<p class="diary-empty">No orders in your agency diary yet. Use ➕ Add Entry to write an order, or tap a date on the calendar.</p>';return}e.innerHTML=a.entries.map(r=>{const s=r.status==="On Trip"?"confirmed":r.status==="Completed"?"cancelled":"pending",d=r.kind==="diary",u=r.customerPhone?` · <a href="tel:${c(r.customerPhone)}">${c(r.customerPhone)}</a>`:"";let b="";d||r.kind==="booking"?b=`<div class="diary-row-who">👤 ${c(r.customerName||"Customer")}${u}${r.fare?` · <strong>${y(r.fare)}</strong>`:""}</div>`:r.note&&(b=`<div class="diary-row-who">${c(r.note)}</div>`),d&&r.note&&(b+=`<div class="diary-row-who" style="color:var(--text-muted);">📝 ${c(r.note)}</div>`);const p=d?"📕 "+c(r.place||"Agency Order"):r.kind==="booking"?"📑 Customer booking":"🗺️ "+c(r.place||"Trip"),m=d?`<div class="diary-row-actions">
           <button class="btn btn-secondary btn-sm" onclick="editDiaryEntry(${r.id})">✏️ Edit</button>
           <button class="btn btn-secondary btn-sm" style="color:var(--accent-red);" onclick="deleteDiaryEntry(${r.id})">🗑️ Delete</button>
         </div>`:"";return`
      <div class="diary-row">
        <div class="diary-row-dates">
          <strong>${I(r.departureDate)}</strong>
          <span>→ ${I(r.arrivalDate)}</span>
          <small>${r.durationDays} day${r.durationDays===1?"":"s"}</small>
        </div>
        <div class="diary-row-main">
          <div class="diary-row-place">${p}</div>
          ${b}
        </div>
        <div class="diary-row-status">
          <span class="badge-status ${s}">${c(r.status)}</span>
          ${m}
        </div>
      </div>`}).join("")}function wt(){const e=document.getElementById("diary-calendar");if(!e)return;const t=l.diary;if(!t){e.innerHTML="";return}const a=new Set(t.bookedDates),n=new Date,o=[0,1].map(i=>new Date(n.getFullYear(),n.getMonth()+i,1));e.innerHTML=o.map(i=>{const r=i.toLocaleDateString(void 0,{month:"long",year:"numeric"}),s=new Date(i.getFullYear(),i.getMonth()+1,0).getDate(),d=(i.getDay()+6)%7,u=p=>(t.entries||[]).filter(m=>m.status!=="Completed"&&p>=m.departureDate&&p<=m.arrivalDate).map(m=>`${m.customerName||"Booked"}${m.place?" — "+m.place:""}`).join(" | "),b=[];for(let p=0;p<d;p++)b.push('<span class="diary-day is-blank"></span>');for(let p=1;p<=s;p++){const m=`${i.getFullYear()}-${String(i.getMonth()+1).padStart(2,"0")}-${String(p).padStart(2,"0")}`,f=a.has(m),g=f?`${m} — ${u(m)}`:`${m} — free, tap to write an order`;b.push(`<span class="diary-day${f?" is-booked":""}" title="${c(g)}"${f?"":` role="button" onclick="openDiaryModalForDate('${m}')"`}>${p}</span>`)}return`
      <div class="diary-month">
        <div class="diary-month-label">${c(r)}</div>
        <div class="diary-weekdays"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
        <div class="diary-grid">${b.join("")}</div>
      </div>`}).join("")}function de(e=null,t=null){const a=document.getElementById("diary-modal");if(!a)return;document.getElementById("diary-modal-title").textContent=e?"Edit Diary Entry":"New Diary Entry";const n=document.getElementById("diary-modal-bus");n&&(n.textContent="📕 Agency Travel Order"),document.getElementById("diary-entry-id").value=(e==null?void 0:e.id)??"",document.getElementById("diary-customer").value=(e==null?void 0:e.customerName)??"",document.getElementById("diary-phone").value=(e==null?void 0:e.customerPhone)??"",document.getElementById("diary-place").value=(e==null?void 0:e.place)??"",document.getElementById("diary-from").value=(e==null?void 0:e.departureDate)??t??"",document.getElementById("diary-to").value=(e==null?void 0:e.arrivalDate)??t??"",document.getElementById("diary-fare").value=e!=null&&e.fare?String(e.fare):"",document.getElementById("diary-note").value=(e==null?void 0:e.note)??"",document.getElementById("diary-save-btn").textContent=e?"Update Entry":"Save Entry",a.classList.remove("hidden"),document.getElementById("diary-customer").focus()}function ie(){var e,t;(e=document.getElementById("diary-modal"))==null||e.classList.add("hidden"),(t=document.getElementById("diary-form"))==null||t.reset()}window.openDiaryModalForDate=function(e){de(null,e)};window.editDiaryEntry=function(e){var a;const t=(((a=l.diary)==null?void 0:a.entries)||[]).find(n=>n.id===e);t&&de(t)};window.deleteDiaryEntry=async function(e){var a;const t=(((a=l.diary)==null?void 0:a.entries)||[]).find(n=>n.id===e);if(t&&confirm(`Remove ${t.customerName||"this entry"} (${I(t.departureDate)} → ${I(t.arrivalDate)}) from the agency diary?`))try{if(!(await fetch(`${v}/trips/${e}`,{method:"DELETE"})).ok)throw new Error("Could not remove this entry");await le()}catch(n){alert("❌ "+n.message)}};async function $t(e){var i;e.preventDefault();const t=document.getElementById("diary-entry-id").value,a={operatorName:(i=l.currentUser)==null?void 0:i.operatorName,customerName:document.getElementById("diary-customer").value.trim(),customerPhone:document.getElementById("diary-phone").value.trim(),place:document.getElementById("diary-place").value.trim(),departureDate:document.getElementById("diary-from").value,arrivalDate:document.getElementById("diary-to").value,fare:document.getElementById("diary-fare").value,note:document.getElementById("diary-note").value.trim()},n=document.getElementById("diary-save-btn"),o=n.textContent;n.disabled=!0,n.textContent="Saving…";try{const r=await fetch(t?`${v}/trips/diary/${t}`:`${v}/trips/diary`,{method:t?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(a)}),s=await r.json().catch(()=>null);if(!r.ok)throw new Error((s==null?void 0:s.error)||"Could not save this entry");ie(),await le()}catch(r){alert("❌ "+r.message)}finally{n.disabled=!1,n.textContent=o}}async function K(){var t;const e=(t=l.currentUser)==null?void 0:t.operatorName;if(e)try{const a=l.currentUser.role==="superadmin"?`${v}/trips`:`${v}/trips?operatorName=${encodeURIComponent(e)}`,n=await fetch(a);if(!n.ok)throw new Error("Failed to load trips");l.trips=await n.json(),Ne(),It()}catch(a){console.error("Trips load error:",a)}}function Ne(){const e=document.getElementById("trip-vehicle");if(!e)return;if(!l.vehicles.length){e.innerHTML='<option value="">No vehicles in your fleet yet</option>';return}const t=ce(),a=e.value;e.innerHTML=l.vehicles.map(n=>`
    <option value="${n.id}" ${t?"":"disabled"}>
      ${c(n.name)} · ${c(n.vehicleNumber||"—")}${t?"":"  (fleet fee not paid)"}
    </option>`).join(""),a&&(e.value=a)}async function Et(e){const t=(e.target.files||[])[0];if(!t)return;const a=document.getElementById("trip-image-status"),n=a==null?void 0:a.textContent;a&&(a.textContent="Uploading to R2…");try{const o=await Se(t,"trips");document.getElementById("trip-image").value=o,Me(),a&&(a.textContent="Uploaded ✓")}catch(o){a&&(a.textContent=n||""),alert("❌ "+o.message)}finally{e.target.value=""}}function Me(){const e=document.getElementById("trip-image-preview"),t=document.getElementById("trip-image").value.trim();e&&(e.innerHTML=t?`<img src="${c(t)}" alt="Trip image preview" onerror="this.style.display='none'" />`:"")}function xt(e){return e==="On Trip"?"confirmed":e==="Completed"?"cancelled":"pending"}function It(){const e=document.getElementById("trips-tbody"),t=document.getElementById("trips-count-note");if(!e)return;if(!l.trips.length){e.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">No trips posted yet.</td></tr>',t&&(t.textContent="");return}const a=l.trips.filter(n=>n.busListed&&n.status!=="Completed").length;t&&(t.textContent=`${a} of ${l.trips.length} showing in the app`),e.innerHTML=l.trips.map(n=>`
    <tr>
      <td>
        <strong>${c(n.place)}</strong><br>
        <small style="color:var(--text-muted);">${n.durationDays} day${n.durationDays===1?"":"s"}${n.note?" · "+c(n.note):""}</small>
      </td>
      <td>
        ${c(n.vehicleName||"—")}<br>
        <code class="vehicle-number">${c(n.vehicleNumber||"—")}</code>
      </td>
      <td>${I(n.departureDate)}</td>
      <td>${I(n.arrivalDate)}</td>
      <td>
        <span class="badge-status ${xt(n.status)}">${c(n.status)}</span>
        ${n.busListed?"":'<br><small style="color:var(--accent-red);">bus not subscribed</small>'}
      </td>
      <td>
        <button class="btn btn-secondary btn-sm" style="color:var(--accent-red);" onclick="deleteTrip(${n.id})">🗑️ Delete</button>
      </td>
    </tr>`).join("")}async function Bt(e){e.preventDefault();const t=document.getElementById("trip-vehicle").value;if(!t)return alert("❌ Add a subscribed vehicle to your fleet first.");const a={operatorName:l.currentUser.operatorName,vehicleId:Number(t),place:document.getElementById("trip-place").value.trim(),departureDate:document.getElementById("trip-departure").value,arrivalDate:document.getElementById("trip-arrival").value,imageUrl:document.getElementById("trip-image").value.trim(),note:document.getElementById("trip-note").value.trim()};try{const n=await fetch(`${v}/trips`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(a)}),o=await n.json().catch(()=>null);if(!n.ok)throw new Error((o==null?void 0:o.error)||"Failed to post trip");document.getElementById("trip-form").reset(),Me(),await K(),alert(`✅ Trip to ${o.place} posted!

Bus: ${o.vehicleName} (${o.vehicleNumber})
Departs: ${I(o.departureDate)}
Arrives: ${I(o.arrivalDate)}
Status: ${o.status}`)}catch(n){alert("❌ "+n.message)}}window.deleteTrip=async function(e){if(confirm("Remove this trip from the traveller app?"))try{if(!(await fetch(`${v}/trips/${e}`,{method:"DELETE"})).ok)throw new Error("Failed to delete trip");await K()}catch(t){alert("❌ "+t.message)}};async function _(){var t;const e=(t=l.currentUser)==null?void 0:t.operatorName;if(e)try{const[a,n]=await Promise.all([fetch(`${v}/subscriptions/plans`),fetch(`${v}/subscriptions?operatorName=${encodeURIComponent(e)}`)]);if(!a.ok||!n.ok)throw new Error("Failed to load subscription data");if(l.plans=await a.json(),l.subscription=await n.json(),l.currentUser.role==="superadmin"){const o=await fetch(`${v}/subscriptions/overview`);o.ok&&(l.agencySubs=await o.json())}kt()}catch(a){console.error("Subscription load error:",a)}}function y(e){var n;const t=((n=l.plans)==null?void 0:n.currencySymbol)||"₹",a=Number(e||0);return(a<0?"-":"")+t+Math.abs(a).toLocaleString("en-IN")}function I(e){return e?new Date(e).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}):"—"}function V(e){var n;const t=((n=l.plans)==null?void 0:n.fleetTiers)||[],a=Math.max(1,Number(e)||0);return t.find(o=>a>=o.minVehicles&&(o.maxVehicles===null||a<=o.maxVehicles))||t[t.length-1]||null}function x(){return l.vehicles.length}function R(){var e;return((e=l.subscription)==null?void 0:e.fleet)||null}function ce(){var e;return((e=R())==null?void 0:e.status)==="active"}function Ae({title:e,lead:t,planName:a,planSub:n,planPrice:o,lines:i=[],total:r,note:s,actionLabel:d}){return new Promise(u=>{const b=document.getElementById("payment-modal");if(!b)return u(!0);document.getElementById("payment-title").textContent=e,document.getElementById("payment-lead").textContent=t||"",document.getElementById("payment-plan").innerHTML=`
      <div>
        <span class="pay-plan-name">${c(a)}</span>
        <span class="pay-plan-sub">${c(n||"")}</span>
      </div>
      <div>
        <span class="pay-plan-price">${o}</span>
        <span class="pay-plan-period">per ${c(T())}</span>
      </div>`,document.getElementById("payment-lines").innerHTML=i.map(h=>`<div><dt>${c(h.label)}</dt><dd>${h.value}</dd></div>`).join(""),document.getElementById("payment-total").textContent=r,document.getElementById("payment-note").textContent=s||"No card is charged yet — the payment gateway is being connected. Confirming records this payment against your agency.";const p=document.getElementById("payment-confirm");p.textContent=d||"Pay & Continue";const m=h=>{b.classList.add("hidden"),p.removeEventListener("click",f),document.getElementById("payment-cancel").removeEventListener("click",g),document.getElementById("payment-close").removeEventListener("click",g),u(h)},f=()=>m(!0),g=()=>m(!1);p.addEventListener("click",f),document.getElementById("payment-cancel").addEventListener("click",g),document.getElementById("payment-close").addEventListener("click",g),b.classList.remove("hidden")})}function A({icon:e="✅",title:t,lead:a,lines:n=[],actionLabel:o="Done"}){return new Promise(i=>{const r=document.getElementById("notice-modal");if(!r)return alert(`${t}

${a||""}`),i();document.getElementById("notice-icon").textContent=e,document.getElementById("notice-title").textContent=t,document.getElementById("notice-lead").textContent=a||"",document.getElementById("notice-lines").innerHTML=n.map(u=>`<div><dt>${c(u.label)}</dt><dd>${u.value}</dd></div>`).join("");const s=document.getElementById("notice-ok");s.textContent=o;const d=()=>{r.classList.add("hidden"),s.removeEventListener("click",d),i()};s.addEventListener("click",d),r.classList.remove("hidden")})}function Fe(){const e=V(x()+1);if(!e)return null;const t=R();return!t||t.status!=="active"?{tier:e,charge:e.price,upgrade:!1}:t.tierId===e.tierId?{tier:e,charge:0,upgrade:!1}:{tier:e,charge:Math.max(0,e.price-(t.price||0)),upgrade:!0}}function T(){var e;return((e=l.plans)==null?void 0:e.billingPeriod)||"month"}function me(){var e,t;return((t=(e=l.subscription)==null?void 0:e.platform)==null?void 0:t.status)==="active"}function kt(){l.plans&&(Lt(),Tt(),Ct(),St(),Dt(),Nt())}function Lt(){var g;const e=l.plans.platform,t=(g=l.subscription)==null?void 0:g.platform,a=me(),n=window.location.origin.includes("3005")?"http://localhost:3000/":window.location.origin+"/";document.getElementById("membership-title").textContent=e.name;const o=e.plans||[],i=o.find(h=>h.id===(t==null?void 0:t.planId)),r=o.reduce((h,L)=>h&&h.price<=L.price?h:L,o[0]),s=i||r;document.getElementById("membership-price").textContent=s?`${y(s.price)} / ${s.period}`:y(e.price);const d=document.querySelector(".membership-price-label");d&&(d.textContent=i?"Your platform plan":"Platform fee from"),document.getElementById("membership-benefits").innerHTML=e.features.map(h=>`<li>${c(h)}</li>`).join("");const u=document.getElementById("membership-badge"),b=document.getElementById("membership-card"),p=document.getElementById("membership-status-line"),m=document.getElementById("membership-managed-note");b.classList.toggle("is-active",a),document.getElementById("membership-start").textContent=I(t==null?void 0:t.startsAt),document.getElementById("membership-expiry").textContent=I(t==null?void 0:t.expiresAt),document.getElementById("membership-remaining").textContent=t&&a?`${t.daysLeft} days`:"—",document.getElementById("membership-paid").textContent=t?y(t.amount):"—",a?(u.className="badge-status confirmed",u.textContent="ACTIVE",p.textContent=`${l.subscription.operatorName} is registered. You can add vehicles and browse other agencies' fleets.`,m.innerHTML=`🔒 Managed on the Tripnix site — renew at <a href="${n}" target="_blank" rel="noopener">${n}</a> before it expires.`):t?(u.className="badge-status cancelled",u.textContent="EXPIRED",p.textContent="Your membership has lapsed, so your fleet is hidden from travellers.",m.innerHTML=`⚠️ Renew on the Tripnix site to go live again: <a href="${n}" target="_blank" rel="noopener">${n}</a>`):(u.className="badge-status pending",u.textContent="NOT REGISTERED",p.textContent=e.tagline,m.innerHTML=`⚠️ Pay the platform fee on the Tripnix site to activate your agency: <a href="${n}" target="_blank" rel="noopener">${n}</a>`);const f=document.getElementById("subscription-badge");f&&(f.style.display=a?"none":"inline-block")}function Ct(){var n;const e=l.plans?document.getElementById("plan-grid"):null;if(!e)return;const t=l.plans.fleetTiers||[];if(!t.length){e.innerHTML='<p class="plan-empty">No fleet plan configured.</p>';return}const a=(n=V(x()))==null?void 0:n.id;e.innerHTML=`
    <div class="plan-cards">
      ${t.map(o=>`
        <div class="plan-card${o.id===a&&x()>0?" is-current":""}">
          <span class="plan-card-tier">🚍 ${c(o.label)}</span>
          <span class="plan-card-seats">${o.maxVehicles===null?`${o.minVehicles} or more vehicles`:`${o.minVehicles}–${o.maxVehicles} vehicles, one fee`}</span>
          <div class="plan-card-price">${y(o.price)}</div>
          <span class="plan-card-period">whole fleet / ${T()}</span>
        </div>`).join("")}
    </div>`}function Tt(){var n,o,i,r;const e=document.getElementById("platform-plan-options");if(!e)return;const t=((o=(n=l.plans)==null?void 0:n.platform)==null?void 0:o.plans)||[];if(!t.length){e.innerHTML="";return}const a=(r=(i=l.subscription)==null?void 0:i.platform)==null?void 0:r.planId;e.innerHTML=t.map(s=>`
    <div class="platform-plan${s.id===a?" is-current":""}">
      <div class="platform-plan-head">
        <span class="platform-plan-label">${c(s.label)}</span>
        <span class="platform-plan-price">${y(s.price)}</span>
      </div>
      <span class="platform-plan-note">
        ${s.id===a?"Your current plan":s.note?c(s.note):`Billed every ${c(s.period)}`}
      </span>
    </div>`).join("")}function St(){const e=document.getElementById("listings-tbody"),t=document.getElementById("listing-total-note");if(!e)return;if(!l.vehicles.length){e.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">No vehicles in your fleet yet.</td></tr>',t.textContent="";return}const a=R(),n=ce(),o=V(x()),i=n?'<span class="badge-status confirmed">LISTED</span>':a?'<span class="badge-status cancelled">EXPIRED</span>':'<span class="badge-status pending">UNPAID</span>';e.innerHTML=l.vehicles.map(d=>`
    <tr>
      <td><strong>${c(d.name)}</strong></td>
      <td><code class="vehicle-number">${c(d.vehicleNumber||"—")}</code></td>
      <td>${c(d.type)}</td>
      <td>${d.capacity}</td>
      <td><small style="color:var(--text-muted);">covered by fleet plan</small></td>
      <td>${i}</td>
      <td><small style="color:var(--text-muted);">—</small></td>
    </tr>`).join("");const r=o?c(o.label):"—",s=o?y(o.price):"—";n?t.innerHTML=`${x()} vehicle${x()===1?"":"s"} on the <strong>${r}</strong> plan (${s}/${T()}) · renews ${I(a.expiresAt)} · ${a.daysLeft} days left <button class="btn btn-secondary btn-sm" style="margin-left:10px;" onclick="payFleetFee()">🔄 Renew ${s}</button>`:t.innerHTML=`Your fleet of ${x()} needs the <strong>${r}</strong> plan (${s}/${T()}). Your vehicles stay hidden from travellers until it is paid. <button class="btn btn-primary btn-sm" style="margin-left:10px;" onclick="payFleetFee()">💳 Pay ${s}</button>`}function Dt(){var r;const e=document.getElementById("superadmin-subscription-panels");if(!e)return;if(((r=l.currentUser)==null?void 0:r.role)!=="superadmin"){e.classList.add("hidden");return}e.classList.remove("hidden");const t=(l.plans.platform.plans||[])[0],a=document.getElementById("price-platform");a&&document.activeElement!==a&&(a.value=t?t.price:l.plans.platform.price);const n=document.getElementById("price-platform-label");n&&t&&(n.textContent=`Platform membership (per ${t.period})`);const o=document.getElementById("tier-price-inputs");o.dataset.built||(o.innerHTML=(l.plans.fleetTiers||[]).map(s=>`
      <div class="form-group">
        <label for="price-${s.id}">${c(s.label)} <small style="color:var(--text-muted);">(whole fleet / ${T()})</small></label>
        <input type="number" id="price-${s.id}" data-tier-id="${s.id}" min="0" step="1" required />
      </div>`).join(""),o.dataset.built="true"),(l.plans.fleetTiers||[]).forEach(s=>{const d=document.getElementById(`price-${s.id}`);d&&document.activeElement!==d&&(d.value=s.price)});const i=document.getElementById("agency-subs-tbody");if(!l.agencySubs.length){i.innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">No agency has subscribed yet.</td></tr>';return}i.innerHTML=l.agencySubs.map(s=>`
    <tr>
      <td><strong>${c(s.operatorName)}</strong></td>
      <td>${s.platform?`<span class="badge-status ${s.platform.status==="active"?"confirmed":"cancelled"}">${s.platform.status.toUpperCase()}</span>`:'<span class="badge-status pending">NONE</span>'}</td>
      <td>${s.platform?I(s.platform.expiresAt):"—"}</td>
      <td>${s.fleet?`${c(s.fleet.tierLabel)} · ${s.vehicleCount} vehicle${s.vehicleCount===1?"":"s"}<br><span class="badge-status ${s.fleet.status==="active"?"confirmed":"cancelled"}">${s.fleet.status.toUpperCase()}</span>`:'<span class="badge-status pending">NO FLEET PLAN</span>'}</td>
      <td><strong>${y(s.totalPaid)}</strong></td>
    </tr>`).join("")}function Nt(){const e=me();ae.title=e?"Add a vehicle to your fleet":"Pay the platform fee first to start adding vehicles",ae.classList.toggle("btn-locked",!e)}window.payFleetFee=async function(){var o,i;const e=(o=l.currentUser)==null?void 0:o.operatorName;if(!e)return;const t=V(x());if(!t)return alert("❌ No fleet plan is configured.");const a=ce();if(await Ae({title:a?"Renew Fleet Plan":"Confirm Payment",lead:a?`Extends your fleet plan by another ${T()} from its current expiry.`:"One fee covers every vehicle you run — priced by how many that is.",planName:`${t.label} fleet plan`,planSub:`Covers all ${x()} of your vehicle${x()===1?"":"s"}`,planPrice:y(t.price),lines:[{label:"Plan price",value:`${y(t.price)} / ${T()}`},{label:"Vehicles covered",value:String(x())},...a?[{label:"Extends from",value:I((i=R())==null?void 0:i.expiresAt)}]:[]],total:y(t.price),actionLabel:a?`Renew · ${y(t.price)}`:`Pay ${y(t.price)}`}))try{const r=await fetch(`${v}/subscriptions/fleet`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({operatorName:e,vehicleCount:x()})}),s=await r.json();if(!r.ok)throw new Error((s==null?void 0:s.error)||"Payment failed");await _(),H(),Ne(),await A({icon:a?"🔄":"🎉",title:a?"Fleet plan renewed":"Your fleet is listed!",lead:a?"Your vehicles stay visible to travellers for another period.":"Every vehicle in your fleet is now visible to travellers.",lines:[{label:"Fleet plan",value:c(s.tierLabel)},{label:"Vehicles covered",value:String(x())},{label:"Paid now",value:y(t.price)},{label:"Covered until",value:I(s.expiresAt)}]})}catch(r){alert("❌ "+r.message)}};async function Mt(e){e.preventDefault();const t=Number(document.getElementById("price-platform").value),a=[...document.querySelectorAll("#tier-price-inputs input[data-tier-id]")].map(n=>({id:n.dataset.tierId,price:Number(n.value)}));try{const n=await fetch(`${v}/subscriptions/plans`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({platformPrice:t,fleetTiers:a})}),o=await n.json();if(!n.ok)throw new Error((o==null?void 0:o.error)||"Failed to save pricing");await _(),alert("✅ Plan pricing updated.")}catch(n){alert("❌ "+n.message)}}async function J(){var e;if(((e=l.currentUser)==null?void 0:e.role)==="superadmin")try{const t=await fetch(`${v}/auth/admins`);if(!t.ok)throw new Error("Failed");l.admins=await t.json(),Ft()}catch(t){console.error("Admins load error:",t)}}async function At(e){e.preventDefault();const t=document.getElementById("admin-username").value.trim(),a=document.getElementById("admin-password").value.trim(),n=document.getElementById("admin-operator").value.trim(),o=document.getElementById("admin-phone").value.trim();try{const i=await fetch(`${v}/auth/admins`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:t,password:a,operatorName:n,phone:o})});let r=null;try{r=await i.json()}catch{r=null}if(!i.ok)throw new Error((r==null?void 0:r.error)||"Failed to create account");oe.reset(),await J(),alert(`✅ Account created!

Travel Agency: ${n}
Username: ${t}
Password: ${a}

Share these credentials with the travel owner.`)}catch(i){alert("❌ "+i.message)}}function Ft(){const e=document.getElementById("admins-table-tbody");if(e){if(!l.admins.length){e.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">No travel owner accounts yet.</td></tr>';return}e.innerHTML=l.admins.map(t=>`
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
    </tr>`).join("")}}window.deleteAdmin=async function(e){if(confirm("Delete this travel owner account?"))try{if(!(await fetch(`${v}/auth/admins/${e}`,{method:"DELETE"})).ok)throw new Error("Failed to delete");await J()}catch(t){alert("❌ "+t.message)}};function Pt(){let e=0,t=0;l.bookings.forEach(d=>{d.status==="Confirmed"?e++:d.status==="Pending"&&t++});const a=new Set;l.vehicles.forEach(d=>(d.availableDates||[]).forEach(u=>a.add(u))),document.getElementById("stat-fleet").textContent=`${l.vehicles.length} Units`,document.getElementById("stat-schedules").textContent=`${a.size} Days`,document.getElementById("stat-confirmed").textContent=e,document.getElementById("stat-pending").textContent=t,he.textContent=t,he.style.display=t>0?"inline-block":"none";const n=l.vehicles.filter(d=>d.type==="Bus").length,o=l.vehicles.filter(d=>d.type==="Traveller").length,i=l.vehicles.filter(d=>d.type==="Car").length;document.getElementById("bus-count").textContent=n,document.getElementById("bus-count-desc").textContent=`${n} buses in fleet`,document.getElementById("traveller-count").textContent=o,document.getElementById("traveller-count-desc").textContent=`${o} travellers in fleet`,document.getElementById("car-count").textContent=i,document.getElementById("car-count-desc").textContent=`${i} cars in fleet`;const r=document.getElementById("recent-bookings-tbody"),s=[...l.bookings].reverse().slice(0,5);r.innerHTML=s.length===0?'<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">No bookings yet</td></tr>':s.map(d=>`
      <tr>
        <td><strong>${c(d.vehicleName)}</strong></td>
        <td>${c(d.userName)}</td>
        <td>${d.startDate} → ${d.endDate}</td>
        <td><span class="badge-status ${d.status.toLowerCase()}">${d.status}</span></td>
      </tr>`).join("")}function H(){const e=document.getElementById("vehicles-grid");if(!e)return;const t=l.vehicles.filter(a=>{const n=l.fleetFilter==="All"||a.type===l.fleetFilter;let o=!0;if(l.seatFilter&&l.seatFilter!=="All"){const s=Number(a.capacity)||0;l.seatFilter==="above49"?o=s>49:o=s===Number(l.seatFilter)}const i=l.searchQuery.trim().toLowerCase(),r=!i||a.name.toLowerCase().includes(i)||a.operatorName.toLowerCase().includes(i);return n&&o&&r});if(!t.length){e.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--text-muted);">No vehicles found.</div>';return}e.innerHTML=t.map(a=>{const n=a.availableDates||[],o=n.length?n.map(r=>`<span class="date-pill">${r}</span>`).join(""):'<span style="font-size:11px;color:var(--text-muted);">No dates posted yet</span>',i=a.onHold?Oe(a.heldSince):0;return`
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
            <strong>Off the app for ${i} day${i===1?"":"s"}</strong>
            <span>${a.holdReason?c(a.holdReason)+" · ":""}since ${I(a.heldSince)}</span>
            <span>These days are added back to your plan when you resume it.</span>
          </div>`:""}
        <div class="card-specs">
          <span>👥 ${a.capacity} Seats</span>
          <span title="Worked out from this vehicle's ${a.ratedOn||0} amenit${a.ratedOn===1?"y":"ies"} — tick more in Edit to raise it">
            ⭐ ${(a.rating??3).toFixed(1)} · ${c(a.ratingLabel||"Standard")}
          </span>
        </div>
        <div class="rating-basis">
          ${(a.features||[]).length?(a.features||[]).map(r=>`<span class="feature-pill">${c(r)}</span>`).join(""):'<span class="feature-empty">No amenities ticked — add some in Edit to raise the rating</span>'}
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
    </div>`}).join("")}function Ot(){const e=document.getElementById("all-bookings-tbody"),t=[...l.bookings].reverse();e.innerHTML=t.length?t.map(a=>`
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
      </tr>`).join(""):'<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:32px;">No bookings found.</td></tr>'}let w=null;function Ht(){const e=document.getElementById("vehicle-dates");e&&typeof flatpickr<"u"&&!w&&(w=flatpickr(e,{mode:"multiple",dateFormat:"Y-m-d",conjunction:", ",theme:"dark",monthSelectorType:"dropdown",onChange:t=>{Z(t)}}),jt())}function Z(e){const t=document.getElementById("selected-date-chips"),a=document.getElementById("selected-dates-count");if(!t)return;const n=(e||[]).map(o=>{if(o instanceof Date){const i=o.getFullYear(),r=String(o.getMonth()+1).padStart(2,"0"),s=String(o.getDate()).padStart(2,"0");return`${i}-${r}-${s}`}return String(o).trim()}).filter(Boolean).sort();if(a&&(a.textContent=`${n.length} date${n.length===1?"":"s"} selected`),n.length===0){t.innerHTML='<span class="no-dates-text">No dates selected yet. Click input or presets above to select dates.</span>';return}t.innerHTML=n.map(o=>`
    <span class="selected-date-chip">
      <span class="chip-date">📅 ${o}</span>
      <button type="button" class="chip-remove" data-date="${o}" title="Remove date">&times;</button>
    </span>
  `).join(""),t.querySelectorAll(".chip-remove").forEach(o=>{o.addEventListener("click",i=>{i.stopPropagation();const r=o.getAttribute("data-date");Ut(r)})})}function Ut(e){if(!w)return;const a=w.selectedDates.filter(n=>{const o=n.getFullYear(),i=String(n.getMonth()+1).padStart(2,"0"),r=String(n.getDate()).padStart(2,"0");return`${o}-${i}-${r}`!==e});w.setDate(a,!0)}function jt(){var e,t,a,n,o;(e=document.getElementById("preset-today"))==null||e.addEventListener("click",()=>{const i=new Date;w==null||w.setDate([i],!0)}),(t=document.getElementById("preset-next-7"))==null||t.addEventListener("click",()=>{const i=[],r=new Date;for(let s=0;s<7;s++){const d=new Date(r);d.setDate(r.getDate()+s),i.push(d)}w==null||w.setDate(i,!0)}),(a=document.getElementById("preset-next-14"))==null||a.addEventListener("click",()=>{const i=[],r=new Date;for(let s=0;s<14;s++){const d=new Date(r);d.setDate(r.getDate()+s),i.push(d)}w==null||w.setDate(i,!0)}),(n=document.getElementById("preset-clear"))==null||n.addEventListener("click",()=>{w==null||w.clear(),Z([])}),(o=document.getElementById("open-calendar-btn"))==null||o.addEventListener("click",()=>{w==null||w.open()})}function Pe(e=null){var r;l.editingVehicleId=(e==null?void 0:e.id)??null,Je.textContent=e?"Edit Vehicle":"Add New Vehicle";const t=document.getElementById("modal-save-btn");t&&(t.textContent=e?"Update Vehicle":"Add Vehicle");const a=((r=l.currentUser)==null?void 0:r.operatorName)??"",n=(e==null?void 0:e.type)??"Bus";document.getElementById("vehicle-id").value=(e==null?void 0:e.id)??"",document.getElementById("vehicle-type").value=n,document.getElementById("vehicle-operator").value=(e==null?void 0:e.operatorName)??a,document.getElementById("vehicle-name").value=(e==null?void 0:e.name)??"",document.getElementById("vehicle-number").value=(e==null?void 0:e.vehicleNumber)??"",document.getElementById("vehicle-capacity").value=(e==null?void 0:e.capacity)??36,document.getElementById("vehicle-description").value=(e==null?void 0:e.description)??"",document.getElementById("vehicle-instagram").value=(e==null?void 0:e.instagramUrl)??"",window.syncCustomTypeDropdown&&window.syncCustomTypeDropdown(n),l.vehicleFormImages=Array.isArray(e==null?void 0:e.imageUrls)?[...e.imageUrls]:[],l.vehicleFormVideos=Array.isArray(e==null?void 0:e.videoUrls)?[...e.videoUrls]:[],j();const o=(e==null?void 0:e.features)??["AC","WiFi"];document.querySelectorAll(".features-checkboxes input").forEach(s=>{s.checked=o.includes(s.value)}),Ht();const i=(e==null?void 0:e.availableDates)??[];w?(w.setDate(i,!1),Z(w.selectedDates)):document.getElementById("vehicle-dates").value=i.join(", "),U(),Be.classList.remove("hidden")}function U(){const e=document.getElementById("vehicle-sub-panel");if(!e||!l.plans)return;const t=!!l.editingVehicleId,a=document.getElementById("vehicle-sub-tier-label"),n=document.getElementById("vehicle-sub-tier-seats"),o=document.getElementById("vehicle-sub-price"),i=document.getElementById("vehicle-sub-note"),r=document.getElementById("modal-save-btn");if(t){const d=R(),u=V(x());e.classList.remove("is-invalid"),r.disabled=!1,a.textContent=u?`${u.label} fleet plan`:"Fleet plan",n.textContent=`${x()} vehicle${x()===1?"":"s"} covered`,o.textContent=u?`${y(u.price)}/${T()}`:"—",i.textContent=(d==null?void 0:d.status)==="active"?`Covered until ${I(d.expiresAt)}. Updating these details does not change the fee.`:"Updating these details does not change the fee. Pay it from the Subscription page.",r.textContent="Update Vehicle";return}const s=Fe();if(!s){e.classList.add("is-invalid"),a.textContent="No fleet plan configured",n.textContent="",o.textContent="—",i.textContent="No fleet plan is configured. Ask the Super Admin to set one on the Subscription page.",r.textContent="Add Vehicle",r.disabled=!0;return}e.classList.remove("is-invalid"),r.disabled=!1,a.textContent=`${s.tier.label} fleet plan`,n.textContent=`This would be vehicle #${x()+1}`,o.textContent=`${y(s.tier.price)}/${T()}`,s.charge===0?i.textContent=`Your ${s.tier.label} plan (${y(s.tier.price)}/${T()}) already covers this vehicle — nothing more to pay. It goes live in the app straight after.`:s.upgrade?i.textContent=`This vehicle moves your fleet onto the ${s.tier.label} plan at ${y(s.tier.price)}/${T()}. You have already paid ${y(s.tier.price-s.charge)} of it, so ${y(s.charge)} is payable now and your renewal date does not change.`:i.textContent=`Adding this vehicle starts your ${s.tier.label} plan at ${y(s.tier.price)} for one ${T()}, covering every vehicle you add inside that band.`,r.textContent=s.charge>0?`Add Vehicle · ${y(s.charge)}`:"Add Vehicle"}function W(){w&&w.clear(),Z([]),l.vehicleFormImages=[],l.vehicleFormVideos=[],j(),window.syncCustomTypeDropdown&&window.syncCustomTypeDropdown("Bus"),Be.classList.add("hidden"),ke.reset()}async function Vt(e){e.preventDefault();const t=l.editingVehicleId,a=document.getElementById("vehicle-name").value.trim(),n=document.getElementById("vehicle-number").value.trim().toUpperCase(),o=document.getElementById("vehicle-type").value,i=document.getElementById("vehicle-operator").value.trim(),r=Number(document.getElementById("vehicle-capacity").value),s=document.getElementById("vehicle-description").value.trim(),d=document.getElementById("vehicle-instagram").value.trim();let u=[];w&&w.selectedDates.length>0?u=w.selectedDates.map(E=>{const C=E.getFullYear(),k=String(E.getMonth()+1).padStart(2,"0"),B=String(E.getDate()).padStart(2,"0");return`${C}-${k}-${B}`}).sort():u=document.getElementById("vehicle-dates").value.split(",").map(E=>E.trim()).filter(Boolean);const b=l.vehicleFormImages,p=l.vehicleFormVideos,m=[...document.querySelectorAll(".features-checkboxes input:checked")].map(E=>E.value),f={name:a,type:o,vehicleNumber:n,operatorName:i,capacity:r,description:s,instagramUrl:d,availableDates:u,imageUrls:b,videoUrls:p,features:m},g=t?null:Fe();if(!t&&!g)return alert("❌ No fleet plan is configured, so this vehicle cannot be listed yet.");if(g&&g.charge>0){const E=g.tier.price-g.charge;if(!await Ae({title:g.upgrade?"Upgrade Fleet Plan":"Confirm Payment",lead:g.upgrade?`Adding ${a} takes your fleet to ${x()+1} vehicles, which moves you onto the ${g.tier.label} plan.`:`Adding ${a} starts your fleet plan. One fee covers every vehicle in the band.`,planName:`${g.tier.label} fleet plan`,planSub:`Covers ${x()+1} vehicle${x()+1===1?"":"s"}`,planPrice:y(g.tier.price),lines:[{label:"Plan price",value:`${y(g.tier.price)} / ${T()}`},...E>0?[{label:"Already paid this period",value:`− ${y(E)}`}]:[],{label:"Billing period",value:T()}],total:y(g.charge),actionLabel:`Pay ${y(g.charge)} & Add`}))return}const h=document.getElementById("modal-save-btn"),L=h.textContent;h.disabled=!0,h.textContent="Saving…";try{const E=t?`${v}/vehicles/${t}`:`${v}/vehicles`,k=await fetch(E,{method:t?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(f)});let B=null;try{B=await k.json()}catch{B=null}if(!k.ok)throw new Error((B==null?void 0:B.error)||"Failed to save vehicle");if(t)return W(),await D(),A({icon:"✏️",title:`${a} updated`,lead:"The details are saved. Your fleet plan and renewal date are unchanged."});if(W(),await D(),!B.fleet)return A({icon:"⚠️",title:`${a} saved, but not listed`,lead:B.listingWarning||"The fleet fee could not be charged, so your vehicles are not visible to travellers yet. Pay it from the Subscription page.",actionLabel:"Got it"});const F=Number(B.fleet.charge||0);return A({icon:"🎉",title:`${a} is live in the app!`,lead:`Travellers can now see it. Your fleet plan covers every vehicle in the ${B.fleet.tierLabel} band.`,lines:[{label:"Fleet plan",value:c(B.fleet.tierLabel)},{label:"Vehicles covered",value:String(B.fleet.vehicleCount??x())},{label:"Paid now",value:F>0?y(F)+(B.fleet.upgraded?" (upgrade)":""):"Nothing — already covered"},{label:"Covered until",value:I(B.fleet.expiresAt)}]})}catch(E){alert("❌ "+E.message)}finally{h.disabled=!1,h.textContent=L}}window.editVehicle=function(e){const t=l.vehicles.find(a=>a.id===e);t&&Pe(t)};function Oe(e){const t=new Date(`${e}T00:00:00`);if(Number.isNaN(t.getTime()))return 0;const a=Date.UTC(t.getFullYear(),t.getMonth(),t.getDate()),n=new Date,o=Date.UTC(n.getFullYear(),n.getMonth(),n.getDate());return Math.max(1,Math.round((o-a)/864e5)+1)}window.holdVehicle=async function(e){const t=l.vehicles.find(n=>n.id===e);if(!t)return;const a=prompt(`Hold "${t.name}" off the app?

It stays in your fleet but travellers stop seeing it, and it cannot be given a trip. Every day it is held is added back to your fleet plan when you resume it.

Why is it off the road? (optional)`,"Workshop / maintenance");if(a!==null)try{const n=await fetch(`${v}/vehicles/${e}/hold`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({operatorName:t.operatorName,reason:a})}),o=await n.json().catch(()=>null);if(!n.ok)throw new Error((o==null?void 0:o.error)||"Could not hold this vehicle");await D(),await A({icon:"⏸️",title:`${t.name} is on hold`,lead:"Travellers can no longer see it. Resume it when it is back on the road and the days it sat out will be added to your fleet plan."})}catch(n){alert("❌ "+n.message)}};window.resumeVehicle=async function(e){const t=l.vehicles.find(n=>n.id===e);if(!t)return;const a=Oe(t.heldSince);if(confirm(`Put "${t.name}" back on the app?

It has been on hold for ${a} day${a===1?"":"s"}. Those days will be added to your fleet plan's expiry.`))try{const n=await fetch(`${v}/vehicles/${e}/resume`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({operatorName:t.operatorName})}),o=await n.json().catch(()=>null);if(!n.ok)throw new Error((o==null?void 0:o.error)||"Could not resume this vehicle");await D();const i=o.hold||{},r=i.creditedDays===i.days?`It was off the app for ${i.days} day${i.days===1?"":"s"}, and your fleet plan has been extended by the same.`:i.creditedDays>0?`It was off the app for ${i.days} days. ${i.creditedDays} were added to your plan — the rest overlapped another bus's hold and had already been credited.`:`It was off the app for ${i.days} day${i.days===1?"":"s"}, all of which overlapped another bus's hold and had already been added to your plan.`;await A({icon:"▶️",title:`${t.name} is back on the app`,lead:r,lines:i.fleetExpiresAt?[{label:"Fleet plan now runs until",value:I(i.fleetExpiresAt)}]:[]})}catch(n){alert("❌ "+n.message)}};window.deleteVehicle=async function(e){if(confirm("Delete this vehicle from your fleet?"))try{if(!(await fetch(`${v}/vehicles/${e}`,{method:"DELETE"})).ok)throw new Error("Failed");await D()}catch(t){alert("❌ "+t.message)}};window.updateBookingStatus=async function(e,t){try{if(!(await fetch(`${v}/bookings/${e}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:t})})).ok)throw new Error("Failed");await D()}catch(a){alert("❌ "+a.message)}};function c(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}
