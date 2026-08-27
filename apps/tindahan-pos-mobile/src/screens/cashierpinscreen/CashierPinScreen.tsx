import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ScreenContainer } from "../../components/ScreenContainer";
import { Avatar } from "../../components/Avatar";
import { Card } from "../../components/card";
import { PrimaryButton } from "../../components/primarybutton";
import { TextField } from "../../components/TextField";
import { colors } from "../../theme/colors";
import { KEYPAD_ROWS, PIN_LENGTH, initials, useCashierPinScreen } from "./hooks";

/** "Who's on the register?" PIN lock (mobile-cashier-pin.html) -- gates a paired counter device. */
export function CashierPinScreen() {
  const {
    store,
    startingSession,
    cashiers,
    loadingCashiers,
    loadError,
    selected,
    pin,
    awaitingFloat,
    openingFloatText,
    setOpeningFloatText,
    error,
    selectCashier,
    deselectCashier,
    pressDigit,
    pressBackspace,
    goBackToPin,
    submitShiftStart,
  } = useCashierPinScreen();

  return (
    <ScreenContainer>
      <View className="flex-row items-center gap-2.5 justify-center mt-5">
        <View className="w-7 h-7 rounded-icon-square bg-accent items-center justify-center">
          <Text className="text-text-primary font-semibold text-[13px]">{(store?.name ?? "T")[0]}</Text>
        </View>
        <Text className="text-base font-medium text-text-primary">{store?.name ?? "Store"}</Text>
      </View>
      <Text className="text-center text-xs text-text-faint mt-1 mb-5">Counter tablet</Text>

      {!selected ? (
        <>
          <Text className="text-center text-[10px] font-medium text-text-faint tracking-[0.8px] mb-3.5">
            WHO&apos;S ON THE REGISTER?
          </Text>
          {loadingCashiers ? (
            <Text className="text-center text-text-faint text-[13px]">Loading…</Text>
          ) : loadError ? (
            <Text accessibilityRole="alert" className="text-[12.5px] text-error text-center mb-2.5">
              {loadError}
            </Text>
          ) : (
            <View className="flex-row flex-wrap justify-center gap-4.5">
              {cashiers.map((cashier) => (
                <Pressable
                  key={cashier.id}
                  accessibilityRole="button"
                  onPress={() => selectCashier(cashier)}
                  className="items-center gap-1.5 w-16"
                >
                  <Avatar initial={initials(cashier.name)} size={46} shape="circle" />
                  <Text className="text-xs text-text-dim">{cashier.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </>
      ) : !awaitingFloat ? (
        <View className="items-center mt-2">
          <Text className="text-sm text-text-dim mb-3.5">Hi {selected.name.split(" ")[0]} — enter your PIN</Text>
          <View className="flex-row gap-3 mb-3.5">
            {Array.from({ length: PIN_LENGTH }, (_, i) => (
              <View
                key={i}
                className={`w-3 h-3 rounded-full border border-hairline ${i < pin.length ? "bg-accent border-accent" : ""}`}
              />
            ))}
          </View>
          {error && (
            <Text accessibilityRole="alert" className="text-[12.5px] text-error text-center mb-2.5">
              {error}
            </Text>
          )}
          <View className="my-4.5">
            {KEYPAD_ROWS.map((row, i) => (
              <View key={i} className="flex-row justify-center gap-3.5 mb-3.5">
                {row.map((key, j) =>
                  key === null ? (
                    <View key={j} className="w-16 h-16" />
                  ) : key === "backspace" ? (
                    <Pressable
                      key={j}
                      accessibilityRole="button"
                      accessibilityLabel="Delete digit"
                      onPress={pressBackspace}
                      className="w-16 h-16 rounded-full bg-panel-strong border border-hairline items-center justify-center"
                    >
                      <Feather name="delete" size={18} color={colors.textDim} />
                    </Pressable>
                  ) : (
                    <Pressable
                      key={j}
                      accessibilityRole="button"
                      accessibilityLabel={`Digit ${key}`}
                      onPress={() => pressDigit(key)}
                      className="w-16 h-16 rounded-full bg-panel-strong border border-hairline items-center justify-center"
                    >
                      <Text className="text-[22px] text-text-primary">{key}</Text>
                    </Pressable>
                  )
                )}
              </View>
            ))}
          </View>
          <Pressable accessibilityRole="button" onPress={deselectCashier}>
            <Text className="text-[12.5px] text-accent-soft text-center">
              Not {selected.name.split(" ")[0]}? Choose someone else
            </Text>
          </Pressable>
        </View>
      ) : (
        <View className="mt-2">
          <Card padding={16}>
            <Text className="text-[15px] font-medium text-text-primary mb-1">How much cash is in the drawer?</Text>
            <Text className="text-xs text-text-faint mb-3.5">Count what&apos;s there right now to start your shift.</Text>
            <TextField
              accessibilityLabel="Opening float"
              label="Cash counted"
              value={openingFloatText}
              onChangeText={setOpeningFloatText}
              keyboardType="decimal-pad"
            />
            {error && (
              <Text accessibilityRole="alert" className="text-[12.5px] text-error text-center mb-2.5">
                {error}
              </Text>
            )}
            <PrimaryButton label="Start shift" onPress={submitShiftStart} loading={startingSession} />
            <Pressable accessibilityRole="button" onPress={goBackToPin} className="mt-3">
              <Text className="text-[12.5px] text-accent-soft text-center">Back</Text>
            </Pressable>
          </Card>
        </View>
      )}
    </ScreenContainer>
  );
}
