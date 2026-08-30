import { fireEvent, render, screen } from "@testing-library/react-native";
import { TrialExpiredScreen } from "../trialexpiredscreen";

describe("TrialExpiredScreen", () => {
  it("says data is safe and selling still works", () => {
    render(<TrialExpiredScreen onChoosePlan={jest.fn()} onContactSupport={jest.fn()} />);
    expect(screen.getByText(/store data is safe/i)).toBeTruthy();
  });

  it("calls onChoosePlan when Choose a Plan is pressed", () => {
    const onChoosePlan = jest.fn();
    render(<TrialExpiredScreen onChoosePlan={onChoosePlan} onContactSupport={jest.fn()} />);
    fireEvent.press(screen.getByText("Choose a Plan"));
    expect(onChoosePlan).toHaveBeenCalledTimes(1);
  });

  it("calls onContactSupport when Contact Support is pressed", () => {
    const onContactSupport = jest.fn();
    render(<TrialExpiredScreen onChoosePlan={jest.fn()} onContactSupport={onContactSupport} />);
    fireEvent.press(screen.getByText("Contact Support"));
    expect(onContactSupport).toHaveBeenCalledTimes(1);
  });
});
