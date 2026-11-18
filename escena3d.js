(() => {
  'use strict';
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const normal = { yaw:-.5, pitch:.32, zoom:1, center:0 };
  const closeup = { yaw:-.18, pitch:.2, zoom:1.3, center:.69 };
  const arrows = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'];

  function mount(canvas, profiles, colors, onSelect, onPause) {
    const ctx = canvas.getContext('2d');
    const preferences = matchMedia('(prefers-reduced-motion: reduce)');
    const listeners = new AbortController();
    const { signal } = listeners;
    const view = { ...normal };
    const target = { ...normal };
    const points = profiles.map(p => ({
      id:p.grupo, score:p.puntaje,
      x:-1.4 + (p.ingreso-10)*.028,
      y:p.puntaje*.0185,
      z:-1 + p.clientes*.02,
      color:colors[p.grupo]
    }));
    let width=0, height=0, pixel=1, selected=4, hits=[], drag;
    let active=false, playing=!preferences.matches, focused=false, frame=0, elapsed=0, before=0;

    function resize() {
      width=canvas.clientWidth;
      height=canvas.clientHeight;
      if(!width||!height)return;
      pixel=Math.min(devicePixelRatio||1,2);
      canvas.width=Math.round(width*pixel);
      canvas.height=Math.round(height*pixel);
      draw();
    }

    function draw() {
      if(!width||!height||!active)return;
      ctx.setTransform(pixel,0,0,pixel,0,0);
      ctx.clearRect(0,0,width,height);
      const scale=Math.min(width/4.75,height/3.45)*view.zoom;
      const yaw=view.yaw + (playing && !focused ? Math.sin(elapsed*.00085)*.19 : 0);
      const sy=Math.sin(yaw),cy=Math.cos(yaw),sp=Math.sin(view.pitch),cp=Math.cos(view.pitch);
      function project(x,y,z) {
        const dx=x-view.center,dY=y-.78;
        const eyeX=dx*cy-z*sy, eyeZ=dx*sy+z*cy;
        const depth=eyeZ*cp+dY*sp;
        const ratio=6.6/(6.6-depth);
        return { x:width*.5+eyeX*ratio*scale, y:height*.51-(dY*cp-eyeZ*sp)*ratio*scale, depth, ratio };
      }
      function line(from,to,color,weight=1) {
        const a=project(...from),b=project(...to);
        ctx.strokeStyle=color;ctx.lineWidth=weight;
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
      }
      // Cuadrícula de ingreso (X) y tamaño del grupo (Z). La altura (Y) es el puntaje.
      for(let i=0;i<=10;i++) {
        const x=-1.4+i*.28;
        line([x,0,-1],[x,0,1],i%2===0?'#4e6e9a72':'#34465b86');
      }
      for(let i=0;i<=5;i++) {
        const z=-1+i*.4;
        line([-1.4,0,z],[1.4,0,z],'#45618291');
      }
      line([-1.4,0,-1],[-1.4,1.85,-1],'#5f7ca890',1.3);
      for(const y of [.46,.925,1.39,1.85]) {
        line([-1.4,y,-1],[1.4,y,-1],'#3e557554');
      }
      const label=(text,point,color='#b5c7df',size=10)=>{
        ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`600 ${size}px Segoe UI, sans-serif`;
        ctx.fillStyle=color;
        ctx.fillText(text,clamp(point.x,ctx.measureText(text).width/2+4,width-ctx.measureText(text).width/2-4),clamp(point.y,10,height-9));
      };
      const income=project(0,0,1.19), count=project(1.71,0,0), score=project(-1.43,1.98,-1);
      if(!focused){ label('Ingreso',income);label('Registros',count);label('Puntaje',score); }

      const p4=points.find(p=>p.id===4),p5=points.find(p=>p.id===5);
      const a=project(p4.x,p4.y,p4.z),b=project(p5.x,p5.y,p5.z);
      const c=project(Math.max(p4.x,p5.x)+.55,(p4.y+p5.y)/2,(p4.z+p5.z)/2);
      if(focused){
        const gradient=ctx.createLinearGradient(a.x,a.y,b.x,b.y);
        gradient.addColorStop(0,p4.color);gradient.addColorStop(1,p5.color);
        ctx.strokeStyle=gradient;ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo(c.x,c.y,b.x,b.y);ctx.stroke();
        label(Math.round(Math.abs(p4.score-p5.score))+' pts', {x:(a.x+b.x+c.x*2)/4+23,y:(a.y+b.y+c.y*2)/4},'#e1edff',12);
      }

      hits=[];
      const layers=points.map(p=>({p,position:project(p.x,p.y,p.z)})).sort((left,right)=>left.position.depth-right.position.depth);
      for(const {p,position} of layers) {
        const dim=focused && p.id!==4 && p.id!==5;
        if(dim)continue;
        const base=project(p.x,0,p.z);
        const radius=clamp((p.id===selected?12:9)*position.ratio,6,17);
        hits.push({ x:position.x,y:position.y,r:Math.max(radius+8,18),id:p.id });
        ctx.strokeStyle=p.color+'79';ctx.lineWidth=1.4;
        ctx.beginPath();ctx.moveTo(base.x,base.y);ctx.lineTo(position.x,position.y);ctx.stroke();
        // El anillo marca la proyección de este grupo sobre la base, no un registro adicional.
        ctx.strokeStyle=p.color+'a8';ctx.lineWidth=1.2;
        ctx.beginPath();ctx.ellipse(base.x,base.y,12,4,0,0,Math.PI*2);ctx.stroke();
        if(p.id===selected || (focused&&playing)){
          const pulse=playing ? 3*Math.sin(elapsed*.004) : 0;
          ctx.strokeStyle=p.color+'77';ctx.beginPath();ctx.arc(position.x,position.y,radius+6+pulse,0,Math.PI*2);ctx.stroke();
        }
        const fill=ctx.createRadialGradient(position.x-radius*.28,position.y-radius*.36,1,position.x,position.y,radius);
        fill.addColorStop(0,'#f4fbff');fill.addColorStop(.37,p.color);fill.addColorStop(1,p.color+'85');
        ctx.fillStyle=fill;ctx.shadowColor=p.color+'a0';ctx.shadowBlur=14;
        ctx.beginPath();ctx.arc(position.x,position.y,radius,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
        label('G'+p.id+(focused?' · '+Math.round(p.score):''),{x:position.x,y:position.y-radius-13},p.color,12);
      }
    }

    function stopFrame() {
      cancelAnimationFrame(frame);
      frame=0; before=0;
    }
    function animate(time) {
      frame=0;
      if(!active)return;
      const step=before ? Math.min(time-before,32) : 16;
      before=time;
      if(playing)elapsed+=step;
      let remaining=0;
      for(const key of Object.keys(target)) {
        const delta=target[key]-view[key];
        view[key]+=Math.abs(delta)<.001 ? delta : delta * (1-Math.exp(-step/110));
        remaining+=Math.abs(delta);
      }
      draw();
      if(playing||remaining>.002)frame=requestAnimationFrame(animate);
      else before=0;
    }
    function refresh() {
      if(!active)return;
      if(preferences.matches)Object.assign(view,target);
      draw();
      const transitioning=Object.keys(view).some(key=>Math.abs(view[key]-target[key])>.002);
      if(!frame && (playing||transitioning))frame=requestAnimationFrame(animate);
    }
    function setPlaying(next) {
      playing=next&&!preferences.matches;
      onPause(playing,preferences.matches);
      if(!playing)stopFrame();
      refresh();
    }
    function orbit(dx,dy) {
      setPlaying(false);
      target.yaw=clamp(target.yaw+dx,-1.1,1.1);
      target.pitch=clamp(target.pitch+dy,.12,.7);
      if(drag||preferences.matches)Object.assign(view,target);
      refresh();
    }
    function hitAt(event) {
      const rect=canvas.getBoundingClientRect();
      return hits.toReversed().find(p=>Math.hypot(p.x+rect.left-event.clientX,p.y+rect.top-event.clientY)<=p.r);
    }
    function release(event,select) {
      if(!drag||event.pointerId!==drag.id)return;
      const moved=drag.moved;
      drag=undefined;
      canvas.parentElement.classList.remove('is-orbiting');
      if(select&&!moved) {
        const found=hitAt(event);
        if(found)onSelect(found.id);
      }
    }
    canvas.addEventListener('pointerdown',e=>{
      if(!active||e.button!==0)return;
      drag={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};
      canvas.setPointerCapture(e.pointerId);
    },{signal});
    canvas.addEventListener('pointermove',e=>{
      if(!drag||drag.id!==e.pointerId)return;
      const x=e.clientX-drag.x,y=e.clientY-drag.y;
      if(!drag.moved&&Math.hypot(x,y)<4)return;
      drag.moved=true;drag.x=e.clientX;drag.y=e.clientY;
      canvas.parentElement.classList.add('is-orbiting');
      orbit(x*.009,y*.004);
    },{signal});
    canvas.addEventListener('pointerup',e=>release(e,true),{signal});
    canvas.addEventListener('pointercancel',e=>release(e,false),{signal});
    canvas.addEventListener('keydown',e=>{
      if(!arrows.includes(e.key))return;
      e.preventDefault();e.stopPropagation();
      orbit(e.key==='ArrowLeft'?-.13:e.key==='ArrowRight'?.13:0,e.key==='ArrowUp'?-.07:e.key==='ArrowDown'?.07:0);
    },{signal});
    preferences.addEventListener('change',()=>setPlaying(!preferences.matches),{signal});
    const watcher=new ResizeObserver(resize);
    watcher.observe(canvas);
    return {
      activate(on) {
        active=on;
        if(on){resize();onPause(playing,preferences.matches);refresh();}else stopFrame();
      },
      select(id) {
        selected=id;
        if(focused&&id!==4&&id!==5){focused=false;Object.assign(target,normal);}
        refresh();
      },
      focusPair(on) { focused=on; Object.assign(target,on?closeup:normal); refresh(); },
      toggleMotion() { setPlaying(!playing); },
      destroy() { active=false;stopFrame();watcher.disconnect();listeners.abort(); }
    };
  }

  window.MapaPerfiles3D={mount};
})();
