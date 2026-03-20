// ── 유틸 ─────────────────────────────────────────────────────
function fmtSec(sec){
  return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
}

// ── 날짜 ─────────────────────────────────────────────────────
function todayStr(){return new Date().toISOString().split('T')[0]}
function formatDate(s){
  if(!s)return'날짜 없음';
  var d=new Date(s+'T12:00:00');
  return d.getFullYear()+'년 '+(d.getMonth()+1)+'월 '+d.getDate()+'일 ('+DAY_KO[d.getDay()]+')';
}

// ── 휴식 횟수 집계 ────────────────────────────────────────────
function getSitoutCounts(){
  var c={};
  players.forEach(function(p){c[p.name]=0});
  history.forEach(function(h){h.sitout.forEach(function(n){c[n]=(c[n]||0)+1})});
  return c;
}

// ── HTML 이스케이프 ────────────────────────────────────────────
function esc(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── shuffle / pairKey / snakeDraft ────────────────────────────
function shuffle(arr){
  var a=[...arr];
  for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}
  return a;
}
function pairKey(a,b){return[a,b].sort().join('||')}
function snakeDraft(total,courts){
  var order=[];var cur=0;var dir=1;
  for(var i=0;i<total;i++){
    order.push(cur);cur+=dir;
    if(cur>=courts){cur=courts-1;dir=-1}else if(cur<0){cur=0;dir=1}
  }
  return order;
}

// ── 통계 계산 ─────────────────────────────────────────────────
function computeStats(){
  var map={};
  players.forEach(function(p){
    map[p.name]={name:p.name,totalGames:0,totalWins:0,totalLosses:0,totalDraws:0,
      goalsFor:0,goalsAgainst:0,byDate:{}};
  });
  history.forEach(function(h){
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

// ── 라운드 생성 (휴식 가중치 적용) ───────────────────────────
function generateRound(){
  var active=players.filter(function(p){return selected.has(p.name)});
  var warn=document.getElementById('warn-msg');
  if(active.length<4){warn.style.display='block';warn.textContent='⚠️ 최소 4명 이상 선택해야 합니다.';switchTab('members');return}
  warn.style.display='none';

  var PER=4;
  var sitCounts=getSitoutCounts();

  var sorted=[];
  for(var ri=0;ri<RANKS.length;ri++){
    var rank=RANKS[ri];
    var group=active.filter(function(p){return p.rank===rank});
    var lastSit=group.filter(function(p){return sitoutLast.has(p.name)});
    var rest=group.filter(function(p){return !sitoutLast.has(p.name)});
    var restSorted=rest.sort(function(a,b){
      var diff=(sitCounts[b.name]||0)-(sitCounts[a.name]||0);
      return diff!==0?diff:Math.random()-.5;
    });
    sorted.push.apply(sorted,lastSit);
    sorted.push.apply(sorted,restSorted);
  }

  var playing=sorted.slice(0,courtCount*PER);
  var sitout=sorted.slice(courtCount*PER).map(function(p){return p.name});
  var snakeOrder=snakeDraft(playing.length,courtCount);
  var courtBuckets=Array.from({length:courtCount},function(){return[]});
  playing.forEach(function(p,i){courtBuckets[snakeOrder[i]].push(p)});
  var teams=courtBuckets.map(function(bucket){
    var cs=[...bucket].sort(function(a,b){return RANK_SCORE[b.rank]-RANK_SCORE[a.rank]});
    return{teamA:[cs[0],cs[3]||cs[2]].filter(Boolean),teamB:[cs[1],cs[2]].filter(Boolean),all:bucket};
  });

  var newPairs=new Set();
  teams.forEach(function(t){
    var ns=t.all.map(function(p){return p.name});
    for(var i=0;i<ns.length;i++)for(var j=i+1;j<ns.length;j++)newPairs.add(pairKey(ns[i],ns[j]));
  });

  lastPairs=newPairs;sitoutLast=new Set(sitout);
  currentScores=teams.map(function(){return{a:0,b:0}});
  currentTeams=teams;currentSitout=sitout;
  selectedSwap=null;
  // 코트별 타이머 초기화
  courtTimers=teams.map(function(){return{sec:0,running:false,interval:null}});
  roundNum++;
  history.push({courts:teams,sitout:sitout,scores:currentScores.map(function(s){return{...s}}),date:todayStr(),gameSeconds:[]});
  window._slideIdx=0;
  renderCourts(teams,sitout);
  updateStats(active.length,sitout.length);
  renderHistory();
  switchTab('court');
  window.scrollTo({top:0,behavior:'smooth'});
  saveState();
}
