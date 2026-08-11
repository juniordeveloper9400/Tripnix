(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))a(o);new MutationObserver(o=>{for(const i of o)if(i.type==="childList")for(const r of i.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&a(r)}).observe(document,{childList:!0,subtree:!0});function n(o){const i={};return o.integrity&&(i.integrity=o.integrity),o.referrerPolicy&&(i.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?i.credentials="include":o.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function a(o){if(o.ep)return;o.ep=!0;const i=n(o);fetch(o.href,i)}})();const ce="tripnix-fleet-map-styles",Ne=[{elementType:"geometry",stylers:[{color:"#1c2c48"}]},{elementType:"labels.text.stroke",stylers:[{color:"#0b1220"}]},{elementType:"labels.text.fill",stylers:[{color:"#94a3b8"}]},{featureType:"administrative",elementType:"geometry",stylers:[{color:"#4b5563"}]},{featureType:"poi",elementType:"labels.text.fill",stylers:[{color:"#7f8ea3"}]},{featureType:"poi.park",elementType:"geometry",stylers:[{color:"#1f3d2b"}]},{featureType:"road",elementType:"geometry",stylers:[{color:"#2a3a55"}]},{featureType:"road",elementType:"geometry.stroke",stylers:[{color:"#16233a"}]},{featureType:"road",elementType:"labels.text.fill",stylers:[{color:"#9ca8bb"}]},{featureType:"road.highway",elementType:"geometry",stylers:[{color:"#4a5b78"}]},{featureType:"road.highway",elementType:"geometry.stroke",stylers:[{color:"#111c30"}]},{featureType:"transit",elementType:"geometry",stylers:[{color:"#243248"}]},{featureType:"water",elementType:"geometry",stylers:[{color:"#132b47"}]},{featureType:"water",elementType:"labels.text.fill",stylers:[{color:"#4f6a8a"}]}];let M=null;function Ae(e){var t;return(t=window.google)!=null&&t.maps?Promise.resolve(window.google.maps):M||(M=new Promise((n,a)=>{const o=document.createElement("script");o.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(e)}&loading=async&v=weekly`,o.async=!0,o.onload=()=>{var i;return(i=window.google)!=null&&i.maps?n(window.google.maps):a(new Error("Maps API loaded but unavailable"))},o.onerror=()=>a(new Error("Could not load Google Maps — check the API key and its referrer restrictions")),document.head.appendChild(o)}).catch(n=>{throw M=null,n}),M)}function me(e){const t=`
    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="56" viewBox="0 0 44 56">
      <path d="M22,54 L13,38 h18 z" fill="${e}"/>
      <circle cx="22" cy="21" r="18" fill="${e}" stroke="#0b1220" stroke-width="2.5"/>
      <rect x="13" y="11" width="18" height="16" rx="3" fill="#ffffff"/>
      <rect x="15.2" y="13" width="13.6" height="6" rx="1.4" fill="${e}"/>
      <rect x="15.2" y="20.6" width="13.6" height="2" rx="0.9" fill="${e}" opacity="0.45"/>
      <circle cx="17" cy="28.4" r="2.3" fill="#0b1220"/>
      <circle cx="27" cy="28.4" r="2.3" fill="#0b1220"/>
    </svg>`;return"data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(t.trim())}const z=new WeakMap,Me={lat:9.9312,lng:76.2673,zoom:9},pe=[{label:"Kochi",lat:9.9312,lng:76.2673},{label:"Munnar",lat:10.0889,lng:77.0595},{label:"Thrissur",lat:10.5276,lng:76.2144},{label:"Alappuzha",lat:9.4981,lng:76.3388},{label:"Kottayam",lat:9.5916,lng:76.5222},{label:"Palakkad",lat:10.7867,lng:76.6548},{label:"Kozhikode",lat:11.2588,lng:75.7804},{label:"Thekkady",lat:9.5939,lng:77.16},{label:"Kollam",lat:8.8932,lng:76.6141},{label:"Wayanad",lat:11.6854,lng:76.132}];function Fe(e){return e.map((t,n)=>{const a=pe[(Number(t.vehicleId)+n)%pe.length];return{...t,location:{lat:a.lat,lng:a.lng,label:a.label,live:n%3!==2,ageMinutes:n%3===2?40+n*7:0,speedKph:n%3===2?0:30+n*9,sample:!0}}})}function Pe(){if(document.getElementById(ce))return;const e=document.createElement("style");e.id=ce,e.textContent=`
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
  `,document.head.appendChild(e)}function F(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function Oe(e,t,{noteEl:n,compact:a}){const{lat:o,lng:i,zoom:r}=Me,s=`https://www.google.com/maps?q=${o},${i}&hl=en&z=${r}&output=embed`;n&&(n.textContent=t.total?"No bus has reported a position yet":""),e.innerHTML=`
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
    </div>`}function V(e,t,n,{noteEl:a,compact:o,sample:i=!1}){const r=Number(e.dataset.fleetMapBus),s=n.find(m=>m.vehicleId===r)||n.find(m=>m.location.live)||n[0];e.dataset.fleetMapBus=String(s.vehicleId);const d=s.location,g=`https://www.google.com/maps?q=${d.lat},${d.lng}&hl=en&z=${o?13:14}&output=embed`,b=n.map(m=>{const y=m.vehicleId===s.vehicleId,u=m.location.live;return`
      <button type="button" class="fmap-chip${y?" is-on":""}"
              data-fleet-map-bus="${m.vehicleId}">
        <i style="background:${u?"#0ca30c":"#fab219"}"></i>
        ${F(m.vehicleNumber||m.vehicleName)}
        <span>${u?"live":m.location.ageMinutes+"m"}</span>
      </button>`}).join(""),p=t.total-n.length;e.innerHTML=`
    ${n.length>1?`<div class="fmap-chips">${b}</div>`:""}
    <div class="fmap fmap-live${o?" is-compact":""}">
      <iframe class="fmap-embed" src="${g}" title="Map of ${F(s.vehicleName)}"
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
    </div>`,e.querySelectorAll("[data-fleet-map-bus]").forEach(m=>m.addEventListener("click",()=>{e.dataset.fleetMapBus=m.dataset.fleetMapBus,V(e,t,n,{noteEl:a,compact:o,sample:i})})),a&&(a.textContent=i?`Sample positions · showing ${s.vehicleNumber||s.vehicleName} near ${d.label}`:`${t.reporting} of ${t.total} reporting · showing ${s.vehicleNumber||s.vehicleName}${d.label?" near "+d.label:""}`)}async function Ue(e,t,n,{noteEl:a,compact:o,apiKey:i}){let r;try{r=await Ae(i)}catch(y){return console.warn("[fleet-map]",y.message),!1}let s=z.get(e);if(!s){e.innerHTML=`<div class="fmap fmap-live${o?" is-compact":""}"><div class="fmap-canvas"></div></div>`;const y=e.querySelector(".fmap-canvas");s={map:new r.Map(y,{center:{lat:n[0].location.lat,lng:n[0].location.lng},zoom:12,styles:Ne,mapTypeControl:!o,streetViewControl:!1,fullscreenControl:!o,zoomControl:!0,backgroundColor:"#1c2c48",gestureHandling:"cooperative"}),markers:new Map,info:new r.InfoWindow},z.set(e,s)}const d=new Set,g=new r.LatLngBounds;for(const y of n){const u=y.location,v=u.live?"#0ca30c":"#fab219",C={lat:u.lat,lng:u.lng};g.extend(C),d.add(y.vehicleId);const E=y.vehicleNumber||y.vehicleName,L=`${u.live?"Live now":u.ageMinutes+" min ago"}${u.label?" · "+F(u.label):""}${u.speedKph?" · "+Math.round(u.speedKph)+" km/h":""}`;let k=s.markers.get(y.vehicleId);k?(k.setPosition(C),k.setIcon({url:me(v),scaledSize:new r.Size(34,43),anchor:new r.Point(17,43)})):(k=new r.Marker({map:s.map,position:C,title:`${y.vehicleName} · ${L.replace(/<[^>]*>/g,"")}`,icon:{url:me(v),scaledSize:new r.Size(34,43),anchor:new r.Point(17,43)},zIndex:u.live?2:1}),s.markers.set(y.vehicleId,k)),k.addListener("click",()=>{s.info.setContent(`<div style="font-family:system-ui;color:#0b1220;min-width:150px">
           <strong style="font-size:13px">${F(y.vehicleName)}</strong><br>
           <span style="font-size:11px;color:#475569">${F(E)} · ${L}</span><br>
           <span style="font-size:10.5px;color:#64748b">${u.lat.toFixed(5)}, ${u.lng.toFixed(5)}</span>
         </div>`),s.info.open({map:s.map,anchor:k})})}for(const[y,u]of s.markers)d.has(y)||(u.setMap(null),s.markers.delete(y));s.framed||(n.length===1?(s.map.setCenter(g.getCenter()),s.map.setZoom(13)):s.map.fitBounds(g,o?24:48),s.framed=!0),a&&(a.textContent=`${t.reporting} of ${t.total} reporting · live map`);const b=t.total-n.length,p=e.querySelector(".fmap-legend"),m=`
    <span><i style="background:#0ca30c"></i>Live</span>
    <span><i style="background:#fab219"></i>Last seen earlier</span>
    ${b?`<span><i style="background:#94a3b8"></i>${b} not reporting</span>`:""}
    <span class="fmap-note">Tap a bus for its detail</span>`;return p?p.innerHTML=m:e.insertAdjacentHTML("beforeend",`<div class="fmap-legend">${m}</div>`),!0}function je(e,t,{noteEl:n=null,compact:a=!1,apiKey:o=""}={}){if(!e)return;Pe();const i=((t==null?void 0:t.vehicles)||[]).filter(r=>r.location);if(!i.length){z.delete(e);const r=(t==null?void 0:t.vehicles)||[];if(!r.length){delete e.dataset.fleetMapBus,Oe(e,t,{noteEl:n,compact:a});return}const s=Fe(r);V(e,{...t,reporting:0,total:r.length},s,{noteEl:n,compact:a,sample:!0});return}if(o){Ue(e,t,i,{noteEl:n,compact:a,apiKey:o}).then(r=>{r||V(e,t,i,{noteEl:n,compact:a})});return}z.delete(e),V(e,t,i,{noteEl:n,compact:a})}const h=window.location.origin.includes("3005")?"http://localhost:3000/api":window.location.origin+"/api";let l={currentUser:JSON.parse(sessionStorage.getItem("tripnix_user")||"null"),vehicles:[],bookings:[],admins:[],plans:null,subscription:null,accounts:null,accountCategories:null,tracking:null,agencySubs:[],trips:[],activeTab:"dashboard",fleetFilter:"All",searchQuery:"",editingVehicleId:null,vehicleFormImages:[],vehicleFormVideos:[],diaryVehicleId:null,diary:null};const ye=document.getElementById("login-screen"),fe=document.getElementById("app-layout"),he=document.getElementById("login-form"),Q=document.getElementById("login-error"),He=document.getElementById("logout-btn"),ve=document.querySelectorAll(".nav-item"),Ve=document.querySelectorAll(".tab-page"),ue=document.getElementById("nav-admins"),Re=document.getElementById("page-title"),ze=document.getElementById("page-subtitle"),ge=document.getElementById("pending-badge"),qe=document.getElementById("refresh-btn"),Z=document.getElementById("add-vehicle-header-btn"),be=document.getElementById("vehicle-modal"),Ye=document.getElementById("modal-title"),Ge=document.getElementById("modal-close-btn"),Ke=document.getElementById("modal-cancel-btn"),$e=document.getElementById("vehicle-form"),ee=document.getElementById("create-admin-form");document.addEventListener("DOMContentLoaded",()=>{tt(),st(),We(),Je()});function We(){const e=document.getElementById("register-link");e&&(e.href=window.location.origin.includes("3005")?"http://localhost:3000/":window.location.origin+"/")}function Je(){l.currentUser?Ee():we()}function we(){ye.classList.remove("hidden"),fe.classList.add("hidden")}function Ee(){ye.classList.add("hidden"),fe.classList.remove("hidden"),_e(),S()}function _e(){const e=l.currentUser;if(!e)return;const t=e.operatorName||"Travel Agency",n=e.username||"admin",a=t.charAt(0).toUpperCase(),o=document.getElementById("agency-identity-block");o&&o.classList.remove("hidden"),document.getElementById("agency-avatar-letter").textContent=a,document.getElementById("agency-name-display").textContent=t,document.getElementById("agency-username-display").textContent="@"+n;const i=document.getElementById("profile-logout-row");i&&i.classList.remove("hidden"),document.getElementById("profile-mini-avatar").textContent=a,document.getElementById("profile-mini-name").textContent=t,document.getElementById("profile-mini-username").textContent="@"+n;const r=document.getElementById("hero-agency-name");r&&(r.textContent=t),e.role==="superadmin"?ue.classList.remove("hidden"):(ue.classList.add("hidden"),l.activeTab==="admins"&&ae("dashboard"))}async function Qe(e){e.preventDefault(),Q.classList.add("hidden");const t=document.getElementById("login-username").value.trim(),n=document.getElementById("login-password").value.trim(),a=document.getElementById("login-submit-btn");a.textContent="Signing in…",a.disabled=!0;try{const o=await fetch(`${h}/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:t,password:n})});let i=null;try{i=await o.json()}catch{i=null}if(!o.ok)throw new Error((i==null?void 0:i.error)||"Invalid username or password");if(!i)throw new Error("Invalid response from backend server");l.currentUser=i,sessionStorage.setItem("tripnix_user",JSON.stringify(i)),he.reset(),Ee()}catch(o){Q.textContent="⚠️ "+o.message,Q.classList.remove("hidden")}finally{a.textContent="Sign In",a.disabled=!1}}function Xe(){l.currentUser=null,l.vehicles=[],l.bookings=[],l.admins=[],sessionStorage.removeItem("tripnix_user");const e=document.getElementById("agency-identity-block"),t=document.getElementById("profile-logout-row");e&&e.classList.add("hidden"),t&&t.classList.add("hidden"),document.getElementById("agency-avatar-letter").textContent="",document.getElementById("agency-name-display").textContent="",document.getElementById("agency-username-display").textContent="",document.getElementById("profile-mini-avatar").textContent="",document.getElementById("profile-mini-name").textContent="",document.getElementById("profile-mini-username").textContent="",we()}function Ze(){const e=document.getElementById("sidebar"),t=document.getElementById("sidebar-overlay");if(!e||!t)return;e.classList.contains("active")?q():et()}function et(){const e=document.getElementById("sidebar"),t=document.getElementById("sidebar-overlay");e&&e.classList.add("active"),t&&t.classList.add("active")}function q(){const e=document.getElementById("sidebar"),t=document.getElementById("sidebar-overlay");e&&e.classList.remove("active"),t&&t.classList.remove("active")}function tt(){ve.forEach(e=>{e.addEventListener("click",()=>{ae(e.getAttribute("data-tab"))})})}function ae(e){l.activeTab=e,q(),ve.forEach(n=>{n.classList.toggle("active",n.getAttribute("data-tab")===e)}),Ve.forEach(n=>{n.classList.toggle("active",n.id===`tab-${e}`)});const t={dashboard:["Dashboard Overview","Real-time bus schedules and fleet operations"],fleet:["Fleet Management","Add buses, edit details, and post available dates"],bookings:["Customer Bookings","Review and manage booking requests"],trips:["Trips","Post trips that appear in the traveller app story bar"],schedule:["Bus Diary","The running schedule for each bus in your fleet"],accounts:["Accounts","What the diary earned, against what you have paid Tripnix"],gps:["GPS Tracking","Where every bus last reported from"],subscription:["Subscription & Plans","Platform membership and the fleet plan"],admins:["Manage Travel Owners","Create and manage Travel Owner login credentials"]};t[e]&&(Re.textContent=t[e][0],ze.textContent=t[e][1]),e==="admins"&&J(),e==="subscription"&&W(),e==="trips"&&K(),e==="schedule"&&oe(),e==="accounts"&&G(),e==="gps"&&rt()}async function G(e){var n;const t=(n=l.currentUser)==null?void 0:n.operatorName;if(t)try{const a=e?`&month=${encodeURIComponent(e)}`:"",o=await fetch(`${h}/accounts?operatorName=${encodeURIComponent(t)}${a}`);if(!o.ok)throw new Error("Could not load accounts");if(l.accounts=await o.json(),!l.accountCategories){const i=await fetch(`${h}/accounts/categories`);i.ok&&(l.accountCategories=await i.json())}ot()}catch(a){document.getElementById("acc-breakdown").innerHTML=`<p class="diary-empty">❌ ${c(a.message)}</p>`}}function nt(){var e;if(!l.vehicles.length)return alert("❌ Add a bus to your fleet first.");document.getElementById("acc-entry-date").value=new Date().toISOString().slice(0,10),document.getElementById("acc-entry-amount").value="",document.getElementById("acc-entry-note").value="",Ie(((e=document.querySelector('input[name="acc-kind"]:checked'))==null?void 0:e.value)||"income"),document.getElementById("acc-entry-modal").classList.remove("hidden"),document.getElementById("acc-entry-amount").focus()}function te(){document.getElementById("acc-entry-modal").classList.add("hidden"),document.getElementById("acc-entry-form").reset()}function Ie(e){var a,o;const t=((o=(a=l.accountCategories)==null?void 0:a.categories)==null?void 0:o[e])||[];document.getElementById("acc-entry-category").innerHTML=t.map(i=>`<option>${c(i)}</option>`).join("");const n=l.vehicles.map(i=>`<option value="${i.id}">${c(i.name)} · ${c(i.vehicleNumber||"—")}</option>`);document.getElementById("acc-entry-vehicle").innerHTML=e==="capital"?n.join(""):'<option value="">Whole agency</option>'+n.join(""),document.getElementById("acc-entry-vehicle-req").textContent=e==="capital"?"*":"",document.getElementById("acc-entry-hint").textContent=e==="capital"?"What the bus cost to buy. Recorded once, not as a monthly expense — it is the sum the bus has to earn back.":e==="income"?"Money in that is not already a diary order — a private contract, a rental, anything else.":"Money out: fuel, driver wages, servicing, insurance, an EMI. Leave the bus blank for costs that cover the whole agency."}async function at(e){e.preventDefault();const t=document.getElementById("acc-entry-save"),n=t.textContent;t.disabled=!0,t.textContent="Saving…";try{const a=await fetch(`${h}/accounts/entries`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({operatorName:l.currentUser.operatorName,kind:document.querySelector('input[name="acc-kind"]:checked').value,vehicleId:document.getElementById("acc-entry-vehicle").value||null,amount:document.getElementById("acc-entry-amount").value,date:document.getElementById("acc-entry-date").value,category:document.getElementById("acc-entry-category").value,note:document.getElementById("acc-entry-note").value.trim()})}),o=await a.json().catch(()=>null);if(!a.ok)throw new Error((o==null?void 0:o.error)||"Could not save this entry");te(),await G(String(o.date).slice(0,7))}catch(a){alert("❌ "+a.message)}finally{t.disabled=!1,t.textContent=n}}window.removeAccEntry=async function(e){var t;if(confirm("Remove this entry from the books?"))try{if(!(await fetch(`${h}/accounts/entries/${e}?operatorName=${encodeURIComponent(l.currentUser.operatorName)}`,{method:"DELETE"})).ok)throw new Error("Could not remove this entry");await G((t=l.accounts)==null?void 0:t.month)}catch(n){alert("❌ "+n.message)}};function ot(){const e=l.accounts;if(!e)return;const t=document.getElementById("acc-month");t&&document.activeElement!==t&&(t.innerHTML=e.availableMonths.length?e.availableMonths.map(a=>`<option value="${a.value}" ${a.value===e.month?"selected":""}>${c(a.label)}</option>`).join(""):`<option>${c(e.monthLabel)}</option>`),document.getElementById("acc-stats").innerHTML=`
    <div class="stat-card"><span class="stat-icon">📥</span><div><strong>${f(e.income.total)}</strong><span>Money in</span></div></div>
    <div class="stat-card"><span class="stat-icon">📤</span><div><strong>${f(e.expense.total)}</strong><span>Money out</span></div></div>
    <div class="stat-card"><span class="stat-icon">${e.profit<0?"📉":"📈"}</span><div><strong>${f(e.profit)}</strong><span>Profit · ${e.margin}%</span></div></div>
    <div class="stat-card"><span class="stat-icon">📕</span><div><strong>${e.income.orders}</strong><span>Orders</span></div></div>`,document.getElementById("acc-breakdown").innerHTML=`
    <div class="diary-row"><div class="diary-row-main">Diary fares (${e.income.orders})</div><strong>${f(e.income.trips)}</strong></div>
    <div class="diary-row"><div class="diary-row-main">Other income</div><strong>${f(e.income.other)}</strong></div>
    <div class="diary-row"><div class="diary-row-main">App bookings (${e.income.appBookings})</div><span style="color:var(--text-muted);font-style:italic;">no fare recorded</span></div>
    <div class="diary-row"><div class="diary-row-main">Expenses</div><strong>− ${f(e.expense.total)}</strong></div>
    <div class="diary-row" style="border-bottom:none;padding-top:14px;">
      <div class="diary-row-main"><strong>${c(e.monthLabel)} profit</strong></div>
      <strong style="font-size:20px;color:${e.profit<0?"var(--accent-red)":"var(--accent-green)"};">${f(e.profit)}</strong>
    </div>
    ${e.expense.byCategory.length?`
      <p class="panel-header-note" style="margin-top:14px;">Spent on:
        ${e.expense.byCategory.map(a=>`${c(a.category)} ${f(a.amount)}`).join(" · ")}
      </p>`:""}
    <p class="panel-header-note" style="margin-top:10px;line-height:1.6;">
      Diary fares come from the Bus Diary automatically. App bookings carry no fare — travellers
      book without a rate, so nothing is invented for them. Capital and expenses are managed by
      the owner in the Owner Portal.
    </p>`,document.getElementById("acc-vehicles").innerHTML=e.perVehicle.length?e.perVehicle.map(a=>`
        <div class="diary-row">
          <div class="diary-row-main">
            <strong>${c(a.vehicleName)}</strong>
            <div class="diary-row-who">${a.orders} order${a.orders===1?"":"s"} · in ${f(a.income)} · out ${f(a.expense)}</div>
          </div>
          <strong style="color:${a.profit<0?"var(--accent-red)":"inherit"};">${f(a.profit)}</strong>
        </div>`).join(""):'<p class="diary-empty">No buses yet.</p>';const n=[...e.entries.orders.map(a=>({...a,kindLabel:"Diary fare",sign:"+"})),...e.entries.manual.map(a=>({...a,kindLabel:a.source==="income"?"Income":"Expense",sign:a.source==="expense"?"−":"+"}))].sort((a,o)=>String(a.date).localeCompare(String(o.date)));document.getElementById("acc-entries").innerHTML=n.length?n.map(a=>`
        <div class="diary-row">
          <div class="diary-row-main">
            <strong>${c(a.label)}</strong>
            <div class="diary-row-who">
              ${c(a.kindLabel)} · ${c(a.vehicleName||"Whole agency")} ·
              ${x(a.date)}${a.detail?" · "+c(a.detail):""}
            </div>
          </div>
          <div class="diary-row-status">
            <strong style="color:${a.sign==="−"?"var(--accent-red)":"inherit"};">${a.sign}${f(a.amount)}</strong>
            ${a.source==="diary"?"":`<div class="diary-row-actions">
                   <button class="btn btn-secondary btn-sm" style="color:var(--accent-red);"
                           onclick="removeAccEntry(${a.id})">🗑️</button>
                 </div>`}
          </div>
        </div>`).join(""):'<p class="diary-empty">Nothing recorded for this month yet. Use ➕ Add entry to record fuel, wages, servicing or extra income.</p>'}async function rt(){var t;const e=(t=l.currentUser)==null?void 0:t.operatorName;if(e)try{if(l.mapsApiKey===void 0){const a=await fetch(`${h}/tracking/config`).catch(()=>null),o=a!=null&&a.ok?await a.json():null;l.mapsApiKey=(o==null?void 0:o.mapsApiKey)||""}const n=await fetch(`${h}/tracking?operatorName=${encodeURIComponent(e)}`);if(!n.ok)throw new Error("Could not load tracking");l.tracking=await n.json(),it()}catch(n){document.getElementById("gps-list").innerHTML=`<p class="diary-empty">❌ ${c(n.message)}</p>`}}function it(){const e=l.tracking;e&&(je(document.getElementById("gps-map"),e,{noteEl:document.getElementById("gps-map-note"),apiKey:l.mapsApiKey}),document.getElementById("gps-note").textContent=`${e.reporting} of ${e.total} reporting · live for ${e.staleAfterMinutes} minutes after the last fix`,document.getElementById("gps-endpoint").textContent=`POST ${h}/tracking/vehicles/<vehicleId>
Content-Type: application/json

{ "lat": 9.9312, "lng": 76.2673, "speedKph": 42, "label": "Kochi" }`,document.getElementById("gps-list").innerHTML=e.vehicles.length?e.vehicles.map(t=>{const n=t.location,a=n?n.live?'<span class="badge-status confirmed">LIVE</span>':`<span class="badge-status cancelled">${n.ageMinutes} MIN AGO</span>`:'<span class="badge-status pending">NO SIGNAL</span>',o=n?`${n.label?c(n.label)+" · ":""}${n.lat.toFixed(5)}, ${n.lng.toFixed(5)}${n.speedKph?" · "+Math.round(n.speedKph)+" km/h":""}`:"This bus has never reported a position",i=n?` · <a href="https://www.google.com/maps?q=${n.lat},${n.lng}" target="_blank" rel="noopener">Open map ↗</a>`:"";return`
          <div class="diary-row">
            <div class="diary-row-main">
              <strong>${c(t.vehicleName)}</strong>
              <code class="vehicle-number">${c(t.vehicleNumber||"—")}</code>
              <div class="diary-row-who">${o}${i}</div>
            </div>
            <div class="diary-row-status">${a}</div>
          </div>`}).join(""):'<p class="diary-empty">No buses in the fleet yet.</p>')}function st(){var e,t,n,a,o,i,r,s,d,g,b,p,m,y,u,v,C,E,L,k,B,A,le,de;he.addEventListener("submit",Qe),He.addEventListener("click",Xe),(e=document.getElementById("sidebar-toggle-btn"))==null||e.addEventListener("click",Ze),(t=document.getElementById("sidebar-overlay"))==null||t.addEventListener("click",q),(n=document.getElementById("sidebar-close-btn"))==null||n.addEventListener("click",q),qe.addEventListener("click",S),Z.addEventListener("click",()=>{if(l.subscription&&!se()){alert(`🔒 Your agency is not registered yet.

The yearly platform fee is paid on the Tripnix site. See the Subscription page for the link.`),ae("subscription");return}Se()}),Ge.addEventListener("click",Y),Ke.addEventListener("click",Y),(a=document.getElementById("diary-add-btn"))==null||a.addEventListener("click",()=>re()),(o=document.getElementById("diary-modal-close"))==null||o.addEventListener("click",ne),(i=document.getElementById("diary-modal-cancel"))==null||i.addEventListener("click",ne),(r=document.getElementById("diary-form"))==null||r.addEventListener("submit",ft),(s=document.getElementById("acc-month"))==null||s.addEventListener("change",w=>G(w.target.value)),(d=document.getElementById("acc-add-btn"))==null||d.addEventListener("click",nt),(g=document.getElementById("acc-entry-close"))==null||g.addEventListener("click",te),(b=document.getElementById("acc-entry-cancel"))==null||b.addEventListener("click",te),(p=document.getElementById("acc-entry-form"))==null||p.addEventListener("submit",at),document.querySelectorAll('input[name="acc-kind"]').forEach(w=>w.addEventListener("change",D=>Ie(D.target.value))),(m=document.getElementById("diary-from"))==null||m.addEventListener("change",w=>{const D=document.getElementById("diary-to");D&&(!D.value||D.value<w.target.value)&&(D.value=w.target.value)}),document.querySelectorAll(".filter-chips .chip[data-filter]").forEach(w=>{w.addEventListener("click",()=>{document.querySelectorAll(".filter-chips .chip[data-filter]").forEach(D=>D.classList.remove("active")),w.classList.add("active"),l.fleetFilter=w.getAttribute("data-filter"),l.seatFilter="All",renderFleetSeatFilterChips(),P()})}),document.getElementById("fleet-search").addEventListener("input",w=>{l.searchQuery=w.target.value,P()}),(y=document.getElementById("vehicle-number"))==null||y.addEventListener("input",w=>{w.target.value=w.target.value.toUpperCase()}),$e.addEventListener("submit",Pt),(u=document.getElementById("upload-images-btn"))==null||u.addEventListener("click",()=>{var w;(w=document.getElementById("vehicle-images-input"))==null||w.click()}),(v=document.getElementById("upload-videos-btn"))==null||v.addEventListener("click",()=>{var w;(w=document.getElementById("vehicle-videos-input"))==null||w.click()}),(C=document.getElementById("vehicle-images-input"))==null||C.addEventListener("change",ct),(E=document.getElementById("vehicle-videos-input"))==null||E.addEventListener("change",mt),(L=document.getElementById("vehicle-type"))==null||L.addEventListener("change",O),(k=document.getElementById("vehicle-capacity"))==null||k.addEventListener("input",O),ee&&ee.addEventListener("submit",Tt),(B=document.getElementById("pricing-form"))==null||B.addEventListener("submit",Lt),(A=document.getElementById("trip-form"))==null||A.addEventListener("submit",$t),(le=document.getElementById("trip-image-btn"))==null||le.addEventListener("click",()=>{var w;(w=document.getElementById("trip-image-input"))==null||w.click()}),(de=document.getElementById("trip-image-input"))==null||de.addEventListener("change",ht),lt()}function lt(){const e=document.getElementById("vehicle-type-dropdown"),t=document.getElementById("vehicle-type-trigger"),n=document.getElementById("vehicle-type-menu"),a=document.getElementById("vehicle-type"),o=document.getElementById("selected-type-icon"),i=document.getElementById("selected-type-text"),r=n==null?void 0:n.querySelectorAll(".custom-dropdown-item");if(!t||!n||!a)return;const s={Bus:"🚌",Traveller:"🚐",Car:"🚗"},d={Bus:[{label:"12 Seats",value:12},{label:"22 Seats",value:22},{label:"36 Seats",value:36},{label:"49 Seats",value:49},{label:"Above 49 Seats",value:50,isAbove:!0}],Traveller:[{label:"12 Seats",value:12},{label:"14 Seats",value:14},{label:"16 Seats",value:16},{label:"18 Seats",value:18}],Car:[{label:"4 Seats",value:4},{label:"7 Seats",value:7},{label:"8 Seats",value:8}]};function g(p){var E;const m=document.getElementById("vehicle-seat-options"),y=document.getElementById("vehicle-capacity");if(!m||!y)return;const u=p||((E=document.getElementById("vehicle-type"))==null?void 0:E.value)||"Bus",v=d[u]||d.Bus,C=Number(y.value)||0;m.innerHTML=v.map(L=>`
      <button type="button" class="seat-option-pill${(L.isAbove?C>49:C===L.value)?" active":""}"
              onclick="selectVehicleSeatPill(${L.value}, ${L.isAbove?"true":"false"})">
        ${c(L.label)}
      </button>`).join("")}window.selectVehicleSeatPill=function(p,m){const y=document.getElementById("vehicle-capacity");y&&(y.value=p,g(),O())};function b(){const p=document.getElementById("seat-filter-chips");if(!p)return;const m=l.fleetFilter,y=d[m];if(!y||!y.length){p.innerHTML="",l.seatFilter="All";return}p.innerHTML=`
    <button type="button" class="chip${l.seatFilter==="All"?" active":""}" onclick="setFleetSeatFilter('All')">All Seats</button>
    ${y.map(u=>{const v=u.isAbove?"above49":String(u.value);return`
        <button type="button" class="chip${l.seatFilter===v?" active":""}" onclick="setFleetSeatFilter('${v}')">
          ${c(u.label)}
        </button>`}).join("")}
  `}window.setFleetSeatFilter=function(p){l.seatFilter=p,b(),P()},window.syncCustomTypeDropdown=function(p){const m=p||a.value||"Bus";a.value=m,o&&(o.textContent=s[m]||"🚌"),i&&(i.textContent=m),r==null||r.forEach(y=>{y.classList.toggle("selected",y.dataset.value===m)}),g(m),O()},t.addEventListener("click",p=>{p.stopPropagation(),e.classList.contains("open")?X():dt()}),r==null||r.forEach(p=>{p.addEventListener("click",m=>{m.stopPropagation();const y=p.dataset.value;window.syncCustomTypeDropdown(y),X()})}),document.addEventListener("click",p=>{e&&!e.contains(p.target)&&X()})}function dt(){const e=document.getElementById("vehicle-type-dropdown"),t=document.getElementById("vehicle-type-menu");e==null||e.classList.add("open"),t==null||t.classList.remove("hidden")}function X(){const e=document.getElementById("vehicle-type-dropdown"),t=document.getElementById("vehicle-type-menu");e==null||e.classList.remove("open"),t==null||t.classList.add("hidden")}async function xe(e,t){let n;try{n=await(await fetch(`${h}/uploads/config`)).json()}catch{throw new Error(`Could not reach the API at ${h}. Is the backend server running?`)}if(!n.configured)throw new Error("R2 storage is not configured on the server yet.");const a=n.maxDirectUploadBytes||4194304;if(e.size<=a){const s=new FormData;s.append("files",e);let d;try{d=await fetch(`${h}/uploads?folder=${encodeURIComponent(t)}`,{method:"POST",body:s})}catch{throw new Error(`Upload of "${e.name}" (${R(e.size)}) was cut off before it finished. Check that the backend is still running, then try again.`)}const g=await d.json().catch(()=>null);if(!d.ok)throw new Error((g==null?void 0:g.error)||`Upload failed (${d.status})`);return g.urls[0]}const o=await fetch(`${h}/uploads/presign`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fileName:e.name,contentType:e.type,folder:t})}),i=await o.json().catch(()=>null);if(!o.ok)throw new Error((i==null?void 0:i.error)||"Could not presign upload");let r;try{r=await fetch(i.uploadUrl,{method:"PUT",headers:{"Content-Type":e.type},body:e})}catch{throw new Error(`"${e.name}" is ${R(e.size)}, above this server's ${R(a)} direct-upload limit, so the browser must send it to Cloudflare R2 itself — and R2 refused the connection.

Add ${window.location.origin} to the bucket's CORS policy in the Cloudflare dashboard (R2 → tripnix → Settings → CORS), or upload a smaller file.`)}if(!r.ok)throw new Error(`Direct upload to R2 failed (${r.status}).`);return i.url}function R(e){return Number.isFinite(e)?e>=1048576?`${(e/1048576).toFixed(1)} MB`:`${Math.max(1,Math.round(e/1024))} KB`:"—"}async function Be(e,t,n){const a=Array.from(e.target.files||[]);if(!a.length)return;const o=document.getElementById("media-upload-status"),i=r=>{o&&(o.textContent=r)};try{for(let r=0;r<a.length;r++){const s=a[r];i(`Uploading ${r+1} of ${a.length} — ${s.name} (${R(s.size)})…`);const d=await xe(s,t);l[n].push(d),U()}i("")}catch(r){i(""),alert("❌ "+r.message)}finally{e.target.value=""}}function ct(e){return Be(e,"vehicles/images","vehicleFormImages")}function mt(e){return Be(e,"vehicles/videos","vehicleFormVideos")}function U(){const e=document.getElementById("images-preview-grid"),t=document.getElementById("videos-preview-grid");e&&(e.innerHTML=l.vehicleFormImages.map((n,a)=>`
      <div class="media-preview-item">
        <img src="${c(n)}" alt="Vehicle image ${a+1}" />
        <button type="button" class="media-preview-remove" onclick="removeFormImage(${a})" title="Remove image">&times;</button>
      </div>
    `).join("")),t&&(t.innerHTML=l.vehicleFormVideos.map((n,a)=>`
      <div class="media-preview-item">
        <video src="${c(n)}" muted preload="metadata"></video>
        <button type="button" class="media-preview-remove" onclick="removeFormVideo(${a})" title="Remove video">&times;</button>
      </div>
    `).join(""))}window.removeFormImage=function(e){l.vehicleFormImages.splice(e,1),U()};window.removeFormVideo=function(e){l.vehicleFormVideos.splice(e,1),U()};async function S(){var e;try{const[t,n]=await Promise.all([fetch(`${h}/vehicles`),fetch(`${h}/bookings`)]);if(!t.ok||!n.ok)throw new Error("API error");const a=await t.json(),o=await n.json();if(l.currentUser&&l.currentUser.role!=="superadmin"){const i=l.currentUser.operatorName.toLowerCase();l.vehicles=a.filter(r=>r.operatorName.toLowerCase()===i),l.bookings=o.filter(r=>r.operatorName&&r.operatorName.toLowerCase()===i)}else l.vehicles=a,l.bookings=o;Dt(),P(),Nt(),await W(),await K(),((e=l.currentUser)==null?void 0:e.role)==="superadmin"&&await J()}catch(t){console.error("Load error:",t),alert("Cannot connect to backend (http://localhost:3000). Please start the backend first.")}}async function oe(){var t,n,a;await S();const e=document.getElementById("diary-list");e&&(e.innerHTML='<p class="diary-empty">Loading agency diary…</p>');try{const o=((t=l.currentUser)==null?void 0:t.operatorName)||"",i=await fetch(`${h}/trips/agency-diary?operatorName=${encodeURIComponent(o)}`);if(!i.ok)throw new Error("Could not load agency diary");l.agencyDiaryData=await i.json();const r=((n=l.agencyDiaryData)==null?void 0:n.entries)||[],s=new Set;r.forEach(d=>{if(d.status==="Completed"||!d.departureDate||!d.arrivalDate)return;let g=new Date(`${d.departureDate}T00:00:00`);const b=new Date(`${d.arrivalDate}T00:00:00`);for(;g<=b;)s.add(g.toISOString().slice(0,10)),g.setDate(g.getDate()+1)}),l.diary={entries:r,latestTrip:((a=l.agencyDiaryData)==null?void 0:a.latestTrip)||null,bookedDates:Array.from(s)}}catch(o){l.diary=null,e&&(e.innerHTML=`<p class="diary-empty">❌ ${c(o.message)}</p>`);return}pt()}function pt(){ut(),gt(),yt()}function ut(){var a;const e=document.getElementById("latest-diary-trip-container");if(!e)return;const t=(a=l.diary)==null?void 0:a.latestTrip;if(!t){e.innerHTML=`
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
        <span class="badge-status ${n}">${c(t.status)}</span>
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
            <strong>${x(t.departureDate)} → ${x(t.arrivalDate)}</strong>
            <small>(${t.durationDays} day${t.durationDays===1?"":"s"})</small>
          </div>
          <div class="latest-diary-fare">
            <span class="meta-label">AGREED FARE</span>
            <strong class="fare-amount">${f(t.fare)}</strong>
          </div>
        </div>
      </div>
    </div>`}function gt(){const e=document.getElementById("diary-list"),t=document.getElementById("diary-summary");if(!e)return;const n=l.diary;if(!n){e.innerHTML="",t&&(t.innerHTML="");return}const a=n.entries.filter(r=>r.status!=="Completed"),o=n.entries.filter(r=>r.kind==="diary"),i=o.reduce((r,s)=>r+Number(s.fare||0),0);if(t&&(t.innerHTML=`
      <div class="diary-stat"><strong>${a.length}</strong><span>Active / Scheduled</span></div>
      <div class="diary-stat"><strong>${n.bookedDates.length}</strong><span>Days Booked</span></div>
      <div class="diary-stat"><strong>${o.length}</strong><span>Diary Orders</span></div>
      <div class="diary-stat"><strong>${f(i)}</strong><span>Total Fares</span></div>`),!n.entries.length){e.innerHTML='<p class="diary-empty">No orders in your agency diary yet. Use ➕ Add Entry to write an order, or tap a date on the calendar.</p>';return}e.innerHTML=n.entries.map(r=>{const s=r.status==="On Trip"?"confirmed":r.status==="Completed"?"cancelled":"pending",d=r.kind==="diary",g=r.customerPhone?` · <a href="tel:${c(r.customerPhone)}">${c(r.customerPhone)}</a>`:"";let b="";d||r.kind==="booking"?b=`<div class="diary-row-who">👤 ${c(r.customerName||"Customer")}${g}${r.fare?` · <strong>${f(r.fare)}</strong>`:""}</div>`:r.note&&(b=`<div class="diary-row-who">${c(r.note)}</div>`),d&&r.note&&(b+=`<div class="diary-row-who" style="color:var(--text-muted);">📝 ${c(r.note)}</div>`);const p=d?"📕 "+c(r.place||"Agency Order"):r.kind==="booking"?"📑 Customer booking":"🗺️ "+c(r.place||"Trip"),m=d?`<div class="diary-row-actions">
           <button class="btn btn-secondary btn-sm" onclick="editDiaryEntry(${r.id})">✏️ Edit</button>
           <button class="btn btn-secondary btn-sm" style="color:var(--accent-red);" onclick="deleteDiaryEntry(${r.id})">🗑️ Delete</button>
         </div>`:"";return`
      <div class="diary-row">
        <div class="diary-row-dates">
          <strong>${x(r.departureDate)}</strong>
          <span>→ ${x(r.arrivalDate)}</span>
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
      </div>`}).join("")}function yt(){const e=document.getElementById("diary-calendar");if(!e)return;const t=l.diary;if(!t){e.innerHTML="";return}const n=new Set(t.bookedDates),a=new Date,o=[0,1].map(i=>new Date(a.getFullYear(),a.getMonth()+i,1));e.innerHTML=o.map(i=>{const r=i.toLocaleDateString(void 0,{month:"long",year:"numeric"}),s=new Date(i.getFullYear(),i.getMonth()+1,0).getDate(),d=(i.getDay()+6)%7,g=p=>(t.entries||[]).filter(m=>m.status!=="Completed"&&p>=m.departureDate&&p<=m.arrivalDate).map(m=>`${m.customerName||"Booked"}${m.place?" — "+m.place:""}`).join(" | "),b=[];for(let p=0;p<d;p++)b.push('<span class="diary-day is-blank"></span>');for(let p=1;p<=s;p++){const m=`${i.getFullYear()}-${String(i.getMonth()+1).padStart(2,"0")}-${String(p).padStart(2,"0")}`,y=n.has(m),u=y?`${m} — ${g(m)}`:`${m} — free, tap to write an order`;b.push(`<span class="diary-day${y?" is-booked":""}" title="${c(u)}"${y?"":` role="button" onclick="openDiaryModalForDate('${m}')"`}>${p}</span>`)}return`
      <div class="diary-month">
        <div class="diary-month-label">${c(r)}</div>
        <div class="diary-weekdays"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
        <div class="diary-grid">${b.join("")}</div>
      </div>`}).join("")}function re(e=null,t=null){const n=document.getElementById("diary-modal");if(!n)return;document.getElementById("diary-modal-title").textContent=e?"Edit Diary Entry":"New Diary Entry";const a=document.getElementById("diary-modal-bus");a&&(a.textContent="📕 Agency Travel Order"),document.getElementById("diary-entry-id").value=(e==null?void 0:e.id)??"",document.getElementById("diary-customer").value=(e==null?void 0:e.customerName)??"",document.getElementById("diary-phone").value=(e==null?void 0:e.customerPhone)??"",document.getElementById("diary-place").value=(e==null?void 0:e.place)??"",document.getElementById("diary-from").value=(e==null?void 0:e.departureDate)??t??"",document.getElementById("diary-to").value=(e==null?void 0:e.arrivalDate)??t??"",document.getElementById("diary-fare").value=e!=null&&e.fare?String(e.fare):"",document.getElementById("diary-note").value=(e==null?void 0:e.note)??"",document.getElementById("diary-save-btn").textContent=e?"Update Entry":"Save Entry",n.classList.remove("hidden"),document.getElementById("diary-customer").focus()}function ne(){var e,t;(e=document.getElementById("diary-modal"))==null||e.classList.add("hidden"),(t=document.getElementById("diary-form"))==null||t.reset()}window.openDiaryModalForDate=function(e){re(null,e)};window.editDiaryEntry=function(e){var n;const t=(((n=l.diary)==null?void 0:n.entries)||[]).find(a=>a.id===e);t&&re(t)};window.deleteDiaryEntry=async function(e){var n;const t=(((n=l.diary)==null?void 0:n.entries)||[]).find(a=>a.id===e);if(t&&confirm(`Remove ${t.customerName||"this entry"} (${x(t.departureDate)} → ${x(t.arrivalDate)}) from the agency diary?`))try{if(!(await fetch(`${h}/trips/${e}`,{method:"DELETE"})).ok)throw new Error("Could not remove this entry");await oe()}catch(a){alert("❌ "+a.message)}};async function ft(e){var i;e.preventDefault();const t=document.getElementById("diary-entry-id").value,n={operatorName:(i=l.currentUser)==null?void 0:i.operatorName,customerName:document.getElementById("diary-customer").value.trim(),customerPhone:document.getElementById("diary-phone").value.trim(),place:document.getElementById("diary-place").value.trim(),departureDate:document.getElementById("diary-from").value,arrivalDate:document.getElementById("diary-to").value,fare:document.getElementById("diary-fare").value,note:document.getElementById("diary-note").value.trim()},a=document.getElementById("diary-save-btn"),o=a.textContent;a.disabled=!0,a.textContent="Saving…";try{const r=await fetch(t?`${h}/trips/diary/${t}`:`${h}/trips/diary`,{method:t?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(n)}),s=await r.json().catch(()=>null);if(!r.ok)throw new Error((s==null?void 0:s.error)||"Could not save this entry");ne(),await oe()}catch(r){alert("❌ "+r.message)}finally{a.disabled=!1,a.textContent=o}}async function K(){var t;const e=(t=l.currentUser)==null?void 0:t.operatorName;if(e)try{const n=l.currentUser.role==="superadmin"?`${h}/trips`:`${h}/trips?operatorName=${encodeURIComponent(e)}`,a=await fetch(n);if(!a.ok)throw new Error("Failed to load trips");l.trips=await a.json(),ke(),bt()}catch(n){console.error("Trips load error:",n)}}function ke(){const e=document.getElementById("trip-vehicle");if(!e)return;if(!l.vehicles.length){e.innerHTML='<option value="">No vehicles in your fleet yet</option>';return}const t=ie(),n=e.value;e.innerHTML=l.vehicles.map(a=>`
    <option value="${a.id}" ${t?"":"disabled"}>
      ${c(a.name)} · ${c(a.vehicleNumber||"—")}${t?"":"  (fleet fee not paid)"}
    </option>`).join(""),n&&(e.value=n)}async function ht(e){const t=(e.target.files||[])[0];if(!t)return;const n=document.getElementById("trip-image-status"),a=n==null?void 0:n.textContent;n&&(n.textContent="Uploading to R2…");try{const o=await xe(t,"trips");document.getElementById("trip-image").value=o,Ce(),n&&(n.textContent="Uploaded ✓")}catch(o){n&&(n.textContent=a||""),alert("❌ "+o.message)}finally{e.target.value=""}}function Ce(){const e=document.getElementById("trip-image-preview"),t=document.getElementById("trip-image").value.trim();e&&(e.innerHTML=t?`<img src="${c(t)}" alt="Trip image preview" onerror="this.style.display='none'" />`:"")}function vt(e){return e==="On Trip"?"confirmed":e==="Completed"?"cancelled":"pending"}function bt(){const e=document.getElementById("trips-tbody"),t=document.getElementById("trips-count-note");if(!e)return;if(!l.trips.length){e.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">No trips posted yet.</td></tr>',t&&(t.textContent="");return}const n=l.trips.filter(a=>a.busListed&&a.status!=="Completed").length;t&&(t.textContent=`${n} of ${l.trips.length} showing in the app`),e.innerHTML=l.trips.map(a=>`
    <tr>
      <td>
        <strong>${c(a.place)}</strong><br>
        <small style="color:var(--text-muted);">${a.durationDays} day${a.durationDays===1?"":"s"}${a.note?" · "+c(a.note):""}</small>
      </td>
      <td>
        ${c(a.vehicleName||"—")}<br>
        <code class="vehicle-number">${c(a.vehicleNumber||"—")}</code>
      </td>
      <td>${x(a.departureDate)}</td>
      <td>${x(a.arrivalDate)}</td>
      <td>
        <span class="badge-status ${vt(a.status)}">${c(a.status)}</span>
        ${a.busListed?"":'<br><small style="color:var(--accent-red);">bus not subscribed</small>'}
      </td>
      <td>
        <button class="btn btn-secondary btn-sm" style="color:var(--accent-red);" onclick="deleteTrip(${a.id})">🗑️ Delete</button>
      </td>
    </tr>`).join("")}async function $t(e){e.preventDefault();const t=document.getElementById("trip-vehicle").value;if(!t)return alert("❌ Add a subscribed vehicle to your fleet first.");const n={operatorName:l.currentUser.operatorName,vehicleId:Number(t),place:document.getElementById("trip-place").value.trim(),departureDate:document.getElementById("trip-departure").value,arrivalDate:document.getElementById("trip-arrival").value,imageUrl:document.getElementById("trip-image").value.trim(),note:document.getElementById("trip-note").value.trim()};try{const a=await fetch(`${h}/trips`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(n)}),o=await a.json().catch(()=>null);if(!a.ok)throw new Error((o==null?void 0:o.error)||"Failed to post trip");document.getElementById("trip-form").reset(),Ce(),await K(),alert(`✅ Trip to ${o.place} posted!

Bus: ${o.vehicleName} (${o.vehicleNumber})
Departs: ${x(o.departureDate)}
Arrives: ${x(o.arrivalDate)}
Status: ${o.status}`)}catch(a){alert("❌ "+a.message)}}window.deleteTrip=async function(e){if(confirm("Remove this trip from the traveller app?"))try{if(!(await fetch(`${h}/trips/${e}`,{method:"DELETE"})).ok)throw new Error("Failed to delete trip");await K()}catch(t){alert("❌ "+t.message)}};async function W(){var t;const e=(t=l.currentUser)==null?void 0:t.operatorName;if(e)try{const[n,a]=await Promise.all([fetch(`${h}/subscriptions/plans`),fetch(`${h}/subscriptions?operatorName=${encodeURIComponent(e)}`)]);if(!n.ok||!a.ok)throw new Error("Failed to load subscription data");if(l.plans=await n.json(),l.subscription=await a.json(),l.currentUser.role==="superadmin"){const o=await fetch(`${h}/subscriptions/overview`);o.ok&&(l.agencySubs=await o.json())}wt()}catch(n){console.error("Subscription load error:",n)}}function f(e){var a;const t=((a=l.plans)==null?void 0:a.currencySymbol)||"₹",n=Number(e||0);return(n<0?"-":"")+t+Math.abs(n).toLocaleString("en-IN")}function x(e){return e?new Date(e).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}):"—"}function j(e){var a;const t=((a=l.plans)==null?void 0:a.fleetTiers)||[],n=Math.max(1,Number(e)||0);return t.find(o=>n>=o.minVehicles&&(o.maxVehicles===null||n<=o.maxVehicles))||t[t.length-1]||null}function I(){return l.vehicles.length}function H(){var e;return((e=l.subscription)==null?void 0:e.fleet)||null}function ie(){var e;return((e=H())==null?void 0:e.status)==="active"}function Le({title:e,lead:t,planName:n,planSub:a,planPrice:o,lines:i=[],total:r,note:s,actionLabel:d}){return new Promise(g=>{const b=document.getElementById("payment-modal");if(!b)return g(!0);document.getElementById("payment-title").textContent=e,document.getElementById("payment-lead").textContent=t||"",document.getElementById("payment-plan").innerHTML=`
      <div>
        <span class="pay-plan-name">${c(n)}</span>
        <span class="pay-plan-sub">${c(a||"")}</span>
      </div>
      <div>
        <span class="pay-plan-price">${o}</span>
        <span class="pay-plan-period">per ${c(T())}</span>
      </div>`,document.getElementById("payment-lines").innerHTML=i.map(v=>`<div><dt>${c(v.label)}</dt><dd>${v.value}</dd></div>`).join(""),document.getElementById("payment-total").textContent=r,document.getElementById("payment-note").textContent=s||"No card is charged yet — the payment gateway is being connected. Confirming records this payment against your agency.";const p=document.getElementById("payment-confirm");p.textContent=d||"Pay & Continue";const m=v=>{b.classList.add("hidden"),p.removeEventListener("click",y),document.getElementById("payment-cancel").removeEventListener("click",u),document.getElementById("payment-close").removeEventListener("click",u),g(v)},y=()=>m(!0),u=()=>m(!1);p.addEventListener("click",y),document.getElementById("payment-cancel").addEventListener("click",u),document.getElementById("payment-close").addEventListener("click",u),b.classList.remove("hidden")})}function N({icon:e="✅",title:t,lead:n,lines:a=[],actionLabel:o="Done"}){return new Promise(i=>{const r=document.getElementById("notice-modal");if(!r)return alert(`${t}

${n||""}`),i();document.getElementById("notice-icon").textContent=e,document.getElementById("notice-title").textContent=t,document.getElementById("notice-lead").textContent=n||"",document.getElementById("notice-lines").innerHTML=a.map(g=>`<div><dt>${c(g.label)}</dt><dd>${g.value}</dd></div>`).join("");const s=document.getElementById("notice-ok");s.textContent=o;const d=()=>{r.classList.add("hidden"),s.removeEventListener("click",d),i()};s.addEventListener("click",d),r.classList.remove("hidden")})}function Te(){const e=j(I()+1);if(!e)return null;const t=H();return!t||t.status!=="active"?{tier:e,charge:e.price,upgrade:!1}:t.tierId===e.tierId?{tier:e,charge:0,upgrade:!1}:{tier:e,charge:Math.max(0,e.price-(t.price||0)),upgrade:!0}}function T(){var e;return((e=l.plans)==null?void 0:e.billingPeriod)||"month"}function se(){var e,t;return((t=(e=l.subscription)==null?void 0:e.platform)==null?void 0:t.status)==="active"}function wt(){l.plans&&(Et(),xt(),It(),Bt(),kt(),Ct())}function Et(){var u;const e=l.plans.platform,t=(u=l.subscription)==null?void 0:u.platform,n=se(),a=window.location.origin.includes("3005")?"http://localhost:3000/":window.location.origin+"/";document.getElementById("membership-title").textContent=e.name;const o=e.plans||[],i=o.find(v=>v.id===(t==null?void 0:t.planId)),r=o.reduce((v,C)=>v&&v.price<=C.price?v:C,o[0]),s=i||r;document.getElementById("membership-price").textContent=s?`${f(s.price)} / ${s.period}`:f(e.price);const d=document.querySelector(".membership-price-label");d&&(d.textContent=i?"Your platform plan":"Platform fee from"),document.getElementById("membership-benefits").innerHTML=e.features.map(v=>`<li>${c(v)}</li>`).join("");const g=document.getElementById("membership-badge"),b=document.getElementById("membership-card"),p=document.getElementById("membership-status-line"),m=document.getElementById("membership-managed-note");b.classList.toggle("is-active",n),document.getElementById("membership-start").textContent=x(t==null?void 0:t.startsAt),document.getElementById("membership-expiry").textContent=x(t==null?void 0:t.expiresAt),document.getElementById("membership-remaining").textContent=t&&n?`${t.daysLeft} days`:"—",document.getElementById("membership-paid").textContent=t?f(t.amount):"—",n?(g.className="badge-status confirmed",g.textContent="ACTIVE",p.textContent=`${l.subscription.operatorName} is registered. You can add vehicles and browse other agencies' fleets.`,m.innerHTML=`🔒 Managed on the Tripnix site — renew at <a href="${a}" target="_blank" rel="noopener">${a}</a> before it expires.`):t?(g.className="badge-status cancelled",g.textContent="EXPIRED",p.textContent="Your membership has lapsed, so your fleet is hidden from travellers.",m.innerHTML=`⚠️ Renew on the Tripnix site to go live again: <a href="${a}" target="_blank" rel="noopener">${a}</a>`):(g.className="badge-status pending",g.textContent="NOT REGISTERED",p.textContent=e.tagline,m.innerHTML=`⚠️ Pay the platform fee on the Tripnix site to activate your agency: <a href="${a}" target="_blank" rel="noopener">${a}</a>`);const y=document.getElementById("subscription-badge");y&&(y.style.display=n?"none":"inline-block")}function It(){var a;const e=l.plans?document.getElementById("plan-grid"):null;if(!e)return;const t=l.plans.fleetTiers||[];if(!t.length){e.innerHTML='<p class="plan-empty">No fleet plan configured.</p>';return}const n=(a=j(I()))==null?void 0:a.id;e.innerHTML=`
    <div class="plan-cards">
      ${t.map(o=>`
        <div class="plan-card${o.id===n&&I()>0?" is-current":""}">
          <span class="plan-card-tier">🚍 ${c(o.label)}</span>
          <span class="plan-card-seats">${o.maxVehicles===null?`${o.minVehicles} or more vehicles`:`${o.minVehicles}–${o.maxVehicles} vehicles, one fee`}</span>
          <div class="plan-card-price">${f(o.price)}</div>
          <span class="plan-card-period">whole fleet / ${T()}</span>
        </div>`).join("")}
    </div>`}function xt(){var a,o,i,r;const e=document.getElementById("platform-plan-options");if(!e)return;const t=((o=(a=l.plans)==null?void 0:a.platform)==null?void 0:o.plans)||[];if(!t.length){e.innerHTML="";return}const n=(r=(i=l.subscription)==null?void 0:i.platform)==null?void 0:r.planId;e.innerHTML=t.map(s=>`
    <div class="platform-plan${s.id===n?" is-current":""}">
      <div class="platform-plan-head">
        <span class="platform-plan-label">${c(s.label)}</span>
        <span class="platform-plan-price">${f(s.price)}</span>
      </div>
      <span class="platform-plan-note">
        ${s.id===n?"Your current plan":s.note?c(s.note):`Billed every ${c(s.period)}`}
      </span>
    </div>`).join("")}function Bt(){const e=document.getElementById("listings-tbody"),t=document.getElementById("listing-total-note");if(!e)return;if(!l.vehicles.length){e.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">No vehicles in your fleet yet.</td></tr>',t.textContent="";return}const n=H(),a=ie(),o=j(I()),i=a?'<span class="badge-status confirmed">LISTED</span>':n?'<span class="badge-status cancelled">EXPIRED</span>':'<span class="badge-status pending">UNPAID</span>';e.innerHTML=l.vehicles.map(d=>`
    <tr>
      <td><strong>${c(d.name)}</strong></td>
      <td><code class="vehicle-number">${c(d.vehicleNumber||"—")}</code></td>
      <td>${c(d.type)}</td>
      <td>${d.capacity}</td>
      <td><small style="color:var(--text-muted);">covered by fleet plan</small></td>
      <td>${i}</td>
      <td><small style="color:var(--text-muted);">—</small></td>
    </tr>`).join("");const r=o?c(o.label):"—",s=o?f(o.price):"—";a?t.innerHTML=`${I()} vehicle${I()===1?"":"s"} on the <strong>${r}</strong> plan (${s}/${T()}) · renews ${x(n.expiresAt)} · ${n.daysLeft} days left <button class="btn btn-secondary btn-sm" style="margin-left:10px;" onclick="payFleetFee()">🔄 Renew ${s}</button>`:t.innerHTML=`Your fleet of ${I()} needs the <strong>${r}</strong> plan (${s}/${T()}). Your vehicles stay hidden from travellers until it is paid. <button class="btn btn-primary btn-sm" style="margin-left:10px;" onclick="payFleetFee()">💳 Pay ${s}</button>`}function kt(){var r;const e=document.getElementById("superadmin-subscription-panels");if(!e)return;if(((r=l.currentUser)==null?void 0:r.role)!=="superadmin"){e.classList.add("hidden");return}e.classList.remove("hidden");const t=(l.plans.platform.plans||[])[0],n=document.getElementById("price-platform");n&&document.activeElement!==n&&(n.value=t?t.price:l.plans.platform.price);const a=document.getElementById("price-platform-label");a&&t&&(a.textContent=`Platform membership (per ${t.period})`);const o=document.getElementById("tier-price-inputs");o.dataset.built||(o.innerHTML=(l.plans.fleetTiers||[]).map(s=>`
      <div class="form-group">
        <label for="price-${s.id}">${c(s.label)} <small style="color:var(--text-muted);">(whole fleet / ${T()})</small></label>
        <input type="number" id="price-${s.id}" data-tier-id="${s.id}" min="0" step="1" required />
      </div>`).join(""),o.dataset.built="true"),(l.plans.fleetTiers||[]).forEach(s=>{const d=document.getElementById(`price-${s.id}`);d&&document.activeElement!==d&&(d.value=s.price)});const i=document.getElementById("agency-subs-tbody");if(!l.agencySubs.length){i.innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">No agency has subscribed yet.</td></tr>';return}i.innerHTML=l.agencySubs.map(s=>`
    <tr>
      <td><strong>${c(s.operatorName)}</strong></td>
      <td>${s.platform?`<span class="badge-status ${s.platform.status==="active"?"confirmed":"cancelled"}">${s.platform.status.toUpperCase()}</span>`:'<span class="badge-status pending">NONE</span>'}</td>
      <td>${s.platform?x(s.platform.expiresAt):"—"}</td>
      <td>${s.fleet?`${c(s.fleet.tierLabel)} · ${s.vehicleCount} vehicle${s.vehicleCount===1?"":"s"}<br><span class="badge-status ${s.fleet.status==="active"?"confirmed":"cancelled"}">${s.fleet.status.toUpperCase()}</span>`:'<span class="badge-status pending">NO FLEET PLAN</span>'}</td>
      <td><strong>${f(s.totalPaid)}</strong></td>
    </tr>`).join("")}function Ct(){const e=se();Z.title=e?"Add a vehicle to your fleet":"Pay the platform fee first to start adding vehicles",Z.classList.toggle("btn-locked",!e)}window.payFleetFee=async function(){var o,i;const e=(o=l.currentUser)==null?void 0:o.operatorName;if(!e)return;const t=j(I());if(!t)return alert("❌ No fleet plan is configured.");const n=ie();if(await Le({title:n?"Renew Fleet Plan":"Confirm Payment",lead:n?`Extends your fleet plan by another ${T()} from its current expiry.`:"One fee covers every vehicle you run — priced by how many that is.",planName:`${t.label} fleet plan`,planSub:`Covers all ${I()} of your vehicle${I()===1?"":"s"}`,planPrice:f(t.price),lines:[{label:"Plan price",value:`${f(t.price)} / ${T()}`},{label:"Vehicles covered",value:String(I())},...n?[{label:"Extends from",value:x((i=H())==null?void 0:i.expiresAt)}]:[]],total:f(t.price),actionLabel:n?`Renew · ${f(t.price)}`:`Pay ${f(t.price)}`}))try{const r=await fetch(`${h}/subscriptions/fleet`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({operatorName:e,vehicleCount:I()})}),s=await r.json();if(!r.ok)throw new Error((s==null?void 0:s.error)||"Payment failed");await W(),P(),ke(),await N({icon:n?"🔄":"🎉",title:n?"Fleet plan renewed":"Your fleet is listed!",lead:n?"Your vehicles stay visible to travellers for another period.":"Every vehicle in your fleet is now visible to travellers.",lines:[{label:"Fleet plan",value:c(s.tierLabel)},{label:"Vehicles covered",value:String(I())},{label:"Paid now",value:f(t.price)},{label:"Covered until",value:x(s.expiresAt)}]})}catch(r){alert("❌ "+r.message)}};async function Lt(e){e.preventDefault();const t=Number(document.getElementById("price-platform").value),n=[...document.querySelectorAll("#tier-price-inputs input[data-tier-id]")].map(a=>({id:a.dataset.tierId,price:Number(a.value)}));try{const a=await fetch(`${h}/subscriptions/plans`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({platformPrice:t,fleetTiers:n})}),o=await a.json();if(!a.ok)throw new Error((o==null?void 0:o.error)||"Failed to save pricing");await W(),alert("✅ Plan pricing updated.")}catch(a){alert("❌ "+a.message)}}async function J(){var e;if(((e=l.currentUser)==null?void 0:e.role)==="superadmin")try{const t=await fetch(`${h}/auth/admins`);if(!t.ok)throw new Error("Failed");l.admins=await t.json(),St()}catch(t){console.error("Admins load error:",t)}}async function Tt(e){e.preventDefault();const t=document.getElementById("admin-username").value.trim(),n=document.getElementById("admin-password").value.trim(),a=document.getElementById("admin-operator").value.trim(),o=document.getElementById("admin-phone").value.trim();try{const i=await fetch(`${h}/auth/admins`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:t,password:n,operatorName:a,phone:o})});let r=null;try{r=await i.json()}catch{r=null}if(!i.ok)throw new Error((r==null?void 0:r.error)||"Failed to create account");ee.reset(),await J(),alert(`✅ Account created!

Travel Agency: ${a}
Username: ${t}
Password: ${n}

Share these credentials with the travel owner.`)}catch(i){alert("❌ "+i.message)}}function St(){const e=document.getElementById("admins-table-tbody");if(e){if(!l.admins.length){e.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">No travel owner accounts yet.</td></tr>';return}e.innerHTML=l.admins.map(t=>`
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
    </tr>`).join("")}}window.deleteAdmin=async function(e){if(confirm("Delete this travel owner account?"))try{if(!(await fetch(`${h}/auth/admins/${e}`,{method:"DELETE"})).ok)throw new Error("Failed to delete");await J()}catch(t){alert("❌ "+t.message)}};function Dt(){let e=0,t=0;l.bookings.forEach(d=>{d.status==="Confirmed"?e++:d.status==="Pending"&&t++});const n=new Set;l.vehicles.forEach(d=>(d.availableDates||[]).forEach(g=>n.add(g))),document.getElementById("stat-fleet").textContent=`${l.vehicles.length} Units`,document.getElementById("stat-schedules").textContent=`${n.size} Days`,document.getElementById("stat-confirmed").textContent=e,document.getElementById("stat-pending").textContent=t,ge.textContent=t,ge.style.display=t>0?"inline-block":"none";const a=l.vehicles.filter(d=>d.type==="Bus").length,o=l.vehicles.filter(d=>d.type==="Traveller").length,i=l.vehicles.filter(d=>d.type==="Car").length;document.getElementById("bus-count").textContent=a,document.getElementById("bus-count-desc").textContent=`${a} buses in fleet`,document.getElementById("traveller-count").textContent=o,document.getElementById("traveller-count-desc").textContent=`${o} travellers in fleet`,document.getElementById("car-count").textContent=i,document.getElementById("car-count-desc").textContent=`${i} cars in fleet`;const r=document.getElementById("recent-bookings-tbody"),s=[...l.bookings].reverse().slice(0,5);r.innerHTML=s.length===0?'<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">No bookings yet</td></tr>':s.map(d=>`
      <tr>
        <td><strong>${c(d.vehicleName)}</strong></td>
        <td>${c(d.userName)}</td>
        <td>${d.startDate} → ${d.endDate}</td>
        <td><span class="badge-status ${d.status.toLowerCase()}">${d.status}</span></td>
      </tr>`).join("")}function P(){const e=document.getElementById("vehicles-grid");if(!e)return;const t=l.vehicles.filter(n=>{const a=l.fleetFilter==="All"||n.type===l.fleetFilter;let o=!0;if(l.seatFilter&&l.seatFilter!=="All"){const s=Number(n.capacity)||0;l.seatFilter==="above49"?o=s>49:o=s===Number(l.seatFilter)}const i=l.searchQuery.trim().toLowerCase(),r=!i||n.name.toLowerCase().includes(i)||n.operatorName.toLowerCase().includes(i);return a&&o&&r});if(!t.length){e.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--text-muted);">No vehicles found.</div>';return}e.innerHTML=t.map(n=>{const a=n.availableDates||[],o=a.length?a.map(r=>`<span class="date-pill">${r}</span>`).join(""):'<span style="font-size:11px;color:var(--text-muted);">No dates posted yet</span>',i=n.onHold?De(n.heldSince):0;return`
    <div class="vehicle-admin-card${n.onHold?" is-held":""}">
      <div class="card-image">
        ${(n.imageUrls||[])[0]?`<img src="${(n.imageUrls||[])[0]}" alt="${c(n.name)}" />`:'<div class="card-image-empty">No photo uploaded</div>'}
        <span class="card-badge">${n.type.toUpperCase()}</span>
        ${n.onHold?'<span class="card-hold-badge">⏸️ ON HOLD</span>':""}
      </div>
      <div class="card-body">
        <h4 class="card-title">${c(n.name)}</h4>
        <p class="card-operator">
          <code class="vehicle-number">${c(n.vehicleNumber||"—")}</code>
          &nbsp;·&nbsp; ${c(n.operatorName)}
        </p>
        ${n.onHold?`
          <div class="hold-note">
            <strong>Off the app for ${i} day${i===1?"":"s"}</strong>
            <span>${n.holdReason?c(n.holdReason)+" · ":""}since ${x(n.heldSince)}</span>
            <span>These days are added back to your plan when you resume it.</span>
          </div>`:""}
        <div class="card-specs">
          <span>👥 ${n.capacity} Seats</span>
          <span title="Worked out from this vehicle's ${n.ratedOn||0} amenit${n.ratedOn===1?"y":"ies"} — tick more in Edit to raise it">
            ⭐ ${(n.rating??3).toFixed(1)} · ${c(n.ratingLabel||"Standard")}
          </span>
        </div>
        <div class="rating-basis">
          ${(n.features||[]).length?(n.features||[]).map(r=>`<span class="feature-pill">${c(r)}</span>`).join(""):'<span class="feature-empty">No amenities ticked — add some in Edit to raise the rating</span>'}
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
    </div>`}).join("")}function Nt(){const e=document.getElementById("all-bookings-tbody"),t=[...l.bookings].reverse();e.innerHTML=t.length?t.map(n=>`
      <tr>
        <td>#${n.id}</td>
        <td><strong>${c(n.vehicleName)}</strong></td>
        <td>${c(n.userName)}</td>
        <td>${c(n.userPhone)}</td>
        <td>${n.startDate} → ${n.endDate}</td>
        <td><span class="badge-status ${n.status.toLowerCase()}">${n.status}</span></td>
        <td>${n.status==="Pending"?`
          <button class="btn btn-action-confirm" onclick="updateBookingStatus(${n.id}, 'Confirmed')">Confirm</button>
          <button class="btn btn-action-cancel" onclick="updateBookingStatus(${n.id}, 'Cancelled')">Cancel</button>`:"—"}
        </td>
      </tr>`).join(""):'<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:32px;">No bookings found.</td></tr>'}let $=null;function At(){const e=document.getElementById("vehicle-dates");e&&typeof flatpickr<"u"&&!$&&($=flatpickr(e,{mode:"multiple",dateFormat:"Y-m-d",conjunction:", ",theme:"dark",monthSelectorType:"dropdown",onChange:t=>{_(t)}}),Ft())}function _(e){const t=document.getElementById("selected-date-chips"),n=document.getElementById("selected-dates-count");if(!t)return;const a=(e||[]).map(o=>{if(o instanceof Date){const i=o.getFullYear(),r=String(o.getMonth()+1).padStart(2,"0"),s=String(o.getDate()).padStart(2,"0");return`${i}-${r}-${s}`}return String(o).trim()}).filter(Boolean).sort();if(n&&(n.textContent=`${a.length} date${a.length===1?"":"s"} selected`),a.length===0){t.innerHTML='<span class="no-dates-text">No dates selected yet. Click input or presets above to select dates.</span>';return}t.innerHTML=a.map(o=>`
    <span class="selected-date-chip">
      <span class="chip-date">📅 ${o}</span>
      <button type="button" class="chip-remove" data-date="${o}" title="Remove date">&times;</button>
    </span>
  `).join(""),t.querySelectorAll(".chip-remove").forEach(o=>{o.addEventListener("click",i=>{i.stopPropagation();const r=o.getAttribute("data-date");Mt(r)})})}function Mt(e){if(!$)return;const n=$.selectedDates.filter(a=>{const o=a.getFullYear(),i=String(a.getMonth()+1).padStart(2,"0"),r=String(a.getDate()).padStart(2,"0");return`${o}-${i}-${r}`!==e});$.setDate(n,!0)}function Ft(){var e,t,n,a,o;(e=document.getElementById("preset-today"))==null||e.addEventListener("click",()=>{const i=new Date;$==null||$.setDate([i],!0)}),(t=document.getElementById("preset-next-7"))==null||t.addEventListener("click",()=>{const i=[],r=new Date;for(let s=0;s<7;s++){const d=new Date(r);d.setDate(r.getDate()+s),i.push(d)}$==null||$.setDate(i,!0)}),(n=document.getElementById("preset-next-14"))==null||n.addEventListener("click",()=>{const i=[],r=new Date;for(let s=0;s<14;s++){const d=new Date(r);d.setDate(r.getDate()+s),i.push(d)}$==null||$.setDate(i,!0)}),(a=document.getElementById("preset-clear"))==null||a.addEventListener("click",()=>{$==null||$.clear(),_([])}),(o=document.getElementById("open-calendar-btn"))==null||o.addEventListener("click",()=>{$==null||$.open()})}function Se(e=null){var r;l.editingVehicleId=(e==null?void 0:e.id)??null,Ye.textContent=e?"Edit Vehicle":"Add New Vehicle";const t=document.getElementById("modal-save-btn");t&&(t.textContent=e?"Update Vehicle":"Add Vehicle");const n=((r=l.currentUser)==null?void 0:r.operatorName)??"",a=(e==null?void 0:e.type)??"Bus";document.getElementById("vehicle-id").value=(e==null?void 0:e.id)??"",document.getElementById("vehicle-type").value=a,document.getElementById("vehicle-operator").value=(e==null?void 0:e.operatorName)??n,document.getElementById("vehicle-name").value=(e==null?void 0:e.name)??"",document.getElementById("vehicle-number").value=(e==null?void 0:e.vehicleNumber)??"",document.getElementById("vehicle-capacity").value=(e==null?void 0:e.capacity)??36,document.getElementById("vehicle-description").value=(e==null?void 0:e.description)??"",document.getElementById("vehicle-instagram").value=(e==null?void 0:e.instagramUrl)??"",window.syncCustomTypeDropdown&&window.syncCustomTypeDropdown(a),l.vehicleFormImages=Array.isArray(e==null?void 0:e.imageUrls)?[...e.imageUrls]:[],l.vehicleFormVideos=Array.isArray(e==null?void 0:e.videoUrls)?[...e.videoUrls]:[],U();const o=(e==null?void 0:e.features)??["AC","WiFi"];document.querySelectorAll(".features-checkboxes input").forEach(s=>{s.checked=o.includes(s.value)}),At();const i=(e==null?void 0:e.availableDates)??[];$?($.setDate(i,!1),_($.selectedDates)):document.getElementById("vehicle-dates").value=i.join(", "),O(),be.classList.remove("hidden")}function O(){const e=document.getElementById("vehicle-sub-panel");if(!e||!l.plans)return;const t=!!l.editingVehicleId,n=document.getElementById("vehicle-sub-tier-label"),a=document.getElementById("vehicle-sub-tier-seats"),o=document.getElementById("vehicle-sub-price"),i=document.getElementById("vehicle-sub-note"),r=document.getElementById("modal-save-btn");if(t){const d=H(),g=j(I());e.classList.remove("is-invalid"),r.disabled=!1,n.textContent=g?`${g.label} fleet plan`:"Fleet plan",a.textContent=`${I()} vehicle${I()===1?"":"s"} covered`,o.textContent=g?`${f(g.price)}/${T()}`:"—",i.textContent=(d==null?void 0:d.status)==="active"?`Covered until ${x(d.expiresAt)}. Updating these details does not change the fee.`:"Updating these details does not change the fee. Pay it from the Subscription page.",r.textContent="Update Vehicle";return}const s=Te();if(!s){e.classList.add("is-invalid"),n.textContent="No fleet plan configured",a.textContent="",o.textContent="—",i.textContent="No fleet plan is configured. Ask the Super Admin to set one on the Subscription page.",r.textContent="Add Vehicle",r.disabled=!0;return}e.classList.remove("is-invalid"),r.disabled=!1,n.textContent=`${s.tier.label} fleet plan`,a.textContent=`This would be vehicle #${I()+1}`,o.textContent=`${f(s.tier.price)}/${T()}`,s.charge===0?i.textContent=`Your ${s.tier.label} plan (${f(s.tier.price)}/${T()}) already covers this vehicle — nothing more to pay. It goes live in the app straight after.`:s.upgrade?i.textContent=`This vehicle moves your fleet onto the ${s.tier.label} plan at ${f(s.tier.price)}/${T()}. You have already paid ${f(s.tier.price-s.charge)} of it, so ${f(s.charge)} is payable now and your renewal date does not change.`:i.textContent=`Adding this vehicle starts your ${s.tier.label} plan at ${f(s.tier.price)} for one ${T()}, covering every vehicle you add inside that band.`,r.textContent=s.charge>0?`Add Vehicle · ${f(s.charge)}`:"Add Vehicle"}function Y(){$&&$.clear(),_([]),l.vehicleFormImages=[],l.vehicleFormVideos=[],U(),window.syncCustomTypeDropdown&&window.syncCustomTypeDropdown("Bus"),be.classList.add("hidden"),$e.reset()}async function Pt(e){e.preventDefault();const t=l.editingVehicleId,n=document.getElementById("vehicle-name").value.trim(),a=document.getElementById("vehicle-number").value.trim().toUpperCase(),o=document.getElementById("vehicle-type").value,i=document.getElementById("vehicle-operator").value.trim(),r=Number(document.getElementById("vehicle-capacity").value),s=document.getElementById("vehicle-description").value.trim(),d=document.getElementById("vehicle-instagram").value.trim();let g=[];$&&$.selectedDates.length>0?g=$.selectedDates.map(E=>{const L=E.getFullYear(),k=String(E.getMonth()+1).padStart(2,"0"),B=String(E.getDate()).padStart(2,"0");return`${L}-${k}-${B}`}).sort():g=document.getElementById("vehicle-dates").value.split(",").map(E=>E.trim()).filter(Boolean);const b=l.vehicleFormImages,p=l.vehicleFormVideos,m=[...document.querySelectorAll(".features-checkboxes input:checked")].map(E=>E.value),y={name:n,type:o,vehicleNumber:a,operatorName:i,capacity:r,description:s,instagramUrl:d,availableDates:g,imageUrls:b,videoUrls:p,features:m},u=t?null:Te();if(!t&&!u)return alert("❌ No fleet plan is configured, so this vehicle cannot be listed yet.");if(u&&u.charge>0){const E=u.tier.price-u.charge;if(!await Le({title:u.upgrade?"Upgrade Fleet Plan":"Confirm Payment",lead:u.upgrade?`Adding ${n} takes your fleet to ${I()+1} vehicles, which moves you onto the ${u.tier.label} plan.`:`Adding ${n} starts your fleet plan. One fee covers every vehicle in the band.`,planName:`${u.tier.label} fleet plan`,planSub:`Covers ${I()+1} vehicle${I()+1===1?"":"s"}`,planPrice:f(u.tier.price),lines:[{label:"Plan price",value:`${f(u.tier.price)} / ${T()}`},...E>0?[{label:"Already paid this period",value:`− ${f(E)}`}]:[],{label:"Billing period",value:T()}],total:f(u.charge),actionLabel:`Pay ${f(u.charge)} & Add`}))return}const v=document.getElementById("modal-save-btn"),C=v.textContent;v.disabled=!0,v.textContent="Saving…";try{const E=t?`${h}/vehicles/${t}`:`${h}/vehicles`,k=await fetch(E,{method:t?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(y)});let B=null;try{B=await k.json()}catch{B=null}if(!k.ok)throw new Error((B==null?void 0:B.error)||"Failed to save vehicle");if(t)return Y(),await S(),N({icon:"✏️",title:`${n} updated`,lead:"The details are saved. Your fleet plan and renewal date are unchanged."});if(Y(),await S(),!B.fleet)return N({icon:"⚠️",title:`${n} saved, but not listed`,lead:B.listingWarning||"The fleet fee could not be charged, so your vehicles are not visible to travellers yet. Pay it from the Subscription page.",actionLabel:"Got it"});const A=Number(B.fleet.charge||0);return N({icon:"🎉",title:`${n} is live in the app!`,lead:`Travellers can now see it. Your fleet plan covers every vehicle in the ${B.fleet.tierLabel} band.`,lines:[{label:"Fleet plan",value:c(B.fleet.tierLabel)},{label:"Vehicles covered",value:String(B.fleet.vehicleCount??I())},{label:"Paid now",value:A>0?f(A)+(B.fleet.upgraded?" (upgrade)":""):"Nothing — already covered"},{label:"Covered until",value:x(B.fleet.expiresAt)}]})}catch(E){alert("❌ "+E.message)}finally{v.disabled=!1,v.textContent=C}}window.editVehicle=function(e){const t=l.vehicles.find(n=>n.id===e);t&&Se(t)};function De(e){const t=new Date(`${e}T00:00:00`);if(Number.isNaN(t.getTime()))return 0;const n=Date.UTC(t.getFullYear(),t.getMonth(),t.getDate()),a=new Date,o=Date.UTC(a.getFullYear(),a.getMonth(),a.getDate());return Math.max(1,Math.round((o-n)/864e5)+1)}window.holdVehicle=async function(e){const t=l.vehicles.find(a=>a.id===e);if(!t)return;const n=prompt(`Hold "${t.name}" off the app?

It stays in your fleet but travellers stop seeing it, and it cannot be given a trip. Every day it is held is added back to your fleet plan when you resume it.

Why is it off the road? (optional)`,"Workshop / maintenance");if(n!==null)try{const a=await fetch(`${h}/vehicles/${e}/hold`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({operatorName:t.operatorName,reason:n})}),o=await a.json().catch(()=>null);if(!a.ok)throw new Error((o==null?void 0:o.error)||"Could not hold this vehicle");await S(),await N({icon:"⏸️",title:`${t.name} is on hold`,lead:"Travellers can no longer see it. Resume it when it is back on the road and the days it sat out will be added to your fleet plan."})}catch(a){alert("❌ "+a.message)}};window.resumeVehicle=async function(e){const t=l.vehicles.find(a=>a.id===e);if(!t)return;const n=De(t.heldSince);if(confirm(`Put "${t.name}" back on the app?

It has been on hold for ${n} day${n===1?"":"s"}. Those days will be added to your fleet plan's expiry.`))try{const a=await fetch(`${h}/vehicles/${e}/resume`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({operatorName:t.operatorName})}),o=await a.json().catch(()=>null);if(!a.ok)throw new Error((o==null?void 0:o.error)||"Could not resume this vehicle");await S();const i=o.hold||{},r=i.creditedDays===i.days?`It was off the app for ${i.days} day${i.days===1?"":"s"}, and your fleet plan has been extended by the same.`:i.creditedDays>0?`It was off the app for ${i.days} days. ${i.creditedDays} were added to your plan — the rest overlapped another bus's hold and had already been credited.`:`It was off the app for ${i.days} day${i.days===1?"":"s"}, all of which overlapped another bus's hold and had already been added to your plan.`;await N({icon:"▶️",title:`${t.name} is back on the app`,lead:r,lines:i.fleetExpiresAt?[{label:"Fleet plan now runs until",value:x(i.fleetExpiresAt)}]:[]})}catch(a){alert("❌ "+a.message)}};window.deleteVehicle=async function(e){if(confirm("Delete this vehicle from your fleet?"))try{if(!(await fetch(`${h}/vehicles/${e}`,{method:"DELETE"})).ok)throw new Error("Failed");await S()}catch(t){alert("❌ "+t.message)}};window.updateBookingStatus=async function(e,t){try{if(!(await fetch(`${h}/bookings/${e}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:t})})).ok)throw new Error("Failed");await S()}catch(n){alert("❌ "+n.message)}};function c(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}
