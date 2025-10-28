Phase 1: Project Setup & Configuration

   1. Add Cassandra Driver Dependency:
       * Action: I will execute a shell command to add the gocql library to the project.
       * File Impact: go.mod, go.sum
       * Command: go get github.com/gocql/gocql

   2. Update Environment Configuration:
       * Action: I will add the CASSANDRA_HOSTS variable to the environment configuration template. This ensures future setups include this necessary variable.
       * File to Modify: superlit-backend/.env.example
       * Code to Add:
   1         CASSANDRA_HOSTS=""

  Phase 2: Create the activitylogs Package

  This new package will handle all logic for Cassandra interaction and the new API endpoint.

   3. Create New Directory:
       * Action: I will create a new directory for our package.
       * Path: superlit-backend/activitylogs/

   4. Define Data Structures and Connection (`cassandra.go`):
       * Action: I will create a file to define the log data structure and manage the Cassandra connection.
       * File to Create: superlit-backend/activitylogs/cassandra.go
       * Implementation Details:
           * Define a LogEntry struct that exactly matches the columns in the capstone.logs_by_student_question table.
           * Declare a package-level global variable var Session *gocql.Session.
           * Create an Init() function that:
               1. Reads the CASSANDRA_HOSTS environment variable.
               2. Creates a gocql.ClusterConfig pointing to the specified hosts and the capstone keyspace.
               3. Initializes the Session variable.
               4. Logs a success message or a fatal error if the connection fails.

  Phase 3: Implement Core Business Logic

   5. Update the Database Package:
       * Action: I will add a new function to the existing database package to fetch the specific list of plagiarized question IDs.
       * File to Modify: superlit-backend/database/assignments.go
       * Implementation Details:
           * Create a new function GetBlacklistedQuestionIDs(userID uint, assignmentID uint) ([]int64, error).
           * This function will query the assignment_user_blacklists table for a single entry matching the userID and assignmentID.
           * If an entry is found, it will return the QuestionIDsPlagiarized array. If not found, it will return an empty array.

   6. Create the API Handler (`get_logs.go`):
       * Action: I will create the file containing the main Gin handler for the new route.
       * File to Create: superlit-backend/activitylogs/get_logs.go
       * Implementation Details:
           * Create the GetActivityLogs(c *gin.Context) function.
           * Step 1 (Auth): Verify the JWT token belongs to a teacher.
           * Step 2 (Params): Read and validate the srn and assignment_id query parameters.
           * Step 3 (Postgres - Plagiarism): Call the new database.GetBlacklistedQuestionIDs function to get the list of plagiarized question IDs.
           * Step 4 (Postgres - Questions): Call the existing database.GetAssignment function to get the full list of question IDs for the assignment.
           * Step 5 (Cassandra - Logs): Loop through the list of all question IDs from the assignment. In each iteration, call a helper function getLogsFromCassandra(srn, questionID) to
             query Cassandra for that specific question's logs.
           * Step 6 (Assemble): Collate the data from Cassandra into a map[uint][]LogEntry] and prepare the final JSON response object.
           * Step 7 (Respond): Send the final JSON object containing activity_logs and question_ids_plagiarized.

  Phase 4: Final Integration

   7. Update `main.go`:
       * Action: I will integrate the new activitylogs package and route into the main application entrypoint.
       * File to Modify: superlit-backend/main.go
       * Implementation Details:
           1. Import the new activitylogs package.
           2. Call activitylogs.Init() during the startup sequence.
           3. Register the new route: router.GET("/assignment/activity_logs", tokens.VerifyToken, activitylogs.GetActivityLogs).