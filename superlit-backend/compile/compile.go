// Description: This is the directory for compiling code. This doesn't do judging, this doesn't do scoring.
// The function for running the code through multiple test cases is also here.

package compile

import (
	"bytes"
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/anuragrao04/superlit-backend/models"
	"github.com/google/uuid"
)

// the below function is run on the /run route. See the main function for all other routes.
func RunCode(c *gin.Context) {
	var runRequest models.RunRequest
	// see this structure in models/models.go for request structure
	err := c.BindJSON(&runRequest)

	if err != nil {
		log.Println(err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Request"})
		return
	}

	output, err := GetOutput(runRequest.Code, runRequest.Input, runRequest.Language)
	if err != nil {
		if err.Error() == "Unsupported Language" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported Language"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"output": output})
}

// This function takes code, input and language => spits out the output string and error if any.
// It's used by the above RunCode Function and other requests as well. This is a centralised function.
// If you want to support more languages in the future, this is the function you want to modify.
func GetOutput(code, input, language string) (string, error) {

	// write the code to a file
	codeFile, err := WriteCodeToFile(code, language)
	defer os.Remove(codeFile)

	if err != nil {
		return "", err
	}

	// now we need to handle the compilation different for different languages
	// for now, we'll handle C, C++, and python. Other languages can be added later

	// C
	if language == "c" {
		// compile the code
		compiledBinary, err := CompileBinary(codeFile, language)
		if err != nil {
			// if the error is due to client code problem, we need to send the error to the client
			if err.Error() == "Client Code Problem" {
				// In this case, the variable 'compiledBinary' contains the compilation error string
				return compiledBinary, nil
			}

			log.Println(err)
			return err.Error(), err
		}

		// run the binary
		output := RunBinary(input, compiledBinary)

		// we clean up the files
		os.Remove(compiledBinary)

		// send the output back
		return output, nil

	} else if language == "py" {

		// Python
		output := RunBinary(input, "python3", codeFile)

		// we clean up the file
		os.Remove(codeFile)
		// send the output back
		return output, nil
	} else if language == "cpp" {

		// C++
		// compile the code
		compiledBinary, err := CompileBinary(codeFile, language)
		if err != nil {
			// if the error is due to client code problem, we need to send the error to the client
			if err.Error() == "Client Code Problem" {
				// In this case, the variable 'compiledBinary' contains the compilation error string
				return compiledBinary, nil
			}

			log.Println(err)
			return err.Error(), err
		}

		// run the binary
		output := RunBinary(input, compiledBinary)

		// we clean up the files
		os.Remove(compiledBinary)

		// send the output back
		return output, nil

	} else {
		return "", errors.New("Unsupported Language")
	}

}

// the below function is responsible for writing code to a file
// arguments:
// 1. code: the code to be written
// 2. language: the language of the code. This is used to determine the extension of the file
// returns:
// 1. the name of the file
// 2. error: any error that occurs during writing
func WriteCodeToFile(code, language string) (fileName string, err error) {
	// Write the code to a file
	// we'll write all code and compilations inside the playground directory

	// create the playground directory if it doesn't exist
	if _, err := os.Stat("./playground"); os.IsNotExist(err) {
		os.Mkdir("./playground", 0755)
	}
	// create a new file with a random name
	file, err := os.Create("./playground/" + uuid.New().String() + "." + language)
	if err != nil {
		log.Println(err)
		return "", errors.New("Error creating file")
	}
	// write the code to the file
	file.Write([]byte(code))

	if err = file.Close(); err != nil {
		log.Println(err)
		return "", errors.New("Error closing file")
	}

	return file.Name(), nil
}

// the below function is responsible for generating a compiled binary for a given file.
// it is only used in case of compiled languages
// arguments:
// 1. file: the file to be compiled
// 2. language: the language of the file. This is used to determine the compiler to be used
// the language argument would be the extension of a file. For example, "c" for C, "cpp" for C++, "java" for Java
// returns:
// 1. name of the compiled binary
// 2. error: any error that occurs during compilation
func CompileBinary(file string, language string) (compiledBinary string, err error) {
	// compile the code
	// C
	if language == "c" {
		cmd := exec.Command("gcc", file, "-o", file+".out")
		var stderr bytes.Buffer
		cmd.Stderr = &stderr
		var stdout bytes.Buffer
		cmd.Stdout = &stdout

		// log any error in the above compilation
		if err := cmd.Run(); err != nil {

			// we need to by pass and send the error to client if the problem is with the code
			// and not with the compilation
			if err.Error() == "exit status 1" {
				return stderr.String() + stdout.String(), errors.New("Client Code Problem")
			}
			log.Println("Compilation Failed")
			log.Println(err)
			return "", err
		}
		return file + ".out", nil
	} else if language == "cpp" {
		cmd := exec.Command("g++", file, "-o", file+".out")
		var stderr bytes.Buffer
		cmd.Stderr = &stderr
		var stdout bytes.Buffer
		cmd.Stdout = &stdout

		// log any error in the above compilation
		if err := cmd.Run(); err != nil {

			// we need to by pass and send the error to client if the problem is with the code
			// and not with the compilation
			if err.Error() == "exit status 1" {
				return stderr.String() + stdout.String(), errors.New("Client Code Problem")
			}
			log.Println("Compilation Failed")
			log.Println(err)
			return "", err
		}
		return file + ".out", nil
	}
	return "", errors.New("Unsupported Language")
}

// the below function will take a compiled binary and run it.
// in case of an interpreted language, this will run the same
// arguments:
// 1. run command: the command to run the binary/program. This is sent as a slice of arguments
// for example, in order to run a python program, send: ["python", "<filename>"]
// 2. input: the input to be given to the program
// returns:
// output: the output of the binary including stdout and stderror

func RunBinary(input string, command ...string) string {
	command = append([]string{"firejail", "--quiet", "--profile=superlit", "--disable-sandbox-check"}, command...)
	// --disable-sandbox-check is a new flag introduced in https://github.com/netblue30/firejail/pull/6592
	// since we are running this inside docker, this is necessary. Although, not recommended
	// We should move to a dedicated microservice for compiling code in the future, most probably: https://github.com/thealcodingclub/CodeExecutionAPI

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, command[0], command[1:]...)
	cmd.Stdin = strings.NewReader(input)
	output, err := cmd.CombinedOutput()
	if err != nil {
		// If the process was killed by the context timeout:
		if err.Error() == "signal: killed" {
			return "Timed Out! Make sure there aren't any infinite loops in your program"
		}
		// Otherwise, return the stderr/stdout (which will likely contain the Python error).
		if len(output) > 0 {
			return string(output)
		}
		// If for some reason 'output' is empty, then return the generic error message
		return err.Error()
	}
	return string(output)
}
