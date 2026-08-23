import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/lti.js';

function response(){return{statusCode:200,headers:{},body:null,setHeader(key,value){this.headers[key]=value},status(code){this.statusCode=code;return this},json(value){this.body=value;return this}}}

test('LTI descriptor uses the forwarded canonical origin', () => {
  const res=response();
  handler({method:'GET',headers:{'x-forwarded-proto':'https','x-forwarded-host':'labs.example.edu'}},res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.target_link_uri,'https://labs.example.edu/api/lti/launch');
  assert.ok(res.body.scopes.some(scope=>scope.endsWith('/score')));
});

test('LTI descriptor rejects non-GET requests', () => {
  const res=response();handler({method:'POST',headers:{host:'localhost'}},res);
  assert.equal(res.statusCode,405);
});
