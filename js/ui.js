// ── 렌더 ─────────────────────────────────────────────────────
function render(){renderGroups();renderRankDist();updateStats([...selected].length,0)}

function renderGroups(){
  var container=document.getElementById('player-groups');
  var sitCounts=getSitoutCounts();
  container.innerHTML=RANKS.map(function(rank){
    var group=players.filter(function(p){return p.rank===rank});if(!group.length)return'';
    var ac=group.filter(function(p){return selected.has(p.name)}).length;
    var chips=group.map(function(p){
      var on=selected.has(p.name);
      var sit=sitoutLast.has(p.name)&&on;
      var cls=on?(sit?'sitout':'active'):'inactive';
      var sc=sitCounts[p.name]||0;
      return'<div class="player-chip '+cls+' rank-'+rank+'"'+
            ' data-player="'+esc(p.name)+'"'+
            ' onclick="togglePlayer(\''+esc(p.name)+'\')">'+
        '<button class="btn-remove" onclick="removePlayer(\''+esc(p.name)+'\',event)">×</button>'+
        '<span class="chip-rank" style="background:'+RANK_BG[rank]+';color:'+RANK_FG[rank]+'"'+
              ' onclick="cycleRank(\''+esc(p.name)+'\',event)">'+rank+'</span>'+
        '<span class="chip-name">'+esc(p.name)+(sit?'<br><small style="font-size:.58rem;color:#c4b5fd">대기중</small>':'')+(p.age?'<br><span class="chip-age">'+p.age+'세</span>':'')+'</span>'+
        '<span class="rest-badge '+(sc===0?'zero':'')+'">'+(sc===0?'휴식 0':'휴식 '+sc)+'</span>'+
      '</div>';
    }).join('');
    return'<div class="rank-group">'+
      '<div class="rank-group-header">'+
        '<span class="rank-group-label" style="background:'+RANK_BG[rank]+';color:'+RANK_FG[rank]+'">'+rank+'</span>'+
        '<span style="font-size:.8rem;color:#fff;font-weight:800">'+rank+'급</span>'+
        '<span class="rank-group-count">'+ac+'/'+group.length+'명 참석</span>'+
      '</div>'+
      '<div class="player-grid">'+chips+'</div>'+
    '</div>';
  }).join('');
}

function renderRankDist(){
  var active=players.filter(function(p){return selected.has(p.name)});
  var counts={A:0,B:0,C:0,D:0};active.forEach(function(p){counts[p.rank]++});
  document.getElementById('rank-dist').innerHTML=
    '<span style="font-size:.73rem;color:rgba(255,255,255,.4);margin-right:2px">참석 '+active.length+'명:</span>'+
    RANKS.map(function(r){return'<div class="rank-count"><span class="rank-badge" style="background:'+RANK_BG[r]+';color:'+RANK_FG[r]+'">'+r+'</span>'+
      '<span style="color:'+RANK_BG[r]+';font-weight:900">'+counts[r]+'</span></div>'}).join('');
}

// ── 코트 렌더 (뷰타입 분기) ──────────────────────────────────
function renderCourts(teams,sitout){
  currentTeams=teams;
  currentSitout=sitout;
  var el=document.getElementById('courts-area');
  if(!teams||teams.length===0){
    el.innerHTML='<div class="empty-court"><span class="eicon"><iconify-icon icon="mdi:tennis"></iconify-icon></span><p>참석자를 선택하고 라운드를 생성하세요</p></div>';
    return;
  }
  if(viewType==='slide'){
    renderCourtsSlide(teams,sitout,el);
  } else {
    renderCourtsCard(teams,sitout,el);
  }
}

