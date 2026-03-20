// ── 비밀번호 ─────────────────────────────────────────────────
function checkAuth(){
  var input=document.getElementById('auth-input');
  if(input.value==='7513'){
    isAuthed=true;sessionStorage.setItem('kdk-auth','ok');
    document.getElementById('auth-overlay').classList.add('hidden');
    input.value='';input.placeholder='비밀번호 입력';input.classList.remove('error');
    ['members','court','history','stats'].forEach(function(t){
      document.getElementById('panel-'+t).classList.toggle('active',t==='members');
      document.getElementById('tab-'+t).classList.toggle('active',t==='members');
    });
  } else {
    input.value='';input.placeholder='권한이 없습니다';input.classList.add('error');
    setTimeout(function(){input.placeholder='비밀번호 입력';input.classList.remove('error')},1800);
  }
}

// ── 탭 전환 ──────────────────────────────────────────────────
function switchTab(name){
  if(name==='members'&&!isAuthed){
    document.getElementById('auth-overlay').classList.remove('hidden');
    setTimeout(function(){document.getElementById('auth-input').focus()},50);
    return;
  }
  ['members','court','history','stats'].forEach(function(t){
    document.getElementById('panel-'+t).classList.toggle('active',t===name);
    document.getElementById('tab-'+t).classList.toggle('active',t===name);
  });
  if(name==='stats')renderStats();
  if(name==='history')renderHistory();
}

// ── 코트 수 ──────────────────────────────────────────────────
function setCourtCount(n){courtCount=n;saveState()}
function updateCourtCountUI(){[1,2,3].forEach(function(n){
  var el=document.getElementById('cc-'+n);
  if(el)el.classList.toggle('active',n===courtCount);
})}

// ── CTA 스프링 + 코트 수 선택 모달 ───────────────────────────
function ctaClick(){
  var btn=document.getElementById('cta-main');
  btn.classList.remove('spring-anim');void btn.offsetWidth;btn.classList.add('spring-anim');
  setTimeout(function(){btn.classList.remove('spring-anim')},400);
  openCourtModal();
}

function openCourtModal(){
  document.getElementById('court-modal').classList.remove('hidden');
  // 현재 코트 수 하이라이트
  document.querySelectorAll('.cm-btn').forEach(function(b,i){
    b.style.background=(i+1===courtCount)?'rgba(223,255,0,.2)':'rgba(255,255,255,.1)';
    b.style.borderColor=(i+1===courtCount)?'var(--primary)':'rgba(255,255,255,.2)';
  });
}
function closeCourtModal(){document.getElementById('court-modal').classList.add('hidden')}
function selectCourtAndGenerate(n){
  closeCourtModal();
  setCourtCount(n);
  generateRound();
}

