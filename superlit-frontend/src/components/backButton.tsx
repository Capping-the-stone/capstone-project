import { Link, useNavigate } from "react-router-dom"

export default function BackButton() {
  const navigate = useNavigate()

  return (
    <div
      className="inline-flex items-center gap-2 rounded-md bg-background px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
      onClick={() => navigate(-1)}
    >
      <ArrowLeftIcon className="h-4 w-4" />
      <span>Back</span>
    </div>
  )
}

function ArrowLeftIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  )
}

