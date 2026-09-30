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
    const apply=()=>{
      const q=(search&&search.value||'').trim().toLowerCase();
      rows.forEach(r=>{
        const ok=(f==='all'||r.dataset.cat===f)&&(!q||(r.dataset.search||'').includes(q));
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
    }));
  }

  /* lazy SoundCloud / YouTube: only load when scrolled into view */
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
  const sc=el.dataset.sc, yt=el.dataset.yt, t=el.dataset.t;
  if(sc) el.innerHTML='<iframe loading="lazy" allow="autoplay" src="'+scUrl(sc)+'"></iframe>';
  else if(yt) el.innerHTML='<iframe loading="lazy" allowfullscreen allow="accelerometer;clipboard-write;encrypted-media;picture-in-picture" src="https://www.youtube-nocookie.com/embed/'+yt+(t?'?start='+t:'')+'"></iframe>';
}
