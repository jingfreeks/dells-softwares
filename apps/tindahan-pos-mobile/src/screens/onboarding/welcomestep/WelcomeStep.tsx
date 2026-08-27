import {  View } from "react-native";
import { PrimaryButton } from "../../../components/PrimaryButton";
import { CheckListCard, PressableButton, Header, Footer } from "./component";
import type { WelcomeStepProps } from "./types";
import { CHECKLIST } from "./types";

/** Onboarding welcome screen (mobile-onboarding-welcome.html). */
export function WelcomeStep({
  onStartSetup,
  onSkipToRegister,
}: WelcomeStepProps) {
  return (
    <View>
      <Header
        title="Let's get your shop ready to sell."
        stitle=" Four short steps. Everything saves as you go — stop after any of them
        and pick it up later from the dashboard."
      />
      <CheckListCard data={CHECKLIST} />
      <PrimaryButton label="Start setup" onPress={onStartSetup} />
      <PressableButton
        onPress={onSkipToRegister}
        label="Skip — take me to the register"
      />
      <Footer label="About 8 minutes end to end. No card, nothing to install." />
    </View>
  );
}

