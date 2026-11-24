import { HeaderSkeleton, ListSkeleton, Loading, StatsSkeleton } from "@/components/skeletons";

export default function LoadingPage() {
  return (
    <Loading>
      <HeaderSkeleton action={false} />
      <StatsSkeleton />
      <div className="grid gap-4 lg:grid-cols-2">
        <ListSkeleton rows={3} title />
        <ListSkeleton rows={3} title />
      </div>
    </Loading>
  );
}
