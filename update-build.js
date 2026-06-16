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
const sourceApk = path.join(__dirname, 'android/app/build/outputs/apk/release/app-release.apk');
const appJsonPath = path.join(__dirname, 'app.json'); // ★ app.json এর পাথ
const packageJsonPath = path.join(__dirname, 'package.json'); // ★ package.json এর পাথ

// ★ apnar backend (site) folder er path
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

        // ১. Gradle ফাইল আপডেট (ভার্সন বের করা)
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

        // ★ ২. app.json এবং package.json আপডেট করা ★
        if (fs.existsSync(appJsonPath)) {
            let appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
            appJson.expo.version = newName; // app.json এ নতুন ভার্সন বসাচ্ছে
            fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
            console.log(`📄 Updated app.json version to ${newName}`);
        }

        if (fs.existsSync(packageJsonPath)) {
            let packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            packageJson.version = newName; // package.json এ নতুন ভার্সন বসাচ্ছে
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
            console.log(`📦 Updated package.json version to ${newName}`);
        }

        // ৩. ডাইনামিক ফাইল নেম তৈরি করা (Caching এড়াতে)
        const apkFileName = `bumbas-kitchen-v${newName}.apk`;
        const destApk = path.join(backendRepoPath, `public/${apkFileName}`); 
        const publicDir = path.join(backendRepoPath, 'public');

        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }

        // ৪. পুরনো সব APK ফাইল public ফোল্ডার থেকে ডিলিট করে দেওয়া
        console.log("🗑️  Removing old APKs from backend public folder...");
        fs.readdirSync(publicDir).forEach(file => {
            if (file.startsWith('bumbas-kitchen') && file.endsWith('.apk')) {
                fs.unlinkSync(path.join(publicDir, file));
            }
        });

        // ৫. ★ MongoDB তে ভার্সন এবং নতুন URL আপডেট করা ★
        console.log("\n💾 Updating version & URL in MongoDB...");
        await updateVersionInDB(newName, `/${apkFileName}`);

        // ৬. APK বিল্ড করা 
        console.log("\n🔨 Building APK natively (Please wait...)...");
        const isWindows = process.platform === "win32";
        const buildCmd = isWindows ? 'cd android && gradlew.bat assembleRelease' : 'cd android && ./gradlew assembleRelease';
        execSync(buildCmd, { stdio: 'inherit' });

        // ৭. APK ফাইল Backend এ মুভ করা
        if (fs.existsSync(sourceApk)) {
            fs.copyFileSync(sourceApk, destApk);
            console.log(`✅ New APK copied to: ${destApk}`);
        } else {
            throw new Error("APK generation failed!");
        }

        // ৮. App প্রজেক্ট গিটহাবে পুশ করা
        console.log("\n☁️  Pushing App to GitHub...");
        execSync('git add .', { stdio: 'inherit' });
        execSync(`git commit -m "${commitMsg} (v${newName})"`, { stdio: 'inherit' });
        execSync('git push', { stdio: 'inherit' });

        // ৯. ★ Backend (site) প্রজেক্ট গিটহাবে পুশ করা ★
        console.log("\n🚀 Pushing Backend (site) to GitHub to deploy new APK...");
        const cdCommand = isWindows ? `cd /d "${backendRepoPath}"` : `cd "${backendRepoPath}"`;
        
        // নতুন ফাইল অ্যাড করা এবং ডিলিট হওয়া পুরনো ফাইল গিট থেকে সরানো
        execSync(`${cdCommand} && git add public/${apkFileName}`, { stdio: 'inherit' });
        execSync(`${cdCommand} && git add -u public/`, { stdio: 'inherit' }); 
        
        execSync(`${cdCommand} && git commit -m "Auto-update APK to v${newName}"`, { stdio: 'inherit' });
        execSync(`${cdCommand} && git push`, { stdio: 'inherit' });

        console.log("\n🎉 SUCCESS! App Updated, DB Synced, and New APK pushed to Backend Vercel/Hostinger!");
        process.exit(0);

    } catch (error) {
        console.error("\n❌ Process Failed:", error.message);
        process.exit(1);
    }
};

async function updateVersionInDB(newVersion, newApkUrl) {
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
            { $set: { 
                androidVersion: newVersion,
                apkUrl: newApkUrl // ★ URL টাও ডাটাবেসে আপডেট হয়ে যাবে
            } }
        );

        console.log(`✅ MongoDB Updated: androidVersion = ${newVersion}, apkUrl = ${newApkUrl}`);

    } catch (error) {
        console.error("❌ DB Update Failed:", error.message);
    } finally {
        if (client) await client.close();
    }
}

startProcess();