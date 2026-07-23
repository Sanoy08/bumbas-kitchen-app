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
const appJsonPath = path.join(__dirname, 'app.json');
const packageJsonPath = path.join(__dirname, 'package.json');

// GitHub configuration
const GITHUB_REPO = "Sanoy08/bumbas-kitchen-app";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

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
        console.log("\n🚀 Starting Fast Auto-Build & GitHub Release Process...");

        if (!GITHUB_TOKEN) {
            throw new Error("GITHUB_TOKEN is missing in .env file!");
        }

        // 1. Extract and bump version from Gradle
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

        // Save new version to build.gradle
        gradleContent = gradleContent.replace(/versionCode \d+/, `versionCode ${newCode}`);
        gradleContent = gradleContent.replace(/versionName "[^"]+"/, `versionName "${newName}"`);
        fs.writeFileSync(gradlePath, gradleContent);

        // 2. Update app.json and package.json
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

        const apkFileName = `bumbas-kitchen-v${newName}.apk`;

        // 3. Build APK natively
        console.log("\n🔨 Building APK natively (Please wait...)...");
        const isWindows = process.platform === "win32";
        const buildCmd = isWindows ? 'cd android && gradlew.bat assembleRelease' : 'cd android && ./gradlew assembleRelease';
        execSync(buildCmd, { stdio: 'inherit' });

        if (!fs.existsSync(sourceApk)) {
            throw new Error("APK generation failed! File not found.");
        }
        console.log(`✅ APK successfully built.`);

        // 4. Create GitHub Release
        console.log("\n🌐 Creating GitHub Release...");
        const tagName = `v${newName}`;
        const releaseData = await createGitHubRelease(tagName, commitMsg);
        console.log(`✅ GitHub Release created: ${releaseData.html_url}`);

        // 5. Upload APK to GitHub Release
        console.log("\n⬆️  Uploading APK to GitHub Release (This may take a minute)...");
        const downloadUrl = await uploadApkToRelease(releaseData.upload_url, sourceApk, apkFileName);
        console.log(`✅ APK uploaded successfully! Download URL: ${downloadUrl}`);

        // 6. Update MongoDB with new URL
        console.log("\n💾 Updating version & URL in MongoDB...");
        await updateVersionInDB(newName, downloadUrl);

        // 7. Push App project to GitHub
        console.log("\n☁️  Pushing App code to GitHub...");
        execSync('git add .', { stdio: 'inherit' });
        execSync(`git commit -m "${commitMsg} (${tagName})"`, { stdio: 'inherit' });
        execSync('git push', { stdio: 'inherit' });

        console.log("\n🎉 SUCCESS! App Updated, Built, Uploaded to GitHub Releases, and DB Synced!");
        process.exit(0);

    } catch (error) {
        console.error("\n❌ Process Failed:", error.message);
        process.exit(1);
    }
};

async function createGitHubRelease(tagName, commitMsg) {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases`, {
        method: 'POST',
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'NodeJS'
        },
        body: JSON.stringify({
            tag_name: tagName,
            name: `Release ${tagName}`,
            body: commitMsg,
            draft: false,
            prerelease: false
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to create release: ${response.statusText} - ${errText}`);
    }

    return await response.json();
}

async function uploadApkToRelease(uploadUrlTemplate, apkPath, apkName) {
    // upload_url looks like: https://uploads.github.com/repos/Sanoy08/bumbas-kitchen-app/releases/12345/assets{?name,label}
    const uploadUrl = uploadUrlTemplate.replace('{?name,label}', `?name=${apkName}`);
    
    const fileBuffer = fs.readFileSync(apkPath);

    const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/vnd.android.package-archive',
            'Content-Length': fileBuffer.length.toString(),
            'User-Agent': 'NodeJS'
        },
        body: fileBuffer
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to upload APK: ${response.statusText} - ${errText}`);
    }

    const data = await response.json();
    return data.browser_download_url;
}

async function updateVersionInDB(newVersion, newApkUrl) {
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
            { $set: { androidVersion: newVersion, apkUrl: newApkUrl } }
        );

        console.log(`✅ MongoDB Updated: androidVersion = ${newVersion}, apkUrl = ${newApkUrl}`);

    } catch (error) {
        console.error("❌ DB Update Failed:", error.message);
    } finally {
        if (client) await client.close();
    }
}

startProcess();