// check-emails.cjs
const { Resend } = require('resend');

const RESEND_API_KEY = "re_Z43aYrco_KoiY6AaZVfWNpC3BhwruWp62";

const resend = new Resend(RESEND_API_KEY);

async function checkEmailLogs() {
  console.log("📧 Fetching email logs...\n");
  
  try {
    const { data, error } = await resend.logs.list({ limit: 20 });
    
    if (error) {
      console.error("Error fetching logs:", error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log(`Found ${data.length} email logs:\n`);
      data.forEach((log) => {
        console.log(`- ID: ${log.id}`);
        console.log(`  Status: ${log.status}`);
        console.log(`  To: ${log.to}`);
        console.log(`  Subject: ${log.subject}`);
        console.log(`  Created: ${log.created_at}`);
        console.log(`  Error: ${log.error || "None"}`);
        console.log("---");
      });
    } else {
      console.log("No logs found.");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

checkEmailLogs();