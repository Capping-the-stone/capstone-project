import { Separator } from "@/components/ui/separator"
import { Link } from "react-router-dom"

export default function InstantTestCodeTeacherLinks() {
  return (
    <div className="mx-5">
      <h3 className="text-sm font-medium text-center">Are you a teacher?</h3>
      <Separator className="my-1" />
      <div className="flex items-center justify-around">
        <Link
          to="/instantTest/create"
          className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Create a test
        </Link>
        <Separator orientation="vertical" className="h-4" />
        <Link
          to="/instantTest/teacherDashboard"
          className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Manage your test
        </Link>
      </div>
    </div>
  )
}
