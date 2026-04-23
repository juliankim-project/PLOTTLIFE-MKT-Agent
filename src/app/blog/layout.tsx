import "./_lib/blog.css"
import { BlogTopbar } from "./_ui/topbar"

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="blog-shell">
      <div className="bshell-main">
        <BlogTopbar />
        {children}
      </div>
    </div>
  )
}
