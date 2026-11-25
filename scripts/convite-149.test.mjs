import test from 'node:test';
import assert from 'node:assert/strict';
import {novoConvite} from '../criar-senha/bf-convite-149.mjs';
const hash='a'.repeat(56), valid='#token_hash='+hash+'&type=invite';
const opts=(fragment,auth={},search='')=>{
 const trace=[];
 const flow=novoConvite({fragment,search,url:'https://invalid.test',key:'fictitious',clearURL:()=>trace.push('scrub'),createClient:(url,key,options)=>{
  trace.push(options.auth);return {auth};
 }});
 return {flow,trace};
};
test('old app session alone, legacy URL tokens and ambiguous invite fail closed',async()=>{
 for(const [fragment,search] of [['',''],['#access_token=old&type=invite',''],[valid+'&type=invite',''],[valid,'?token_hash='+hash],[valid.replace('invite','recovery'),'']]){
  const {flow,trace}=opts(fragment,{},search);
  assert.equal(await flow.setPassword('synthetic-pass','synthetic-pass'),'invalid');assert.deepEqual(trace,['scrub']);
 }
});
test('expired provider proof never updates password',async()=>{
 let hit=0;const {flow}=opts(valid,{verifyOtp:async()=>({error:new Error()}),updateUser:async()=>++hit});
 assert.equal(await flow.setPassword('synthetic-pass','synthetic-pass'),'invalid');assert.equal(hit,0);
});
test('verified invite is the sole session; update once then sign out isolated locally',async()=>{
 let active=false;const user={id:'fictional-invited',email_confirmed_at:'fictional-confirmed'};
 const {flow,trace}=opts(valid,{
  verifyOtp:async o=>{assert.deepEqual(o,{token_hash:hash,type:'invite'});active=true;return {data:{user, session:{user}}}},
  updateUser:async ({password})=>{assert.equal(active,true);assert.equal(password,'synthetic-pass');return {data:{user}}},
  signOut:async o=>{assert.deepEqual(o,{scope:'local'});active=false}
 });
 assert.equal(await flow.setPassword('mismatch','synthetic-pass'),'password');
 assert.equal(await flow.setPassword('synthetic-pass','synthetic-pass'),'success');
 assert.equal(await flow.setPassword('synthetic-pass','synthetic-pass'),'invalid');
 assert.equal(active,false);assert.deepEqual(trace,['scrub',{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'blackflow-private-invite-v1'}]);
});