// ── 점수 모달 ─────────────────────────────────────────────────
function openScoreModal(ci){
  scoreModalCourtIdx=ci;
  var t=currentTeams[ci];
  if(!t)return;
  document.getElementById('sm-title').textContent=(ci+1)+'코트 점수 입력';
  document.getElementById('sm-label-a').textContent='TEAM A  ('+t.teamA.map(function(p){return p.name}).join(', ')+')';
  document.getElementById('sm-label-b').textContent='TEAM B  ('+t.teamB.map(function(p){return p.name}).join(', ')+')';
  var s=currentScores[ci]||{a:0,b:0};
  document.getElementById('sm-score-a').value=s.a;
  document.getElementById('sm-score-b').value=s.b;
  document.getElementById('score-modal').classList.remove('hidden');
  setTimeout(function(){document.getElementById('sm-score-a').select()},80);
}
function closeScoreModal(){
  document.getElementById('score-modal').classList.add('hidden');
  scoreModalCourtIdx=-1;
}
function confirmScore(){
  var ci=scoreModalCourtIdx;if(ci<0)return;
  var a=Math.max(0,parseInt(document.getElementById('sm-score-a').value)||0);
  var b=Math.max(0,parseInt(document.getElementById('sm-score-b').value)||0);
  if(!currentScores[ci])currentScores[ci]={a:0,b:0};
  currentScores[ci]={a:a,b:b};
  if(roundHistory.length)roundHistory[roundHistory.length-1].scores=currentScores.map(function(s){return{...s}});
  closeScoreModal();
  refreshScoreDisplay(ci);
  renderHistory();
  saveState();
  showToast((ci+1)+'코트 '+a+':'+b+' 확정 ✅');
}
function refreshScoreDisplay(ci){
  var s=currentScores[ci];if(!s)return;
  var va=document.getElementById('sv-a-'+ci);
  var vb=document.getElementById('sv-b-'+ci);
  var badge=document.getElementById('sv-badge-'+ci);
  var tA=document.getElementById('trophy-a-'+ci);
  var tB=document.getElementById('trophy-b-'+ci);
  if(va)va.textContent=s.a;if(vb)vb.textContent=s.b;
  var scored=s.a>0||s.b>0;
  if(badge){
    if(!scored){badge.textContent='미기록';badge.className='score-badge sb-idle'}
    else if(s.a>s.b){badge.textContent='A팀 승';badge.className='score-badge sb-win-a'}
    else if(s.b>s.a){badge.textContent='B팀 승';badge.className='score-badge sb-win-b'}
    else{badge.textContent='무승부';badge.className='score-badge sb-draw'}
  }
  if(tA)tA.textContent=(s.a>s.b&&scored)?'🏆':'';
  if(tB)tB.textContent=(s.b>s.a&&scored)?'🏆':'';
}

// ── 공유 ─────────────────────────────────────────────────────
function shareRound(){
  if(!roundHistory.length){showToast('생성된 라운드가 없습니다');return}
  var h=roundHistory[roundHistory.length-1];
  var icons=['1️⃣','2️⃣','3️⃣'];
  var lines=['🎾 팀쎄러데이','📅 '+formatDate(h.date)+'  |  🏸 Round '+roundNum,'─'.repeat(24)];
  h.courts.filter(function(t){return t.all.length>0}).forEach(function(t,ci){
    var ta=t.teamA.map(function(p){return p.name}).join(' · ');
    var tb=t.teamB.map(function(p){return p.name}).join(' · ');
    var s=h.scores&&h.scores[ci]&&(h.scores[ci].a>0||h.scores[ci].b>0)
      ?'  🏆 '+h.scores[ci].a+' : '+h.scores[ci].b:'';
    var gt=h.gameSeconds&&h.gameSeconds[ci]>0?'  ⏱ '+fmtSec(h.gameSeconds[ci]):'';
    lines.push((icons[ci]||'🎾')+' '+(ci+1)+'코트');
    lines.push('   👥 '+ta);lines.push('   🆚');lines.push('   👥 '+tb+s+gt);
    if(ci<h.courts.filter(function(t){return t.all.length>0}).length-1)lines.push('');
  });
  if(h.sitout.length){lines.push('─'.repeat(24));lines.push('⏳ 대기: '+h.sitout.join(', '))}
  lines.push('─'.repeat(24));lines.push('💪 화이팅! 즐거운 테니스 되세요!');
  var text=lines.join('\n');
  navigator.clipboard.writeText(text)
    .then(function(){showToast('✅ 클립보드 복사! 카카오톡에 붙여넣기')})
    .catch(function(){var ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);showToast('✅ 복사 완료!')});
}
function showToast(msg){
  var t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');
  setTimeout(function(){t.classList.remove('show')},2500);
}