function buildCourtCardHtml(t,ci,sitout){
  var s=currentScores[ci]||{a:0,b:0};
  var scored=s.a>0||s.b>0;
  var trophyA=(s.a>s.b&&scored)?'🏆':'';
  var trophyB=(s.b>s.a&&scored)?'🏆':'';
  var badgeCls=!scored?'sb-idle':s.a>s.b?'sb-win-a':s.b>s.a?'sb-win-b':'sb-draw';
  var badgeTxt=!scored?'미기록':s.a>s.b?'A팀 승':s.b>s.a?'B팀 승':'무승부';
  var ct=courtTimers[ci]||{sec:0,running:false};
  var ctBadgeCls=ct.running?'ct-badge running':(ct.sec>0?'ct-badge done':'ct-badge');
  var ctBadgeTxt=ct.running?'경기진행중':(ct.sec>0?'완료 '+fmtSec(ct.sec):'대기중');
  var swapActive=!!selectedSwap;
  var mkTag=function(p,team,pi){
    return'<span class="pt"'+
      ' data-ci="'+ci+'" data-team="'+team+'" data-pi="'+pi+'"'+
      ' onclick="onPtClick('+ci+',\''+team+'\','+pi+')"'+
      ' draggable="true"'+
      ' ondragstart="onDragStart(event,'+ci+',\''+team+'\','+pi+')"'+
      ' ondragend="onDragEnd(event)"'+
      ' ondragover="onDragOver(event,'+ci+',\''+team+'\','+pi+')"'+
      ' ondrop="onDrop(event,'+ci+',\''+team+'\','+pi+')"'+
      ' title="탭: 선택 후 교환 | 드래그: 위치 이동"'+
    '><iconify-icon icon="mdi:drag" style="font-size:.85rem;opacity:.4;vertical-align:-1px"></iconify-icon> '+esc(p.name)+'</span>';
  };
  return '<div class="court-card">'+
    '<div class="court-header">'+
      '<span class="court-name"><iconify-icon icon="mdi:tennis" style="vertical-align:-2px"></iconify-icon> '+(ci+1)+'코트</span>'+
      '<div class="court-header-right">'+
        '<span class="'+ctBadgeCls+'" id="ct-badge-'+ci+'">'+ctBadgeTxt+'</span>'+
        '<span class="court-badge">R'+roundNum+'</span>'+
      '</div>'+
    '</div>'+
    '<div class="court-timer-row">'+
      '<button id="ct-start-'+ci+'" class="ct-start-btn" style="display:'+(ct.running?'none':'')+'" onclick="startCourtTimer('+ci+')">'+
        '<iconify-icon icon="mdi:play"></iconify-icon> 경기 시작'+
      '</button>'+
      '<button id="ct-stop-'+ci+'" class="ct-stop-btn" style="display:'+(ct.running?'':'none')+'" onclick="stopCourtTimer('+ci+')">'+
        '<iconify-icon icon="mdi:stop"></iconify-icon> 종료'+
      '</button>'+
      '<span class="ct-timer-display" id="ct-display-'+ci+'">'+fmtSec(ct.sec)+'</span>'+
    '</div>'+
    '<div class="vs-card-body">'+
      '<div class="vs-team-block vs-team-a-block">'+
        '<div class="vs-team-label-big">'+
          '<span class="vs-team-dot a-dot"></span> TEAM A'+
          '<span class="vs-team-trophy" id="trophy-a-'+ci+'">'+trophyA+'</span>'+
        '</div>'+
        '<div class="vs-players">'+t.teamA.map(function(p,pi){return mkTag(p,'A',pi)}).join('')+'</div>'+
      '</div>'+
      '<div class="vs-divider"><span class="vs-text">VS</span></div>'+
      '<div class="vs-team-block vs-team-b-block">'+
        '<div class="vs-team-label-big">'+
          '<span class="vs-team-dot b-dot"></span> TEAM B'+
          '<span class="vs-team-trophy" id="trophy-b-'+ci+'">'+trophyB+'</span>'+
        '</div>'+
        '<div class="vs-players">'+t.teamB.map(function(p,pi){return mkTag(p,'B',pi)}).join('')+'</div>'+
      '</div>'+
    '</div>'+
    '<div class="score-section">'+
      '<div class="score-display">'+
        '<span class="score-val a" id="sv-a-'+ci+'">'+s.a+'</span>'+
        '<span class="score-col">:</span>'+
        '<span class="score-val b" id="sv-b-'+ci+'">'+s.b+'</span>'+
        '<span class="score-badge '+badgeCls+'" id="sv-badge-'+ci+'" style="margin-left:8px">'+badgeTxt+'</span>'+
      '</div>'+
      '<button class="score-enter-btn" onclick="openScoreModal('+ci+')">'+
        '<iconify-icon icon="mdi:scoreboard-outline"></iconify-icon> 점수 입력'+
      '</button>'+
    '</div>'+
  '</div>';
}

