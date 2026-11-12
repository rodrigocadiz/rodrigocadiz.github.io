/* language toggle, nav, catalogue filters + view switch */
const LANG_KEY='rfc-lang';
function getLang(){
  let l=null;
  try{ l=localStorage.getItem(LANG_KEY); }catch(e){}
  if(!l){ const p=new URLSearchParams(location.search).get('lang'); if(p==='en'||p==='es') l=p; }
  if(!l) l=(navigator.language||'en').toLowerCase().startsWith('es')?'es':'en';
  return l;
}
function setLang(l){
  document.documentElement.setAttribute('lang',l);
  try{ localStorage.setItem(LANG_KEY,l); }catch(e){}
  const t=document.documentElement.getAttribute('data-title-'+l);
  if(t) document.title=t;
  document.querySelectorAll('.langbtn').forEach(b=>{ b.textContent = l==='en'?'ES':'EN'; });
}
setLang(getLang());

document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('.langbtn').forEach(b=>b.addEventListener('click',()=>{
    setLang(document.documentElement.getAttribute('lang')==='es'?'en':'es');
  }));
  const tg=document.querySelector('.navtoggle');
  if(tg) tg.addEventListener('click',()=>document.querySelector('.navlinks').classList.toggle('open'));

  /* transparent nav over a hero */
  const nav=document.querySelector('.nav.over'), hero=document.querySelector('.hero');
  if(nav&&hero){
    const solid=()=>{
      const past = window.scrollY > hero.offsetHeight - 70;
      nav.style.background = past ? 'rgba(251,250,248,.95)' : 'transparent';
      nav.style.borderBottomColor = past ? 'var(--line)' : 'transparent';
      nav.classList.toggle('over', !past);
    };
    solid(); window.addEventListener('scroll',solid,{passive:true});
  }

  /* catalogue */
  const grid=document.querySelector('.grid[data-catalogue]');
  if(grid){
    const cards=Array.from(grid.querySelectorAll('.card'));
    const rows=Array.from(document.querySelectorAll('.list a.row'));
    const chips=Array.from(document.querySelectorAll('.chip'));
    const search=document.querySelector('.search');
    let filter=new URLSearchParams(location.search).get('c')||'all';
    function apply(){
      const q=(search&&search.value||'').trim().toLowerCase();
      const test=el=>{
        const cats=((el.dataset.cat||'')+' '+(el.dataset.coll||'')).split(/\s+/);
        return (filter==='all'||cats.includes(filter)) && (!q||(el.dataset.search||'').includes(q));
      };
      cards.forEach(el=>el.style.display=test(el)?'':'none');
      rows.forEach(el=>el.style.display=test(el)?'':'none');
      chips.forEach(c=>c.classList.toggle('on',c.dataset.f===filter));
    }
    chips.forEach(c=>c.addEventListener('click',()=>{filter=c.dataset.f;apply();}));
    if(search) search.addEventListener('input',apply);
    apply();

    const vt=document.querySelectorAll('.viewtog button');
    vt.forEach(b=>b.addEventListener('click',()=>{
      document.body.classList.toggle('listview', b.dataset.v==='list');
      vt.forEach(x=>x.classList.toggle('on',x===b));
      try{ localStorage.setItem('rfc-view',b.dataset.v); }catch(e){}
    }));
    try{
      if(localStorage.getItem('rfc-view')==='list'){
        document.body.classList.add('listview');
        vt.forEach(x=>x.classList.toggle('on',x.dataset.v==='list'));
      }
    }catch(e){}
  }

  /* publications filter */
  const pl=document.querySelector('[data-pubs]');
  if(pl){
    const rows=Array.from(pl.querySelectorAll('.pub'));
    const chips=Array.from(document.querySelectorAll('.chip'));
    const search=document.querySelector('.search');
    let f='all';
    /* ?a=<area>: only publications of that research area (keywords from the build) */
    let area=null; const af=document.getElementById('areaf');
    try{ const A=JSON.parse(pl.dataset.areas||'{}'); area=A[new URLSearchParams(location.search).get('a')]||null; }catch(e){}
    if(area&&af){ af.hidden=false;
      af.innerHTML='<span data-l="en">Area: '+area.en+'</span><span data-l="es">Área: '+area.es+'</span> <button type="button" aria-label="Clear">×</button>';
      af.querySelector('button').addEventListener('click',()=>{ area=null; af.hidden=true; history.replaceState(null,'',location.pathname); apply(); }); }
    const apply=()=>{
      const q=(search&&search.value||'').trim().toLowerCase();
      rows.forEach(r=>{
        const t=r.dataset.search||'';
        const ok=(f==='all'||r.dataset.cat===f)&&(!q||t.includes(q))&&(!area||area.k.some(k=>(r.dataset.t||'').includes(k)));
        r.style.display=ok?'':'none';
      });
      chips.forEach(c=>c.classList.toggle('on',c.dataset.f===f));
    };
    chips.forEach(c=>c.addEventListener('click',()=>{f=c.dataset.f;apply();}));
    if(search) search.addEventListener('input',apply);
    apply();
  }

  /* home video picker */
  const player=document.querySelector('.player[data-embed]');
  if(player){
    const np=document.querySelector('.nowplaying');
    document.querySelectorAll('.pick').forEach(btn=>btn.addEventListener('click',()=>{
      document.querySelectorAll('.pick').forEach(b=>b.classList.remove('on'));
      btn.classList.add('on');
      player.dataset.yt=btn.dataset.yt;
      if(btn.dataset.t) player.dataset.t=btn.dataset.t; else delete player.dataset.t;
      delete player.dataset.done;
      player.innerHTML='';
      mount(player);
      if(np){
        np.querySelector('b').textContent=btn.dataset.title;
        np.querySelector('span').textContent=btn.dataset.meta;
        const a=np.querySelector('a'); if(a) a.href=btn.dataset.href;
      }
      /* the SoundCloud bar follows the selected work, and hides when it has no audio */
      const lb=document.querySelector('.listenbar');
      if(lb){
        const sc=lb.querySelector('.sc');
        if(btn.dataset.sc){
          lb.hidden=false;
          lb.querySelector('.kicker').textContent=btn.dataset.title;
          if(sc.dataset.sc!==btn.dataset.sc){ sc.dataset.sc=btn.dataset.sc; delete sc.dataset.done; sc.innerHTML=''; mount(sc); }
        } else { lb.hidden=true; }
      }
    }));
  }

  /* lazy SoundCloud / YouTube / Spotify: only load when scrolled into view */
  const lazies=document.querySelectorAll('[data-embed]');
  if(lazies.length && 'IntersectionObserver' in window){
    const io=new IntersectionObserver(es=>{
      es.forEach(e=>{ if(e.isIntersecting){ mount(e.target); io.unobserve(e.target); } });
    },{rootMargin:'250px'});
    lazies.forEach(el=>io.observe(el));
  } else { lazies.forEach(mount); }
});

