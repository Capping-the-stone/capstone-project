import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alertDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRef } from "react"


export default function PopulateSheet({ assignmentID, token, setDialog, dialogRef }: { assignmentID: string, token: string, setDialog: any, dialogRef: any }) {

  const sheetDialogRef = useRef(null)
  const sheetLinkRef = useRef(null)

  const handlePopulateSheet = async () => {
    const sheetLink = sheetLinkRef.current.value
    try {
      const response = await fetch("/api/assignment/populategooglesheet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token
        },
        body: JSON.stringify({ assignmentID: parseInt(assignmentID), googleSheetLink: sheetLink }),
      })
      const data = await response.json()
      if (data.error) {
        setDialog({
          title: "Error",
          description: "Something went wrong: " + data.error,
        })
        dialogRef.current.click()
      } else {
        setDialog({
          title: "Success",
          description: "Sheet has been populated successfully. Check on the bottom bar on google sheets for new sheets created"
        })
        dialogRef.current.click()
      }
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild hidden className="m-2">
        <Button className="">Populate Google Sheet</Button>
      </AlertDialogTrigger>
      {/*we will trigger the above button to show the dialog*/}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Enter Your Google Sheet Link</AlertDialogTitle>
          <AlertDialogDescription>
            <div className="mb-2">Please enable edit access for the account sheets@superlit.iam.gserviceaccount.com or enable edit access for everybody temporarily and paste the share link below</div>
            <Input type="text" placeholder="Enter Your Link Here" ref={sheetLinkRef}></Input>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handlePopulateSheet}>Populate Sheet</AlertDialogAction>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
