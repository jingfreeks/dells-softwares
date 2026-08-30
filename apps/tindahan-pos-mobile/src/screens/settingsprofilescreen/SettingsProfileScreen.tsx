import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Avatar } from "../../components/avatar";
import { Card } from "../../components/card";
import { DetailHeader } from "../../components/detailheader";
import { PrimaryButton } from "../../components/primarybutton";
import { TextField } from "../../components/textfield";
import { Toggle } from "../../components/toggle";
import { ScreenContainer } from "../../components/screencontainer";
import { colors } from "../../theme/colors";
import { ChangePasswordModal } from "./component/changepasswordmodal";
import { ChangePinModal } from "./component/changepinmodal";
import { SignOutAllModal } from "./component/signoutallmodal";
import { SmallButton } from "./component/smallbutton";
import { useSettingsProfileScreen } from "./hooks";
import { NOTIFICATION_ROWS, type SettingsProfileScreenProps } from "./types";

/** mobile-settings-profile.html -- how you appear and how you sign in. */
export function SettingsProfileScreen({ onBack }: SettingsProfileScreenProps) {
  const s = useSettingsProfileScreen();
  const [modal, setModal] = useState<"password" | "pin" | "signOutAll" | null>(null);

  return (
    <>
      <ScreenContainer>
        <DetailHeader title="Your profile" subtitle="How you appear and how you sign in" onBack={onBack} />

        <Card padding={14} style={{ marginBottom: 14 }}>
          <View className="flex-row items-center gap-3 mb-3.5">
            <Avatar initial={s.initials} size={52} uri={s.avatarUri} />
            <View className="flex-1">
              <View className="flex-row items-center gap-3.5">
                <Pressable accessibilityRole="button" onPress={s.onPickAvatar}>
                  <Text className="text-[13px] text-accent">Upload photo</Text>
                </Pressable>
                {s.canRemoveAvatar && (
                  <Pressable accessibilityRole="button" onPress={s.onRemoveAvatar}>
                    <Text className="text-[13px] text-text-faint">Remove</Text>
                  </Pressable>
                )}
              </View>
              <Text className="text-[11.5px] text-text-faint mt-1.5">
                Square, at least 200×200. Shown on receipts.
              </Text>
            </View>
          </View>
          {s.avatarError && (
            <Text accessibilityRole="alert" className="text-error text-[12.5px] mb-2">
              {s.avatarError}
            </Text>
          )}

          <TextField accessibilityLabel="Full name" label="Full name" value={s.name} onChangeText={s.setName} />
          <View className="h-2.5" />
          <TextField
            accessibilityLabel="Display name"
            label="Display name"
            value={s.displayName}
            onChangeText={s.setDisplayName}
          />
          <View className="h-2.5" />
          <TextField
            accessibilityLabel="Email"
            label="Email"
            value={s.email}
            editable={false}
            hint="Sign-in email. Contact support to change it."
          />
          <View className="h-2.5" />
          <TextField
            accessibilityLabel="Mobile"
            label="Mobile"
            value={s.phone}
            onChangeText={s.setPhone}
            keyboardType="phone-pad"
          />
        </Card>

        <Card padding={14} style={{ marginBottom: 14 }}>
          <Text className="text-[13.5px] font-medium text-text-primary mb-2.5">Signing in</Text>

          <View className="flex-row items-center py-2.5">
            <View className="flex-1 pr-3">
              <Text className="text-[13px] text-text-secondary">Password</Text>
              <Text className="text-[11.5px] text-text-faint">Used to sign in on a new device</Text>
            </View>
            <SmallButton label="Change" onPress={() => setModal("password")} />
          </View>

          <View className="h-px bg-hairline" />

          <View className="flex-row items-center py-2.5">
            <View className="flex-1 pr-3">
              <Text className="text-[13px] text-text-secondary">Your override PIN</Text>
              <Text className="text-[11.5px] text-text-faint">
                {s.hasPin ? "Approves voids, big cash-outs, utang over limit" : "Not set yet"}
              </Text>
            </View>
            <SmallButton label={s.hasPin ? "Change" : "Set"} onPress={() => setModal("pin")} />
          </View>

          <View className="h-px bg-hairline" />

          <View className="flex-row items-center py-2.5">
            <View className="flex-1 pr-3">
              <Text className="text-[13px] text-text-secondary">Two-step sign-in</Text>
              <Text className="text-[11.5px] text-text-faint">Code by SMS on a new device</Text>
            </View>
            <Toggle
              value={s.twoStepSignIn}
              onToggle={s.toggleTwoStepSignIn}
              accessibilityLabel="Two-step sign-in"
            />
          </View>
        </Card>

        <Card padding={14} style={{ marginBottom: 14 }}>
          <Text className="text-[13.5px] font-medium text-text-primary mb-2">Tell me about</Text>
          {NOTIFICATION_ROWS.map((row) => (
            <View key={row.key} className="flex-row items-center justify-between py-2">
              <Text className="text-[13px] text-text-secondary flex-1 pr-3">{row.label}</Text>
              <Toggle
                value={s.notifications[row.key]}
                onToggle={() => s.setNotification(row.key, !s.notifications[row.key])}
                accessibilityLabel={row.label}
              />
            </View>
          ))}
        </Card>

        <Card
          padding={14}
          style={{ marginBottom: 14, backgroundColor: "rgba(248,113,113,0.08)", borderColor: "rgba(248,113,113,0.28)" }}
        >
          <Text className="text-[13.5px] font-medium mb-1" style={{ color: colors.error }}>
            Sign out everywhere
          </Text>
          <Text className="text-[11.5px] text-text-faint mb-2.5">
            Ends every other signed-in session for your account.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setModal("signOutAll")}
            className="self-start rounded-lg px-3 py-1.5"
            style={{ backgroundColor: "rgba(248,113,113,0.16)" }}
          >
            <Text className="text-[12.5px] font-medium" style={{ color: colors.error }}>
              Sign out all
            </Text>
          </Pressable>
        </Card>

        {s.error && (
          <Text accessibilityRole="alert" className="text-error text-[12.5px] mb-2">
            {s.error}
          </Text>
        )}
        {s.saved && !s.dirty && (
          <View className="flex-row items-center gap-1.5 mb-2">
            <Feather name="check-circle" size={14} color={colors.success} />
            <Text className="text-[12.5px]" style={{ color: colors.success }}>
              Profile saved.
            </Text>
          </View>
        )}

        <View className="flex-row gap-2.5 mb-6">
          <View className="flex-1">
            <PrimaryButton
              label="Save changes"
              onPress={s.onSave}
              loading={s.saving}
              disabled={!s.dirty || s.saving}
            />
          </View>
          <SmallButton label="Discard" onPress={s.onDiscard} disabled={!s.dirty || s.saving} height={48} />
        </View>
      </ScreenContainer>

      {modal === "password" && <ChangePasswordModal onClose={() => setModal(null)} />}
      {modal === "pin" && <ChangePinModal hasPin={s.hasPin} onClose={() => setModal(null)} />}
      {modal === "signOutAll" && <SignOutAllModal onClose={() => setModal(null)} />}
    </>
  );
}