function scUrl(slug){
  return 'https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Frcadiz%2F'+slug+
         '&color=%239a2b25&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&visual=false';
}
function mount(el){
  if(el.dataset.done) return;
  el.dataset.done='1';
  const sc=el.dataset.sc, yt=el.dataset.yt, t=el.dataset.t, sp=el.dataset.sp;
  if(sp) el.innerHTML='<iframe loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" src="https://open.spotify.com/embed/'+sp+'?utm_source=generator"></iframe>';
  else if(sc) el.innerHTML='<iframe loading="lazy" allow="autoplay" src="'+scUrl(sc)+'"></iframe>';
  else if(yt) el.innerHTML='<iframe loading="lazy" allowfullscreen allow="accelerometer;clipboard-write;encrypted-media;picture-in-picture" src="https://www.youtube-nocookie.com/embed/'+yt+(t?'?start='+t:'')+'"></iframe>';
}

/* home: one player, a carousel of works, and a source switch (video, SoundCloud, Spotify) */
document.addEventListener('DOMContentLoaded',()=>{
  const hp=document.querySelector('.hm-play');
  if(!hp) return;
  const stage=hp.querySelector('.player'), bar=hp.querySelector('.hm-bar'), srcs=bar.querySelector('.srcs');
  const strip=hp.querySelector('.hm-strip'), ths=Array.from(strip.querySelectorAll('.th'));
  if(!ths.length) return;
  const LBL={yt:'Video',sc:'SoundCloud',sp:'Spotify'};
  let cur=0, src='';
  const frame=(u,cls)=>{ const f=document.createElement('iframe'); f.src=u; if(cls) f.className=cls;
    f.setAttribute('allow','accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture'); f.setAttribute('allowfullscreen',''); f.setAttribute('referrerpolicy','strict-origin-when-cross-origin'); f.title=ths[cur].dataset.title; return f; };
  function draw(){
    const b=ths[cur], d=b.dataset, av=['yt','sc','sp'].filter(k=>d[k]);
    if(!av.includes(src)) src=av[0];
    ths.forEach((x,i)=>{ x.classList.toggle('on',i===cur); x.setAttribute('aria-pressed',String(i===cur)); });
    bar.querySelector('em').textContent=d.title;
    const en=bar.querySelector('.meta [data-l="en"]'), es=bar.querySelector('.meta [data-l="es"]');
    if(en) en.textContent=d.metaEn; if(es) es.textContent=d.metaEs;
    bar.querySelector('.wp').href=d.href;
    hp.querySelector('.hm-count .n').textContent=(cur+1)+' / '+ths.length;
    srcs.innerHTML='';
    av.forEach(k=>{ const x=document.createElement('button'); x.type='button'; x.textContent=LBL[k];
      if(k===src) x.className='on'; x.setAttribute('aria-pressed',String(k===src));
      x.addEventListener('click',()=>{ src=k; draw(); }); srcs.appendChild(x); });
    stage.innerHTML=''; stage.className='player'+(src==='yt'?'':' audio '+src);
    if(src==='yt'){ stage.appendChild(frame('https://www.youtube-nocookie.com/embed/'+d.yt+(d.t?'?start='+d.t:''))); return; }
    if(d.img){ const im=document.createElement('img'); im.src=d.img; im.alt=''; stage.appendChild(im); }
    else { const t=document.createElement('b'); t.textContent=d.title; stage.appendChild(t); }
    stage.appendChild(frame(src==='sc'?scUrl(d.sc):'https://open.spotify.com/embed/'+d.sp+'?utm_source=generator','au'));
  }
  function go(i){ cur=(i+ths.length)%ths.length; src=''; draw();
    const b=ths[cur]; strip.scrollTo({left:b.offsetLeft-(strip.clientWidth-b.offsetWidth)/2,behavior:'smooth'}); }
  ths.forEach((b,i)=>b.addEventListener('click',()=>go(i)));
  hp.querySelector('.pv').addEventListener('click',()=>go(cur-1));
  hp.querySelector('.nx').addEventListener('click',()=>go(cur+1));
  draw();
});

// Portada: las fotos de cada cubo cambian lentamente (fundido). Cada cubo tiene su propio
// periodo, con variacion al azar, y elige la siguiente foto al azar: la combinacion de las
// cuatro no sigue un ciclo.
document.addEventListener('DOMContentLoaded',function(){
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  var per=[7000,11000,13000,17000];
  document.querySelectorAll('.facet .ph').forEach(function(ph,k){
    var im=ph.querySelectorAll('img'); if(im.length<2) return; var i=0, base=per[k%per.length];
    function wait(){ setTimeout(next, base+Math.random()*5000); }
    function next(){ var j=i; while(j===i) j=Math.floor(Math.random()*im.length);
      var n=im[j]; n.loading='eager';
      var sw=function(){ im[i].classList.remove('on'); n.classList.add('on'); i=j; wait(); };
      if(n.complete&&n.naturalWidth) sw(); else { n.addEventListener('load',sw,{once:true}); n.addEventListener('error',wait,{once:true}); } }
    setTimeout(next, 3000+Math.random()*base);
  });
});
