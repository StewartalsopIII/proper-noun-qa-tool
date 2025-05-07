# Proper Noun QA Tool Troubleshooting Guide

This document captures key issues encountered during development and deployment, their root causes, and solutions.

## Common Error Patterns

### 1. 504 Gateway Timeout

**Symptoms:**
- Browser console shows: `POST https://quality.getcrazywisdom.com/api/identify-nouns 504 (Gateway Timeout)`
- Error message: `Error calling identify-nouns API: Request failed with status code 504`

**Root Cause:**
NGINX proxy timeout too short for LLM processing time.

**Solution:**
Add timeout settings to NGINX config:
```nginx
location / {
    proxy_pass http://127.0.0.1:3004;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Critical timeout settings
    proxy_read_timeout 180s;
    proxy_send_timeout 180s;
    proxy_connect_timeout 180s;
}
```

### 2. 500 Internal Server Error - JSON Parsing

**Symptoms:**
- Browser console shows: `POST https://quality.getcrazywisdom.com/api/identify-nouns 500 (Internal Server Error)`
- Server logs show: `AI response content was not a JSON array`
- Error message: `Failed to process AI response (invalid JSON)`

**Root Causes:**
- Different LLM models return different JSON structures
- Keys in response can vary: `PHASE_1`, `phase_1`, `proper_nouns`, `PHASE_1_AND_2`, etc.
- Format switching between direct array and nested object

**Solutions Implemented:**
1. Added detailed diagnostic logging to debug JSON structure
2. Implemented flexible parsing that handles different key names
3. Now using a generic approach that finds any array with proper noun objects

**Final Code Pattern:**
```typescript
// First try direct array
if (Array.isArray(parsedJson)) {
    corrections = parsedJson;
    console.log(`[identify-nouns] Parsed ${corrections.length} corrections from top-level array.`);
} else {
    // Look for the first property that is an array of objects with original_word
    const candidateKey = Object.keys(parsedJson).find(k => {
        const v = parsedJson[k];
        return Array.isArray(v) &&
               v.length > 0 &&
               typeof v[0] === 'object' &&
               'original_word' in v[0];
    });
    
    if (candidateKey) {
        corrections = parsedJson[candidateKey];
        console.log(`[identify-nouns] Parsed ${corrections.length} corrections from key "${candidateKey}".`);
    } else {
        console.error('AI response JSON did not contain an array of corrections:', parsedJson);
        throw new Error('AI response was not in the expected array format.');
    }
}
```

### 3. Docker Build/Deployment Issues

**Symptoms:**
- `no matching manifest for linux/amd64 in the manifest list entries`
- Docker container failing to start: `address already in use`

**Solutions:**
1. **Architecture Mismatch**: Build with platform flag:
   ```bash
   docker buildx build --platform linux/amd64 -t stewartalsop/proper-qa:latest --push .
   ```

2. **Port Conflict**: Use port 3004 instead of 3000:
   ```bash
   docker run -d --name proper-qa \
     -p 3004:3000 \
     --env-file qa.env \
     -e OPENROUTER_TIMEOUT_MS=120000 \
     stewartalsop/proper-qa:latest
   ```

3. **Container Name Conflict**: Remove existing container first:
   ```bash
   docker stop proper-qa
   docker rm proper-qa
   ```

### 4. Environment Variables Issues

**Symptoms:**
- Incorrect passcode error
- API keys not being recognized

**Solution:**
Be careful with `NEXT_PUBLIC_` prefixed variables in Docker. These need to be:
1. Added at build time for client-side code: `--build-arg NEXT_PUBLIC_PASSCODE=xyz`
2. Added at runtime for server-only code: `--env-file qa.env`

## Diagnostic Tools Added

### Enhanced Logging
Added detailed diagnostic logging to `identify-nouns/route.ts`:

```typescript
// Content type and structure
console.log('[identify-nouns] Response content type:', response.headers?.['content-type']);
console.log('[identify-nouns] First 200 chars of content:', messageContent.substring(0, 200));
console.log('[identify-nouns] Content length:', messageContent.length);

// JSON structure checks
console.log('[diagnostic] rawContent starts with:', rawContent.slice(0, 120));
console.log('[diagnostic] rawContent ends with:', rawContent.slice(-120));
console.log('[diagnostic] brace balance { } =>', openBraces, '/', closeBraces);
console.log('[diagnostic] bracket balance [ ] =>', openBrack, '/', closeBrack);
```

### API Verification
Test the API directly on the server:
```bash
curl -X POST http://localhost:3004/api/identify-nouns \
  -H "Content-Type: application/json" \
  -d '{"transcript":"I visited New York last week and met with Tim Cook from Apple. We discussed Facebook and Google business strategies."}' -v
```

## LLM Model Selection

Switched from `anthropic/claude-3-sonnet-20240229` to `openai/gpt-4o` for:
- Better JSON structure compliance
- Faster response times

Note: All OpenAI models support `response_format: { type: "json_object" }`.

## Future Enhancements

1. **Add unit tests** specifically for the JSON parsing logic
2. **Circuit breaker pattern** to fail gracefully after multiple failed API calls
3. **Response caching** for common transcripts to reduce API calls
4. **Standardize prompt** to request a specific JSON structure (though this is not guaranteed)

## Final Check

When encountering timeout or parsing issues:

1. Check NGINX logs: `sudo tail -f /var/log/nginx/error.log`
2. Check container logs: `docker logs -f proper-qa`
3. Test API directly: `curl -X POST http://localhost:3004/api/identify-nouns -H "Content-Type: application/json" -d '{"transcript":"Test"}'`
4. Verify environment variables: `docker exec proper-qa env | grep OPENROUTER` 