import "../blog/_lib/blog.css"

export default function InstaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="blog-shell">
      <div className="bshell-main">{children}</div>
    </div>
  )
}