// ── 플레이어 관리 ─────────────────────────────────────────────
function addPlayer(){
  var input=document.getElementById('new-name');
  var val=input.value.trim();if(!val)return;
  var name=val,rank='C',age=null;
  var m=val.match(/^(.+?)\s*([ABCDabcd])?\s*(\d+)?$/);
  if(m){
    name=m[1].trim();
    if(m[2])rank=m[2].toUpperCase();
    if(m[3])age=parseInt(m[3]);
  }
  if(players.find(function(p){return p.name===name})){showToast('이미 있는 이름입니다');return}
  players.push({name:name,rank:rank,age:age});selected.add(name);input.value='';render();saveState();
}
function togglePlayer(name){
  if(selected.has(name))selected.delete(name);else selected.add(name);
  var chips=document.querySelectorAll('[data-player="'+CSS.escape(name)+'"]');
  chips.forEach(function(c){c.classList.remove('bouncing');void c.offsetWidth;c.classList.add('bouncing')});
  render();saveState();
}
function cycleRank(name,e){
  e.stopPropagation();
  var p=players.find(function(p){return p.name===name});if(!p)return;
  p.rank=RANKS[(RANKS.indexOf(p.rank)+1)%RANKS.length];render();saveState();
}
function removePlayer(name,e){
  e.stopPropagation();if(!confirm('\''+name+'\' 삭제?'))return;
  players=players.filter(function(p){return p.name!==name});selected.delete(name);render();saveState();
}
function selectAll(){players.forEach(function(p){selected.add(p.name)});render();saveState()}
function clearAll(){selected.clear();render();saveState()}

// ── 드래그/스왑 ───────────────────────────────────────────────
function onPtClick(ci,team,pi){
  if(!selectedSwap){
    selectedSwap={ci:ci,team:team,pi:pi};
    var hint=document.getElementById('swap-hint');
    if(hint)hint.style.display='block';
    refreshPtHighlights();
  } else {
    var src=selectedSwap;
    selectedSwap=null;
    var hint=document.getElementById('swap-hint');
    if(hint)hint.style.display='none';
    if(src.ci===ci&&src.team===team&&src.pi===pi){refreshPtHighlights();return}
    var srcArr=src.team==='A'?currentTeams[src.ci].teamA:currentTeams[src.ci].teamB;
    var dstArr=team==='A'?currentTeams[ci].teamA:currentTeams[ci].teamB;
    var temp=srcArr[src.pi];srcArr[src.pi]=dstArr[pi];dstArr[pi]=temp;
    currentTeams[src.ci].all=[...currentTeams[src.ci].teamA,...currentTeams[src.ci].teamB];
    if(src.ci!==ci)currentTeams[ci].all=[...currentTeams[ci].teamA,...currentTeams[ci].teamB];
    if(roundHistory.length)roundHistory[roundHistory.length-1].courts=currentTeams;
    renderCourts(currentTeams,currentSitout);
    saveState();
    showToast('🔄 선수 교환 완료');
  }
}
function refreshPtHighlights(){
  document.querySelectorAll('.pt').forEach(function(el){
    var ci=+el.dataset.ci,team=el.dataset.team,pi=+el.dataset.pi;
    el.classList.toggle('selected',!!selectedSwap&&selectedSwap.ci===ci&&selectedSwap.team===team&&selectedSwap.pi===pi);
  });
}
function onDragStart(e,ci,team,pi){dragSrc={ci:ci,team:team,pi:pi};e.currentTarget.classList.add('dragging')}
function onDragEnd(e){e.currentTarget.classList.remove('dragging');document.querySelectorAll('.pt').forEach(function(el){el.classList.remove('drag-over')})}
function onDragOver(e,ci,team,pi){e.preventDefault();document.querySelectorAll('.pt').forEach(function(el){el.classList.remove('drag-over')});e.currentTarget.classList.add('drag-over')}
function onDrop(e,ci,team,pi){
  e.preventDefault();e.currentTarget.classList.remove('drag-over');
  if(!dragSrc)return;
  if(dragSrc.ci===ci&&dragSrc.team===team&&dragSrc.pi===pi){dragSrc=null;return}
  onPtClick(dragSrc.ci,dragSrc.team,dragSrc.pi);
  onPtClick(ci,team,pi);
  dragSrc=null;
}

