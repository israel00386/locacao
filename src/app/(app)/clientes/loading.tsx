import { HeaderSkeleton, ListSkeleton, Loading, StatsSkeleton } from "@/components/skeletons";

export default function LoadingPage() {
  return (
    <Loading>
      <HeaderSkeleton />
      <StatsSkeleton count={2} />
      <div className="skeleton mb-3 h-11 rounded-xl" />
      <ListSkeleton rows={7} />
    </Loading>
  );
}
