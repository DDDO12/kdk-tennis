// ── 상수 ─────────────────────────────────────────────────────
var RANKS=['A','B','C','D'];
var RANK_SCORE={A:4,B:3,C:2,D:1};
var RANK_BG={A:'#f59e0b',B:'#3b82f6',C:'#22c55e',D:'#6b7280'};
var RANK_FG={A:'#1c1000',B:'#fff',C:'#051200',D:'#fff'};
var DAY_KO=['일','월','화','수','목','금','토'];

var DEFAULT_MEMBERS=[
  {name:'홍길동',rank:'B',age:35},{name:'김철수',rank:'A',age:42},{name:'이영희',rank:'C',age:28},
  {name:'박민준',rank:'B',age:31},{name:'최수진',rank:'C',age:26},{name:'정우성',rank:'A',age:48},
  {name:'강다니엘',rank:'B',age:29},{name:'윤아',rank:'C',age:33},{name:'태연',rank:'C',age:34},
  {name:'수영',rank:'B',age:36},{name:'차은우',rank:'A',age:27},{name:'황민현',rank:'D',age:22},
  {name:'옹성우',rank:'D',age:24},{name:'박우진',rank:'C',age:25},{name:'이대휘',rank:'D',age:23},
  {name:'정채연',rank:'C',age:30},{name:'유정연',rank:'D',age:21},{name:'신유나',rank:'B',age:32},
  {name:'김채원',rank:'A',age:38},{name:'허윤진',rank:'D',age:20},
];

// ── 상태 변수 ─────────────────────────────────────────────────
var players=[], roundHistory=[];
var selected=new Set();
var roundNum=0;
var lastPairs=new Set(), sitoutLast=new Set(), currentScores=[], courtCount=3;
var currentTeams=[], currentSitout=[];
var courtTimers=[]; // [{sec,running,interval}] — 코트별 타이머
var isAuthed=sessionStorage.getItem('kdk-auth')==='ok';
var scoreModalCourtIdx=-1;
var selectedSwap=null; // {ci, team, pi}
var dragSrc=null;
var viewType='card'; // 'card' | 'slide'

// ── localStorage ─────────────────────────────────────────────
function saveState(){
  try{localStorage.setItem('kdk-v3',JSON.stringify({
    players,selected:[...selected],roundNum,history:roundHistory,
    currentScores,sitoutLast:[...sitoutLast],courtCount,
    courtTimersSaved:courtTimers.map(function(ct){return{sec:ct.sec}}),
    viewType:viewType
  }));}catch(e){}
}
function loadState(){
  try{
    var raw=localStorage.getItem('kdk-v3');if(!raw)return false;
    var d=JSON.parse(raw);
    players=d.players||[];selected=new Set(d.selected||[]);
    roundNum=d.roundNum||0;roundHistory=Array.isArray(d.history)?d.history:[];
    currentScores=d.currentScores||[];sitoutLast=new Set(d.sitoutLast||[]);
    courtCount=d.courtCount||3;
    viewType=d.viewType||'card';
    // 타이머 복원 (interval 없이 sec만)
    var savedCT=d.courtTimersSaved||[];
    courtTimers=savedCT.map(function(ct){return{sec:ct.sec||0,running:false,interval:null}});
    return players.length>0;
  }catch(e){return false;}
}

// ── JSON 백업 / 복원 ──────────────────────────────────────────
function exportBackup(){
  var data={
    players,selected:[...selected],roundNum,history:roundHistory,
    currentScores,sitoutLast:[...sitoutLast],courtCount,
    courtTimersSaved:courtTimers.map(function(ct){return{sec:ct.sec}}),
    exportedAt:new Date().toISOString(),version:'kdk-v3'
  };
  var json=JSON.stringify(data,null,2);
  var blob=new Blob([json],{type:'application/json'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  var dateStr=todayStr().replace(/-/g,'');
  a.href=url;a.download='KDK_테니스_백업_'+dateStr+'.json';
  document.body.appendChild(a);a.click();
  document.body.removeChild(a);URL.revokeObjectURL(url);
  showToast('✅ 백업 파일 저장 완료');
}
function importBackup(e){
  var file=e.target.files[0];if(!file)return;
  if(!confirm('백업을 불러오면 현재 데이터가 덮어씌워집니다. 계속할까요?')){e.target.value='';return}
  var reader=new FileReader();
  reader.onload=function(ev){
    try{
      var d=JSON.parse(ev.target.result);
      if(d.version!=='kdk-v3'){showToast('❌ 호환되지 않는 백업 파일');return}
      players=d.players||[];
      selected=new Set(d.selected||[]);
      roundNum=d.roundNum||0;
      roundHistory=Array.isArray(d.history)?d.history:[];
      currentScores=d.currentScores||[];
      sitoutLast=new Set(d.sitoutLast||[]);
      courtCount=d.courtCount||3;
      courtTimers=(d.courtTimersSaved||[]).map(function(ct){return{sec:ct.sec||0,running:false,interval:null}});
      saveState();updateCourtCountUI();render();renderHistory();
      if(roundHistory.length){
        var last=roundHistory[roundHistory.length-1];
        currentTeams=last.courts;currentSitout=last.sitout;
        renderCourts(last.courts,last.sitout);
        updateStats([...selected].length,last.sitout.length);
        if(last.scores)currentScores=last.scores.map(function(s){return{...s}});
      }
      showToast('✅ 백업 복원 완료 — R'+roundNum+', '+players.length+'명');
    }catch(err){showToast('❌ 파일 읽기 실패: 올바른 백업 파일인지 확인하세요')}
    e.target.value='';
  };
  reader.readAsText(file);
}
