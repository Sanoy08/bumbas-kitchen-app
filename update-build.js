// update-build.js
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');
const readline = require('readline');
require('dotenv').config(); // jodi .env thake
const { MongoClient } = require('mongodb');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const gradlePath = path.join(__dirname, 'android/app/build.gradle');
const sourceApk = path.join(__dirname, 'android/app/build/outputs/apk/release/app-release.apk');
// Nicher path-ta apnar jekhane APK save korte chan sekhane point korben
const destApk = path.join(__dirname, 'release/bumbas-kitchen.apk'); 

const startProcess = async () => {
    try {
        rl.question('📝 Enter Commit Message: ', (commitMsg) => {
            if (!commitMsg.trim()) {
                console.error("❌ Commit message is required!");
                process.exit(1);
            }
            rl.close();
            runBuildProcess(commitMsg);
        });
    } catch (error) {
        console.error("\n❌ Error:", error.message);
        process.exit(1);
    }
};

const runBuildProcess = async (commitMsg) => {
    try {
        console.log("\n🚀 Starting Fast Auto-Build & Push Process...");

        // ১. Output folder na thakle toiri kora
        const destDir = path.dirname(destApk);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        // ২. পুরনো APK ডিলিট করা
        if (fs.existsSync(destApk)) {
            console.log("🗑️  Removing old APK...");
            fs.unlinkSync(destApk);
        }

        // ৩. Gradle ফাইল আপডেট (ভার্সন বের করা)
        let gradleContent = fs.readFileSync(gradlePath, 'utf8');
        const codeMatch = gradleContent.match(/versionCode (\d+)/);
        const nameMatch = gradleContent.match(/versionName "([^"]+)"/);

        if (!codeMatch || !nameMatch) throw new Error("Could not find version info in build.gradle");

        const currentCode = parseInt(codeMatch[1]);
        const currentName = nameMatch[1];
        const newCode = currentCode + 1;
        
        // ভার্সন নেম লজিক (1.0.0 -> 1.0.1)
        const nameParts = currentName.split('.').map(Number);
        if(nameParts.length === 2) nameParts.push(0);
        nameParts[nameParts.length - 1] += 1;
        const newName = nameParts.join('.');

        console.log(`📦 Bumping Version: ${currentName} -> ${newName} (Code: ${newCode})`);

        gradleContent = gradleContent.replace(/versionCode \d+/, `versionCode ${newCode}`);
        gradleContent = gradleContent.replace(/versionName "[^"]+"/, `versionName "${newName}"`);
        fs.writeFileSync(gradlePath, gradleContent);

        // ৪. ★ MongoDB তে ভার্সন আপডেট করা ★
        console.log("\n💾 Updating version in MongoDB...");
        await updateVersionInDB(newName);

        // ৫. APK বিল্ড করা (Without Clean - for fast build)
        console.log("\n🔨 Building APK natively (Please wait...)...");
        const isWindows = process.platform === "win32";
        // Shudhu assembleRelease, kono clean nei
        const buildCmd = isWindows ? 'cd android && gradlew.bat assembleRelease' : 'cd android && ./gradlew assembleRelease';
        execSync(buildCmd, { stdio: 'inherit' });

        // ৬. APK ফাইল মুভ করা
        if (fs.existsSync(sourceApk)) {
            fs.copyFileSync(sourceApk, destApk);
            console.log(`✅ New APK copied to ${destApk}`);
        } else {
            throw new Error("APK generation failed!");
        }

        // ৭. গিট কমিট এবং পুশ
        console.log("\n☁️  Pushing to GitHub...");
        execSync('git add .', { stdio: 'inherit' });
        execSync(`git commit -m "${commitMsg} (v${newName})"`, { stdio: 'inherit' });
        execSync('git push', { stdio: 'inherit' });

        console.log("\n🎉 SUCCESS! React Native App updated, DB synced & Pushed to GitHub!");
        process.exit(0);

    } catch (error) {
        console.error("\n❌ Process Failed:", error.message);
        process.exit(1);
    }
};

async function updateVersionInDB(newVersion) {
    let client;
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error("MONGODB_URI is missing in .env");

        client = new MongoClient(uri);
        await client.connect();
        
        const db = client.db('BumbasKitchenDB'); 
        const settingsCollection = db.collection('settings');

        const result = await settingsCollection.updateOne(
            { type: "general" }, 
            { $set: { androidVersion: newVersion } }
        );

        if (result.matchedCount === 0) {
            console.warn("⚠️ Warning: No settings document found with type: 'general'.");
        } else {
            console.log(`✅ MongoDB Updated: androidVersion set to ${newVersion}`);
        }

    } catch (error) {
        console.error("❌ DB Update Failed:", error.message);
    } finally {
        if (client) await client.close();
    }
}

startProcess();