export default function CodeBlock({ code, className }: { code: string, className: string }) {
  return (
    <pre className="bg-gray-300 dark:bg-gray-700 p-4 rounded-md text-sm font-mono">
      <code>{code}</code>
    </pre>
  )
}