function buildWaitlistHtml(sitout){
  if(!sitout||!sitout.length)return'';
  return '<div class="waitlist-card">'+
    '<div class="waitlist-title"><iconify-icon icon="mdi:clock-outline"></iconify-icon> 이번 라운드 대기 — 다음 라운드 우선 (휴식 횟수 누적)</div>'+
    '<div class="waitlist-players">'+
      sitout.map(function(name){return'<span class="wait-tag priority">'+esc(name)+'</span>'}).join('')+
    '</div>'+
  '</div>';
}

function attachTimerButtons(){
  // 타이머 버튼 상태 복원 (슬라이드 재렌더 후)
  for(var i=0;i<courtTimers.length;i++){
    updateCourtTimerUI(i);
  }
}

// ── 카드형 렌더 ───────────────────────────────────────────────
function renderCourtsCard(teams,sitout,el){
  var ac=teams.filter(function(t){return t.all.length>0});
  var swapActive=!!selectedSwap;
  var html='<div id="swap-hint" class="swap-hint" style="display:'+(swapActive?'block':'none')+'">'+
    '<iconify-icon icon="mdi:swap-horizontal" style="vertical-align:-2px"></iconify-icon> 교환할 위치를 선택하세요 (같은 선수 재선택 시 취소)'+
  '</div>'+
  '<div class="courts-grid">';
  for(var i=0;i<ac.length;i++){
    html+=buildCourtCardHtml(ac[i],i,sitout);
  }
  html+='</div>';
  el.innerHTML=html;
  document.getElementById('waitlist-area').innerHTML=buildWaitlistHtml(sitout);
}

// ── 슬라이드형 렌더 ───────────────────────────────────────────
function renderCourtsSlide(teams,sitout,el){
  var ac=teams.filter(function(t){return t.all.length>0});
  var slideIdx=window._slideIdx||0;
  if(slideIdx>=ac.length)slideIdx=0;
  var swapActive=!!selectedSwap;

  var html='<div id="swap-hint" class="swap-hint" style="display:'+(swapActive?'block':'none')+'">'+
    '<iconify-icon icon="mdi:swap-horizontal" style="vertical-align:-2px"></iconify-icon> 교환할 위치를 선택하세요 (같은 선수 재선택 시 취소)'+
  '</div>';

  html+='<div class="slide-nav">';
  for(var i=0;i<ac.length;i++){
    html+='<button class="slide-dot'+(i===slideIdx?' active':'')+'" onclick="goSlide('+i+')"></button>';
  }
  html+='</div>';

  html+='<div class="slide-wrap" id="slide-wrap">';
  for(var i=0;i<ac.length;i++){
    html+='<div class="slide-item'+(i===slideIdx?' active':'')+'" id="slide-'+i+'">';
    html+=buildCourtCardHtml(ac[i],i,sitout);
    html+='</div>';
  }
  html+='</div>';
  el.innerHTML=html;

  document.getElementById('waitlist-area').innerHTML=buildWaitlistHtml(sitout);
  attachTimerButtons();
}

function goSlide(i){
  window._slideIdx=i;
  renderCourts(currentTeams,currentSitout);
}

