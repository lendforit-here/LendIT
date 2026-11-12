(function(){
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];

/* ===== SETTINGS: change these paths if your folders are named differently ===== */
const HOME_URL='home/home.html';   // where to go after login (path from login.html)
const CONFIG={googleClientId:''};  // add your Google OAuth client ID to enable real Google sign-in when hosted on your own site
/* ============================================================================== */

const NS='http://www.w3.org/2000/svg';
const ICONS={
Google:'<svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2.1 1.4-4.7 2.3-7.7 2.3-6.3 0-11.7-4.1-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z"/></svg>',
Facebook:'<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#1877F2"/><path fill="#fff" d="M33 30.8l1.1-6.8h-6.5v-4.4c0-1.9.9-3.7 3.9-3.7h3v-5.8s-2.7-.5-5.3-.5c-5.4 0-8.9 3.3-8.9 9.2V24h-6v6.8h6V48h7.4V30.8z"/></svg>',
Apple:'<svg viewBox="0 0 24 24" fill="#fff"><path d="M16.4 12.6c0-2.4 2-3.5 2.1-3.6-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9s-1.9-.9-3.2-.8c-1.6 0-3.2 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8s1.8.8 3.1.7c1.3 0 2.1-1.2 2.9-2.3.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.5-1-2.5-3.9zM14 5.4c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.6 2.8-1.4z"/></svg>'};
const EYE='<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/><path class="sl" d="M3 21L21 3"/></svg>';
const ic=p=>ICONS[p]||'';

/* run a setup step without letting one failure stop the others */
function safe(name,fn){try{fn()}catch(e){console.error('[login] '+name+' failed:',e)}}

/* storage */
const mem={};
const st={get(k,f,sess){try{const v=(sess?sessionStorage:localStorage).getItem(k);return v?JSON.parse(v):(k in mem?mem[k]:f)}catch(e){return k in mem?mem[k]:f}},
set(k,v,sess){mem[k]=v;try{(sess?sessionStorage:localStorage).setItem(k,JSON.stringify(v))}catch(e){}},
del(k){delete mem[k];try{localStorage.removeItem(k);sessionStorage.removeItem(k)}catch(e){}}};
const users=()=>st.get('lendit_users',{}),saveUsers=u=>st.set('lendit_users',u);
const rnd=()=>{try{return[...crypto.getRandomValues(new Uint8Array(12))].map(x=>x.toString(16).padStart(2,'0')).join('')}catch(e){return String(Date.now())+Math.random().toString(16).slice(2)}};
async function hash(salt,pw){try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(salt+':'+pw));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}catch(e){return btoa(salt+pw)}}
const valid=e=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const nameOf=e=>{const n=e.split('@')[0].replace(/[._-]+/g,' ');return n.replace(/\b\w/g,c=>c.toUpperCase())};
const initials=n=>n.split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase()||'U';
function findUser(email){const u=users();if(u[email])return email;for(const k in u){const p=u[k].providers||{};if(Object.values(p).includes(email))return k}return null}
function toast(t){const el=$('#toast');if(!el)return;el.textContent=t;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),3600)}
const me=()=>st.get('lendit_session',null)||st.get('lendit_session',null,true);

