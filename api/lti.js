const originFromRequest=req=>{const proto=req.headers['x-forwarded-proto']||'https';const host=req.headers['x-forwarded-host']||req.headers.host;return `${proto}://${host}`};

export default function handler(req,res){
  res.setHeader('Cache-Control','public, max-age=300');
  if(req.method!=='GET')return res.status(405).json({error:'method_not_allowed'});
  const origin=process.env.PUBLIC_APP_URL||originFromRequest(req);
  return res.status(200).json({
    title:'SimuMath Pro',
    description:'Interactive mathematics laboratories with server-side auto-grading foundations.',
    oidc_initiation_url:`${origin}/api/lti/login`,
    target_link_uri:`${origin}/api/lti/launch`,
    jwks_url:`${origin}/api/lti/jwks`,
    redirect_uris:[`${origin}/api/lti/launch`],
    scopes:[
      'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem',
      'https://purl.imsglobal.org/spec/lti-ags/scope/score',
    ],
    status:'foundation',
  });
}