// ── 히스토리 렌더 (날짜별 슬라이드) ──────────────────────────
function renderHistory(){
  var el=document.getElementById('panel-history');
  if(!history.length){
    el.innerHTML='<div style="text-align:center;color:rgba(255,255,255,.3);padding:40px 20px;font-size:.85rem">아직 기록이 없습니다</div>';
    var b=document.querySelector('#tab-history .badge');if(b)b.remove();
    return;
  }
  var badge=document.querySelector('#tab-history .badge');
  if(!badge){badge=document.createElement('span');badge.className='badge';document.getElementById('tab-history').appendChild(badge)}
  badge.textContent=history.length;

  // 날짜별 그룹화
  var byDate={};
  history.forEach(function(r,i){
    var d=r.date||'미기록';
    if(!byDate[d])byDate[d]=[];
    byDate[d].push({round:r,idx:i});
  });
  var dates=Object.keys(byDate).sort().reverse();
  var dateIdx=window._histDateIdx||0;
  if(dateIdx>=dates.length)dateIdx=0;
  var curDate=dates[dateIdx];
  var rounds=byDate[curDate];

  var html='<div class="date-slide-nav">';
  html+='<button class="date-nav-btn" onclick="changeHistDate(-1)"'+(dateIdx>=dates.length-1?' disabled':'')+'>← 이전날</button>';
  html+='<div class="date-nav-label">'+formatDate(curDate)+'</div>';
  html+='<button class="date-nav-btn" onclick="changeHistDate(1)"'+(dateIdx===0?' disabled':'')+'>다음날 →</button>';
  html+='</div>';

  // 현재 날짜의 라운드들 (역순)
  var roundsReversed=rounds.slice().reverse();
  for(var ri=0;ri<roundsReversed.length;ri++){
    var item=roundsReversed[ri];
    var h=item.round;
    var rn=item.idx+1;
    var scores=h.scores||[];
    var gameSecs=h.gameSeconds||[];
    var ac2=h.courts.filter(function(t){return t.all.length>0});
    var chips=ac2.map(function(t,ci){
      var s=scores[ci]||{a:0,b:0};var cls=s.a>s.b?'wa':s.b>s.a?'wb':'';
      var gt=gameSecs[ci]>0?' ⏱'+fmtSec(gameSecs[ci]):'';
      return'<span class="r-chip '+cls+'">'+(ci+1)+'코트 '+s.a+':'+s.b+gt+'</span>';
    }).join('');
    var rows=ac2.map(function(t,ci){
      var s=scores[ci]||{a:0,b:0};
      var ta=t.teamA.map(function(p){return'<span class="h-name">'+esc(p.name)+'</span>'}).join('+');
      var tb=t.teamB.map(function(p){return'<span class="h-name">'+esc(p.name)+'</span>'}).join('+');
      var sc=(s.a>0||s.b>0)?'['+s.a+':'+s.b+']':'[미기록]';
      var sc_cls=s.a>s.b?'wa':s.b>s.a?'wb':'dr';
      var gt=gameSecs[ci]>0?'<span class="h-time">⏱ '+fmtSec(gameSecs[ci])+'</span>':'';
      return'<div class="h-court-row"><span class="h-cl">'+(ci+1)+'코트</span>'+ta+'<span class="h-vs">vs</span>'+tb+
        '<span class="h-sc '+sc_cls+'">'+sc+'</span>'+gt+'</div>';
    }).join('');
    var sitHTML=h.sitout.length?'<div class="h-sitout">⏳ 대기: '+h.sitout.map(function(n){return esc(n)}).join(', ')+'</div>':'';
    html+='<div class="round-item">'+
      '<div class="round-header" id="rh-'+rn+'" onclick="toggleRound('+rn+')">'+
        '<div class="r-left"><span class="r-label">R'+rn+'</span>'+
          '<div><div class="r-meta">'+ac2.length+'코트'+(h.sitout.length?' · 대기'+h.sitout.length:'')+'</div>'+
            '<div class="r-date">'+formatDate(h.date)+'</div>'+
            '<div class="r-score-chips">'+chips+'</div></div>'+
        '</div><span class="r-arrow">›</span>'+
      '</div>'+
      '<div class="round-body" id="rb-'+rn+'">'+rows+sitHTML+'</div>'+
    '</div>';
  }

  el.innerHTML=html;
  // 마지막 라운드 펼치기
  if(rounds.length>0){
    var lastRn=rounds[rounds.length-1].idx+1;
    var hdr=document.getElementById('rh-'+lastRn);
    var bdy=document.getElementById('rb-'+lastRn);
    if(hdr)hdr.classList.add('open');if(bdy)bdy.classList.add('open');
  }
}

