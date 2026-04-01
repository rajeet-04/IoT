# Debug Session: mongo-auth-failed

## Symptoms
**Expected behavior:** Server starts successfully, connects to MongoDB.
**Actual behavior:** Server fails to start due to authentication failure.
**Error messages:**
```
Failed to start server: MongoServerError: bad auth : authentication failed
  errorResponse: {
    ok: 0,
    errmsg: 'bad auth : authentication failed',
    code: 8000,
    codeName: 'AtlasError'
  }
```
**Reproduction:** Run `node .\src\index.js` in terminal.
**Timeline:** Started after deployment/configuration step.

## Investigation Evidence
(Subagent will fill this section)
