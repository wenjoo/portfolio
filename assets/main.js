/* ===== Basics ===== */
document.getElementById('year').textContent = new Date().getFullYear();
const root = document.documentElement;
const themeKey = 'kwj-theme';
const saved = localStorage.getItem(themeKey);
if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved);
const themeBtn = document.getElementById('theme-toggle');

/* Motion preference */
const MOTION_OK = !matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Theme toggle (View Transitions if supported) */
function setTheme(next){
  const apply = () => {
    root.setAttribute('data-theme', next);
    localStorage.setItem(themeKey, next);
    themeBtn.setAttribute('aria-pressed', String(next === 'dark'));
  };
  if (document.startViewTransition && MOTION_OK) {
    document.startViewTransition(() => apply());
  } else { apply(); }
}
themeBtn.addEventListener('click', ()=>{
  const current = root.getAttribute('data-theme')
    || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  setTheme(current === 'light' ? 'dark' : 'light');
});

/* Cursor blob follow */
const blob = document.getElementById('cursor');
let x = innerWidth/2, y = innerHeight/2, tx = x, ty = y;
addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; });
(function tick(){
  x += (tx - x) * 0.12; y += (ty - y) * 0.12;
  blob.style.transform = `translate(${x - blob.clientWidth/2}px, ${y - blob.clientHeight/2}px)`;
  requestAnimationFrame(tick);
})();

/* 3D tilt on cards */
if (MOTION_OK) {
  document.querySelectorAll('.tilt').forEach(card=>{
    let rAF;
    card.addEventListener('pointermove', (e)=>{
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left)/rect.width - 0.5;
      const py = (e.clientY - rect.top)/rect.height - 0.5;
      cancelAnimationFrame(rAF);
      rAF = requestAnimationFrame(()=>{
        card.style.transform = `perspective(900px) rotateY(${px*8}deg) rotateX(${-py*8}deg) translateZ(0)`;
      });
    });
    card.addEventListener('pointerleave', ()=>{ card.style.transform=''; });
  });
}

/* Scroll reveal with stagger */
const io = new IntersectionObserver((entries)=>{
  entries.forEach(en=>{
    if (!en.isIntersecting) return;
    const el = en.target;
    el.classList.add('show');
    const children = el.querySelectorAll('[data-stagger], .grid > .card');
    children.forEach((child, i) => {
      child.style.transitionDelay = `${i * 60}ms`;
      child.classList.add('show');
      child.setAttribute('data-stagger','');
    });
    io.unobserve(el);
  });
},{rootMargin:'-10% 0px -10% 0px', threshold:0.06});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

/* Parallax on aurora */
if (MOTION_OK) {
  const aurora = document.querySelector('.bg-aurora');
  if (aurora) {
    const onScroll = () => {
      const y = Math.min(40, window.scrollY * 0.06);
      aurora.style.transform = `translate3d(0, ${y}px, 0)`;
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
}

/* Magnetic buttons (icon + normal btns) */
if (MOTION_OK) {
  document.querySelectorAll('.btn, .icon-btn').forEach(el=>{
    let rAF;
    el.addEventListener('pointermove', (e)=>{
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width/2);
      const dy = e.clientY - (r.top + r.height/2);
      cancelAnimationFrame(rAF);
      rAF = requestAnimationFrame(()=>{ el.style.transform = `translate(${dx*0.06}px, ${dy*0.06}px)`; });
    });
    el.addEventListener('pointerleave', ()=>{ el.style.transform = ''; });
  });
}

/* Contact dropdown */
const contactBtn = document.getElementById('contact-btn');
const contactMenu = document.getElementById('contact-menu');
function openMenu(){
  contactMenu.hidden = false; contactMenu.setAttribute('data-open','true');
  contactBtn.setAttribute('aria-expanded','true');
  contactMenu.querySelector('[role="menuitem"]')?.focus();
}
function closeMenu(){
  contactMenu.removeAttribute('data-open'); contactBtn.setAttribute('aria-expanded','false');
  contactMenu.hidden = true;
}
if (contactBtn && contactMenu) {
  contactBtn.addEventListener('click', ()=>{
    const isOpen = contactBtn.getAttribute('aria-expanded') === 'true';
    isOpen ? closeMenu() : openMenu();
  });
  contactBtn.addEventListener('keydown', (e)=>{
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMenu(); }
  });
  contactMenu.addEventListener('keydown', (e)=>{
    const items = Array.from(contactMenu.querySelectorAll('[role="menuitem"]'));
    const cur = document.activeElement; const idx = items.indexOf(cur);
    if (e.key === 'Escape') { e.preventDefault(); closeMenu(); contactBtn.focus(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(idx + 1) % items.length]?.focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); items[(idx - 1 + items.length) % items.length]?.focus(); }
    if (e.key === 'Tab') { closeMenu(); }
  });
  document.addEventListener('click', (e)=>{
    if (!contactMenu.hidden && !contactMenu.contains(e.target) && !contactBtn.contains(e.target)) closeMenu();
  });
  addEventListener('resize', closeMenu);
}

