import { Tool } from "@/components/tool/tool";
import { Logo } from "@/components/server/logo";
import { EmptyHero } from "@/components/server/empty-hero";

export default function Home() {
  return <Tool logo={<Logo />} emptyHero={<EmptyHero />} />;
}
