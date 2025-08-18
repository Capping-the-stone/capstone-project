package prettyPrint

import (
	"encoding/json"
	"fmt"
)

func PrettyPrint(obj interface{}) {
	bytes, _ := json.MarshalIndent(obj, "\t", "\t")
	fmt.Println(string(bytes))
}
