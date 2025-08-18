pipeline {
    agent any

    stages {
        stage('Build') {
            steps {
                echo 'Building..'
                sh 'node -v'
                sh 'npm i'
                sh 'npm run build'
            }
        }
        stage('Test') {
            steps {
                echo 'In Terms of testing, we have no testing..'
            }
        }
        stage('Deploy') {
            steps {
                echo 'Deploying....'
                sh 'rm -rf /var/www/html/*'
                sh 'cp -r dist/* /var/www/html/'
            }
        }
    }
}
