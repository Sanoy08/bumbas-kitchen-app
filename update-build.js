// update-build.js
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const gradlePath = path.join(__dirname, 'android/app/build.gradle');

const appJsonPath = path.join(__dirname, 'app.json');
const packageJsonPath = path.join(__dirname, 'package.json');

const backendRepoPath = path.join(__dirname, '../site');

const startProcess = async () => {
    try {
        rl.close();
        runBuildProcess();
    } catch (error) {
        console.error("\n❌ Error:", error.message);
        process.exit(1);
    }
};

const runBuildProcess = async () => {
    try {
        console.log("\n🚀 Starting Fast Auto-Build Process...");

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



        console.log("\n🎉 SUCCESS! Version Updated and Signed AAB Generated!");
        
        const bundleDir = path.join(__dirname, 'android', 'app', 'build', 'outputs', 'bundle', 'release');
        const bundlePath = path.join(bundleDir, 'app-release.aab');
        console.log(`\n📂 AAB Saved at: ${bundlePath}`);
        console.log(`👉 To open the folder, Ctrl+Click (or Cmd+Click) here: file://${bundleDir.replace(/\\/g, '/')}`);
        
        process.exit(0);

    } catch (error) {
        console.error("\n❌ Process Failed:", error.message);
        process.exit(1);
    }
};


startProcess();