function changeHistDate(dir){
  var byDate={};
  history.forEach(function(r){var d=r.date||'미기록';if(!byDate[d])byDate[d]=[];byDate[d].push(r)});
  var dates=Object.keys(byDate).sort().reverse();
  var idx=(window._histDateIdx||0)-dir;
  if(idx<0)idx=0;
  if(idx>=dates.length)idx=dates.length-1;
  window._histDateIdx=idx;
  renderHistory();
}

function toggleRound(rn){
  document.getElementById('rh-'+rn).classList.toggle('open');
  document.getElementById('rb-'+rn).classList.toggle('open');
}

// ── 통계 렌더 (날짜별 슬라이드) ──────────────────────────────
function renderStats(){
  var el=document.getElementById('panel-stats');
  var stats=computeStats();
  if(!history.length){
    el.innerHTML='<div class="stats-empty"><span class="eicon"><iconify-icon icon="mdi:chart-bar"></iconify-icon></span><p>라운드를 진행하면 통계가 표시됩니다</p></div>';return;
  }
  var totalGamesAll=stats.reduce(function(s,p){return s+p.totalGames},0);
  var sitCounts=getSitoutCounts();
  var totalGameSec=0;
  history.forEach(function(h){(h.gameSeconds||[]).forEach(function(s){if(s>0)totalGameSec+=s})});

  // 날짜별 슬라이드 네비
  var byDate={};
  history.forEach(function(r){var d=r.date||'미기록';if(!byDate[d])byDate[d]=[];byDate[d].push(r)});
  var dates=['전체'].concat(Object.keys(byDate).sort().reverse());
  var statsDateIdx=window._statsDateIdx||0;
  if(statsDateIdx>=dates.length)statsDateIdx=0;
  var selDate=dates[statsDateIdx];

  // 해당 날짜의 통계만 필터링
  var filteredHistory=history;
  if(statsDateIdx>0){
    filteredHistory=history.filter(function(h){return(h.date||'미기록')===selDate});
  }

  // 날짜 필터링된 통계 재계산
  var statsFiltered=computeStatsFromHistory(filteredHistory);

  var dateHtml='<div class="date-slide-nav" style="margin-bottom:14px">'+
    '<button class="date-nav-btn" onclick="changeStatsDate(-1)"'+(statsDateIdx>=dates.length-1?' disabled':'')+'>← 이전</button>'+
    '<div class="date-nav-label">'+(statsDateIdx===0?'전체 기간':formatDate(selDate))+'</div>'+
    '<button class="date-nav-btn" onclick="changeStatsDate(1)"'+(statsDateIdx===0?' disabled':'')+'>다음 →</button>'+
  '</div>';

  // 시상대
  var medals=['🥇','🥈','🥉'];
  var medalCls=['top1','top2','top3'];
  var ageMap2={};players.forEach(function(p){if(p.age)ageMap2[p.name]=p.age});
  var podiumRows=statsFiltered.slice(0,3).map(function(s,i){
    var rate=s.totalGames?Math.round(s.totalWins/s.totalGames*100):0;
    var gd=s.goalsFor-s.goalsAgainst;
    var ageTxt=ageMap2[s.name]?'<span class="age-tag">'+ageMap2[s.name]+'세</span>':'';
    return'<div class="podium-row '+medalCls[i]+'">'+
      '<span class="medal-badge medal-'+(i+1)+'">'+medals[i]+'</span>'+
      '<span class="podium-name">'+esc(s.name)+' '+ageTxt+'</span>'+
      '<div class="podium-stats">'+
        '<span>'+s.totalWins+'승 '+s.totalLosses+'패</span>'+
        '<span class="podium-rate">'+rate+'%</span>'+
        '<span style="color:#a78bfa">'+(gd>0?'+':'')+gd+'</span>'+
      '</div>'+
    '</div>';
  }).join('');
  var podium=statsFiltered.length>=1?'<div class="rank-podium">'+
    '<div class="podium-title"><iconify-icon icon="mdi:trophy" style="color:#f59e0b;font-size:1rem"></iconify-icon> '+(statsDateIdx===0?'전체 순위':'당일 순위')+' (동률 시 연장자 우선)</div>'+
    podiumRows+
  '</div>':'';

  var totalGamesFiltered=statsFiltered.reduce(function(s,p){return s+p.totalGames},0);
  var totalGameSecFiltered=0;
  filteredHistory.forEach(function(h){(h.gameSeconds||[]).forEach(function(s){if(s>0)totalGameSecFiltered+=s})});

  var summary=podium+'<div class="stats-summary">'+
    '<div class="sum-card"><div class="sum-label">총 라운드</div><div class="sum-val">'+filteredHistory.length+'</div></div>'+
    '<div class="sum-card"><div class="sum-label">총 경기</div><div class="sum-val">'+Math.floor(totalGamesFiltered/2)+'</div></div>'+
    '<div class="sum-card"><div class="sum-label">총 게임시간</div><div class="sum-val" style="font-size:.9rem">'+(totalGameSecFiltered>0?fmtSec(totalGameSecFiltered):'—')+'</div></div>'+
  '</div>';

  var rows=statsFiltered.map(function(s,i){
    var rate=s.totalGames?Math.round(s.totalWins/s.totalGames*100):0;
    var gd=s.goalsFor-s.goalsAgainst;
    var gdStr=(gd>0?'+':'')+gd;
    var restCnt=sitCounts[s.name]||0;

    var dateRows=Object.entries(s.byDate)
      .sort(function(a,b){return b[0].localeCompare(a[0])})
      .map(function(entry){
        var date=entry[0];var d=entry[1];
        var dr=d.games?Math.round(d.wins/d.games*100):0;
        var dgd=d.gf-d.ga;
        var label=d.wins>d.losses?'우세':d.losses>d.wins?'열세':'균등';
        var cls=d.wins>d.losses?'db-win':d.losses>d.wins?'db-loss':'db-even';
        return'<div class="date-row">'+
          '<div class="date-label"><iconify-icon icon="mdi:calendar" style="vertical-align:-2px;font-size:.88rem"></iconify-icon> '+formatDate(date)+'</div>'+
          '<div class="date-stats">'+
            '<div class="ds"><span>경기</span><span class="ds-g">'+d.games+'</span></div>'+
            '<div class="ds"><span>승</span><span class="ds-w">'+d.wins+'</span></div>'+
            '<div class="ds"><span>패</span><span class="ds-l">'+d.losses+'</span></div>'+
            '<div class="ds"><span>득실</span><span class="ds-gd">'+(dgd>0?'+':'')+dgd+'</span></div>'+
            '<div class="ds"><span>승률</span><span class="ds-r">'+dr+'%</span></div>'+
          '</div>'+
          '<span class="date-badge '+cls+'">'+label+'</span>'+
        '</div>';
      }).join('');

    return'<div class="player-stat-item">'+
      '<div class="pstat-header" id="ph-'+i+'" onclick="togglePstat('+i+')">'+
        '<span class="pstat-rank-num">'+(i+1)+'</span>'+
        '<span class="pstat-name">'+esc(s.name)+(restCnt>0?'<small style="font-size:.6rem;color:#fde68a;margin-left:5px">휴'+restCnt+'</small>':'')+'</span>'+
        '<div class="pstat-nums">'+
          '<div class="pn"><span class="pn-label">경기</span><span class="pn-val pn-g">'+s.totalGames+'</span></div>'+
          '<div class="pn"><span class="pn-label">승</span><span class="pn-val pn-w">'+s.totalWins+'</span></div>'+
          '<div class="pn"><span class="pn-label">패</span><span class="pn-val pn-l">'+s.totalLosses+'</span></div>'+
          '<div class="pn"><span class="pn-label">득실</span><span class="pn-val pn-gd">'+gdStr+'</span></div>'+
          '<div class="pn"><span class="pn-label">승률</span><span class="pn-val pn-r">'+rate+'%</span></div>'+
        '</div>'+
        '<span class="pstat-arrow">›</span>'+
      '</div>'+
      '<div class="pstat-body" id="pb-'+i+'">'+(dateRows||'<p style="color:rgba(255,255,255,.25);font-size:.78rem;padding:8px">날짜 기록 없음</p>')+'</div>'+
    '</div>';
  }).join('');

  el.innerHTML=dateHtml+summary+rows;
}

