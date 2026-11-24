import { HeaderSkeleton, ListSkeleton, Loading, TabsSkeleton } from "@/components/skeletons";

export default function LoadingPage() {
  return (
    <Loading>
      <HeaderSkeleton />
      <TabsSkeleton />
      <ListSkeleton rows={6} />
    </Loading>
  );
}
