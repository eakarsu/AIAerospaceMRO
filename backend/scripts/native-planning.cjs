'use strict';
const targets = [
  { table:'customers',key:'customer_code',name:'company_name',values:{status:'Prospect',customer_type:'Private'} },
  { table:'hangar_management',key:'hangar_code',name:'hangar_name',values:{status:'Draft',location:'Fictional training location; not an operational facility',capacity:0,current_occupancy:0} },
  { table:'shift_scheduling',key:'shift_code',name:'task_description',values:{status:'Draft',technician_name:null,employee_id:null,aircraft_reg:null} },
  { table:'training_records',key:'record_number',name:'course_name',values:{status:'Draft',pass_fail:'Pending',score:null,certificate_number:null,completion_date:null} },
  { table:'warranty_tracking',key:'warranty_number',name:'part_name',values:{status:'Draft',claim_status:'No Claim',claim_amount:0,claim_date:null,purchase_date:null,warranty_start:null,expiry_date:null} },
];
async function seedNativePlanning({pool,actorId,env}) {
  if(env.NODE_ENV==='production'||env.ENABLE_DEMO_CREDENTIAL_AUTOFILL==='false')return {enabled:false,added:{}};
  if(!Number.isInteger(Number(actorId))||Number(actorId)<=0)throw Error('A genuine native Demo actor is required for planning drafts.');
  const client=await pool.connect(),added={};
  try{
    await client.query('BEGIN');await client.query("SELECT pg_advisory_xact_lock(hashtext('aerospace-native-planning-drafts'))");
    const actor=await client.query('SELECT id FROM users WHERE id=$1',[Number(actorId)]);if(!actor.rows.length)throw Error('The native Demo actor is unavailable.');
    for(const config of targets){const {rows}=await client.query(`SELECT count(*)::int AS total FROM ${config.table}`);let needed=Math.max(0,15-rows[0].total),index=1;added[config.table]=0;
      while(needed>0){const key=`DEMO-DRAFT-${index++}`;const prior=await client.query(`SELECT id FROM ${config.table} WHERE ${config.key}=$1`,[key]);if(prior.rows.length)continue;
        const record={ [config.key]:key,[config.name]:`Fictional planning draft ${index-1} · no action completed`,...config.values,notes:`Local Demo planning draft owned by native actor ${Number(actorId)}. Fictional training data only: no contract, operational facility, scheduled work, training result, certification, warranty coverage, claim, approval, payment, or delivery has occurred.` };
        const keys=Object.keys(record);await client.query(`INSERT INTO ${config.table}(${keys.join(',')}) VALUES (${keys.map((_,i)=>'$'+(i+1)).join(',')})`,Object.values(record));needed--;added[config.table]++;
      }
    }
    await client.query('COMMIT');return {enabled:true,actorId:Number(actorId),added};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
module.exports={seedNativePlanning,targets};