/* modal + views */
const ov=$('#overlay');
const TITLES={start:'Log in or sign up',login:'Log in',signup:'Sign up',forgot:'Reset password',code:'Reset password',reset:'Reset password',prov:'Choose an account',consent:'Confirm sign in'};
const BACK={login:'start',signup:'start',forgot:'start',code:'forgot',reset:'code',prov:'start',consent:'prov'};
let F={email:'',prov:'',pemail:'',link:false,code:'',codeExp:0,view:'start'};
function msg(view,t,ok){const m=$('#v-'+view+' .msg');if(!m)return;m.textContent=t||'';m.className='msg'+(ok?' ok':'')}
function go(v){
  $$('.view').forEach(x=>x.classList.toggle('on',x.id==='v-'+v));
  $('#mtitle').textContent=TITLES[v];$('#back').style.visibility=v==='start'||(v==='prov'&&F.link)?'hidden':'visible';
  F.view=v;$$('.msg').forEach(m=>{m.textContent=''});$$('input.bad').forEach(i=>i.classList.remove('bad'));
  $$('.who').forEach(w=>w.textContent=F.email);
  const f=$('#v-'+v+' input:not([type=checkbox])');setTimeout(()=>f&&f.focus(),40);
}
const SLIDE_MS=420;     // how long the login card takes to slide down (matches login.css)
const SUCCESS_MS=1600;  // how long "Logged in successfully" stays up before the main site opens
let closing=false;
function showOverlay(){ov.classList.remove('closing');ov.classList.add('open');document.body.classList.add('modal-open')}
function openModal(view){showOverlay();go(view||'start')}
/* slides the card down; runs cb (if given) once it is gone */
function closeModal(cb){
  const done=typeof cb==='function'?cb:null;
  if(closing){if(done)setTimeout(done,SLIDE_MS);return}
  if(!ov.classList.contains('open')){if(done)done();return}
  closing=true;ov.classList.add('closing');document.body.classList.remove('modal-open');
  setTimeout(()=>{ov.classList.remove('open','closing');closing=false;if(done)done()},SLIDE_MS);
}
/* check + "Logged in successfully" popup, then on to the main website */
function showSuccess(sub){
  const s=$('#success');
  if(!s){location.href=HOME_URL;return}
  $('#successSub').textContent=sub||'';
  s.classList.remove('out');s.classList.add('show');s.setAttribute('aria-hidden','false');
  setTimeout(()=>s.classList.add('out'),SUCCESS_MS-300);
  setTimeout(()=>{location.href=HOME_URL},SUCCESS_MS);
}
/* coming back with the browser's Back button: don't leave the popup showing */
addEventListener('pageshow',e=>{if(e.persisted){const s=$('#success');if(s)s.classList.remove('show','out')}});

/* GET STARTED: attached first so nothing below can stop it */
const startBtn=$('#start');
if(startBtn){
  startBtn.addEventListener('click',()=>{
    F.link=false;
    const s=me();
    if(s&&users()[s])location.href=HOME_URL;
    else openModal('start');
  });
}else{
  console.error('[login] #start button not found in the page');
}

/* icons + logo */
safe('icons',()=>{
  const logo=$('.logo'),cLogo=$('#cLogo');
  if(logo&&cLogo)cLogo.src=logo.src;
  $$('[data-icon]').forEach(e=>e.innerHTML=ic(e.dataset.icon));
});
safe('password eyes',()=>{
  $$('.eye').forEach(b=>{b.innerHTML=EYE;b.onclick=()=>{const i=b.previousElementSibling,show=i.type==='password';i.type=show?'text':'password';b.querySelector('.sl').style.display=show?'none':'';b.setAttribute('aria-label',show?'Hide password':'Show password')}});
});

/* background video: always plays (muted + looping). If the browser blocks autoplay
   (battery saver, low-power mode...), it starts on the visitor's first tap, click or key press. */
safe('background video',()=>{
  const v=$('#bgVideo');if(!v)return;
  v.muted=true;v.defaultMuted=true;v.loop=true;
  v.setAttribute('muted','');v.setAttribute('playsinline','');
  const play=()=>{const p=v.play();if(p&&p.catch)p.catch(()=>{})};
  play();
  v.addEventListener('loadeddata',play);
  setTimeout(()=>{if(v.paused)play()},1200);   // one more try if it hadn't started yet
  ['pointerdown','touchstart','keydown','click'].forEach(ev=>addEventListener(ev,()=>{if(v.paused)play()},{passive:true}));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)play()});
});

