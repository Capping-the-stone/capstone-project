package submissions

import (
	"errors"
	"os"

	"github.com/anuragrao04/superlit-backend/compile"
)

type testCase struct {
	input          string
	expectedOutput string
	score          int
}

// this function is used by the /submit route to run test cases and figure out how many passed.
// Every Test Case is a struct with an input, expected output and score.
// arguments:
// 1. code
// 2. language
// 3. slice of structs testCase
// output:
// The total score of the test cases
// error if any
func RunTestCases(code, language string, testCases []testCase) (score int, err error) {
	codeFile, err := compile.WriteCodeToFile(code, language)
	if err != nil {
		return 0, err
	}
	defer os.Remove(codeFile) // remove the file after the function ends

	if language == "c" {
		compiledBinary, err := compile.CompileBinary(codeFile, language)
		defer os.Remove(compiledBinary)
		if err != nil {
			return 0, err
		}
		for _, tc := range testCases {
			output := compile.RunBinary(tc.input, compiledBinary)
			if output == tc.expectedOutput {
				score += tc.score
			}
		}
		return score, nil
	} else if language == "py" {
		// no compilation required for python
		for _, tc := range testCases {
			output := compile.RunBinary(tc.input, "python", codeFile)
			if output == tc.expectedOutput {
				score += tc.score
			}
		}
		return score, nil
	} else {
		return 0, errors.New("Unsupported Language")
	}
}
