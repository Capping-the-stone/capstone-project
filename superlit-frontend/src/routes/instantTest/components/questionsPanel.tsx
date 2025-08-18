import CodeBlock from "@/components/ui/codeBlock"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"
import { useEffect, useState } from "react"
import { ScrollArea } from "@radix-ui/react-scroll-area"



export default function QuestionsPanel({ testData, currentQuestionIndex, setCurrentQuestionIndex }: { testData: any, currentQuestionIndex: any, setCurrentQuestionIndex: any }) {
  const [api, setApi] = useState<CarouselApi>()
  useEffect(() => {
    if (!api) {
      return
    }

    setCurrentQuestionIndex(api.selectedScrollSnap())

    api.on("select", () => {
      setCurrentQuestionIndex(api.selectedScrollSnap())
    })
  }, [api])

  return testData == null ? "Loading..." : (
    <div className="mx-5">
      <Carousel setApi={setApi} className="">
        <div className="grid grid-cols-3 justify-center">
          <div className="flex justify-center items-center"><CarouselPrevious className="" /></div>
          <div><div className="text-xl text-center">Question {currentQuestionIndex + 1}</div><div className="text-xl text-center">Of {testData.questions.length}</div></div>
          <div className="flex justify-center items-center"><CarouselNext className="" /></div>
        </div>
        <CarouselContent className="">
          {testData.questions.map((question: any, index: any) => {
            return (
              <CarouselItem key={index}>
                <ScrollArea className="w-full max-h-[88vh] overflow-x-hidden">
                  <div className="text-4xl">
                    {question.title}
                  </div>
                  <div className="whitespace-pre-wrap break-words">
                    {question.question}
                  </div>

                  <div className="text-3xl my-3">Example Cases</div>

                  {question.exampleCases.map((testCase: any, index: any) => (
                    <div className="mt-3" key={index}>
                      <div className="text-2xl">Case {index + 1}</div>
                      <div>Input</div>
                      <CodeBlock code={testCase.input} className="" />
                      <div>Expected Output</div>
                      <CodeBlock code={testCase.expectedOutput} className="" />
                      {testCase.explanation != "" ? (
                        <>
                          <div>Explanation</div>
                          <CodeBlock code={testCase.explanation} className=""></CodeBlock>
                        </>
                      ) : <></>}

                    </div>

                  ))
                  }

                </ScrollArea>
              </CarouselItem>
            )
          })}
        </CarouselContent>

      </Carousel>

    </div>
  )
}
