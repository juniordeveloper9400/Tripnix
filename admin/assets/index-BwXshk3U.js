(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))a(o);new MutationObserver(o=>{for(const r of o)if(r.type==="childList")for(const i of r.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&a(i)}).observe(document,{childList:!0,subtree:!0});function n(o){const r={};return o.integrity&&(r.integrity=o.integrity),o.referrerPolicy&&(r.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?r.credentials="include":o.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function a(o){if(o.ep)return;o.ep=!0;const r=n(o);fetch(o.href,r)}})();const ue="tripnix-fleet-map-styles",Fe=[{elementType:"geometry",stylers:[{color:"#1c2c48"}]},{elementType:"labels.text.stroke",stylers:[{color:"#0b1220"}]},{elementType:"labels.text.fill",stylers:[{color:"#94a3b8"}]},{featureType:"administrative",elementType:"geometry",stylers:[{color:"#4b5563"}]},{featureType:"poi",elementType:"labels.text.fill",stylers:[{color:"#7f8ea3"}]},{featureType:"poi.park",elementType:"geometry",stylers:[{color:"#1f3d2b"}]},{featureType:"road",elementType:"geometry",stylers:[{color:"#2a3a55"}]},{featureType:"road",elementType:"geometry.stroke",stylers:[{color:"#16233a"}]},{featureType:"road",elementType:"labels.text.fill",stylers:[{color:"#9ca8bb"}]},{featureType:"road.highway",elementType:"geometry",stylers:[{color:"#4a5b78"}]},{featureType:"road.highway",elementType:"geometry.stroke",stylers:[{color:"#111c30"}]},{featureType:"transit",elementType:"geometry",stylers:[{color:"#243248"}]},{featureType:"water",elementType:"geometry",stylers:[{color:"#132b47"}]},{featureType:"water",elementType:"labels.text.fill",stylers:[{color:"#4f6a8a"}]}];let F=null;function Pe(){var e;return(e=window.L)!=null&&e.map?Promise.resolve(window.L):F||(F=new Promise((t,n)=>{if(!document.getElementById("leaflet-css")){const o=document.createElement("link");o.id="leaflet-css",o.rel="stylesheet",o.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",document.head.appendChild(o)}const a=document.createElement("script");a.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",a.async=!0,a.onload=()=>{var o;return(o=window.L)!=null&&o.map?t(window.L):n(new Error("Leaflet loaded but unavailable"))},a.onerror=()=>n(new Error("Could not load the map library")),document.head.appendChild(a)}).catch(t=>{throw F=null,t}),F)}function ge(e,t,n,a){return e.divIcon({className:"fmap-pin-wrap",iconSize:[40,52],iconAnchor:[20,46],popupAnchor:[0,-44],html:`
      <div class="fmap-pin${a?" is-sample":""}">
        <img src="${te(n)}" alt="" width="34" height="43">
        <span>${S(t.vehicleNumber||t.vehicleName)}</span>
      </div>`})}async function Q(e,t,n,{noteEl:a,compact:o,sample:r}){let i;try{i=await Pe()}catch(m){return console.warn("[fleet-map]",m.message),!1}let s=O.get(e);if(!s||!e.querySelector(".fmap-canvas")){e.innerHTML=`
      <div class="fmap fmap-live${o?" is-compact":""}">
        <div class="fmap-canvas"></div>
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
      <div class="fmap-legend"></div>`;const m=i.map(e.querySelector(".fmap-canvas"),{zoomControl:!0,attributionControl:!0,scrollWheelZoom:!1});m.on("click",()=>m.scrollWheelZoom.enable()),m.on("mouseout",()=>m.scrollWheelZoom.disable()),i.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",{maxZoom:19,attribution:"&copy; OpenStreetMap &copy; CARTO"}).addTo(m),s={map:m,markers:new Map,L:i},O.set(e,s)}const c=new Set,u=[];for(const m of n){const p=m.location,y=p.live?"#0ca30c":"#fab219";c.add(m.vehicleId),u.push([p.lat,p.lng]);const g=`
      <strong>${S(m.vehicleName)}</strong><br>
      ${S(m.vehicleNumber||"")} · ${p.live?"Live now":p.ageMinutes+" min ago"}<br>
      ${p.label?S(p.label)+"<br>":""}
      ${p.speedKph?Math.round(p.speedKph)+" km/h<br>":""}
      <small>${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}</small>
      ${r?"<br><em>Sample position</em>":""}`;let h=s.markers.get(m.vehicleId);h?(h.setLatLng([p.lat,p.lng]),h.setIcon(ge(s.L,m,y,r)),h.setPopupContent(g)):(h=s.L.marker([p.lat,p.lng],{icon:ge(s.L,m,y,r)}).addTo(s.map).bindPopup(g),s.markers.set(m.vehicleId,h))}for(const[m,p]of s.markers)c.has(m)||(p.remove(),s.markers.delete(m));!s.framed&&u.length&&(u.length===1?s.map.setView(u[0],12):s.map.fitBounds(u,{padding:o?[30,30]:[55,55]}),s.framed=!0),setTimeout(()=>s.map.invalidateSize(),60);const b=t.total-n.length;return e.querySelector(".fmap-legend").innerHTML=r?`<span><i style="background:#fab219"></i>Sample data</span>
       <span class="fmap-note">Tap a bus for its detail</span>`:`<span><i style="background:#0ca30c"></i>Live</span>
       <span><i style="background:#fab219"></i>Last seen earlier</span>
       ${b?`<span><i style="background:#94a3b8"></i>${b} not reporting</span>`:""}
       <span class="fmap-note">Tap a bus for its detail</span>`,a&&(a.textContent=r?`Sample positions · ${n.length} bus${n.length===1?"":"es"} shown`:`${t.reporting} of ${t.total} reporting`),!0}let P=null;function Oe(e){var t;return(t=window.google)!=null&&t.maps?Promise.resolve(window.google.maps):P||(P=new Promise((n,a)=>{const o=document.createElement("script");o.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(e)}&loading=async&v=weekly`,o.async=!0,o.onload=()=>{var r;return(r=window.google)!=null&&r.maps?n(window.google.maps):a(new Error("Maps API loaded but unavailable"))},o.onerror=()=>a(new Error("Could not load Google Maps — check the API key and its referrer restrictions")),document.head.appendChild(o)}).catch(n=>{throw P=null,n}),P)}function te(e){const t=`
    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="56" viewBox="0 0 44 56">
      <path d="M22,54 L13,38 h18 z" fill="${e}"/>
      <circle cx="22" cy="21" r="18" fill="${e}" stroke="#0b1220" stroke-width="2.5"/>
      <rect x="13" y="11" width="18" height="16" rx="3" fill="#ffffff"/>
      <rect x="15.2" y="13" width="13.6" height="6" rx="1.4" fill="${e}"/>
      <rect x="15.2" y="20.6" width="13.6" height="2" rx="0.9" fill="${e}" opacity="0.45"/>
      <circle cx="17" cy="28.4" r="2.3" fill="#0b1220"/>
      <circle cx="27" cy="28.4" r="2.3" fill="#0b1220"/>
    </svg>`;return"data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(t.trim())}const O=new WeakMap,Ue={lat:9.9312,lng:76.2673,zoom:9},ye=[{label:"Kochi",lat:9.9312,lng:76.2673},{label:"Munnar",lat:10.0889,lng:77.0595},{label:"Thrissur",lat:10.5276,lng:76.2144},{label:"Alappuzha",lat:9.4981,lng:76.3388},{label:"Kottayam",lat:9.5916,lng:76.5222},{label:"Palakkad",lat:10.7867,lng:76.6548},{label:"Kozhikode",lat:11.2588,lng:75.7804},{label:"Thekkady",lat:9.5939,lng:77.16},{label:"Kollam",lat:8.8932,lng:76.6141},{label:"Wayanad",lat:11.6854,lng:76.132}];function He(e){return e.map((t,n)=>{const a=ye[(Number(t.vehicleId)+n)%ye.length];return{...t,location:{lat:a.lat,lng:a.lng,label:a.label,live:n%3!==2,ageMinutes:n%3===2?40+n*7:0,speedKph:n%3===2?0:30+n*9,sample:!0}}})}function je(){if(document.getElementById(ue))return;const e=document.createElement("style");e.id=ue,e.textContent=`
    .fmap { position: relative; border-radius: 14px; overflow: hidden;
            border: 1px solid rgba(255,255,255,0.12); }
    .fmap svg { display: block; width: 100%; height: auto; }

    /* Google Maps needs a laid-out box with a real height — given none it
       renders as a zero-height strip and looks broken. */
    .fmap-live .fmap-canvas { width: 100%; height: 420px; background: #1c2c48; }
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
    .fmap-pin span {
      font-size: 10px; font-weight: 800; color: #f8fafc; white-space: nowrap;
      background: rgba(9,15,28,0.85); padding: 1px 6px; border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.16);
    }
    .fmap-pin.is-sample img { opacity: 0.9; }

    /* Leaflet's own chrome, toned to the portals. */
    .fmap-live .leaflet-container { background: #0b1220; font-family: inherit; }
    .fmap-live .leaflet-control-attribution {
      background: rgba(9,15,28,0.8); color: #94a3b8; font-size: 9.5px;
    }
    .fmap-live .leaflet-control-attribution a { color: #93c5fd; }
    .fmap-live .leaflet-popup-content-wrapper,
    .fmap-live .leaflet-popup-tip { background: #1c2c48; color: #e2e8f0; }
    .fmap-live .leaflet-popup-content { font-size: 12px; line-height: 1.5; margin: 10px 12px; }
    .fmap-live .leaflet-popup-content small { color: #94a3b8; }
    .fmap-live .leaflet-bar a {
      background: #1c2c48; color: #e2e8f0; border-bottom-color: rgba(255,255,255,0.14);
    }
    .fmap-live .leaflet-bar a:hover { background: #263a5c; }

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
  `,document.head.appendChild(e)}function S(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function Ve(e,t,{noteEl:n,compact:a}){const{lat:o,lng:r,zoom:i}=Ue,s=`https://www.google.com/maps?q=${o},${r}&hl=en&z=${i}&output=embed`;n&&(n.textContent=t.total?"No bus has reported a position yet":""),e.innerHTML=`
    <div class="fmap fmap-live${a?" is-compact":""}">
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
    </div>`}function z(e,t,n,{noteEl:a,compact:o,sample:r=!1}){const i=Number(e.dataset.fleetMapBus),s=n.find(p=>p.vehicleId===i)||n.find(p=>p.location.live)||n[0];e.dataset.fleetMapBus=String(s.vehicleId);const c=s.location,u=`https://www.google.com/maps?q=${c.lat},${c.lng}&hl=en&z=${o?13:14}&output=embed`,b=n.map(p=>{const y=p.vehicleId===s.vehicleId,g=p.location.live;return`
      <button type="button" class="fmap-chip${y?" is-on":""}"
              data-fleet-map-bus="${p.vehicleId}">
        <i style="background:${g?"#0ca30c":"#fab219"}"></i>
        ${S(p.vehicleNumber||p.vehicleName)}
        <span>${g?"live":p.location.ageMinutes+"m"}</span>
      </button>`}).join(""),m=t.total-n.length;e.innerHTML=`
    ${n.length>1?`<div class="fmap-chips">${b}</div>`:""}
    <div class="fmap fmap-live${o?" is-compact":""}">
      <iframe class="fmap-embed" src="${u}" title="Map of ${S(s.vehicleName)}"
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
         href="https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}">
        Open in Google Maps ↗</a>
    </div>`,e.querySelectorAll("[data-fleet-map-bus]").forEach(p=>p.addEventListener("click",()=>{e.dataset.fleetMapBus=p.dataset.fleetMapBus,z(e,t,n,{noteEl:a,compact:o,sample:r})})),a&&(a.textContent=r?`Sample positions · showing ${s.vehicleNumber||s.vehicleName} near ${c.label}`:`${t.reporting} of ${t.total} reporting · showing ${s.vehicleNumber||s.vehicleName}${c.label?" near "+c.label:""}`)}async function Re(e,t,n,{noteEl:a,compact:o,apiKey:r}){let i;try{i=await Oe(r)}catch(y){return console.warn("[fleet-map]",y.message),!1}let s=O.get(e);if(!s){e.innerHTML=`<div class="fmap fmap-live${o?" is-compact":""}"><div class="fmap-canvas"></div></div>`;const y=e.querySelector(".fmap-canvas");s={map:new i.Map(y,{center:{lat:n[0].location.lat,lng:n[0].location.lng},zoom:12,styles:Fe,mapTypeControl:!o,streetViewControl:!1,fullscreenControl:!o,zoomControl:!0,backgroundColor:"#1c2c48",gestureHandling:"cooperative"}),markers:new Map,info:new i.InfoWindow},O.set(e,s)}const c=new Set,u=new i.LatLngBounds;for(const y of n){const g=y.location,h=g.live?"#0ca30c":"#fab219",L={lat:g.lat,lng:g.lng};u.extend(L),c.add(y.vehicleId);const E=y.vehicleNumber||y.vehicleName,C=`${g.live?"Live now":g.ageMinutes+" min ago"}${g.label?" · "+S(g.label):""}${g.speedKph?" · "+Math.round(g.speedKph)+" km/h":""}`;let k=s.markers.get(y.vehicleId);k?(k.setPosition(L),k.setIcon({url:te(h),scaledSize:new i.Size(34,43),anchor:new i.Point(17,43)})):(k=new i.Marker({map:s.map,position:L,title:`${y.vehicleName} · ${C.replace(/<[^>]*>/g,"")}`,icon:{url:te(h),scaledSize:new i.Size(34,43),anchor:new i.Point(17,43)},zIndex:g.live?2:1}),s.markers.set(y.vehicleId,k)),k.addListener("click",()=>{s.info.setContent(`<div style="font-family:system-ui;color:#0b1220;min-width:150px">
           <strong style="font-size:13px">${S(y.vehicleName)}</strong><br>
           <span style="font-size:11px;color:#475569">${S(E)} · ${C}</span><br>
           <span style="font-size:10.5px;color:#64748b">${g.lat.toFixed(5)}, ${g.lng.toFixed(5)}</span>
         </div>`),s.info.open({map:s.map,anchor:k})})}for(const[y,g]of s.markers)c.has(y)||(g.setMap(null),s.markers.delete(y));s.framed||(n.length===1?(s.map.setCenter(u.getCenter()),s.map.setZoom(13)):s.map.fitBounds(u,o?24:48),s.framed=!0),a&&(a.textContent=`${t.reporting} of ${t.total} reporting · live map`);const b=t.total-n.length,m=e.querySelector(".fmap-legend"),p=`
    <span><i style="background:#0ca30c"></i>Live</span>
    <span><i style="background:#fab219"></i>Last seen earlier</span>
    ${b?`<span><i style="background:#94a3b8"></i>${b} not reporting</span>`:""}
    <span class="fmap-note">Tap a bus for its detail</span>`;return m?m.innerHTML=p:e.insertAdjacentHTML("beforeend",`<div class="fmap-legend">${p}</div>`),!0}function ze(e,t,{noteEl:n=null,compact:a=!1,apiKey:o=""}={}){if(!e)return;je();const r=((t==null?void 0:t.vehicles)||[]).filter(i=>i.location);if(!r.length){O.delete(e);const i=(t==null?void 0:t.vehicles)||[];if(!i.length){delete e.dataset.fleetMapBus,Ve(e,t,{noteEl:n,compact:a});return}const s=He(i),c={...t,reporting:0,total:i.length};Q(e,c,s,{noteEl:n,compact:a,sample:!0}).then(u=>{u||z(e,c,s,{noteEl:n,compact:a,sample:!0})});return}if(o){Re(e,t,r,{noteEl:n,compact:a,apiKey:o}).then(i=>{if(!i)return Q(e,t,r,{noteEl:n,compact:a,sample:!1}).then(s=>{s||z(e,t,r,{noteEl:n,compact:a})})});return}Q(e,t,r,{noteEl:n,compact:a,sample:!1}).then(i=>{i||z(e,t,r,{noteEl:n,compact:a})})}const v=window.location.origin.includes("3005")?"http://localhost:3000/api":window.location.origin+"/api";let l={currentUser:JSON.parse(sessionStorage.getItem("tripnix_user")||"null"),vehicles:[],bookings:[],admins:[],plans:null,subscription:null,accounts:null,accountCategories:null,tracking:null,agencySubs:[],trips:[],activeTab:"dashboard",fleetFilter:"All",searchQuery:"",editingVehicleId:null,vehicleFormImages:[],vehicleFormVideos:[],diaryVehicleId:null,diary:null};const ve=document.getElementById("login-screen"),be=document.getElementById("app-layout"),we=document.getElementById("login-form"),X=document.getElementById("login-error"),qe=document.getElementById("logout-btn"),$e=document.querySelectorAll(".nav-item"),Ye=document.querySelectorAll(".tab-page"),fe=document.getElementById("nav-admins"),Ge=document.getElementById("page-title"),Ke=document.getElementById("page-subtitle"),he=document.getElementById("pending-badge"),We=document.getElementById("refresh-btn"),ne=document.getElementById("add-vehicle-header-btn"),Ee=document.getElementById("vehicle-modal"),_e=document.getElementById("modal-title"),Je=document.getElementById("modal-close-btn"),Ze=document.getElementById("modal-cancel-btn"),Ie=document.getElementById("vehicle-form"),ae=document.getElementById("create-admin-form");document.addEventListener("DOMContentLoaded",()=>{rt(),pt(),Qe(),Xe()});function Qe(){const e=document.getElementById("register-link");e&&(e.href=window.location.origin.includes("3005")?"http://localhost:3000/":window.location.origin+"/")}function Xe(){l.currentUser?Be():xe()}function xe(){ve.classList.remove("hidden"),be.classList.add("hidden")}function Be(){ve.classList.add("hidden"),be.classList.remove("hidden"),et(),D()}function et(){const e=l.currentUser;if(!e)return;const t=e.operatorName||"Travel Agency",n=e.username||"admin",a=t.charAt(0).toUpperCase(),o=document.getElementById("agency-identity-block");o&&o.classList.remove("hidden"),document.getElementById("agency-avatar-letter").textContent=a,document.getElementById("agency-name-display").textContent=t,document.getElementById("agency-username-display").textContent="@"+n;const r=document.getElementById("profile-logout-row");r&&r.classList.remove("hidden"),document.getElementById("profile-mini-avatar").textContent=a,document.getElementById("profile-mini-name").textContent=t,document.getElementById("profile-mini-username").textContent="@"+n;const i=document.getElementById("hero-agency-name");i&&(i.textContent=t),e.role==="superadmin"?fe.classList.remove("hidden"):(fe.classList.add("hidden"),l.activeTab==="admins"&&ie("dashboard"))}async function tt(e){e.preventDefault(),X.classList.add("hidden");const t=document.getElementById("login-username").value.trim(),n=document.getElementById("login-password").value.trim(),a=document.getElementById("login-submit-btn");a.textContent="Signing in…",a.disabled=!0;try{const o=await fetch(`${v}/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:t,password:n})});let r=null;try{r=await o.json()}catch{r=null}if(!o.ok)throw new Error((r==null?void 0:r.error)||"Invalid username or password");if(!r)throw new Error("Invalid response from backend server");l.currentUser=r,sessionStorage.setItem("tripnix_user",JSON.stringify(r)),we.reset(),Be()}catch(o){X.textContent="⚠️ "+o.message,X.classList.remove("hidden")}finally{a.textContent="Sign In",a.disabled=!1}}function nt(){l.currentUser=null,l.vehicles=[],l.bookings=[],l.admins=[],sessionStorage.removeItem("tripnix_user");const e=document.getElementById("agency-identity-block"),t=document.getElementById("profile-logout-row");e&&e.classList.add("hidden"),t&&t.classList.add("hidden"),document.getElementById("agency-avatar-letter").textContent="",document.getElementById("agency-name-display").textContent="",document.getElementById("agency-username-display").textContent="",document.getElementById("profile-mini-avatar").textContent="",document.getElementById("profile-mini-name").textContent="",document.getElementById("profile-mini-username").textContent="",xe()}function at(){const e=document.getElementById("sidebar"),t=document.getElementById("sidebar-overlay");if(!e||!t)return;e.classList.contains("active")?Y():ot()}function ot(){const e=document.getElementById("sidebar"),t=document.getElementById("sidebar-overlay");e&&e.classList.add("active"),t&&t.classList.add("active")}function Y(){const e=document.getElementById("sidebar"),t=document.getElementById("sidebar-overlay");e&&e.classList.remove("active"),t&&t.classList.remove("active")}function rt(){$e.forEach(e=>{e.addEventListener("click",()=>{ie(e.getAttribute("data-tab"))})})}function ie(e){l.activeTab=e,Y(),$e.forEach(n=>{n.classList.toggle("active",n.getAttribute("data-tab")===e)}),Ye.forEach(n=>{n.classList.toggle("active",n.id===`tab-${e}`)});const t={dashboard:["Dashboard Overview","Real-time bus schedules and fleet operations"],fleet:["Fleet Management","Add buses, edit details, and post available dates"],bookings:["Customer Bookings","Review and manage booking requests"],trips:["Trips","Post trips that appear in the traveller app story bar"],schedule:["Bus Diary","The running schedule for each bus in your fleet"],accounts:["Accounts","What the diary earned, against what you have paid Tripnix"],gps:["GPS Tracking","Where every bus last reported from"],subscription:["Subscription & Plans","Platform membership and the fleet plan"],admins:["Manage Travel Owners","Create and manage Travel Owner login credentials"]};t[e]&&(Ge.textContent=t[e][0],Ke.textContent=t[e][1]),e==="admins"&&J(),e==="subscription"&&_(),e==="trips"&&W(),e==="schedule"&&se(),e==="accounts"&&K(),e==="gps"&&ct()}async function K(e){var n;const t=(n=l.currentUser)==null?void 0:n.operatorName;if(t)try{const a=e?`&month=${encodeURIComponent(e)}`:"",o=await fetch(`${v}/accounts?operatorName=${encodeURIComponent(t)}${a}`);if(!o.ok)throw new Error("Could not load accounts");if(l.accounts=await o.json(),!l.accountCategories){const r=await fetch(`${v}/accounts/categories`);r.ok&&(l.accountCategories=await r.json())}lt()}catch(a){document.getElementById("acc-breakdown").innerHTML=`<p class="diary-empty">❌ ${d(a.message)}</p>`}}function it(){var e;if(!l.vehicles.length)return alert("❌ Add a bus to your fleet first.");document.getElementById("acc-entry-date").value=new Date().toISOString().slice(0,10),document.getElementById("acc-entry-amount").value="",document.getElementById("acc-entry-note").value="",ke(((e=document.querySelector('input[name="acc-kind"]:checked'))==null?void 0:e.value)||"income"),document.getElementById("acc-entry-modal").classList.remove("hidden"),document.getElementById("acc-entry-amount").focus()}function oe(){document.getElementById("acc-entry-modal").classList.add("hidden"),document.getElementById("acc-entry-form").reset()}function ke(e){var a,o;const t=((o=(a=l.accountCategories)==null?void 0:a.categories)==null?void 0:o[e])||[];document.getElementById("acc-entry-category").innerHTML=t.map(r=>`<option>${d(r)}</option>`).join("");const n=l.vehicles.map(r=>`<option value="${r.id}">${d(r.name)} · ${d(r.vehicleNumber||"—")}</option>`);document.getElementById("acc-entry-vehicle").innerHTML=e==="capital"?n.join(""):'<option value="">Whole agency</option>'+n.join(""),document.getElementById("acc-entry-vehicle-req").textContent=e==="capital"?"*":"",document.getElementById("acc-entry-hint").textContent=e==="capital"?"What the bus cost to buy. Recorded once, not as a monthly expense — it is the sum the bus has to earn back.":e==="income"?"Money in that is not already a diary order — a private contract, a rental, anything else.":"Money out: fuel, driver wages, servicing, insurance, an EMI. Leave the bus blank for costs that cover the whole agency."}async function st(e){e.preventDefault();const t=document.getElementById("acc-entry-save"),n=t.textContent;t.disabled=!0,t.textContent="Saving…";try{const a=await fetch(`${v}/accounts/entries`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({operatorName:l.currentUser.operatorName,kind:document.querySelector('input[name="acc-kind"]:checked').value,vehicleId:document.getElementById("acc-entry-vehicle").value||null,amount:document.getElementById("acc-entry-amount").value,date:document.getElementById("acc-entry-date").value,category:document.getElementById("acc-entry-category").value,note:document.getElementById("acc-entry-note").value.trim()})}),o=await a.json().catch(()=>null);if(!a.ok)throw new Error((o==null?void 0:o.error)||"Could not save this entry");oe(),await K(String(o.date).slice(0,7))}catch(a){alert("❌ "+a.message)}finally{t.disabled=!1,t.textContent=n}}window.removeAccEntry=async function(e){var t;if(confirm("Remove this entry from the books?"))try{if(!(await fetch(`${v}/accounts/entries/${e}?operatorName=${encodeURIComponent(l.currentUser.operatorName)}`,{method:"DELETE"})).ok)throw new Error("Could not remove this entry");await K((t=l.accounts)==null?void 0:t.month)}catch(n){alert("❌ "+n.message)}};function lt(){const e=l.accounts;if(!e)return;const t=document.getElementById("acc-month");t&&document.activeElement!==t&&(t.innerHTML=e.availableMonths.length?e.availableMonths.map(a=>`<option value="${a.value}" ${a.value===e.month?"selected":""}>${d(a.label)}</option>`).join(""):`<option>${d(e.monthLabel)}</option>`),document.getElementById("acc-stats").innerHTML=`
    <div class="stat-card"><span class="stat-icon">📥</span><div><strong>${f(e.income.total)}</strong><span>Money in</span></div></div>
    <div class="stat-card"><span class="stat-icon">📤</span><div><strong>${f(e.expense.total)}</strong><span>Money out</span></div></div>
    <div class="stat-card"><span class="stat-icon">${e.profit<0?"📉":"📈"}</span><div><strong>${f(e.profit)}</strong><span>Profit · ${e.margin}%</span></div></div>
    <div class="stat-card"><span class="stat-icon">📕</span><div><strong>${e.income.orders}</strong><span>Orders</span></div></div>`,document.getElementById("acc-breakdown").innerHTML=`
    <div class="diary-row"><div class="diary-row-main">Diary fares (${e.income.orders})</div><strong>${f(e.income.trips)}</strong></div>
    <div class="diary-row"><div class="diary-row-main">Other income</div><strong>${f(e.income.other)}</strong></div>
    <div class="diary-row"><div class="diary-row-main">App bookings (${e.income.appBookings})</div><span style="color:var(--text-muted);font-style:italic;">no fare recorded</span></div>
    <div class="diary-row"><div class="diary-row-main">Expenses</div><strong>− ${f(e.expense.total)}</strong></div>
    <div class="diary-row" style="border-bottom:none;padding-top:14px;">
      <div class="diary-row-main"><strong>${d(e.monthLabel)} profit</strong></div>
      <strong style="font-size:20px;color:${e.profit<0?"var(--accent-red)":"var(--accent-green)"};">${f(e.profit)}</strong>
    </div>
    ${e.expense.byCategory.length?`
      <p class="panel-header-note" style="margin-top:14px;">Spent on:
        ${e.expense.byCategory.map(a=>`${d(a.category)} ${f(a.amount)}`).join(" · ")}
      </p>`:""}
    <p class="panel-header-note" style="margin-top:10px;line-height:1.6;">
      Diary fares come from the Bus Diary automatically. App bookings carry no fare — travellers
      book without a rate, so nothing is invented for them. Capital and expenses are managed by
      the owner in the Owner Portal.
    </p>`,document.getElementById("acc-vehicles").innerHTML=e.perVehicle.length?e.perVehicle.map(a=>`
        <div class="diary-row">
          <div class="diary-row-main">
            <strong>${d(a.vehicleName)}</strong>
            <div class="diary-row-who">${a.orders} order${a.orders===1?"":"s"} · in ${f(a.income)} · out ${f(a.expense)}</div>
          </div>
          <strong style="color:${a.profit<0?"var(--accent-red)":"inherit"};">${f(a.profit)}</strong>
        </div>`).join(""):'<p class="diary-empty">No buses yet.</p>';const n=[...e.entries.orders.map(a=>({...a,kindLabel:"Diary fare",sign:"+"})),...e.entries.manual.map(a=>({...a,kindLabel:a.source==="income"?"Income":"Expense",sign:a.source==="expense"?"−":"+"}))].sort((a,o)=>String(a.date).localeCompare(String(o.date)));document.getElementById("acc-entries").innerHTML=n.length?n.map(a=>`
        <div class="diary-row">
          <div class="diary-row-main">
            <strong>${d(a.label)}</strong>
            <div class="diary-row-who">
              ${d(a.kindLabel)} · ${d(a.vehicleName||"Whole agency")} ·
              ${x(a.date)}${a.detail?" · "+d(a.detail):""}
            </div>
          </div>
          <div class="diary-row-status">
            <strong style="color:${a.sign==="−"?"var(--accent-red)":"inherit"};">${a.sign}${f(a.amount)}</strong>
            ${a.source==="diary"?"":`<div class="diary-row-actions">
                   <button class="btn btn-secondary btn-sm" style="color:var(--accent-red);"
                           onclick="removeAccEntry(${a.id})">🗑️</button>
                 </div>`}
          </div>
        </div>`).join(""):'<p class="diary-empty">Nothing recorded for this month yet. Use ➕ Add entry to record fuel, wages, servicing or extra income.</p>'}async function ct(){var t;const e=(t=l.currentUser)==null?void 0:t.operatorName;if(e)try{if(l.mapsApiKey===void 0){const a=await fetch(`${v}/tracking/config`).catch(()=>null),o=a!=null&&a.ok?await a.json():null;l.mapsApiKey=(o==null?void 0:o.mapsApiKey)||""}const n=await fetch(`${v}/tracking?operatorName=${encodeURIComponent(e)}`);if(!n.ok)throw new Error("Could not load tracking");l.tracking=await n.json(),dt()}catch(n){document.getElementById("gps-list").innerHTML=`<p class="diary-empty">❌ ${d(n.message)}</p>`}}function dt(){const e=l.tracking;e&&(ze(document.getElementById("gps-map"),e,{noteEl:document.getElementById("gps-map-note"),apiKey:l.mapsApiKey}),document.getElementById("gps-note").textContent=`${e.reporting} of ${e.total} reporting · live for ${e.staleAfterMinutes} minutes after the last fix`,document.getElementById("gps-endpoint").textContent=`POST ${v}/tracking/vehicles/<vehicleId>
Content-Type: application/json

{ "lat": 9.9312, "lng": 76.2673, "speedKph": 42, "label": "Kochi" }`,document.getElementById("gps-list").innerHTML=e.vehicles.length?e.vehicles.map(t=>{const n=t.location,a=n?n.live?'<span class="badge-status confirmed">LIVE</span>':`<span class="badge-status cancelled">${n.ageMinutes} MIN AGO</span>`:'<span class="badge-status pending">NO SIGNAL</span>',o=n?`${n.label?d(n.label)+" · ":""}${n.lat.toFixed(5)}, ${n.lng.toFixed(5)}${n.speedKph?" · "+Math.round(n.speedKph)+" km/h":""}`:"This bus has never reported a position",r=n?` · <a href="https://www.google.com/maps?q=${n.lat},${n.lng}" target="_blank" rel="noopener">Open map ↗</a>`:"";return`
          <div class="diary-row">
            <div class="diary-row-main">
              <strong>${d(t.vehicleName)}</strong>
              <code class="vehicle-number">${d(t.vehicleNumber||"—")}</code>
              <div class="diary-row-who">${o}${r}</div>
            </div>
            <div class="diary-row-status">${a}</div>
          </div>`}).join(""):'<p class="diary-empty">No buses in the fleet yet.</p>')}function pt(){var e,t,n,a,o,r,i,s,c,u,b,m,p,y,g,h,L,E,C,k,B,A,pe,me;we.addEventListener("submit",tt),qe.addEventListener("click",nt),(e=document.getElementById("sidebar-toggle-btn"))==null||e.addEventListener("click",at),(t=document.getElementById("sidebar-overlay"))==null||t.addEventListener("click",Y),(n=document.getElementById("sidebar-close-btn"))==null||n.addEventListener("click",Y),We.addEventListener("click",D),ne.addEventListener("click",()=>{if(l.subscription&&!de()){alert(`🔒 Your agency is not registered yet.

The yearly platform fee is paid on the Tripnix site. See the Subscription page for the link.`),ie("subscription");return}Me()}),Je.addEventListener("click",G),Ze.addEventListener("click",G),(a=document.getElementById("diary-add-btn"))==null||a.addEventListener("click",()=>le()),(o=document.getElementById("diary-modal-close"))==null||o.addEventListener("click",re),(r=document.getElementById("diary-modal-cancel"))==null||r.addEventListener("click",re),(i=document.getElementById("diary-form"))==null||i.addEventListener("submit",wt),(s=document.getElementById("acc-month"))==null||s.addEventListener("change",$=>K($.target.value)),(c=document.getElementById("acc-add-btn"))==null||c.addEventListener("click",it),(u=document.getElementById("acc-entry-close"))==null||u.addEventListener("click",oe),(b=document.getElementById("acc-entry-cancel"))==null||b.addEventListener("click",oe),(m=document.getElementById("acc-entry-form"))==null||m.addEventListener("submit",st),document.querySelectorAll('input[name="acc-kind"]').forEach($=>$.addEventListener("change",N=>ke(N.target.value))),(p=document.getElementById("diary-from"))==null||p.addEventListener("change",$=>{const N=document.getElementById("diary-to");N&&(!N.value||N.value<$.target.value)&&(N.value=$.target.value)}),document.querySelectorAll(".filter-chips .chip[data-filter]").forEach($=>{$.addEventListener("click",()=>{document.querySelectorAll(".filter-chips .chip[data-filter]").forEach(N=>N.classList.remove("active")),$.classList.add("active"),l.fleetFilter=$.getAttribute("data-filter"),l.seatFilter="All",renderFleetSeatFilterChips(),U()})}),document.getElementById("fleet-search").addEventListener("input",$=>{l.searchQuery=$.target.value,U()}),(y=document.getElementById("vehicle-number"))==null||y.addEventListener("input",$=>{$.target.value=$.target.value.toUpperCase()}),Ie.addEventListener("submit",jt),(g=document.getElementById("upload-images-btn"))==null||g.addEventListener("click",()=>{var $;($=document.getElementById("vehicle-images-input"))==null||$.click()}),(h=document.getElementById("upload-videos-btn"))==null||h.addEventListener("click",()=>{var $;($=document.getElementById("vehicle-videos-input"))==null||$.click()}),(L=document.getElementById("vehicle-images-input"))==null||L.addEventListener("change",gt),(E=document.getElementById("vehicle-videos-input"))==null||E.addEventListener("change",yt),(C=document.getElementById("vehicle-type"))==null||C.addEventListener("change",H),(k=document.getElementById("vehicle-capacity"))==null||k.addEventListener("input",H),ae&&ae.addEventListener("submit",Mt),(B=document.getElementById("pricing-form"))==null||B.addEventListener("submit",Nt),(A=document.getElementById("trip-form"))==null||A.addEventListener("submit",xt),(pe=document.getElementById("trip-image-btn"))==null||pe.addEventListener("click",()=>{var $;($=document.getElementById("trip-image-input"))==null||$.click()}),(me=document.getElementById("trip-image-input"))==null||me.addEventListener("change",$t),mt()}function mt(){const e=document.getElementById("vehicle-type-dropdown"),t=document.getElementById("vehicle-type-trigger"),n=document.getElementById("vehicle-type-menu"),a=document.getElementById("vehicle-type"),o=document.getElementById("selected-type-icon"),r=document.getElementById("selected-type-text"),i=n==null?void 0:n.querySelectorAll(".custom-dropdown-item");if(!t||!n||!a)return;const s={Bus:"🚌",Traveller:"🚐",Car:"🚗"},c={Bus:[{label:"12 Seats",value:12},{label:"22 Seats",value:22},{label:"36 Seats",value:36},{label:"49 Seats",value:49},{label:"Above 49 Seats",value:50,isAbove:!0}],Traveller:[{label:"12 Seats",value:12},{label:"14 Seats",value:14},{label:"16 Seats",value:16},{label:"18 Seats",value:18}],Car:[{label:"4 Seats",value:4},{label:"7 Seats",value:7},{label:"8 Seats",value:8}]};function u(m){var E;const p=document.getElementById("vehicle-seat-options"),y=document.getElementById("vehicle-capacity");if(!p||!y)return;const g=m||((E=document.getElementById("vehicle-type"))==null?void 0:E.value)||"Bus",h=c[g]||c.Bus,L=Number(y.value)||0;p.innerHTML=h.map(C=>`
      <button type="button" class="seat-option-pill${(C.isAbove?L>49:L===C.value)?" active":""}"
              onclick="selectVehicleSeatPill(${C.value}, ${C.isAbove?"true":"false"})">
        ${d(C.label)}
      </button>`).join("")}window.selectVehicleSeatPill=function(m,p){const y=document.getElementById("vehicle-capacity");y&&(y.value=m,u(),H())};function b(){const m=document.getElementById("seat-filter-chips");if(!m)return;const p=l.fleetFilter,y=c[p];if(!y||!y.length){m.innerHTML="",l.seatFilter="All";return}m.innerHTML=`
    <button type="button" class="chip${l.seatFilter==="All"?" active":""}" onclick="setFleetSeatFilter('All')">All Seats</button>
    ${y.map(g=>{const h=g.isAbove?"above49":String(g.value);return`
        <button type="button" class="chip${l.seatFilter===h?" active":""}" onclick="setFleetSeatFilter('${h}')">
          ${d(g.label)}
        </button>`}).join("")}
  `}window.setFleetSeatFilter=function(m){l.seatFilter=m,b(),U()},window.syncCustomTypeDropdown=function(m){const p=m||a.value||"Bus";a.value=p,o&&(o.textContent=s[p]||"🚌"),r&&(r.textContent=p),i==null||i.forEach(y=>{y.classList.toggle("selected",y.dataset.value===p)}),u(p),H()},t.addEventListener("click",m=>{m.stopPropagation(),e.classList.contains("open")?ee():ut()}),i==null||i.forEach(m=>{m.addEventListener("click",p=>{p.stopPropagation();const y=m.dataset.value;window.syncCustomTypeDropdown(y),ee()})}),document.addEventListener("click",m=>{e&&!e.contains(m.target)&&ee()})}function ut(){const e=document.getElementById("vehicle-type-dropdown"),t=document.getElementById("vehicle-type-menu");e==null||e.classList.add("open"),t==null||t.classList.remove("hidden")}function ee(){const e=document.getElementById("vehicle-type-dropdown"),t=document.getElementById("vehicle-type-menu");e==null||e.classList.remove("open"),t==null||t.classList.add("hidden")}async function Le(e,t){let n;try{n=await(await fetch(`${v}/uploads/config`)).json()}catch{throw new Error(`Could not reach the API at ${v}. Is the backend server running?`)}if(!n.configured)throw new Error("R2 storage is not configured on the server yet.");const a=n.maxDirectUploadBytes||4194304;if(e.size<=a){const s=new FormData;s.append("files",e);let c;try{c=await fetch(`${v}/uploads?folder=${encodeURIComponent(t)}`,{method:"POST",body:s})}catch{throw new Error(`Upload of "${e.name}" (${q(e.size)}) was cut off before it finished. Check that the backend is still running, then try again.`)}const u=await c.json().catch(()=>null);if(!c.ok)throw new Error((u==null?void 0:u.error)||`Upload failed (${c.status})`);return u.urls[0]}const o=await fetch(`${v}/uploads/presign`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fileName:e.name,contentType:e.type,folder:t})}),r=await o.json().catch(()=>null);if(!o.ok)throw new Error((r==null?void 0:r.error)||"Could not presign upload");let i;try{i=await fetch(r.uploadUrl,{method:"PUT",headers:{"Content-Type":e.type},body:e})}catch{throw new Error(`"${e.name}" is ${q(e.size)}, above this server's ${q(a)} direct-upload limit, so the browser must send it to Cloudflare R2 itself — and R2 refused the connection.

Add ${window.location.origin} to the bucket's CORS policy in the Cloudflare dashboard (R2 → tripnix → Settings → CORS), or upload a smaller file.`)}if(!i.ok)throw new Error(`Direct upload to R2 failed (${i.status}).`);return r.url}function q(e){return Number.isFinite(e)?e>=1048576?`${(e/1048576).toFixed(1)} MB`:`${Math.max(1,Math.round(e/1024))} KB`:"—"}async function Ce(e,t,n){const a=Array.from(e.target.files||[]);if(!a.length)return;const o=document.getElementById("media-upload-status"),r=i=>{o&&(o.textContent=i)};try{for(let i=0;i<a.length;i++){const s=a[i];r(`Uploading ${i+1} of ${a.length} — ${s.name} (${q(s.size)})…`);const c=await Le(s,t);l[n].push(c),j()}r("")}catch(i){r(""),alert("❌ "+i.message)}finally{e.target.value=""}}function gt(e){return Ce(e,"vehicles/images","vehicleFormImages")}function yt(e){return Ce(e,"vehicles/videos","vehicleFormVideos")}function j(){const e=document.getElementById("images-preview-grid"),t=document.getElementById("videos-preview-grid");e&&(e.innerHTML=l.vehicleFormImages.map((n,a)=>`
      <div class="media-preview-item">
        <img src="${d(n)}" alt="Vehicle image ${a+1}" />
        <button type="button" class="media-preview-remove" onclick="removeFormImage(${a})" title="Remove image">&times;</button>
      </div>
    `).join("")),t&&(t.innerHTML=l.vehicleFormVideos.map((n,a)=>`
      <div class="media-preview-item">
        <video src="${d(n)}" muted preload="metadata"></video>
        <button type="button" class="media-preview-remove" onclick="removeFormVideo(${a})" title="Remove video">&times;</button>
      </div>
    `).join(""))}window.removeFormImage=function(e){l.vehicleFormImages.splice(e,1),j()};window.removeFormVideo=function(e){l.vehicleFormVideos.splice(e,1),j()};async function D(){var e;try{const[t,n]=await Promise.all([fetch(`${v}/vehicles`),fetch(`${v}/bookings`)]);if(!t.ok||!n.ok)throw new Error("API error");const a=await t.json(),o=await n.json();if(l.currentUser&&l.currentUser.role!=="superadmin"){const r=l.currentUser.operatorName.toLowerCase();l.vehicles=a.filter(i=>i.operatorName.toLowerCase()===r),l.bookings=o.filter(i=>i.operatorName&&i.operatorName.toLowerCase()===r)}else l.vehicles=a,l.bookings=o;Ft(),U(),Pt(),await _(),await W(),((e=l.currentUser)==null?void 0:e.role)==="superadmin"&&await J()}catch(t){console.error("Load error:",t),alert("Cannot connect to backend (http://localhost:3000). Please start the backend first.")}}async function se(){var t,n,a;await D();const e=document.getElementById("diary-list");e&&(e.innerHTML='<p class="diary-empty">Loading agency diary…</p>');try{const o=((t=l.currentUser)==null?void 0:t.operatorName)||"",r=await fetch(`${v}/trips/agency-diary?operatorName=${encodeURIComponent(o)}`);if(!r.ok)throw new Error("Could not load agency diary");l.agencyDiaryData=await r.json();const i=((n=l.agencyDiaryData)==null?void 0:n.entries)||[],s=new Set;i.forEach(c=>{if(c.status==="Completed"||!c.departureDate||!c.arrivalDate)return;let u=new Date(`${c.departureDate}T00:00:00`);const b=new Date(`${c.arrivalDate}T00:00:00`);for(;u<=b;)s.add(u.toISOString().slice(0,10)),u.setDate(u.getDate()+1)}),l.diary={entries:i,latestTrip:((a=l.agencyDiaryData)==null?void 0:a.latestTrip)||null,bookedDates:Array.from(s)}}catch(o){l.diary=null,e&&(e.innerHTML=`<p class="diary-empty">❌ ${d(o.message)}</p>`);return}ft()}function ft(){ht(),vt(),bt()}function ht(){var a;const e=document.getElementById("latest-diary-trip-container");if(!e)return;const t=(a=l.diary)==null?void 0:a.latestTrip;if(!t){e.innerHTML=`
      <div class="latest-diary-card" style="background: rgba(30, 41, 59, 0.6); border-color: rgba(255, 255, 255, 0.1);">
        <div class="latest-diary-header">
          <div class="latest-diary-badge" style="color: #94a3b8; background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1);">
            🌟 LATEST AGENCY DIARY TRIP
          </div>
        </div>
        <p style="color: var(--text-muted); margin: 0; font-size: 14px;">
          No agency diary trips recorded yet. Click <strong>➕ Add Entry</strong> to record your first order.
        </p>
      </div>`;return}const n=t.status==="On Trip"?"confirmed":t.status==="Completed"?"cancelled":"pending";e.innerHTML=`
    <div class="latest-diary-card">
      <div class="latest-diary-header">
        <div class="latest-diary-badge">🌟 LATEST AGENCY DIARY TRIP</div>
        <span class="badge-status ${n}">${d(t.status)}</span>
      </div>
      <div class="latest-diary-body">
        <div class="latest-diary-main">
          <div class="latest-diary-place">📕 ${d(t.place||"Agency Order")}</div>
          <div class="latest-diary-customer">
            👤 <strong>${d(t.customerName||"Customer")}</strong>
            ${t.customerPhone?` · <a href="tel:${d(t.customerPhone)}">📞 ${d(t.customerPhone)}</a>`:""}
          </div>
          ${t.note?`<div class="latest-diary-note">📝 ${d(t.note)}</div>`:""}
        </div>
        <div class="latest-diary-meta">
          <div class="latest-diary-dates">
            <span class="meta-label">SCHEDULED DATES</span>
            <strong>${x(t.departureDate)} → ${x(t.arrivalDate)}</strong>
            <small>(${t.durationDays} day${t.durationDays===1?"":"s"})</small>
          </div>
          <div class="latest-diary-fare">
            <span class="meta-label">AGREED FARE</span>
            <strong class="fare-amount">${f(t.fare)}</strong>
          </div>
        </div>
      </div>
    </div>`}function vt(){const e=document.getElementById("diary-list"),t=document.getElementById("diary-summary");if(!e)return;const n=l.diary;if(!n){e.innerHTML="",t&&(t.innerHTML="");return}const a=n.entries.filter(i=>i.status!=="Completed"),o=n.entries.filter(i=>i.kind==="diary"),r=o.reduce((i,s)=>i+Number(s.fare||0),0);if(t&&(t.innerHTML=`
      <div class="diary-stat"><strong>${a.length}</strong><span>Active / Scheduled</span></div>
      <div class="diary-stat"><strong>${n.bookedDates.length}</strong><span>Days Booked</span></div>
      <div class="diary-stat"><strong>${o.length}</strong><span>Diary Orders</span></div>
      <div class="diary-stat"><strong>${f(r)}</strong><span>Total Fares</span></div>`),!n.entries.length){e.innerHTML='<p class="diary-empty">No orders in your agency diary yet. Use ➕ Add Entry to write an order, or tap a date on the calendar.</p>';return}e.innerHTML=n.entries.map(i=>{const s=i.status==="On Trip"?"confirmed":i.status==="Completed"?"cancelled":"pending",c=i.kind==="diary",u=i.customerPhone?` · <a href="tel:${d(i.customerPhone)}">${d(i.customerPhone)}</a>`:"";let b="";c||i.kind==="booking"?b=`<div class="diary-row-who">👤 ${d(i.customerName||"Customer")}${u}${i.fare?` · <strong>${f(i.fare)}</strong>`:""}</div>`:i.note&&(b=`<div class="diary-row-who">${d(i.note)}</div>`),c&&i.note&&(b+=`<div class="diary-row-who" style="color:var(--text-muted);">📝 ${d(i.note)}</div>`);const m=c?"📕 "+d(i.place||"Agency Order"):i.kind==="booking"?"📑 Customer booking":"🗺️ "+d(i.place||"Trip"),p=c?`<div class="diary-row-actions">
           <button class="btn btn-secondary btn-sm" onclick="editDiaryEntry(${i.id})">✏️ Edit</button>
           <button class="btn btn-secondary btn-sm" style="color:var(--accent-red);" onclick="deleteDiaryEntry(${i.id})">🗑️ Delete</button>
         </div>`:"";return`
      <div class="diary-row">
        <div class="diary-row-dates">
          <strong>${x(i.departureDate)}</strong>
          <span>→ ${x(i.arrivalDate)}</span>
          <small>${i.durationDays} day${i.durationDays===1?"":"s"}</small>
        </div>
        <div class="diary-row-main">
          <div class="diary-row-place">${m}</div>
          ${b}
        </div>
        <div class="diary-row-status">
          <span class="badge-status ${s}">${d(i.status)}</span>
          ${p}
        </div>
      </div>`}).join("")}function bt(){const e=document.getElementById("diary-calendar");if(!e)return;const t=l.diary;if(!t){e.innerHTML="";return}const n=new Set(t.bookedDates),a=new Date,o=[0,1].map(r=>new Date(a.getFullYear(),a.getMonth()+r,1));e.innerHTML=o.map(r=>{const i=r.toLocaleDateString(void 0,{month:"long",year:"numeric"}),s=new Date(r.getFullYear(),r.getMonth()+1,0).getDate(),c=(r.getDay()+6)%7,u=m=>(t.entries||[]).filter(p=>p.status!=="Completed"&&m>=p.departureDate&&m<=p.arrivalDate).map(p=>`${p.customerName||"Booked"}${p.place?" — "+p.place:""}`).join(" | "),b=[];for(let m=0;m<c;m++)b.push('<span class="diary-day is-blank"></span>');for(let m=1;m<=s;m++){const p=`${r.getFullYear()}-${String(r.getMonth()+1).padStart(2,"0")}-${String(m).padStart(2,"0")}`,y=n.has(p),g=y?`${p} — ${u(p)}`:`${p} — free, tap to write an order`;b.push(`<span class="diary-day${y?" is-booked":""}" title="${d(g)}"${y?"":` role="button" onclick="openDiaryModalForDate('${p}')"`}>${m}</span>`)}return`
      <div class="diary-month">
        <div class="diary-month-label">${d(i)}</div>
        <div class="diary-weekdays"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
        <div class="diary-grid">${b.join("")}</div>
      </div>`}).join("")}function le(e=null,t=null){const n=document.getElementById("diary-modal");if(!n)return;document.getElementById("diary-modal-title").textContent=e?"Edit Diary Entry":"New Diary Entry";const a=document.getElementById("diary-modal-bus");a&&(a.textContent="📕 Agency Travel Order"),document.getElementById("diary-entry-id").value=(e==null?void 0:e.id)??"",document.getElementById("diary-customer").value=(e==null?void 0:e.customerName)??"",document.getElementById("diary-phone").value=(e==null?void 0:e.customerPhone)??"",document.getElementById("diary-place").value=(e==null?void 0:e.place)??"",document.getElementById("diary-from").value=(e==null?void 0:e.departureDate)??t??"",document.getElementById("diary-to").value=(e==null?void 0:e.arrivalDate)??t??"",document.getElementById("diary-fare").value=e!=null&&e.fare?String(e.fare):"",document.getElementById("diary-note").value=(e==null?void 0:e.note)??"",document.getElementById("diary-save-btn").textContent=e?"Update Entry":"Save Entry",n.classList.remove("hidden"),document.getElementById("diary-customer").focus()}function re(){var e,t;(e=document.getElementById("diary-modal"))==null||e.classList.add("hidden"),(t=document.getElementById("diary-form"))==null||t.reset()}window.openDiaryModalForDate=function(e){le(null,e)};window.editDiaryEntry=function(e){var n;const t=(((n=l.diary)==null?void 0:n.entries)||[]).find(a=>a.id===e);t&&le(t)};window.deleteDiaryEntry=async function(e){var n;const t=(((n=l.diary)==null?void 0:n.entries)||[]).find(a=>a.id===e);if(t&&confirm(`Remove ${t.customerName||"this entry"} (${x(t.departureDate)} → ${x(t.arrivalDate)}) from the agency diary?`))try{if(!(await fetch(`${v}/trips/${e}`,{method:"DELETE"})).ok)throw new Error("Could not remove this entry");await se()}catch(a){alert("❌ "+a.message)}};async function wt(e){var r;e.preventDefault();const t=document.getElementById("diary-entry-id").value,n={operatorName:(r=l.currentUser)==null?void 0:r.operatorName,customerName:document.getElementById("diary-customer").value.trim(),customerPhone:document.getElementById("diary-phone").value.trim(),place:document.getElementById("diary-place").value.trim(),departureDate:document.getElementById("diary-from").value,arrivalDate:document.getElementById("diary-to").value,fare:document.getElementById("diary-fare").value,note:document.getElementById("diary-note").value.trim()},a=document.getElementById("diary-save-btn"),o=a.textContent;a.disabled=!0,a.textContent="Saving…";try{const i=await fetch(t?`${v}/trips/diary/${t}`:`${v}/trips/diary`,{method:t?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(n)}),s=await i.json().catch(()=>null);if(!i.ok)throw new Error((s==null?void 0:s.error)||"Could not save this entry");re(),await se()}catch(i){alert("❌ "+i.message)}finally{a.disabled=!1,a.textContent=o}}async function W(){var t;const e=(t=l.currentUser)==null?void 0:t.operatorName;if(e)try{const n=l.currentUser.role==="superadmin"?`${v}/trips`:`${v}/trips?operatorName=${encodeURIComponent(e)}`,a=await fetch(n);if(!a.ok)throw new Error("Failed to load trips");l.trips=await a.json(),Te(),It()}catch(n){console.error("Trips load error:",n)}}function Te(){const e=document.getElementById("trip-vehicle");if(!e)return;if(!l.vehicles.length){e.innerHTML='<option value="">No vehicles in your fleet yet</option>';return}const t=ce(),n=e.value;e.innerHTML=l.vehicles.map(a=>`
    <option value="${a.id}" ${t?"":"disabled"}>
      ${d(a.name)} · ${d(a.vehicleNumber||"—")}${t?"":"  (fleet fee not paid)"}
    </option>`).join(""),n&&(e.value=n)}async function $t(e){const t=(e.target.files||[])[0];if(!t)return;const n=document.getElementById("trip-image-status"),a=n==null?void 0:n.textContent;n&&(n.textContent="Uploading to R2…");try{const o=await Le(t,"trips");document.getElementById("trip-image").value=o,Se(),n&&(n.textContent="Uploaded ✓")}catch(o){n&&(n.textContent=a||""),alert("❌ "+o.message)}finally{e.target.value=""}}function Se(){const e=document.getElementById("trip-image-preview"),t=document.getElementById("trip-image").value.trim();e&&(e.innerHTML=t?`<img src="${d(t)}" alt="Trip image preview" onerror="this.style.display='none'" />`:"")}function Et(e){return e==="On Trip"?"confirmed":e==="Completed"?"cancelled":"pending"}function It(){const e=document.getElementById("trips-tbody"),t=document.getElementById("trips-count-note");if(!e)return;if(!l.trips.length){e.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">No trips posted yet.</td></tr>',t&&(t.textContent="");return}const n=l.trips.filter(a=>a.busListed&&a.status!=="Completed").length;t&&(t.textContent=`${n} of ${l.trips.length} showing in the app`),e.innerHTML=l.trips.map(a=>`
    <tr>
      <td>
        <strong>${d(a.place)}</strong><br>
        <small style="color:var(--text-muted);">${a.durationDays} day${a.durationDays===1?"":"s"}${a.note?" · "+d(a.note):""}</small>
      </td>
      <td>
        ${d(a.vehicleName||"—")}<br>
        <code class="vehicle-number">${d(a.vehicleNumber||"—")}</code>
      </td>
      <td>${x(a.departureDate)}</td>
      <td>${x(a.arrivalDate)}</td>
      <td>
        <span class="badge-status ${Et(a.status)}">${d(a.status)}</span>
        ${a.busListed?"":'<br><small style="color:var(--accent-red);">bus not subscribed</small>'}
      </td>
      <td>
        <button class="btn btn-secondary btn-sm" style="color:var(--accent-red);" onclick="deleteTrip(${a.id})">🗑️ Delete</button>
      </td>
    </tr>`).join("")}async function xt(e){e.preventDefault();const t=document.getElementById("trip-vehicle").value;if(!t)return alert("❌ Add a subscribed vehicle to your fleet first.");const n={operatorName:l.currentUser.operatorName,vehicleId:Number(t),place:document.getElementById("trip-place").value.trim(),departureDate:document.getElementById("trip-departure").value,arrivalDate:document.getElementById("trip-arrival").value,imageUrl:document.getElementById("trip-image").value.trim(),note:document.getElementById("trip-note").value.trim()};try{const a=await fetch(`${v}/trips`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(n)}),o=await a.json().catch(()=>null);if(!a.ok)throw new Error((o==null?void 0:o.error)||"Failed to post trip");document.getElementById("trip-form").reset(),Se(),await W(),alert(`✅ Trip to ${o.place} posted!

Bus: ${o.vehicleName} (${o.vehicleNumber})
Departs: ${x(o.departureDate)}
Arrives: ${x(o.arrivalDate)}
Status: ${o.status}`)}catch(a){alert("❌ "+a.message)}}window.deleteTrip=async function(e){if(confirm("Remove this trip from the traveller app?"))try{if(!(await fetch(`${v}/trips/${e}`,{method:"DELETE"})).ok)throw new Error("Failed to delete trip");await W()}catch(t){alert("❌ "+t.message)}};async function _(){var t;const e=(t=l.currentUser)==null?void 0:t.operatorName;if(e)try{const[n,a]=await Promise.all([fetch(`${v}/subscriptions/plans`),fetch(`${v}/subscriptions?operatorName=${encodeURIComponent(e)}`)]);if(!n.ok||!a.ok)throw new Error("Failed to load subscription data");if(l.plans=await n.json(),l.subscription=await a.json(),l.currentUser.role==="superadmin"){const o=await fetch(`${v}/subscriptions/overview`);o.ok&&(l.agencySubs=await o.json())}Bt()}catch(n){console.error("Subscription load error:",n)}}function f(e){var a;const t=((a=l.plans)==null?void 0:a.currencySymbol)||"₹",n=Number(e||0);return(n<0?"-":"")+t+Math.abs(n).toLocaleString("en-IN")}function x(e){return e?new Date(e).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}):"—"}function V(e){var a;const t=((a=l.plans)==null?void 0:a.fleetTiers)||[],n=Math.max(1,Number(e)||0);return t.find(o=>n>=o.minVehicles&&(o.maxVehicles===null||n<=o.maxVehicles))||t[t.length-1]||null}function I(){return l.vehicles.length}function R(){var e;return((e=l.subscription)==null?void 0:e.fleet)||null}function ce(){var e;return((e=R())==null?void 0:e.status)==="active"}function De({title:e,lead:t,planName:n,planSub:a,planPrice:o,lines:r=[],total:i,note:s,actionLabel:c}){return new Promise(u=>{const b=document.getElementById("payment-modal");if(!b)return u(!0);document.getElementById("payment-title").textContent=e,document.getElementById("payment-lead").textContent=t||"",document.getElementById("payment-plan").innerHTML=`
      <div>
        <span class="pay-plan-name">${d(n)}</span>
        <span class="pay-plan-sub">${d(a||"")}</span>
      </div>
      <div>
        <span class="pay-plan-price">${o}</span>
        <span class="pay-plan-period">per ${d(T())}</span>
      </div>`,document.getElementById("payment-lines").innerHTML=r.map(h=>`<div><dt>${d(h.label)}</dt><dd>${h.value}</dd></div>`).join(""),document.getElementById("payment-total").textContent=i,document.getElementById("payment-note").textContent=s||"No card is charged yet — the payment gateway is being connected. Confirming records this payment against your agency.";const m=document.getElementById("payment-confirm");m.textContent=c||"Pay & Continue";const p=h=>{b.classList.add("hidden"),m.removeEventListener("click",y),document.getElementById("payment-cancel").removeEventListener("click",g),document.getElementById("payment-close").removeEventListener("click",g),u(h)},y=()=>p(!0),g=()=>p(!1);m.addEventListener("click",y),document.getElementById("payment-cancel").addEventListener("click",g),document.getElementById("payment-close").addEventListener("click",g),b.classList.remove("hidden")})}function M({icon:e="✅",title:t,lead:n,lines:a=[],actionLabel:o="Done"}){return new Promise(r=>{const i=document.getElementById("notice-modal");if(!i)return alert(`${t}

${n||""}`),r();document.getElementById("notice-icon").textContent=e,document.getElementById("notice-title").textContent=t,document.getElementById("notice-lead").textContent=n||"",document.getElementById("notice-lines").innerHTML=a.map(u=>`<div><dt>${d(u.label)}</dt><dd>${u.value}</dd></div>`).join("");const s=document.getElementById("notice-ok");s.textContent=o;const c=()=>{i.classList.add("hidden"),s.removeEventListener("click",c),r()};s.addEventListener("click",c),i.classList.remove("hidden")})}function Ne(){const e=V(I()+1);if(!e)return null;const t=R();return!t||t.status!=="active"?{tier:e,charge:e.price,upgrade:!1}:t.tierId===e.tierId?{tier:e,charge:0,upgrade:!1}:{tier:e,charge:Math.max(0,e.price-(t.price||0)),upgrade:!0}}function T(){var e;return((e=l.plans)==null?void 0:e.billingPeriod)||"month"}function de(){var e,t;return((t=(e=l.subscription)==null?void 0:e.platform)==null?void 0:t.status)==="active"}function Bt(){l.plans&&(kt(),Ct(),Lt(),Tt(),St(),Dt())}function kt(){var g;const e=l.plans.platform,t=(g=l.subscription)==null?void 0:g.platform,n=de(),a=window.location.origin.includes("3005")?"http://localhost:3000/":window.location.origin+"/";document.getElementById("membership-title").textContent=e.name;const o=e.plans||[],r=o.find(h=>h.id===(t==null?void 0:t.planId)),i=o.reduce((h,L)=>h&&h.price<=L.price?h:L,o[0]),s=r||i;document.getElementById("membership-price").textContent=s?`${f(s.price)} / ${s.period}`:f(e.price);const c=document.querySelector(".membership-price-label");c&&(c.textContent=r?"Your platform plan":"Platform fee from"),document.getElementById("membership-benefits").innerHTML=e.features.map(h=>`<li>${d(h)}</li>`).join("");const u=document.getElementById("membership-badge"),b=document.getElementById("membership-card"),m=document.getElementById("membership-status-line"),p=document.getElementById("membership-managed-note");b.classList.toggle("is-active",n),document.getElementById("membership-start").textContent=x(t==null?void 0:t.startsAt),document.getElementById("membership-expiry").textContent=x(t==null?void 0:t.expiresAt),document.getElementById("membership-remaining").textContent=t&&n?`${t.daysLeft} days`:"—",document.getElementById("membership-paid").textContent=t?f(t.amount):"—",n?(u.className="badge-status confirmed",u.textContent="ACTIVE",m.textContent=`${l.subscription.operatorName} is registered. You can add vehicles and browse other agencies' fleets.`,p.innerHTML=`🔒 Managed on the Tripnix site — renew at <a href="${a}" target="_blank" rel="noopener">${a}</a> before it expires.`):t?(u.className="badge-status cancelled",u.textContent="EXPIRED",m.textContent="Your membership has lapsed, so your fleet is hidden from travellers.",p.innerHTML=`⚠️ Renew on the Tripnix site to go live again: <a href="${a}" target="_blank" rel="noopener">${a}</a>`):(u.className="badge-status pending",u.textContent="NOT REGISTERED",m.textContent=e.tagline,p.innerHTML=`⚠️ Pay the platform fee on the Tripnix site to activate your agency: <a href="${a}" target="_blank" rel="noopener">${a}</a>`);const y=document.getElementById("subscription-badge");y&&(y.style.display=n?"none":"inline-block")}function Lt(){var a;const e=l.plans?document.getElementById("plan-grid"):null;if(!e)return;const t=l.plans.fleetTiers||[];if(!t.length){e.innerHTML='<p class="plan-empty">No fleet plan configured.</p>';return}const n=(a=V(I()))==null?void 0:a.id;e.innerHTML=`
    <div class="plan-cards">
      ${t.map(o=>`
        <div class="plan-card${o.id===n&&I()>0?" is-current":""}">
          <span class="plan-card-tier">🚍 ${d(o.label)}</span>
          <span class="plan-card-seats">${o.maxVehicles===null?`${o.minVehicles} or more vehicles`:`${o.minVehicles}–${o.maxVehicles} vehicles, one fee`}</span>
          <div class="plan-card-price">${f(o.price)}</div>
          <span class="plan-card-period">whole fleet / ${T()}</span>
        </div>`).join("")}
    </div>`}function Ct(){var a,o,r,i;const e=document.getElementById("platform-plan-options");if(!e)return;const t=((o=(a=l.plans)==null?void 0:a.platform)==null?void 0:o.plans)||[];if(!t.length){e.innerHTML="";return}const n=(i=(r=l.subscription)==null?void 0:r.platform)==null?void 0:i.planId;e.innerHTML=t.map(s=>`
    <div class="platform-plan${s.id===n?" is-current":""}">
      <div class="platform-plan-head">
        <span class="platform-plan-label">${d(s.label)}</span>
        <span class="platform-plan-price">${f(s.price)}</span>
      </div>
      <span class="platform-plan-note">
        ${s.id===n?"Your current plan":s.note?d(s.note):`Billed every ${d(s.period)}`}
      </span>
    </div>`).join("")}function Tt(){const e=document.getElementById("listings-tbody"),t=document.getElementById("listing-total-note");if(!e)return;if(!l.vehicles.length){e.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">No vehicles in your fleet yet.</td></tr>',t.textContent="";return}const n=R(),a=ce(),o=V(I()),r=a?'<span class="badge-status confirmed">LISTED</span>':n?'<span class="badge-status cancelled">EXPIRED</span>':'<span class="badge-status pending">UNPAID</span>';e.innerHTML=l.vehicles.map(c=>`
    <tr>
      <td><strong>${d(c.name)}</strong></td>
      <td><code class="vehicle-number">${d(c.vehicleNumber||"—")}</code></td>
      <td>${d(c.type)}</td>
      <td>${c.capacity}</td>
      <td><small style="color:var(--text-muted);">covered by fleet plan</small></td>
      <td>${r}</td>
      <td><small style="color:var(--text-muted);">—</small></td>
    </tr>`).join("");const i=o?d(o.label):"—",s=o?f(o.price):"—";a?t.innerHTML=`${I()} vehicle${I()===1?"":"s"} on the <strong>${i}</strong> plan (${s}/${T()}) · renews ${x(n.expiresAt)} · ${n.daysLeft} days left <button class="btn btn-secondary btn-sm" style="margin-left:10px;" onclick="payFleetFee()">🔄 Renew ${s}</button>`:t.innerHTML=`Your fleet of ${I()} needs the <strong>${i}</strong> plan (${s}/${T()}). Your vehicles stay hidden from travellers until it is paid. <button class="btn btn-primary btn-sm" style="margin-left:10px;" onclick="payFleetFee()">💳 Pay ${s}</button>`}function St(){var i;const e=document.getElementById("superadmin-subscription-panels");if(!e)return;if(((i=l.currentUser)==null?void 0:i.role)!=="superadmin"){e.classList.add("hidden");return}e.classList.remove("hidden");const t=(l.plans.platform.plans||[])[0],n=document.getElementById("price-platform");n&&document.activeElement!==n&&(n.value=t?t.price:l.plans.platform.price);const a=document.getElementById("price-platform-label");a&&t&&(a.textContent=`Platform membership (per ${t.period})`);const o=document.getElementById("tier-price-inputs");o.dataset.built||(o.innerHTML=(l.plans.fleetTiers||[]).map(s=>`
      <div class="form-group">
        <label for="price-${s.id}">${d(s.label)} <small style="color:var(--text-muted);">(whole fleet / ${T()})</small></label>
        <input type="number" id="price-${s.id}" data-tier-id="${s.id}" min="0" step="1" required />
      </div>`).join(""),o.dataset.built="true"),(l.plans.fleetTiers||[]).forEach(s=>{const c=document.getElementById(`price-${s.id}`);c&&document.activeElement!==c&&(c.value=s.price)});const r=document.getElementById("agency-subs-tbody");if(!l.agencySubs.length){r.innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">No agency has subscribed yet.</td></tr>';return}r.innerHTML=l.agencySubs.map(s=>`
    <tr>
      <td><strong>${d(s.operatorName)}</strong></td>
      <td>${s.platform?`<span class="badge-status ${s.platform.status==="active"?"confirmed":"cancelled"}">${s.platform.status.toUpperCase()}</span>`:'<span class="badge-status pending">NONE</span>'}</td>
      <td>${s.platform?x(s.platform.expiresAt):"—"}</td>
      <td>${s.fleet?`${d(s.fleet.tierLabel)} · ${s.vehicleCount} vehicle${s.vehicleCount===1?"":"s"}<br><span class="badge-status ${s.fleet.status==="active"?"confirmed":"cancelled"}">${s.fleet.status.toUpperCase()}</span>`:'<span class="badge-status pending">NO FLEET PLAN</span>'}</td>
      <td><strong>${f(s.totalPaid)}</strong></td>
    </tr>`).join("")}function Dt(){const e=de();ne.title=e?"Add a vehicle to your fleet":"Pay the platform fee first to start adding vehicles",ne.classList.toggle("btn-locked",!e)}window.payFleetFee=async function(){var o,r;const e=(o=l.currentUser)==null?void 0:o.operatorName;if(!e)return;const t=V(I());if(!t)return alert("❌ No fleet plan is configured.");const n=ce();if(await De({title:n?"Renew Fleet Plan":"Confirm Payment",lead:n?`Extends your fleet plan by another ${T()} from its current expiry.`:"One fee covers every vehicle you run — priced by how many that is.",planName:`${t.label} fleet plan`,planSub:`Covers all ${I()} of your vehicle${I()===1?"":"s"}`,planPrice:f(t.price),lines:[{label:"Plan price",value:`${f(t.price)} / ${T()}`},{label:"Vehicles covered",value:String(I())},...n?[{label:"Extends from",value:x((r=R())==null?void 0:r.expiresAt)}]:[]],total:f(t.price),actionLabel:n?`Renew · ${f(t.price)}`:`Pay ${f(t.price)}`}))try{const i=await fetch(`${v}/subscriptions/fleet`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({operatorName:e,vehicleCount:I()})}),s=await i.json();if(!i.ok)throw new Error((s==null?void 0:s.error)||"Payment failed");await _(),U(),Te(),await M({icon:n?"🔄":"🎉",title:n?"Fleet plan renewed":"Your fleet is listed!",lead:n?"Your vehicles stay visible to travellers for another period.":"Every vehicle in your fleet is now visible to travellers.",lines:[{label:"Fleet plan",value:d(s.tierLabel)},{label:"Vehicles covered",value:String(I())},{label:"Paid now",value:f(t.price)},{label:"Covered until",value:x(s.expiresAt)}]})}catch(i){alert("❌ "+i.message)}};async function Nt(e){e.preventDefault();const t=Number(document.getElementById("price-platform").value),n=[...document.querySelectorAll("#tier-price-inputs input[data-tier-id]")].map(a=>({id:a.dataset.tierId,price:Number(a.value)}));try{const a=await fetch(`${v}/subscriptions/plans`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({platformPrice:t,fleetTiers:n})}),o=await a.json();if(!a.ok)throw new Error((o==null?void 0:o.error)||"Failed to save pricing");await _(),alert("✅ Plan pricing updated.")}catch(a){alert("❌ "+a.message)}}async function J(){var e;if(((e=l.currentUser)==null?void 0:e.role)==="superadmin")try{const t=await fetch(`${v}/auth/admins`);if(!t.ok)throw new Error("Failed");l.admins=await t.json(),At()}catch(t){console.error("Admins load error:",t)}}async function Mt(e){e.preventDefault();const t=document.getElementById("admin-username").value.trim(),n=document.getElementById("admin-password").value.trim(),a=document.getElementById("admin-operator").value.trim(),o=document.getElementById("admin-phone").value.trim();try{const r=await fetch(`${v}/auth/admins`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:t,password:n,operatorName:a,phone:o})});let i=null;try{i=await r.json()}catch{i=null}if(!r.ok)throw new Error((i==null?void 0:i.error)||"Failed to create account");ae.reset(),await J(),alert(`✅ Account created!

Travel Agency: ${a}
Username: ${t}
Password: ${n}

Share these credentials with the travel owner.`)}catch(r){alert("❌ "+r.message)}}function At(){const e=document.getElementById("admins-table-tbody");if(e){if(!l.admins.length){e.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">No travel owner accounts yet.</td></tr>';return}e.innerHTML=l.admins.map(t=>`
    <tr>
      <td>#${t.id}</td>
      <td><strong>${d(t.username)}</strong></td>
      <td><code style="background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;">${d(t.password)}</code></td>
      <td>${d(t.operatorName)}</td>
      <td>${t.phone?d(t.phone):'<span style="color:var(--text-muted);">—</span>'}</td>
      <td><span class="badge-status ${t.role==="superadmin"?"confirmed":"pending"}">${t.role==="superadmin"?"Developer":"Travel Owner"}</span></td>
      <td>
        ${t.role!=="superadmin"?`<button class="btn btn-secondary btn-sm" style="color:var(--accent-red);" onclick="deleteAdmin(${t.id})">🗑️ Delete</button>`:"—"}
      </td>
    </tr>`).join("")}}window.deleteAdmin=async function(e){if(confirm("Delete this travel owner account?"))try{if(!(await fetch(`${v}/auth/admins/${e}`,{method:"DELETE"})).ok)throw new Error("Failed to delete");await J()}catch(t){alert("❌ "+t.message)}};function Ft(){let e=0,t=0;l.bookings.forEach(c=>{c.status==="Confirmed"?e++:c.status==="Pending"&&t++});const n=new Set;l.vehicles.forEach(c=>(c.availableDates||[]).forEach(u=>n.add(u))),document.getElementById("stat-fleet").textContent=`${l.vehicles.length} Units`,document.getElementById("stat-schedules").textContent=`${n.size} Days`,document.getElementById("stat-confirmed").textContent=e,document.getElementById("stat-pending").textContent=t,he.textContent=t,he.style.display=t>0?"inline-block":"none";const a=l.vehicles.filter(c=>c.type==="Bus").length,o=l.vehicles.filter(c=>c.type==="Traveller").length,r=l.vehicles.filter(c=>c.type==="Car").length;document.getElementById("bus-count").textContent=a,document.getElementById("bus-count-desc").textContent=`${a} buses in fleet`,document.getElementById("traveller-count").textContent=o,document.getElementById("traveller-count-desc").textContent=`${o} travellers in fleet`,document.getElementById("car-count").textContent=r,document.getElementById("car-count-desc").textContent=`${r} cars in fleet`;const i=document.getElementById("recent-bookings-tbody"),s=[...l.bookings].reverse().slice(0,5);i.innerHTML=s.length===0?'<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">No bookings yet</td></tr>':s.map(c=>`
      <tr>
        <td><strong>${d(c.vehicleName)}</strong></td>
        <td>${d(c.userName)}</td>
        <td>${c.startDate} → ${c.endDate}</td>
        <td><span class="badge-status ${c.status.toLowerCase()}">${c.status}</span></td>
      </tr>`).join("")}function U(){const e=document.getElementById("vehicles-grid");if(!e)return;const t=l.vehicles.filter(n=>{const a=l.fleetFilter==="All"||n.type===l.fleetFilter;let o=!0;if(l.seatFilter&&l.seatFilter!=="All"){const s=Number(n.capacity)||0;l.seatFilter==="above49"?o=s>49:o=s===Number(l.seatFilter)}const r=l.searchQuery.trim().toLowerCase(),i=!r||n.name.toLowerCase().includes(r)||n.operatorName.toLowerCase().includes(r);return a&&o&&i});if(!t.length){e.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--text-muted);">No vehicles found.</div>';return}e.innerHTML=t.map(n=>{const a=n.availableDates||[],o=a.length?a.map(i=>`<span class="date-pill">${i}</span>`).join(""):'<span style="font-size:11px;color:var(--text-muted);">No dates posted yet</span>',r=n.onHold?Ae(n.heldSince):0;return`
    <div class="vehicle-admin-card${n.onHold?" is-held":""}">
      <div class="card-image">
        ${(n.imageUrls||[])[0]?`<img src="${(n.imageUrls||[])[0]}" alt="${d(n.name)}" />`:'<div class="card-image-empty">No photo uploaded</div>'}
        <span class="card-badge">${n.type.toUpperCase()}</span>
        ${n.onHold?'<span class="card-hold-badge">⏸️ ON HOLD</span>':""}
      </div>
      <div class="card-body">
        <h4 class="card-title">${d(n.name)}</h4>
        <p class="card-operator">
          <code class="vehicle-number">${d(n.vehicleNumber||"—")}</code>
          &nbsp;·&nbsp; ${d(n.operatorName)}
        </p>
        ${n.onHold?`
          <div class="hold-note">
            <strong>Off the app for ${r} day${r===1?"":"s"}</strong>
            <span>${n.holdReason?d(n.holdReason)+" · ":""}since ${x(n.heldSince)}</span>
            <span>These days are added back to your plan when you resume it.</span>
          </div>`:""}
        <div class="card-specs">
          <span>👥 ${n.capacity} Seats</span>
          <span title="Worked out from this vehicle's ${n.ratedOn||0} amenit${n.ratedOn===1?"y":"ies"} — tick more in Edit to raise it">
            ⭐ ${(n.rating??3).toFixed(1)} · ${d(n.ratingLabel||"Standard")}
          </span>
        </div>
        <div class="rating-basis">
          ${(n.features||[]).length?(n.features||[]).map(i=>`<span class="feature-pill">${d(i)}</span>`).join(""):'<span class="feature-empty">No amenities ticked — add some in Edit to raise the rating</span>'}
        </div>
        <div style="margin-top:10px;">
          <span style="font-size:11px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">📅 Available Showcase Dates:</span>
          <div class="date-pills">${o}</div>
        </div>
        <div class="card-footer" style="margin-top:14px;">
          <div class="card-actions" style="margin-left:auto;">
            ${n.onHold?`<button class="btn btn-primary btn-sm" onclick="resumeVehicle(${n.id})">▶️ Resume</button>`:`<button class="btn btn-secondary btn-sm" onclick="holdVehicle(${n.id})">⏸️ Hold</button>`}
            <button class="btn btn-secondary btn-sm" onclick="editVehicle(${n.id})">✏️ Edit</button>
            <button class="btn btn-secondary btn-sm" style="color:var(--accent-red);" onclick="deleteVehicle(${n.id})">🗑️ Delete</button>
          </div>
        </div>
      </div>
    </div>`}).join("")}function Pt(){const e=document.getElementById("all-bookings-tbody"),t=[...l.bookings].reverse();e.innerHTML=t.length?t.map(n=>`
      <tr>
        <td>#${n.id}</td>
        <td><strong>${d(n.vehicleName)}</strong></td>
        <td>${d(n.userName)}</td>
        <td>${d(n.userPhone)}</td>
        <td>${n.startDate} → ${n.endDate}</td>
        <td><span class="badge-status ${n.status.toLowerCase()}">${n.status}</span></td>
        <td>${n.status==="Pending"?`
          <button class="btn btn-action-confirm" onclick="updateBookingStatus(${n.id}, 'Confirmed')">Confirm</button>
          <button class="btn btn-action-cancel" onclick="updateBookingStatus(${n.id}, 'Cancelled')">Cancel</button>`:"—"}
        </td>
      </tr>`).join(""):'<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:32px;">No bookings found.</td></tr>'}let w=null;function Ot(){const e=document.getElementById("vehicle-dates");e&&typeof flatpickr<"u"&&!w&&(w=flatpickr(e,{mode:"multiple",dateFormat:"Y-m-d",conjunction:", ",theme:"dark",monthSelectorType:"dropdown",onChange:t=>{Z(t)}}),Ht())}function Z(e){const t=document.getElementById("selected-date-chips"),n=document.getElementById("selected-dates-count");if(!t)return;const a=(e||[]).map(o=>{if(o instanceof Date){const r=o.getFullYear(),i=String(o.getMonth()+1).padStart(2,"0"),s=String(o.getDate()).padStart(2,"0");return`${r}-${i}-${s}`}return String(o).trim()}).filter(Boolean).sort();if(n&&(n.textContent=`${a.length} date${a.length===1?"":"s"} selected`),a.length===0){t.innerHTML='<span class="no-dates-text">No dates selected yet. Click input or presets above to select dates.</span>';return}t.innerHTML=a.map(o=>`
    <span class="selected-date-chip">
      <span class="chip-date">📅 ${o}</span>
      <button type="button" class="chip-remove" data-date="${o}" title="Remove date">&times;</button>
    </span>
  `).join(""),t.querySelectorAll(".chip-remove").forEach(o=>{o.addEventListener("click",r=>{r.stopPropagation();const i=o.getAttribute("data-date");Ut(i)})})}function Ut(e){if(!w)return;const n=w.selectedDates.filter(a=>{const o=a.getFullYear(),r=String(a.getMonth()+1).padStart(2,"0"),i=String(a.getDate()).padStart(2,"0");return`${o}-${r}-${i}`!==e});w.setDate(n,!0)}function Ht(){var e,t,n,a,o;(e=document.getElementById("preset-today"))==null||e.addEventListener("click",()=>{const r=new Date;w==null||w.setDate([r],!0)}),(t=document.getElementById("preset-next-7"))==null||t.addEventListener("click",()=>{const r=[],i=new Date;for(let s=0;s<7;s++){const c=new Date(i);c.setDate(i.getDate()+s),r.push(c)}w==null||w.setDate(r,!0)}),(n=document.getElementById("preset-next-14"))==null||n.addEventListener("click",()=>{const r=[],i=new Date;for(let s=0;s<14;s++){const c=new Date(i);c.setDate(i.getDate()+s),r.push(c)}w==null||w.setDate(r,!0)}),(a=document.getElementById("preset-clear"))==null||a.addEventListener("click",()=>{w==null||w.clear(),Z([])}),(o=document.getElementById("open-calendar-btn"))==null||o.addEventListener("click",()=>{w==null||w.open()})}function Me(e=null){var i;l.editingVehicleId=(e==null?void 0:e.id)??null,_e.textContent=e?"Edit Vehicle":"Add New Vehicle";const t=document.getElementById("modal-save-btn");t&&(t.textContent=e?"Update Vehicle":"Add Vehicle");const n=((i=l.currentUser)==null?void 0:i.operatorName)??"",a=(e==null?void 0:e.type)??"Bus";document.getElementById("vehicle-id").value=(e==null?void 0:e.id)??"",document.getElementById("vehicle-type").value=a,document.getElementById("vehicle-operator").value=(e==null?void 0:e.operatorName)??n,document.getElementById("vehicle-name").value=(e==null?void 0:e.name)??"",document.getElementById("vehicle-number").value=(e==null?void 0:e.vehicleNumber)??"",document.getElementById("vehicle-capacity").value=(e==null?void 0:e.capacity)??36,document.getElementById("vehicle-description").value=(e==null?void 0:e.description)??"",document.getElementById("vehicle-instagram").value=(e==null?void 0:e.instagramUrl)??"",window.syncCustomTypeDropdown&&window.syncCustomTypeDropdown(a),l.vehicleFormImages=Array.isArray(e==null?void 0:e.imageUrls)?[...e.imageUrls]:[],l.vehicleFormVideos=Array.isArray(e==null?void 0:e.videoUrls)?[...e.videoUrls]:[],j();const o=(e==null?void 0:e.features)??["AC","WiFi"];document.querySelectorAll(".features-checkboxes input").forEach(s=>{s.checked=o.includes(s.value)}),Ot();const r=(e==null?void 0:e.availableDates)??[];w?(w.setDate(r,!1),Z(w.selectedDates)):document.getElementById("vehicle-dates").value=r.join(", "),H(),Ee.classList.remove("hidden")}function H(){const e=document.getElementById("vehicle-sub-panel");if(!e||!l.plans)return;const t=!!l.editingVehicleId,n=document.getElementById("vehicle-sub-tier-label"),a=document.getElementById("vehicle-sub-tier-seats"),o=document.getElementById("vehicle-sub-price"),r=document.getElementById("vehicle-sub-note"),i=document.getElementById("modal-save-btn");if(t){const c=R(),u=V(I());e.classList.remove("is-invalid"),i.disabled=!1,n.textContent=u?`${u.label} fleet plan`:"Fleet plan",a.textContent=`${I()} vehicle${I()===1?"":"s"} covered`,o.textContent=u?`${f(u.price)}/${T()}`:"—",r.textContent=(c==null?void 0:c.status)==="active"?`Covered until ${x(c.expiresAt)}. Updating these details does not change the fee.`:"Updating these details does not change the fee. Pay it from the Subscription page.",i.textContent="Update Vehicle";return}const s=Ne();if(!s){e.classList.add("is-invalid"),n.textContent="No fleet plan configured",a.textContent="",o.textContent="—",r.textContent="No fleet plan is configured. Ask the Super Admin to set one on the Subscription page.",i.textContent="Add Vehicle",i.disabled=!0;return}e.classList.remove("is-invalid"),i.disabled=!1,n.textContent=`${s.tier.label} fleet plan`,a.textContent=`This would be vehicle #${I()+1}`,o.textContent=`${f(s.tier.price)}/${T()}`,s.charge===0?r.textContent=`Your ${s.tier.label} plan (${f(s.tier.price)}/${T()}) already covers this vehicle — nothing more to pay. It goes live in the app straight after.`:s.upgrade?r.textContent=`This vehicle moves your fleet onto the ${s.tier.label} plan at ${f(s.tier.price)}/${T()}. You have already paid ${f(s.tier.price-s.charge)} of it, so ${f(s.charge)} is payable now and your renewal date does not change.`:r.textContent=`Adding this vehicle starts your ${s.tier.label} plan at ${f(s.tier.price)} for one ${T()}, covering every vehicle you add inside that band.`,i.textContent=s.charge>0?`Add Vehicle · ${f(s.charge)}`:"Add Vehicle"}function G(){w&&w.clear(),Z([]),l.vehicleFormImages=[],l.vehicleFormVideos=[],j(),window.syncCustomTypeDropdown&&window.syncCustomTypeDropdown("Bus"),Ee.classList.add("hidden"),Ie.reset()}async function jt(e){e.preventDefault();const t=l.editingVehicleId,n=document.getElementById("vehicle-name").value.trim(),a=document.getElementById("vehicle-number").value.trim().toUpperCase(),o=document.getElementById("vehicle-type").value,r=document.getElementById("vehicle-operator").value.trim(),i=Number(document.getElementById("vehicle-capacity").value),s=document.getElementById("vehicle-description").value.trim(),c=document.getElementById("vehicle-instagram").value.trim();let u=[];w&&w.selectedDates.length>0?u=w.selectedDates.map(E=>{const C=E.getFullYear(),k=String(E.getMonth()+1).padStart(2,"0"),B=String(E.getDate()).padStart(2,"0");return`${C}-${k}-${B}`}).sort():u=document.getElementById("vehicle-dates").value.split(",").map(E=>E.trim()).filter(Boolean);const b=l.vehicleFormImages,m=l.vehicleFormVideos,p=[...document.querySelectorAll(".features-checkboxes input:checked")].map(E=>E.value),y={name:n,type:o,vehicleNumber:a,operatorName:r,capacity:i,description:s,instagramUrl:c,availableDates:u,imageUrls:b,videoUrls:m,features:p},g=t?null:Ne();if(!t&&!g)return alert("❌ No fleet plan is configured, so this vehicle cannot be listed yet.");if(g&&g.charge>0){const E=g.tier.price-g.charge;if(!await De({title:g.upgrade?"Upgrade Fleet Plan":"Confirm Payment",lead:g.upgrade?`Adding ${n} takes your fleet to ${I()+1} vehicles, which moves you onto the ${g.tier.label} plan.`:`Adding ${n} starts your fleet plan. One fee covers every vehicle in the band.`,planName:`${g.tier.label} fleet plan`,planSub:`Covers ${I()+1} vehicle${I()+1===1?"":"s"}`,planPrice:f(g.tier.price),lines:[{label:"Plan price",value:`${f(g.tier.price)} / ${T()}`},...E>0?[{label:"Already paid this period",value:`− ${f(E)}`}]:[],{label:"Billing period",value:T()}],total:f(g.charge),actionLabel:`Pay ${f(g.charge)} & Add`}))return}const h=document.getElementById("modal-save-btn"),L=h.textContent;h.disabled=!0,h.textContent="Saving…";try{const E=t?`${v}/vehicles/${t}`:`${v}/vehicles`,k=await fetch(E,{method:t?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(y)});let B=null;try{B=await k.json()}catch{B=null}if(!k.ok)throw new Error((B==null?void 0:B.error)||"Failed to save vehicle");if(t)return G(),await D(),M({icon:"✏️",title:`${n} updated`,lead:"The details are saved. Your fleet plan and renewal date are unchanged."});if(G(),await D(),!B.fleet)return M({icon:"⚠️",title:`${n} saved, but not listed`,lead:B.listingWarning||"The fleet fee could not be charged, so your vehicles are not visible to travellers yet. Pay it from the Subscription page.",actionLabel:"Got it"});const A=Number(B.fleet.charge||0);return M({icon:"🎉",title:`${n} is live in the app!`,lead:`Travellers can now see it. Your fleet plan covers every vehicle in the ${B.fleet.tierLabel} band.`,lines:[{label:"Fleet plan",value:d(B.fleet.tierLabel)},{label:"Vehicles covered",value:String(B.fleet.vehicleCount??I())},{label:"Paid now",value:A>0?f(A)+(B.fleet.upgraded?" (upgrade)":""):"Nothing — already covered"},{label:"Covered until",value:x(B.fleet.expiresAt)}]})}catch(E){alert("❌ "+E.message)}finally{h.disabled=!1,h.textContent=L}}window.editVehicle=function(e){const t=l.vehicles.find(n=>n.id===e);t&&Me(t)};function Ae(e){const t=new Date(`${e}T00:00:00`);if(Number.isNaN(t.getTime()))return 0;const n=Date.UTC(t.getFullYear(),t.getMonth(),t.getDate()),a=new Date,o=Date.UTC(a.getFullYear(),a.getMonth(),a.getDate());return Math.max(1,Math.round((o-n)/864e5)+1)}window.holdVehicle=async function(e){const t=l.vehicles.find(a=>a.id===e);if(!t)return;const n=prompt(`Hold "${t.name}" off the app?

It stays in your fleet but travellers stop seeing it, and it cannot be given a trip. Every day it is held is added back to your fleet plan when you resume it.

Why is it off the road? (optional)`,"Workshop / maintenance");if(n!==null)try{const a=await fetch(`${v}/vehicles/${e}/hold`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({operatorName:t.operatorName,reason:n})}),o=await a.json().catch(()=>null);if(!a.ok)throw new Error((o==null?void 0:o.error)||"Could not hold this vehicle");await D(),await M({icon:"⏸️",title:`${t.name} is on hold`,lead:"Travellers can no longer see it. Resume it when it is back on the road and the days it sat out will be added to your fleet plan."})}catch(a){alert("❌ "+a.message)}};window.resumeVehicle=async function(e){const t=l.vehicles.find(a=>a.id===e);if(!t)return;const n=Ae(t.heldSince);if(confirm(`Put "${t.name}" back on the app?

It has been on hold for ${n} day${n===1?"":"s"}. Those days will be added to your fleet plan's expiry.`))try{const a=await fetch(`${v}/vehicles/${e}/resume`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({operatorName:t.operatorName})}),o=await a.json().catch(()=>null);if(!a.ok)throw new Error((o==null?void 0:o.error)||"Could not resume this vehicle");await D();const r=o.hold||{},i=r.creditedDays===r.days?`It was off the app for ${r.days} day${r.days===1?"":"s"}, and your fleet plan has been extended by the same.`:r.creditedDays>0?`It was off the app for ${r.days} days. ${r.creditedDays} were added to your plan — the rest overlapped another bus's hold and had already been credited.`:`It was off the app for ${r.days} day${r.days===1?"":"s"}, all of which overlapped another bus's hold and had already been added to your plan.`;await M({icon:"▶️",title:`${t.name} is back on the app`,lead:i,lines:r.fleetExpiresAt?[{label:"Fleet plan now runs until",value:x(r.fleetExpiresAt)}]:[]})}catch(a){alert("❌ "+a.message)}};window.deleteVehicle=async function(e){if(confirm("Delete this vehicle from your fleet?"))try{if(!(await fetch(`${v}/vehicles/${e}`,{method:"DELETE"})).ok)throw new Error("Failed");await D()}catch(t){alert("❌ "+t.message)}};window.updateBookingStatus=async function(e,t){try{if(!(await fetch(`${v}/bookings/${e}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:t})})).ok)throw new Error("Failed");await D()}catch(n){alert("❌ "+n.message)}};function d(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}