/* modal controls */
safe('modal controls',()=>{
  $('#close').onclick=closeModal;
  $('#back').onclick=()=>go(BACK[F.view]||'start');
  ov.addEventListener('mousedown',e=>{if(e.target===ov)closeModal()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
  $$('[data-go]').forEach(b=>b.onclick=()=>{const g=b.dataset.go,e=$('#email').value.trim();
    if(g==='forgot')$('#femail').value=e;if(g==='signup'){$('#semail').value=e;$('#sname').value='';$('#spass').value=''}
    go(g)});
});

/* password strength */
safe('password meter',()=>{
  function score(p){let s=0;if(p.length>=8)s++;if(p.length>=12)s++;if(/[a-z]/.test(p)&&/[A-Z]/.test(p)&&/\d/.test(p))s++;if(/[^A-Za-z0-9]/.test(p))s++;return p?Math.max(1,s):0}
  $$('input[data-meter]').forEach(i=>i.addEventListener('input',()=>{const s=score(i.value),b=$('#'+i.dataset.meter),l=$('#'+i.dataset.meter+'l');
  b.style.width=s*25+'%';b.style.background=['#ff6b6b','#ff6b6b','#ffb347','#9be35c','#4cdf8b'][s];
  l.textContent=i.value?['','Weak','Fair','Good','Strong'][s]+' password':'Use 8+ characters with letters, numbers and symbols.'}));
});

/* session */
function signIn(email,remember,note){
  const u=users()[email];st.del('lendit_session');st.set('lendit_session',email,!remember);
  seedProfile(email,u);
  closeModal(()=>showSuccess(note||('Welcome, '+u.name.split(' ')[0]+'!')));   // card slides down, then the success popup
}
/* the Profile page shows this account's name and email (reset when a different account logs in) */
function seedProfile(email,u){
  if(st.get('lendit_profile_owner',null)===email)return;
  const slug=u.name.toLowerCase().replace(/[^a-z0-9]+/g,'.').replace(/^\.|\.$/g,'').slice(0,18)||'user';
  st.set('lendit_profile',{username:'@'+(slug.length<3?slug+'.user':slug),name:u.name,email:email});
  st.del('lendit_avatar');st.set('lendit_profile_owner',email);
}

/* lockout */
const lock={get:e=>st.get('lendit_lock',{})[e]||{n:0,until:0},
set(e,v){const l=st.get('lendit_lock',{});l[e]=v;st.set('lendit_lock',l)}};

/* forms */
async function submit(name){
  const q=s=>$('#v-'+name+' '+s);
  const btn=q('button.go');
  if(name==='start'){
    const e=$('#email').value.trim().toLowerCase(),pw=$('#pass').value;
    if(!valid(e)){$('#email').classList.add('bad');return msg('start','Enter a valid email address, like name@example.com.')}
    if(!pw){$('#pass').classList.add('bad');return msg('start','Enter your password.')}
    const k=findUser(e);
    if(!k)return msg('start','No account found for that email. Tap “Create an account” below.');
    const u=users()[k],l=lock.get(k),now=Date.now();
    if(l.until>now)return msg('start','Too many attempts. Try again in '+Math.ceil((l.until-now)/1000)+' seconds, or reset your password.');
    if(!u.hash)return msg('start','This account signs in with '+Object.keys(u.providers||{}).map(p=>p[0].toUpperCase()+p.slice(1)).join(' / ')+'. Use that button, or choose “Forgot password?” to set a password.');
    btn.disabled=true;const h=await hash(u.salt,pw);btn.disabled=false;
    if(h!==u.hash){const n=l.n+1;lock.set(k,n>=5?{n:0,until:now+30000}:{n,until:0});$('#pass').classList.add('bad');
      return msg('start',n>=5?'Too many attempts. Locked for 30 seconds.':'Incorrect password. '+(5-n)+' attempt'+(5-n===1?'':'s')+' left.')}
    lock.set(k,{n:0,until:0});F.email=k;signIn(k,true);
  }
  if(name==='signup'){
    const e=$('#semail').value.trim().toLowerCase(),n=$('#sname').value.trim(),pw=$('#spass').value;
    if(!valid(e)){$('#semail').classList.add('bad');return msg('signup','Enter a valid email address.')}
    if(findUser(e))return msg('signup','That email already has an account. Go back and log in.');
    F.email=e;
    if(n.length<2){$('#sname').classList.add('bad');return msg('signup','Enter your full name.')}
    if(pw.length<8){$('#spass').classList.add('bad');return msg('signup','Password needs at least 8 characters.')}
    if(!$('#terms').checked)return msg('signup','Please agree to the Terms and Privacy Policy to continue.');
    btn.disabled=true;const salt=rnd(),h=await hash(salt,pw);btn.disabled=false;
    const u=users();u[F.email]={name:n,salt,hash:h,providers:{},created:Date.now()};saveUsers(u);signIn(F.email,true);
  }
  if(name==='forgot'){
    const e=$('#femail').value.trim().toLowerCase();
    if(!valid(e)){$('#femail').classList.add('bad');return msg('forgot','Enter a valid email address.')}
    F.email=findUser(e)||e;sendCode();go('code');
  }
  if(name==='code'){
    const c=$('#code').value.trim();
    if(!/^\d{6}$/.test(c))return msg('code','Enter the 6-digit code.');
    if(Date.now()>F.codeExp)return msg('code','That code has expired. Send a new one.');
    if(c!==F.code||!users()[F.email]){return msg('code','That code isn’t right. Check it and try again.')}
    $('#rpass').value='';go('reset');
  }
  if(name==='reset'){
    const pw=$('#rpass').value;
    if(pw.length<8){$('#rpass').classList.add('bad');return msg('reset','Password needs at least 8 characters.')}
    btn.disabled=true;const salt=rnd(),h=await hash(salt,pw);btn.disabled=false;
    const u=users();u[F.email].salt=salt;u[F.email].hash=h;saveUsers(u);lock.set(F.email,{n:0,until:0});
    signIn(F.email,true,'Password updated.');
  }
  if(name==='prov'){
    const e=$('#pemail').value.trim().toLowerCase();
    if(!valid(e)){$('#pemail').classList.add('bad');return msg('prov','Enter a valid email address.')}
    pickAccount(e);
  }
}
safe('forms',()=>{
  $$('form[data-f]').forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();submit(f.dataset.f)}));
});

