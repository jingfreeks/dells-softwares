import { Text, View } from "react-native";
import { colors } from "../../../theme/colors";
import { ChoiceCard, Footer, Header } from "./component";
import type { WelcomeStepProps } from "./types";

/**
 * Welcome/Choose (mobile-25). A destination choice, not a store-creation
 * choice -- a real store already exists by the time this renders
 * (handle_new_user() creates one at signup) -- "Explore Demo Store" just
 * points the admin at an isolated sample dataset instead, leaving their
 * real store untouched until they choose "Set Up My Store". Mirrors the
 * same reframing already shipped on the web app's WelcomeStep.
 */
export function WelcomeStep({ ownerName, onExploreDemo, onSetUpStore }: WelcomeStepProps) {
  return (
    <View>
      <Header
        title={`Welcome to Tindahan POS${ownerName ? `, ${ownerName}` : ""} 👋`}
        stitle="How would you like to explore Tindahan POS?"
      />

      <ChoiceCard
        icon="monitor"
        title="Explore Demo Store"
        description="See how Tindahan POS works using sample products, sales, inventory, customers and reports — nothing you enter here is saved to a real store."
        ticks={[
          { label: "Realistic sample data, already loaded" },
          { label: "Nothing to set up first" },
          { label: "Switch to your own trial any time" },
        ]}
        ctaLabel="Explore Demo"
        accentColor={colors.accent}
        accentBackground="rgba(76,141,255,.16)"
        accentBorder="rgba(76,141,255,.32)"
        onPress={onExploreDemo}
      />

      <ChoiceCard
        icon="home"
        title="Set Up My Store"
        description="Start your free trial using your own store and business data. Everything you enter is yours from the start."
        ticks={[
          { label: "Your real products, customers and prices" },
          { label: "Full 30-day free trial, no card needed" },
          { label: "Nothing to redo later" },
        ]}
        ctaLabel="Set Up My Store"
        accentColor={colors.success}
        accentBackground="rgba(74,222,128,.14)"
        accentBorder="rgba(74,222,128,.32)"
        onPress={onSetUpStore}
      />

      <Text className="text-[13px] text-text-faint text-center mb-2">
        You can switch between them later from Settings.
      </Text>
      <Footer label="About 8 minutes end to end. No card, nothing to install." />
    </View>
  );
}