/* Projects sort & filter */
const grid = document.getElementById('projects-grid');
const sortSelect = document.getElementById('project-sort');
const ongoingOnly = document.getElementById('project-ongoing-only');
function parseISO(d){ if(!d) return null; if (d.toLowerCase?.()==='present') return new Date();
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00Z` : d; const dt = new Date(iso); return isNaN(dt)?null:dt; }
function isOngoing(card){ const end = card.dataset.end||''; return end.toLowerCase?.()==='present'||!end; }
function getStart(card){ return parseISO(card.dataset.start); }
function sortProjects(mode){
  const cards = Array.from(grid.children).filter(el => el.matches('.project.card')); const today = new Date();
  const cmp = {
    newest:(a,b)=> getStart(b)-getStart(a),
    oldest:(a,b)=> getStart(a)-getStart(b),
    nearest:(a,b)=> Math.abs(today-getStart(a)) - Math.abs(today-getStart(b)),
    ongoingfirst:(a,b)=>{ const ao=isOngoing(a), bo=isOngoing(b); if(ao!==bo) return ao?-1:1; return getStart(b)-getStart(a); }
  }[mode] || (()=>0);
  cards.sort(cmp).forEach(c=>grid.appendChild(c));
}
function applyFilter(){
  const cards = Array.from(grid.children).filter(el => el.matches('.project.card'));
  const on = ongoingOnly?.checked;
  cards.forEach(card=>{
    const hide = on ? !isOngoing(card) : false;
    card.style.opacity = hide?0:1; card.style.transform = hide?'scale(.98)':'';
    card.setAttribute('aria-hidden', hide?'true':'false'); card.style.display = hide?'none':'';
  });
}
sortSelect?.addEventListener('change', ()=> sortProjects(sortSelect.value));
ongoingOnly?.addEventListener('change', applyFilter);
sortProjects('newest'); applyFilter();

/* ===========================================
   Skills Carousel: buttons, keys, swipe
   =========================================== */
const track = document.getElementById('skills-track');
const prevBtn = document.getElementById('skills-prev');
const nextBtn = document.getElementById('skills-next');
const statusEl = document.getElementById('skills-status');
const slides = () => Array.from(track.children);
let idx = 0;

function updateSkills(){
  const total = slides().length;
  const pct = -(idx*100);
  if (MOTION_OK) track.style.transition = 'transform .35s ease'; else track.style.transition = 'none';
  track.style.transform = `translateX(${pct}%)`;
  slides().forEach((s,i)=>{
    const active = i===idx;
    s.setAttribute('aria-hidden', active? 'false':'true');
    s.setAttribute('tabindex', active? '0' : '-1');
  });
  prevBtn.disabled = idx===0;
  nextBtn.disabled = idx===total-1;
  statusEl.textContent = `Card ${idx+1} of ${total}`;
}
function go(n){
  const total = slides().length;
  idx = Math.max(0, Math.min(total-1, n));
  updateSkills();
}
prevBtn.addEventListener('click', ()=> go(idx-1));
nextBtn.addEventListener('click', ()=> go(idx+1));
track.addEventListener('keydown', (e)=>{
  if (e.key === 'ArrowRight') { e.preventDefault(); go(idx+1); }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); go(idx-1); }
});

/* Swipe */
let startX=0, curX=0, dragging=false;
function onStart(e){ dragging=true; startX = (e.touches? e.touches[0].clientX : e.clientX); curX=startX; if(MOTION_OK) track.style.transition='none'; }
function onMove(e){ if(!dragging) return; curX = (e.touches? e.touches[0].clientX : e.clientX);
  const dx = curX - startX; const width = track.getBoundingClientRect().width / slides().length;
  const base = -(idx*width); track.style.transform = `translateX(${base + dx}px)`; }
function onEnd(){ if(!dragging) return; dragging=false;
  const dx = curX - startX; const width = track.getBoundingClientRect().width / slides().length;
  const threshold = width*0.15; if (dx > threshold) go(idx-1); else if (dx < -threshold) go(idx+1); else updateSkills();
}
track.addEventListener('mousedown', onStart);
window.addEventListener('mousemove', onMove);
window.addEventListener('mouseup', onEnd);
track.addEventListener('touchstart', onStart, {passive:true});
track.addEventListener('touchmove', onMove, {passive:true});
track.addEventListener('touchend', onEnd);

/* Init */
updateSkills();
addEventListener('resize', updateSkills);
