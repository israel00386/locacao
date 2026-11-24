import { HeaderSkeleton, ListSkeleton, Loading, StatsSkeleton } from "@/components/skeletons";

export default function LoadingPage() {
  return (
    <Loading>
      <HeaderSkeleton />
      <StatsSkeleton count={3} />
      <ListSkeleton rows={7} />
    </Loading>
  );
}
