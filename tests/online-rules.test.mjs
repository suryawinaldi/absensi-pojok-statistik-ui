import test from 'node:test';
import assert from 'node:assert/strict';
import {onlineAssignment,fromWib,wibDateTime} from '../admin/src/online-rules.js';
const agents=[{id:'a',name:'A',active:true,division:'Pelayanan dan Konsultasi'},{id:'b',name:'B',active:true,division:'Analisis Data'}];
const row={channel:'OA LINE',weekday:1,valid_from:'2026-10-01',valid_until:null,exception_date:null,starts_at:'09:00:00',ends_at:'17:00:00',agent_id:'a'};
test('weekly online roster uses effective range, eligibility, hours and exception precedence',()=>{
 assert.equal(onlineAssignment([row],agents,'OA LINE','2026-10-26','09:00').agent.id,'a');
 assert.equal(onlineAssignment([row],agents,'OA LINE','2026-11-02','10:00').agent.id,'a');
 for(const [date,time] of [['2026-09-28','10:00'],['2026-10-27','10:00'],['2026-10-26','17:00']]) assert.equal(onlineAssignment([row],agents,'OA LINE',date,time).agent,null);
 assert.equal(onlineAssignment([{...row,agent_id:'b'}],agents,'OA LINE','2026-10-26','10:00').agent,null);
 const cancellation={...row,valid_from:'2026-10-26',valid_until:'2026-10-26',exception_date:'2026-10-26',agent_id:null};
 assert.equal(onlineAssignment([row,cancellation],agents,'OA LINE','2026-10-26','10:00').agent,null);
});
test('first contact conversion is WIB independent of browser timezone',()=>{
 assert.equal(fromWib('2026-10-26T00:30'),'2026-10-25T17:30:00.000Z');
 assert.equal(wibDateTime('2026-10-25T17:30:00Z'),'2026-10-26T00:30');
 assert.throws(()=>fromWib('2026-10-26'));
});
