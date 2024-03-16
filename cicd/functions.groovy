def tagBuild() { 	
	// Get the current build number from environment variable
    def buildNumber = env.BUILD_NUMBER
    // Get the current commit hash
    def commitHash = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
    
    // Set Git user email and name
    sh "git config --global user.email bot@jenkins.com"
    sh "git config --global user.name jenkins-bot"
    
    // Set the remote URL with the Git password from environment variable
    sh "git remote set-url origin https://asafkaravani:${env.GIT_PASSWORD}@github.com/asafkaravani/kehilot.git"
    
    // Tag the commit with the build number
    sh "git tag -a \"✔build_${buildNumber}\" -m 'Build ${buildNumber}' ${commitHash}"
    
    // Push the tag to the remote repository
    sh "git push origin \"✔build_${buildNumber}\""
}

 // Function to get changed directories
def getChangedDirs() {
    def changedDirsOutput = sh(script: "git diff --name-only HEAD^ | grep '^services/' | cut -d'/' -f1-2 | sort -u", returnStdout: true).trim()
    return changedDirsOutput.tokenize('\n')
}

// Function to get non-changed directories
def getNonChangedDirs() {
    // Dynamically generate the list of all first-level directories under 'services'
    def allDirsOutput = sh(script: "find services/ -type d -mindepth 1 -maxdepth 1 | sort -u", returnStdout: true).trim()
    def allDirs = allDirsOutput.tokenize('\n')
    def changedDirs = getChangedDirs()
    return allDirs - changedDirs
}

// Function to check if there are changes in a specific directory
def checkChanges(String directory) {
    return sh(script: "git diff --quiet HEAD HEAD~ -- ${directory}/", returnStatus: true) != 0
}


return this
