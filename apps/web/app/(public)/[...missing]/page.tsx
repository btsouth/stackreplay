import { notFound } from "next/navigation";

/** Keep unknown URLs inside the public layout and its own 404 boundary. */
export default function MissingPage() {
  notFound();
}
