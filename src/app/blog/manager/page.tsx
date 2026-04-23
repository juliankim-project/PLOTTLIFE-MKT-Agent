import { redirect } from "next/navigation"

export default function ManagerRedirect() {
  redirect("/blog/publish")
}
