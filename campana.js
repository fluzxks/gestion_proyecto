(() => {
  'use strict';
  const {render, esc, num, money}=window.Piloto;
  const base={elegibles:500,control:40,oferta:50,margen:12000,incentivo:2000,contacto:100};
  const ejemplos=[
    [50,'Más compras, menos margen'],
    [53,'Empata con el control'],
    [54,'Supera al control']
  ];
  const pesos=value=>{
    const abs=Math.abs(value);
    if(abs>0 && abs<.01)return value<0?'- menos de $0,01':'menos de $0,01';
    return (value<0?'-':'')+(Number.isInteger(abs)?money(abs):'$'+num(abs,2));
  };
  const signed=value=>value>0?'+'+pesos(value):pesos(value);
  const fields=[
    ['elegibles','Elegibles por brazo','Mismo total en oferta y control.',1,1_000_000],
    ['control','Compras en control','Clientes que compran sin la oferta.',0,1_000_000],
    ['oferta','Compras con oferta','Clientes que compran con la oferta.',0,1_000_000],
    ['margen','Margen por comprador','CLP antes de incentivo y contacto.',0,10_000_000],
    ['incentivo','Incentivo por comprador','CLP por comprador del brazo oferta.',0,10_000_000],
    ['contacto','Contacto por elegible','CLP por persona contactada en oferta.',0,10_000_000]
  ];
  const actions={
    1:['Fidelización de bajo costo','Comprobar compras previas y costo del beneficio.'],
    2:['Incentivo de compra acotado','Definir margen mínimo y elegibilidad antes de contactar.'],
    3:['Beneficio por frecuencia','Confirmar frecuencia de base y ventana de compra.'],
    4:['Beneficio por recurrencia','Confirmar compras previas en el historial autorizado.'],
    5:['Reactivación acotada','Confirmar inactividad en el historial autorizado. El puntaje por sí solo no la acredita.']
  };

  function calcular(s) {
    const porCompraOferta=s.margen-s.incentivo;
    const control=s.control*s.margen;
    const bruto=s.oferta*s.margen;
    const incentivo=s.oferta*s.incentivo;
    const contacto=s.elegibles*s.contacto;
    const oferta=bruto-incentivo-contacto;
    const delta=(oferta-control)/s.elegibles;
    const comprasMin=porCompraOferta>0 ? Math.floor((control+contacto)/porCompraOferta)+1 : null;
    return {control,bruto,incentivo,contacto,oferta,delta,comprasMin,tasaControl:100*s.control/s.elegibles,tasaOferta:100*s.oferta/s.elegibles};
  }

  function dibujarPuente(pasos,m,enEjemplo){
    // Los totales nacen desde cero; los cambios parten del saldo anterior.
    const netoIncentivo=m.bruto-m.incentivo;
    const tramos=[
      [0,m.control,m.control],
      [m.control,m.bruto,m.bruto-m.control],
      [m.bruto,netoIncentivo,-m.incentivo],
      [netoIncentivo,m.oferta,-m.contacto],
      [0,m.oferta,m.oferta]
    ];
    const extremos=[0,...tramos.flatMap(t=>t.slice(0,2))];
    // Misma escala en los tres botones para que las alturas sean comparables.
    if(enEjemplo)extremos.push(54*base.margen);
    const min=Math.min(...extremos), rango=Math.max(1,Math.max(...extremos)-min);
    const escala=value=>5+90*(value-min)/rango;
    tramos.forEach(([start,end,value],i)=>{
      const item=pasos[i];
      item.querySelector('.camp-step-value').textContent=i===0||i===4?pesos(value):signed(value);
      const track=item.querySelector('.camp-step-track');
      const fill=track.querySelector('.camp-step-fill');
      track.style.setProperty('--zero',escala(0)+'%');
      track.style.setProperty('--level',escala(end)+'%');
      fill.style.setProperty('--bottom',escala(Math.min(start,end))+'%');
      fill.style.setProperty('--height',Math.abs(escala(end)-escala(start))+'%');
      if(i===1)item.dataset.kind=value<0?'costo':'ganancia';
    });
  }

  render.campana=(el,{resultados})=>{
    let output=null;
    el.innerHTML=`
      <header class="section-head"><p class="eyebrow">FICHA DE CAMPAÑA</p><h1>¿Vale la pena hacer la oferta?</h1><p class="lead">Mueve las compras con oferta. Mira en qué punto cubren el costo del incentivo y el contacto.</p></header>
      <section class="panel camp-topline">
          <label class="camp-field" for="camp-group">Perfil a evaluar<select id="camp-group">${resultados.perfiles.map(p=>`<option value="${p.grupo}">G${p.grupo} · ${num(p.puntaje,1)} puntos</option>`).join('')}</select></label>
          <div class="camp-hypothesis" id="camp-hypothesis" aria-live="polite"></div>
          <span class="badge badge-warn" title="Las cifras de compras y costos son editables. El dataset contiene perfiles y puntajes, sin ventas observadas.">Ejemplo ilustrativo</span>
      </section>
      <div class="camp-main-grid">
        <section class="panel camp-bridge">
          <div class="panel-head"><h2>Del control a la oferta</h2><p class="muted">Margen del brazo en CLP. Cada barra muestra cuánto agrega o resta ese paso.</p></div>
          <div class="camp-presets" role="group" aria-label="Escenarios del ejemplo">${ejemplos.map(([i,n])=>`<button type="button" data-camp-preset="${i}" aria-pressed="false"><b>${i} compras</b><span>${n}</span></button>`).join('')}</div>
          <ol class="camp-steps" id="camp-steps" aria-label="Desglose del margen en cinco pasos">${[
            ['Margen control','control'],['Cambio en compras','ganancia'],['Incentivo','costo'],['Contacto','costo'],['Margen oferta','oferta']
          ].map(([name,kind])=>`<li class="camp-step" data-kind="${kind}"><span class="camp-step-label">${name}</span><strong class="camp-step-value">—</strong><div class="camp-step-track" aria-hidden="true"><i class="camp-step-fill"></i><i class="camp-link-line"></i></div></li>`).join('')}</ol>
          <div class="camp-bridge-gutter"><span>Margen total</span><span>Aporte de compras</span><span>Costos de la oferta</span></div>
        </section>
        <section class="panel camp-answer"><div class="panel-head"><h2>Qué cambia por cliente</h2></div><div id="camp-result" aria-live="polite"></div></section>
      </div>
      <section class="panel camp-experiment">
        <div class="panel-head"><h2>Explora otro escenario</h2><p class="muted">Cambia las compras con oferta. Abre los supuestos si quieres ajustar el costo del incentivo o del contacto.</p></div>
        <label class="camp-field" for="camp-slider">Compras con oferta <output id="camp-slider-label" for="camp-slider"></output><input type="range" id="camp-slider" min="0" max="500" value="50" step="1"></label>
        <details class="camp-assumptions"><summary>Editar elegibles, compras y costos</summary><p class="muted">Una compra por comprador y el mismo margen antes de promoción. Oferta y control se observan en el mismo período.</p>
          <div class="camp-fields">${fields.map(([id,label,help,min,max])=>`<label class="camp-field" for="camp-${id}">${esc(label)}<input id="camp-${id}" type="number" step="1" min="${min}" max="${max}" value="${base[id]}" inputmode="numeric" aria-describedby="camp-help-${id}"><small id="camp-help-${id}">${esc(help)}</small></label>`).join('')}</div>
        </details>
        <div class="camp-actions"><button class="button button-outline" type="button" id="camp-reset">Restaurar ejemplo</button><button class="button button-quiet" type="button" id="camp-export">Guardar ficha .txt ↓</button></div>
      </section>
      <section class="panel"><div class="panel-head"><h2>Qué pedir antes de lanzar</h2></div><p>Historial de compra y margen, costo real del incentivo y del canal, una ventana acordada y un tamaño muestral calculado con una tasa base y un efecto mínimo. La ficha muestra aritmética económica. Con los resultados reales se evalúan incertidumbre y decisión de escala.</p></section>`;

    const group=el.querySelector('#camp-group');
    const search=el.querySelector('#camp-result');
    const exportBtn=el.querySelector('#camp-export');
    const pasos=el.querySelectorAll('.camp-step');
    const grafico=el.querySelector('#camp-steps');
    const slider=el.querySelector('#camp-slider');
    const sliderLabel=el.querySelector('#camp-slider-label');
    const presets=el.querySelectorAll('[data-camp-preset]');
    const inputs=Object.fromEntries(fields.map(([id])=>[id,el.querySelector('#camp-'+id)]));
    const updateGroup=()=>{
      window.Piloto.campaignGroup=Number(group.value);
      const [title,condition]=actions[group.value];
      el.querySelector('#camp-hypothesis').innerHTML=`<strong>${esc(title)}</strong><p>${esc(condition)}</p>`;
    };
    group.value=String(window.Piloto.campaignGroup||5);
    const paint=()=>{
      const snapshot={};
      let valid=true;
      for(const [id] of fields){
        const input=inputs[id];
        snapshot[id]=input.valueAsNumber;
        valid=valid && input.value!=='' && input.validity.valid;
      }
      const countsValid=snapshot.control<=snapshot.elegibles&&snapshot.oferta<=snapshot.elegibles;
      if(!valid||!countsValid){
        output=null;exportBtn.disabled=true;grafico.hidden=true;slider.disabled=true;
        presets.forEach(btn=>btn.setAttribute('aria-pressed','false'));
        sliderLabel.textContent='';
        search.innerHTML='<p class="camp-error">Completa los campos con enteros válidos. Las compras de cada brazo no pueden superar sus elegibles.</p>';
        return;
      }
      const m=calcular(snapshot);
      output={snapshot,m};exportBtn.disabled=false;
      slider.disabled=false;
      slider.max=snapshot.elegibles;
      slider.value=snapshot.oferta;
      sliderLabel.textContent=num(snapshot.oferta)+' de '+num(snapshot.elegibles)+' elegibles';
      const enEjemplo=Object.keys(base).every(id=>id==='oferta'||base[id]===snapshot[id]);
      for(const btn of presets){
        const selected=enEjemplo&&snapshot.oferta===Number(btn.dataset.campPreset);
        btn.setAttribute('aria-pressed',String(selected));
      }
      grafico.hidden=false;dibujarPuente(pasos,m,enEjemplo);
      const caja=m.delta>0?'Aporta margen en este escenario':m.delta<0?'Deja menos margen en este escenario':'Empata con el control en este escenario';
      const breakEven=m.comprasMin===null||m.comprasMin>snapshot.elegibles
        ? 'Con estos costos y elegibles, aumentar las compras no basta para superar el margen del control.'
        : `Se necesitan al menos <b>${num(m.comprasMin)} compras con oferta</b> para superar al control con estos supuestos.`;
      const conversionGap=m.tasaOferta-m.tasaControl;
      search.innerHTML=`
        <div class="camp-result-main" data-outcome="${Math.sign(m.delta)}"><p>Margen incremental por elegible</p><strong>${signed(m.delta)}</strong><span>${caja}</span></div>
        <div class="camp-arms"><div><span class="badge">CONTROL</span><b>${num(snapshot.control)} compras</b><span>${num(m.tasaControl,1)}% · ${pesos(m.control/snapshot.elegibles)} por elegible</span></div><div><span class="badge badge-purple">OFERTA</span><b>${num(snapshot.oferta)} compras</b><span>${num(m.tasaOferta,1)}% · ${pesos(m.oferta/snapshot.elegibles)} por elegible</span></div></div>
        <div class="camp-verdict"><p>Conversión con oferta frente a control: <strong>${conversionGap>0?'+':''}${num(conversionGap,1)} puntos porcentuales</strong>.</p><p>${breakEven}</p></div>`;
    };
    group.onchange=updateGroup;
    for(const input of Object.values(inputs))input.oninput=paint;
    slider.oninput=()=>{inputs.oferta.value=slider.value;paint();};
    function restaurar(oferta){
      for(const [id] of fields)inputs[id].value=id==='oferta'?oferta:base[id];
      paint();
    }
    presets.forEach(btn=>btn.onclick=()=>restaurar(Number(btn.dataset.campPreset)));
    el.querySelector('#camp-reset').onclick=()=>restaurar(base.oferta);
    exportBtn.onclick=()=>{
      if(!output)return;
      const {snapshot:s,m}=output;
      const [title,condition]=actions[group.value];
      const notes=[
        `CASO 03 · FICHA DE CAMPAÑA G${group.value}`,'Escenario ilustrativo. Sin resultados comerciales observados.','',
        title,condition,'',`Elegibles por brazo: ${num(s.elegibles)}`,`Compras control / oferta: ${num(s.control)} / ${num(s.oferta)}`,
        `Margen por comprador: ${money(s.margen)}`,`Incentivo por comprador con oferta: ${money(s.incentivo)}`,
        `Contacto por elegible con oferta: ${money(s.contacto)}`,'',`Margen control: ${money(m.control)}`,`Margen oferta: ${money(m.oferta)}`,
        `Diferencia por elegible: ${pesos(m.delta)}`,'',
        'Antes de autorizar: confirmar elegibilidad, obtener compras y costos reales, definir control aleatorio y calcular tamaño muestral.'
      ].join('\r\n');
      const url=URL.createObjectURL(new Blob([notes],{type:'text/plain;charset=utf-8'}));
      const link=document.createElement('a');link.href=url;link.download=`Caso03_ficha_G${group.value}.txt`;link.click();
      setTimeout(()=>URL.revokeObjectURL(url),1500);
    };
    updateGroup();paint();
  };
})();
