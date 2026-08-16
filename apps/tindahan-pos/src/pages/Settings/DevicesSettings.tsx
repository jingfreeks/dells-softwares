import { PAGE_HEADING_DEVICES, TEXT_DEVICES_DESCRIPTION } from "@/lib";
import { SettingsLayout, DeviceListCard, UnpairDeviceModal } from "./component";
import { useDevicesPage } from "./hooksDevices";

export function DevicesSettings() {
  const {
    devices,
    allowance,
    loading,
    loadError,
    generatedCode,
    codeExpiresAt,
    generating,
    generateError,
    generateCode,
    dismissCode,
    unpairTargetId,
    unpairPin,
    setUnpairPin,
    unpairSubmitting,
    unpairError,
    openUnpairModal,
    closeUnpairModal,
    submitUnpair,
  } = useDevicesPage();

  return (
    <SettingsLayout>
      <div className="tpl-hd">
        <div>
          <p className="tpl-h1" style={{ fontSize: 21 }}>
            {PAGE_HEADING_DEVICES}
          </p>
          <p className="tpl-sub">{TEXT_DEVICES_DESCRIPTION}</p>
          {allowance && (
            <p
              className="tpl-sub"
              style={{ marginTop: 2, color: allowance.atLimit ? "var(--tpl-danger, #b91c1c)" : undefined }}
            >
              Using {allowance.used} of {allowance.cap} registers included in your plan
              {allowance.atLimit && " — contact support to pair another"}
            </p>
          )}
        </div>
      </div>

      <DeviceListCard
        devices={devices}
        loading={loading}
        loadError={loadError}
        generatedCode={generatedCode}
        codeExpiresAt={codeExpiresAt}
        generating={generating}
        generateError={generateError}
        onGenerateCode={generateCode}
        onDismissCode={dismissCode}
        onUnpairClick={openUnpairModal}
      />

      <UnpairDeviceModal
        open={unpairTargetId !== null}
        pin={unpairPin}
        onPinChange={setUnpairPin}
        onSubmit={submitUnpair}
        error={unpairError}
        submitting={unpairSubmitting}
        onCancel={closeUnpairModal}
      />
    </SettingsLayout>
  );
}