// ── 설정 패널 ─────────────────────────────────────────────────
function openSettings(){document.getElementById('settings-overlay').classList.remove('hidden')}
function closeSettings(){document.getElementById('settings-overlay').classList.add('hidden')}
function setViewType(t){
  viewType=t;
  document.querySelectorAll('.vt-btn').forEach(function(b){b.classList.remove('active')});
  var vtBtn=document.getElementById('vt-'+t);
  if(vtBtn)vtBtn.classList.add('active');
  if(currentTeams&&currentTeams.length)renderCourts(currentTeams,currentSitout);
  saveState();
}

// ── 리셋 ─────────────────────────────────────────────────────
function resetAll(){
  if(!confirm('전체 리셋? 히스토리와 통계가 삭제됩니다.'))return;
  courtTimers.forEach(function(ct){if(ct.running){ct.running=false;clearInterval(ct.interval)}});
  roundNum=0;roundHistory=[];currentScores=[];currentTeams=[];currentSitout=[];
  lastPairs=new Set();sitoutLast=new Set();selectedSwap=null;courtTimers=[];
  window._histDateIdx=0;window._statsDateIdx=0;window._slideIdx=0;
  document.getElementById('courts-area').innerHTML=
    '<div class="empty-court"><span class="eicon"><iconify-icon icon="mdi:tennis"></iconify-icon></span>'+
    '<p>참석자를 선택하고 라운드를 생성하세요</p></div>';
  document.getElementById('waitlist-area').innerHTML='';
  renderHistory();render();saveState();
}

// ── 마루 연동 ─────────────────────────────────────────────────
async function checkKdkPending(){
  try{
    var r=await fetch('/api/kdk/pending');
    var d=await r.json();
    if(!d.ok||!d.pending||!d.players||!d.players.length)return false;
    players=d.players.map(function(p){return{name:p.name,rank:p.rank,age:p.age||0}});
    selected=new Set(players.map(function(p){return p.name}));
    saveState();
    var ts=d.imported_at?new Date(d.imported_at).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'}):'방금';
    var banner=document.createElement('div');
    banner.style.cssText='position:fixed;top:12px;left:50%;transform:translateX(-50%);background:#27ae60;color:#fff;padding:10px 20px;border-radius:8px;z-index:9999;font-weight:bold;box-shadow:0 2px 8px rgba(0,0,0,.3)';
    banner.textContent='🎾 마루가 등록한 참석자 '+players.length+'명 로드됨 ('+ts+')';
    document.body.appendChild(banner);
    setTimeout(function(){banner.remove()},4000);
    return true;
  }catch(e){return false;}
}

// ── 스크롤 패럴랙스 ───────────────────────────────────────────
(function(){
  var bg=document.getElementById('bg-layer');var ticking=false;
  window.addEventListener('scroll',function(){
    if(!ticking){requestAnimationFrame(function(){bg.style.transform='translateY('+(window.scrollY||window.pageYOffset)*.28+'px)';ticking=false});ticking=true}
  },{passive:true});
})();

// ── 초기화 ───────────────────────────────────────────────────
window.onload=async function(){
  var pendingLoaded=await checkKdkPending();
  if(!pendingLoaded&&!loadState()){players=DEFAULT_MEMBERS.map(function(p){return{...p}});players.forEach(function(p){selected.add(p.name)})}
  updateCourtCountUI();
  // 뷰타입 버튼 초기화
  document.querySelectorAll('.vt-btn').forEach(function(b){b.classList.remove('active')});
  var vtBtn=document.getElementById('vt-'+viewType);
  if(vtBtn)vtBtn.classList.add('active');
  render();
  if(roundHistory.length){
    var last=roundHistory[roundHistory.length-1];
    currentTeams=last.courts;currentSitout=last.sitout;
    renderCourts(last.courts,last.sitout);
    updateStats([...selected].length,last.sitout.length);
    renderHistory();
    if(last.scores)currentScores=last.scores.map(function(s){return{...s}});
  }
  updateStats([...selected].length,0);
};