function sendCode(){
  F.code=String(Math.floor(100000+Math.random()*900000));F.codeExp=Date.now()+5*60000;
  $('#codeSub').textContent='If an account exists for '+F.email+', we’ve sent a 6-digit code. It expires in 5 minutes.';
  $('#code').value='';
  if(users()[F.email])toast('Demo: no email can be sent from here. Your code is '+F.code);
}
safe('resend',()=>{$('#resend').onclick=()=>{sendCode();msg('code','A new code was sent.',true)}});

/* social providers */
const provAccts=()=>st.get('lendit_provaccts',{});
function openProv(p,link){
  F.prov=p;F.link=!!link;
  if(p==='Google'&&CONFIG.googleClientId)return realGoogle();
  $('#provH').textContent=link?'Connect '+p:'Continue with '+p;
  $('#provSub').textContent=link?'Choose the '+p+' account to link to LendIT.':'Choose the '+p+' account you want to use.';
  $('#pLbl').textContent=(provAccts()[p]||[]).length?'Use another account':'Email address';
  const box=$('#acctList');box.textContent='';
  (provAccts()[p]||[]).forEach(em=>{const b=document.createElement('button');b.type='button';b.className='acct';
    const av=document.createElement('div');av.className='av';av.textContent=initials(nameOf(em));
    const t=document.createElement('div');const n=document.createElement('strong');n.textContent=nameOf(em);const s=document.createElement('small');s.textContent=em;t.append(n,s);
    b.append(av,t);b.onclick=()=>pickAccount(em);box.appendChild(b)});
  $('#pemail').value='';showOverlay();go('prov');
}
function pickAccount(em){
  F.pemail=em;$('#cIcon').innerHTML=ic(F.prov);
  $('#cH').textContent='Sign in with '+F.prov;
  $('#cSub').textContent='LendIT would like to access the '+F.prov+' account '+em+'.';
  $('#allow').textContent='ALLOW';$('#allow').disabled=false;go('consent');
}
function finishProv(p,em,nm){
  const pa=provAccts();pa[p]=[...new Set([...(pa[p]||[]),em])];st.set('lendit_provaccts',pa);
  const key=p.toLowerCase(),u=users();
  let k=findUser(em);
  if(!k){u[em]={name:nm,salt:'',hash:null,providers:{},created:Date.now()};k=em}
  u[k].providers=u[k].providers||{};u[k].providers[key]=em;saveUsers(u);signIn(k,true);
}
safe('social buttons',()=>{
  $('#allow').onclick=()=>{const b=$('#allow');b.disabled=true;b.innerHTML='<span class="spin"></span>Connecting…';setTimeout(()=>finishProv(F.prov,F.pemail,nameOf(F.pemail)),700)};
  $('#deny').onclick=()=>go('prov');
  $$('.soc button').forEach(b=>b.onclick=()=>openProv(b.dataset.p,false));
});
function realGoogle(){ // works when hosted on your own domain with a Google OAuth client ID
  const run=()=>{google.accounts.id.initialize({client_id:CONFIG.googleClientId,callback:r=>{try{const j=JSON.parse(atob(r.credential.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));finishProv('Google',j.email.toLowerCase(),j.name||nameOf(j.email))}catch(e){toast('Google sign-in failed')}}});google.accounts.id.prompt()};
  if(window.google&&google.accounts)return run();
  const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.onload=run;s.onerror=()=>{CONFIG.googleClientId='';openProv('Google',F.link)};document.head.appendChild(s);
}

})();