function computeStatsFromHistory(hist){
  var map={};
  players.forEach(function(p){
    map[p.name]={name:p.name,totalGames:0,totalWins:0,totalLosses:0,totalDraws:0,
      goalsFor:0,goalsAgainst:0,byDate:{}};
  });
  hist.forEach(function(h){
    var scores=h.scores||[];var date=h.date||'날짜 없음';
    h.courts.forEach(function(court,ci){
      if(!court.all.length)return;
      var s=scores[ci]||{a:0,b:0};var scored=s.a>0||s.b>0;
      var process=function(p,isA){
        if(!map[p.name])map[p.name]={name:p.name,totalGames:0,totalWins:0,totalLosses:0,totalDraws:0,goalsFor:0,goalsAgainst:0,byDate:{}};
        var m=map[p.name];
        if(!m.byDate[date])m.byDate[date]={games:0,wins:0,losses:0,draws:0,gf:0,ga:0};
        var dd=m.byDate[date];
        m.totalGames++;dd.games++;
        if(scored){
          var myG=isA?s.a:s.b;var oppG=isA?s.b:s.a;
          m.goalsFor+=myG;m.goalsAgainst+=oppG;
          dd.gf+=myG;dd.ga+=oppG;
          var won=myG>oppG;var drew=myG===oppG;
          if(drew){m.totalDraws++;dd.draws++}
          else if(won){m.totalWins++;dd.wins++}
          else{m.totalLosses++;dd.losses++}
        }
      };
      court.teamA.forEach(function(p){process(p,true)});
      court.teamB.forEach(function(p){process(p,false)});
    });
  });
  var ageMap={};
  players.forEach(function(p){if(p.age)ageMap[p.name]=p.age});
  return Object.values(map)
    .filter(function(s){return s.totalGames>0})
    .sort(function(a,b){
      var ra=a.totalGames?a.totalWins/a.totalGames:0;
      var rb=b.totalGames?b.totalWins/b.totalGames:0;
      return rb-ra
        ||b.totalWins-a.totalWins
        ||(b.goalsFor-b.goalsAgainst)-(a.goalsFor-a.goalsAgainst)
        ||(ageMap[b.name]||0)-(ageMap[a.name]||0);
    });
}

function changeStatsDate(dir){
  var byDate={};
  history.forEach(function(r){var d=r.date||'미기록';if(!byDate[d])byDate[d]=[];byDate[d].push(r)});
  var dates=['전체'].concat(Object.keys(byDate).sort().reverse());
  var idx=(window._statsDateIdx||0)-dir;
  if(idx<0)idx=0;
  if(idx>=dates.length)idx=dates.length-1;
  window._statsDateIdx=idx;
  renderStats();
}

function togglePstat(i){
  document.getElementById('ph-'+i).classList.toggle('open');
  document.getElementById('pb-'+i).classList.toggle('open');
}

function updateStats(active,wait){
  document.getElementById('stat-total').textContent=players.length;
  document.getElementById('stat-active').textContent=active;
  document.getElementById('stat-wait').textContent=Math.max(0,wait);
  document.getElementById('stat-round').textContent=roundNum;
}
