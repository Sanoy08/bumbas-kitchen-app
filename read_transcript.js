const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('C:\\Users\\gamin\\.gemini\\antigravity-ide\\brain\\d0863dd0-642d-415e-9f45-6cdff4ab37f2\\.system_generated\\logs\\transcript.jsonl');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const actions = [];
  let userReqCount = 0;

  for await (const line of rl) {
    try {
      const parsed = JSON.parse(line);
      // Check if it's from today (2026-10-02)
      if (parsed.created_at && parsed.created_at.startsWith('2026-10-02')) {
        if (parsed.type === 'USER_INPUT' && parsed.content) {
          const match = parsed.content.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
          if (match) {
            userReqCount++;
            actions.push(`USER: ${match[1].trim()}`);
          }
        } else if (parsed.type === 'PLANNER_RESPONSE' && parsed.tool_calls) {
          parsed.tool_calls.forEach(tc => {
            if (tc.name === 'replace_file_content' || tc.name === 'multi_replace_file_content' || tc.name === 'write_to_file') {
              let file = tc.args.TargetFile || tc.args.AbsolutePath || 'unknown file';
              actions.push(`TOOL (${tc.name}): Modified ${file}`);
            }
          });
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  console.log(`Found ${userReqCount} user requests today.`);
  console.log("Actions from today:\n");
  actions.forEach(a => console.log(a));
}

processLineByLine();
