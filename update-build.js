// update-build.js
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');
const readline = require('readline');
require('dotenv').config(); 
const { MongoClient } = require('mongodb');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const gradlePath = path.join(__dirname, 'android/app/build.gradle');
const sourceAab = path.join(__dirname, 'android/app/build/outputs/bundle/release/app-release.aab');
const appJsonPath = path.join(__dirname, 'app.json');
const packageJsonPath = path.join(__dirname, 'package.json');

const backendRepoPath = path.join(__dirname, '../site');

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
        console.log("\n🚀 Starting Fast Auto-Build & Dual-Push Process...");

        // ১. Gradle ফাইল থেকে ভার্সন বের করা
        let gradleContent = fs.readFileSync(gradlePath, 'utf8');
        const codeMatch = gradleContent.match(/versionCode (\d+)/);
        const nameMatch = gradleContent.match(/versionName "([^"]+)"/);

        if (!codeMatch || !nameMatch) throw new Error("Could not find version info in build.gradle");

        const currentCode = parseInt(codeMatch[1]);
        const currentName = nameMatch[1];
        const newCode = currentCode + 1;
        
        const nameParts = currentName.split('.').map(Number);
        if(nameParts.length === 2) nameParts.push(0);
        nameParts[nameParts.length - 1] += 1;
        const newName = nameParts.join('.');

        console.log(`📦 Bumping Version: ${currentName} -> ${newName} (Code: ${newCode})`);

        // ★★★ FIX: এই ৩টে লাইন আমি আগেরবার দিতে ভুলে গেছিলাম! (Gradle ফাইল সেভ করা) ★★★
        gradleContent = gradleContent.replace(/versionCode \d+/, `versionCode ${newCode}`);
        gradleContent = gradleContent.replace(/versionName "[^"]+"/, `versionName "${newName}"`);
        fs.writeFileSync(gradlePath, gradleContent);



        // ২. app.json এবং package.json আপডেট করা
        if (fs.existsSync(appJsonPath)) {
            let appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
            appJson.expo.version = newName;
            fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
            console.log(`📄 Updated app.json version to ${newName}`);
        }

        if (fs.existsSync(packageJsonPath)) {
            let packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            packageJson.version = newName;
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
            console.log(`📦 Updated package.json version to ${newName}`);
        }

        // ৩. AAB বিল্ড করা (Play Store এর জন্য)
        console.log("\n🔨 Building AAB natively (Please wait...)...");
        const isWindows = process.platform === "win32";
        const buildCmd = isWindows ? 'cd android && gradlew.bat bundleRelease' : 'cd android && ./gradlew bundleRelease';
        execSync(buildCmd, { stdio: 'inherit' });

        // ৪. AAB ফাইলটা রুট ডিরেক্টরিতে মুভ করা (যাতে সহজে পাওয়া যায়)
        const aabFileName = `bumbas-kitchen-v${newName}.aab`;
        const destAab = path.join(__dirname, aabFileName);
        if (fs.existsSync(sourceAab)) {
            fs.copyFileSync(sourceAab, destAab);
            console.log(`✅ New signed AAB generated successfully at: ${destAab}`);
        } else {
            throw new Error("AAB generation failed!");
        }

        // ৫. App প্রজেক্ট গিটহাবে পুশ করা
        console.log("\n☁️  Pushing App to GitHub...");
        execSync('git add .', { stdio: 'inherit' });
        execSync(`git commit -m "${commitMsg} (v${newName})"`, { stdio: 'inherit' });
        execSync('git push', { stdio: 'inherit' });

        console.log("\n🎉 SUCCESS! Version Updated, Signed AAB Generated, and Code Pushed to GitHub!");
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

        await settingsCollection.updateOne(
            { type: "general" }, 
            { $set: { androidVersion: newVersion } }
        );

        console.log(`✅ MongoDB Updated: androidVersion = ${newVersion}`);

    } catch (error) {
        console.error("❌ DB Update Failed:", error.message);
    } finally {
        if (client) await client.close();
    }
}

startProcess();