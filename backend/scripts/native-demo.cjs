'use strict';
const path=require('node:path');
const {Pool}=require('pg'),bcrypt=require('bcryptjs');
async function provision({pool,env}) {
  if(env.NODE_ENV==='production'||env.ENABLE_DEMO_CREDENTIAL_AUTOFILL==='false')return {enabled:false,inserted:0};
  const aliases=['DEMO','PROVISION_ADMIN','BOOTSTRAP_ADMIN','SEED_ADMIN','ADMIN'];const alias=aliases.find(key=>env[`${key}_EMAIL`]&&env[`${key}_PASSWORD`]);
  if(!alias)throw Error('Configure a native Demo email and password in the project environment.');
  const email=env[`${alias}_EMAIL`].trim().toLowerCase(),password=env[`${alias}_PASSWORD`];
  if(password.length<8)throw Error('The configured native Demo password must contain at least 8 characters.');
  const client=await pool.connect();
  try{
    await client.query('BEGIN');await client.query("SELECT pg_advisory_xact_lock(hashtext('aerospace-native-demo-account'))");
    const before=await client.query('SELECT id,password FROM users WHERE lower(email)=$1',[email]);
    if(before.rows.length){if(!await bcrypt.compare(password,before.rows[0].password))throw Error('The existing native Demo account has a different password. Existing credentials were preserved.');await client.query('COMMIT');return {enabled:true,inserted:0,actorId:before.rows[0].id};}
    const hash=await bcrypt.hash(password,12);
    const result=await client.query("INSERT INTO users(name,email,password) VALUES('Local Demo technician',$1,$2) ON CONFLICT(email) DO NOTHING RETURNING id",[email,hash]);
    await client.query('COMMIT');return {enabled:true,inserted:result.rowCount,actorId:result.rows[0]?.id};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
module.exports={provision};
if(require.main===module){const fileEnv=require('dotenv').parse(require('node:fs').readFileSync(path.join(__dirname,'../../.env')));const env={...fileEnv,NODE_ENV:process.env.NODE_ENV||fileEnv.NODE_ENV},pool=new Pool({connectionString:env.DATABASE_URL,ssl:env.DB_SSL==='true'?{rejectUnauthorized:true}:false});provision({pool,env}).then(async result=>{const planning=result.enabled?await require('./native-planning.cjs').seedNativePlanning({pool,actorId:result.actorId,env}):{added:{}};console.log(`Native Demo ready: ${result.inserted} new account; existing credentials and roles preserved. Planning drafts added: ${Object.values(planning.added).reduce((sum,n)=>sum+n,0)}.`);}).catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>pool.end());}
