import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-3 py-16 text-center">
      <h1 className="text-xl font-semibold">Not on the board</h1>
      <p className="text-sm text-muted">This person has not submitted any totals yet.</p>
      <Link href="/" className="text-sm underline underline-offset-4">
        Back to the leaderboard
      </Link>
    </div>
  );
}
