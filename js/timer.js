// ── 코트별 타이머 ─────────────────────────────────────────────
function startCourtTimer(ci){
  if(!courtTimers[ci])return;
  var ct=courtTimers[ci];
  if(ct.running)return;
  ct.running=true;
  ct.interval=setInterval(function(){ct.sec++;updateCourtTimerDisplay(ci)},1000);
  updateCourtTimerUI(ci);
}
function stopCourtTimer(ci){
  if(!courtTimers[ci])return;
  var ct=courtTimers[ci];
  if(!ct.running)return;
  ct.running=false;
  clearInterval(ct.interval);ct.interval=null;
  // 게임 시간 히스토리 저장
  if(history.length){
    if(!history[history.length-1].gameSeconds)history[history.length-1].gameSeconds=[];
    history[history.length-1].gameSeconds[ci]=ct.sec;
  }
  updateCourtTimerUI(ci);
  saveState();
  showToast((ci+1)+'코트 종료 ⏱ '+fmtSec(ct.sec));
}
function updateCourtTimerDisplay(ci){
  var el=document.getElementById('ct-display-'+ci);
  if(el&&courtTimers[ci])el.textContent=fmtSec(courtTimers[ci].sec);
}
function updateCourtTimerUI(ci){
  var ct=courtTimers[ci];if(!ct)return;
  var startBtn=document.getElementById('ct-start-'+ci);
  var stopBtn=document.getElementById('ct-stop-'+ci);
  var badge=document.getElementById('ct-badge-'+ci);
  var dispEl=document.getElementById('ct-display-'+ci);
  if(startBtn)startBtn.style.display=ct.running?'none':'';
  if(stopBtn)stopBtn.style.display=ct.running?'':'none';
  if(dispEl)dispEl.textContent=fmtSec(ct.sec);
  if(badge){
    if(ct.running){badge.textContent='경기진행중';badge.className='ct-badge running'}
    else if(ct.sec>0){badge.textContent='완료 '+fmtSec(ct.sec);badge.className='ct-badge done'}
    else{badge.textContent='대기중';badge.className='ct-badge'}
  }
}
