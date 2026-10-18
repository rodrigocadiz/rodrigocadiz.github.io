(function(){
  const stage=document.querySelector('.jstage');
  if(!stage) return;
  const slides=Array.from(stage.querySelectorAll('.jslide'));
  const prog=document.querySelector('.jprog');
  const idxEl=document.querySelector('.jnav .idx');
  let cur=-1;

  function go(i){
    i=Math.max(0,Math.min(slides.length-1,i));
    if(i===cur) return;
    if(cur>=0){
      slides[cur].classList.remove('on');
      slides[cur].querySelectorAll('iframe').forEach(f=>{ f.dataset.src=f.src; f.removeAttribute('src'); });
    }
    cur=i;
    const s=slides[cur];
    s.classList.add('on');
    s.querySelectorAll('[data-embed]').forEach(el=>{ if(!el.dataset.done) mount(el); });
    s.querySelectorAll('iframe[data-src]').forEach(f=>{ f.src=f.dataset.src; });
    if(prog) prog.style.width=((cur+1)/slides.length*100)+'%';
    if(idxEl) idxEl.textContent=(cur+1)+' / '+slides.length;
    history.replaceState(null,'','#'+(cur+1));
    const ji=s.querySelector('.jinner'); if(ji) ji.scrollTop=0;
  }
  document.addEventListener('keydown',e=>{
    if(e.key==='ArrowRight'||e.key==='PageDown'||e.key===' '){e.preventDefault();go(cur+1);}
    else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();go(cur-1);}
    else if(e.key==='Home') go(0);
    else if(e.key==='End') go(slides.length-1);
    else if(e.key==='Escape') location.href='explore.html';
  });
  const nx=document.querySelector('.jnext'),pv=document.querySelector('.jprev');
  if(nx) nx.addEventListener('click',()=>go(cur+1));
  if(pv) pv.addEventListener('click',()=>go(cur-1));
  let x0=null,y0=null;
  stage.addEventListener('touchstart',e=>{x0=e.touches[0].clientX;y0=e.touches[0].clientY;},{passive:true});
  stage.addEventListener('touchend',e=>{
    if(x0===null) return;
    const dx=e.changedTouches[0].clientX-x0, dy=e.changedTouches[0].clientY-y0;
    if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5) go(cur+(dx<0?1:-1));
    x0=null;
  },{passive:true});
  const st=parseInt((location.hash||'').replace('#',''),10);
  go(isFinite(st)&&st>0?st-1:0);
})();
