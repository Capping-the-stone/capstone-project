import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import { useParams } from "react-router-dom";

loader.config({
  monaco,
});
// This enables monaco editor to use node_modules instead of a CDN. This enables our app to be fully offline and localhosted

loader.init().then((editorInstance) => {
  console.log("Editor Loaded!");
  console.log(editorInstance);
});

export default function Test() {
  let { testID } = useParams();

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="min-w-screen min-h-screen rounded-lg border"
    >
      <ResizablePanel defaultSize={20}>
        <div className="flex h-[200px] items-center justify-center p-6">
          <span className="font-semibold">TODO Questions Here</span>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={80}>
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel defaultSize={75}>
            <Editor
              height="100%"
              defaultLanguage="c"
              defaultValue={"// test: " + testID}
              theme="vs-dark"
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={25}>
            <div className="flex h-full items-center justify-center p-6">
              <span className="font-semibold">TODO Input and Output Here</span>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
