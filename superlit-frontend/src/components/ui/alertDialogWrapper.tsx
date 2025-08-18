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
import { Button } from "./button"

export default function AlertDialogWrapper({ dialog, dialogRef }: { dialog: { title: string, description: string, okText: string | undefined, cancelText: string | undefined, onOk: any | undefined, onCancel: any | undefined }, dialogRef: any }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild hidden className="h-0 w-0 p-0 absolute -left-10 -top-10">
        <Button variant="outline" id="alertDialogTrigger" ref={dialogRef} className="h-0 w-0 p-0"></Button>
      </AlertDialogTrigger>
      {/*we will trigger the above button to show the dialog*/}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dialog.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {dialog.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={dialog.onOk}>{dialog.okText == null ? "OK" : dialog.okText}</AlertDialogAction>
          {dialog.onCancel != null ? (
            <AlertDialogCancel onClick={dialog.onCancel}>{dialog.cancelText == null ? "Cancel" : dialog.cancelText}</AlertDialogCancel>
          ) : <></>}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
