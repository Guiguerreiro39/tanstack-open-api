import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAppForm } from "@/shared/ui/form";

interface TestFormProps {
  onSubmitAction: () => Promise<void>;
}

function TestForm({ onSubmitAction }: TestFormProps) {
  const form = useAppForm({
    defaultValues: { name: "test" },
    onSubmit: async () => {
      await onSubmitAction();
    },
  });

  return (
    <button
      type="button"
      onClick={() => {
        // Rapid double submit (e.g. fast Enter keypresses or double clicks)
        form.handleSubmit();
        form.handleSubmit();
      }}
    >
      Submit
    </button>
  );
}

describe("Repro: Form submit race condition", () => {
  it("proves form allows multiple concurrent executions of onSubmit", async () => {
    let inFlightCount = 0;
    let maxConcurrent = 0;
    let totalSubmits = 0;

    const onSubmitAction = async () => {
      totalSubmits++;
      inFlightCount++;
      maxConcurrent = Math.max(maxConcurrent, inFlightCount);
      await new Promise((r) => setTimeout(r, 100));
      inFlightCount--;
    };

    const { getByRole } = render(<TestForm onSubmitAction={onSubmitAction} />);
    getByRole("button").click();
    await new Promise((r) => setTimeout(r, 300));

    console.log(
      `[Repro Result] Total submissions: ${totalSubmits}, Max concurrent in-flight: ${maxConcurrent}`,
    );
    expect(maxConcurrent).toBe(1);
    expect(totalSubmits).toBe(1);
  });
});
