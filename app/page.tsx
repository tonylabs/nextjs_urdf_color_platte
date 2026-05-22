import UrdfWorkbench from "@/components/UrdfWorkbench";
import { getColors } from "@/lib/colors";

export default function Home() {
  const colors = getColors();
  return <UrdfWorkbench colors={colors} />;
}
