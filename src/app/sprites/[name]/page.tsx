import { redirect } from "next/navigation"

export default function SpritePage({ params }: { params: { name: string } }) {
  redirect(`/sprites/${params.name}/sessions`)
}
