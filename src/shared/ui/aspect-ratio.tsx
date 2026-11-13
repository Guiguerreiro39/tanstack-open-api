import { AspectRatio as AspectRatioPrimitive } from "radix-ui";
import type * as React from "react";

export function AspectRatio(props: React.ComponentProps<typeof AspectRatioPrimitive.Root>) {
  return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />;
}
